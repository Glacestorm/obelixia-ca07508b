/**
 * ContrataTrackingCard — Visual stepper for Contract → Contrat@ → SEPE process
 * V2-RRHH-P1.2: Mirrors AltaAFITrackingCard pattern
 */

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileSignature, FileOutput, FileCheck2,
  CheckCircle2, Clock, AlertTriangle, XCircle, Archive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CONTRACT_PROCESS_STATUS_CONFIG,
  type ContractProcessStatus,
} from '@/hooks/erp/hr/useHRContractProcess';
import { CONTRATA_STATUS_META, type ContrataArtifactStatus } from '@/engines/erp/hr/contrataArtifactStatusEngine';
import { SEPEReceptionDialog } from './SEPEReceptionDialog';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ContrataTrackingCardProps {
  companyId: string;
  employeeId: string;
  contractProcessId?: string;
  contractStatus: ContractProcessStatus;
  contrataArtifactId?: string | null;
  contrataArtifactStatus?: ContrataArtifactStatus | null;
  sepeReference?: string | null;
  sepeResponseType?: 'accepted' | 'rejected' | null;
  sepeReceptionDate?: string | null;
  onSEPERegistered?: () => void;
  className?: string;
}

// ─── Step config ─────────────────────────────────────────────────────────────

type StepState = 'pending' | 'active' | 'completed' | 'error';

interface StepDef {
  label: string;
  icon: React.ReactNode;
  state: StepState;
  detail: string;
  badgeColor: string;
}

function getStepState(completed: boolean, active: boolean, error: boolean): StepState {
  if (error) return 'error';
  if (completed) return 'completed';
  if (active) return 'active';
  return 'pending';
}

const STEP_COLORS: Record<StepState, string> = {
  pending: 'text-muted-foreground border-border bg-muted/30',
  active: 'text-primary border-primary/40 bg-primary/5',
  completed: 'text-emerald-700 border-emerald-500/40 bg-emerald-500/10',
  error: 'text-destructive border-destructive/40 bg-destructive/5',
};

const STEP_ICON_RING: Record<StepState, string> = {
  pending: 'bg-muted text-muted-foreground',
  active: 'bg-primary/10 text-primary',
  completed: 'bg-emerald-500/10 text-emerald-600',
  error: 'bg-destructive/10 text-destructive',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ContrataTrackingCard({
  companyId,
  employeeId,
  contractProcessId,
  contractStatus,
  contrataArtifactId,
  contrataArtifactStatus,
  sepeReference,
  sepeResponseType,
  sepeReceptionDate,
  onSEPERegistered,
  className,
}: ContrataTrackingCardProps) {
  const [sepeDialogOpen, setSepeDialogOpen] = useState(false);

  const steps = useMemo((): StepDef[] => {
    // Step 1: Contrato
    const contractCompleted = contractStatus === 'submitted' || contractStatus === 'confirmed';
    const contractActive = contractStatus === 'ready_to_submit';
    const contractConfig = CONTRACT_PROCESS_STATUS_CONFIG[contractStatus];

    // Step 2: Contrat@
    const contrataCompleted = contrataArtifactStatus === 'sent' || contrataArtifactStatus === 'accepted' || contrataArtifactStatus === 'archived';
    const contrataActive = !!contrataArtifactStatus && !contrataCompleted && contrataArtifactStatus !== 'error';
    const contrataError = contrataArtifactStatus === 'error';
    const contrataMeta = contrataArtifactStatus ? CONTRATA_STATUS_META[contrataArtifactStatus] : null;

    // Step 3: SEPE
    const sepeCompleted = sepeResponseType === 'accepted';
    const sepeError = sepeResponseType === 'rejected';
    const sepeActive = contrataCompleted && !sepeCompleted && !sepeError;

    return [
      {
        label: 'Contrato',
        icon: <FileSignature className="h-4 w-4" />,
        state: getStepState(contractCompleted, contractActive, false),
        detail: contractConfig?.labelES ?? contractStatus,
        badgeColor: contractConfig?.color ?? '',
      },
      {
        label: 'Contrat@',
        icon: <FileOutput className="h-4 w-4" />,
        state: getStepState(contrataCompleted, contrataActive, contrataError),
        detail: contrataMeta?.label ?? (contrataArtifactId ? 'Generado' : 'Sin generar'),
        badgeColor: contrataMeta?.color ?? '',
      },
      {
        label: 'SEPE',
        icon: <FileCheck2 className="h-4 w-4" />,
        state: getStepState(sepeCompleted, sepeActive, sepeError),
        detail: sepeReference
          ? (sepeResponseType === 'accepted' ? `Aceptado — ${sepeReference}` : `Rechazado — ${sepeReference}`)
          : (sepeActive ? 'Pendiente respuesta' : 'Sin tramitar'),
        badgeColor: sepeCompleted
          ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
          : sepeError
            ? 'bg-red-500/10 text-red-700 border-red-500/30'
            : '',
      },
    ];
  }, [contractStatus, contrataArtifactId, contrataArtifactStatus, sepeReference, sepeResponseType]);

  const showSEPEButton = contrataArtifactId && !sepeReference && (
    contrataArtifactStatus === 'sent' || contrataArtifactStatus === 'pending_approval' || contrataArtifactStatus === 'dry_run_ready'
  );

  const stateIcon = (state: StepState) => {
    switch (state) {
      case 'completed': return <CheckCircle2 className="h-3 w-3" />;
      case 'active': return <Clock className="h-3 w-3" />;
      case 'error': return <XCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <>
      <Card className={cn('border-primary/10', className)}>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-1 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tracking Contrato / Contrat@ / SEPE
            </span>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-0">
            {steps.map((step, i) => (
              <div key={step.label} className="flex items-center flex-1">
                <div className={cn(
                  'flex flex-col items-center gap-1 flex-1 rounded-lg p-2 border transition-colors',
                  STEP_COLORS[step.state],
                )}>
                  <div className={cn('p-1.5 rounded-full flex items-center gap-1', STEP_ICON_RING[step.state])}>
                    {step.icon}
                    {stateIcon(step.state)}
                  </div>
                  <span className="text-[10px] font-semibold">{step.label}</span>
                  <span className="text-[9px] text-center leading-tight opacity-80 line-clamp-2">
                    {step.detail}
                  </span>
                </div>

                {i < steps.length - 1 && (
                  <div className={cn(
                    'w-6 h-0.5 mx-0.5 shrink-0',
                    step.state === 'completed' ? 'bg-emerald-400' : 'bg-border',
                  )} />
                )}
              </div>
            ))}
          </div>

          {/* SEPE registration button */}
          {showSEPEButton && (
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5"
                onClick={() => setSepeDialogOpen(true)}
              >
                <FileCheck2 className="h-3.5 w-3.5" />
                Registrar respuesta SEPE
              </Button>
            </div>
          )}

          {/* SEPE info if received */}
          {sepeReference && sepeReceptionDate && (
            <div className="mt-2 text-[10px] text-muted-foreground border-t pt-1.5 flex items-center gap-2">
              <Archive className="h-3 w-3 shrink-0" />
              <span>Ref: {sepeReference} — Recibido: {new Date(sepeReceptionDate).toLocaleDateString('es')}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEPE Reception Dialog */}
      {contrataArtifactId && (
        <SEPEReceptionDialog
          open={sepeDialogOpen}
          onOpenChange={setSepeDialogOpen}
          companyId={companyId}
          employeeId={employeeId}
          artifactId={contrataArtifactId}
          contractProcessId={contractProcessId}
          onRegistered={() => {
            setSepeDialogOpen(false);
            onSEPERegistered?.();
          }}
        />
      )}
    </>
  );
}
