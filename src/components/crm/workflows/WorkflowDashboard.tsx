import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Play, 
  Pause, 
  GitBranch, 
  Activity,
  Zap,
  RefreshCw,
  LayoutTemplate
} from 'lucide-react';
import { useCRMWorkflows } from '@/hooks/crm/workflows';
import { WorkflowList } from './WorkflowList';
import { WorkflowTemplates } from './WorkflowTemplates';
import { WorkflowExecutionHistory } from './WorkflowExecutionHistory';
import { WorkflowFormDialog } from './WorkflowFormDialog';

export function WorkflowDashboard() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('workflows');

  const { 
    workflows, 
    templates, 
    executions, 
    stats, 
    isLoading,
    createWorkflow,
    refetch 
  } = useCRMWorkflows();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-primary" />
            Workflow Builder
          </h2>
          <p className="text-muted-foreground">
            Automatiza procesos CRM con workflows visuales
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Workflow
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <GitBranch className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Activos</p>
                <p className="text-2xl font-bold text-emerald-500">{stats.active}</p>
              </div>
              <Play className="h-8 w-8 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Borradores</p>
                <p className="text-2xl font-bold text-amber-500">{stats.draft}</p>
              </div>
              <Zap className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pausados</p>
                <p className="text-2xl font-bold text-gray-500">{stats.paused}</p>
              </div>
              <Pause className="h-8 w-8 text-gray-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ejecuciones</p>
                <p className="text-2xl font-bold">{stats.totalExecutions}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tasa Éxito</p>
                <p className="text-2xl font-bold text-emerald-500">
                  {stats.totalExecutions > 0 
                    ? Math.round((stats.successfulExecutions / stats.totalExecutions) * 100)
                    : 0}%
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {stats.failedExecutions} fallos
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="workflows" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Workflows ({workflows.length})
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4" />
            Plantillas ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Historial ({executions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="mt-4">
          <WorkflowList />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <WorkflowTemplates />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <WorkflowExecutionHistory />
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <WorkflowFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={async (data) => {
          await createWorkflow(data);
          setShowCreateDialog(false);
        }}
      />
    </div>
  );
}
