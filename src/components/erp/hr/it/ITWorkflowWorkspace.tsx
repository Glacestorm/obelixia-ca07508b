/**
 * ITWorkflowWorkspace.tsx — Unified IT workflow workspace
 * P2.2: Panel único de IT con resumen, timeline, checklist, financiero, FDI
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Activity, FileText, CheckCircle, Clock, AlertTriangle,
  XCircle, ChevronRight, Calculator, Shield, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  IT_PIPELINE_STATE_META,
  IT_PIPELINE_STATE_ORDER,
  IT_PIPELINE_VALID_TRANSITIONS,
  type ITPipelineState,
} from '@/engines/erp/hr/itWorkflowPipelineEngine';
import { IT_PROCESS_TYPE_LABELS } from '@/types/hr';
import type { ITWorkflowPipelineResult } from '@/hooks/erp/hr/useITWorkflowPipeline';

interface ITWorkflowWorkspaceProps {
  pipeline: ITWorkflowPipelineResult;
  className?: string;
}

export function ITWorkflowWorkspace({ pipeline, className }: ITWorkflowWorkspaceProps) {
  const [activeTab, setActiveTab] = useState('resumen');
  const { caseData, pipelineState, checklist, timeline, fdiChecklist, signals } = pipeline;

  if (!caseData || !pipelineState) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="py-12 text-center">
          <Activity className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Selecciona un proceso IT para ver el workspace</p>
        </CardContent>
      </Card>
    );
  }

  const { process } = caseData;
  const stateMeta = IT_PIPELINE_STATE_META[pipelineState];
  const completedItems = checklist.filter(c => c.completed).length;
  const totalRequired = checklist.filter(c => c.required).length;
  const completionPct = totalRequired > 0 ? Math.round((completedItems / totalRequired) * 100) : 0;
  const validTransitions = IT_PIPELINE_VALID_TRANSITIONS[pipelineState] ?? [];

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header with pipeline stepper */}
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">
                IT — {IT_PROCESS_TYPE_LABELS[process.process_type as keyof typeof IT_PROCESS_TYPE_LABELS] ?? process.process_type}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Inicio: {format(new Date(process.start_date), 'dd/MM/yyyy')}
                {process.end_date && ` — Fin: ${format(new Date(process.end_date), 'dd/MM/yyyy')}`}
              </p>
            </div>
          </div>
          <Badge className={cn('text-xs', stateMeta.color)}>{stateMeta.label}</Badge>
        </div>

        {/* Pipeline stepper */}
        <div className="flex items-center gap-1">
          {IT_PIPELINE_STATE_ORDER.map((state, i) => {
            const meta = IT_PIPELINE_STATE_META[state];
            const isCurrent = state === pipelineState;
            const isPast = meta.stepIndex < stateMeta.stepIndex;
            return (
              <div key={state} className="flex items-center flex-1">
                <div className={cn(
                  'h-2 flex-1 rounded-full transition-colors',
                  isCurrent ? 'bg-primary' : isPast ? 'bg-primary/40' : 'bg-muted',
                )} />
                {i < IT_PIPELINE_STATE_ORDER.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5 shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Action bar */}
        {validTransitions.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {validTransitions.map(target => {
              const guard = pipeline.evaluateTransition(target);
              const targetMeta = IT_PIPELINE_STATE_META[target];
              return (
                <Button
                  key={target}
                  size="sm"
                  variant={target === 'cancelled' ? 'destructive' : 'outline'}
                  disabled={!guard?.allowed}
                  onClick={() => pipeline.transitionTo(target)}
                  className="text-xs gap-1"
                >
                  <ArrowRight className="h-3 w-3" />
                  {targetMeta.label}
                </Button>
              );
            })}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-3">
            <TabsTrigger value="resumen" className="text-xs">Resumen</TabsTrigger>
            <TabsTrigger value="financiero" className="text-xs">Financiero</TabsTrigger>
            <TabsTrigger value="fdi" className="text-xs">FDI</TabsTrigger>
            <TabsTrigger value="checklist" className="text-xs">Checklist</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
          </TabsList>

          {/* RESUMEN */}
          <TabsContent value="resumen" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {/* Process info */}
                <div className="grid grid-cols-2 gap-3">
                  <InfoBlock label="Contingencia" value={IT_PROCESS_TYPE_LABELS[process.process_type as keyof typeof IT_PROCESS_TYPE_LABELS] ?? process.process_type} />
                  <InfoBlock label="Estado" value={stateMeta.label} />
                  <InfoBlock label="Inicio" value={format(new Date(process.start_date), 'dd/MM/yyyy')} />
                  <InfoBlock label="Fin" value={process.end_date ? format(new Date(process.end_date), 'dd/MM/yyyy') : 'En curso'} />
                  <InfoBlock label="Diagnóstico" value={process.diagnosis_description ?? process.diagnosis_code ?? '—'} />
                  <InfoBlock label="Recaída" value={process.has_relapse ? 'Sí' : 'No'} />
                  <InfoBlock label="Pago directo" value={process.direct_payment ? 'Sí' : 'No'} />
                  <InfoBlock label="Partes" value={`${caseData.parts.length} registrados`} />
                </div>

                <Separator />

                {/* Completion */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Completitud del expediente</span>
                    <span>{completionPct}%</span>
                  </div>
                  <Progress value={completionPct} className="h-2" />
                </div>

                {/* Signals summary */}
                {signals && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase">Señales cross-módulo</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <SignalBadge label="Empleado en IT" active={signals.hr.employee_on_leave} />
                        <SignalBadge label="FDI pendiente" active={signals.compliance.fdi_pending} variant="warning" />
                        <SignalBadge label="Ajuste SS" active={signals.fiscal.ss_deduction_adjustment} />
                        <SignalBadge label="Recalculo IRPF" active={signals.fiscal.irpf_recalculation} />
                        <SignalBadge label="Confirmaciones vencidas" active={signals.compliance.overdue_confirmations} variant="critical" />
                        <SignalBadge label={`${signals.compliance.milestone_alerts} alertas hito`} active={signals.compliance.milestone_alerts > 0} variant="warning" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* FINANCIERO */}
          <TabsContent value="financiero" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {caseData.bases.length > 0 ? (
                  <>
                    {caseData.bases.map((base, i) => (
                      <Card key={base.id} className="border">
                        <CardContent className="pt-4 space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Base reguladora</span>
                            <span className="font-mono font-semibold">{base.total_base_reguladora?.toFixed(2)} €/día</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">% Subsidio</span>
                            <span className="font-mono">{base.pct_subsidy}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Subsidio diario</span>
                            <span className="font-mono">{base.daily_subsidy?.toFixed(2)} €</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Complemento empresa</span>
                            <span className="font-mono">{base.employer_complement?.toFixed(2)} €/día</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Método</span>
                            <span>{base.calculation_method}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {signals && (
                      <Card className="border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                        <CardContent className="pt-4 space-y-2 text-xs">
                          <h4 className="font-semibold text-blue-700 dark:text-blue-300">Impacto en nómina</h4>
                          <div className="flex justify-between">
                            <span>Días afectados</span>
                            <span className="font-mono">{signals.payroll.days_affected}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pagador subsidio</span>
                            <span>{signals.payroll.subsidy_payer}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Impacto bruto est.</span>
                            <span className="font-mono">{signals.payroll.gross_impact_estimated?.toFixed(2)} €</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Base reguladora no calculada
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* FDI */}
          <TabsContent value="fdi" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {fdiChecklist.map(item => (
                  <div key={item.fdiType} className="flex items-center gap-3 p-3 rounded-lg border">
                    {item.generated ? (
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    ) : item.required ? (
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">Plazo: {item.plazo}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {item.status === 'not_generated' ? 'Pendiente' : item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* CHECKLIST */}
          <TabsContent value="checklist" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {checklist.map(item => (
                  <div key={item.key} className="flex items-start gap-3 p-3 rounded-lg border">
                    {item.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    ) : item.required ? (
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                      {item.norm && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{item.norm}</p>}
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{item.category}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TIMELINE */}
          <TabsContent value="timeline" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
                {timeline.map((event, i) => (
                  <div key={i} className="relative">
                    <div className={cn(
                      'absolute -left-[18px] w-3 h-3 rounded-full border-2 border-background',
                      event.severity === 'critical' ? 'bg-red-500' :
                      event.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500',
                    )} />
                    <div className="p-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {format(new Date(event.date), 'dd/MM/yyyy')}
                        </span>
                        <Badge variant="outline" className="text-[10px]">{event.type}</Badge>
                      </div>
                      <p className="text-sm font-medium mt-0.5">{event.label}</p>
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ── Helpers ──

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-lg bg-muted/50">
      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}

function SignalBadge({ label, active, variant = 'info' }: { label: string; active: boolean; variant?: 'info' | 'warning' | 'critical' }) {
  if (!active) return null;
  const colors = {
    info: 'bg-blue-500/10 text-blue-700 border-blue-200',
    warning: 'bg-amber-500/10 text-amber-700 border-amber-200',
    critical: 'bg-red-500/10 text-red-700 border-red-200',
  };
  return <Badge className={cn('text-[10px]', colors[variant])}>{label}</Badge>;
}

export default ITWorkflowWorkspace;
