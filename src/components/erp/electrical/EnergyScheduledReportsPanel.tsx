/**
 * EnergyScheduledReportsPanel - Schedule PDF/CSV reports (prepared for cron)
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileBarChart, Calendar, Save, Loader2, Plus, Trash2, Clock, AlertTriangle, Mail
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId: string;
}

interface ReportSchedule {
  id: string;
  report_type: string;
  format: string;
  schedule: string;
  recipients: string[];
  is_active: boolean;
  last_generated_at: string | null;
  next_scheduled_at: string | null;
  created_at: string;
}

const REPORT_TYPES = [
  { value: 'executive_summary', label: 'Resumen ejecutivo' },
  { value: 'savings_report', label: 'Informe de ahorros' },
  { value: 'contract_status', label: 'Estado de contratos' },
  { value: 'consumption_analysis', label: 'Análisis de consumo' },
  { value: 'multi_energy_overview', label: 'Vista multi-energía 360' },
];

const FORMATS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel' },
];

const SCHEDULES = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
];

export function EnergyScheduledReportsPanel({ companyId }: Props) {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({
    report_type: 'executive_summary',
    format: 'pdf',
    schedule: 'monthly',
    recipients: '',
  });

  const fetchSchedules = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('energy_report_schedules')
        .select('*')
        .eq('company_id', companyId)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSchedules((data || []) as ReportSchedule[]);
    } catch (err) {
      console.error('[EnergyScheduledReports] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, user?.id]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const handleCreate = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const recipients = newForm.recipients.split(',').map(r => r.trim()).filter(Boolean);
      const { error } = await supabase.from('energy_report_schedules').insert([{
        company_id: companyId,
        created_by: user.id,
        report_type: newForm.report_type,
        format: newForm.format,
        schedule: newForm.schedule,
        recipients,
        is_active: true,
      }] as any);
      if (error) throw error;
      toast.success('Reporte programado creado');
      setShowNew(false);
      setNewForm({ report_type: 'executive_summary', format: 'pdf', schedule: 'monthly', recipients: '' });
      fetchSchedules();
    } catch (err) {
      toast.error('Error al crear el reporte programado');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await supabase.from('energy_report_schedules').update({ is_active: active } as any).eq('id', id);
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, is_active: active } : s));
      toast.success(active ? 'Reporte activado' : 'Reporte pausado');
    } catch {
      toast.error('Error al actualizar');
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      await supabase.from('energy_report_schedules').delete().eq('id', id);
      setSchedules(prev => prev.filter(s => s.id !== id));
      toast.success('Reporte eliminado');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: es }); } catch { return '—'; }
  };

  const typeLabel = (v: string) => REPORT_TYPES.find(t => t.value === v)?.label || v;
  const scheduleLabel = (v: string) => SCHEDULES.find(s => s.value === v)?.label || v;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileBarChart className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Reportes Programados</h2>
          <Badge variant="secondary">{schedules.filter(s => s.is_active).length} activo{schedules.filter(s => s.is_active).length !== 1 ? 's' : ''}</Badge>
        </div>
        <Button size="sm" onClick={() => setShowNew(!showNew)}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo reporte
        </Button>
      </div>

      {/* New schedule form */}
      {showNew && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Configurar nuevo reporte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Tipo de reporte</Label>
                <Select value={newForm.report_type} onValueChange={v => setNewForm(f => ({ ...f, report_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Formato</Label>
                <Select value={newForm.format} onValueChange={v => setNewForm(f => ({ ...f, format: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FORMATS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Frecuencia</Label>
                <Select value={newForm.schedule} onValueChange={v => setNewForm(f => ({ ...f, schedule: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SCHEDULES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Destinatarios (emails separados por coma)</Label>
              <Input value={newForm.recipients} onChange={e => setNewForm(f => ({ ...f, recipients: e.target.value }))} placeholder="admin@empresa.com, gerente@empresa.com" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowNew(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Crear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing schedules */}
      {loading ? (
        <div className="py-8 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" /></div>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No hay reportes programados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {schedules.map(s => (
            <Card key={s.id} className={!s.is_active ? 'opacity-60' : ''}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{typeLabel(s.report_type)}</p>
                      <Badge variant="outline" className="text-[10px] uppercase">{s.format}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{scheduleLabel(s.schedule)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s.recipients.length > 0 ? s.recipients.join(', ') : 'Sin destinatarios'}
                      {s.last_generated_at && ` · Último: ${fmtDate(s.last_generated_at)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={s.is_active} onCheckedChange={v => toggleActive(s.id, v)} />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteSchedule(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info banner */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Envío automático en preparación</p>
              <p className="text-xs text-muted-foreground">
                La configuración de reportes se guarda correctamente. El envío automático por email requiere un scheduler (cron job) y un servicio de email. Tus preferencias estarán listas para activarse cuando se integre.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default EnergyScheduledReportsPanel;
