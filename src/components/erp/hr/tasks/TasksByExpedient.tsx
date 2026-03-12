/**
 * TasksByExpedient — Tasks grouped by employee
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, User, CheckCircle, Clock } from 'lucide-react';
import type { HRTask } from '@/hooks/erp/hr/useHRTasksEngine';

interface Props {
  tasks: HRTask[];
  loading: boolean;
}

export function TasksByExpedient({ tasks, loading }: Props) {
  const [search, setSearch] = useState('');

  const grouped = useMemo(() => {
    const withEmployee = tasks.filter(t => t.employee_id);
    const map = new Map<string, HRTask[]>();
    withEmployee.forEach(t => {
      const key = t.employee_id!;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return Array.from(map.entries())
      .filter(([id]) => !search || id.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b[1].length - a[1].length);
  }, [tasks, search]);

  const noEmployee = tasks.filter(t => !t.employee_id);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por ID empleado..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {grouped.length === 0 && !loading && (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
          No hay tareas vinculadas a empleados
        </CardContent></Card>
      )}

      {grouped.map(([empId, empTasks]) => {
        const pending = empTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
        const completed = empTasks.filter(t => t.status === 'completed').length;

        return (
          <Card key={empId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-blue-500" />
                Empleado {empId.slice(0, 8)}...
                <Badge variant="outline">{empTasks.length} tareas</Badge>
                {pending > 0 && <Badge variant="secondary">{pending} activas</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {empTasks.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-muted/50">
                    {t.status === 'completed'
                      ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      : <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                    <span className={t.status === 'completed' ? 'line-through text-muted-foreground' : ''}>{t.title}</span>
                    <Badge variant="outline" className="ml-auto text-[10px]">{t.category}</Badge>
                  </div>
                ))}
                {empTasks.length > 5 && (
                  <p className="text-xs text-muted-foreground pl-6">+{empTasks.length - 5} más</p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {noEmployee.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Sin empleado vinculado ({noEmployee.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {noEmployee.slice(0, 5).map(t => (
                <p key={t.id} className="text-sm text-muted-foreground">{t.title}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
