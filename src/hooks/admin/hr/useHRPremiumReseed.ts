/**
 * useHRPremiumReseed — P9.6 Centralized Re-Seed
 * Orchestrates re-seeding of all Premium HR tables after P9.2 truncation.
 * Calls existing seed actions across consolidated edge functions.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SeedPhase {
  id: string;
  label: string;
  edgeFunction: string;
  action: string;
  status: 'pending' | 'running' | 'done' | 'error';
  error?: string;
}

const SEED_PHASES: Omit<SeedPhase, 'status'>[] = [
  // P1 — Security Governance
  { id: 'p1-security', label: 'P1: Security & Data Masking', edgeFunction: 'erp-hr-security-governance', action: 'seed_demo' },
  // P2 — AI Governance
  { id: 'p2-ai-gov', label: 'P2: AI Governance', edgeFunction: 'erp-hr-security-governance', action: 'ai_governance_seed' },
  // P3 — Workforce Planning
  { id: 'p3-workforce', label: 'P3: Workforce Planning', edgeFunction: 'erp-hr-strategic-planning', action: 'workforce_seed_demo' },
  // P4 — Fairness Engine
  { id: 'p4-fairness', label: 'P4: Fairness Engine', edgeFunction: 'erp-hr-security-governance', action: 'fairness_seed_demo' },
  // P5 — Digital Twin
  { id: 'p5-twin', label: 'P5: Digital Twin', edgeFunction: 'erp-hr-strategic-planning', action: 'twin_seed_demo' },
  // P6 — Legal Engine
  { id: 'p6-legal', label: 'P6: Legal Engine', edgeFunction: 'erp-hr-premium-intelligence', action: 'legal_seed_demo' },
  // P7 — CNAE Intelligence
  { id: 'p7-cnae', label: 'P7: CNAE Intelligence', edgeFunction: 'erp-hr-premium-intelligence', action: 'cnae_seed_demo' },
  // P8 — Role Experience
  { id: 'p8-role', label: 'P8: Role Experience', edgeFunction: 'erp-hr-premium-intelligence', action: 'role_experience_seed_demo' },
];

export function useHRPremiumReseed() {
  const [phases, setPhases] = useState<SeedPhase[]>(
    SEED_PHASES.map(p => ({ ...p, status: 'pending' }))
  );
  const [isRunning, setIsRunning] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  const updatePhase = useCallback((id: string, update: Partial<SeedPhase>) => {
    setPhases(prev => prev.map(p => p.id === id ? { ...p, ...update } : p));
  }, []);

  const runReseed = useCallback(async (companyId: string) => {
    if (!companyId) {
      toast.error('Selecciona una empresa primero');
      return;
    }

    setIsRunning(true);
    setCompletedCount(0);
    setPhases(SEED_PHASES.map(p => ({ ...p, status: 'pending' })));

    let completed = 0;
    let errors = 0;

    for (const phase of SEED_PHASES) {
      updatePhase(phase.id, { status: 'running' });
      
      try {
        const { data, error } = await supabase.functions.invoke(phase.edgeFunction, {
          body: { action: phase.action, company_id: companyId },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Seed failed');

        updatePhase(phase.id, { status: 'done' });
        completed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido';
        console.error(`[P9.6 Reseed] ${phase.id} error:`, err);
        updatePhase(phase.id, { status: 'error', error: message });
        errors++;
      }

      setCompletedCount(completed);
    }

    setIsRunning(false);

    if (errors === 0) {
      toast.success(`Re-seed completado: ${completed}/${SEED_PHASES.length} fases exitosas`);
    } else {
      toast.warning(`Re-seed parcial: ${completed} OK, ${errors} errores`);
    }
  }, [updatePhase]);

  const reset = useCallback(() => {
    setPhases(SEED_PHASES.map(p => ({ ...p, status: 'pending' })));
    setCompletedCount(0);
  }, []);

  return {
    phases,
    isRunning,
    completedCount,
    totalPhases: SEED_PHASES.length,
    progress: SEED_PHASES.length > 0 ? Math.round((completedCount / SEED_PHASES.length) * 100) : 0,
    runReseed,
    reset,
  };
}

export default useHRPremiumReseed;
