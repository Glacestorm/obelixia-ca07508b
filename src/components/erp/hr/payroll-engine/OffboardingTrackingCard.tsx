/**
 * OffboardingTrackingCard.tsx — 6-step offboarding lifecycle stepper
 * P1.6: Baja / Finiquito / Certificado Empresa
 * 
 * Visual tracking card showing:
 * Step 1: Baja (termination type, date, validation)
 * Step 2: AFI Baja (artifact status)
 * Step 3: Finiquito (amount, evidence)
 * Step 4: Indemnización (amount if applicable, legal basis)
 * Step 5: Certificado Empresa (Certific@2 status)
 * Step 6: Archivo (final close)
 * 
 * isRealSubmissionBlocked banner always shown.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  UserMinus,
  FileText,
  Calculator,
  Scale,
  Award,
  Archive,
  CheckCircle,
  Clock,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──

interface OffboardingStep {
  key: string;
  label: string;
  icon: React.ReactNode;
  status: 'pending' | 'in_progress' | 'completed' | 'error' | 'not_applicable';
  detail?: string;
  badge?: string;
  badgeColor?: string;
}

interface OffboardingTrackingCardProps {
  terminationType: string;
  terminationDate: string | null;
  terminationStatus: string;
  // AFI Baja
  afiBajaStatus: string | null;
  // Finiquito
  finiquitoComputed: boolean;
  finiquitoTotal: number | null;
  finiquitoSubtotal: number | null;
  // Indemnización
  indemnizacionApplicable: boolean;
  indemnizacionAmount: number | null;
  indemnizacionLegalBasis: string | null;
  // Certificado
  certificaStatus: string | null;
  // Archivo
  isClosed: boolean;
  // Readiness
  readinessScore: number;
  // Actions
  onRegisterSEPEResponse?: () => void;
  className?: string;
}

const STEP_STATUS_STYLES: Record<OffboardingStep['status'], { bg: string; icon: React.ReactNode }> = {
  pending:        { bg: 'bg-muted text-muted-foreground', icon: <Clock className="h-3 w-3" /> },
  in_progress:    { bg: 'bg-amber-500/10 text-amber-700', icon: <ArrowRight className="h-3 w-3" /> },
  completed:      { bg: 'bg-emerald-500/10 text-emerald-700', icon: <CheckCircle className="h-3 w-3" /> },
  error:          { bg: 'bg-destructive/10 text-destructive', icon: <AlertTriangle className="h-3 w-3" /> },
  not_applicable: { bg: 'bg-muted/50 text-muted-foreground/60', icon: null },
};

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

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return `€${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function OffboardingTrackingCard({
  terminationType,
  terminationDate,
  terminationStatus,
  afiBajaStatus,
  finiquitoComputed,
  finiquitoTotal,
  finiquitoSubtotal,
  indemnizacionApplicable,
  indemnizacionAmount,
  indemnizacionLegalBasis,
  certificaStatus,
  isClosed,
  readinessScore,
  onRegisterSEPEResponse,
  className,
}: OffboardingTrackingCardProps) {
  // Build steps
  const steps: OffboardingStep[] = [
    {
      key: 'baja',
      label: 'Baja',
      icon: <UserMinus className="h-4 w-4" />,
      status: terminationStatus === 'cancelled' ? 'error'
        : ['approved', 'in_progress', 'executed'].includes(terminationStatus) ? 'completed'
        : terminationStatus === 'under_review' ? 'in_progress'
        : 'pending',
      detail: TERMINATION_TYPE_LABELS[terminationType] ?? terminationType,
      badge: terminationDate ? new Date(terminationDate).toLocaleDateString('es-ES') : undefined,
    },
    {
      key: 'afi_baja',
      label: 'AFI Baja',
      icon: <FileText className="h-4 w-4" />,
      status: !afiBajaStatus ? 'pending'
        : ['accepted', 'archived'].includes(afiBajaStatus) ? 'completed'
        : ['rejected', 'error'].includes(afiBajaStatus) ? 'error'
        : 'in_progress',
      detail: afiBajaStatus ?? 'No generada',
    },
    {
      key: 'finiquito',
      label: 'Finiquito',
      icon: <Calculator className="h-4 w-4" />,
      status: finiquitoComputed ? 'completed' : 'pending',
      detail: finiquitoComputed ? formatCurrency(finiquitoSubtotal) : 'Pendiente de cálculo',
    },
    {
      key: 'indemnizacion',
      label: 'Indemnización',
      icon: <Scale className="h-4 w-4" />,
      status: !indemnizacionApplicable ? 'not_applicable'
        : indemnizacionAmount !== null && indemnizacionAmount > 0 ? 'completed'
        : 'pending',
      detail: !indemnizacionApplicable ? 'No aplica'
        : indemnizacionAmount !== null ? formatCurrency(indemnizacionAmount)
        : 'Pendiente',
      badge: indemnizacionLegalBasis ?? undefined,
    },
    {
      key: 'certificado',
      label: 'Certificado',
      icon: <Award className="h-4 w-4" />,
      status: !certificaStatus ? 'pending'
        : ['accepted', 'confirmed', 'archived'].includes(certificaStatus) ? 'completed'
        : ['rejected', 'error'].includes(certificaStatus) ? 'error'
        : 'in_progress',
      detail: certificaStatus ?? 'No generado',
    },
    {
      key: 'archivo',
      label: 'Archivo',
      icon: <Archive className="h-4 w-4" />,
      status: isClosed ? 'completed' : 'pending',
      detail: isClosed ? 'Expediente cerrado' : 'Pendiente de cierre',
    },
  ];

  return (
    <Card className={cn("border-amber-500/20", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <UserMinus className="h-4 w-4 text-amber-500" />
            Proceso de Salida
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Readiness: {readinessScore}%
            </Badge>
            {finiquitoComputed && finiquitoTotal !== null && (
              <Badge className="bg-emerald-500/10 text-emerald-700 text-xs">
                Total: {formatCurrency(finiquitoTotal)}
              </Badge>
            )}
          </div>
        </div>

        {/* isRealSubmissionBlocked banner */}
        <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20 mt-2">
          <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            <strong>Modo preparatorio</strong> — Los artefactos generados son payloads internos.
            No existe conector real SEPE Certific@2 ni envío oficial. isRealSubmissionBlocked = true.
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Readiness bar */}
        <Progress value={readinessScore} className="h-1.5" />

        {/* Stepper */}
        <div className="grid grid-cols-6 gap-1">
          {steps.map((step, idx) => {
            const styles = STEP_STATUS_STYLES[step.status];
            return (
              <div key={step.key} className="flex flex-col items-center text-center gap-1">
                {/* Step indicator */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                  styles.bg,
                )}>
                  {step.icon}
                </div>

                {/* Label */}
                <span className="text-[10px] font-medium leading-tight">{step.label}</span>

                {/* Detail */}
                {step.detail && (
                  <span className="text-[9px] text-muted-foreground leading-tight truncate max-w-full">
                    {step.detail}
                  </span>
                )}

                {/* Badge */}
                {step.badge && (
                  <Badge variant="outline" className={cn("text-[8px] px-1 py-0", step.badgeColor)}>
                    {step.badge}
                  </Badge>
                )}

                {/* Connector line */}
                {idx < steps.length - 1 && (
                  <div className="hidden" /> // connector handled by grid gap
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        {onRegisterSEPEResponse && certificaStatus && !['accepted', 'confirmed', 'archived'].includes(certificaStatus) && (
          <div className="flex justify-end pt-2 border-t">
            <Button variant="outline" size="sm" onClick={onRegisterSEPEResponse}>
              <Award className="h-3 w-3 mr-1" />
              Registrar respuesta SEPE
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OffboardingTrackingCard;
