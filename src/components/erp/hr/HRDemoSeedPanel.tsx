/**
 * HRDemoSeedPanel - Panel para generar y purgar datos demo de RRHH
 * Ejecuta las fases secuencialmente con barra de progreso
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
import { Database, Trash2, Play, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PhaseConfig {
  action: string;
  label: string;
  description: string;
}

const PHASES: PhaseConfig[] = [
  { action: 'seed_infrastructure', label: 'Fase 1: Infraestructura', description: '8 departamentos, 25 puestos, 3 convenios, tipos ausencia, políticas horarias' },
  { action: 'seed_employees', label: 'Fase 2: Empleados', description: '50 empleados con contratos, compensaciones y jerarquía' },
  { action: 'seed_payrolls', label: 'Fase 3: Nóminas', description: '500 nóminas (50 emp × 10 meses) con IRPF, SS, complementos' },
  { action: 'seed_time_and_absences', label: 'Fase 4: Registro Horario', description: '~2000 fichajes, 80 ausencias, 50 saldos vacaciones' },
  { action: 'seed_talent', label: 'Fase 5: Talento', description: '15 cursos, 60 inscripciones, evaluaciones, reclutamiento' },
  { action: 'seed_compliance', label: 'Fase 6: Seguridad y Beneficios', description: '8 incidentes, 5 planes beneficios, 100 documentos' },
  { action: 'seed_legal', label: 'Fase 7: Cumplimiento Legal', description: 'Plan igualdad, canal ético, alertas sanción' },
  { action: 'seed_experience', label: 'Fase 8: Experiencia Empleado', description: 'Onboarding, offboarding, reconocimientos, SS' },
];

type PhaseStatus = 'pending' | 'running' | 'success' | 'error';

interface PhaseResult {
  status: PhaseStatus;
  data?: Record<string, unknown>;
  error?: string;
}

interface HRDemoSeedPanelProps {
  companyId: string;
}

export function HRDemoSeedPanel({ companyId }: HRDemoSeedPanelProps) {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(-1);
  const [phaseResults, setPhaseResults] = useState<Record<string, PhaseResult>>({});
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const runPhase = useCallback(async (phase: PhaseConfig): Promise<boolean> => {
    setPhaseResults(prev => ({ ...prev, [phase.action]: { status: 'running' } }));
    addLog(`▶ Ejecutando ${phase.label}...`);

    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-seed-demo-data', {
        body: { action: phase.action, companyId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Error desconocido');

      setPhaseResults(prev => ({ ...prev, [phase.action]: { status: 'success', data: data.data } }));
      const summary = Object.entries(data.data || {}).map(([k, v]) => `${k}: ${v}`).join(', ');
      addLog(`✅ ${phase.label} completada → ${summary}`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setPhaseResults(prev => ({ ...prev, [phase.action]: { status: 'error', error: msg } }));
      addLog(`❌ ${phase.label} falló: ${msg}`);
      return false;
    }
  }, [companyId, addLog]);

  const runAllPhases = useCallback(async () => {
    setIsSeeding(true);
    setPhaseResults({});
    setLogs([]);
    addLog('🚀 Iniciando generación de datos demo RRHH...');

    for (let i = 0; i < PHASES.length; i++) {
      setCurrentPhase(i);
      const ok = await runPhase(PHASES[i]);
      if (!ok) {
        addLog(`⚠ Proceso detenido en ${PHASES[i].label}. Las fases anteriores se mantienen.`);
        toast.error(`Error en ${PHASES[i].label}. Proceso detenido.`);
        break;
      }
    }

    setCurrentPhase(-1);
    setIsSeeding(false);
    const successCount = Object.values(phaseResults).filter(r => r.status === 'success').length;
    if (successCount === PHASES.length) {
      addLog('🎉 ¡Todas las fases completadas con éxito!');
      toast.success('Datos demo RRHH generados correctamente (3,500+ registros)');
    }
  }, [runPhase, addLog, phaseResults]);

  const purgeDemo = useCallback(async () => {
    setIsPurging(true);
    setLogs([]);
    addLog('🗑 Iniciando purga de datos demo...');

    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-seed-demo-data', {
        body: { action: 'purge_demo', companyId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Error');

      const counts = data.data?.deletedCounts || {};
      const total = Object.values(counts as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
      addLog(`✅ Purga completada. ${total} registros eliminados en ${data.data?.totalTablesCleared} tablas.`);
      Object.entries(counts).forEach(([table, count]) => {
        if ((count as number) > 0) addLog(`  → ${table}: ${count} registros`);
      });
      setPhaseResults({});
      toast.success(`Datos demo eliminados: ${total} registros`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error';
      addLog(`❌ Error en purga: ${msg}`);
      toast.error('Error al purgar datos demo');
    } finally {
      setIsPurging(false);
    }
  }, [companyId, addLog]);

  const progress = isSeeding ? Math.round(((currentPhase + 1) / PHASES.length) * 100) : 0;
  const completedCount = Object.values(phaseResults).filter(r => r.status === 'success').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-primary" />
              Datos Demo RRHH
            </CardTitle>
            <CardDescription>
              Genera 500 nóminas, 50 empleados y datos completos en todas las secciones del módulo
            </CardDescription>
          </div>
          <Badge variant={completedCount === PHASES.length ? 'default' : 'secondary'}>
            {completedCount}/{PHASES.length} fases
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={runAllPhases}
            disabled={isSeeding || isPurging}
            className="flex-1"
          >
            {isSeeding ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generando... (Fase {currentPhase + 1}/{PHASES.length})</>
            ) : (
              <><Play className="h-4 w-4" /> Generar Datos Demo</>
            )}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isSeeding || isPurging}>
                {isPurging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Anular Demo
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  ¿Anular todos los datos demo?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminarán todos los datos generados automáticamente: empleados, nóminas, contratos, ausencias, formación, evaluaciones, documentos, etc. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={purgeDemo} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Sí, anular todo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Progress */}
        {isSeeding && (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">{progress}% completado</p>
          </div>
        )}

        {/* Phases Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PHASES.map((phase, i) => {
            const r = phaseResults[phase.action];
            const status = r?.status || 'pending';
            return (
              <div
                key={phase.action}
                className={cn(
                  'flex items-start gap-2 p-2 rounded-lg border text-xs transition-colors',
                  status === 'success' && 'bg-emerald-500/10 border-emerald-500/30',
                  status === 'running' && 'bg-primary/10 border-primary/30',
                  status === 'error' && 'bg-destructive/10 border-destructive/30',
                  status === 'pending' && 'bg-muted/30 border-border',
                )}
              >
                <div className="mt-0.5">
                  {status === 'success' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                  {status === 'running' && <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />}
                  {status === 'error' && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                  {status === 'pending' && <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{phase.label}</p>
                  <p className="text-muted-foreground truncate">{phase.description}</p>
                  {r?.error && <p className="text-destructive mt-0.5">{r.error}</p>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Logs */}
        {logs.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Log de operaciones</p>
            <ScrollArea className="h-40 rounded-lg border bg-muted/30 p-2">
              <div className="space-y-0.5 font-mono text-[11px]">
                {logs.map((log, i) => (
                  <p key={i} className="text-muted-foreground">{log}</p>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default HRDemoSeedPanel;
