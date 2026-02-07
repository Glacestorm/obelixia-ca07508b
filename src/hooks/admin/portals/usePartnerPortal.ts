/**
 * usePartnerPortal Hook
 * Gestión del portal de partners
 * Fase 12 - Enterprise SaaS 2025-2026
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface PartnerAccount {
  id: string;
  user_id: string | null;
  partner_name: string;
  partner_tax_id: string | null;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'strategic';
  contact_email: string;
  contact_phone: string | null;
  company_website: string | null;
  logo_url: string | null;
  description: string | null;
  specializations: string[];
  certifications: Record<string, unknown>[];
  commission_rate: number;
  total_revenue_generated: number;
  total_clients_referred: number;
  avg_client_satisfaction: number;
  is_active: boolean;
  onboarded_at: string | null;
  last_login_at: string | null;
  portal_settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ReferredClient {
  id: string;
  partner_id: string;
  client_company_name: string;
  client_email: string;
  client_contact_name: string | null;
  client_phone: string | null;
  referral_date: string;
  status: 'pending' | 'contacted' | 'demo_scheduled' | 'negotiating' | 'won' | 'lost';
  deal_value: number | null;
  commission_earned: number | null;
  commission_paid: boolean;
  commission_paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function usePartnerPortal() {
  const [account, setAccount] = useState<PartnerAccount | null>(null);
  const [referredClients, setReferredClients] = useState<ReferredClient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // === FETCH PARTNER ACCOUNT ===
  const fetchAccount = useCallback(async () => {
    if (!user?.id) return null;
    
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('partner_portal_accounts')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setAccount(data as PartnerAccount);
        // Update last login
        await (supabase as any)
          .from('partner_portal_accounts')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.id);
      }
      
      return data as PartnerAccount | null;
    } catch (err) {
      console.error('[usePartnerPortal] fetchAccount error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // === FETCH REFERRED CLIENTS ===
  const fetchReferredClients = useCallback(async () => {
    if (!account?.id) return [];
    
    try {
      const { data, error } = await (supabase as any)
        .from('partner_referred_clients')
        .select('*')
        .eq('partner_id', account.id)
        .order('referral_date', { ascending: false });

      if (error) throw error;
      setReferredClients((data || []) as ReferredClient[]);
      return data as ReferredClient[];
    } catch (err) {
      console.error('[usePartnerPortal] fetchReferredClients error:', err);
      return [];
    }
  }, [account?.id]);

  // === CREATE REFERRAL ===
  const createReferral = useCallback(async (clientData: {
    client_company_name: string;
    client_email: string;
    client_contact_name?: string;
    client_phone?: string;
    notes?: string;
  }) => {
    if (!account?.id) {
      toast.error('No tienes una cuenta de partner activa');
      return null;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('partner_referred_clients')
        .insert([{
          partner_id: account.id,
          ...clientData,
          status: 'pending',
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Cliente referido registrado');
      await fetchReferredClients();
      return data as ReferredClient;
    } catch (err) {
      console.error('[usePartnerPortal] createReferral error:', err);
      toast.error('Error al registrar cliente');
      return null;
    }
  }, [account?.id, fetchReferredClients]);

  // === UPDATE REFERRAL STATUS ===
  const updateReferralStatus = useCallback(async (
    referralId: string,
    status: ReferredClient['status'],
    dealValue?: number
  ) => {
    try {
      const updates: Record<string, unknown> = { status };
      if (dealValue !== undefined) {
        updates.deal_value = dealValue;
        if (status === 'won' && account) {
          updates.commission_earned = dealValue * (account.commission_rate / 100);
        }
      }

      const { error } = await (supabase as any)
        .from('partner_referred_clients')
        .update(updates)
        .eq('id', referralId);

      if (error) throw error;

      toast.success('Estado actualizado');
      await fetchReferredClients();
      return true;
    } catch (err) {
      console.error('[usePartnerPortal] updateReferralStatus error:', err);
      toast.error('Error al actualizar estado');
      return false;
    }
  }, [account, fetchReferredClients]);

  // === CALCULATE STATS ===
  const getStats = useCallback(() => {
    const totalReferrals = referredClients.length;
    const wonDeals = referredClients.filter(c => c.status === 'won');
    const pendingDeals = referredClients.filter(c => !['won', 'lost'].includes(c.status));
    const totalRevenue = wonDeals.reduce((sum, c) => sum + (c.deal_value || 0), 0);
    const totalCommissions = wonDeals.reduce((sum, c) => sum + (c.commission_earned || 0), 0);
    const pendingCommissions = wonDeals
      .filter(c => !c.commission_paid)
      .reduce((sum, c) => sum + (c.commission_earned || 0), 0);
    const conversionRate = totalReferrals > 0 
      ? (wonDeals.length / totalReferrals) * 100 
      : 0;

    return {
      totalReferrals,
      wonDeals: wonDeals.length,
      pendingDeals: pendingDeals.length,
      lostDeals: referredClients.filter(c => c.status === 'lost').length,
      totalRevenue,
      totalCommissions,
      pendingCommissions,
      paidCommissions: totalCommissions - pendingCommissions,
      conversionRate,
    };
  }, [referredClients]);

  // === INITIAL LOAD ===
  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  useEffect(() => {
    if (account?.id) {
      fetchReferredClients();
    }
  }, [account?.id, fetchReferredClients]);

  return {
    account,
    referredClients,
    isLoading,
    fetchAccount,
    fetchReferredClients,
    createReferral,
    updateReferralStatus,
    getStats,
  };
}

export default usePartnerPortal;
