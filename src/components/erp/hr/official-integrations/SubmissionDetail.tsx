/**
 * SubmissionDetail — Vista completa de un envío con timeline, acuses, historial
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Send, CheckCircle, XCircle, RotateCcw, FileText, Clock, AlertTriangle, Plus } from 'lucide-react';
import { HRStatusBadge } from '../shared/HRStatusBadge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { OfficialSubmission, SubmissionReceipt } from '@/hooks/erp/hr/useOfficialIntegrationsHub';

interface Props {
  submissionId: string;
  hub: {
    getSubmission: (id: string) => Promise<OfficialSubmission | null>;
    markAsSent: (id: string) => Promise<boolean>;
    markAsAccepted: (id: string) => Promise<boolean>;
    markAsRejected: (id: string, err?: string) => Promise<boolean>;
    retrySubmission: (id: string) => Promise<boolean>;
    cancelSubmission: (id: string) => Promise<boolean>;
    addReceipt: (id: string, data: Partial<SubmissionReceipt>) => Promise<any>;
  };
  onBack: () => void;
}

const STATUS_TIMELINE = ['draft', 'validating', 'ready', 'sent', 'acknowledged', 'accepted'];

export function SubmissionDetail({ submissionId, hub, onBack }: Props) {
  const [submission, setSubmission] = useState<OfficialSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [receiptRef, setReceiptRef] = useState('');
  const [receiptType, setReceiptType] = useState('acknowledgement');

  useEffect(() => {
    loadDetail();
  }, [submissionId]);

  const loadDetail = async () => {
    setLoading(true);
    const data = await hub.getSubmission(submissionId);
    setSubmission(data);
    setLoading(false);
  };

  const handleAction = async (action: string) => {
    let ok = false;
    if (action === 'send') ok = await hub.markAsSent(submissionId);
    if (action === 'accept') ok = await hub.markAsAccepted(submissionId);
    if (action === 'reject') ok = await hub.markAsRejected(submissionId);
    if (action === 'retry') ok = await hub.retrySubmission(submissionId);
    if (action === 'cancel') ok = await hub.cancelSubmission(submissionId);
    if (ok) loadDetail();
  };

  const handleAddReceipt = async () => {
    if (!receiptRef) return;
    await hub.addReceipt(submissionId, {
      receipt_reference: receiptRef,
      receipt_type: receiptType as any,
      validation_status: receiptType === 'acceptance' ? 'valid' : receiptType === 'rejection' ? 'invalid' : 'pending',
    });
    setShowReceiptForm(false);
    setReceiptRef('');
    loadDetail();
  };

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Cargando envío...</div>;
  }
  if (!submission) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Envío no encontrado</div>;
  }

  const currentIdx = STATUS_TIMELINE.indexOf(submission.status);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Button>
          <div>
            <h3 className="text-lg font-semibold">{submission.submission_type}{submission.submission_subtype ? ` — ${submission.submission_subtype}` : ''}</h3>
            <p className="text-xs text-muted-foreground">
              {submission.external_reference || submission.id.slice(0, 12)} · {submission.country_code} · Creado {new Date(submission.created_at).toLocaleDateString('es-ES')}
            </p>
          </div>
        </div>
        <HRStatusBadge entity="submission" status={submission.status} />
      </div>

      {/* Status Timeline */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-1">
            {STATUS_TIMELINE.map((st, i) => {
              const isActive = i <= currentIdx || submission.status === st;
              const isCurrent = submission.status === st;
              return (
                <div key={st} className="flex items-center gap-1 flex-1">
                  <div className={`h-2 flex-1 rounded-full ${isActive ? 'bg-primary' : 'bg-muted'} ${isCurrent ? 'ring-2 ring-primary/30' : ''}`} />
                  {i < STATUS_TIMELINE.length - 1 && <div className="w-1" />}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            {STATUS_TIMELINE.map(st => (
              <span key={st} className="text-[10px] text-muted-foreground">{st}</span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Details */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Detalles del envío</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Conector:</span> {submission.adapter_id?.slice(0, 8) || '—'}</div>
              <div><span className="text-muted-foreground">Período:</span> {submission.reference_period || '—'}</div>
              <div><span className="text-muted-foreground">Prioridad:</span> <Badge variant={submission.priority === 'urgent' ? 'destructive' : 'outline'} className="text-[10px]">{submission.priority}</Badge></div>
              <div><span className="text-muted-foreground">Intentos:</span> {submission.attempts}/{submission.max_retries}</div>
              <div><span className="text-muted-foreground">Enviado:</span> {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString('es-ES') : '—'}</div>
              <div><span className="text-muted-foreground">Plazo respuesta:</span> {submission.response_deadline ? new Date(submission.response_deadline).toLocaleDateString('es-ES') : '—'}</div>
            </div>
            {submission.last_error && (
              <div className="p-2 rounded bg-destructive/10 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                {submission.last_error}
              </div>
            )}
            {submission.notes && (
              <>
                <Separator />
                <p className="text-muted-foreground">{submission.notes}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Acciones</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {['draft', 'ready', 'corrected'].includes(submission.status) && (
              <Button size="sm" className="w-full gap-1.5" onClick={() => handleAction('send')}>
                <Send className="h-3.5 w-3.5" /> Marcar como enviado
              </Button>
            )}
            {['sent', 'acknowledged'].includes(submission.status) && (
              <>
                <Button size="sm" variant="outline" className="w-full gap-1.5 text-green-600" onClick={() => handleAction('accept')}>
                  <CheckCircle className="h-3.5 w-3.5" /> Aceptado
                </Button>
                <Button size="sm" variant="outline" className="w-full gap-1.5 text-destructive" onClick={() => handleAction('reject')}>
                  <XCircle className="h-3.5 w-3.5" /> Rechazado
                </Button>
              </>
            )}
            {['rejected', 'correction_required'].includes(submission.status) && (
              <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => handleAction('retry')}>
                <RotateCcw className="h-3.5 w-3.5" /> Reintentar envío
              </Button>
            )}
            {!['accepted', 'cancelled'].includes(submission.status) && (
              <Button size="sm" variant="ghost" className="w-full gap-1.5 text-destructive" onClick={() => handleAction('cancel')}>
                <XCircle className="h-3.5 w-3.5" /> Cancelar
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Receipts */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Acuses y justificantes</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowReceiptForm(!showReceiptForm)} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Importar acuse
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showReceiptForm && (
            <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Referencia</Label>
                  <Input className="h-8 text-xs" value={receiptRef} onChange={e => setReceiptRef(e.target.value)} placeholder="Ref. acuse" />
                </div>
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={receiptType} onValueChange={setReceiptType}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="acknowledgement">Acuse de recibo</SelectItem>
                      <SelectItem value="acceptance">Aceptación</SelectItem>
                      <SelectItem value="rejection">Rechazo</SelectItem>
                      <SelectItem value="partial">Parcial</SelectItem>
                      <SelectItem value="correction_required">Corrección requerida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setShowReceiptForm(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleAddReceipt} disabled={!receiptRef}>Registrar</Button>
              </div>
            </div>
          )}

          {(!submission.receipts || submission.receipts.length === 0) ? (
            <p className="text-xs text-muted-foreground text-center py-4">Sin acuses registrados</p>
          ) : submission.receipts.map(r => (
            <div key={r.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-xs">
              <div className="flex items-center gap-2">
                {r.receipt_type === 'acceptance' ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> :
                 r.receipt_type === 'rejection' ? <XCircle className="h-3.5 w-3.5 text-destructive" /> :
                 <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                <div>
                  <span className="font-medium">{r.receipt_reference || 'Sin referencia'}</span>
                  <span className="text-muted-foreground ml-2">{r.receipt_type}</span>
                </div>
              </div>
              <span className="text-muted-foreground">{r.receipt_date ? new Date(r.receipt_date).toLocaleDateString('es-ES') : '—'}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
