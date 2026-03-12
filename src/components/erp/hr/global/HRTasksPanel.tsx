/**
 * HRTasksPanel — Tareas de RRHH asignables
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Plus, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface Props { companyId: string; }

const DEMO_TASKS = [
  { id: '1', title: 'Completar onboarding Ana Martín', assignee: 'RRHH', priority: 'high', due: '2026-03-15', done: false },
  { id: '2', title: 'Revisar documentación expatriado', assignee: 'Laboral', priority: 'medium', due: '2026-03-20', done: false },
  { id: '3', title: 'Renovar reconocimiento médico equipo ventas', assignee: 'PRL', priority: 'high', due: '2026-03-12', done: false },
  { id: '4', title: 'Actualizar tabla salarial convenio', assignee: 'Comp&Ben', priority: 'low', due: '2026-03-30', done: true },
];

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-500/15 text-red-700 border-red-500/30',
  medium: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  low: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
};

export function HRTasksPanel({ companyId }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-violet-500" /> Tareas RRHH
          </h3>
          <p className="text-sm text-muted-foreground">Tareas asignables de onboarding, revisiones, recordatorios</p>
        </div>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Nueva tarea</Button>
      </div>

      <div className="grid gap-3">
        {DEMO_TASKS.map(task => (
          <Card key={task.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {task.done ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                )}
                <div>
                  <p className={`text-sm font-medium ${task.done ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.assignee} · Vence: {task.due}</p>
                </div>
              </div>
              <Badge variant="outline" className={PRIORITY_COLORS[task.priority]}>
                {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
