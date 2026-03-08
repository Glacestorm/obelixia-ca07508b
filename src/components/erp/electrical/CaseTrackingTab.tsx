import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CalendarIcon, Save, Eye, CheckCircle2, Clock, ArrowRight,
  FileText, Phone, TrendingUp, AlertTriangle, Plus
} from 'lucide-react';
import { PermissionGate } from './PermissionGate';
import { useEnergyTracking } from '@/hooks/erp/useEnergyTracking';
import { useEnergyTasks, TASK_TYPES, TASK_STATUSES, EnergyTask } from '@/hooks/erp/useEnergyTasks';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Props { caseId: string; }

const CLOSURE_STATUSES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  open: { label: 'Abierto', variant: 'outline' },
  success: { label: 'Éxito', variant: 'default' },
  partial: { label: 'Parcial', variant: 'secondary' },
  failed: { label: 'Fallido', variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
};

export function CaseTrackingTab({ caseId }: Props) {
  const { tracking, loading, upsertTracking } = useEnergyTracking(caseId);
  const { tasks, createTask, updateTask, deleteTask } = useEnergyTasks(caseId);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    proposal_sent_date: undefined as Date | undefined,
    proposal_accepted_date: undefined as Date | undefined,
    supplier_change_date: undefined as Date | undefined,
    first_invoice_review_date: undefined as Date | undefined,
    observed_real_savings: '',
    tracking_notes: '',
    closure_status: 'open',
  });

  // Task dialog
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', task_type: 'general', due_date: undefined as Date | undefined, status: 'pending',
  });

  useEffect(() => {
    if (tracking) {
      setForm({
        proposal_sent_date: tracking.proposal_sent_date ? new Date(tracking.proposal_sent_date) : undefined,
        proposal_accepted_date: tracking.proposal_accepted_date ? new Date(tracking.proposal_accepted_date) : undefined,
        supplier_change_date: tracking.supplier_change_date ? new Date(tracking.supplier_change_date) : undefined,
        first_invoice_review_date: tracking.first_invoice_review_date ? new Date(tracking.first_invoice_review_date) : undefined,
        observed_real_savings: tracking.observed_real_savings?.toString() || '',
        tracking_notes: tracking.tracking_notes || '',
        closure_status: tracking.closure_status || 'open',
      });
    }
  }, [tracking]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await upsertTracking({
      proposal_sent_date: form.proposal_sent_date?.toISOString() || null,
      proposal_accepted_date: form.proposal_accepted_date?.toISOString() || null,
      supplier_change_date: form.supplier_change_date?.toISOString() || null,
      first_invoice_review_date: form.first_invoice_review_date?.toISOString() || null,
      observed_real_savings: form.observed_real_savings ? parseFloat(form.observed_real_savings) : null,
      tracking_notes: form.tracking_notes || null,
      closure_status: form.closure_status,
    } as any);
    setSaving(false);
  }, [form, upsertTracking]);

  const handleCreateTask = useCallback(async () => {
    await createTask({
      title: taskForm.title,
      description: taskForm.description || null,
      task_type: taskForm.task_type,
      due_date: taskForm.due_date ? format(taskForm.due_date, 'yyyy-MM-dd') : null,
      status: taskForm.status,
    } as any);
    setShowTaskDialog(false);
    setTaskForm({ title: '', description: '', task_type: 'general', due_date: undefined, status: 'pending' });
  }, [taskForm, createTask]);

  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd/MM/yyyy', { locale: es }); } catch { return '—'; }
  };

  const DateField = ({ label, icon: Icon, value, onChange }: {
    label: string; icon: React.ElementType; value: Date | undefined; onChange: (d: Date | undefined) => void;
  }) => (
    <div className="grid gap-2">
      <Label className="flex items-center gap-1.5 text-xs">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" /> {label}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal h-9", !value && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {value ? format(value, 'dd/MM/yyyy', { locale: es }) : 'Sin fecha'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={onChange} className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
    </div>
  );

  // Timeline items
  const timelineItems = [
    { key: 'proposal_sent', label: 'Propuesta enviada', date: form.proposal_sent_date, icon: FileText, color: 'bg-blue-500' },
    { key: 'proposal_accepted', label: 'Propuesta aceptada', date: form.proposal_accepted_date, icon: CheckCircle2, color: 'bg-emerald-500' },
    { key: 'supplier_change', label: 'Cambio de comercializadora', date: form.supplier_change_date, icon: ArrowRight, color: 'bg-amber-500' },
    { key: 'first_invoice', label: 'Revisión 1ª factura', date: form.first_invoice_review_date, icon: Eye, color: 'bg-purple-500' },
  ].filter(i => i.date);

  const closureInfo = CLOSURE_STATUSES[form.closure_status] || CLOSURE_STATUSES.open;

  return (
    <div className="space-y-4">
      {/* Timeline visual */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Timeline del expediente
          </CardTitle>
          <CardDescription>Hitos principales del proceso de optimización</CardDescription>
        </CardHeader>
        <CardContent>
          {timelineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No hay hitos registrados aún. Completa las fechas a continuación.</p>
          ) : (
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-2.5 top-1 bottom-1 w-0.5 bg-border" />
              {timelineItems.sort((a, b) => a.date!.getTime() - b.date!.getTime()).map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.key} className="relative flex items-start gap-3">
                    <div className={cn("absolute -left-3.5 p-1 rounded-full", item.color)}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(item.date!, 'dd MMM yyyy', { locale: es })}
                        {' · '}
                        {formatDistanceToNow(item.date!, { locale: es, addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dates form */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Fechas de seguimiento</CardTitle>
            <Badge variant={closureInfo.variant}>{closureInfo.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DateField label="Envío de propuesta" icon={FileText} value={form.proposal_sent_date}
              onChange={d => setForm(f => ({ ...f, proposal_sent_date: d }))} />
            <DateField label="Aceptación" icon={CheckCircle2} value={form.proposal_accepted_date}
              onChange={d => setForm(f => ({ ...f, proposal_accepted_date: d }))} />
            <DateField label="Cambio comercializadora" icon={ArrowRight} value={form.supplier_change_date}
              onChange={d => setForm(f => ({ ...f, supplier_change_date: d }))} />
            <DateField label="Revisión 1ª factura" icon={Eye} value={form.first_invoice_review_date}
              onChange={d => setForm(f => ({ ...f, first_invoice_review_date: d }))} />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5 text-xs">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> Ahorro real observado (€/mes)
              </Label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.observed_real_savings}
                onChange={e => setForm(f => ({ ...f, observed_real_savings: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Estado de cierre</Label>
              <Select value={form.closure_status} onValueChange={v => setForm(f => ({ ...f, closure_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CLOSURE_STATUSES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-xs">Notas de seguimiento</Label>
            <Textarea value={form.tracking_notes} onChange={e => setForm(f => ({ ...f, tracking_notes: e.target.value }))}
              placeholder="Observaciones del seguimiento..." rows={3} />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1.5" />
              {saving ? 'Guardando...' : 'Guardar seguimiento'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Tareas del expediente</CardTitle>
              <CardDescription>{tasks.length} tareas</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowTaskDialog(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Nueva tarea
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No hay tareas. Crea una nueva tarea para este expediente.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => {
                const typeInfo = TASK_TYPES[task.task_type] || TASK_TYPES.general;
                const statusInfo = TASK_STATUSES[task.status] || TASK_STATUSES.pending;
                return (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors group">
                    <span className="text-lg">{typeInfo.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn("text-xs font-medium", statusInfo.color)}>{statusInfo.label}</span>
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground">
                            Vence: {fmtDate(task.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      {task.status === 'pending' && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs"
                          onClick={() => updateTask(task.id, { status: 'in_progress' })}>
                          Iniciar
                        </Button>
                      )}
                      {task.status === 'in_progress' && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600"
                          onClick={() => updateTask(task.id, { status: 'completed' })}>
                          Completar
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                        onClick={() => deleteTask(task.id)}>
                        <AlertTriangle className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nueva tarea</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Título</Label>
              <Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Revisar contrato actual" />
            </div>
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select value={taskForm.task_type} onValueChange={v => setTaskForm(f => ({ ...f, task_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Descripción</Label>
              <Textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Detalles adicionales..." rows={2} />
            </div>
            <div className="grid gap-2">
              <Label>Vencimiento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start", !taskForm.due_date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {taskForm.due_date ? format(taskForm.due_date, 'dd/MM/yyyy', { locale: es }) : 'Sin fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={taskForm.due_date} onSelect={d => setTaskForm(f => ({ ...f, due_date: d }))}
                    className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateTask} disabled={!taskForm.title.trim()}>Crear tarea</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CaseTrackingTab;
