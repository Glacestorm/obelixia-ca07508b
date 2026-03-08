import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Plus, FileText, CheckCircle2, XCircle, Send, Loader2, AlertTriangle, Download, Upload, PenTool
} from 'lucide-react';
import { useEnergyProposals, PROPOSAL_STATUSES, EnergyProposal } from '@/hooks/erp/useEnergyProposals';
import { useEnergyProposalPDF } from '@/hooks/erp/useEnergyProposalPDF';
import { useEnergyCase } from '@/hooks/erp/useEnergyCases';
import { useEnergyAuditLog } from '@/hooks/erp/useEnergyAuditLog';
import { PermissionGate } from './PermissionGate';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props { caseId: string; companyId: string; }

export function CaseProposalTab({ caseId, companyId }: Props) {
  const { proposals, loading, error, createProposal, acceptProposal, rejectProposal, issueProposal } = useEnergyProposals(caseId);
  const { downloadPDF, uploadPDF } = useEnergyProposalPDF();
  const { energyCase } = useEnergyCase(caseId);
  const { log } = useEnergyAuditLog(companyId, caseId);

  const [showForm, setShowForm] = useState(false);
  const [showReject, setShowReject] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [form, setForm] = useState({
    cups: '', current_supplier: '', current_tariff: '',
    current_annual_cost: '', recommended_supplier: '', recommended_tariff: '',
    estimated_annual_cost: '', estimated_annual_savings: '',
    conditions: '', observations: '',
  });

  useEffect(() => {
    if (energyCase && showForm) {
      setForm(f => ({
        ...f,
        cups: energyCase.cups || '',
        current_supplier: energyCase.current_supplier || '',
        current_tariff: energyCase.current_tariff || '',
      }));
    }
  }, [energyCase, showForm]);

  const handleCreate = useCallback(async () => {
    setActionLoading('create');
    await createProposal({
      cups: form.cups || null,
      current_supplier: form.current_supplier || null,
      current_tariff: form.current_tariff || null,
      current_annual_cost: parseFloat(form.current_annual_cost) || null,
      recommended_supplier: form.recommended_supplier || null,
      recommended_tariff: form.recommended_tariff || null,
      estimated_annual_cost: parseFloat(form.estimated_annual_cost) || null,
      estimated_annual_savings: parseFloat(form.estimated_annual_savings) || null,
      conditions: form.conditions || null,
      observations: form.observations || null,
    } as any, log);
    setActionLoading(null);
    setShowForm(false);
    setForm({ cups: '', current_supplier: '', current_tariff: '', current_annual_cost: '', recommended_supplier: '', recommended_tariff: '', estimated_annual_cost: '', estimated_annual_savings: '', conditions: '', observations: '' });
  }, [form, createProposal, log]);

  const handleReject = useCallback(async () => {
    if (showReject) {
      setActionLoading('reject');
      await rejectProposal(showReject, rejectReason, log);
      setActionLoading(null);
      setShowReject(null);
      setRejectReason('');
    }
  }, [showReject, rejectReason, rejectProposal, log]);

  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd/MM/yyyy', { locale: es }); } catch { return '—'; }
  };

  const fmtCurrency = (v: number | null) => {
    if (v == null) return '—';
    return `${v.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`;
  };

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-6 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> Propuestas comerciales
        </h3>
        <PermissionGate action="edit_cases">
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Nueva propuesta
          </Button>
        </PermissionGate>
      </div>

      {loading ? (
        <Card><CardContent className="py-8 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" /></CardContent></Card>
      ) : proposals.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No hay propuestas. Crea una para formalizar la recomendación.</p>
          </CardContent>
        </Card>
      ) : (
        proposals.map(p => {
          const statusInfo = PROPOSAL_STATUSES[p.status] || PROPOSAL_STATUSES.draft;
          const isExpired = p.status === 'expired';
          return (
            <Card key={p.id} className={cn(isExpired && "opacity-70")}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    Propuesta v{p.version}
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">{fmtDate(p.created_at)}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div><span className="text-muted-foreground text-xs">CUPS:</span><p className="font-mono text-xs">{p.cups || '—'}</p></div>
                  <div><span className="text-muted-foreground text-xs">Comercializadora actual:</span><p>{p.current_supplier || '—'}</p></div>
                  <div><span className="text-muted-foreground text-xs">Tarifa actual:</span><p>{p.current_tariff || '—'}</p></div>
                  <div><span className="text-muted-foreground text-xs">Coste anual actual:</span><p>{fmtCurrency(p.current_annual_cost)}</p></div>
                  <div><span className="text-muted-foreground text-xs">Comercializadora recomendada:</span><p className="font-medium">{p.recommended_supplier || '—'}</p></div>
                  <div><span className="text-muted-foreground text-xs">Tarifa recomendada:</span><p className="font-medium">{p.recommended_tariff || '—'}</p></div>
                  <div><span className="text-muted-foreground text-xs">Coste estimado:</span><p>{fmtCurrency(p.estimated_annual_cost)}</p></div>
                  <div><span className="text-muted-foreground text-xs">Ahorro estimado:</span><p className="font-semibold text-emerald-600">{fmtCurrency(p.estimated_annual_savings)}</p></div>
                  {p.valid_until && <div><span className="text-muted-foreground text-xs">Válida hasta:</span><p className={cn(isExpired && "text-destructive")}>{fmtDate(p.valid_until)}</p></div>}
                </div>

                {p.conditions && <div><span className="text-xs text-muted-foreground">Condiciones:</span><p className="text-sm">{p.conditions}</p></div>}
                {p.observations && <div><span className="text-xs text-muted-foreground">Observaciones:</span><p className="text-sm">{p.observations}</p></div>}

                {p.status === 'accepted' && p.accepted_at && (
                  <div className="flex items-center gap-2 p-2 bg-emerald-500/10 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-emerald-700">Aceptada el {fmtDate(p.accepted_at)}</span>
                  </div>
                )}
                {p.status === 'rejected' && (
                  <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <div>
                      <span className="text-sm text-destructive">Rechazada el {fmtDate(p.rejected_at)}</span>
                      {p.rejection_reason && <p className="text-xs text-muted-foreground mt-0.5">Motivo: {p.rejection_reason}</p>}
                    </div>
                  </div>
                )}
                {isExpired && (
                  <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm text-amber-700">Propuesta caducada. Crea una nueva versión si deseas reactivar.</span>
                  </div>
                )}

                <PermissionGate action="approve_recommendation">
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    {p.status === 'draft' && (
                      <Button size="sm" variant="outline" disabled={actionLoading === 'issue'} onClick={async () => {
                        setActionLoading('issue');
                        await issueProposal(p.id, 30, log);
                        setActionLoading(null);
                      }}>
                        <Send className="h-3.5 w-3.5 mr-1" /> Emitir
                      </Button>
                    )}
                    {['issued', 'sent'].includes(p.status) && (
                      <>
                        <Button size="sm" disabled={!!actionLoading} onClick={async () => {
                          setActionLoading('accept');
                          await acceptProposal(p.id, undefined, log);
                          setActionLoading(null);
                        }}>
                          {actionLoading === 'accept' ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />} Aceptar
                        </Button>
                        <Button size="sm" variant="destructive" disabled={!!actionLoading} onClick={() => setShowReject(p.id)}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Rechazar
                        </Button>
                      </>
                    )}
                  </div>
                </PermissionGate>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Create form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nueva propuesta comercial</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label className="text-xs">CUPS</Label><Input value={form.cups} onChange={e => setForm(f => ({ ...f, cups: e.target.value }))} placeholder="ES00..." /></div>
              <div className="grid gap-2"><Label className="text-xs">Comercializadora actual</Label><Input value={form.current_supplier} onChange={e => setForm(f => ({ ...f, current_supplier: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label className="text-xs">Tarifa actual</Label><Input value={form.current_tariff} onChange={e => setForm(f => ({ ...f, current_tariff: e.target.value }))} /></div>
              <div className="grid gap-2"><Label className="text-xs">Coste anual actual (€)</Label><Input type="number" step="0.01" value={form.current_annual_cost} onChange={e => setForm(f => ({ ...f, current_annual_cost: e.target.value }))} /></div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label className="text-xs">Comercializadora recomendada</Label><Input value={form.recommended_supplier} onChange={e => setForm(f => ({ ...f, recommended_supplier: e.target.value }))} /></div>
              <div className="grid gap-2"><Label className="text-xs">Tarifa recomendada</Label><Input value={form.recommended_tariff} onChange={e => setForm(f => ({ ...f, recommended_tariff: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label className="text-xs">Coste estimado anual (€)</Label><Input type="number" step="0.01" value={form.estimated_annual_cost} onChange={e => setForm(f => ({ ...f, estimated_annual_cost: e.target.value }))} /></div>
              <div className="grid gap-2"><Label className="text-xs">Ahorro estimado anual (€)</Label><Input type="number" step="0.01" value={form.estimated_annual_savings} onChange={e => setForm(f => ({ ...f, estimated_annual_savings: e.target.value }))} /></div>
            </div>
            <div className="grid gap-2"><Label className="text-xs">Condiciones</Label><Textarea value={form.conditions} onChange={e => setForm(f => ({ ...f, conditions: e.target.value }))} placeholder="Permanencia, penalización..." rows={2} /></div>
            <div className="grid gap-2"><Label className="text-xs">Observaciones</Label><Textarea value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!form.recommended_supplier || actionLoading === 'create'}>
              {actionLoading === 'create' ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creando...</> : 'Crear propuesta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!showReject} onOpenChange={() => setShowReject(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Rechazar propuesta</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <Label>Motivo del rechazo</Label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explica el motivo..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim() || actionLoading === 'reject'}>
              {actionLoading === 'reject' ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Rechazando...</> : 'Confirmar rechazo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CaseProposalTab;
