/**
 * HRApprovalInbox - Bandeja de aprobaciones con SLA
 * V2-ES.8 T5 P4: + Pre-real approval summary widget
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Inbox, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw, MessageSquare, ShieldCheck, Lock } from 'lucide-react';
import { useHRWorkflowEngine, type WorkflowInstance } from '@/hooks/admin/hr/useHRWorkflowEngine';
import { usePreRealApproval } from '@/hooks/erp/hr/usePreRealApproval';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props { companyId: string; }

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  in_progress: { label: 'En curso', variant: 'secondary', icon: Clock },
  approved: { label: 'Aprobado', variant: 'default', icon: CheckCircle },
  rejected: { label: 'Rechazado', variant: 'destructive', icon: XCircle },
  pending: { label: 'Pendiente', variant: 'outline', icon: Clock },
  cancelled: { label: 'Cancelado', variant: 'outline', icon: XCircle },
  escalated: { label: 'Escalado', variant: 'destructive', icon: AlertTriangle },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Baja', color: 'text-muted-foreground' },
  normal: { label: 'Normal', color: '' },
  high: { label: 'Alta', color: 'text-amber-500' },
  urgent: { label: 'Urgente', color: 'text-destructive' },
};

export function HRApprovalInbox({ companyId }: Props) {
  const { inbox, fetchInbox, decideStep, stats, fetchStats, loading } = useHRWorkflowEngine();
  const { pendingCount: preRealPending, approvedCount: preRealApproved, rejectedCount: preRealRejected, fetchApprovals } = usePreRealApproval(companyId);
  const [statusFilter, setStatusFilter] = useState('in_progress');
  const [decisionDialog, setDecisionDialog] = useState<{ instance: WorkflowInstance; type: string } | null>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetchInbox(companyId, statusFilter);
    fetchStats(companyId);
    fetchApprovals();
  }, [companyId, statusFilter]);

  const handleDecision = async () => {
    if (!decisionDialog) return;
    const step = decisionDialog.instance.erp_hr_workflow_steps as any;
    if (step?.comments_required && !comment.trim()) {
      return;
    }
    await decideStep(decisionDialog.instance.id, decisionDialog.type, comment || undefined);
    setDecisionDialog(null);
    setComment('');
    fetchInbox(companyId, statusFilter);
    fetchStats(companyId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><Inbox className="h-5 w-5" /> Bandeja de Aprobaciones</h3>
          <p className="text-sm text-muted-foreground">Gestión centralizada de solicitudes pendientes de decisión</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchInbox(companyId, statusFilter)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </Button>
      </div>

      {/* Pre-Real Approval Summary — V2-ES.8 T5 */}
      {(preRealPending > 0 || preRealApproved > 0 || preRealRejected > 0) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Aprobaciones Pre-Real (Integraciones)</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {preRealPending > 0 && (
                  <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/30">
                    <Clock className="h-3 w-3" /> {preRealPending} pendiente(s)
                  </Badge>
                )}
                {preRealApproved > 0 && (
                  <Badge variant="outline" className="gap-1 text-green-600 border-green-500/30">
                    <CheckCircle className="h-3 w-3" /> {preRealApproved} aprobado(s)
                  </Badge>
                )}
                {preRealRejected > 0 && (
                  <Badge variant="outline" className="gap-1 text-destructive border-destructive/30">
                    <XCircle className="h-3 w-3" /> {preRealRejected}
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <Lock className="h-2.5 w-2.5" />
              Gate interno preparatorio · Gestión completa en RRHH → Integraciones → Aprobaciones
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, color: '' },
            { label: 'En curso', value: stats.in_progress, color: 'text-blue-500' },
            { label: 'Aprobados', value: stats.approved, color: 'text-green-500' },
            { label: 'Rechazados', value: stats.rejected, color: 'text-destructive' },
            { label: 'SLA incumplidos', value: stats.sla_breached, color: 'text-amber-500' },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="in_progress">En curso</SelectItem>
            <SelectItem value="approved">Aprobados</SelectItem>
            <SelectItem value="rejected">Rechazados</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{inbox.length} resultados</span>
      </div>

      {/* Inbox items */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-3">
          {inbox.map((instance) => {
            const statusCfg = STATUS_CONFIG[instance.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusCfg.icon;
            const priorityCfg = PRIORITY_CONFIG[instance.priority] || PRIORITY_CONFIG.normal;
            const currentStep = instance.erp_hr_workflow_steps as any;
            const processName = (instance.erp_hr_workflow_definitions as any)?.name || '';
            const decisions = instance.erp_hr_workflow_decisions || [];
            const slaTracking = instance.erp_hr_workflow_sla_tracking || [];
            const activeSla = slaTracking.find(s => !s.completed_at);
            const isOverdue = activeSla ? new Date(activeSla.due_at) < new Date() : false;

            return (
              <Card key={instance.id} className={isOverdue ? 'border-destructive/50' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <StatusIcon className={`h-5 w-5 mt-0.5 ${instance.status === 'approved' ? 'text-green-500' : instance.status === 'rejected' ? 'text-destructive' : 'text-muted-foreground'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{instance.entity_summary || processName}</span>
                          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                          <Badge variant="outline" className="text-xs">{processName}</Badge>
                          {priorityCfg.label !== 'Normal' && (
                            <Badge variant="outline" className={priorityCfg.color}>{priorityCfg.label}</Badge>
                          )}
                          {isOverdue && <Badge variant="destructive">⚠️ SLA vencido</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {currentStep && <span>📍 Paso {instance.current_step_order}: {currentStep.name}</span>}
                          {currentStep?.approver_role && <span>👤 {currentStep.approver_role}</span>}
                          <span>📅 {formatDistanceToNow(new Date(instance.started_at), { locale: es, addSuffix: true })}</span>
                          {activeSla && <span>⏱️ SLA: {new Date(activeSla.due_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                        </div>
                        {/* Decision history */}
                        {decisions.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {decisions.slice(-3).map((dec) => (
                              <div key={dec.id} className="flex items-center gap-2 text-xs">
                                <Badge variant={dec.decision === 'approved' ? 'default' : 'destructive'} className="text-xs">
                                  {dec.decision}
                                </Badge>
                                {dec.comment && <span className="text-muted-foreground italic">"{dec.comment}"</span>}
                                <span className="text-muted-foreground">{formatDistanceToNow(new Date(dec.decided_at), { locale: es, addSuffix: true })}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {instance.status === 'in_progress' && (
                      <div className="flex gap-2 ml-3">
                        <Button size="sm" variant="default" onClick={() => setDecisionDialog({ instance, type: 'approved' })}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Aprobar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDecisionDialog({ instance, type: 'rejected' })}>
                          <XCircle className="h-4 w-4 mr-1" /> Rechazar
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {inbox.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Inbox className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No hay solicitudes {statusFilter !== 'all' ? `con estado "${STATUS_CONFIG[statusFilter]?.label || statusFilter}"` : ''}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Decision Dialog */}
      <Dialog open={!!decisionDialog} onOpenChange={() => { setDecisionDialog(null); setComment(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decisionDialog?.type === 'approved' ? '✅ Aprobar solicitud' : '❌ Rechazar solicitud'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">{decisionDialog?.instance.entity_summary}</p>
              <p className="text-xs text-muted-foreground">{(decisionDialog?.instance.erp_hr_workflow_definitions as any)?.name}</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Comentario
                {(decisionDialog?.instance.erp_hr_workflow_steps as any)?.comments_required && (
                  <Badge variant="destructive" className="text-xs">Obligatorio</Badge>
                )}
              </Label>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Escribe un comentario..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDecisionDialog(null); setComment(''); }}>Cancelar</Button>
            <Button
              variant={decisionDialog?.type === 'approved' ? 'default' : 'destructive'}
              onClick={handleDecision}
              disabled={(decisionDialog?.instance.erp_hr_workflow_steps as any)?.comments_required && !comment.trim()}
            >
              {decisionDialog?.type === 'approved' ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
