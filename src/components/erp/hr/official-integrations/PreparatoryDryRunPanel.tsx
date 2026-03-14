/**
 * PreparatoryDryRunPanel — V2-ES.8 Tramo 2
 * Domain-aware dry-run panel with persistence, evidence linking, and audit trail.
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FlaskConical,
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
  History,
  Paperclip,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { usePreparatorySubmissions, type PreparatorySubmission } from '@/hooks/erp/hr/usePreparatorySubmissions';
import { useDryRunPersistence, type DryRunResult, type DryRunEvidence } from '@/hooks/erp/hr/useDryRunPersistence';
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

// ─── Evidence Card ──────────────────────────────────────────────────────────

function EvidenceList({ evidence, onGenerateOnDemand }: {
  evidence: DryRunEvidence[];
  onGenerateOnDemand?: () => void;
}) {
  const typeIcons: Record<string, typeof FileText> = {
    payload_snapshot: FileText,
    validation_report: CheckCircle2,
    simulation_log: FlaskConical,
    linked_document: Paperclip,
  };

  const typeLabels: Record<string, string> = {
    payload_snapshot: 'Payload',
    validation_report: 'Validación',
    simulation_log: 'Simulación',
    linked_document: 'Documento',
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium flex items-center gap-1">
          <Paperclip className="h-3 w-3" /> Evidencias internas ({evidence.length})
        </p>
        {onGenerateOnDemand && (
          <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5 gap-0.5" onClick={onGenerateOnDemand}>
            <Paperclip className="h-2.5 w-2.5" /> Generar
          </Button>
        )}
      </div>
      {evidence.length === 0 && (
        <p className="text-[10px] text-muted-foreground italic">Sin evidencias vinculadas aún</p>
      )}
      {evidence.map(ev => {
        const Icon = typeIcons[ev.evidence_type] || FileText;
        const isReadiness = (ev.metadata as any)?.evidence_subtype === 'readiness_report';
        return (
          <div key={ev.id} className="flex items-center gap-2 text-[11px] py-1 px-1.5 rounded bg-muted/30">
            <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="truncate block">{ev.label}</span>
              {isReadiness && (
                <span className="text-[9px] text-blue-500">Readiness report</span>
              )}
            </div>
            <Badge variant="outline" className="text-[9px] h-4 shrink-0">
              {typeLabels[ev.evidence_type] || ev.evidence_type}
            </Badge>
            <span className="text-muted-foreground text-[10px] shrink-0">
              {format(new Date(ev.created_at), 'dd/MM HH:mm', { locale: es })}
            </span>
          </div>
        );
      })}
      {evidence.length > 0 && (
        <div className="flex items-start gap-1 p-1 rounded text-[9px] text-muted-foreground bg-muted/20">
          <Info className="h-2.5 w-2.5 mt-0.5 shrink-0 text-blue-400" />
          <span>Evidencias internas preparatorias — no equivalen a justificante oficial ni acuse de organismo</span>
        </div>
      )}
    </div>
  );
}

// ─── Persisted History Card ─────────────────────────────────────────────────

function PersistedDryRunCard({
  result,
  evidence,
  onLoadEvidence,
  isEvidenceLoaded,
  onGenerateEvidence,
}: {
  result: DryRunResult;
  evidence: DryRunEvidence[];
  onLoadEvidence: (id: string) => void;
  isEvidenceLoaded: boolean;
  onGenerateEvidence?: (dryRunId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const DomainIcon = DOMAIN_ICONS[result.submission_domain] || FileText;

  const statusColor = result.status === 'success'
    ? 'text-green-600 bg-green-500/10'
    : result.status === 'partial'
    ? 'text-amber-600 bg-amber-500/10'
    : 'text-destructive bg-destructive/10';

  return (
    <Card className="hover:bg-muted/20 transition-colors">
      <CardContent className="py-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-muted">
              <DomainIcon className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5">
                {getDomainMeta(result.submission_domain as SubmissionDomain).label}
                <span className="text-muted-foreground">·</span>
                <span className="font-normal text-muted-foreground text-xs">{result.submission_type}</span>
              </p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {format(new Date(result.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                <span>· #{result.execution_number}</span>
                {result.duration_ms && <span>· {result.duration_ms}ms</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className={cn('text-[10px]', statusColor)}>
              {result.status === 'success' ? 'Éxito' : result.status === 'partial' ? 'Parcial' : 'Fallido'}
            </Badge>
            {result.readiness_score > 0 && (
              <span className="text-[10px] font-mono text-muted-foreground">{result.readiness_score}%</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setExpanded(!expanded);
                if (!expanded && !isEvidenceLoaded) {
                  onLoadEvidence(result.id);
                }
              }}
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="pt-2 border-t space-y-2">
            {/* Validation summary */}
            {result.validation_result && (
              <div className="flex items-center gap-3 text-[11px]">
                {(result.validation_result as any).passed ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3 w-3" /> Validado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-destructive">
                    <XCircle className="h-3 w-3" /> {(result.validation_result as any).errorCount} error(es)
                  </span>
                )}
                <Progress
                  value={(result.validation_result as any).score || 0}
                  className="h-1.5 flex-1 max-w-[100px] [&>div]:bg-primary"
                />
              </div>
            )}

            {/* Output */}
            {result.dry_run_output && (
              <div>
                <p className="text-[10px] font-medium mb-1">Resultado simulación</p>
                <div className="bg-muted/50 rounded p-1.5 text-[10px] font-mono max-h-20 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(result.dry_run_output, null, 2).slice(0, 300)}
                  </pre>
                </div>
              </div>
            )}

            {/* Evidence with on-demand generation */}
            <EvidenceList
              evidence={evidence}
              onGenerateOnDemand={onGenerateEvidence ? () => onGenerateEvidence(result.id) : undefined}
            />

            {/* Notes */}
            {result.notes && (
              <p className="text-[10px] text-muted-foreground italic">{result.notes}</p>
            )}

            {/* Disclaimer */}
            <div className="flex items-start gap-1.5 p-1.5 rounded bg-muted/50 text-[10px] text-muted-foreground">
              <Info className="h-3 w-3 mt-0.5 shrink-0 text-blue-500" />
              <span>
                Resultado <strong>persistido</strong> de simulación dry-run.
                No constituye envío oficial ni acuse de organismo.
                Las evidencias vinculadas son <strong>internas y preparatorias</strong>.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Submission Card (current active submissions) ───────────────────────────

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
              <CheckCircle2 className="h-3 w-3" /> Dry-run completado y persistido
            </Badge>
          )}
          {(submission.status === 'draft' || submission.status === 'payload_generated') && (
            <span className="text-[10px] text-muted-foreground">Pendiente de validación</span>
          )}
        </div>

        {isExpanded && (
          <div className="mt-2 pt-2 border-t space-y-3">
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

            {submission.payload_snapshot && (
              <div>
                <p className="text-xs font-medium mb-1">Snapshot del payload</p>
                <div className="bg-muted/50 rounded p-2 text-[10px] font-mono max-h-32 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(
                      (submission.payload_snapshot as any)?.data || submission.payload_snapshot,
                      null, 2,
                    ).slice(0, 500)}
                  </pre>
                </div>
              </div>
            )}

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

// ─── Main Panel ─────────────────────────────────────────────────────────────

export function PreparatoryDryRunPanel({ companyId }: Props) {
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('active');
  const [evidenceCache, setEvidenceCache] = useState<Record<string, DryRunEvidence[]>>({});

  const {
    submissions,
    isLoading,
    fetchPreparatory,
    executeDryRun,
    transitionStatus,
  } = usePreparatorySubmissions(companyId);

  const {
    results: dryRunHistory,
    isLoading: historyLoading,
    fetchResults,
    generateEvidenceOnDemand,
  } = useDryRunPersistence(companyId);

  useEffect(() => {
    const filter = domainFilter !== 'all' ? { domain: domainFilter as SubmissionDomain } : undefined;
    fetchPreparatory(filter);
    fetchResults(filter);
  }, [domainFilter]);

  const handleRefresh = useCallback(() => {
    const filter = domainFilter !== 'all' ? { domain: domainFilter as SubmissionDomain } : undefined;
    fetchPreparatory(filter);
    fetchResults(filter);
  }, [fetchPreparatory, fetchResults, domainFilter]);

  const handleLoadEvidence = useCallback(async (dryRunId: string) => {
    if (evidenceCache[dryRunId]) return;
    try {
      const { data } = await (await import('@/integrations/supabase/client')).supabase
        .from('erp_hr_dry_run_evidence' as any)
        .select('*')
        .eq('dry_run_id', dryRunId)
        .order('created_at', { ascending: true });
      setEvidenceCache(prev => ({ ...prev, [dryRunId]: (data || []) as unknown as DryRunEvidence[] }));
    } catch { /* graceful */ }
  }, [evidenceCache]);

  const handleGenerateEvidence = useCallback(async (dryRunId: string) => {
    const result = dryRunHistory.find(r => r.id === dryRunId);
    if (!result) return;
    const ev = await generateEvidenceOnDemand(
      dryRunId,
      'simulation_log',
      `Evidencia generada bajo demanda — ${getDomainMeta(result.submission_domain as SubmissionDomain).label}`,
      `Generación manual para dry-run #${result.execution_number}`,
      { domain: result.submission_domain, execution_number: result.execution_number },
    );
    if (ev) {
      // Refresh evidence cache
      setEvidenceCache(prev => ({
        ...prev,
        [dryRunId]: [...(prev[dryRunId] || []), ev],
      }));
    }
  }, [dryRunHistory, generateEvidenceOnDemand]);

  const handleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const domains = getSubmissionDomains();

  const dryRunCount = submissions.filter(s => s.status === 'dry_run_executed').length;
  const readyCount = submissions.filter(s => s.status === 'ready_for_dry_run').length;
  const draftCount = submissions.filter(s => ['draft', 'payload_generated', 'validated_internal'].includes(s.status)).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" /> Envíos Preparatorios (Dry-Run)
          </h3>
          <p className="text-sm text-muted-foreground">
            Simulación con persistencia · TGSS · Contrat@ · AEAT · Trazabilidad completa
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
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading || historyLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-1.5', (isLoading || historyLoading) && 'animate-spin')} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-3">
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
              <p className="text-[10px] text-muted-foreground">Ejecutados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2.5 px-3 flex items-center gap-2">
            <History className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-lg font-bold">{dryRunHistory.length}</p>
              <p className="text-[10px] text-muted-foreground">Persistidos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
        <span>
          Los envíos preparatorios operan en modo <strong>dry-run</strong>. Se genera, valida y simula el payload
          sin transmitir datos a organismos oficiales. Resultados <strong>persistidos</strong> con evidencia documental y auditoría granular.
        </span>
      </div>

      {/* Tabs: Active vs History */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="text-xs gap-1">
            <FlaskConical className="h-3 w-3" /> Envíos activos ({submissions.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1">
            <History className="h-3 w-3" /> Historial persistido ({dryRunHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-2 mt-3">
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
        </TabsContent>

        <TabsContent value="history" className="space-y-2 mt-3">
          {dryRunHistory.map(result => (
            <PersistedDryRunCard
              key={result.id}
              result={result}
              evidence={evidenceCache[result.id] || []}
              onLoadEvidence={handleLoadEvidence}
              isEvidenceLoaded={!!evidenceCache[result.id]}
              onGenerateEvidence={handleGenerateEvidence}
            />
          ))}
          {dryRunHistory.length === 0 && !historyLoading && (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <History className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Sin historial de dry-runs persistidos. Los resultados se guardan automáticamente al ejecutar un dry-run.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
