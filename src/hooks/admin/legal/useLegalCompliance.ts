/**
 * useLegalCompliance - Hook para gestión de cumplimiento normativo
 * Fase 3: Sistema de compliance multi-jurisdiccional
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface ComplianceCheck {
  id: string;
  check_name: string;
  regulations: string[];
  jurisdictions: string[];
  entity_type: string;
  entity_id: string;
  overall_score: number;
  status: string;
  detailed_results: Record<string, unknown> | null;
  gaps_identified: Record<string, unknown> | null;
  action_items: Record<string, unknown> | null;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceStats {
  total_checks: number;
  compliant: number;
  partial: number;
  non_compliant: number;
  pending: number;
  overall_score: number;
  by_jurisdiction: Record<string, { score: number; count: number }>;
  by_regulation: Record<string, { score: number; count: number }>;
}

// Helper to cast Json
const toRecord = (value: Json | null): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

export function useLegalCompliance() {
  const [isLoading, setIsLoading] = useState(false);
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // === FETCH COMPLIANCE CHECKS ===
  const fetchComplianceChecks = useCallback(async (filters?: {
    jurisdiction?: string;
    status?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('legal_compliance_checks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (dbError) throw dbError;
      
      // Map data to interface - using actual DB columns
      const mappedData: ComplianceCheck[] = (data || []).map(item => {
        const detailedResults = toRecord(item.detailed_results);
        const regulations = (detailedResults?.regulations as string[]) || [];
        const statusFromResults = (detailedResults?.status as string) || 'pending';
        const notesFromResults = (detailedResults?.notes as string) || null;
        
        return {
          id: item.id,
          check_name: item.check_name,
          regulations: regulations,
          jurisdictions: item.jurisdictions || [],
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          overall_score: item.overall_score || 0,
          status: statusFromResults,
          detailed_results: detailedResults,
          gaps_identified: toRecord(item.gaps_identified),
          action_items: toRecord(item.action_items),
          performed_by: item.performed_by,
          notes: notesFromResults,
          created_at: item.created_at,
          updated_at: item.updated_at
        };
      });

      // Apply filters
      let filteredData = mappedData;
      if (filters?.jurisdiction) {
        filteredData = filteredData.filter(c => 
          c.jurisdictions.includes(filters.jurisdiction!)
        );
      }
      if (filters?.status) {
        filteredData = filteredData.filter(c => c.status === filters.status);
      }

      setChecks(filteredData);
      calculateStats(filteredData);
      return filteredData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useLegalCompliance] fetchComplianceChecks error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // === CALCULATE STATS ===
  const calculateStats = (checksData: ComplianceCheck[]) => {
    const byJurisdiction: Record<string, { score: number; count: number }> = {};
    const byRegulation: Record<string, { score: number; count: number }> = {};

    let compliant = 0, partial = 0, nonCompliant = 0, pending = 0, totalScore = 0;

    checksData.forEach(check => {
      const score = check.overall_score || 0;
      if (score >= 80) compliant++;
      else if (score >= 50) partial++;
      else if (score > 0) nonCompliant++;
      else pending++;
      totalScore += score;

      check.jurisdictions.forEach(j => {
        if (!byJurisdiction[j]) byJurisdiction[j] = { score: 0, count: 0 };
        byJurisdiction[j].score += score;
        byJurisdiction[j].count++;
      });

      check.regulations.forEach(r => {
        if (!byRegulation[r]) byRegulation[r] = { score: 0, count: 0 };
        byRegulation[r].score += score;
        byRegulation[r].count++;
      });
    });

    // Average scores
    Object.keys(byJurisdiction).forEach(k => {
      byJurisdiction[k].score = byJurisdiction[k].count > 0 
        ? Math.round(byJurisdiction[k].score / byJurisdiction[k].count) : 0;
    });
    Object.keys(byRegulation).forEach(k => {
      byRegulation[k].score = byRegulation[k].count > 0 
        ? Math.round(byRegulation[k].score / byRegulation[k].count) : 0;
    });

    setStats({
      total_checks: checksData.length,
      compliant, partial, non_compliant: nonCompliant, pending,
      overall_score: checksData.length > 0 ? Math.round(totalScore / checksData.length) : 0,
      by_jurisdiction: byJurisdiction,
      by_regulation: byRegulation
    });
  };

  // === RUN COMPLIANCE CHECK ===
  const runComplianceCheck = useCallback(async (
    regulations: string[],
    jurisdiction: string,
    context?: Record<string, unknown>
  ) => {
    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'legal-ai-advisor',
        { body: { action: 'check_compliance', regulations, jurisdictions: [jurisdiction], context } }
      );
      if (fnError) throw fnError;
      if (data?.success) {
        toast.success('Verificación completada');
        await fetchComplianceChecks();
        return data;
      }
      throw new Error(data?.error || 'Error');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      toast.error('Error en verificación');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchComplianceChecks]);

  // === UPDATE CHECK ===
  const updateCheck = useCallback(async (checkId: string, updates: { detailed_results?: Json }) => {
    try {
      const { error: dbError } = await supabase
        .from('legal_compliance_checks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', checkId);
      if (dbError) throw dbError;
      toast.success('Actualizado');
      await fetchComplianceChecks();
      return true;
    } catch { 
      toast.error('Error al actualizar');
      return false;
    }
  }, [fetchComplianceChecks]);

  useEffect(() => { fetchComplianceChecks(); }, [fetchComplianceChecks]);

  return { isLoading, checks, stats, error, fetchComplianceChecks, runComplianceCheck, updateCheck };
}

export default useLegalCompliance;
