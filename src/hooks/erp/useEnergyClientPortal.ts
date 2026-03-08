import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface PortalToken {
  id: string;
  case_id: string;
  company_id: string;
  token: string;
  client_name: string | null;
  client_email: string | null;
  expires_at: string;
  is_active: boolean;
  last_accessed_at: string | null;
  created_by: string | null;
  created_at: string;
}

export function useEnergyClientPortal(companyId: string, caseId?: string | null) {
  const [tokens, setTokens] = useState<PortalToken[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('energy_client_portal_tokens')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (caseId) query = query.eq('case_id', caseId);
      const { data, error } = await query;
      if (error) throw error;
      setTokens((data || []) as PortalToken[]);
    } catch (err) {
      console.error('[useEnergyClientPortal] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, caseId]);

  const createToken = useCallback(async (params: {
    case_id: string;
    client_name?: string;
    client_email?: string;
    expires_days?: number;
  }) => {
    if (!user?.id) { toast.error('Debes iniciar sesión'); return null; }
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (params.expires_days || 30));

      const { data, error } = await supabase
        .from('energy_client_portal_tokens')
        .insert([{
          case_id: params.case_id,
          company_id: companyId,
          client_name: params.client_name || null,
          client_email: params.client_email || null,
          expires_at: expiresAt.toISOString(),
          created_by: user.id,
        }] as any)
        .select()
        .single();
      if (error) throw error;
      const token = data as PortalToken;
      setTokens(prev => [token, ...prev]);
      toast.success('Enlace de portal generado');
      return token;
    } catch (err) {
      console.error('[useEnergyClientPortal] create error:', err);
      toast.error('Error al crear enlace');
      return null;
    }
  }, [companyId, user?.id]);

  const revokeToken = useCallback(async (tokenId: string) => {
    try {
      const { error } = await supabase
        .from('energy_client_portal_tokens')
        .update({ is_active: false } as any)
        .eq('id', tokenId);
      if (error) throw error;
      setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, is_active: false } : t));
      toast.success('Acceso revocado');
    } catch (err) {
      toast.error('Error al revocar acceso');
    }
  }, []);

  useEffect(() => { fetchTokens(); }, [fetchTokens]);

  return { tokens, loading, createToken, revokeToken, fetchTokens };
}
