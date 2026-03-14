/**
 * PreparatoryDryRunPanel — V2-ES.8 Paso 3-4
 * Domain-aware dry-run panel integrated into OfficialIntegrationsHub.
 * Shows preparatory submissions with payload, validation, and dry-run execution.
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  FlaskConical,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  FileText,
  Shield,
  Calculator,
  Clock,
  ChevronDown,
  ChevronRight,
  Info,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { usePreparatorySubmissions, type PreparatorySubmission } from '@/hooks/erp/hr/usePreparatorySubmissions';
import {
  getStatusMeta,
  getDomainMeta,
  getSubmissionDomains,
  type SubmissionDomain,
  type PreparatorySubmissionStatus,
} from '@/components/erp/hr/shared/preparatorySubmissionEngine';

interface Props {
  companyId: string;
}

const DOMAIN_ICONS: Record<string, typeof Shield> = {
  TGSS: Shield,
  CONTRATA: FileText,
  AEAT_111: Calculator,
  AEAT_190: Calculator,
  CERTIFICA2: FileText,
  DELTA: AlertTriangle,
  generic: FileText,
};

const STATUS_COLORS: Record<string, string> = {
  muted: 'bg-muted text-muted-foreground',
  blue: 'bg-blue-500/10 text-blue-600',
  amber: 'bg-amber-500/10 text-amber-600',
  green: 'bg-green-500/10 text-green-600',
  red: 'bg-destructive/10 text-destructive',
  purple: 'bg-purple-500/10 text-purple-600',
};

function SubmissionCard({
  submission,
  onDryRun,
  onTransition,
  onExpand,
  isExpanded,
}: {
  submission: PreparatorySubmission;
  onDryRun: (id: string) => void;
  onTransition: (id: string, status: PreparatorySubmissionStatus) => void;
  onExpand: (id: string) => void;
  isExpanded: boolean;
}) {
  const statusMeta = getStatusMeta(submission.status as PreparatorySubmissionStatus);
  const domainMeta = getDomainMeta(submission.submission_domain as SubmissionDomain);
  const DomainIcon = DOMAIN_ICONS[submission.submission_domain] || FileText;
  const validation = submission.validation_result;

  return (
    <Card className={cn('transition-colors', isExpanded && 'ring-1 ring-primary/30')}>
      <CardContent className="py-3 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-muted">
              <DomainIcon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold flex items-center gap-1.5">
                {domainMeta.label}
                <span className="text-muted-foreground font-normal">—</span>
                <span className="font-normal text-muted-foreground">{submission.submission_type}</span>
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {formatDistanceToNow(new Date(submission.created_at), { locale: es, addSuffix: true })}
                {submission.reference_period && <span>· Período: {submission.reference_period}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] gap-0.5">
              <FlaskConical className="h-2.5 w-2.5" />
              {submission.submission_mode === 'dry_run' ? 'Dry-run' : submission.submission_mode}
            </Badge>
            <Badge className={cn('text-[10px]', STATUS_COLORS[statusMeta.color])}>
              {statusMeta.label}
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onExpand(submission.id)}>
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Validation summary bar */}
        {validation && (
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1">
              {validation.passed ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <XCircle className="h-3 w-3 text-destructive" />
              )}
              <span className={validation.passed ? 'text-green-600' : 'text-destructive'}>
                {validation.passed ? 'Validado' : `${validation.errorCount} error(es)`}
              </span>
            </div>
            {validation.warningCount > 0 && (
              <div className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                <span>{validation.warningCount} aviso(s)</span>
              </div>
            )}
            <Progress
              value={validation.score}
              className={cn('h-1.5 flex-1 max-w-[120px]',
                validation.score >= 80 ? '[&>div]:bg-green-500' :
                validation.score >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-destructive'
              )}
            />
            <span className="font-mono text-[10px]">{validation.score}%</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {submission.status === 'ready_for_dry_run' && (
            <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => onDryRun(submission.id)}>
              <Play className="h-3 w-3" /> Ejecutar dry-run
            </Button>
          )}
          {submission.status === 'validated_internal' && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onTransition(submission.id, 'ready_for_dry_run')}>
              <FlaskConical className="h-3 w-3" /> Preparar dry-run
            </Button>
          )}
          {submission.status === 'dry_run_executed' && (
            <Badge variant="outline" className="text-[10px] gap-1 border-green-500/30 text-green-600">
              <CheckCircle2 className="h-3 w-3" /> Dry-run completado
            </Badge>
          )}
          {(submission.status === 'draft' || submission.status === 'payload_generated') && (
            <span className="text-[10px] text-muted-foreground">Pendiente de validación</span>
          )}
        </div>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="mt-2 pt-2 border-t space-y-3">
            {/* Validation checks */}
            {validation && validation.checks.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1.5">Validación interna</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {validation.checks.map((check, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px]">
                      {check.passed ? (
                        <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-500 shrink-0" />
                      ) : check.severity === 'error' ? (
                        <XCircle className="h-3 w-3 mt-0.5 text-destructive shrink-0" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 mt-0.5 text-amber-500 shrink-0" />
                      )}
                      <span className={cn(
                        !check.passed && check.severity === 'error' && 'text-destructive',
                        !check.passed && check.severity === 'warning' && 'text-amber-600',
                      )}>
                        {check.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dry-run history */}
            {(submission.metadata as any)?.dry_run_history && (
              <div>
                <p className="text-xs font-medium mb-1.5">Historial dry-run</p>
                {((submission.metadata as any).dry_run_history as any[]).map((dr, i) => (
                  <div key={i} className="text-[11px] flex items-center gap-2 py-0.5">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span>Simulación {dr.result}</span>
                    <span className="text-muted-foreground">
                      {formatDistanceToNow(new Date(dr.executed_at), { locale: es, addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Payload preview */}
            {submission.payload_snapshot && (
              <div>
                <p className="text-xs font-medium mb-1">Snapshot del payload</p>
                <div className="bg-muted/50 rounded p-2 text-[10px] font-mono max-h-32 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(
                      (submission.payload_snapshot as any)?.data || submission.payload_snapshot,
                      null,
                      2,
                    ).slice(0, 500)}
                    {JSON.stringify((submission.payload_snapshot as any)?.data || submission.payload_snapshot).length > 500 ? '\n...' : ''}
                  </pre>
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="flex items-start gap-1.5 p-2 rounded bg-muted/50 text-[10px] text-muted-foreground">
              <Info className="h-3 w-3 mt-0.5 shrink-0 text-blue-500" />
              <span>
                Modo <strong>dry-run</strong>: simulación interna sin envío oficial.
                {statusMeta.isOfficial && <span className="text-destructive font-medium"> Este estado indica envío oficial.</span>}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PreparatoryDryRunPanel({ companyId }: Props) {
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const {
    submissions,
    isLoading,
    fetchPreparatory,
    createPreparatory,
    executeDryRun,
    transitionStatus,
    markReadyForDryRun,
  } = usePreparatorySubmissions(companyId);

  useEffect(() => {
    fetchPreparatory(domainFilter !== 'all' ? { domain: domainFilter as SubmissionDomain } : undefined);
  }, [domainFilter]);

  const handleRefresh = useCallback(() => {
    fetchPreparatory(domainFilter !== 'all' ? { domain: domainFilter as SubmissionDomain } : undefined);
  }, [fetchPreparatory, domainFilter]);

  const handleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const domains = getSubmissionDomains();

  // Stats
  const dryRunCount = submissions.filter(s => s.status === 'dry_run_executed').length;
  const readyCount = submissions.filter(s => s.status === 'ready_for_dry_run').length;
  const draftCount = submissions.filter(s => s.status === 'draft' || s.status === 'payload_generated' || s.status === 'validated_internal').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" /> Envíos Preparatorios (Dry-Run)
          </h3>
          <p className="text-sm text-muted-foreground">
            Simulación de envíos oficiales · TGSS · Contrat@ · AEAT · Cero irreversibilidad
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={domainFilter} onValueChange={setDomainFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Dominio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos los dominios</SelectItem>
              {domains.map(d => (
                <SelectItem key={d} value={d} className="text-xs">
                  {getDomainMeta(d).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-1.5', isLoading && 'animate-spin')} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-2.5 px-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold">{draftCount}</p>
              <p className="text-[10px] text-muted-foreground">En preparación</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2.5 px-3 flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-amber-500" />
            <div>
              <p className="text-lg font-bold">{readyCount}</p>
              <p className="text-[10px] text-muted-foreground">Listos dry-run</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2.5 px-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-lg font-bold">{dryRunCount}</p>
              <p className="text-[10px] text-muted-foreground">Dry-runs completados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
        <span>
          Los envíos preparatorios operan en modo <strong>dry-run</strong>. Se genera, valida y simula el payload
          sin transmitir datos a organismos oficiales. El envío real está <strong>bloqueado</strong> por defecto.
        </span>
      </div>

      {/* Submissions list */}
      <div className="space-y-2">
        {submissions.map(sub => (
          <SubmissionCard
            key={sub.id}
            submission={sub}
            onDryRun={executeDryRun}
            onTransition={transitionStatus}
            onExpand={handleExpand}
            isExpanded={expandedId === sub.id}
          />
        ))}
        {submissions.length === 0 && !isLoading && (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <FlaskConical className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No hay envíos preparatorios. Los envíos se crean desde los procesos de alta, contratación o cierre de período.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
