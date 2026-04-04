import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, FileText } from 'lucide-react';
import { usePayslipTexts, useCreatePayslipText, useDeletePayslipText } from '@/hooks/hr/usePayslipTexts';

interface PayslipTextManagerProps {
  employeeId?: string;
  companyId?: string;
}

const TYPE_LABELS: Record<string, string> = {
  legal_notice: 'Aviso legal', company_communication: 'Comunicación empresa',
  seasonal: 'Temporal', erte_info: 'Info ERTE', other: 'Otro',
};
const TYPE_COLORS: Record<string, string> = {
  legal_notice: 'bg-red-500/10 text-red-700', company_communication: 'bg-blue-500/10 text-blue-700',
  seasonal: 'bg-amber-500/10 text-amber-700', erte_info: 'bg-purple-500/10 text-purple-700', other: 'bg-muted text-muted-foreground',
};

export function PayslipTextManager({ employeeId, companyId }: PayslipTextManagerProps) {
  const { data: texts = [], isLoading } = usePayslipTexts(employeeId);
  const createMutation = useCreatePayslipText();
  const deleteMutation = useDeletePayslipText();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ text_type: 'company_communication', title: '', body: '', valid_from: new Date().toISOString().split('T')[0], valid_until: '', applies_to_all: false });

  const handleCreate = async () => {
    if (!form.body) return;
    await createMutation.mutateAsync({
      company_id: companyId, employee_id: form.applies_to_all ? null : employeeId,
      text_type: form.text_type, title: form.title || null, body: form.body,
      valid_from: form.valid_from, valid_until: form.valid_until || null, applies_to_all: form.applies_to_all,
    });
    setOpen(false);
    setForm({ text_type: 'company_communication', title: '', body: '', valid_from: new Date().toISOString().split('T')[0], valid_until: '', applies_to_all: false });
  };

  const today = new Date().toISOString().split('T')[0];
  const activeTexts = texts.filter((t: any) => !t.valid_until || t.valid_until >= today);
  const expiredTexts = texts.filter((t: any) => t.valid_until && t.valid_until < today);

  const renderTextCard = (t: any) => (
    <div key={t.id} className="flex items-start justify-between p-3 rounded-lg border bg-card">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className={TYPE_COLORS[t.text_type] ?? ''}>{TYPE_LABELS[t.text_type] ?? t.text_type}</Badge>
          {t.applies_to_all && <Badge variant="secondary" className="text-[10px]">Global</Badge>}
          {t.valid_until && t.valid_until < today && <Badge variant="destructive" className="text-[10px]">Expirado</Badge>}
        </div>
        {t.title && <p className="text-sm font-medium">{t.title}</p>}
        <p className="text-xs text-muted-foreground line-clamp-2">{t.body}</p>
        <p className="text-[10px] text-muted-foreground mt-1">{t.valid_from}{t.valid_until ? ` → ${t.valid_until}` : ''}</p>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => deleteMutation.mutate(t.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Textos en Recibo</CardTitle>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nuevo texto</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo texto en recibo</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Tipo</Label>
                <Select value={form.text_type} onValueChange={v => setForm(f => ({ ...f, text_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="legal_notice">Aviso legal</SelectItem>
                    <SelectItem value="company_communication">Comunicación empresa</SelectItem>
                    <SelectItem value="seasonal">Temporal</SelectItem>
                    <SelectItem value="erte_info">Info ERTE</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.applies_to_all} onCheckedChange={v => setForm(f => ({ ...f, applies_to_all: v }))} />
                <Label>Aplicar a TODOS los empleados</Label>
              </div>
              <div><Label>Título (opcional)</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div><Label>Texto ({form.body.length}/500)</Label>
                <Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value.slice(0, 500) }))} rows={4} maxLength={500} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Desde</Label><Input type="date" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} /></div>
                <div><Label>Hasta (opcional)</Label><Input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} /></div>
              </div>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">{createMutation.isPending ? 'Guardando...' : 'Guardar texto'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="employee">
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="employee">Textos del empleado</TabsTrigger>
            <TabsTrigger value="global">Textos globales empresa</TabsTrigger>
          </TabsList>
          <TabsContent value="employee" className="space-y-2">
            {isLoading ? <p className="text-sm text-muted-foreground">Cargando...</p> :
              texts.filter((t: any) => !t.applies_to_all).length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Sin textos específicos</p> :
              texts.filter((t: any) => !t.applies_to_all).map(renderTextCard)}
          </TabsContent>
          <TabsContent value="global" className="space-y-2">
            {texts.filter((t: any) => t.applies_to_all).length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Sin textos globales</p> :
              texts.filter((t: any) => t.applies_to_all).map(renderTextCard)}
          </TabsContent>
        </Tabs>
        <div className="flex justify-between text-xs text-muted-foreground mt-3">
          <span>Textos activos: {activeTexts.length} · Expirados: {expiredTexts.length}</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Conforme a OM 27/12/1994, el recibo de salarios puede incluir comunicaciones y avisos laborales adicionales.</p>
      </CardContent>
    </Card>
  );
}
