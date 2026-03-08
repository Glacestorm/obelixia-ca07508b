import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileSignature, Plus, Trash2, Upload, CalendarIcon, RefreshCw, ExternalLink, AlertTriangle } from 'lucide-react';
import { useEnergyContracts, EnergyContract } from '@/hooks/erp/useEnergyContracts';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props { caseId: string; }

const emptyForm = {
  supplier: '', tariff_name: '',
  start_date: undefined as Date | undefined,
  end_date: undefined as Date | undefined,
  has_renewal: false, has_permanence: false,
  early_exit_penalty_text: '', notes: '',
};

export function CaseContractsTab({ caseId }: Props) {
  const { contracts, loading, fetchContracts, createContract, updateContract, deleteContract, uploadPdf } = useEnergyContracts(caseId);
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const openNew = () => { setEditId(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (c: EnergyContract) => {
    setEditId(c.id);
    setForm({
      supplier: c.supplier || '', tariff_name: c.tariff_name || '',
      start_date: c.start_date ? new Date(c.start_date) : undefined,
      end_date: c.end_date ? new Date(c.end_date) : undefined,
      has_renewal: c.has_renewal ?? false,
      has_permanence: c.has_permanence ?? false,
      early_exit_penalty_text: c.early_exit_penalty_text || '',
      notes: c.notes || '',
    });
    setShowDialog(true);
  };

  const fmtDate = (d: string | null) => { if (!d) return '—'; try { return format(new Date(d), 'dd/MM/yyyy', { locale: es }); } catch { return '—'; } };

  const handleSave = useCallback(async () => {
    setSaving(true);
    const payload: any = {
      supplier: form.supplier || null, tariff_name: form.tariff_name || null,
      start_date: form.start_date ? format(form.start_date, 'yyyy-MM-dd') : null,
      end_date: form.end_date ? format(form.end_date, 'yyyy-MM-dd') : null,
      has_renewal: form.has_renewal, has_permanence: form.has_permanence,
      early_exit_penalty_text: form.early_exit_penalty_text || null,
      notes: form.notes || null,
    };
    if (editId) await updateContract(editId, payload);
    else await createContract(payload);
    setSaving(false);
    setShowDialog(false);
  }, [form, editId, createContract, updateContract]);

  const handleFileUpload = useCallback(async (contractId: string) => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    await uploadPdf(file, contractId);
    if (fileRef.current) fileRef.current.value = '';
  }, [uploadPdf]);

  if (loading && contracts.length === 0) return <div className="p-8 text-center text-sm text-muted-foreground">Cargando contratos...</div>;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-indigo-500" /> Contratos eléctricos
              </CardTitle>
              <CardDescription>{contracts.length} contratos registrados</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchContracts()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Recargar
              </Button>
              <Button size="sm" onClick={openNew}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Nuevo contrato
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.6fr_0.6fr_0.5fr] gap-2 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                <span>Comercializadora</span><span>Tarifa</span><span>Inicio</span><span>Fin</span>
                <span>Renovación</span><span>Permanencia</span><span></span>
              </div>
              {contracts.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No hay contratos registrados.</div>
              ) : contracts.map(c => (
                <div key={c.id} className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.6fr_0.6fr_0.5fr] gap-2 px-4 py-2.5 border-b last:border-0 hover:bg-muted/30 text-sm items-center cursor-pointer group"
                  onClick={() => openEdit(c)}>
                  <span className="font-medium truncate">{c.supplier || '—'}</span>
                  <span className="truncate">{c.tariff_name || '—'}</span>
                  <span className="text-muted-foreground">{fmtDate(c.start_date)}</span>
                  <span className="text-muted-foreground">{fmtDate(c.end_date)}</span>
                  <span>{c.has_renewal ? <Badge variant="outline" className="text-[10px]">Sí</Badge> : '—'}</span>
                  <span>{c.has_permanence ? <Badge variant="destructive" className="text-[10px] gap-1"><AlertTriangle className="h-2.5 w-2.5" />Sí</Badge> : '—'}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    {c.signed_document_url && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); window.open(c.signed_document_url!, '_blank'); }}>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); deleteContract(c.id); }}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editId ? 'Editar contrato' : 'Nuevo contrato'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Comercializadora</Label><Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Ej: Iberdrola" /></div>
              <div className="grid gap-2"><Label>Tarifa</Label><Input value={form.tariff_name} onChange={e => setForm(f => ({ ...f, tariff_name: e.target.value }))} placeholder="Ej: Plan Estable 2.0TD" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Fecha inicio</Label>
                <Popover><PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !form.start_date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{form.start_date ? format(form.start_date, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar'}
                  </Button>
                </PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={form.start_date} onSelect={d => setForm(f => ({ ...f, start_date: d }))} className="p-3 pointer-events-auto" /></PopoverContent></Popover>
              </div>
              <div className="grid gap-2">
                <Label>Fecha fin</Label>
                <Popover><PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !form.end_date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{form.end_date ? format(form.end_date, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar'}
                  </Button>
                </PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={form.end_date} onSelect={d => setForm(f => ({ ...f, end_date: d }))} className="p-3 pointer-events-auto" /></PopoverContent></Popover>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2"><Switch checked={form.has_renewal} onCheckedChange={v => setForm(f => ({ ...f, has_renewal: v }))} /><Label>Renovación tácita</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.has_permanence} onCheckedChange={v => setForm(f => ({ ...f, has_permanence: v }))} /><Label>Tiene permanencia</Label></div>
            </div>
            {form.has_permanence && (
              <div className="grid gap-2">
                <Label>Penalización por salida anticipada</Label>
                <Textarea value={form.early_exit_penalty_text} onChange={e => setForm(f => ({ ...f, early_exit_penalty_text: e.target.value }))}
                  placeholder="Ej: 50€ por cada mes restante de permanencia" rows={2} />
              </div>
            )}
            <div className="grid gap-2">
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Observaciones del contrato..." rows={2} />
            </div>
            {editId && (
              <div className="grid gap-2">
                <Label>Adjuntar PDF del contrato</Label>
                <div className="flex gap-2">
                  <Input type="file" accept=".pdf" ref={fileRef} className="flex-1" />
                  <Button variant="outline" size="sm" onClick={() => handleFileUpload(editId)}>
                    <Upload className="h-3.5 w-3.5 mr-1" /> Subir
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : editId ? 'Actualizar' : 'Registrar contrato'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CaseContractsTab;
