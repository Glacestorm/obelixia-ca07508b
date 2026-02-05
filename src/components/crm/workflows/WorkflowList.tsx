import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
  Play, 
  Pause, 
  MoreVertical, 
  Edit, 
  Copy, 
  Trash2, 
  Search,
  GitBranch,
  Zap,
  Clock,
  Webhook
} from 'lucide-react';
import { useCRMWorkflows, type CRMWorkflow, type WorkflowStatus, type TriggerType } from '@/hooks/crm/workflows';
import { useCRMWorkflowExecutor } from '@/hooks/crm/workflows';
import { WorkflowFormDialog } from './WorkflowFormDialog';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<WorkflowStatus, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-gray-100 text-gray-800' },
  active: { label: 'Activo', color: 'bg-emerald-100 text-emerald-800' },
  paused: { label: 'Pausado', color: 'bg-amber-100 text-amber-800' },
  archived: { label: 'Archivado', color: 'bg-red-100 text-red-800' }
};

const TRIGGER_ICONS: Record<TriggerType, typeof GitBranch> = {
  manual: Play,
  event: Zap,
  schedule: Clock,
  condition: GitBranch,
  webhook: Webhook
};

export function WorkflowList() {
  const [search, setSearch] = useState('');
  const [editingWorkflow, setEditingWorkflow] = useState<CRMWorkflow | null>(null);

  const { 
    workflows, 
    isLoading,
    updateWorkflow,
    deleteWorkflow,
    toggleWorkflowStatus,
    duplicateWorkflow
  } = useCRMWorkflows();

  const { executeWorkflow, isExecuting } = useCRMWorkflowExecutor();

  const filteredWorkflows = workflows.filter(w => 
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExecute = async (workflow: CRMWorkflow) => {
    if (workflow.status !== 'active') {
      return;
    }
    await executeWorkflow({ workflowId: workflow.id });
  };

  const handleToggleStatus = async (workflow: CRMWorkflow) => {
    const newStatus: WorkflowStatus = workflow.status === 'active' ? 'paused' : 'active';
    await toggleWorkflowStatus(workflow.id, newStatus);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar workflows..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Workflow Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredWorkflows.map((workflow) => {
          const TriggerIcon = TRIGGER_ICONS[workflow.trigger_type];
          const statusConfig = STATUS_CONFIG[workflow.status];

          return (
            <Card key={workflow.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <TriggerIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{workflow.name}</CardTitle>
                      <p className="text-xs text-muted-foreground capitalize">
                        {workflow.trigger_type}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingWorkflow(workflow)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateWorkflow(workflow.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => deleteWorkflow(workflow.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3 min-h-[40px]">
                  {workflow.description || 'Sin descripción'}
                </p>

                <div className="flex items-center justify-between">
                  <Badge className={cn('text-xs', statusConfig.color)}>
                    {statusConfig.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(workflow.updated_at), { 
                      addSuffix: true, 
                      locale: es 
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  {workflow.status === 'active' ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleToggleStatus(workflow)}
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Pausar
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleToggleStatus(workflow)}
                      disabled={workflow.status === 'archived'}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Activar
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleExecute(workflow)}
                    disabled={workflow.status !== 'active' || isExecuting}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Ejecutar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredWorkflows.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No se encontraron workflows</p>
        </div>
      )}

      {/* Edit Dialog */}
      {editingWorkflow && (
        <WorkflowFormDialog
          open={!!editingWorkflow}
          onOpenChange={() => setEditingWorkflow(null)}
          workflow={editingWorkflow}
          onSubmit={async (data) => {
            await updateWorkflow({ id: editingWorkflow.id, ...data });
            setEditingWorkflow(null);
          }}
        />
      )}
    </div>
  );
}
