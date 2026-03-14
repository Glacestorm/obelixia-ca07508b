/**
 * PreRealApprovalPanel — V2-ES.8 Tramo 5
 * Approval workflow panel for pre-real submissions.
 * Integrated into OfficialIntegrationsHub as a tab.
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  FileCheck,
  Info,
  Lock,
  Send,
  Edit,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { usePreRealApproval, type SubmissionApproval } from '@/hooks/erp/hr/usePreRealApproval';
import { usePreparatorySubmissions } from '@/hooks/erp/hr/usePreparatorySubmissions';
import {
  getApprovalStatusMeta,
  getApprovalRoleMeta,
  getDefaultApprovalChecklist,
  isChecklistComplete,
  evaluateApprovalEligibility,
  APPROVAL_DISCLAIMERS,
  type ApprovalStatus,
  type ApprovalChecklistItem,
  type ApprovalRole,
  type EligibilityLevel,
} from '@/components/erp/hr/shared/preRealApprovalEngine';
import { getDomainMeta, type SubmissionDomain } from '@/components/erp/hr/shared/preparatorySubmissionEngine';

interface Props {
  companyId: string;
}

// ─── Status visual config ───────────────────────────────────────────────────

const STATUS_ICONS: Record<ApprovalStatus, typeof Clock> = {
  pending_approval: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
  correction_requested: Edit,
  cancelled: XCircle,
  expired: Clock,
};

const STATUS_COLORS: Record<ApprovalStatus, string> = {
  pending_approval: 'text-amber-500',
  approved: 'text-green-500',
  rejected: 'text-destructive',
  correction_requested: 'text-blue-500',
  cancelled: 'text-muted-foreground',
  expired: 'text-muted-foreground',
};

const STATUS_BG: Record<ApprovalStatus, string> = {
  pending_approval: 'bg-amber-500/10 border-amber-500/20',
  approved: 'bg-green-500/10 border-green-500/20',
  rejected: 'bg-destructive/10 border-destructive/20',
  correction_requested: 'bg-blue-500/10 border-blue-500/20',
  cancelled: 'bg-muted border-border',
  expired: 'bg-muted border-border',
};

// ─── Main Panel ─────────────────────────────────────────────────────────────

export function PreRealApprovalPanel({ companyId }: Props) {
  const {
    approvals,
    isLoading,
    pendingCount,
    approvedCount,
    rejectedCount,
    fetchApprovals,
    checkEligibility,
    requestApproval,
    decide,
    cancelApproval,
    getSubmissionApproval,
  } = usePreRealApproval(companyId);

  const { submissions, fetchPreparatory } = usePreparatorySubmissions(companyId);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [decisionDialog, setDecisionDialog] = useState<{
    approval: SubmissionApproval;
    type: 'approved' | 'rejected' | 'correction_requested';
  } | null>(null);
  const [requestDialog, setRequestDialog] = useState<string | null>(null); // submissionId
  const [requestNotes, setRequestNotes] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [checklist, setChecklist] = useState<ApprovalChecklistItem[]>([]);
  const [expandedApproval, setExpandedApproval] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovals();
    fetchPreparatory();
  }, []);

  // Eligible submissions (dry_run_executed, no pending approval)
  const eligibleSubmissions = useMemo(() => {
    return submissions.filter(s => {
      if (s.status !== 'dry_run_executed') return false;
      const existing = approvals.find(
        a => a.submission_id === s.id && a.status === 'pending_approval'
      );
      return !existing;
    });
  }, [submissions, approvals]);

  const filteredApprovals = useMemo(() => {
    if (statusFilter === 'all') return approvals;
    return approvals.filter(a => a.status === statusFilter);
  }, [approvals, statusFilter]);

  // ── Request handlers ──
  const handleOpenRequestDialog = (submissionId: string) => {
    setRequestDialog(submissionId);
    setRequestNotes('');
  };

  const handleRequestApproval = async () => {
    if (!requestDialog) return;
    const sub = submissions.find(s => s.id === requestDialog);
    if (!sub) return;

    const dryRunHistory = ((sub.metadata as any)?.dry_run_history || []) as any[];

    await requestApproval({
      submissionId: sub.id,
      domain: sub.submission_domain as SubmissionDomain,
      submissionType: sub.submission_type,
      submissionStatus: sub.status as any,
      validationResult: sub.validation_result as any,
      payloadSnapshot: sub.payload_snapshot as any,
      dryRunCount: dryRunHistory.length,
      hasCertificate: false, // graceful degradation
      notes: requestNotes || undefined,
    });

    setRequestDialog(null);
    setRequestNotes('');
    fetchApprovals();
  };

  // ── Decision handlers ──
  const handleOpenDecision = (approval: SubmissionApproval, type: 'approved' | 'rejected' | 'correction_requested') => {
    const domain = approval.submission_domain as SubmissionDomain;
    const defaultChecklist = type === 'approved' ? getDefaultApprovalChecklist(domain) : [];
    setChecklist(defaultChecklist);
    setDecisionNotes('');
    setDecisionDialog({ approval, type });
  };

  const handleDecide = async () => {
    if (!decisionDialog) return;
    const success = await decide(
      decisionDialog.approval.id,
      decisionDialog.type,
      decisionNotes,
      decisionDialog.type === 'approved' ? checklist : undefined,
    );
    if (success) {
      setDecisionDialog(null);
      setDecisionNotes('');
      setChecklist([]);
      fetchApprovals();
    }
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, checked: !c.checked } : c));
  };

  const allRequiredChecked = isChecklistComplete(checklist);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Aprobaciones Pre-Real
          </h3>
          <p className="text-sm text-muted-foreground">
            Gate interno de autorización para envíos preparatorios
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchApprovals(); fetchPreparatory(); }} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4 mr-1.5', isLoading && 'animate-spin')} />
          Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-2.5 px-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <div>
              <p className="text-lg font-bold">{pendingCount}</p>
              <p className="text-[10px] text-muted-foreground">Pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2.5 px-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-lg font-bold">{approvedCount}</p>
              <p className="text-[10px] text-muted-foreground">Aprobados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2.5 px-3 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            <div>
              <p className="text-lg font-bold">{rejectedCount}</p>
              <p className="text-[10px] text-muted-foreground">Rechazados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2.5 px-3 flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-lg font-bold">{eligibleSubmissions.length}</p>
              <p className="text-[10px] text-muted-foreground">Elegibles</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Eligible submissions for approval request */}
      {eligibleSubmissions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" /> Envíos elegibles para aprobación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {eligibleSubmissions.slice(0, 5).map(sub => {
              const domainMeta = getDomainMeta(sub.submission_domain as SubmissionDomain);
              const score = (sub.validation_result as any)?.score || 0;
              return (
                <div key={sub.id} className="flex items-center justify-between py-1.5 px-2 rounded border text-[11px]">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge variant="outline" className="text-[9px] h-4">{domainMeta.label}</Badge>
                    <span className="font-medium truncate">{sub.submission_type}</span>
                    <span className="text-muted-foreground font-mono">{score}%</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] gap-1"
                    onClick={() => handleOpenRequestDialog(sub.id)}
                  >
                    <ShieldCheck className="h-3 w-3" /> Solicitar aprobación
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Filters + list */}
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pending_approval">Pendientes</SelectItem>
            <SelectItem value="approved">Aprobadas</SelectItem>
            <SelectItem value="rejected">Rechazadas</SelectItem>
            <SelectItem value="correction_requested">Corrección</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filteredApprovals.length} resultado(s)</span>
      </div>

      {/* Approval list */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {filteredApprovals.map(approval => {
            const statusMeta = getApprovalStatusMeta(approval.status);
            const StatusIcon = STATUS_ICONS[approval.status];
            const domainMeta = getDomainMeta(approval.submission_domain as SubmissionDomain);
            const roleMeta = getApprovalRoleMeta(approval.required_role as ApprovalRole);
            const isExpanded = expandedApproval === approval.id;

            return (
              <Card key={approval.id} className={cn('border transition-colors', STATUS_BG[approval.status])}>
                <CardContent className="py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <StatusIcon className={cn('h-4 w-4 shrink-0', STATUS_COLORS[approval.status])} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium">{approval.submission_type}</span>
                          <Badge variant="outline" className="text-[9px] h-4">{domainMeta.label}</Badge>
                          <Badge className={cn('text-[9px] h-4', STATUS_BG[approval.status], STATUS_COLORS[approval.status])}>
                            {statusMeta.label}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Solicitado {formatDistanceToNow(new Date(approval.requested_at), { locale: es, addSuffix: true })}
                          {' · '}Requiere: {roleMeta.label}
                          {' · '}Score: {approval.readiness_score}%
                          {approval.dry_run_count > 0 && ` · ${approval.dry_run_count} dry-run(s)`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {approval.status === 'pending_approval' && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 text-[10px] gap-1"
                            onClick={() => handleOpenDecision(approval, 'approved')}
                          >
                            <CheckCircle2 className="h-3 w-3" /> Aprobar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] gap-1"
                            onClick={() => handleOpenDecision(approval, 'correction_requested')}
                          >
                            <Edit className="h-3 w-3" /> Corregir
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-[10px] gap-1"
                            onClick={() => handleOpenDecision(approval, 'rejected')}
                          >
                            <XCircle className="h-3 w-3" /> Rechazar
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setExpandedApproval(prev => prev === approval.id ? null : approval.id)}
                      >
                        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="pt-2 border-t space-y-2 text-[11px]">
                      {approval.request_notes && (
                        <div>
                          <span className="text-muted-foreground">Notas del solicitante:</span>
                          <p className="mt-0.5">{approval.request_notes}</p>
                        </div>
                      )}
                      {approval.decision_notes && (
                        <div>
                          <span className="text-muted-foreground">Notas de decisión:</span>
                          <p className="mt-0.5">{approval.decision_notes}</p>
                        </div>
                      )}
                      {/* Eligibility snapshot */}
                      {approval.eligibility_snapshot && (
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Elegibilidad al solicitar:</span>
                          <div className="flex flex-wrap gap-1">
                            {(approval.eligibility_snapshot as any).checks?.map((c: any) => (
                              <span key={c.checkId} className={cn(
                                'px-1.5 py-0.5 rounded text-[9px]',
                                c.passed ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'
                              )}>
                                {c.passed ? '✓' : '✗'} {c.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Decision checklist (if approved) */}
                      {approval.decision_checklist && (approval.decision_checklist as any[]).length > 0 && (
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Checklist de aprobación:</span>
                          <div className="space-y-0.5">
                            {(approval.decision_checklist as ApprovalChecklistItem[]).map(c => (
                              <div key={c.id} className="flex items-center gap-1.5 text-[10px]">
                                {c.checked ? <CheckCircle2 className="h-2.5 w-2.5 text-green-500" /> : <XCircle className="h-2.5 w-2.5 text-muted-foreground" />}
                                <span>{c.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {approval.decided_at && (
                        <p className="text-[10px] text-muted-foreground">
                          Decidido {formatDistanceToNow(new Date(approval.decided_at), { locale: es, addSuffix: true })}
                        </p>
                      )}
                      {approval.status === 'pending_approval' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] text-destructive"
                          onClick={() => cancelApproval(approval.id)}
                        >
                          Cancelar solicitud
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {filteredApprovals.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hay solicitudes de aprobación</p>
                {eligibleSubmissions.length > 0 && (
                  <p className="text-xs mt-1">{eligibleSubmissions.length} envío(s) elegible(s) para solicitar aprobación</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
        <Lock className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
        <div>
          <p>{APPROVAL_DISCLAIMERS.global}</p>
          <p className="mt-1 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Aprobado ≠ enviado · Autorizado ≠ transmitido · El envío real permanece <strong>bloqueado</strong>.
          </p>
        </div>
      </div>

      {/* Request approval dialog */}
      <Dialog open={!!requestDialog} onOpenChange={() => { setRequestDialog(null); setRequestNotes(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Solicitar aprobación pre-real
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {requestDialog && (() => {
              const sub = submissions.find(s => s.id === requestDialog);
              if (!sub) return null;
              const domainMeta = getDomainMeta(sub.submission_domain as SubmissionDomain);
              const dryRunHistory = ((sub.metadata as any)?.dry_run_history || []) as any[];
              const eligibility = evaluateApprovalEligibility({
                submissionStatus: sub.status as any,
                validationResult: sub.validation_result as any,
                payloadSnapshot: sub.payload_snapshot as any,
                dryRunCount: dryRunHistory.length,
                hasCertificate: false,
                domain: sub.submission_domain as SubmissionDomain,
              });

              return (
                <>
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium">{sub.submission_type}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{domainMeta.label}</Badge>
                      <span className="text-xs text-muted-foreground">Score: {(sub.validation_result as any)?.score || 0}%</span>
                      <span className="text-xs text-muted-foreground">{dryRunHistory.length} dry-run(s)</span>
                    </div>
                  </div>

                  {/* Eligibility checks */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium">Elegibilidad:</p>
                    <div className="space-y-1">
                      {eligibility.checks.map(c => (
                        <div key={c.checkId} className={cn(
                          'flex items-start gap-1.5 text-xs py-1 px-2 rounded',
                          c.passed ? 'bg-green-500/5' : c.required ? 'bg-destructive/5' : 'bg-amber-500/5'
                        )}>
                          {c.passed ? <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-500 shrink-0" /> :
                           c.required ? <XCircle className="h-3 w-3 mt-0.5 text-destructive shrink-0" /> :
                           <AlertTriangle className="h-3 w-3 mt-0.5 text-amber-500 shrink-0" />}
                          <div>
                            <span className="font-medium">{c.label}</span>
                            <p className="text-[10px] text-muted-foreground">{c.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Progress value={eligibility.score} className={cn('h-1.5',
                      eligibility.eligible ? '[&>div]:bg-green-500' : '[&>div]:bg-destructive'
                    )} />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium">Notas (opcional):</p>
                    <Textarea
                      value={requestNotes}
                      onChange={e => setRequestNotes(e.target.value)}
                      placeholder="Contexto adicional para el aprobador..."
                      rows={2}
                      className="text-xs"
                    />
                  </div>

                  <div className="flex items-start gap-1.5 p-2 rounded bg-muted/50 text-[10px] text-muted-foreground">
                    <Info className="h-3 w-3 mt-0.5 shrink-0 text-blue-400" />
                    <span>{APPROVAL_DISCLAIMERS.request}</span>
                  </div>
                </>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRequestDialog(null); setRequestNotes(''); }}>
              Cancelar
            </Button>
            <Button onClick={handleRequestApproval}>
              <ShieldCheck className="h-4 w-4 mr-1.5" /> Enviar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decision dialog */}
      <Dialog open={!!decisionDialog} onOpenChange={() => { setDecisionDialog(null); setDecisionNotes(''); setChecklist([]); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {decisionDialog?.type === 'approved' && <><CheckCircle2 className="h-5 w-5 text-green-500" /> Aprobar envío</>}
              {decisionDialog?.type === 'rejected' && <><XCircle className="h-5 w-5 text-destructive" /> Rechazar envío</>}
              {decisionDialog?.type === 'correction_requested' && <><Edit className="h-5 w-5 text-blue-500" /> Solicitar correcciones</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {decisionDialog && (
              <>
                <div>
                  <p className="text-sm font-medium">{decisionDialog.approval.submission_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {getDomainMeta(decisionDialog.approval.submission_domain as SubmissionDomain).label}
                    {' · '}Score: {decisionDialog.approval.readiness_score}%
                  </p>
                </div>

                {/* Approval checklist (only for approve) */}
                {decisionDialog.type === 'approved' && checklist.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Checklist de aprobación:</p>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-1.5">
                        {checklist.map(item => (
                          <div
                            key={item.id}
                            className={cn(
                              'flex items-start gap-2 py-1.5 px-2 rounded border text-xs cursor-pointer hover:bg-muted/50',
                              item.checked ? 'bg-green-500/5 border-green-500/20' : 'border-border'
                            )}
                            onClick={() => toggleChecklistItem(item.id)}
                          >
                            <Checkbox
                              checked={item.checked}
                              onCheckedChange={() => toggleChecklistItem(item.id)}
                              className="mt-0.5"
                            />
                            <div>
                              <span className="font-medium">{item.label}</span>
                              {item.required && <span className="text-destructive ml-1">*</span>}
                              <p className="text-[10px] text-muted-foreground">{item.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    {!allRequiredChecked && (
                      <p className="text-[10px] text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Complete todos los checks obligatorios (*) para aprobar
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <p className="text-xs font-medium">
                    {decisionDialog.type === 'approved' ? 'Comentario (opcional):' :
                     decisionDialog.type === 'rejected' ? 'Motivo del rechazo:' :
                     'Correcciones necesarias:'}
                  </p>
                  <Textarea
                    value={decisionNotes}
                    onChange={e => setDecisionNotes(e.target.value)}
                    placeholder={
                      decisionDialog.type === 'approved' ? 'Notas de aprobación...' :
                      decisionDialog.type === 'rejected' ? 'Explique el motivo del rechazo...' :
                      'Detalle las correcciones necesarias...'
                    }
                    rows={3}
                    className="text-xs"
                  />
                  {decisionDialog.type !== 'approved' && !decisionNotes.trim() && (
                    <p className="text-[10px] text-destructive">Requerido para rechazo/corrección</p>
                  )}
                </div>

                <div className="flex items-start gap-1.5 p-2 rounded bg-muted/50 text-[10px] text-muted-foreground">
                  <Info className="h-3 w-3 mt-0.5 shrink-0 text-blue-400" />
                  <span>
                    {decisionDialog.type === 'approved' ? APPROVAL_DISCLAIMERS.approval :
                     decisionDialog.type === 'rejected' ? APPROVAL_DISCLAIMERS.rejection :
                     APPROVAL_DISCLAIMERS.correction}
                  </span>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDecisionDialog(null); setDecisionNotes(''); setChecklist([]); }}>
              Cancelar
            </Button>
            <Button
              variant={decisionDialog?.type === 'approved' ? 'default' : decisionDialog?.type === 'rejected' ? 'destructive' : 'outline'}
              onClick={handleDecide}
              disabled={
                (decisionDialog?.type === 'approved' && !allRequiredChecked) ||
                (decisionDialog?.type !== 'approved' && !decisionNotes.trim())
              }
            >
              {decisionDialog?.type === 'approved' ? 'Confirmar aprobación' :
               decisionDialog?.type === 'rejected' ? 'Confirmar rechazo' :
               'Solicitar correcciones'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
