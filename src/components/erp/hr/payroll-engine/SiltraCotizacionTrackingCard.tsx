/**
 * SiltraCotizacionTrackingCard — 6-step visual stepper for SILTRA lifecycle
 * V2-RRHH-P1.4: FAN/Bases → Liquidación → RLC → RNT → CRA → Confirmación
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle, Clock, AlertTriangle, XCircle, Archive,
  Send, FileCheck, Shield, Calculator, FileText, Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RLCRNTCRAArtifactStatus, RLCRNTCRA_STATUS_META } from '@/engines/erp/hr/rlcRntCraArtifactEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ArtifactStepData {
  type: 'fan' | 'rlc' | 'rnt' | 'cra';
  status: RLCRNTCRAArtifactStatus | 'not_generated';
  label: string;
  amount?: number;
  workerCount?: number;
}

interface SiltraCotizacionTrackingCardProps {
  periodLabel: string;
  fanStatus: RLCRNTCRAArtifactStatus | 'not_generated';
  rlcData?: ArtifactStepData;
  rntData?: ArtifactStepData;
  craData?: ArtifactStepData;
  reconciliationScore?: number;
  reconciliationCanConfirm?: boolean;
  isAllConfirmed?: boolean;
  onRegisterResponse?: () => void;
  onRunReconciliation?: () => void;
  className?: string;
}

// ─── Step config ─────────────────────────────────────────────────────────────

interface StepConfig {
  id: string;
  label: string;
  icon: React.ElementType;
}

const STEPS: StepConfig[] = [
  { id: 'fan', label: 'FAN/Bases', icon: Calculator },
  { id: 'liquidacion', label: 'Liquidación', icon: FileText },
  { id: 'rlc', label: 'RLC', icon: FileCheck },
  { id: 'rnt', label: 'RNT', icon: Shield },
  { id: 'cra', label: 'CRA', icon: FileText },
  { id: 'confirmacion', label: 'Confirmación', icon: CheckCircle },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStepState(
  stepId: string,
  props: SiltraCotizacionTrackingCardProps,
): 'completed' | 'active' | 'pending' | 'error' {
  const { fanStatus, rlcData, rntData, craData, isAllConfirmed } = props;

  switch (stepId) {
    case 'fan':
      if (fanStatus === 'not_generated') return 'pending';
      if (fanStatus === 'error') return 'error';
      return ['validated_internal', 'dry_run_ready', 'pending_approval', 'sent', 'accepted', 'confirmed', 'archived'].includes(fanStatus)
        ? 'completed' : 'active';
    case 'liquidacion': {
      const hasAll = rlcData && rntData && craData;
      if (!hasAll) return fanStatus !== 'not_generated' && fanStatus !== 'error' ? 'active' : 'pending';
      const allGenerated = rlcData.status !== 'not_generated' && rntData.status !== 'not_generated' && craData.status !== 'not_generated';
      return allGenerated ? 'completed' : 'active';
    }
    case 'rlc':
      if (!rlcData || rlcData.status === 'not_generated') return 'pending';
      if (rlcData.status === 'error' || rlcData.status === 'rejected') return 'error';
      if (['accepted', 'confirmed', 'archived'].includes(rlcData.status)) return 'completed';
      return 'active';
    case 'rnt':
      if (!rntData || rntData.status === 'not_generated') return 'pending';
      if (rntData.status === 'error' || rntData.status === 'rejected') return 'error';
      if (['accepted', 'confirmed', 'archived'].includes(rntData.status)) return 'completed';
      return 'active';
    case 'cra':
      if (!craData || craData.status === 'not_generated') return 'pending';
      if (craData.status === 'error' || craData.status === 'rejected') return 'error';
      if (['accepted', 'confirmed', 'archived'].includes(craData.status)) return 'completed';
      return 'active';
    case 'confirmacion':
      if (isAllConfirmed) return 'completed';
      const allAccepted = rlcData?.status === 'accepted' && rntData?.status === 'accepted' && craData?.status === 'accepted';
      return allAccepted ? 'active' : 'pending';
    default:
      return 'pending';
  }
}

function getStepIcon(state: 'completed' | 'active' | 'pending' | 'error') {
  switch (state) {
    case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'active': return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />;
    case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
    case 'pending': return <Clock className="h-4 w-4 text-muted-foreground/50" />;
  }
}

function getStepBg(state: 'completed' | 'active' | 'pending' | 'error') {
  switch (state) {
    case 'completed': return 'bg-green-500/10 border-green-500/30';
    case 'active': return 'bg-blue-500/10 border-blue-500/30';
    case 'error': return 'bg-red-500/10 border-red-500/30';
    case 'pending': return 'bg-muted/30 border-border/50';
  }
}

function getConnectorColor(state: 'completed' | 'active' | 'pending' | 'error') {
  switch (state) {
    case 'completed': return 'bg-green-500/50';
    case 'active': return 'bg-blue-500/50';
    default: return 'bg-border/50';
  }
}

function getStatusBadgeForArtifact(status: RLCRNTCRAArtifactStatus | 'not_generated') {
  if (status === 'not_generated') return <Badge variant="outline" className="text-[10px] px-1.5">Pendiente</Badge>;
  const labels: Record<string, string> = {
    generated: 'Generado', validated_internal: 'Validado', dry_run_ready: 'Dry-run',
    pending_approval: 'Aprobación', sent: 'Enviado', accepted: 'Aceptado',
    rejected: 'Rechazado', confirmed: 'Confirmado', archived: 'Archivado', error: 'Error',
  };
  const colors: Record<string, string> = {
    generated: 'bg-blue-500/10 text-blue-700', validated_internal: 'bg-indigo-500/10 text-indigo-700',
    dry_run_ready: 'bg-emerald-500/10 text-emerald-700', pending_approval: 'bg-amber-500/10 text-amber-700',
    sent: 'bg-sky-500/10 text-sky-700', accepted: 'bg-emerald-500/10 text-emerald-700',
    rejected: 'bg-red-500/10 text-red-700', confirmed: 'bg-green-500/10 text-green-700',
    archived: 'bg-slate-500/10 text-slate-700', error: 'bg-red-500/10 text-red-700',
  };
  return <Badge className={cn('text-[10px] px-1.5 border-0', colors[status] || '')}>{labels[status] || status}</Badge>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SiltraCotizacionTrackingCard(props: SiltraCotizacionTrackingCardProps) {
  const {
    periodLabel,
    rlcData,
    rntData,
    craData,
    reconciliationScore,
    reconciliationCanConfirm,
    onRegisterResponse,
    onRunReconciliation,
    className,
  } = props;

  return (
    <Card className={cn('border-sky-500/20', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-sky-600" />
            Ciclo SILTRA/Cotización — {periodLabel}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {reconciliationScore !== undefined && (
              <Badge className={cn(
                'text-[10px] border-0',
                reconciliationScore >= 90 ? 'bg-green-500/10 text-green-700' :
                reconciliationScore >= 70 ? 'bg-amber-500/10 text-amber-700' :
                'bg-red-500/10 text-red-700'
              )}>
                Reconciliación: {reconciliationScore}%
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] gap-1">
              <Lock className="h-2.5 w-2.5" />
              Envío bloqueado
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 6-Step Stepper */}
        <div className="flex items-center justify-between gap-1">
          {STEPS.map((step, index) => {
            const state = getStepState(step.id, props);
            const StepIcon = step.icon;
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className={cn(
                  'flex flex-col items-center gap-1 px-1 py-2 rounded-lg border flex-1 min-w-0',
                  getStepBg(state),
                )}>
                  <div className="flex items-center gap-1">
                    {getStepIcon(state)}
                    <StepIcon className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <span className="text-[10px] font-medium text-center leading-tight truncate w-full">
                    {step.label}
                  </span>
                  {/* Status badge for artifact steps */}
                  {step.id === 'rlc' && rlcData && getStatusBadgeForArtifact(rlcData.status)}
                  {step.id === 'rnt' && rntData && getStatusBadgeForArtifact(rntData.status)}
                  {step.id === 'cra' && craData && getStatusBadgeForArtifact(craData.status)}
                </div>
                {index < STEPS.length - 1 && (
                  <div className={cn('h-0.5 w-2 flex-shrink-0', getConnectorColor(state))} />
                )}
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {onRegisterResponse && (
            <Button variant="outline" size="sm" onClick={onRegisterResponse} className="text-xs">
              <Send className="h-3 w-3 mr-1" />
              Registrar respuesta TGSS
            </Button>
          )}
          {onRunReconciliation && (
            <Button variant="outline" size="sm" onClick={onRunReconciliation} className="text-xs">
              <Calculator className="h-3 w-3 mr-1" />
              Ejecutar reconciliación
            </Button>
          )}
        </div>

        {/* Gap banner */}
        <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/5 border border-amber-500/20">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium text-amber-700">SILTRA binario + conector System RED:</span>{' '}
            pendiente de implementación. Los artefactos se generan y validan internamente.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default SiltraCotizacionTrackingCard;
