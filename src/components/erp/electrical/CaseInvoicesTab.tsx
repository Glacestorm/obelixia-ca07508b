import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { FileText, Plus, Trash2, Upload, CalendarIcon, RefreshCw, ExternalLink, CheckCircle, XCircle, Sparkles, Loader2 } from 'lucide-react';
import { useEnergyInvoices, EnergyInvoice } from '@/hooks/erp/useEnergyInvoices';
import { useEnergySupply } from '@/hooks/erp/useEnergySupply';
import { PermissionGate } from './PermissionGate';
import { CaseConsumptionCharts } from './CaseConsumptionCharts';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface Props { caseId: string; }

const emptyForm = {
  billing_start: undefined as Date | undefined,
  billing_end: undefined as Date | undefined,
  consumption_total_kwh: '', consumption_p1_kwh: '', consumption_p2_kwh: '', consumption_p3_kwh: '',
  energy_cost: '', power_cost: '', meter_rental: '', electricity_tax: '', vat: '', other_costs: '', total_amount: '',
  is_validated: false,
};

export function CaseInvoicesTab({ caseId }: Props) {
  const { invoices, loading, fetchInvoices, createInvoice, updateInvoice, deleteInvoice, uploadPdf } = useEnergyInvoices(caseId);
  const { supply } = useEnergySupply(caseId);
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const parseFileRef = useRef<HTMLInputElement>(null);

  const openNew = () => { setEditId(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (inv: EnergyInvoice) => {
    setEditId(inv.id);
    setForm({
      billing_start: inv.billing_start ? new Date(inv.billing_start) : undefined,
      billing_end: inv.billing_end ? new Date(inv.billing_end) : undefined,
      consumption_total_kwh: inv.consumption_total_kwh?.toString() || '',
      consumption_p1_kwh: inv.consumption_p1_kwh?.toString() || '',
      consumption_p2_kwh: inv.consumption_p2_kwh?.toString() || '',
      consumption_p3_kwh: inv.consumption_p3_kwh?.toString() || '',
      energy_cost: inv.energy_cost?.toString() || '',
      power_cost: inv.power_cost?.toString() || '',
      meter_rental: inv.meter_rental?.toString() || '',
      electricity_tax: inv.electricity_tax?.toString() || '',
      vat: inv.vat?.toString() || '',
      other_costs: inv.other_costs?.toString() || '',
      total_amount: inv.total_amount?.toString() || '',
      is_validated: inv.is_validated ?? false,
    });
    setShowDialog(true);
  };

  const num = (v: string) => v ? parseFloat(v) : null;
  const fmtDate = (d: string | null) => { if (!d) return '—'; try { return format(new Date(d), 'dd/MM/yy', { locale: es }); } catch { return '—'; } };
  const fmtNum = (v: number | null) => v != null ? v.toLocaleString('es-ES', { maximumFractionDigits: 2 }) : '—';

  const handleSave = useCallback(async () => {
    setSaving(true);
    const days = form.billing_start && form.billing_end
      ? Math.round((form.billing_end.getTime() - form.billing_start.getTime()) / 86400000)
      : null;
    const payload: any = {
      billing_start: form.billing_start ? format(form.billing_start, 'yyyy-MM-dd') : null,
      billing_end: form.billing_end ? format(form.billing_end, 'yyyy-MM-dd') : null,
      days,
      consumption_total_kwh: num(form.consumption_total_kwh),
      consumption_p1_kwh: num(form.consumption_p1_kwh),
      consumption_p2_kwh: num(form.consumption_p2_kwh),
      consumption_p3_kwh: num(form.consumption_p3_kwh),
      energy_cost: num(form.energy_cost),
      power_cost: num(form.power_cost),
      meter_rental: num(form.meter_rental),
      electricity_tax: num(form.electricity_tax),
      vat: num(form.vat),
      other_costs: num(form.other_costs),
      total_amount: num(form.total_amount),
      is_validated: form.is_validated,
    };
    if (editId) await updateInvoice(editId, payload);
    else await createInvoice(payload);
    setSaving(false);
    setShowDialog(false);
  }, [form, editId, createInvoice, updateInvoice]);

  const handleFileUpload = useCallback(async (invoiceId: string) => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    await uploadPdf(file, invoiceId);
    if (fileRef.current) fileRef.current.value = '';
  }, [uploadPdf]);

  // PDF parse: upload → parse → pre-fill form → create invoice
  const handleParsePdf = useCallback(async () => {
    const file = parseFileRef.current?.files?.[0];
    if (!file) { toast.error('Selecciona un PDF'); return; }
    if (!file.name.endsWith('.pdf')) { toast.error('Solo se admiten archivos PDF'); return; }

    setParsing(true);
    try {
      // 1. Upload to temp path
      const tempPath = `invoices/${caseId}/temp_${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('energy-documents').upload(tempPath, file, { upsert: true });
      if (uploadError) throw new Error('Error subiendo PDF');

      const { data: urlData } = supabase.storage.from('energy-documents').getPublicUrl(tempPath);

      // 2. Call parser
      const { data, error } = await supabase.functions.invoke('energy-invoice-parser', {
        body: { documentUrl: urlData.publicUrl },
      });
      if (error) throw error;

      if (!data?.success || data?.data?.parseError) {
        throw new Error('No se pudo parsear el PDF');
      }

      const p = data.data;

      // 3. Create invoice with parsed data
      const invoicePayload: any = {
        billing_start: p.billing_start || null,
        billing_end: p.billing_end || null,
        days: p.days || null,
        consumption_total_kwh: p.consumption_total_kwh || null,
        consumption_p1_kwh: p.consumption_p1_kwh || null,
        consumption_p2_kwh: p.consumption_p2_kwh || null,
        consumption_p3_kwh: p.consumption_p3_kwh || null,
        energy_cost: p.energy_cost || null,
        power_cost: p.power_cost || null,
        meter_rental: p.meter_rental || null,
        electricity_tax: p.electricity_tax || null,
        vat: p.vat || null,
        other_costs: p.other_costs || null,
        total_amount: p.total_amount || null,
        document_url: urlData.publicUrl,
        is_validated: false,
      };

      const inv = await createInvoice(invoicePayload);
      if (inv) {
        const confidence = p.confidence || 0;
        const warnings = p.warnings?.length || 0;
        toast.success(`Factura extraída (confianza: ${confidence}%${warnings > 0 ? `, ${warnings} alertas` : ''}). Revisa los datos.`);

        // Also update supply if power data detected
        if (p.contracted_power_p1_kw || p.contracted_power_p2_kw) {
          // Open the created invoice for review
          openEdit({ ...inv, ...invoicePayload });
        }
      }
    } catch (err: any) {
      console.error('[CaseInvoicesTab] parse error:', err);
      toast.error('Error parseando factura: ' + (err.message || 'Error desconocido'));
    } finally {
      setParsing(false);
      if (parseFileRef.current) parseFileRef.current.value = '';
    }
  }, [caseId, createInvoice]);

  if (loading && invoices.length === 0) return <div className="p-8 text-center text-sm text-muted-foreground">Cargando facturas...</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-500" /> Facturas eléctricas
              </CardTitle>
              <CardDescription>{invoices.length} facturas registradas</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchInvoices()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Recargar
              </Button>
              <PermissionGate action="edit_cases">
                <Button size="sm" onClick={openNew}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Manual
                </Button>
              </PermissionGate>
            </div>
          </div>
        </CardHeader>

        {/* PDF Parser section */}
        <PermissionGate action="edit_cases">
          <div className="px-6 pb-4">
            <div className="p-3 rounded-lg border border-dashed bg-muted/30 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Importar factura desde PDF</p>
                <p className="text-xs text-muted-foreground">Sube un PDF de factura eléctrica y se extraerán los campos automáticamente</p>
              </div>
              <div className="flex items-center gap-2">
                <Input type="file" accept=".pdf" ref={parseFileRef} className="w-48 text-xs" />
                <Button size="sm" onClick={handleParsePdf} disabled={parsing}
                  className="bg-primary hover:bg-primary/90">
                  {parsing ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Extrayendo...</>
                    : <><Sparkles className="h-3.5 w-3.5 mr-1" /> Parsear PDF</>}
                </Button>
              </div>
            </div>
          </div>
        </PermissionGate>

        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[0.8fr_0.8fr_0.5fr_0.8fr_0.8fr_0.8fr_0.8fr_0.5fr_0.5fr] gap-2 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                <span>Inicio</span><span>Fin</span><span>Días</span><span>Consumo kWh</span>
                <span>Coste energía</span><span>Coste potencia</span><span>Total</span><span>Valid.</span><span></span>
              </div>
              {invoices.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No hay facturas registradas.</div>
              ) : invoices.map(inv => (
                <div key={inv.id} className="grid grid-cols-[0.8fr_0.8fr_0.5fr_0.8fr_0.8fr_0.8fr_0.8fr_0.5fr_0.5fr] gap-2 px-4 py-2 border-b last:border-0 hover:bg-muted/30 text-sm items-center cursor-pointer group"
                  onClick={() => openEdit(inv)}>
                  <span>{fmtDate(inv.billing_start)}</span>
                  <span>{fmtDate(inv.billing_end)}</span>
                  <span className="text-muted-foreground">{inv.days ?? '—'}</span>
                  <span className="font-mono">{fmtNum(inv.consumption_total_kwh)}</span>
                  <span>{fmtNum(inv.energy_cost)} €</span>
                  <span>{fmtNum(inv.power_cost)} €</span>
                  <span className="font-semibold">{fmtNum(inv.total_amount)} €</span>
                  <span>{inv.is_validated ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    {inv.document_url && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); window.open(inv.document_url!, '_blank'); }}>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                    <PermissionGate action="edit_cases">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); deleteInvoice(inv.id); }}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </PermissionGate>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Consumption charts from real invoices */}
      {invoices.length > 0 && (
        <CaseConsumptionCharts
          invoices={invoices}
          contractedPowerP1={supply?.contracted_power_p1}
          contractedPowerP2={supply?.contracted_power_p2}
          maxDemandP1={supply?.max_demand_p1}
          maxDemandP2={supply?.max_demand_p2}
        />
      )}

      {/* Invoice form dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar factura' : 'Nueva factura'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Fecha inicio</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal", !form.billing_start && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.billing_start ? format(form.billing_start, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.billing_start} onSelect={d => setForm(f => ({ ...f, billing_start: d }))}
                      className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label>Fecha fin</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal", !form.billing_end && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.billing_end ? format(form.billing_end, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.billing_end} onSelect={d => setForm(f => ({ ...f, billing_end: d }))}
                      className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Consumption */}
            <div>
              <h3 className="text-sm font-medium mb-2">Consumo (kWh)</h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="grid gap-1"><Label className="text-xs">Total</Label><Input type="number" step="0.01" value={form.consumption_total_kwh} onChange={e => setForm(f => ({ ...f, consumption_total_kwh: e.target.value }))} /></div>
                <div className="grid gap-1"><Label className="text-xs">P1</Label><Input type="number" step="0.01" value={form.consumption_p1_kwh} onChange={e => setForm(f => ({ ...f, consumption_p1_kwh: e.target.value }))} /></div>
                <div className="grid gap-1"><Label className="text-xs">P2</Label><Input type="number" step="0.01" value={form.consumption_p2_kwh} onChange={e => setForm(f => ({ ...f, consumption_p2_kwh: e.target.value }))} /></div>
                <div className="grid gap-1"><Label className="text-xs">P3</Label><Input type="number" step="0.01" value={form.consumption_p3_kwh} onChange={e => setForm(f => ({ ...f, consumption_p3_kwh: e.target.value }))} /></div>
              </div>
            </div>

            {/* Costs */}
            <div>
              <h3 className="text-sm font-medium mb-2">Costes (€)</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1"><Label className="text-xs">Energía</Label><Input type="number" step="0.01" value={form.energy_cost} onChange={e => setForm(f => ({ ...f, energy_cost: e.target.value }))} /></div>
                <div className="grid gap-1"><Label className="text-xs">Potencia</Label><Input type="number" step="0.01" value={form.power_cost} onChange={e => setForm(f => ({ ...f, power_cost: e.target.value }))} /></div>
                <div className="grid gap-1"><Label className="text-xs">Alq. contador</Label><Input type="number" step="0.01" value={form.meter_rental} onChange={e => setForm(f => ({ ...f, meter_rental: e.target.value }))} /></div>
                <div className="grid gap-1"><Label className="text-xs">Imp. electricidad</Label><Input type="number" step="0.01" value={form.electricity_tax} onChange={e => setForm(f => ({ ...f, electricity_tax: e.target.value }))} /></div>
                <div className="grid gap-1"><Label className="text-xs">IVA</Label><Input type="number" step="0.01" value={form.vat} onChange={e => setForm(f => ({ ...f, vat: e.target.value }))} /></div>
                <div className="grid gap-1"><Label className="text-xs">Otros</Label><Input type="number" step="0.01" value={form.other_costs} onChange={e => setForm(f => ({ ...f, other_costs: e.target.value }))} /></div>
              </div>
            </div>

            {/* Total + validated */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Total factura (€)</Label>
                <Input type="number" step="0.01" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))}
                  className="font-semibold" />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.is_validated} onCheckedChange={v => setForm(f => ({ ...f, is_validated: v }))} />
                <Label>Factura validada</Label>
              </div>
            </div>

            {/* PDF upload (only for existing invoices) */}
            {editId && (
              <div className="grid gap-2">
                <Label>Adjuntar PDF</Label>
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
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : editId ? 'Actualizar' : 'Registrar factura'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CaseInvoicesTab;
