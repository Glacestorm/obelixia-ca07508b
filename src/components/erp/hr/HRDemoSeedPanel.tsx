/**
 * HRDemoSeedPanel - Panel para generar y purgar datos demo de RRHH
 * Incluye Seed MVP (50 empleados) + Seed Demo Maestro (12 perfiles casuísticos)
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Database,
  Play,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Users,
  Receipt,
  Clock,
  GraduationCap,
  Shield,
  Scale,
  Heart,
  Crown,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useHREnvironment } from '@/contexts/HREnvironmentContext';

interface PhaseConfig {
  action: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  estimatedRecords: string;
}

const PHASES: PhaseConfig[] = [
  { action: 'seed_infrastructure', label: 'Infraestructura', description: 'Departamentos, puestos, convenios, tipos ausencia', icon: <Database className="h-4 w-4" />, estimatedRecords: '~45' },
  { action: 'seed_employees', label: 'Empleados', description: '50 empleados con contratos y compensaciones', icon: <Users className="h-4 w-4" />, estimatedRecords: '~150' },
  { action: 'seed_payrolls', label: 'Nóminas', description: '500 nóminas (50 emp × 10 meses)', icon: <Receipt className="h-4 w-4" />, estimatedRecords: '500' },
  { action: 'seed_time_absences', label: 'Horarios y Ausencias', description: 'Registros horarios, vacaciones, saldos', icon: <Clock className="h-4 w-4" />, estimatedRecords: '~2130' },
  { action: 'seed_talent', label: 'Talento', description: 'Formación, evaluaciones, reclutamiento', icon: <GraduationCap className="h-4 w-4" />, estimatedRecords: '~165' },
  { action: 'seed_compliance', label: 'Seguridad y Beneficios', description: 'Incidentes, beneficios, documentos', icon: <Shield className="h-4 w-4" />, estimatedRecords: '~145' },
  { action: 'seed_legal', label: 'Cumplimiento Legal', description: 'Plan igualdad, canal ético, alertas', icon: <Scale className="h-4 w-4" />, estimatedRecords: '~9' },
  { action: 'seed_experience', label: 'Experiencia Empleado', description: 'Onboarding, reconocimientos, cotizaciones SS', icon: <Heart className="h-4 w-4" />, estimatedRecords: '~570' },
  { action: 'seed_talent_advanced', label: 'Talento Avanzado', description: 'Oportunidades marketplace, posiciones sucesión', icon: <Sparkles className="h-4 w-4" />, estimatedRecords: '~13' },
  { action: 'seed_operations', label: 'Operaciones Avanzadas', description: 'Finiquitos, offboarding, recálculos, objetivos', icon: <Receipt className="h-4 w-4" />, estimatedRecords: '~49' },
  { action: 'seed_regulatory', label: 'Vigilancia Normativa', description: 'Normativas BOE/DOUE, alertas, configuración', icon: <Shield className="h-4 w-4" />, estimatedRecords: '~14' },
  { action: 'seed_time_clock', label: 'Control Fichaje', description: 'Registros fichaje 20 días × 50 empleados', icon: <Clock className="h-4 w-4" />, estimatedRecords: '~1000' },
];

interface PhaseStatus {
  action: string;
  status: 'pending' | 'running' | 'success' | 'error';
  records?: number;
  details?: string;
  error?: string;
}

interface MasterDemoResult {
  success: boolean;
  batchId?: string;
  totalRecords?: number;
  phases?: { phase: string; count: number }[];
  profiles?: { code: string; name: string; scenario: string; status: string }[];
  validation?: {
    total: number;
    passed: number;
    failed: number;
    results: { check: string; expected: string; actual: string; pass: boolean }[];
    overallPass: boolean;
  };
  error?: string;
}

export function HRDemoSeedPanel({ companyId }: { companyId: string }) {
  const { canSeed, canPurge, mode, config } = useHREnvironment();
  const [phaseStatuses, setPhaseStatuses] = useState<PhaseStatus[]>(
    PHASES.map(p => ({ action: p.action, status: 'pending' }))
  );
  const [isSeeding, setIsSeeding] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [demoStatus, setDemoStatus] = useState<{ employees: number; payrolls: number } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [activeTab, setActiveTab] = useState('master');

  // Environment guard — block seeds in non-demo modes
  if (!canSeed) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-destructive/60" />
          <h3 className="font-semibold text-lg mb-1">Seeds bloqueados en modo {config.label}</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            La generación y purga de datos demo solo está disponible en modo DEMO. 
            Cambia el entorno desde el banner superior para habilitar esta función.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Master Demo state
  const [isSeedingMaster, setIsSeedingMaster] = useState(false);
  const [isPurgingMaster, setIsPurgingMaster] = useState(false);
  const [masterStatus, setMasterStatus] = useState<number>(0);
  const [masterResult, setMasterResult] = useState<MasterDemoResult | null>(null);

  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      // Check MVP status
      const { data, error } = await supabase.functions.invoke('erp-hr-seed-demo-data', {
        body: { action: 'check_status', company_id: companyId }
      });
      if (!error && data?.success) {
        const match = data.details?.match(/(\d+) empleados demo, (\d+) nóminas demo/);
        if (match) {
          setDemoStatus({ employees: parseInt(match[1]), payrolls: parseInt(match[2]) });
        }
      }

      // Check master status
      const { data: masterData } = await supabase.functions.invoke('erp-hr-seed-demo-master', {
        body: { action: 'check_status', company_id: companyId }
      });
      if (masterData?.success) {
        setMasterStatus(masterData.masterDemoEmployees || 0);
      }
    } catch (err) {
      console.error('Check status error:', err);
    } finally {
      setIsChecking(false);
    }
  }, [companyId]);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  const runPhase = useCallback(async (action: string): Promise<boolean> => {
    setPhaseStatuses(prev => prev.map(p =>
      p.action === action ? { ...p, status: 'running' } : p
    ));

    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-seed-demo-data', {
        body: { action, company_id: companyId }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Error desconocido');

      setPhaseStatuses(prev => prev.map(p =>
        p.action === action ? { ...p, status: 'success', records: data.records, details: data.details } : p
      ));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setPhaseStatuses(prev => prev.map(p =>
        p.action === action ? { ...p, status: 'error', error: message } : p
      ));
      return false;
    }
  }, [companyId]);

  const handleSeedAll = useCallback(async () => {
    setIsSeeding(true);
    setPhaseStatuses(PHASES.map(p => ({ action: p.action, status: 'pending' })));

    for (const phase of PHASES) {
      const ok = await runPhase(phase.action);
      if (!ok) {
        toast.error(`Error en fase: ${phase.label}`);
        break;
      }
    }

    setIsSeeding(false);
    checkStatus();
    toast.success('Generación de datos demo completada');
  }, [runPhase, checkStatus]);

  const handlePurge = useCallback(async () => {
    setIsPurging(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-seed-demo-data', {
        body: { action: 'purge_demo', company_id: companyId }
      });

      if (error) throw error;

      toast.success(`Datos demo eliminados: ${data?.records || 0} registros`);
      setPhaseStatuses(PHASES.map(p => ({ action: p.action, status: 'pending' })));
      checkStatus();
    } catch (err) {
      toast.error('Error al purgar datos demo');
    } finally {
      setIsPurging(false);
    }
  }, [companyId, checkStatus]);

  // === MASTER DEMO ===
  const handleSeedMaster = useCallback(async () => {
    setIsSeedingMaster(true);
    setMasterResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-seed-demo-master', {
        body: {
          action: 'seed_master_demo',
          company_id: companyId,
          reset_previous: true,
          run_validations: true,
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Error desconocido');

      setMasterResult(data);
      toast.success(`Seed Demo Maestro completado: ${data.totalRecords} registros, ${data.validation?.passed}/${data.validation?.total} validaciones`);
      checkStatus();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setMasterResult({ success: false, error: msg });
      toast.error(`Error en Seed Demo Maestro: ${msg}`);
    } finally {
      setIsSeedingMaster(false);
    }
  }, [companyId, checkStatus]);

  const handlePurgeMaster = useCallback(async () => {
    setIsPurgingMaster(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-seed-demo-master', {
        body: { action: 'purge_master', company_id: companyId }
      });
      if (error) throw error;
      toast.success('Datos demo maestros eliminados');
      setMasterResult(null);
      checkStatus();
    } catch (err) {
      toast.error('Error al purgar datos maestros');
    } finally {
      setIsPurgingMaster(false);
    }
  }, [companyId, checkStatus]);

  const completedPhases = phaseStatuses.filter(p => p.status === 'success').length;
  const totalRecords = phaseStatuses.reduce((s, p) => s + (p.records || 0), 0);
  const progressPct = (completedPhases / PHASES.length) * 100;

  return (
    <Card className="border-dashed border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Generador de Datos Demo</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                MVP (50 emp) + Demo Maestro (12 perfiles casuísticos)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {demoStatus && (
              <Badge variant={demoStatus.employees > 0 ? 'default' : 'secondary'} className="text-xs">
                MVP: {demoStatus.employees} emp
              </Badge>
            )}
            {masterStatus > 0 && (
              <Badge variant="default" className="text-xs bg-amber-500/90">
                <Crown className="h-3 w-3 mr-1" />
                Maestro: {masterStatus}
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={checkStatus} disabled={isChecking} className="h-8 w-8">
              <RefreshCw className={cn("h-4 w-4", isChecking && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="master" className="text-xs">
              <Crown className="h-3.5 w-3.5 mr-1" /> Demo Maestro (12 perfiles)
            </TabsTrigger>
            <TabsTrigger value="mvp" className="text-xs">
              <Database className="h-3.5 w-3.5 mr-1" /> MVP (50 empleados)
            </TabsTrigger>
          </TabsList>

          {/* === MASTER DEMO TAB === */}
          <TabsContent value="master" className="space-y-4 mt-0">
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Seed Demo Maestro:</strong> 12 perfiles con casuísticas avanzadas españolas —
                horas extra, stock options, IT accidente, paternidad, desplazamiento internacional, reducción jornada,
                despido disciplinario/objetivo, atrasos, retribución flexible.
              </p>
            </div>

            {/* Profiles list */}
            {masterResult?.profiles && (
              <ScrollArea className="h-[220px]">
                <div className="space-y-1.5">
                  {masterResult.profiles.map((profile) => (
                    <div key={profile.code} className="flex items-center gap-2 p-2 rounded-lg border bg-card text-xs">
                      <Badge variant={
                        profile.status === 'active' ? 'default' :
                        profile.status === 'on_leave' ? 'secondary' : 'destructive'
                      } className="text-[10px] shrink-0">
                        {profile.status}
                      </Badge>
                      <span className="font-medium">{profile.name}</span>
                      <span className="text-muted-foreground ml-auto">{profile.scenario.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Validation results */}
            {masterResult?.validation && (
              <div className={cn(
                "p-3 rounded-lg border text-xs",
                masterResult.validation.overallPass ? "bg-green-500/5 border-green-500/20" : "bg-amber-500/5 border-amber-500/20"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  {masterResult.validation.overallPass
                    ? <CheckCircle className="h-4 w-4 text-green-600" />
                    : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                  <span className="font-medium">
                    Validación: {masterResult.validation.passed}/{masterResult.validation.total} checks
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {masterResult.validation.results.map((r, i) => (
                    <div key={i} className="flex items-center gap-1">
                      {r.pass
                        ? <CheckCircle className="h-3 w-3 text-green-600 shrink-0" />
                        : <XCircle className="h-3 w-3 text-red-500 shrink-0" />}
                      <span className="truncate">{r.check}: {r.actual}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Master action buttons */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                onClick={handleSeedMaster}
                disabled={isSeedingMaster || isPurgingMaster}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {isSeedingMaster ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando 12 perfiles...</>
                ) : (
                  <><Crown className="h-4 w-4 mr-2" /> Seed Demo Maestro</>
                )}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isSeedingMaster || isPurgingMaster || masterStatus === 0}>
                    {isPurgingMaster ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      ¿Eliminar perfiles demo maestros?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminarán los <strong>{masterStatus} perfiles maestros</strong> y todos sus datos asociados.
                      Los datos MVP y reales NO se verán afectados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePurgeMaster} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Sí, eliminar maestros
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TabsContent>

          {/* === MVP SEED TAB === */}
          <TabsContent value="mvp" className="space-y-4 mt-0">
            {isSeeding && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progreso: {completedPhases}/{PHASES.length} fases</span>
                  <span>{totalRecords.toLocaleString()} registros</span>
                </div>
                <Progress value={progressPct} className="h-2" />
              </div>
            )}

            <ScrollArea className="h-[280px]">
              <div className="space-y-2">
                {PHASES.map((phase, idx) => {
                  const status = phaseStatuses[idx];
                  return (
                    <div
                      key={phase.action}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                        status.status === 'success' && "bg-green-500/5 border-green-500/20",
                        status.status === 'error' && "bg-destructive/5 border-destructive/20",
                        status.status === 'running' && "bg-primary/5 border-primary/20",
                        status.status === 'pending' && "bg-muted/30"
                      )}
                    >
                      <div className={cn(
                        "p-1.5 rounded-md",
                        status.status === 'success' ? "bg-green-500/10 text-green-600" :
                        status.status === 'error' ? "bg-destructive/10 text-destructive" :
                        status.status === 'running' ? "bg-primary/10 text-primary" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {status.status === 'running' ? <Loader2 className="h-4 w-4 animate-spin" /> :
                         status.status === 'success' ? <CheckCircle className="h-4 w-4" /> :
                         status.status === 'error' ? <XCircle className="h-4 w-4" /> :
                         phase.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{phase.label}</span>
                          <span className="text-xs text-muted-foreground">({phase.estimatedRecords})</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {status.details || phase.description}
                        </p>
                        {status.error && (
                          <p className="text-xs text-destructive mt-0.5">{status.error}</p>
                        )}
                      </div>
                      {status.records !== undefined && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {status.records.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="flex gap-2 pt-2 border-t">
              <Button onClick={handleSeedAll} disabled={isSeeding || isPurging} className="flex-1">
                {isSeeding ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" /> Generar Datos MVP</>
                )}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isSeeding || isPurging || (!demoStatus?.employees && !demoStatus?.payrolls)}>
                    {isPurging ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <><Trash2 className="h-4 w-4 mr-2" /> Anular</>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      ¿Anular todos los datos demo MVP?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminarán <strong>{demoStatus?.employees || 0} empleados</strong>,{' '}
                      <strong>{demoStatus?.payrolls || 0} nóminas</strong> y todos los registros asociados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePurge} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Sí, anular datos demo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default HRDemoSeedPanel;
