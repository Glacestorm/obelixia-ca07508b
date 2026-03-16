/**
 * OfficialReadinessMatrixPanel — V2-RRHH-FASE-4
 * Unified readiness matrix UI for Spanish official integrations.
 * Shows per-circuit honest operational status with drill-down.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  RefreshCw, ShieldCheck, ShieldX, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronRight, Info, Lock, FlaskConical,
  Rocket, Send, FileWarning, TestTube, ClipboardCheck, CircleOff,
  AlertCircle, ExternalLink,
} from 'lucide-react';
import { useOfficialReadinessMatrix } from '@/hooks/erp/hr/useOfficialReadinessMatrix';
import {
  OPERATIONAL_STATUS_META,
  getSystemLimitsDeclaration,
  type CircuitReadinessItem,
  type OfficialOperationalStatus,
} from '@/engines/erp/hr/officialReadinessMatrixEngine';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId: string;
  className?: string;
}

const STATUS_ICONS: Record<OfficialOperationalStatus, typeof ShieldCheck> = {
  not_configured: CircleOff,
  blocked: ShieldX,
  data_incomplete: FileWarning,
  mock: TestTube,
  preparatory: ClipboardCheck,
  sandbox_ready: FlaskConical,
  production_ready: Rocket,
  submitted: Send,
  reconciled: CheckCircle2,
  error: AlertCircle,
};

export function OfficialReadinessMatrixPanel({ companyId, className }: Props) {
  const { matrix, isLoading, lastEvaluatedAt, evaluate } = useOfficialReadinessMatrix(companyId);
  const [expandedCircuit, setExpandedCircuit] = useState<string | null>(null);
  const [showLimits, setShowLimits] = useState(false);

  useEffect(() => {
    evaluate();
  }, []);

  const systemLimits = getSystemLimitsDeclaration();

  if (!matrix && !isLoading) {
    return (
      <Card className={cn('border-dashed opacity-60', className)}>
        <CardContent className="py-12 text-center">
          <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Evalúe la preparación de integraciones oficiales</p>
          <Button onClick={evaluate} className="mt-3 gap-2" size="sm">
            <RefreshCw className="h-4 w-4" /> Evaluar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const overallMeta = matrix ? OPERATIONAL_STATUS_META[matrix.overallStatus] : null;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/70">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Readiness — Integraciones Oficiales España</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lastEvaluatedAt
                  ? `Evaluado ${formatDistanceToNow(new Date(lastEvaluatedAt), { locale: es, addSuffix: true })}`
                  : 'Sin evaluar'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {overallMeta && (
              <Badge className={cn('gap-1', overallMeta.color)}>
                {overallMeta.labelShort}
              </Badge>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={evaluate} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Global disclaimer */}
        <div className="mt-3 p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 flex items-start gap-2">
          <Lock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-800">
            <strong>Envío real bloqueado.</strong> Todas las operaciones son preparatorias e internas.
            No se transmite información a organismos oficiales en esta versión.
          </div>
        </div>

        {/* Summary KPIs */}
        {matrix && (
          <div className="grid grid-cols-5 gap-2 mt-3">
            <SummaryKpi label="Configurados" value={matrix.configured} total={matrix.totalCircuits} />
            <SummaryKpi label="Preparatorios" value={matrix.preparatory} />
            <SummaryKpi label="Sandbox" value={matrix.sandboxReady} />
            <SummaryKpi label="Bloqueados" value={matrix.blocked} variant={matrix.blocked > 0 ? 'danger' : 'default'} />
            <SummaryKpi label="Enviados" value={matrix.submitted} variant={matrix.submitted > 0 ? 'success' : 'default'} />
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-3">
        <ScrollArea className="h-[500px]">
          {matrix && (
            <div className="space-y-1.5">
              {matrix.circuits.map(item => (
                <CircuitRow
                  key={item.circuit.id}
                  item={item}
                  isExpanded={expandedCircuit === item.circuit.id}
                  onToggle={() => setExpandedCircuit(
                    expandedCircuit === item.circuit.id ? null : item.circuit.id
                  )}
                />
              ))}
            </div>
          )}

          {/* System limits */}
          <Separator className="my-4" />
          <Collapsible open={showLimits} onOpenChange={setShowLimits}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
              {showLimits ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Info className="h-4 w-4" />
              Límites actuales del sistema
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="space-y-1.5">
                {systemLimits.map(limit => (
                  <div key={limit.area} className="flex items-start gap-2 p-2 rounded-lg border bg-card text-xs">
                    <Badge
                      variant="outline"
                      className={cn(
                        'shrink-0 text-[10px]',
                        limit.status === 'available' ? 'border-emerald-300 text-emerald-700' :
                        limit.status === 'preparatory_only' ? 'border-blue-300 text-blue-700' :
                        limit.status === 'modeled_only' ? 'border-amber-300 text-amber-700' :
                        'border-red-300 text-red-700',
                      )}
                    >
                      {limit.status === 'available' ? 'Disponible' :
                       limit.status === 'preparatory_only' ? 'Solo preparatorio' :
                       limit.status === 'modeled_only' ? 'Solo modelado' : 'No disponible'}
                    </Badge>
                    <div>
                      <p className="font-medium">{limit.area}</p>
                      <p className="text-muted-foreground">{limit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ── Circuit row ──

function CircuitRow({ item, isExpanded, onToggle }: {
  item: CircuitReadinessItem;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const StatusIcon = STATUS_ICONS[item.operationalStatus];

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="w-full">
        <div className={cn(
          'flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors text-left',
          item.operationalStatus === 'blocked' && 'border-destructive/30',
          item.operationalStatus === 'error' && 'border-red-300',
        )}>
          <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0', item.statusMeta.color)}>
            <StatusIcon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.circuit.label}</p>
            <p className="text-[11px] text-muted-foreground">{item.circuit.organism}</p>
          </div>
          <Badge className={cn('text-[10px] shrink-0', item.statusMeta.color)}>
            {item.statusMeta.labelShort}
          </Badge>
          {item.realSubmissionBlocked && item.statusMeta.requiresDisclaimer && (
            <Lock className="h-3 w-3 text-amber-500 shrink-0" />
          )}
          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="ml-11 mr-3 mt-1 mb-2 p-3 rounded-lg border bg-muted/20 space-y-3 text-xs">
          {/* Status description */}
          <p className="text-muted-foreground">{item.statusMeta.description}</p>

          {/* System capability */}
          <div className="flex items-start gap-2">
            <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
            <span className="text-muted-foreground">{item.systemCapabilityLabel}</span>
          </div>

          {/* Certificate */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Certificado:</span>
            <Badge variant="outline" className={cn(
              'text-[10px]',
              item.certificateStatus === 'real' ? 'border-emerald-300 text-emerald-700' :
              item.certificateStatus === 'ready_preparatory' ? 'border-blue-300 text-blue-700' :
              item.certificateStatus === 'placeholder' ? 'border-amber-300 text-amber-700' :
              item.certificateStatus === 'expired' ? 'border-red-300 text-red-700' :
              'border-muted text-muted-foreground',
            )}>
              {item.certificateStatus === 'real' ? 'Real' :
               item.certificateStatus === 'ready_preparatory' ? 'Preparatorio' :
               item.certificateStatus === 'placeholder' ? 'Placeholder' :
               item.certificateStatus === 'expired' ? 'Expirado' : 'Sin configurar'}
            </Badge>
          </div>

          {/* Latest submission */}
          {item.latestSubmission && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Último envío:</span>
              <Badge variant="outline" className="text-[10px]">
                {item.latestSubmission.status}
              </Badge>
              {item.latestSubmission.referencePeriod && (
                <span className="text-muted-foreground">— {item.latestSubmission.referencePeriod}</span>
              )}
            </div>
          )}

          {/* Block reasons */}
          {item.blockReasons.length > 0 && (
            <div className="space-y-1">
              <p className="font-medium text-destructive">Bloqueantes:</p>
              {item.blockReasons.map((r, i) => (
                <div key={i} className="flex items-start gap-1.5 text-destructive/80">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          )}

          {/* Next steps */}
          {item.nextSteps.length > 0 && (
            <div className="space-y-1">
              <p className="font-medium text-blue-700">Próximos pasos:</p>
              {item.nextSteps.map((s, i) => (
                <div key={i} className="flex items-start gap-1.5 text-blue-600">
                  <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}

          {/* Connector signals */}
          {item.connectorReadiness && (
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <SignalChip label="Datos" ok={item.connectorReadiness.signals.dataComplete} />
              <SignalChip label="Formato" ok={item.connectorReadiness.signals.formatValid} />
              <SignalChip label="Consistencia" ok={item.connectorReadiness.signals.consistencyOk} />
              <SignalChip label="Documentos" ok={item.connectorReadiness.signals.docsReady} />
              <SignalChip label="Adaptador" ok={item.connectorReadiness.signals.adapterConfigured} />
              <SignalChip label="Credenciales" ok={item.connectorReadiness.signals.credentialsPresent} />
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Sub-components ──

function SummaryKpi({ label, value, total, variant = 'default' }: {
  label: string;
  value: number;
  total?: number;
  variant?: 'default' | 'danger' | 'success';
}) {
  return (
    <div className={cn(
      'p-2 rounded-lg border bg-card text-center',
      variant === 'danger' && value > 0 && 'border-destructive/30 bg-destructive/5',
      variant === 'success' && value > 0 && 'border-emerald-300 bg-emerald-50/30',
    )}>
      <p className="text-lg font-bold">
        {value}{total !== undefined && <span className="text-xs text-muted-foreground font-normal">/{total}</span>}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function SignalChip({ label, ok }: { label: string; ok: boolean | null }) {
  if (ok === null) return (
    <div className="flex items-center gap-1 p-1 rounded bg-muted/50 text-muted-foreground text-[10px]">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
      {label}
    </div>
  );
  return (
    <div className={cn(
      'flex items-center gap-1 p-1 rounded text-[10px]',
      ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600',
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full', ok ? 'bg-emerald-500' : 'bg-red-500')} />
      {label}
    </div>
  );
}

export default OfficialReadinessMatrixPanel;
