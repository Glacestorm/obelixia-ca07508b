/**
 * InstitutionalSubmissionPanel — V2-RRHH-PINST
 * UI for managing the institutional submission lifecycle.
 * Shows submission queue, status chain, receipts, signature, and reconciliation.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Send, CheckCircle, XCircle, Clock, ChevronDown, ChevronRight,
  Shield, AlertTriangle, FileCheck, Stamp, RefreshCw, ArrowRight,
  Lock, Unlock, FileText, Info, Ban,
} from 'lucide-react';
import { useInstitutionalSubmission, type InstitutionalSubmissionRow } from '@/hooks/erp/hr/useInstitutionalSubmission';
import {
  INSTITUTIONAL_STATUS_CONFIG,
  getValidInstitutionalTransitions,
  getInstitutionalChainStatus,
  ORGANISM_LABELS,
  type InstitutionalStatus,
  type TransitionGuardContext,
  validateTransitionContent,
} from '@/engines/erp/hr/institutionalSubmissionEngine';
import { cn } from '@/lib/utils';

interface Props {
  companyId: string;
  className?: string;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  generated: <FileText className="h-3.5 w-3.5" />,
  validated_internal: <FileCheck className="h-3.5 w-3.5" />,
  pending_signature: <Stamp className="h-3.5 w-3.5" />,
  signed: <Shield className="h-3.5 w-3.5" />,
  queued_for_submission: <Clock className="h-3.5 w-3.5" />,
  submitted: <Send className="h-3.5 w-3.5" />,
  accepted: <CheckCircle className="h-3.5 w-3.5" />,
  rejected: <XCircle className="h-3.5 w-3.5" />,
  partially_accepted: <AlertTriangle className="h-3.5 w-3.5" />,
  reconciled: <Lock className="h-3.5 w-3.5" />,
  requires_correction: <Unlock className="h-3.5 w-3.5" />,
  cancelled: <Ban className="h-3.5 w-3.5" />,
};

function InstitutionalChainIndicator({ status }: { status: InstitutionalStatus }) {
  const chain = getInstitutionalChainStatus(status);
  const steps = [
    { key: 'generated', label: 'Gen', done: chain.generated },
    { key: 'validated', label: 'Val', done: chain.validated },
    { key: 'signed', label: 'Fir', done: chain.signed },
    { key: 'submitted', label: 'Env', done: chain.submitted },
    { key: 'responded', label: 'Res', done: chain.responded },
    { key: 'reconciled', label: 'Rec', done: chain.reconciled },
  ];

  return (
    <div className="flex items-center gap-0.5">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center">
          <div className={cn(
            'w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold',
            step.done ? 'bg-emerald-500/20 text-emerald-700' : 'bg-muted text-muted-foreground'
          )}>
            {step.label}
          </div>
          {i < steps.length - 1 && (
            <div className={cn('w-2 h-0.5', step.done ? 'bg-emerald-500/40' : 'bg-muted')} />
          )}
        </div>
      ))}
      <span className="ml-1 text-[9px] text-muted-foreground">{chain.completeness}%</span>
    </div>
  );
}

function SubmissionCard({ row, onTransition }: {
  row: InstitutionalSubmissionRow;
  onTransition: (id: string, from: InstitutionalStatus, to: InstitutionalStatus, action: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = INSTITUTIONAL_STATUS_CONFIG[row.institutional_status];
  const validTransitions = getValidInstitutionalTransitions(row.institutional_status);

  // PINST-B1: Build guard context from row data to show which transitions are actually available
  const guardContext: TransitionGuardContext = {
    hasPayload: !!row.submission_payload,
    hasSignature: !!row.signature_id || !!row.signed_at,
    hasReceipt: !!row.receipt_id || !!row.receipt_received_at,
    hasReconciliationData: !!row.reconciliation_data,
    artifactIsValid: (row.metadata as Record<string, unknown>)?.isValid !== false,
    hasCertificate: false, // Unknown at UI level, hook will validate
  };

  return (
    <Card className="border overflow-hidden">
      <CardHeader className="pb-2 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn('p-1.5 rounded-md', statusConfig.color)}>
              {STATUS_ICONS[row.institutional_status] ?? <FileText className="h-3.5 w-3.5" />}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm truncate">
                {row.artifact_type.toUpperCase()} → {ORGANISM_LABELS[row.target_organism] ?? row.target_organism}
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">
                {row.period_year && row.period_month
                  ? `${row.period_month}/${row.period_year}`
                  : row.fiscal_year
                    ? `Ejercicio ${row.fiscal_year}`
                    : ''
                }
                {row.trimester ? ` · ${row.trimester}T` : ''}
              </p>
            </div>
          </div>
          <Badge className={cn('text-[10px] shrink-0', statusConfig.color)}>
            {statusConfig.label}
          </Badge>
        </div>
        <InstitutionalChainIndicator status={row.institutional_status} />
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        <p className="text-[10px] text-muted-foreground italic">{statusConfig.description}</p>

        {/* Signature info */}
        {row.signed_at && (
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-700">
            <Shield className="h-3 w-3" />
            <span>Firmado: {new Date(row.signed_at).toLocaleString('es-ES')}</span>
          </div>
        )}

        {/* Receipt info */}
        {row.receipt_received_at && (
          <div className="flex items-center gap-1.5 text-[10px] text-blue-700">
            <FileCheck className="h-3 w-3" />
            <span>Acuse: {new Date(row.receipt_received_at).toLocaleString('es-ES')}</span>
            {row.submission_reference && <span className="font-mono">({row.submission_reference})</span>}
          </div>
        )}

        {/* Reconciliation */}
        {row.reconciliation_status && (
          <div className={cn('flex items-center gap-1.5 text-[10px]',
            row.reconciliation_status === 'matched' ? 'text-emerald-700' : 'text-amber-700'
          )}>
            <Lock className="h-3 w-3" />
            <span>Reconciliación: {row.reconciliation_status}</span>
          </div>
        )}

        {/* Available transitions */}
        {validTransitions.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {validTransitions.map(target => {
              const targetConfig = INSTITUTIONAL_STATUS_CONFIG[target];
              return (
                <Button
                  key={target}
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] gap-1"
                  onClick={() => onTransition(row.id, row.institutional_status, target, `transition_to_${target}`)}
                >
                  <ArrowRight className="h-2.5 w-2.5" />
                  {targetConfig.label}
                </Button>
              );
            })}
          </div>
        )}

        {/* Expandable history */}
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-6 text-[10px]">
              <span>Historial ({row.status_history?.length ?? 0})</span>
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-0.5 pt-1 text-[10px]">
              {(row.status_history ?? []).slice().reverse().map((entry, i) => (
                <div key={i} className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-28 truncate">{new Date(entry.performedAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  <ArrowRight className="h-2.5 w-2.5 shrink-0" />
                  <span className="font-medium text-foreground">{entry.to}</span>
                  {entry.notes && <span className="italic truncate">— {entry.notes}</span>}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex items-center gap-1 text-[9px] text-muted-foreground pt-1 border-t border-border/30">
          <span className="font-mono">{row.id.slice(0, 8)}…</span>
          <span>·</span>
          <span>{new Date(row.created_at).toLocaleDateString('es-ES')}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function InstitutionalSubmissionPanel({ companyId, className }: Props) {
  const {
    submissions,
    isLoading,
    isProcessing,
    refetch,
    transitionStatus,
  } = useInstitutionalSubmission(companyId);

  const handleTransition = async (id: string, from: InstitutionalStatus, to: InstitutionalStatus, action: string) => {
    await transitionStatus(id, from, to, action);
  };

  // Group by status
  const grouped = useMemo(() => {
    const active = submissions.filter(s => !['reconciled', 'cancelled'].includes(s.institutional_status));
    const completed = submissions.filter(s => ['reconciled', 'cancelled'].includes(s.institutional_status));
    return { active, completed };
  }, [submissions]);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-cyan-500/5 via-emerald-500/5 to-blue-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <Send className="h-5 w-5 text-cyan-700" />
            </div>
            <div>
              <CardTitle className="text-base">Cadena Institucional</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Envío · Firma · Acuses · Reconciliación
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isProcessing && (
              <Badge variant="outline" className="text-xs animate-pulse">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Procesando…
              </Badge>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-4">
            {/* Info banner */}
            <div className="flex items-start gap-2 p-2 rounded-md bg-cyan-500/5 border border-cyan-500/20">
              <Info className="h-3.5 w-3.5 text-cyan-700 shrink-0 mt-0.5" />
              <p className="text-[10px] text-cyan-700 leading-relaxed">
                La cadena institucional gestiona el ciclo completo: generación → validación → firma → envío → acuse → reconciliación.
                Los estados reflejan el progreso real del proceso ante los organismos oficiales.
                El envío real requiere conexión con el organismo correspondiente.
              </p>
            </div>

            {/* Active submissions */}
            {grouped.active.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  En proceso ({grouped.active.length})
                </h4>
                <div className="space-y-2">
                  {grouped.active.map(row => (
                    <SubmissionCard key={row.id} row={row} onTransition={handleTransition} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed */}
            {grouped.completed.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Completados ({grouped.completed.length})
                  </h4>
                  <div className="space-y-2">
                    {grouped.completed.map(row => (
                      <SubmissionCard key={row.id} row={row} onTransition={handleTransition} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Empty state */}
            {submissions.length === 0 && !isLoading && (
              <div className="text-center py-6 text-muted-foreground">
                <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay envíos institucionales.</p>
                <p className="text-xs mt-1">
                  Los envíos se crean desde los artefactos oficiales generados.
                </p>
              </div>
            )}

            {isLoading && (
              <div className="text-center py-4 text-muted-foreground text-xs">
                <RefreshCw className="h-4 w-4 mx-auto mb-1 animate-spin" />
                Cargando envíos institucionales…
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default InstitutionalSubmissionPanel;
