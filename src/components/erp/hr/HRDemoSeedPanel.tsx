/**
 * HRDemoSeedPanel - Panel para generar y purgar datos demo de RRHH
 * 500 nóminas + empleados + infraestructura completa
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

export function HRDemoSeedPanel({ companyId }: { companyId: string }) {
  const [phaseStatuses, setPhaseStatuses] = useState<PhaseStatus[]>(
    PHASES.map(p => ({ action: p.action, status: 'pending' }))
  );
  const [isSeeding, setIsSeeding] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [demoStatus, setDemoStatus] = useState<{ employees: number; payrolls: number } | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-seed-demo-data', {
        body: { action: 'check_status', company_id: companyId }
      });
      if (!error && data?.success) {
        const match = data.details?.match(/(\d+) empleados demo, (\d+) nóminas demo/);
        if (match) {
          setDemoStatus({ employees: parseInt(match[1]), payrolls: parseInt(match[2]) });
        }
      }
    } catch (err) {
      console.error('Check status error:', err);
    } finally {
      setIsChecking(false);
    }
  }, []);

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
  }, []);

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
  }, [checkStatus]);

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
                500 nóminas + 50 empleados + infraestructura completa
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {demoStatus && (
              <Badge variant={demoStatus.employees > 0 ? 'default' : 'secondary'} className="text-xs">
                {demoStatus.employees} emp / {demoStatus.payrolls} nóm
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={checkStatus} disabled={isChecking} className="h-8 w-8">
              <RefreshCw className={cn("h-4 w-4", isChecking && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress bar when seeding */}
        {isSeeding && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progreso: {completedPhases}/{PHASES.length} fases</span>
              <span>{totalRecords.toLocaleString()} registros</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
        )}

        {/* Phases grid */}
        <ScrollArea className="h-[320px]">
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

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            onClick={handleSeedAll}
            disabled={isSeeding || isPurging}
            className="flex-1"
          >
            {isSeeding ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...</>
            ) : (
              <><Play className="h-4 w-4 mr-2" /> Generar Datos Demo</>
            )}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={isSeeding || isPurging || (!demoStatus?.employees && !demoStatus?.payrolls)}
              >
                {isPurging ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <><Trash2 className="h-4 w-4 mr-2" /> Anular Demo</>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  ¿Anular todos los datos demo?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminarán <strong>{demoStatus?.employees || 0} empleados</strong>,{' '}
                  <strong>{demoStatus?.payrolls || 0} nóminas</strong> y todos los registros asociados
                  marcados como demo. Los datos reales NO se verán afectados.
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
      </CardContent>
    </Card>
  );
}

export default HRDemoSeedPanel;
