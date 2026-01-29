import { useState } from 'react';
import { useOpportunities, Opportunity, usePipelineStats } from '@/hooks/useOpportunities';
import { usePipelineStages, PipelineStage } from '@/hooks/usePipelineStages';
import { OpportunityCard } from './OpportunityCard';
import { OpportunityForm } from './OpportunityForm';
import { PipelineStagesManager } from './PipelineStagesManager';
import { PipelineAgentPanel } from './PipelineAgentPanel';
import { PipelineTemplates } from './PipelineTemplates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Plus, Search, TrendingUp, DollarSign, Target, Trophy, XCircle, Loader2, Settings2, Circle, FileText, MessageSquare, CheckCircle, AlertCircle, Zap, Users, Phone, Mail, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Icon mapping for dynamic stages
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Search, Target, TrendingUp, Trophy, XCircle, Circle, FileText, MessageSquare, 
  CheckCircle, AlertCircle, Zap, DollarSign, Users, Phone, Mail, Calendar
};

const getStageIcon = (iconName: string | null) => {
  if (!iconName) return Circle;
  return ICON_MAP[iconName] || Circle;
};

// Droppable column for each stage
function DroppableColumn({
  stageId,
  children,
}: {
  stageId: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });

  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "h-full transition-all duration-200 rounded-lg",
        isOver && "ring-2 ring-primary ring-offset-2"
      )}
    >
      {children}
    </div>
  );
}

// Draggable wrapper for opportunity cards
function DraggableOpportunityCard({
  opportunity,
  onEdit,
  onDelete,
  onView,
  onMoveStage,
  stages,
}: {
  opportunity: Opportunity;
  onEdit: (o: Opportunity) => void;
  onDelete: (id: string) => void;
  onView: (o: Opportunity) => void;
  onMoveStage: (id: string, stageId: string) => void;
  stages: PipelineStage[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opportunity.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
    cursor: 'grab',
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <OpportunityCard
        opportunity={opportunity}
        onEdit={onEdit}
        onDelete={onDelete}
        onView={onView}
        onMoveStage={onMoveStage}
        isDragging={isDragging}
        stages={stages}
      />
    </div>
  );
}

export function PipelineBoard() {
  const { opportunities, isLoading: oppsLoading, createOpportunity, updateOpportunity, deleteOpportunity, moveStage } = useOpportunities();
  const { stages, isLoading: stagesLoading } = usePipelineStages();
  const stats = usePipelineStats();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [viewOpportunity, setViewOpportunity] = useState<Opportunity | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [pendingLostId, setPendingLostId] = useState<string | null>(null);
  const [lostReason, setLostReason] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const isLoading = oppsLoading || stagesLoading;

  // Configure drag sensors with activation constraint
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const activeOpportunity = activeId ? opportunities.find(o => o.id === activeId) : null;

  const filteredOpportunities = opportunities.filter(o => 
    o.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.company?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get opportunities by stage_id (new) or stage slug (legacy compatibility)
  const getOpportunitiesByStage = (stage: PipelineStage) => 
    filteredOpportunities.filter(o => o.stage_id === stage.id || o.stage === stage.slug);

  const getStageValue = (stage: PipelineStage) => 
    getOpportunitiesByStage(stage).reduce((sum, o) => sum + (o.estimated_value || 0), 0);
  
  // Find lost stage for dialog
  const lostStage = stages.find(s => s.terminal_type === 'lost');

  const handleEdit = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setFormOpen(true);
  };

  const handleSubmit = (data: Partial<Opportunity>) => {
    if (data.id) {
      updateOpportunity.mutate(data as Opportunity);
    } else {
      createOpportunity.mutate(data);
    }
  };

  const handleMoveStage = (id: string, stageId: string) => {
    const targetStage = stages.find(s => s.id === stageId);
    if (targetStage?.terminal_type === 'lost') {
      setPendingLostId(id);
      setLostDialogOpen(true);
    } else {
      moveStage.mutate({ id, stageId });
    }
  };

  const confirmLost = () => {
    if (pendingLostId && lostStage) {
      moveStage.mutate({ id: pendingLostId, stageId: lostStage.id, lostReason });
    }
    setLostDialogOpen(false);
    setPendingLostId(null);
    setLostReason('');
  };

  // Drag-and-drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const opportunityId = active.id as string;
    const targetStageId = over.id as string;

    // Check if the target is a valid stage
    const targetStage = stages.find(s => s.id === targetStageId);
    if (!targetStage) return;

    // Find the opportunity being dragged
    const opportunity = opportunities.find(o => o.id === opportunityId);
    if (!opportunity || opportunity.stage_id === targetStageId) return;

    // Handle the move
    handleMoveStage(opportunityId, targetStageId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Pipeline</p>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', notation: 'compact' }).format(stats.totalValue)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Valor Ponderado</p>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', notation: 'compact' }).format(stats.weightedValue)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ganadas</p>
                <p className="text-2xl font-bold text-green-600">
                  {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', notation: 'compact' }).format(stats.wonValue)}
                </p>
              </div>
              <Trophy className="h-8 w-8 text-green-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Oportunidades</p>
                <p className="text-2xl font-bold">{opportunities.length}</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar oportunidades..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <PipelineTemplates />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
                <Settings2 className="h-4 w-4 mr-2" />
                Configurar Etapas
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Configurar Pipeline</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <PipelineStagesManager />
              </div>
            </SheetContent>
          </Sheet>
          <Button onClick={() => { setSelectedOpportunity(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Oportunidad
          </Button>
        </div>
      </div>

      {/* Pipeline Columns with Drag-and-Drop */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={cn(
          "grid gap-4",
          stages.length <= 3 ? "grid-cols-1 md:grid-cols-3" :
          stages.length <= 5 ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-5" :
          "grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
        )}>
          {stages.map((stage) => {
            const stageOpps = getOpportunitiesByStage(stage);
            const stageValue = getStageValue(stage);
            const IconComponent = getStageIcon(stage.icon);
            
            return (
              <DroppableColumn key={stage.id} stageId={stage.id}>
                <Card 
                  className="min-h-[400px]"
                  style={{ 
                    backgroundColor: `${stage.color}10`,
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <span className="flex items-center gap-2" style={{ color: stage.color }}>
                        <IconComponent className="h-4 w-4" />
                        {stage.name}
                      </span>
                      <Badge variant="secondary" className="ml-2">
                        {stageOpps.length}
                      </Badge>
                    </CardTitle>
                    <div className="flex items-center justify-between">
                      {stageValue > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', notation: 'compact' }).format(stageValue)}
                        </p>
                      )}
                      {stage.probability !== null && (
                        <Badge variant="outline" className="text-xs">
                          {stage.probability}%
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-2">
                    <ScrollArea className="h-[350px] pr-2">
                      <div className="space-y-2">
                        {stageOpps.map((opportunity) => (
                          <DraggableOpportunityCard
                            key={opportunity.id}
                            opportunity={opportunity}
                            onEdit={handleEdit}
                            onDelete={(id) => setDeleteId(id)}
                            onView={setViewOpportunity}
                            onMoveStage={handleMoveStage}
                            stages={stages}
                          />
                        ))}
                        {stageOpps.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground text-sm">
                            Sin oportunidades
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </DroppableColumn>
            );
          })}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeOpportunity && (
            <div className="rotate-2 scale-105">
              <OpportunityCard
                opportunity={activeOpportunity}
                onEdit={() => {}}
                onDelete={() => {}}
                onView={() => {}}
                onMoveStage={() => {}}
                isDragging
                stages={stages}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Form Dialog */}
      <OpportunityForm
        open={formOpen}
        onOpenChange={setFormOpen}
        opportunity={selectedOpportunity}
        onSubmit={handleSubmit}
      />

      {/* View Dialog */}
      <Dialog open={!!viewOpportunity} onOpenChange={() => setViewOpportunity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewOpportunity?.title}</DialogTitle>
          </DialogHeader>
          {viewOpportunity && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Empresa</p>
                  <p className="font-medium">{viewOpportunity.company?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Etapa</p>
                  <p className="font-medium capitalize">{viewOpportunity.stage}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor Estimado</p>
                  <p className="font-medium">
                    {viewOpportunity.estimated_value 
                      ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(viewOpportunity.estimated_value)
                      : 'No especificado'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Probabilidad</p>
                  <p className="font-medium">{viewOpportunity.probability}%</p>
                </div>
              </div>
              {viewOpportunity.description && (
                <div>
                  <p className="text-muted-foreground text-sm">Descripción</p>
                  <p className="text-sm mt-1">{viewOpportunity.description}</p>
                </div>
              )}
              {viewOpportunity.lost_reason && (
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">Motivo de pérdida</p>
                  <p className="text-sm mt-1">{viewOpportunity.lost_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar oportunidad?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La oportunidad será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteOpportunity.mutate(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lost Reason Dialog */}
      <AlertDialog open={lostDialogOpen} onOpenChange={setLostDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Por qué se perdió esta oportunidad?</AlertDialogTitle>
            <AlertDialogDescription>
              Indica el motivo para futuras referencias y análisis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Select value={lostReason} onValueChange={setLostReason}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un motivo..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Precio">Precio no competitivo</SelectItem>
              <SelectItem value="Competencia">Eligió competencia</SelectItem>
              <SelectItem value="Timing">No es el momento adecuado</SelectItem>
              <SelectItem value="Requisitos">No cumple requisitos</SelectItem>
              <SelectItem value="Presupuesto">Sin presupuesto</SelectItem>
              <SelectItem value="Otro">Otro motivo</SelectItem>
            </SelectContent>
          </Select>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setPendingLostId(null); setLostReason(''); }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmLost} disabled={!lostReason}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
