/**
 * OffboardingWorkspace.tsx — Unified offboarding workspace
 * P2.1: Pipeline de baja unificado end-to-end
 *
 * Single workspace for an offboarding case showing:
 * - Pipeline stepper
 * - Case summary
 * - Timeline
 * - Checklist
 * - Financial block
 * - Document block
 * - State-driven actions
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Calculator,
  FileText,
  DollarSign,
  AlertTriangle,
  Archive,
  XCircle,
  Shield,
  Scale,
  Calendar,
  User,
  ClipboardList,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  PIPELINE_STATE_META,
  PIPELINE_STATE_ORDER,
  type OffboardingCase,
  type OffboardingPipelineState,
  type PipelineTimelineEvent,
  type PipelineChecklistItem,
} from '@/engines/erp/hr/offboardingPipelineEngine';
import type { TransitionGuardResult } from '@/engines/erp/hr/offboardingPipelineEngine';
import type { SettlementEvidenceSnapshot } from '@/engines/erp/hr/settlementEvidenceEngine';

// ── Types ──

interface OffboardingWorkspaceProps {
  caseData: OffboardingCase;
  timeline: PipelineTimelineEvent[];
  checklist: { items: PipelineChecklistItem[]; completedCount: number; totalRequired: number; readinessPercent: number } | null;
  settlement: SettlementEvidenceSnapshot | null;
  onTransition: (target: OffboardingPipelineState, detail?: string) => Promise<boolean>;
  onCalculateSettlement: () => void;
  onBack: () => void;
  canTransitionTo: (target: OffboardingPipelineState) => TransitionGuardResult;
}

// ── Constants ──

const TERMINATION_TYPE_LABELS: Record<string, string> = {
  voluntary: 'Baja Voluntaria',
  objective: 'Despido Objetivo',
  disciplinary: 'Despido Disciplinario',
  mutual: 'Mutuo Acuerdo',
  end_contract: 'Fin de Contrato',
  retirement: 'Jubilación',
  collective: 'ERE/ERTE',
  probation: 'Periodo de Prueba',
  death: 'Fallecimiento',
  permanent_disability: 'Incapacidad Permanente',
};

const STATE_ICONS: Record<OffboardingPipelineState, React.ReactNode> = {
  draft: <FileText className="h-4 w-4" />,
  in_review: <Clock className="h-4 w-4" />,
  approved_hr: <CheckCircle className="h-4 w-4" />,
  pending_calculation: <Calculator className="h-4 w-4" />,
  settlement_generated: <DollarSign className="h-4 w-4" />,
  certificate_prepared: <FileText className="h-4 w-4" />,
  pending_payment: <DollarSign className="h-4 w-4" />,
  closed: <Archive className="h-4 w-4" />,
  cancelled: <XCircle className="h-4 w-4" />,
};

// ── Component ──

export function OffboardingWorkspace({
  caseData,
  timeline,
  checklist,
  settlement,
  onTransition,
  onCalculateSettlement,
  onBack,
  canTransitionTo,
}: OffboardingWorkspaceProps) {
  const [activeTab, setActiveTab] = useState('resumen');

  const currentStepIndex = PIPELINE_STATE_ORDER.indexOf(caseData.pipelineState);
  const progressPercent = caseData.pipelineState === 'cancelled'
    ? 0
    : Math.round(((currentStepIndex + 1) / PIPELINE_STATE_ORDER.length) * 100);

  const nextState = currentStepIndex < PIPELINE_STATE_ORDER.length - 1
    ? PIPELINE_STATE_ORDER[currentStepIndex + 1]
    : null;

  const nextGuard = nextState ? canTransitionTo(nextState) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {caseData.employeeName}
            </h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className={PIPELINE_STATE_META[caseData.pipelineState].color}>
                {STATE_ICONS[caseData.pipelineState]}
                <span className="ml-1">{PIPELINE_STATE_META[caseData.pipelineState].label}</span>
              </Badge>
              <span>·</span>
              <span>{TERMINATION_TYPE_LABELS[caseData.terminationType] ?? caseData.terminationType}</span>
              {caseData.effectiveDate && (
                <>
                  <span>·</span>
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(caseData.effectiveDate), 'dd/MM/yyyy')}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {caseData.legalReviewRequired && (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/30">
            <Scale className="h-3 w-3 mr-1" />
            Revisión legal
          </Badge>
        )}
      </div>

      {/* Pipeline Stepper */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Pipeline de Baja</span>
            <span className="text-xs text-muted-foreground">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2 mb-3" />
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {PIPELINE_STATE_ORDER.map((state, idx) => {
              const meta = PIPELINE_STATE_META[state];
              const isCurrent = state === caseData.pipelineState;
              const isDone = idx < currentStepIndex;
              const isFuture = idx > currentStepIndex;

              return (
                <div
                  key={state}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded text-xs whitespace-nowrap transition-colors',
                    isCurrent && meta.color + ' font-medium',
                    isDone && 'bg-emerald-500/10 text-emerald-700',
                    isFuture && 'bg-muted/50 text-muted-foreground',
                  )}
                >
                  {isDone ? <CheckCircle className="h-3 w-3" /> : STATE_ICONS[state]}
                  <span className="hidden sm:inline">{meta.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Bar */}
      {nextState && caseData.pipelineState !== 'closed' && caseData.pipelineState !== 'cancelled' && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Siguiente paso: {PIPELINE_STATE_META[nextState].label}</p>
              <p className="text-xs text-muted-foreground">{PIPELINE_STATE_META[nextState].description}</p>
              {nextGuard && !nextGuard.allowed && (
                <div className="mt-1 space-y-0.5">
                  {nextGuard.blockers.map((b, i) => (
                    <p key={i} className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />{b}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {caseData.pipelineState === 'pending_calculation' && !caseData.finiquitoComputed && (
                <Button size="sm" variant="outline" onClick={onCalculateSettlement}>
                  <Calculator className="h-3 w-3 mr-1" />
                  Calcular Finiquito
                </Button>
              )}
              <Button
                size="sm"
                disabled={!nextGuard?.allowed}
                onClick={() => onTransition(nextState)}
              >
                Avanzar
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onTransition('cancelled', 'Anulado manualmente')}
              >
                Anular
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="resumen" className="text-xs gap-1">
            <ClipboardList className="h-3 w-3" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="financiero" className="text-xs gap-1">
            <DollarSign className="h-3 w-3" />
            Financiero
          </TabsTrigger>
          <TabsTrigger value="documentos" className="text-xs gap-1">
            <FileText className="h-3 w-3" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="checklist" className="text-xs gap-1">
            <CheckCircle className="h-3 w-3" />
            Checklist
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs gap-1">
            <Activity className="h-3 w-3" />
            Timeline
          </TabsTrigger>
        </TabsList>

        {/* Resumen */}
        <TabsContent value="resumen" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Datos de la Baja</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Tipo" value={TERMINATION_TYPE_LABELS[caseData.terminationType] ?? '-'} />
                <Row label="Fecha efectiva" value={caseData.effectiveDate ? format(new Date(caseData.effectiveDate), 'dd/MM/yyyy') : 'Pendiente'} />
                <Row label="Causa/Clave SEPE" value={caseData.causaClave} />
                <Row label="Preaviso" value={caseData.noticePeriodDays > 0 ? `${caseData.noticePeriodDays} días` : 'No requerido'} />
                <Row label="Revisión legal" value={caseData.legalReviewRequired ? 'Sí' : 'No'} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Estado del Pipeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Estado actual" value={PIPELINE_STATE_META[caseData.pipelineState].label} />
                <Row label="Creado" value={formatDistanceToNow(new Date(caseData.createdAt), { locale: es, addSuffix: true })} />
                <Row label="Actualizado" value={formatDistanceToNow(new Date(caseData.updatedAt), { locale: es, addSuffix: true })} />
                <Row label="Readiness" value={`${checklist?.readinessPercent ?? 0}%`} />
              </CardContent>
            </Card>

            {caseData.observations && (
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Observaciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{caseData.observations}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Financiero */}
        <TabsContent value="financiero" className="mt-4">
          {settlement ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Bruto</p>
                  <p className="text-2xl font-bold">€{settlement.totalBruto.toLocaleString('es-ES')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Finiquito (sin indemnización)</p>
                  <p className="text-xl font-semibold">€{settlement.finiquito.subtotal.toLocaleString('es-ES')}</p>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <p>Salario pendiente: €{settlement.finiquito.pendingSalary.toLocaleString('es-ES')}</p>
                    <p>Vacaciones: €{settlement.finiquito.vacationCompensation.toLocaleString('es-ES')} ({settlement.finiquito.vacationDaysPending}d)</p>
                    <p>Pagas extra: €{settlement.finiquito.extraPayProration.toLocaleString('es-ES')}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className={cn(settlement.indemnizacion.applicable && 'bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20')}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Indemnización</p>
                  {settlement.indemnizacion.applicable ? (
                    <>
                      <p className="text-xl font-semibold">€{settlement.indemnizacion.amount.toLocaleString('es-ES')}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {settlement.indemnizacion.daysPerYear}d/año × {settlement.indemnizacion.yearsApplied} años
                      </p>
                      <p className="text-xs text-muted-foreground">{settlement.indemnizacion.legalBasis}</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No aplica</p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Calculator className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground mb-3">Finiquito no calculado</p>
                <Button variant="outline" onClick={onCalculateSettlement}>
                  <Calculator className="h-4 w-4 mr-1" />
                  Calcular Finiquito
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documentos */}
        <TabsContent value="documentos" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <DocCard
              title="AFI Baja (TGSS)"
              generated={caseData.afiBajaGenerated}
              status={caseData.afiBajaStatus}
              description="Comunicación de baja al Sistema RED / SILTRA"
            />
            <DocCard
              title="Certificado Empresa (SEPE)"
              generated={caseData.certificaGenerated}
              status={caseData.certificaStatus}
              description="Certific@2 para prestación por desempleo"
            />
            <DocCard
              title="Carta de Despido"
              generated={false}
              status={null}
              description="Comunicación formal al empleado"
            />
            <DocCard
              title="Finiquito / Saldo y Liquidación"
              generated={caseData.finiquitoComputed}
              status={caseData.finiquitoComputed ? 'calculado' : null}
              description="Documento de finiquito con desglose"
            />
          </div>
        </TabsContent>

        {/* Checklist */}
        <TabsContent value="checklist" className="mt-4">
          {checklist ? (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Checklist del Pipeline</CardTitle>
                  <Badge variant="outline">
                    {checklist.completedCount}/{checklist.items.length} completados ({checklist.readinessPercent}%)
                  </Badge>
                </div>
                <Progress value={checklist.readinessPercent} className="h-1.5" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {checklist.items.map(item => (
                    <div
                      key={item.key}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg text-sm',
                        item.completed ? 'bg-emerald-500/5' : (item.required ? 'bg-amber-500/5' : 'bg-muted/30'),
                      )}
                    >
                      {item.completed ? (
                        <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : item.required ? (
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={cn('font-medium', item.completed && 'text-emerald-700')}>
                          {item.label}
                          {!item.required && <span className="text-muted-foreground ml-1">(opcional)</span>}
                        </p>
                        {item.detail && (
                          <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {PIPELINE_STATE_META[item.relatedState].label}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                Sin checklist disponible
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Timeline del Caso</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {timeline.map((event, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          'w-2 h-2 rounded-full mt-2',
                          idx === timeline.length - 1 ? 'bg-primary' : 'bg-muted-foreground/30',
                        )} />
                        {idx < timeline.length - 1 && (
                          <div className="w-px flex-1 bg-border" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium">{event.label}</p>
                        {event.detail && (
                          <p className="text-xs text-muted-foreground">{event.detail}</p>
                        )}
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          {format(new Date(event.timestamp), 'dd/MM/yyyy HH:mm', { locale: es })}
                          {event.actor && ` · ${event.actor}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Sub-components ──

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function DocCard({ title, generated, status, description }: {
  title: string;
  generated: boolean;
  status: string | null;
  description: string;
}) {
  return (
    <Card className={cn(generated ? 'border-emerald-500/20' : 'border-dashed')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          {generated ? (
            <Badge className="bg-emerald-500/10 text-emerald-700">
              <CheckCircle className="h-3 w-3 mr-1" />
              {status ?? 'Generado'}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Pendiente
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default OffboardingWorkspace;
