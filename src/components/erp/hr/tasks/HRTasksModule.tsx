/**
 * HRTasksModule — Panel principal de tareas RRHH
 * Tabs: Mi Bandeja | Por Equipo | Por Expediente | SLA | Configuración
 */
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList } from 'lucide-react';
import { useHRTasksEngine } from '@/hooks/erp/hr/useHRTasksEngine';
import { TasksDashboard } from './TasksDashboard';
import { TasksList } from './TasksList';
import { TasksByExpedient } from './TasksByExpedient';
import { TaskAssignmentRules } from './TaskAssignmentRules';

interface Props { companyId: string; }

export function HRTasksModule({ companyId }: Props) {
  const engine = useHRTasksEngine(companyId);
  const [tab, setTab] = useState('dashboard');

  useEffect(() => {
    engine.fetchTasks();
    engine.fetchStats();
    engine.checkSLABreaches();
  }, [companyId]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-violet-500" /> Tareas RRHH
        </h2>
        <p className="text-sm text-muted-foreground">
          Gestión unificada de tareas, SLA, asignaciones y escalaciones
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="my-inbox">Mi Bandeja</TabsTrigger>
          <TabsTrigger value="all-tasks">Todas</TabsTrigger>
          <TabsTrigger value="by-expedient">Por Expediente</TabsTrigger>
          <TabsTrigger value="config">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <TasksDashboard stats={engine.stats} tasks={engine.tasks} loading={engine.loading} />
        </TabsContent>

        <TabsContent value="my-inbox">
          <TasksList
            tasks={engine.tasks}
            loading={engine.loading}
            companyId={companyId}
            engine={engine}
            filterMode="my-inbox"
          />
        </TabsContent>

        <TabsContent value="all-tasks">
          <TasksList
            tasks={engine.tasks}
            loading={engine.loading}
            companyId={companyId}
            engine={engine}
            filterMode="all"
          />
        </TabsContent>

        <TabsContent value="by-expedient">
          <TasksByExpedient tasks={engine.tasks} loading={engine.loading} />
        </TabsContent>

        <TabsContent value="config">
          <TaskAssignmentRules companyId={companyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
