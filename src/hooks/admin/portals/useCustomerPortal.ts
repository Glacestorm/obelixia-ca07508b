/**
 * useCustomerPortal Hook
 * Gestión del portal de clientes
 * Fase 12 - Enterprise SaaS 2025-2026
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface CustomerAccount {
  id: string;
  user_id: string | null;
  company_id: string | null;
  company_name: string;
  contact_email: string;
  contact_name: string | null;
  contact_phone: string | null;
  subscription_tier: string;
  subscription_status: 'active' | 'trial' | 'suspended' | 'cancelled';
  subscription_expires_at: string | null;
  modules_enabled: string[];
  usage_limits: Record<string, number>;
  current_usage: Record<string, number>;
  billing_info: Record<string, unknown>;
  portal_settings: Record<string, unknown>;
  onboarded_at: string | null;
  last_login_at: string | null;
  health_score: number;
  nps_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  portal_type: 'partner' | 'customer';
  portal_account_id: string;
  requester_user_id: string | null;
  assigned_to: string | null;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'waiting_partner' | 'resolved' | 'closed';
  category: string | null;
  tags: string[];
  attachments: Record<string, unknown>[];
  resolution: string | null;
  resolution_time_hours: number | null;
  satisfaction_rating: number | null;
  satisfaction_feedback: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  sla_deadline: string | null;
  sla_breached: boolean;
  ai_suggested_resolution: string | null;
  ai_category_prediction: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string | null;
  comment_type: 'public' | 'internal' | 'ai_suggestion';
  content: string;
  attachments: Record<string, unknown>[];
  is_resolution: boolean;
  created_at: string;
}

export function useCustomerPortal() {
  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // === FETCH CUSTOMER ACCOUNT ===
  const fetchAccount = useCallback(async () => {
    if (!user?.id) return null;
    
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('customer_portal_accounts')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setAccount(data as CustomerAccount);
        // Update last login
        await (supabase as any)
          .from('customer_portal_accounts')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.id);
      }
      
      return data as CustomerAccount | null;
    } catch (err) {
      console.error('[useCustomerPortal] fetchAccount error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // === FETCH TICKETS ===
  const fetchTickets = useCallback(async () => {
    if (!user?.id) return [];
    
    try {
      const { data, error } = await (supabase as any)
        .from('portal_support_tickets')
        .select('*')
        .eq('requester_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets((data || []) as SupportTicket[]);
      return data as SupportTicket[];
    } catch (err) {
      console.error('[useCustomerPortal] fetchTickets error:', err);
      return [];
    }
  }, [user?.id]);

  // === CREATE TICKET ===
  const createTicket = useCallback(async (ticketData: {
    subject: string;
    description: string;
    priority?: SupportTicket['priority'];
    category?: string;
  }) => {
    if (!user?.id || !account?.id) {
      toast.error('Debes iniciar sesión para crear un ticket');
      return null;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('portal_support_tickets')
        .insert([{
          portal_type: 'customer',
          portal_account_id: account.id,
          requester_user_id: user.id,
          subject: ticketData.subject,
          description: ticketData.description,
          priority: ticketData.priority || 'medium',
          category: ticketData.category,
          status: 'open',
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Ticket creado correctamente');
      await fetchTickets();
      return data as SupportTicket;
    } catch (err) {
      console.error('[useCustomerPortal] createTicket error:', err);
      toast.error('Error al crear ticket');
      return null;
    }
  }, [user?.id, account?.id, fetchTickets]);

  // === ADD COMMENT ===
  const addComment = useCallback(async (
    ticketId: string,
    content: string,
    isResolution = false
  ) => {
    if (!user?.id) return null;

    try {
      const { data, error } = await (supabase as any)
        .from('portal_ticket_comments')
        .insert([{
          ticket_id: ticketId,
          user_id: user.id,
          content,
          comment_type: 'public',
          is_resolution: isResolution,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Comentario añadido');
      return data as TicketComment;
    } catch (err) {
      console.error('[useCustomerPortal] addComment error:', err);
      toast.error('Error al añadir comentario');
      return null;
    }
  }, [user?.id]);

  // === FETCH COMMENTS ===
  const fetchComments = useCallback(async (ticketId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('portal_ticket_comments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as TicketComment[];
    } catch (err) {
      console.error('[useCustomerPortal] fetchComments error:', err);
      return [];
    }
  }, []);

  // === RATE TICKET ===
  const rateTicket = useCallback(async (
    ticketId: string,
    rating: number,
    feedback?: string
  ) => {
    try {
      const { error } = await (supabase as any)
        .from('portal_support_tickets')
        .update({
          satisfaction_rating: rating,
          satisfaction_feedback: feedback,
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast.success('¡Gracias por tu valoración!');
      await fetchTickets();
      return true;
    } catch (err) {
      console.error('[useCustomerPortal] rateTicket error:', err);
      toast.error('Error al enviar valoración');
      return false;
    }
  }, [fetchTickets]);

  // === GET USAGE STATS ===
  const getUsageStats = useCallback(() => {
    if (!account) return null;

    const usagePercentages: Record<string, number> = {};
    for (const [key, limit] of Object.entries(account.usage_limits)) {
      const current = account.current_usage[key] || 0;
      usagePercentages[key] = limit > 0 ? (current / limit) * 100 : 0;
    }

    return {
      modules: account.modules_enabled,
      tier: account.subscription_tier,
      status: account.subscription_status,
      expiresAt: account.subscription_expires_at,
      healthScore: account.health_score,
      usagePercentages,
    };
  }, [account]);

  // === INITIAL LOAD ===
  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  useEffect(() => {
    if (user?.id) {
      fetchTickets();
    }
  }, [user?.id, fetchTickets]);

  return {
    account,
    tickets,
    isLoading,
    fetchAccount,
    fetchTickets,
    createTicket,
    addComment,
    fetchComments,
    rateTicket,
    getUsageStats,
  };
}

export default useCustomerPortal;
