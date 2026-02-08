/**
 * GaliaBPMNWorkflowsPanel - Diseñador Visual de Flujos No-Code
 * Phase 8E: Automatización de procesos para expedientes GALIA
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Sparkles, 
  Play,
  Pause,
  Plus,
  Save,
  FileCheck,
  Banknote,
  Bell,
  Shield,
  Workflow,
  GitBranch,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Maximize2,
  Minimize2,
  Lightbulb,
  Zap,
  LayoutTemplate,
  Settings,
  Eye,
  Trash2,
  Copy,
  ArrowRight
} from 'lucide-react';
import { useGaliaBPMNWorkflows, GaliaWorkflowTemplate, GaliaWorkflow, WorkflowExecution } from '@/hooks/galia/useGaliaBPMNWorkflows';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import type { BPMNNode, BPMNEdge, BPMNNodeType } from '@/types/bpmn';

// === SUB-COMPONENTS ===

// Template Card
const TemplateCard = ({ 
  template, 
  onSelect 
}: { 
  template: GaliaWorkflowTemplate; 
  onSelect: (t: GaliaWorkflowTemplate) => void;
}) => {
  const getIcon = () => {
    switch (template.icon) {
      case 'FileCheck': return <FileCheck className="h-5 w-5" />;
      case 'Banknote': return <Banknote className="h-5 w-5" />;
      case 'Bell': return <Bell className="h-5 w-5" />;
      case 'Shield': return <Shield className="h-5 w-5" />;
      default: return <Workflow className="h-5 w-5" />;
    }
  };

  const getCategoryColor = () => {
    switch (template.category) {
      case 'expediente': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'pago': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'notificacion': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'auditoria': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md"
      onClick={() => onSelect(template)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg", getCategoryColor())}>
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm">{template.name}</h4>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {template.description}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {template.nodes.length} nodos
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {template.estimatedDuration}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Mini BPMN Viewer
const MiniBPMNViewer = ({ 
  nodes, 
  edges 
}: { 
  nodes: BPMNNode[]; 
  edges: BPMNEdge[];
}) => {
  const scale = 0.4;
  const padding = 20;

  // Calculate bounds
  const bounds = useMemo(() => {
    if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 400, maxY: 200 };
    
    const xs = nodes.map(n => n.position.x);
    const ys = nodes.map(n => n.position.y);
    
    return {
      minX: Math.min(...xs) - padding,
      minY: Math.min(...ys) - padding,
      maxX: Math.max(...xs) + 150 + padding,
      maxY: Math.max(...ys) + 80 + padding,
    };
  }, [nodes]);

  const width = (bounds.maxX - bounds.minX) * scale;
  const height = (bounds.maxY - bounds.minY) * scale;

  const getNodeColor = (type: BPMNNodeType) => {
    switch (type) {
      case 'start': return '#22c55e';
      case 'end': return '#ef4444';
      case 'task': return '#3b82f6';
      case 'gateway_xor': return '#f59e0b';
      case 'gateway_and': return '#8b5cf6';
      case 'gateway_or': return '#06b6d4';
      default: return '#64748b';
    }
  };

  return (
    <div 
      className="bg-muted/30 rounded-lg overflow-hidden border"
      style={{ width: Math.max(width, 200), height: Math.max(height, 100) }}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        {/* Edges */}
        {edges.map(edge => {
          const source = nodes.find(n => n.id === edge.source);
          const target = nodes.find(n => n.id === edge.target);
          if (!source || !target) return null;

          const x1 = (source.position.x - bounds.minX + 50) * scale;
          const y1 = (source.position.y - bounds.minY + 25) * scale;
          const x2 = (target.position.x - bounds.minX) * scale;
          const y2 = (target.position.y - bounds.minY + 25) * scale;

          return (
            <line
              key={edge.id}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#94a3b8"
              strokeWidth={1}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const x = (node.position.x - bounds.minX) * scale;
          const y = (node.position.y - bounds.minY) * scale;
          const color = getNodeColor(node.type);

          if (node.type === 'start' || node.type === 'end') {
            return (
              <circle
                key={node.id}
                cx={x + 15}
                cy={y + 15}
                r={8}
                fill={color}
              />
            );
          }

          if (node.type.startsWith('gateway')) {
            return (
              <rect
                key={node.id}
                x={x + 5}
                y={y + 5}
                width={18}
                height={18}
                fill={color}
                transform={`rotate(45 ${x + 14} ${y + 14})`}
              />
            );
          }

          return (
            <rect
              key={node.id}
              x={x}
              y={y}
              width={40}
              height={20}
              rx={3}
              fill={color}
            />
          );
        })}
      </svg>
    </div>
  );
};

// Execution Status Badge
const ExecutionStatusBadge = ({ status }: { status: string }) => {
  const config = {
    running: { icon: Play, color: 'bg-blue-500/10 text-blue-600', label: 'En ejecución' },
    completed: { icon: CheckCircle, color: 'bg-green-500/10 text-green-600', label: 'Completado' },
    failed: { icon: XCircle, color: 'bg-red-500/10 text-red-600', label: 'Fallido' },
    paused: { icon: Pause, color: 'bg-amber-500/10 text-amber-600', label: 'Pausado' },
  }[status] || { icon: Clock, color: 'bg-muted', label: status };

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("gap-1", config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

// === MAIN COMPONENT ===
interface GaliaBPMNWorkflowsPanelProps {
  galId?: string;
  className?: string;
}

export function GaliaBPMNWorkflowsPanel({ galId, className }: GaliaBPMNWorkflowsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('workflows');
  const [selectedTemplate, setSelectedTemplate] = useState<GaliaWorkflowTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDescription, setNewWorkflowDescription] = useState('');
  const [newWorkflowEntityType, setNewWorkflowEntityType] = useState<string>('expediente');

  const {
    isLoading,
    workflows,
    executions,
    templates,
    suggestions,
    error,
    lastRefresh,
    fetchWorkflows,
    createWorkflow,
    executeWorkflow,
    getAISuggestions,
    createFromTemplate,
    validateWorkflow,
    fetchExecutions,
    startAutoRefresh,
    stopAutoRefresh,
  } = useGaliaBPMNWorkflows();

  // Initial fetch
  useEffect(() => {
    if (galId) {
      startAutoRefresh({ galId }, 120000);
    } else {
      fetchWorkflows();
      fetchExecutions();
    }
    return () => stopAutoRefresh();
  }, [galId]);

  // Handle template selection
  const handleSelectTemplate = useCallback((template: GaliaWorkflowTemplate) => {
    setSelectedTemplate(template);
    setNewWorkflowName(template.name);
    setNewWorkflowDescription(template.description);
    setNewWorkflowEntityType(template.category === 'pago' ? 'pago' : 'expediente');
    setIsCreating(true);
  }, []);

  // Handle create workflow
  const handleCreateWorkflow = useCallback(async () => {
    if (!newWorkflowName.trim()) {
      toast.error('El nombre del workflow es obligatorio');
      return;
    }

    const template = selectedTemplate;
    const nodes = template?.nodes || [];
    const edges = template?.edges || [];

    // Validate
    const validation = validateWorkflow(nodes, edges);
    if (!validation.isValid) {
      validation.errors.forEach(err => toast.error(err));
      return;
    }
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warn => toast.warning(warn));
    }

    await createWorkflow({
      name: newWorkflowName,
      description: newWorkflowDescription,
      entity_type: newWorkflowEntityType as 'expediente' | 'convocatoria' | 'pago' | 'beneficiario',
      nodes,
      edges,
      is_active: true,
      trigger_conditions: { manual: true },
      sla_config: {},
    });

    setIsCreating(false);
    setSelectedTemplate(null);
    setNewWorkflowName('');
    setNewWorkflowDescription('');
  }, [newWorkflowName, newWorkflowDescription, newWorkflowEntityType, selectedTemplate, validateWorkflow, createWorkflow]);

  // Get AI suggestions for selected template
  useEffect(() => {
    if (selectedTemplate) {
      getAISuggestions(selectedTemplate.nodes, selectedTemplate.edges, selectedTemplate.category);
    }
  }, [selectedTemplate?.id]);

  // Stats
  const stats = useMemo(() => ({
    total: workflows.length,
    active: workflows.filter(w => w.is_active).length,
    running: executions.filter(e => e.status === 'running').length,
    completed: executions.filter(e => e.status === 'completed').length,
  }), [workflows, executions]);

  return (
    <Card className={cn(
      "transition-all duration-300 overflow-hidden",
      isExpanded ? "fixed inset-4 z-50 shadow-2xl" : "",
      className
    )}>
      <CardHeader className="pb-2 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <Workflow className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Flujos No-Code BPMN
                <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-600">
                  8E
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                {lastRefresh 
                  ? `Actualizado ${formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}`
                  : 'Diseñador visual de workflows'
                }
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { fetchWorkflows(); fetchExecutions(); }}
              disabled={isLoading}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8"
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="text-center p-2 rounded-lg bg-background/50">
            <div className="text-lg font-bold text-violet-600">{stats.total}</div>
            <div className="text-[10px] text-muted-foreground">Workflows</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-background/50">
            <div className="text-lg font-bold text-green-600">{stats.active}</div>
            <div className="text-[10px] text-muted-foreground">Activos</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-background/50">
            <div className="text-lg font-bold text-blue-600">{stats.running}</div>
            <div className="text-[10px] text-muted-foreground">En ejecución</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-background/50">
            <div className="text-lg font-bold text-emerald-600">{stats.completed}</div>
            <div className="text-[10px] text-muted-foreground">Completados</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn("pt-3", isExpanded ? "h-[calc(100%-180px)]" : "")}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mb-3">
            <TabsTrigger value="workflows" className="text-xs">
              <Workflow className="h-3 w-3 mr-1" />
              Workflows
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-xs">
              <LayoutTemplate className="h-3 w-3 mr-1" />
              Plantillas
            </TabsTrigger>
            <TabsTrigger value="executions" className="text-xs">
              <Play className="h-3 w-3 mr-1" />
              Ejecuciones
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="text-xs">
              <Lightbulb className="h-3 w-3 mr-1" />
              IA
            </TabsTrigger>
          </TabsList>

          {/* WORKFLOWS TAB */}
          <TabsContent value="workflows" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-380px)]" : "h-[280px]"}>
              {error ? (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  {error}
                </div>
              ) : workflows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Workflow className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay workflows configurados</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => setActiveTab('templates')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Crear desde plantilla
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {workflows.map((workflow) => (
                    <Card key={workflow.id} className="hover:border-primary/30 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm truncate">{workflow.name}</h4>
                              <Badge variant={workflow.is_active ? "default" : "secondary"} className="text-xs">
                                {workflow.is_active ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </div>
                            {workflow.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                {workflow.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {workflow.entity_type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Creado {formatDistanceToNow(new Date(workflow.created_at), { locale: es, addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Settings className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-green-600 hover:text-green-700"
                              onClick={() => executeWorkflow(workflow.id, 'test-entity', workflow.entity_type)}
                            >
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* TEMPLATES TAB */}
          <TabsContent value="templates" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-380px)]" : "h-[280px]"}>
              {isCreating && selectedTemplate ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Crear workflow desde plantilla</h4>
                    <Button variant="ghost" size="sm" onClick={() => { setIsCreating(false); setSelectedTemplate(null); }}>
                      Cancelar
                    </Button>
                  </div>

                  {/* Preview */}
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-2">Vista previa del flujo</div>
                    <MiniBPMNViewer nodes={selectedTemplate.nodes} edges={selectedTemplate.edges} />
                  </div>

                  {/* Form */}
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="wf-name" className="text-xs">Nombre del workflow</Label>
                      <Input 
                        id="wf-name"
                        value={newWorkflowName}
                        onChange={(e) => setNewWorkflowName(e.target.value)}
                        placeholder="Ej: Instrucción Expediente LEADER"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="wf-desc" className="text-xs">Descripción</Label>
                      <Textarea 
                        id="wf-desc"
                        value={newWorkflowDescription}
                        onChange={(e) => setNewWorkflowDescription(e.target.value)}
                        placeholder="Descripción del workflow..."
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="wf-entity" className="text-xs">Tipo de entidad</Label>
                      <Select value={newWorkflowEntityType} onValueChange={setNewWorkflowEntityType}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="expediente">Expediente</SelectItem>
                          <SelectItem value="convocatoria">Convocatoria</SelectItem>
                          <SelectItem value="pago">Pago</SelectItem>
                          <SelectItem value="beneficiario">Beneficiario</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* AI Suggestions */}
                  {suggestions.length > 0 && (
                    <div className="p-3 bg-violet-500/5 rounded-lg border border-violet-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-violet-600" />
                        <span className="text-xs font-medium text-violet-600">Sugerencias IA</span>
                      </div>
                      <div className="space-y-2">
                        {suggestions.slice(0, 2).map((suggestion, idx) => (
                          <div key={idx} className="text-xs p-2 bg-background rounded">
                            <div className="font-medium">{suggestion.title}</div>
                            <div className="text-muted-foreground mt-0.5">{suggestion.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button onClick={handleCreateWorkflow} className="w-full" disabled={isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    Crear Workflow
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {templates.map((template) => (
                    <TemplateCard 
                      key={template.id} 
                      template={template} 
                      onSelect={handleSelectTemplate}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* EXECUTIONS TAB */}
          <TabsContent value="executions" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-380px)]" : "h-[280px]"}>
              {executions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Play className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay ejecuciones registradas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {executions.map((execution) => (
                    <Card key={execution.id} className="hover:border-primary/30 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">
                                {execution.entity_id}
                              </span>
                              <ExecutionStatusBadge status={execution.status} />
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Iniciado {formatDistanceToNow(new Date(execution.started_at), { locale: es, addSuffix: true })}
                            </div>
                            {/* Progress */}
                            <div className="mt-2">
                              <div className="flex items-center gap-1 text-xs">
                                {execution.history.map((h, idx) => (
                                  <div key={h.nodeId} className="flex items-center">
                                    <div className={cn(
                                      "px-1.5 py-0.5 rounded text-[10px]",
                                      h.exitedAt ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-600"
                                    )}>
                                      {h.nodeName}
                                    </div>
                                    {idx < execution.history.length - 1 && (
                                      <ArrowRight className="h-3 w-3 text-muted-foreground mx-0.5" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {execution.status === 'running' && (
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Pause className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* AI SUGGESTIONS TAB */}
          <TabsContent value="suggestions" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-380px)]" : "h-[280px]"}>
              <div className="space-y-3">
                <div className="p-3 bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-violet-600" />
                    <span className="font-medium text-sm">Asistente IA para Workflows</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selecciona una plantilla o workflow para recibir sugerencias de optimización basadas en IA.
                  </p>
                </div>

                {suggestions.length > 0 ? (
                  <div className="space-y-2">
                    {suggestions.map((suggestion, idx) => (
                      <Card key={idx} className={cn(
                        "border-l-4",
                        suggestion.type === 'compliance' && "border-l-red-500",
                        suggestion.type === 'automation' && "border-l-blue-500",
                        suggestion.type === 'optimization' && "border-l-green-500"
                      )}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                {suggestion.type === 'compliance' && <Shield className="h-4 w-4 text-red-500" />}
                                {suggestion.type === 'automation' && <Zap className="h-4 w-4 text-blue-500" />}
                                {suggestion.type === 'optimization' && <GitBranch className="h-4 w-4 text-green-500" />}
                                <span className="font-medium text-sm">{suggestion.title}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {suggestion.description}
                              </p>
                            </div>
                            <Badge variant="outline" className={cn(
                              "text-xs",
                              suggestion.impact === 'high' && "bg-red-500/10 text-red-600",
                              suggestion.impact === 'medium' && "bg-amber-500/10 text-amber-600",
                              suggestion.impact === 'low' && "bg-green-500/10 text-green-600"
                            )}>
                              {suggestion.impact === 'high' ? 'Alto' : suggestion.impact === 'medium' ? 'Medio' : 'Bajo'}
                            </Badge>
                          </div>
                          <Button variant="outline" size="sm" className="mt-2 w-full text-xs">
                            Aplicar sugerencia
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Lightbulb className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Selecciona un workflow para analizar</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default GaliaBPMNWorkflowsPanel;
