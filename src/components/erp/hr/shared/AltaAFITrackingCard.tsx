/**
 * AltaAFITrackingCard — Visual stepper for Alta → AFI → TA2 process
 * V2-RRHH-P1.1
 *
 * Compact card showing the 3-step flow:
 *  1. Alta (registration status)
 *  2. AFI (artifact generation status)
 *  3. TA2 (TGSS response status)
 */

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  UserPlus, FileOutput, FileCheck2,
  CheckCircle2, Clock, AlertTriangle, XCircle, Archive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  REGISTRATION_STATUS_CONFIG,
  type RegistrationStatus,
} from '@/hooks/erp/hr/useHRRegistrationProcess';
import { AFI_STATUS_META, type AFIArtifactStatus } from '@/engines/erp/hr/afiArtifactEngine';
import { TA2ReceptionDialog } from './TA2ReceptionDialog';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AltaAFITrackingCardProps {
  companyId: string;
  employeeId: string;
  requestId?: string;
  registrationStatus: RegistrationStatus;
  afiArtifactId?: string | null;
  afiArtifactStatus?: AFIArtifactStatus | null;
  ta2Reference?: string | null;
  ta2ResponseType?: 'accepted' | 'rejected' | null;
  ta2ReceptionDate?: string | null;
  onTA2Registered?: () => void;
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

export function AltaAFITrackingCard({
  companyId,
  employeeId,
  requestId,
  registrationStatus,
  afiArtifactId,
  afiArtifactStatus,
  ta2Reference,
  ta2ResponseType,
  ta2ReceptionDate,
  onTA2Registered,
  className,
}: AltaAFITrackingCardProps) {
  const [ta2DialogOpen, setTa2DialogOpen] = useState(false);

  const steps = useMemo((): StepDef[] => {
    // Step 1: Alta
    const altaCompleted = registrationStatus === 'submitted' || registrationStatus === 'confirmed';
    const altaActive = registrationStatus === 'ready_to_submit';
    const altaConfig = REGISTRATION_STATUS_CONFIG[registrationStatus];

    // Step 2: AFI
    const afiCompleted = afiArtifactStatus === 'sent' || afiArtifactStatus === 'accepted' || afiArtifactStatus === 'archived';
    const afiActive = !!afiArtifactStatus && !afiCompleted && afiArtifactStatus !== 'error';
    const afiError = afiArtifactStatus === 'error';
    const afiMeta = afiArtifactStatus ? AFI_STATUS_META[afiArtifactStatus] : null;

    // Step 3: TA2
    const ta2Completed = ta2ResponseType === 'accepted';
    const ta2Error = ta2ResponseType === 'rejected';
    const ta2Active = afiCompleted && !ta2Completed && !ta2Error;

    return [
      {
        label: 'Alta',
        icon: <UserPlus className="h-4 w-4" />,
        state: getStepState(altaCompleted, altaActive, false),
        detail: altaConfig?.labelES ?? registrationStatus,
        badgeColor: altaConfig?.color ?? '',
      },
      {
        label: 'AFI',
        icon: <FileOutput className="h-4 w-4" />,
        state: getStepState(afiCompleted, afiActive, afiError),
        detail: afiMeta?.label ?? (afiArtifactId ? 'Generado' : 'Sin generar'),
        badgeColor: afiMeta?.color ?? '',
      },
      {
        label: 'TA2',
        icon: <FileCheck2 className="h-4 w-4" />,
        state: getStepState(ta2Completed, ta2Active, ta2Error),
        detail: ta2Reference
          ? (ta2ResponseType === 'accepted' ? `Aceptado — ${ta2Reference}` : `Rechazado — ${ta2Reference}`)
          : (ta2Active ? 'Pendiente respuesta' : 'Sin tramitar'),
        badgeColor: ta2Completed
          ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
          : ta2Error
            ? 'bg-red-500/10 text-red-700 border-red-500/30'
            : '',
      },
    ];
  }, [registrationStatus, afiArtifactId, afiArtifactStatus, ta2Reference, ta2ResponseType]);

  const showTA2Button = afiArtifactId && !ta2Reference && (
    afiArtifactStatus === 'sent' || afiArtifactStatus === 'pending_approval' || afiArtifactStatus === 'dry_run_ready'
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
              Tracking Alta / AFI / TA2
            </span>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-0">
            {steps.map((step, i) => (
              <div key={step.label} className="flex items-center flex-1">
                {/* Step */}
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

                {/* Connector */}
                {i < steps.length - 1 && (
                  <div className={cn(
                    'w-6 h-0.5 mx-0.5 shrink-0',
                    step.state === 'completed' ? 'bg-emerald-400' : 'bg-border',
                  )} />
                )}
              </div>
            ))}
          </div>

          {/* TA2 registration button */}
          {showTA2Button && (
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5"
                onClick={() => setTa2DialogOpen(true)}
              >
                <FileCheck2 className="h-3.5 w-3.5" />
                Registrar respuesta TA2
              </Button>
            </div>
          )}

          {/* TA2 info if received */}
          {ta2Reference && ta2ReceptionDate && (
            <div className="mt-2 text-[10px] text-muted-foreground border-t pt-1.5 flex items-center gap-2">
              <Archive className="h-3 w-3 shrink-0" />
              <span>Ref: {ta2Reference} — Recibido: {new Date(ta2ReceptionDate).toLocaleDateString('es')}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* TA2 Reception Dialog */}
      {afiArtifactId && (
        <TA2ReceptionDialog
          open={ta2DialogOpen}
          onOpenChange={setTa2DialogOpen}
          companyId={companyId}
          employeeId={employeeId}
          artifactId={afiArtifactId}
          requestId={requestId}
          onRegistered={() => {
            setTa2DialogOpen(false);
            onTA2Registered?.();
          }}
        />
      )}
    </>
  );
}
