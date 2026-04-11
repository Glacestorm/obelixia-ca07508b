/**
 * FiscalIRPFTrackingCard — 5-step horizontal stepper for fiscal IRPF lifecycle
 * P1.5R: Mod.145 → IRPF Calc → Mod.111 → Mod.190 → AEAT
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  FileText, Calculator, ClipboardList, Archive, Send,
  CheckCircle, XCircle, Clock, AlertTriangle, ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AEAT_STATUS_META, type AEATArtifactStatus } from '@/engines/erp/hr/aeatArtifactEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FiscalStepData {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: 'pending' | 'in_progress' | 'completed' | 'warning' | 'error';
  detail: string;
  badge?: string;
}

interface ArtifactStatusInfo {
  status: AEATArtifactStatus;
  periodLabel: string;
}

interface FiscalIRPFTrackingCardProps {
  /** Modelo 145 completeness: X complete out of Y */
  modelo145Complete?: number;
  modelo145Total?: number;
  /** IRPF calculation status */
  irpfCalcStatus?: 'not_started' | 'partial' | 'complete';
  /** Modelo 111 artifacts by period */
  modelo111Artifacts?: ArtifactStatusInfo[];
  /** Periodicity */
  modelo111Periodicity?: 'trimestral' | 'mensual';
  /** Modelo 190 artifact status */
  modelo190Status?: AEATArtifactStatus | null;
  modelo190FiscalYear?: number;
  /** AEAT response statuses - separated by artifact type */
  aeat111ResponseStatus?: AEATArtifactStatus | null;
  aeat190ResponseStatus?: AEATArtifactStatus | null;
  /** Reconciliation score */
  reconciliationScore?: number;
  /** Action handlers */
  onRegisterAEATResponse?: () => void;
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStepStatusIcon(status: FiscalStepData['status']) {
  switch (status) {
    case 'completed': return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
    case 'in_progress': return <Clock className="h-4 w-4 text-primary" />;
    default: return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function getStepBgClass(status: FiscalStepData['status']) {
  switch (status) {
    case 'completed': return 'bg-emerald-500/10 border-emerald-500/30';
    case 'warning': return 'bg-amber-500/10 border-amber-500/30';
    case 'error': return 'bg-destructive/10 border-destructive/30';
    case 'in_progress': return 'bg-primary/10 border-primary/30';
    default: return 'bg-muted/50 border-border';
  }
}

function artifactStatusToStepStatus(s: AEATArtifactStatus | null | undefined): FiscalStepData['status'] {
  if (!s) return 'pending';
  if (s === 'confirmed' || s === 'archived' || s === 'accepted') return 'completed';
  if (s === 'rejected' || s === 'error') return 'error';
  if (s === 'sent' || s === 'pending_approval' || s === 'dry_run_ready' || s === 'validated_internal') return 'in_progress';
  if (s === 'generated') return 'in_progress';
  return 'pending';
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FiscalIRPFTrackingCard({
  modelo145Complete = 0,
  modelo145Total = 0,
  irpfCalcStatus = 'not_started',
  modelo111Artifacts = [],
  modelo111Periodicity = 'trimestral',
  modelo190Status = null,
  modelo190FiscalYear,
  aeat111ResponseStatus = null,
  aeat190ResponseStatus = null,
  reconciliationScore,
  onRegisterAEATResponse,
  className,
}: FiscalIRPFTrackingCardProps) {
  // Build steps
  const mod145Status: FiscalStepData['status'] = modelo145Total === 0
    ? 'pending'
    : modelo145Complete === modelo145Total ? 'completed'
    : modelo145Complete > 0 ? 'warning' : 'error';

  const irpfStatus: FiscalStepData['status'] = irpfCalcStatus === 'complete'
    ? 'completed' : irpfCalcStatus === 'partial' ? 'in_progress' : 'pending';

  // Best status from 111 artifacts
  const best111Status = modelo111Artifacts.length > 0
    ? artifactStatusToStepStatus(
        modelo111Artifacts.reduce((best, a) => {
          const order: AEATArtifactStatus[] = ['error', 'generated', 'validated_internal', 'dry_run_ready', 'pending_approval', 'sent', 'accepted', 'rejected', 'confirmed', 'archived'];
          return order.indexOf(a.status) > order.indexOf(best) ? a.status : best;
        }, 'generated' as AEATArtifactStatus)
      )
    : 'pending';

  const mod190StepStatus = artifactStatusToStepStatus(modelo190Status);

  // AEAT step: show worst status between 111 and 190 responses
  const aeatStepStatus = (() => {
    if (aeat111ResponseStatus === 'rejected' || aeat190ResponseStatus === 'rejected') return 'error' as const;
    if (aeat111ResponseStatus === 'accepted' && aeat190ResponseStatus === 'accepted') return 'completed' as const;
    if (aeat111ResponseStatus === 'accepted' || aeat190ResponseStatus === 'accepted') return 'in_progress' as const;
    if (aeat111ResponseStatus || aeat190ResponseStatus) return 'in_progress' as const;
    return 'pending' as const;
  })();

  const steps: FiscalStepData[] = [
    {
      id: 'mod145',
      label: 'Mod. 145',
      icon: <FileText className="h-4 w-4" />,
      status: mod145Status,
      detail: modelo145Total > 0 ? `${modelo145Complete}/${modelo145Total} completos` : 'Sin datos',
    },
    {
      id: 'irpf',
      label: 'Cálculo IRPF',
      icon: <Calculator className="h-4 w-4" />,
      status: irpfStatus,
      detail: irpfCalcStatus === 'complete' ? 'Calculado' : irpfCalcStatus === 'partial' ? 'Parcial' : 'Pendiente',
    },
    {
      id: 'mod111',
      label: 'Mod. 111',
      icon: <ClipboardList className="h-4 w-4" />,
      status: best111Status,
      detail: modelo111Artifacts.length > 0 ? `${modelo111Artifacts.length} período(s)` : 'Sin generar',
      badge: modelo111Periodicity === 'mensual' ? 'Mensual' : 'Trimestral',
    },
    {
      id: 'mod190',
      label: 'Mod. 190',
      icon: <Archive className="h-4 w-4" />,
      status: mod190StepStatus,
      detail: modelo190Status
        ? AEAT_STATUS_META[modelo190Status]?.label ?? modelo190Status
        : modelo190FiscalYear ? `Ejercicio ${modelo190FiscalYear}` : 'Anual — pendiente',
    },
    {
      id: 'aeat',
      label: 'AEAT',
      icon: <Send className="h-4 w-4" />,
      status: aeatStepStatus,
      detail: (() => {
        const parts: string[] = [];
        if (aeat111ResponseStatus) parts.push(`111: ${aeat111ResponseStatus}`);
        if (aeat190ResponseStatus) parts.push(`190: ${aeat190ResponseStatus}`);
        return parts.length > 0 ? parts.join(' · ') : 'Sin respuesta';
      })(),
    },
  ];

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const overallProgress = Math.round((completedSteps / steps.length) * 100);

  return (
    <Card className={cn('border', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Calculator className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold">Proceso Fiscal IRPF</CardTitle>
            {reconciliationScore !== undefined && (
              <Badge variant={reconciliationScore >= 80 ? 'default' : 'destructive'} className="text-[10px]">
                Reconciliación: {reconciliationScore}%
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onRegisterAEATResponse && (
              <Button variant="outline" size="sm" onClick={onRegisterAEATResponse} className="text-xs h-7">
                <Send className="h-3 w-3 mr-1" /> Registrar resp. AEAT
              </Button>
            )}
          </div>
        </div>
        {/* isRealSubmissionBlocked banner */}
        <div className="flex items-center gap-1.5 mt-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span className="text-[11px] text-amber-700">
            isRealSubmissionBlocked: El envío real a la AEAT permanece bloqueado. Los artefactos son preparatorios.
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <Progress value={overallProgress} className="h-1.5 flex-1" />
          <span className="text-[10px] text-muted-foreground font-mono">{overallProgress}%</span>
        </div>

        {/* Steps */}
        <div className="flex gap-1.5">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex-1 relative">
              <div className={cn(
                'rounded-lg border p-2.5 transition-colors',
                getStepBgClass(step.status),
              )}>
                <div className="flex items-center gap-1 mb-1">
                  {getStepStatusIcon(step.status)}
                  <span className="text-[11px] font-medium truncate">{step.label}</span>
                  {step.badge && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1 ml-auto shrink-0">
                      {step.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight truncate">{step.detail}</p>
              </div>
              {/* Connector */}
              {idx < steps.length - 1 && (
                <div className="absolute top-1/2 -right-1 w-1.5 h-0.5 bg-border" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default FiscalIRPFTrackingCard;
