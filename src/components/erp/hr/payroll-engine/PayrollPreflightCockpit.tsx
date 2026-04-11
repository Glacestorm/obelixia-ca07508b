/**
 * PayrollPreflightCockpit — P1.7C
 * Transversal cockpit showing the full payroll cycle status at a glance.
 * Reads from existing engines — NO business logic duplication.
 *
 * P1.7C: context navigation, cross-domain blockers, last-mile badges, demo/operational mode.
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
  FileText, Archive, UserMinus, Send, Euro, Gauge, Link2, Wrench,
  Info
} from 'lucide-react';
import { usePayrollPreflight } from '@/hooks/erp/hr/usePayrollPreflight';
import { useHREnvironment } from '@/contexts/HREnvironmentContext';
import type {
  PreflightStep, Semaphore, OverallStatus, LegalDeadlineAlert,
  CrossDomainBlocker, StepTargetContext, LastMileStepStatus
} from '@/engines/erp/hr/payrollPreflightEngine';

interface Props {
  companyId: string;
  onNavigateToModule: (module: string, context?: StepTargetContext) => void;
  mode?: 'operational' | 'demo';
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

const LM_STATUS_LABELS: Record<string, string> = {
  ready: '✓',
  not_started: '—',
  in_progress: '…',
  blocked: '✗',
  unknown: '?',
};

export function PayrollPreflightCockpit({ companyId, onNavigateToModule, mode: modeProp }: Props) {
  const { preflight, isLoading, evaluate } = usePayrollPreflight(companyId);
  const [showOffboarding, setShowOffboarding] = useState(false);
  const env = useHREnvironment();
  const effectiveMode = modeProp ?? (env.mode === 'demo' ? 'demo' : 'operational');
  const isDemo = effectiveMode === 'demo';

  useEffect(() => {
    evaluate();
  }, [evaluate]);

  const handleNavigate = (module: string, context?: StepTargetContext) => {
    onNavigateToModule(module, context);
  };

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
        {isDemo && <Badge variant="outline" className="ml-auto text-[10px]">DEMO</Badge>}
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
                <CardTitle className="text-lg">
                  {isDemo ? 'Estado del Ciclo de Nómina' : 'Preflight Ciclo de Nómina'}
                </CardTitle>
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
                    <StepRow
                      key={step.id}
                      step={step}
                      isLast={idx === preflight.steps.length - 1}
                      onNavigate={handleNavigate}
                      isDemo={isDemo}
                    />
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
                          <StepRow
                            key={step.id}
                            step={step}
                            isLast={idx === preflight.offboardingSteps.length - 1}
                            onNavigate={handleNavigate}
                            isDemo={isDemo}
                          />
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
                onClick={() => handleNavigate(
                  preflight.nextRecommendedAction.targetModule,
                  preflight.nextRecommendedAction.targetContext,
                )}
              >
                Ir al módulo <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Cross-domain blockers (operational mode only) */}
          {!isDemo && preflight.crossDomainBlockers.length > 0 && (
            <Card className="border-amber-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-600">
                  <Link2 className="h-4 w-4" />
                  Bloqueos cruzados ({preflight.crossDomainBlockers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {preflight.crossDomainBlockers.map(b => (
                    <CrossBlockerRow key={b.id} blocker={b} onNavigate={handleNavigate} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
                    <AlertRow key={alert.id} alert={alert} isDemo={isDemo} />
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
                <p className="text-xs text-destructive mt-0.5">{preflight.firstBlockedStep.blockReason}</p>
                {preflight.firstBlockedStep.suggestedFix && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Wrench className="h-3 w-3" />
                    {preflight.firstBlockedStep.suggestedFix}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => handleNavigate(
                    preflight.firstBlockedStep!.targetModule,
                    preflight.firstBlockedStep!.targetContext,
                  )}
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

function StepRow({ step, isLast, onNavigate, isDemo }: {
  step: PreflightStep;
  isLast: boolean;
  onNavigate: (m: string, ctx?: StepTargetContext) => void;
  isDemo: boolean;
}) {
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
      <div className="flex-1 flex items-start gap-3 pb-3 min-w-0">
        <StepIcon className={cn("h-4 w-4 shrink-0 mt-0.5", statusStyle.color)} />
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
          {!isDemo && step.suggestedFix && step.status !== 'completed' && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Wrench className="h-3 w-3 shrink-0" />
              {step.suggestedFix}
            </p>
          )}
          {step.deadline && (
            <p className="text-xs text-muted-foreground mt-0.5">Plazo: {step.deadline}</p>
          )}
          {/* Last-mile status badges (operational only) */}
          {!isDemo && step.lastMileStatus && step.isInstitutional && (
            <LastMileBadges status={step.lastMileStatus} />
          )}
        </div>

        <StatusIcon className={cn("h-4 w-4 shrink-0 mt-0.5", statusStyle.color)} />

        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onNavigate(step.targetModule, step.targetContext)}
        >
          Ir <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ── Last-mile badges ──

function LastMileBadges({ status }: { status: LastMileStepStatus }) {
  const items = [
    { key: 'handoff', label: 'H' },
    { key: 'format', label: 'F' },
    { key: 'credential', label: 'C' },
    { key: 'sandbox', label: 'S' },
  ] as const;

  return (
    <div className="flex items-center gap-1 mt-1">
      <span className="text-[10px] text-muted-foreground mr-1">LM:</span>
      {items.map(item => {
        const val = status[item.key];
        const isOk = val === 'ready' || val === 'completed';
        const isBlocked = val === 'blocked';
        return (
          <span
            key={item.key}
            className={cn(
              "text-[9px] px-1 py-0 rounded font-mono",
              isOk ? "bg-emerald-500/15 text-emerald-600" :
              isBlocked ? "bg-destructive/15 text-destructive" :
              "bg-muted text-muted-foreground"
            )}
            title={`${item.key}: ${val}`}
          >
            {item.label}{LM_STATUS_LABELS[val] || '?'}
          </span>
        );
      })}
    </div>
  );
}

// ── Cross-domain blocker row ──

function CrossBlockerRow({ blocker, onNavigate }: {
  blocker: CrossDomainBlocker;
  onNavigate: (m: string, ctx?: StepTargetContext) => void;
}) {
  return (
    <div className="p-2 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-1">
      <div className="flex items-center gap-1.5">
        <Badge variant="outline" className="text-[9px] px-1 py-0">{blocker.blockDomain}</Badge>
        <span className="text-xs font-medium">{blocker.affectedStepLabel}</span>
      </div>
      <p className="text-[11px] text-muted-foreground">{blocker.reason}</p>
      <div className="flex items-center gap-1.5">
        <Wrench className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-[11px] text-foreground">{blocker.suggestedFix}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-[11px] px-2 mt-1"
        onClick={() => onNavigate(blocker.suggestedTarget, blocker.suggestedTargetContext)}
      >
        Ir a {blocker.dependsOnStepLabel} <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
    </div>
  );
}

// ── Alert row component ──

function AlertRow({ alert, isDemo }: { alert: LegalDeadlineAlert; isDemo: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", SEMAPHORE_STYLES[alert.semaphore])} />
      <div className="min-w-0">
        <p className="text-xs font-medium">{alert.label}</p>
        <p className={cn("text-xs", alert.semaphore === 'red' ? 'text-destructive' : 'text-muted-foreground')}>
          {alert.description}
        </p>
        {!isDemo && alert.regulatoryBasis && (
          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <Info className="h-2.5 w-2.5 shrink-0" />
            {alert.regulatoryBasis}
          </p>
        )}
      </div>
    </div>
  );
}

export default PayrollPreflightCockpit;
