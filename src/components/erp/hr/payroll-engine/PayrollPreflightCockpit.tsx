/**
 * PayrollPreflightCockpit — P1.7
 * Transversal cockpit showing the full payroll cycle status at a glance.
 * Reads from existing engines — NO business logic duplication.
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  CheckCircle, Circle, AlertTriangle, XCircle, Clock, ArrowRight,
  RefreshCw, ShieldAlert, Loader2, ChevronDown, ChevronRight,
  ClipboardList, Calculator, ShieldCheck, Lock, Landmark, FileCheck,
  FileText, Archive, UserMinus, Send, Euro, Gauge
} from 'lucide-react';
import { usePayrollPreflight } from '@/hooks/erp/hr/usePayrollPreflight';
import type { PreflightStep, Semaphore, OverallStatus, LegalDeadlineAlert } from '@/engines/erp/hr/payrollPreflightEngine';

interface Props {
  companyId: string;
  onNavigateToModule: (module: string) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  ClipboardList, Calculator, ShieldCheck, Lock, Landmark, FileCheck,
  FileText, Archive, UserMinus, Send, Euro, Gauge,
};

const STATUS_STYLES: Record<string, { icon: React.ElementType; color: string }> = {
  completed: { icon: CheckCircle, color: 'text-emerald-500' },
  in_progress: { icon: Clock, color: 'text-amber-500' },
  pending: { icon: Circle, color: 'text-muted-foreground' },
  blocked: { icon: XCircle, color: 'text-destructive' },
  overdue: { icon: AlertTriangle, color: 'text-destructive' },
};

const SEMAPHORE_STYLES: Record<Semaphore, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-destructive',
};

const OVERALL_STYLES: Record<OverallStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  on_track: { label: 'En curso', variant: 'default' },
  at_risk: { label: 'En riesgo', variant: 'secondary' },
  blocked: { label: 'Bloqueado', variant: 'destructive' },
  overdue: { label: 'Vencido', variant: 'destructive' },
};

export function PayrollPreflightCockpit({ companyId, onNavigateToModule }: Props) {
  const { preflight, isLoading, evaluate } = usePayrollPreflight(companyId);
  const [showOffboarding, setShowOffboarding] = useState(false);

  useEffect(() => {
    evaluate();
  }, [evaluate]);

  if (isLoading && !preflight) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Evaluando ciclo de nómina…</span>
        </CardContent>
      </Card>
    );
  }

  if (!preflight) return null;

  const overallStyle = OVERALL_STYLES[preflight.overallStatus];

  return (
    <div className="space-y-4">
      {/* Banner: isRealSubmissionBlocked */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg px-3 py-2">
        <ShieldAlert className="h-3.5 w-3.5" />
        <span>Los pasos institucionales están en modo preparatorio. Envíos oficiales bloqueados.</span>
      </div>

      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Gauge className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Preflight Ciclo de Nómina</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {preflight.completedCount}/{preflight.totalCount} pasos completados
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={overallStyle.variant}>{overallStyle.label}</Badge>
              <Button variant="ghost" size="icon" onClick={() => evaluate()} disabled={isLoading} className="h-8 w-8">
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </div>
          <Progress value={preflight.completionScore} className="mt-3 h-2" />
          <p className="text-xs text-muted-foreground mt-1 text-right">{preflight.completionScore}%</p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stepper — Main steps */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pasos del ciclo</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[560px]">
                <div className="space-y-1">
                  {preflight.steps.map((step, idx) => (
                    <StepRow key={step.id} step={step} isLast={idx === preflight.steps.length - 1} onNavigate={onNavigateToModule} />
                  ))}
                </div>

                {/* Offboarding sub-track */}
                {preflight.hasTerminations && preflight.offboardingSteps.length > 0 && (
                  <div className="mt-4 border-t pt-3">
                    <button
                      onClick={() => setShowOffboarding(!showOffboarding)}
                      className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                    >
                      {showOffboarding ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <UserMinus className="h-4 w-4" />
                      Subtramo de salida ({preflight.offboardingSteps.filter(s => s.status === 'completed').length}/{preflight.offboardingSteps.length})
                    </button>
                    {showOffboarding && (
                      <div className="mt-2 space-y-1 pl-2">
                        {preflight.offboardingSteps.map((step, idx) => (
                          <StepRow key={step.id} step={step} isLast={idx === preflight.offboardingSteps.length - 1} onNavigate={onNavigateToModule} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Next recommended action */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                Siguiente acción
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{preflight.nextRecommendedAction.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{preflight.nextRecommendedAction.description}</p>
              <Button
                size="sm"
                className="mt-3 w-full"
                onClick={() => onNavigateToModule(preflight.nextRecommendedAction.targetModule)}
              >
                Ir al módulo <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Legal alerts */}
          {preflight.legalAlerts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Alertas legales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {preflight.legalAlerts.map(alert => (
                    <AlertRow key={alert.id} alert={alert} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Blockers summary */}
          {preflight.firstBlockedStep && (
            <Card className="border-destructive/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
                  <XCircle className="h-4 w-4" />
                  Primer bloqueo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">{preflight.firstBlockedStep.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{preflight.firstBlockedStep.blockReason}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => onNavigateToModule(preflight.firstBlockedStep!.targetModule)}
                >
                  Resolver
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step row component ──

function StepRow({ step, isLast, onNavigate }: { step: PreflightStep; isLast: boolean; onNavigate: (m: string) => void }) {
  const statusStyle = STATUS_STYLES[step.status] || STATUS_STYLES.pending;
  const StatusIcon = statusStyle.icon;
  const StepIcon = ICON_MAP[step.icon] || Circle;

  return (
    <div className="flex items-start gap-3 group">
      {/* Vertical line + status dot */}
      <div className="flex flex-col items-center pt-1">
        <div className={cn("w-2 h-2 rounded-full", SEMAPHORE_STYLES[step.semaphore])} />
        {!isLast && <div className="w-px h-8 bg-border mt-1" />}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center gap-3 pb-3 min-w-0">
        <StepIcon className={cn("h-4 w-4 shrink-0", statusStyle.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-medium", step.status === 'completed' && 'text-muted-foreground line-through')}>{step.label}</span>
            {step.isInstitutional && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">oficial</Badge>
            )}
          </div>
          {step.blockReason && (
            <p className="text-xs text-destructive mt-0.5">{step.blockReason}</p>
          )}
          {step.deadline && (
            <p className="text-xs text-muted-foreground mt-0.5">Plazo: {step.deadline}</p>
          )}
        </div>

        <StatusIcon className={cn("h-4 w-4 shrink-0", statusStyle.color)} />

        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onNavigate(step.targetModule)}
        >
          Ir <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ── Alert row component ──

function AlertRow({ alert }: { alert: LegalDeadlineAlert }) {
  return (
    <div className="flex items-start gap-2">
      <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", SEMAPHORE_STYLES[alert.semaphore])} />
      <div className="min-w-0">
        <p className="text-xs font-medium">{alert.label}</p>
        <p className={cn("text-xs", alert.semaphore === 'red' ? 'text-destructive' : 'text-muted-foreground')}>
          {alert.description}
        </p>
      </div>
    </div>
  );
}

export default PayrollPreflightCockpit;
