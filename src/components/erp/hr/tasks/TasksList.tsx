/**
 * TasksList — Lista unificada de tareas con filtros, acciones inline y masivas
 */
import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  CheckCircle, Clock, AlertTriangle, Search, Plus, Filter,
  ArrowUpCircle, MoreVertical, User, Calendar
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import type { HRTask, TaskCategory, TaskPriority, TaskStatus } from '@/hooks/erp/hr/useHRTasksEngine';
import { TaskDetail } from './TaskDetail';
import { TaskForm } from './TaskForm';

interface Props {
  tasks: HRTask[];
  loading: boolean;
  companyId: string;
  engine: ReturnType<typeof import('@/hooks/erp/hr/useHRTasksEngine').useHRTasksEngine>;
  filterMode: 'my-inbox' | 'all';
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-500/15 text-red-700 border-red-500/30',
  high: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  medium: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  low: 'bg-muted text-muted-foreground',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-amber-500" />,
  in_progress: <ArrowUpCircle className="h-4 w-4 text-blue-500" />,
  completed: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  cancelled: <AlertTriangle className="h-4 w-4 text-muted-foreground" />,
  on_hold: <Clock className="h-4 w-4 text-muted-foreground" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  admin_request: 'Solicitud', payroll: 'Nómina', mobility: 'Movilidad',
  document: 'Documento', compliance: 'Compliance', integration: 'Integración',
  onboarding: 'Onboarding', offboarding: 'Offboarding', general: 'General',
};

export function TasksList({ tasks, loading, companyId, engine, filterMode }: Props) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const filtered = useMemo(() => {
    let list = tasks;
    if (search) list = list.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
    if (catFilter !== 'all') list = list.filter(t => t.category === catFilter);
    if (statusFilter === 'active') list = list.filter(t => t.status === 'pending' || t.status === 'in_progress');
    else if (statusFilter !== 'all') list = list.filter(t => t.status === statusFilter);
    return list;
  }, [tasks, search, catFilter, statusFilter]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(t => t.id)));
  };

  const handleBulk = async (action: 'complete' | 'cancel') => {
    await engine.bulkAction(Array.from(selected), action);
    setSelected(new Set());
  };

  const detailTask = detailId ? tasks.find(t => t.id === detailId) : null;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar tareas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[150px]"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorías</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="in_progress">En curso</SelectItem>
            <SelectItem value="completed">Completada</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nueva
        </Button>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">{selected.size} seleccionadas</span>
          <Button size="sm" variant="outline" onClick={() => handleBulk('complete')}>Completar</Button>
          <Button size="sm" variant="outline" onClick={() => handleBulk('cancel')}>Cancelar</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Deseleccionar</Button>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-2">
        {filtered.length === 0 && !loading && (
          <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No hay tareas</CardContent></Card>
        )}
        {filtered.map(task => (
          <Card
            key={task.id}
            className="hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => setDetailId(task.id)}
          >
            <CardContent className="py-3 flex items-center gap-3">
              <Checkbox
                checked={selected.has(task.id)}
                onClick={e => e.stopPropagation()}
                onCheckedChange={() => toggleSelect(task.id)}
              />
              <div className="shrink-0">{STATUS_ICON[task.status] || STATUS_ICON.pending}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </p>
                  {task.sla_breached && <Badge variant="destructive" className="text-[10px] px-1.5">SLA</Badge>}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[task.category] || task.category}</Badge>
                  {task.due_date && (
                    <span className="flex items-center gap-0.5">
                      <Calendar className="h-3 w-3" />
                      {new Date(task.due_date).toLocaleDateString('es-ES')}
                    </span>
                  )}
                  {task.assigned_to && <span className="flex items-center gap-0.5"><User className="h-3 w-3" /> Asignada</span>}
                  {task.assigned_role && <span>Rol: {task.assigned_role}</span>}
                </div>
              </div>
              <Badge variant="outline" className={PRIORITY_STYLES[task.priority] || ''}>
                {task.priority === 'urgent' ? 'Urgente' : task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => engine.completeTask(task.id)}>Completar</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => engine.escalateTask(task.id)}>Escalar</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => engine.updateTask(task.id, { status: 'cancelled' as any })}>Cancelar</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail sheet */}
      <Sheet open={!!detailId} onOpenChange={() => setDetailId(null)}>
        <SheetContent className="w-[450px] sm:w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalle de Tarea</SheetTitle>
          </SheetHeader>
          {detailTask && <TaskDetail task={detailTask} engine={engine} onClose={() => setDetailId(null)} />}
        </SheetContent>
      </Sheet>

      {/* Create form */}
      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent className="w-[450px] sm:w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Nueva Tarea</SheetTitle>
          </SheetHeader>
          <TaskForm companyId={companyId} engine={engine} onClose={() => setShowForm(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
