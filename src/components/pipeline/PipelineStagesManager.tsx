import { useState } from 'react';
import { usePipelineStages, PipelineStage, CreatePipelineStage } from '@/hooks/usePipelineStages';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  GripVertical, 
  Pencil, 
  Trash2, 
  Star, 
  Trophy, 
  XCircle,
  Settings2,
  Loader2,
  Search,
  FileText,
  MessageSquare,
  Target,
  Circle,
  CheckCircle,
  AlertCircle,
  Zap,
  TrendingUp,
  DollarSign,
  Users,
  Phone,
  Mail,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Available icons for stages
const STAGE_ICONS = [
  { value: 'Search', label: 'Búsqueda', icon: Search },
  { value: 'FileText', label: 'Documento', icon: FileText },
  { value: 'MessageSquare', label: 'Mensaje', icon: MessageSquare },
  { value: 'Target', label: 'Objetivo', icon: Target },
  { value: 'Trophy', label: 'Trofeo', icon: Trophy },
  { value: 'XCircle', label: 'Cancelar', icon: XCircle },
  { value: 'Circle', label: 'Círculo', icon: Circle },
  { value: 'CheckCircle', label: 'Check', icon: CheckCircle },
  { value: 'AlertCircle', label: 'Alerta', icon: AlertCircle },
  { value: 'Zap', label: 'Rayo', icon: Zap },
  { value: 'TrendingUp', label: 'Tendencia', icon: TrendingUp },
  { value: 'DollarSign', label: 'Dinero', icon: DollarSign },
  { value: 'Users', label: 'Usuarios', icon: Users },
  { value: 'Phone', label: 'Teléfono', icon: Phone },
  { value: 'Mail', label: 'Correo', icon: Mail },
  { value: 'Calendar', label: 'Calendario', icon: Calendar },
];

// Available colors for stages
const STAGE_COLORS = [
  { value: '#6366f1', label: 'Índigo' },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#ef4444', label: 'Rojo' },
  { value: '#f59e0b', label: 'Ámbar' },
  { value: '#eab308', label: 'Amarillo' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#64748b', label: 'Gris' },
  { value: '#000000', label: 'Negro' },
];

const getIconComponent = (iconName: string | null) => {
  const found = STAGE_ICONS.find(i => i.value === iconName);
  return found ? found.icon : Circle;
};

// Sortable stage item
function SortableStageItem({ 
  stage, 
  onEdit, 
  onDelete, 
  onSetDefault,
}: { 
  stage: PipelineStage; 
  onEdit: (stage: PipelineStage) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComponent = getIconComponent(stage.icon);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors",
        isDragging && "shadow-lg"
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab touch-none">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center"
        style={{ backgroundColor: stage.color + '20' }}
      >
        <IconComponent className="h-4 w-4" style={{ color: stage.color }} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{stage.name}</span>
          {stage.is_default && (
            <Badge variant="outline" className="text-xs">
              <Star className="h-3 w-3 mr-1" />
              Por defecto
            </Badge>
          )}
          {stage.is_terminal && (
            <Badge 
              variant={stage.terminal_type === 'won' ? 'default' : 'destructive'} 
              className="text-xs"
            >
              {stage.terminal_type === 'won' ? (
                <><Trophy className="h-3 w-3 mr-1" />Ganada</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" />Perdida</>
              )}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {stage.probability_mode === 'auto' ? `${stage.probability}% automático` : 'Probabilidad manual'}
        </p>
      </div>

      <div className="flex items-center gap-1">
        {!stage.is_default && !stage.is_terminal && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => onSetDefault(stage.id)}
            title="Establecer como etapa por defecto"
          >
            <Star className="h-4 w-4" />
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          onClick={() => onEdit(stage)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        {!stage.is_terminal && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(stage.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Stage form component
function StageForm({ 
  stage, 
  onSubmit, 
  onCancel,
  isSubmitting,
}: { 
  stage: PipelineStage | null;
  onSubmit: (data: CreatePipelineStage | PipelineStage) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState(stage?.name || '');
  const [slug, setSlug] = useState(stage?.slug || '');
  const [probability, setProbability] = useState(stage?.probability || 50);
  const [probabilityMode, setProbabilityMode] = useState<'auto' | 'manual'>(stage?.probability_mode || 'auto');
  const [color, setColor] = useState(stage?.color || '#3b82f6');
  const [icon, setIcon] = useState(stage?.icon || 'Circle');
  const [isTerminal, setIsTerminal] = useState(stage?.is_terminal || false);
  const [terminalType, setTerminalType] = useState<'won' | 'lost' | null>(stage?.terminal_type || null);

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!stage) {
      const newSlug = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      setSlug(newSlug);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      name,
      slug,
      probability: probabilityMode === 'auto' ? probability : null,
      probability_mode: probabilityMode,
      color,
      icon,
      is_terminal: isTerminal,
      terminal_type: isTerminal ? terminalType : null,
      order_position: stage?.order_position ?? 999,
      is_default: stage?.is_default ?? false,
      is_active: true,
    };

    if (stage) {
      onSubmit({ ...data, id: stage.id } as PipelineStage);
    } else {
      onSubmit(data as CreatePipelineStage);
    }
  };

  const IconComponent = getIconComponent(icon);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Nombre de la etapa</Label>
          <Input 
            id="name" 
            value={name} 
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ej: Cualificación"
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="slug">Identificador (slug)</Label>
          <Input 
            id="slug" 
            value={slug} 
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Ej: cualificacion"
            required
            disabled={!!stage}
          />
          <p className="text-xs text-muted-foreground">Identificador único, no se puede cambiar después</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Icono</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4" />
                    {STAGE_ICONS.find(i => i.value === icon)?.label}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STAGE_ICONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Color</Label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full border" 
                      style={{ backgroundColor: color }}
                    />
                    {STAGE_COLORS.find(c => c.value === color)?.label}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STAGE_COLORS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full border" 
                        style={{ backgroundColor: item.value }}
                      />
                      {item.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Probabilidad de cierre</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {probabilityMode === 'auto' ? 'Automático' : 'Manual por oportunidad'}
              </span>
              <Switch 
                checked={probabilityMode === 'manual'} 
                onCheckedChange={(checked) => setProbabilityMode(checked ? 'manual' : 'auto')}
              />
            </div>
          </div>
          
          {probabilityMode === 'auto' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Probabilidad fija para esta etapa</span>
                <span className="font-medium">{probability}%</span>
              </div>
              <Slider
                value={[probability]}
                onValueChange={([value]) => setProbability(value)}
                max={100}
                step={5}
              />
            </div>
          )}
        </div>

        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div>
              <Label>Etapa terminal</Label>
              <p className="text-xs text-muted-foreground">
                Las etapas terminales finalizan el ciclo de venta
              </p>
            </div>
            <Switch 
              checked={isTerminal} 
              onCheckedChange={(checked) => {
                setIsTerminal(checked);
                if (!checked) setTerminalType(null);
              }}
            />
          </div>

          {isTerminal && (
            <div className="grid gap-2">
              <Label>Tipo de cierre</Label>
              <Select 
                value={terminalType || ''} 
                onValueChange={(v) => setTerminalType(v as 'won' | 'lost')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="won">
                    <div className="flex items-center gap-2 text-green-600">
                      <Trophy className="h-4 w-4" />
                      Ganada
                    </div>
                  </SelectItem>
                  <SelectItem value="lost">
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-4 w-4" />
                      Perdida
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {stage ? 'Guardar cambios' : 'Crear etapa'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function PipelineStagesManager() {
  const { 
    stages, 
    isLoading, 
    createStage, 
    updateStage, 
    deleteStage, 
    reorderStages,
    setDefaultStage,
  } = usePipelineStages();

  const [formOpen, setFormOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = stages.findIndex(s => s.id === active.id);
    const newIndex = stages.findIndex(s => s.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = [...stages];
      const [removed] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, removed);
      reorderStages.mutate(newOrder.map(s => s.id));
    }
  };

  const handleSubmit = (data: CreatePipelineStage | PipelineStage) => {
    if ('id' in data) {
      updateStage.mutate(data, {
        onSuccess: () => {
          setFormOpen(false);
          setEditingStage(null);
        },
      });
    } else {
      createStage.mutate(data, {
        onSuccess: () => {
          setFormOpen(false);
        },
      });
    }
  };

  const handleEdit = (stage: PipelineStage) => {
    setEditingStage(stage);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteStage.mutate(id);
    setDeleteId(null);
  };

  const handleSetDefault = (id: string) => {
    setDefaultStage.mutate(id);
  };

  const activeStage = activeId ? stages.find(s => s.id === activeId) : null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Etapas del Pipeline
            </CardTitle>
            <CardDescription>
              Personaliza las etapas de tu embudo de ventas. Arrastra para reordenar.
            </CardDescription>
          </div>
          <Dialog open={formOpen} onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditingStage(null);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Etapa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingStage ? 'Editar etapa' : 'Nueva etapa'}
                </DialogTitle>
                <DialogDescription>
                  {editingStage 
                    ? 'Modifica los detalles de esta etapa del pipeline.' 
                    : 'Crea una nueva etapa para tu embudo de ventas.'}
                </DialogDescription>
              </DialogHeader>
              <StageForm
                stage={editingStage}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setFormOpen(false);
                  setEditingStage(null);
                }}
                isSubmitting={createStage.isPending || updateStage.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={stages.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {stages.map((stage) => (
                  <SortableStageItem
                    key={stage.id}
                    stage={stage}
                    onEdit={handleEdit}
                    onDelete={(id) => setDeleteId(id)}
                    onSetDefault={handleSetDefault}
                  />
                ))}
              </div>
            </SortableContext>
            
            <DragOverlay>
              {activeStage && (
                <div className="opacity-90">
                  <SortableStageItem
                    stage={activeStage}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onSetDefault={() => {}}
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </ScrollArea>
      </CardContent>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta etapa?</AlertDialogTitle>
            <AlertDialogDescription>
              Las oportunidades en esta etapa quedarán sin etapa asignada. 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
