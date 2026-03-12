/**
 * TaskForm — Create/edit task with category, assignment, SLA config
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TaskCategory, TaskPriority, TaskCreateData } from '@/hooks/erp/hr/useHRTasksEngine';

interface Props {
  companyId: string;
  engine: ReturnType<typeof import('@/hooks/erp/hr/useHRTasksEngine').useHRTasksEngine>;
  onClose: () => void;
}

export function TaskForm({ companyId, engine, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('general');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assignedRole, setAssignedRole] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [slaHours, setSlaHours] = useState('');
  const [escalationTo, setEscalationTo] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const data: TaskCreateData = {
      company_id: companyId,
      title,
      description: description || undefined,
      category,
      priority,
      assigned_role: assignedRole || undefined,
      due_date: dueDate || undefined,
      sla_hours: slaHours ? parseInt(slaHours) : undefined,
      escalation_to: escalationTo || undefined,
      source_type: 'manual',
    };
    await engine.createTask(data);
    setSaving(false);
    onClose();
  };

  return (
    <div className="space-y-4 mt-4">
      <div>
        <Label>Título *</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Descripción breve de la tarea" />
      </div>

      <div>
        <Label>Descripción</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Categoría</Label>
          <Select value={category} onValueChange={v => setCategory(v as TaskCategory)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="admin_request">Solicitud</SelectItem>
              <SelectItem value="payroll">Nómina</SelectItem>
              <SelectItem value="mobility">Movilidad</SelectItem>
              <SelectItem value="document">Documento</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
              <SelectItem value="integration">Integración</SelectItem>
              <SelectItem value="onboarding">Onboarding</SelectItem>
              <SelectItem value="offboarding">Offboarding</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Prioridad</Label>
          <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Baja</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Rol asignado</Label>
          <Input value={assignedRole} onChange={e => setAssignedRole(e.target.value)} placeholder="ej. hr_manager" />
        </div>
        <div>
          <Label>Fecha vencimiento</Label>
          <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>SLA (horas)</Label>
          <Input type="number" value={slaHours} onChange={e => setSlaHours(e.target.value)} placeholder="ej. 24" />
        </div>
        <div>
          <Label>Escalar a (rol)</Label>
          <Input value={escalationTo} onChange={e => setEscalationTo(e.target.value)} placeholder="ej. hr_director" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={!title.trim() || saving}>
          {saving ? 'Guardando...' : 'Crear Tarea'}
        </Button>
      </div>
    </div>
  );
}
