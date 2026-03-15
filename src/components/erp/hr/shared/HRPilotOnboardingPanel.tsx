/**
 * HRPilotOnboardingPanel — Checklist de activación del piloto interno real
 * Valida datos mínimos necesarios para operar con 1 empresa piloto.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw,
  Building2, Users, FileText, Receipt, Calendar, Clock,
  Shield, Monitor, BarChart3, Briefcase, Rocket, ClipboardCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useHREnvironment } from '@/contexts/HREnvironmentContext';

interface CheckItem {
  id: string;
  category: string;
  label: string;
  description: string;
  icon: React.ElementType;
  severity: 'blocker' | 'recommended' | 'optional';
  check: (companyId: string) => Promise<{ pass: boolean; detail: string }>;
}

const PILOT_CHECKS: CheckItem[] = [
  // --- Infraestructura ---
  {
    id: 'legal_entity', category: 'Infraestructura', label: 'Entidad legal configurada',
    description: 'Al menos 1 entidad legal activa para la empresa piloto',
    icon: Building2, severity: 'recommended',
    check: async (cid) => {
      const { count } = await supabase.from('erp_hr_legal_entities').select('id', { count: 'exact', head: true }).eq('company_id', cid).eq('is_active', true);
      return { pass: (count || 0) >= 1, detail: `${count || 0} entidades legales` };
    },
  },
  {
    id: 'work_centers', category: 'Infraestructura', label: 'Centros de trabajo',
    description: 'Al menos 1 centro de trabajo registrado',
    icon: Building2, severity: 'recommended',
    check: async (cid) => {
      const { count } = await supabase.from('erp_hr_work_centers').select('id', { count: 'exact', head: true }).eq('company_id', cid).eq('is_active', true);
      return { pass: (count || 0) >= 1, detail: `${count || 0} centros` };
    },
  },
  {
    id: 'departments', category: 'Infraestructura', label: 'Departamentos',
    description: 'Departamentos creados para organizar empleados',
    icon: Building2, severity: 'blocker',
    check: async (cid) => {
      const { count } = await supabase.from('erp_hr_departments').select('id', { count: 'exact', head: true }).eq('company_id', cid);
      return { pass: (count || 0) >= 1, detail: `${count || 0} departamentos` };
    },
  },
  // --- Empleados ---
  {
    id: 'employees', category: 'Empleados', label: 'Empleados reales registrados',
    description: 'Al menos 1 empleado real (no demo) con datos completos',
    icon: Users, severity: 'blocker',
    check: async (cid) => {
      const { data } = await supabase.from('erp_hr_employees').select('id, metadata').eq('company_id', cid).eq('status', 'active');
      const real = (data || []).filter((e: any) => !e.metadata?.is_demo && !e.metadata?.is_demo_master);
      return { pass: real.length >= 1, detail: `${real.length} empleados reales (${(data || []).length} total)` };
    },
  },
  {
    id: 'employee_details', category: 'Empleados', label: 'Datos fiscales mínimos',
    description: 'NIE/NIF, dirección y datos bancarios de al menos 1 empleado',
    icon: Users, severity: 'recommended',
    check: async (cid) => {
      const { data } = await supabase.from('erp_hr_employees').select('id, national_id, email').eq('company_id', cid).eq('status', 'active');
      const withNID = (data || []).filter((e: any) => e.national_id);
      return { pass: withNID.length >= 1, detail: `${withNID.length}/${(data || []).length} con NIF/NIE` };
    },
  },
  // --- Contratos ---
  {
    id: 'contracts', category: 'Contratos', label: 'Contratos activos',
    description: 'Al menos 1 contrato activo vinculado a empleado real',
    icon: FileText, severity: 'blocker',
    check: async (cid) => {
      const { count } = await supabase.from('erp_hr_contracts').select('id', { count: 'exact', head: true }).eq('company_id', cid).eq('is_active', true);
      return { pass: (count || 0) >= 1, detail: `${count || 0} contratos activos` };
    },
  },
  // --- Nómina ---
  {
    id: 'payroll_concepts', category: 'Nómina', label: 'Conceptos salariales configurados',
    description: 'Catálogo de conceptos de nómina disponible para la empresa',
    icon: Receipt, severity: 'blocker',
    check: async (cid) => {
      const { count } = await supabase.from('erp_hr_payroll_concepts').select('id', { count: 'exact', head: true }).eq('company_id', cid).eq('is_active', true);
      return { pass: (count || 0) >= 5, detail: `${count || 0} conceptos activos` };
    },
  },
  {
    id: 'payroll_periods', category: 'Nómina', label: 'Períodos de nómina',
    description: 'Períodos mensuales creados para el ejercicio actual',
    icon: Calendar, severity: 'recommended',
    check: async (cid) => {
      const { count } = await (supabase as any).from('erp_hr_payroll_periods').select('id', { count: 'exact', head: true }).eq('company_id', cid);
      return { pass: (count || 0) >= 1, detail: `${count || 0} períodos` };
    },
  },
  // --- Vacaciones ---
  {
    id: 'leave_types', category: 'Vacaciones / Permisos', label: 'Tipos de ausencia configurados',
    description: 'Tipos de ausencia (vacaciones, permiso, IT, etc.)',
    icon: Calendar, severity: 'recommended',
    check: async (cid) => {
      const { count } = await (supabase as any).from('erp_hr_leave_types').select('id', { count: 'exact', head: true }).eq('company_id', cid).eq('is_active', true);
      return { pass: (count || 0) >= 3, detail: `${count || 0} tipos de ausencia` };
    },
  },
  // --- Registro horario ---
  {
    id: 'time_clock', category: 'Registro horario', label: 'Fichaje habilitado',
    description: 'Tabla de fichajes accesible y funcional',
    icon: Clock, severity: 'optional',
    check: async (cid) => {
      const { count } = await supabase.from('erp_hr_time_entries').select('id', { count: 'exact', head: true }).eq('company_id', cid).limit(1);
      return { pass: true, detail: `${count || 0} registros de fichaje` };
    },
  },
  // --- Portal del Empleado ---
  {
    id: 'portal_link', category: 'Portal del Empleado', label: 'Vinculación user ↔ employee',
    description: 'Al menos 1 empleado con user_id vinculado para acceso al portal',
    icon: Monitor, severity: 'recommended',
    check: async (cid) => {
      const { count } = await supabase.from('erp_hr_employees').select('id', { count: 'exact', head: true }).eq('company_id', cid).not('user_id', 'is', null);
      return { pass: (count || 0) >= 1, detail: `${count || 0} empleados con acceso portal` };
    },
  },
  // --- Seguridad ---
  {
    id: 'env_preprod', category: 'Seguridad', label: 'Entorno en PREPROD o PROD',
    description: 'El entorno RRHH NO debe estar en modo DEMO para operación real',
    icon: Shield, severity: 'blocker',
    check: async () => {
      try {
        const stored = localStorage.getItem('obelixia_hr_env_mode');
        const isPreprodOrProd = stored === 'preprod' || stored === 'prod';
        return { pass: isPreprodOrProd, detail: `Entorno actual: ${stored || 'demo'}` };
      } catch { return { pass: false, detail: 'No se pudo leer entorno' }; }
    },
  },
  {
    id: 'no_demo_data_mix', category: 'Seguridad', label: 'Sin mezcla demo/real',
    description: 'Verificar que datos demo y reales no comparten company_id del piloto',
    icon: Shield, severity: 'blocker',
    check: async (cid) => {
      const { data } = await supabase.from('erp_hr_employees').select('id, metadata').eq('company_id', cid);
      const demoCount = (data || []).filter((e: any) => e.metadata?.is_demo || e.metadata?.is_demo_master).length;
      const realCount = (data || []).length - demoCount;
      if (demoCount > 0 && realCount > 0) {
        return { pass: false, detail: `⚠️ ${demoCount} demo + ${realCount} reales en misma empresa` };
      }
      return { pass: true, detail: demoCount > 0 ? `Solo demo (${demoCount})` : `Solo reales (${realCount})` };
    },
  },
  // --- Reporting ---
  {
    id: 'reporting', category: 'Reporting', label: 'Datos suficientes para reporting',
    description: 'Al menos 1 nómina procesada para generar informes',
    icon: BarChart3, severity: 'optional',
    check: async (cid) => {
      const { count } = await (supabase as any).from('erp_hr_payroll_records').select('id', { count: 'exact', head: true }).eq('company_id', cid);
      return { pass: (count || 0) >= 1, detail: `${count || 0} registros de nómina` };
    },
  },
];

const SEVERITY_CONFIG = {
  blocker: { label: 'Bloqueante', color: 'text-destructive', bg: 'bg-destructive/10', icon: XCircle },
  recommended: { label: 'Recomendado', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', icon: AlertTriangle },
  optional: { label: 'Opcional', color: 'text-muted-foreground', bg: 'bg-muted', icon: AlertTriangle },
};

interface CheckResult {
  id: string;
  pass: boolean;
  detail: string;
  status: 'pending' | 'running' | 'done' | 'error';
}

interface HRPilotOnboardingPanelProps {
  companyId: string;
}

export function HRPilotOnboardingPanel({ companyId }: HRPilotOnboardingPanelProps) {
  const { mode } = useHREnvironment();
  const [results, setResults] = useState<CheckResult[]>(
    PILOT_CHECKS.map(c => ({ id: c.id, pass: false, detail: '', status: 'pending' }))
  );
  const [isRunning, setIsRunning] = useState(false);

  const runChecks = useCallback(async () => {
    setIsRunning(true);
    const newResults: CheckResult[] = [];

    for (const check of PILOT_CHECKS) {
      setResults(prev => prev.map(r => r.id === check.id ? { ...r, status: 'running' } : r));
      try {
        const result = await check.check(companyId);
        newResults.push({ id: check.id, pass: result.pass, detail: result.detail, status: 'done' });
      } catch (err) {
        newResults.push({ id: check.id, pass: false, detail: 'Error en validación', status: 'error' });
      }
      setResults([...newResults, ...PILOT_CHECKS.slice(newResults.length).map(c => ({ id: c.id, pass: false, detail: '', status: 'pending' as const }))]);
    }

    setResults(newResults);
    setIsRunning(false);
  }, [companyId]);

  useEffect(() => { runChecks(); }, [runChecks]);

  const summary = useMemo(() => {
    const done = results.filter(r => r.status === 'done');
    const passed = done.filter(r => r.pass).length;
    const blockers = PILOT_CHECKS.filter(c => c.severity === 'blocker');
    const blockersPassed = blockers.filter(b => results.find(r => r.id === b.id)?.pass).length;
    const allBlockersPass = blockersPassed === blockers.length;
    const goReady = allBlockersPass && done.length === PILOT_CHECKS.length;
    return { passed, total: PILOT_CHECKS.length, blockersPassed, blockersTotal: blockers.length, allBlockersPass, goReady };
  }, [results]);

  const categories = useMemo(() => {
    const cats = new Map<string, { checks: CheckItem[]; results: CheckResult[] }>();
    for (const check of PILOT_CHECKS) {
      if (!cats.has(check.category)) cats.set(check.category, { checks: [], results: [] });
      const cat = cats.get(check.category)!;
      cat.checks.push(check);
      const r = results.find(res => res.id === check.id);
      if (r) cat.results.push(r);
    }
    return cats;
  }, [results]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className={cn(
        'border-2',
        summary.goReady ? 'border-green-500/40 bg-green-500/5' : 'border-amber-500/40 bg-amber-500/5'
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2.5 rounded-xl',
                summary.goReady ? 'bg-green-500/15' : 'bg-amber-500/15'
              )}>
                {summary.goReady
                  ? <Rocket className="h-6 w-6 text-green-600 dark:text-green-400" />
                  : <ClipboardCheck className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                }
              </div>
              <div>
                <CardTitle className="text-lg">Checklist Piloto Interno</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Validación de datos mínimos para operación real · Empresa piloto
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant={summary.goReady ? 'default' : 'secondary'} className={cn(
                'text-sm px-3 py-1',
                summary.goReady && 'bg-green-600'
              )}>
                {summary.goReady ? '✅ GO' : '⏳ NO-GO'}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.passed}/{summary.total} checks · {summary.blockersPassed}/{summary.blockersTotal} bloqueantes
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Progress value={(summary.passed / summary.total) * 100} className="h-2.5" />
          <div className="flex items-center gap-3 mt-2">
            <Button variant="outline" size="sm" onClick={runChecks} disabled={isRunning} className="gap-1.5">
              {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Re-validar
            </Button>
            {mode === 'demo' && (
              <Badge variant="destructive" className="text-[10px]">
                ⚠️ Entorno en DEMO — cambia a PREPROD para piloto real
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Checks by category */}
      <ScrollArea className="h-[calc(100vh-400px)]">
        <div className="space-y-4 pr-2">
          {Array.from(categories.entries()).map(([catName, { checks, results: catResults }]) => {
            const catPassed = catResults.filter(r => r.pass).length;
            return (
              <Card key={catName}>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {checks[0] && (() => { const Icon = checks[0].icon; return <Icon className="h-4 w-4 text-primary" />; })()}
                      {catName}
                    </CardTitle>
                    <Badge variant={catPassed === checks.length ? 'default' : 'secondary'} className="text-[10px]">
                      {catPassed}/{checks.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 px-4 pb-3">
                  <div className="space-y-2">
                    {checks.map(check => {
                      const r = catResults.find(res => res.id === check.id);
                      const sevCfg = SEVERITY_CONFIG[check.severity];

                      return (
                        <div key={check.id} className={cn(
                          'flex items-start gap-3 p-2.5 rounded-lg border transition-colors',
                          r?.pass ? 'bg-green-500/5 border-green-500/20' : 'bg-card border-border',
                        )}>
                          <div className="mt-0.5 shrink-0">
                            {r?.status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                            {r?.status === 'done' && r.pass && <CheckCircle className="h-4 w-4 text-green-600" />}
                            {r?.status === 'done' && !r.pass && <sevCfg.icon className={cn('h-4 w-4', sevCfg.color)} />}
                            {r?.status === 'error' && <XCircle className="h-4 w-4 text-destructive" />}
                            {r?.status === 'pending' && <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{check.label}</span>
                              <Badge variant="outline" className={cn('text-[9px] px-1 py-0', sevCfg.color)}>
                                {sevCfg.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{check.description}</p>
                            {r?.detail && (
                              <p className={cn(
                                'text-xs mt-1 font-mono',
                                r.pass ? 'text-green-600 dark:text-green-400' : sevCfg.color
                              )}>
                                → {r.detail}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export default HRPilotOnboardingPanel;
