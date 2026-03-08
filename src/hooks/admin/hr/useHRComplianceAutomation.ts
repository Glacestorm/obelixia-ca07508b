/**
 * useHRComplianceAutomation — P11 Compliance Automation Engine
 * Manages compliance frameworks, checklists, audits, and automated alerts
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// === TYPES ===
export interface ComplianceFramework {
  id: string;
  company_id: string;
  name: string;
  code: string;
  category: string;
  jurisdiction: string;
  description: string | null;
  version: string;
  effective_date: string | null;
  expiry_date: string | null;
  source_url: string | null;
  is_active: boolean;
  total_requirements: number;
  met_requirements: number;
  compliance_score: number;
  last_assessed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceChecklistItem {
  id: string;
  company_id: string;
  framework_id: string;
  requirement_code: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  evidence_required: boolean;
  evidence_description: string | null;
  evidence_urls: string[];
  responsible_role: string | null;
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  auto_check_function: string | null;
  last_auto_check_at: string | null;
  auto_check_result: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ComplianceAudit {
  id: string;
  company_id: string;
  framework_id: string | null;
  audit_name: string;
  audit_type: string;
  scope: string[];
  status: string;
  scheduled_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  auditor_name: string | null;
  auditor_role: string | null;
  findings: any[];
  recommendations: any[];
  overall_score: number | null;
  risk_level: string;
  report_url: string | null;
  next_audit_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceAlert {
  id: string;
  company_id: string;
  framework_id: string | null;
  checklist_item_id: string | null;
  alert_type: string;
  severity: string;
  title: string;
  description: string | null;
  regulation_reference: string | null;
  remediation_action: string | null;
  remediation_deadline: string | null;
  status: string;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface ComplianceStats {
  totalFrameworks: number;
  activeFrameworks: number;
  avgComplianceScore: number;
  totalChecklist: number;
  completedChecklist: number;
  pendingChecklist: number;
  overdueChecklist: number;
  totalAudits: number;
  scheduledAudits: number;
  openAlerts: number;
  criticalAlerts: number;
}

// Predefined frameworks
export const PREDEFINED_FRAMEWORKS = [
  { code: 'GDPR', name: 'RGPD - Reglamento General de Protección de Datos', category: 'privacy', jurisdiction: 'EU', requirements: 12 },
  { code: 'LOPDGDD', name: 'LOPDGDD - Ley Orgánica de Protección de Datos', category: 'privacy', jurisdiction: 'ES', requirements: 10 },
  { code: 'ET_REGISTRO', name: 'Registro de Jornada (Art. 34.9 ET)', category: 'labor', jurisdiction: 'ES', requirements: 8 },
  { code: 'IGUALDAD', name: 'Ley de Igualdad y Plan de Igualdad', category: 'equality', jurisdiction: 'ES', requirements: 14 },
  { code: 'CANAL_DENUNCIAS', name: 'Canal de Denuncias (Ley 2/2023)', category: 'whistleblowing', jurisdiction: 'ES', requirements: 9 },
  { code: 'PRL', name: 'Prevención de Riesgos Laborales', category: 'safety', jurisdiction: 'ES', requirements: 11 },
  { code: 'EU_AI_ACT', name: 'EU AI Act (Reg. 2024/1689)', category: 'ai_governance', jurisdiction: 'EU', requirements: 15 },
  { code: 'DESCONEXION', name: 'Derecho a la Desconexión Digital', category: 'labor', jurisdiction: 'ES', requirements: 6 },
];

export function useHRComplianceAutomation(companyId?: string) {
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([]);
  const [checklist, setChecklist] = useState<ComplianceChecklistItem[]>([]);
  const [audits, setAudits] = useState<ComplianceAudit[]>([]);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<ComplianceStats>({
    totalFrameworks: 0, activeFrameworks: 0, avgComplianceScore: 0,
    totalChecklist: 0, completedChecklist: 0, pendingChecklist: 0, overdueChecklist: 0,
    totalAudits: 0, scheduledAudits: 0, openAlerts: 0, criticalAlerts: 0,
  });

  // === FETCH ALL ===
  const fetchAll = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const [fwRes, clRes, auRes, alRes] = await Promise.all([
        supabase.from('erp_hr_compliance_frameworks' as any).select('*').eq('company_id', companyId).order('name'),
        supabase.from('erp_hr_compliance_checklist' as any).select('*').eq('company_id', companyId).order('priority'),
        supabase.from('erp_hr_compliance_audits' as any).select('*').eq('company_id', companyId).order('scheduled_date', { ascending: false }),
        supabase.from('erp_hr_compliance_alerts' as any).select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
      ]);

      const fw = (fwRes.data || []) as unknown as ComplianceFramework[];
      const cl = (clRes.data || []) as unknown as ComplianceChecklistItem[];
      const au = (auRes.data || []) as unknown as ComplianceAudit[];
      const al = (alRes.data || []) as unknown as ComplianceAlert[];

      setFrameworks(fw);
      setChecklist(cl);
      setAudits(au);
      setAlerts(al);

      const now = new Date().toISOString().split('T')[0];
      setStats({
        totalFrameworks: fw.length,
        activeFrameworks: fw.filter(f => f.is_active).length,
        avgComplianceScore: fw.length > 0 ? Math.round(fw.reduce((a, f) => a + Number(f.compliance_score), 0) / fw.length) : 0,
        totalChecklist: cl.length,
        completedChecklist: cl.filter(c => c.status === 'completed').length,
        pendingChecklist: cl.filter(c => c.status === 'pending').length,
        overdueChecklist: cl.filter(c => c.status !== 'completed' && c.due_date && c.due_date < now).length,
        totalAudits: au.length,
        scheduledAudits: au.filter(a => a.status === 'scheduled').length,
        openAlerts: al.filter(a => a.status === 'open').length,
        criticalAlerts: al.filter(a => a.status === 'open' && a.severity === 'critical').length,
      });
    } catch (err) {
      console.error('[useHRComplianceAutomation] fetchAll error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // === INSTALL FRAMEWORK ===
  const installFramework = useCallback(async (frameworkCode: string) => {
    if (!companyId) return null;
    const template = PREDEFINED_FRAMEWORKS.find(f => f.code === frameworkCode);
    if (!template) return null;

    try {
      const { data, error } = await supabase.from('erp_hr_compliance_frameworks' as any).insert({
        company_id: companyId,
        name: template.name,
        code: template.code,
        category: template.category,
        jurisdiction: template.jurisdiction,
        total_requirements: template.requirements,
        description: `Marco normativo ${template.name} instalado automáticamente`,
      } as any).select().single();

      if (error) throw error;

      // Generate checklist via AI
      await generateChecklist((data as any).id as string, template);

      toast.success(`Marco ${template.code} instalado`);
      await fetchAll();
      return data;
    } catch (err) {
      console.error('[useHRComplianceAutomation] installFramework error:', err);
      toast.error('Error al instalar marco normativo');
      return null;
    }
  }, [companyId, fetchAll]);

  // === GENERATE CHECKLIST via AI ===
  const generateChecklist = useCallback(async (frameworkId: string, template: typeof PREDEFINED_FRAMEWORKS[0]) => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase.functions.invoke('hr-compliance-automation', {
        body: {
          action: 'generate_checklist',
          company_id: companyId,
          framework_id: frameworkId,
          framework_code: template.code,
          framework_name: template.name,
          total_requirements: template.requirements,
        },
      });

      if (error) throw error;

      if (data?.success && data?.checklist) {
        for (const item of data.checklist) {
          await supabase.from('erp_hr_compliance_checklist' as any).insert({
            company_id: companyId,
            framework_id: frameworkId,
            requirement_code: item.code,
            title: item.title,
            description: item.description,
            category: item.category || 'general',
            priority: item.priority || 'medium',
            evidence_required: item.evidence_required || false,
            evidence_description: item.evidence_description || null,
            due_date: item.due_date || null,
          } as any);
        }
      }
    } catch (err) {
      console.error('[useHRComplianceAutomation] generateChecklist error:', err);
    }
  }, [companyId]);

  // === TOGGLE CHECKLIST ITEM ===
  const toggleChecklistItem = useCallback(async (itemId: string, completed: boolean) => {
    try {
      const updates: any = completed
        ? { status: 'completed', completed_at: new Date().toISOString() }
        : { status: 'pending', completed_at: null };

      const { error } = await supabase
        .from('erp_hr_compliance_checklist' as any)
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;

      setChecklist(prev => prev.map(c =>
        c.id === itemId ? { ...c, ...updates } : c
      ));

      // Recalculate framework score
      await recalculateFrameworkScore(itemId);
      toast.success(completed ? 'Requisito completado' : 'Requisito reabierto');
    } catch (err) {
      console.error('[useHRComplianceAutomation] toggleChecklistItem error:', err);
      toast.error('Error al actualizar requisito');
    }
  }, []);

  // === RECALCULATE FRAMEWORK SCORE ===
  const recalculateFrameworkScore = useCallback(async (checklistItemId: string) => {
    const item = checklist.find(c => c.id === checklistItemId);
    if (!item) return;

    const frameworkItems = checklist.filter(c => c.framework_id === item.framework_id);
    const completed = frameworkItems.filter(c => c.status === 'completed' || c.id === checklistItemId).length;
    const total = frameworkItems.length;
    const score = total > 0 ? Math.round((completed / total) * 100) : 0;

    await supabase
      .from('erp_hr_compliance_frameworks')
      .update({
        met_requirements: completed,
        compliance_score: score,
        last_assessed_at: new Date().toISOString(),
      } as any)
      .eq('id', item.framework_id);
  }, [checklist]);

  // === RUN AI AUDIT ===
  const runAIAudit = useCallback(async (frameworkId?: string) => {
    if (!companyId) return null;
    try {
      const { data, error } = await supabase.functions.invoke('hr-compliance-automation', {
        body: {
          action: 'run_audit',
          company_id: companyId,
          framework_id: frameworkId,
          frameworks: frameworks.map(f => ({ id: f.id, code: f.code, name: f.name, score: f.compliance_score })),
          checklist_summary: {
            total: stats.totalChecklist,
            completed: stats.completedChecklist,
            pending: stats.pendingChecklist,
            overdue: stats.overdueChecklist,
          },
        },
      });

      if (error) throw error;

      if (data?.success && data?.audit) {
        const { error: insertError } = await supabase.from('erp_hr_compliance_audits').insert({
          company_id: companyId,
          framework_id: frameworkId || null,
          audit_name: data.audit.name || 'Auditoría IA Automatizada',
          audit_type: 'ai_automated',
          scope: data.audit.scope || [],
          status: 'completed',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          auditor_name: 'IA Compliance Engine',
          auditor_role: 'system',
          findings: data.audit.findings || [],
          recommendations: data.audit.recommendations || [],
          overall_score: data.audit.overall_score || 0,
          risk_level: data.audit.risk_level || 'medium',
        } as any);

        if (insertError) throw insertError;

        // Create alerts for critical findings
        if (data.audit.findings) {
          for (const finding of data.audit.findings.filter((f: any) => f.severity === 'critical' || f.severity === 'high')) {
            await supabase.from('erp_hr_compliance_alerts').insert({
              company_id: companyId,
              framework_id: frameworkId || null,
              alert_type: 'audit_finding',
              severity: finding.severity,
              title: finding.title,
              description: finding.description,
              regulation_reference: finding.regulation || null,
              remediation_action: finding.remediation || null,
              remediation_deadline: finding.deadline || null,
            } as any);
          }
        }

        toast.success('Auditoría IA completada');
        await fetchAll();
        return data.audit;
      }

      return null;
    } catch (err) {
      console.error('[useHRComplianceAutomation] runAIAudit error:', err);
      toast.error('Error al ejecutar auditoría');
      return null;
    }
  }, [companyId, frameworks, stats, fetchAll]);

  // === RESOLVE ALERT ===
  const resolveAlert = useCallback(async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('erp_hr_compliance_alerts')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() } as any)
        .eq('id', alertId);

      if (error) throw error;
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'resolved' } : a));
      toast.success('Alerta resuelta');
    } catch (err) {
      console.error('[useHRComplianceAutomation] resolveAlert error:', err);
      toast.error('Error al resolver alerta');
    }
  }, []);

  // === REALTIME ALERTS ===
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel('compliance-alerts-rt')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'erp_hr_compliance_alerts',
        filter: `company_id=eq.${companyId}`,
      }, (payload) => {
        const newAlert = payload.new as ComplianceAlert;
        setAlerts(prev => [newAlert, ...prev]);
        if (newAlert.severity === 'critical') {
          toast.error(`⚠️ Alerta crítica: ${newAlert.title}`);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  // === INITIAL FETCH ===
  useEffect(() => { fetchAll(); }, [fetchAll]);

  return {
    frameworks, checklist, audits, alerts,
    stats, isLoading,
    fetchAll, installFramework, toggleChecklistItem,
    runAIAudit, resolveAlert,
  };
}

export default useHRComplianceAutomation;
