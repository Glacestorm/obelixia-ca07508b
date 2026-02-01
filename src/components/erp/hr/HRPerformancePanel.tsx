/**
 * HRPerformancePanel - Sistema de Evaluación del Desempeño y Bonus
 * Fase 6: Ciclos de evaluación, objetivos, 9-Box Grid y compensación variable
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  Target,
  TrendingUp,
  Award,
  Users,
  Brain,
  Sparkles,
  Plus,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  Grid3X3,
  DollarSign,
  Star,
  ChevronRight,
  RefreshCw,
  FileText,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  ArrowUp,
  ArrowDown,
  Minus,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { HRBonusConfigDialog, HRObjectiveFormDialog } from './dialogs';

interface HRPerformancePanelProps {
  companyId: string;
}

interface EvaluationCycle {
  id: string;
  name: string;
  cycle_type: string;
  start_date: string;
  end_date: string;
  status: string;
  evaluation_deadline: string | null;
  self_evaluation_enabled: boolean;
  peer_evaluation_enabled: boolean;
  manager_evaluation_required: boolean;
  hr_approval_required: boolean;
}

interface EmployeeObjective {
  id: string;
  employee_id: string;
  cycle_id: string;
  title: string;
  description: string | null;
  objective_type: string;
  target_value: number | null;
  target_unit: string | null;
  current_value: number | null;
  weight_percentage: number;
  status: string;
  achievement_percentage: number;
  due_date: string | null;
  ai_suggested: boolean;
}

interface TalentGridEntry {
  id: string;
  employee_id: string;
  performance_axis: number;
  potential_axis: number;
  grid_position: string;
  flight_risk_score: number | null;
  assessment_notes: string | null;
}

const CYCLE_TYPE_LABELS: Record<string, string> = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  semi_annual: 'Semestral',
  annual: 'Anual'
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activo',
  review: 'En Revisión',
  completed: 'Completado',
  cancelled: 'Cancelado'
};

const OBJECTIVE_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  achieved: 'Logrado',
  partially_achieved: 'Parcialmente',
  not_achieved: 'No Logrado',
  cancelled: 'Cancelado'
};

const GRID_POSITION_LABELS: Record<string, { label: string; color: string; description: string }> = {
  star: { label: 'Estrella', color: 'bg-yellow-500', description: 'Alto rendimiento + Alto potencial' },
  high_performer: { label: 'Alto Rendimiento', color: 'bg-green-500', description: 'Alto rendimiento + Potencial medio' },
  solid_performer: { label: 'Sólido', color: 'bg-blue-500', description: 'Alto rendimiento + Potencial bajo' },
  high_potential: { label: 'Alto Potencial', color: 'bg-purple-500', description: 'Rendimiento medio + Alto potencial' },
  core_player: { label: 'Pilar', color: 'bg-cyan-500', description: 'Rendimiento medio + Potencial medio' },
  effective: { label: 'Efectivo', color: 'bg-teal-500', description: 'Rendimiento medio + Potencial bajo' },
  inconsistent: { label: 'Inconsistente', color: 'bg-orange-500', description: 'Bajo rendimiento + Alto potencial' },
  dilemma: { label: 'Dilema', color: 'bg-amber-500', description: 'Bajo rendimiento + Potencial medio' },
  underperformer: { label: 'Bajo Rendimiento', color: 'bg-red-500', description: 'Bajo rendimiento + Bajo potencial' }
};

export function HRPerformancePanel({ companyId }: HRPerformancePanelProps) {
  const [activeTab, setActiveTab] = useState('cycles');
  const [cycles, setCycles] = useState<EvaluationCycle[]>([]);
  const [objectives, setObjectives] = useState<EmployeeObjective[]>([]);
  const [talentGrid, setTalentGrid] = useState<TalentGridEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCycle, setSelectedCycle] = useState<EvaluationCycle | null>(null);
  const [showCycleDialog, setShowCycleDialog] = useState(false);
  const [showObjectiveDialog, setShowObjectiveDialog] = useState(false);
  const [showBonusConfigDialog, setShowBonusConfigDialog] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Form states
  const [cycleForm, setCycleForm] = useState({
    name: '',
    cycle_type: 'annual',
    start_date: '',
    end_date: '',
    evaluation_deadline: '',
    self_evaluation_enabled: true,
    peer_evaluation_enabled: false,
    manager_evaluation_required: true,
    hr_approval_required: true
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch cycles
      const { data: cyclesData, error: cyclesError } = await supabase
        .from('erp_hr_evaluation_cycles')
        .select('*')
        .eq('company_id', companyId)
        .order('start_date', { ascending: false });

      if (cyclesError) throw cyclesError;
      setCycles((cyclesData || []) as EvaluationCycle[]);

      // Fetch objectives if we have cycles
      if (cyclesData && cyclesData.length > 0) {
        const { data: objectivesData, error: objError } = await supabase
          .from('erp_hr_employee_objectives')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!objError && objectivesData) {
          setObjectives(objectivesData as EmployeeObjective[]);
        }

        // Fetch talent grid
        const { data: gridData, error: gridError } = await supabase
          .from('erp_hr_talent_grid')
          .select('*')
          .eq('company_id', companyId);

        if (!gridError && gridData) {
          setTalentGrid(gridData as TalentGridEntry[]);
        }
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
      toast.error('Error al cargar datos de desempeño');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create evaluation cycle
  const handleCreateCycle = async () => {
    try {
      const { error } = await supabase
        .from('erp_hr_evaluation_cycles')
        .insert([{
          company_id: companyId,
          ...cycleForm,
          status: 'draft'
        }]);

      if (error) throw error;

      toast.success('Ciclo de evaluación creado');
      setShowCycleDialog(false);
      setCycleForm({
        name: '',
        cycle_type: 'annual',
        start_date: '',
        end_date: '',
        evaluation_deadline: '',
        self_evaluation_enabled: true,
        peer_evaluation_enabled: false,
        manager_evaluation_required: true,
        hr_approval_required: true
      });
      fetchData();
    } catch (error) {
      console.error('Error creating cycle:', error);
      toast.error('Error al crear ciclo');
    }
  };

  // AI: Suggest objectives
  const handleAISuggestObjectives = async (employeeId: string, cycleId: string) => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-performance-agent', {
        body: {
          action: 'suggest_objectives',
          company_id: companyId,
          employee_id: employeeId,
          cycle_id: cycleId,
          params: {
            job_title: 'Analista Senior',
            department: 'Finanzas',
            cnae: '6420'
          }
        }
      });

      if (error) throw error;

      if (data?.success && data?.data?.suggested_objectives) {
        toast.success(`IA generó ${data.data.suggested_objectives.length} objetivos sugeridos`);
        // Aquí se podrían crear automáticamente o mostrar para revisión
      }
    } catch (error) {
      console.error('AI suggest objectives error:', error);
      toast.error('Error al generar objetivos con IA');
    } finally {
      setAiLoading(false);
    }
  };

  // AI: Predict flight risk
  const handleAIPredictFlightRisk = async (employeeId: string) => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-performance-agent', {
        body: {
          action: 'predict_flight_risk',
          company_id: companyId,
          employee_id: employeeId,
          params: {
            employee_data: { tenure_months: 24, last_promotion_months: 18 },
            evaluation_history: [],
            cnae: '6420'
          }
        }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        const riskData = data.data;
        toast.info(`Riesgo de fuga: ${riskData.flight_risk_score}% (${riskData.risk_level})`);
      }
    } catch (error) {
      console.error('AI predict flight risk error:', error);
      toast.error('Error al predecir riesgo de fuga');
    } finally {
      setAiLoading(false);
    }
  };

  // Stats calculations
  const activeCycles = cycles.filter(c => c.status === 'active').length;
  const totalObjectives = objectives.length;
  const achievedObjectives = objectives.filter(o => o.status === 'achieved').length;
  const avgAchievement = objectives.length > 0
    ? Math.round(objectives.reduce((acc, o) => acc + (o.achievement_percentage || 0), 0) / objectives.length)
    : 0;

  // 9-Box Grid distribution
  const gridDistribution = {
    star: talentGrid.filter(t => t.grid_position === 'star').length,
    high_performer: talentGrid.filter(t => t.grid_position === 'high_performer').length,
    core_player: talentGrid.filter(t => t.grid_position === 'core_player').length,
    underperformer: talentGrid.filter(t => t.grid_position === 'underperformer').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ciclos Activos</p>
                <p className="text-2xl font-bold">{activeCycles}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Objetivos</p>
                <p className="text-2xl font-bold">{totalObjectives}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Logrados</p>
                <p className="text-2xl font-bold">{achievedObjectives}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">% Logro Medio</p>
                <p className="text-2xl font-bold">{avgAchievement}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cycles" className="gap-2">
            <Calendar className="h-4 w-4" />
            Ciclos
          </TabsTrigger>
          <TabsTrigger value="objectives" className="gap-2">
            <Target className="h-4 w-4" />
            Objetivos
          </TabsTrigger>
          <TabsTrigger value="9box" className="gap-2">
            <Grid3X3 className="h-4 w-4" />
            9-Box
          </TabsTrigger>
          <TabsTrigger value="bonus" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Bonus
          </TabsTrigger>
        </TabsList>

        {/* Cycles Tab */}
        <TabsContent value="cycles" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Ciclos de Evaluación</h3>
            <Dialog open={showCycleDialog} onOpenChange={setShowCycleDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo Ciclo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Crear Ciclo de Evaluación</DialogTitle>
                  <DialogDescription>
                    Define un nuevo período de evaluación del desempeño
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nombre del Ciclo</Label>
                    <Input
                      value={cycleForm.name}
                      onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })}
                      placeholder="Ej: Evaluación Anual 2026"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={cycleForm.cycle_type}
                        onValueChange={(v) => setCycleForm({ ...cycleForm, cycle_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Mensual</SelectItem>
                          <SelectItem value="quarterly">Trimestral</SelectItem>
                          <SelectItem value="semi_annual">Semestral</SelectItem>
                          <SelectItem value="annual">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha Límite Eval.</Label>
                      <Input
                        type="date"
                        value={cycleForm.evaluation_deadline}
                        onChange={(e) => setCycleForm({ ...cycleForm, evaluation_deadline: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fecha Inicio</Label>
                      <Input
                        type="date"
                        value={cycleForm.start_date}
                        onChange={(e) => setCycleForm({ ...cycleForm, start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha Fin</Label>
                      <Input
                        type="date"
                        value={cycleForm.end_date}
                        onChange={(e) => setCycleForm({ ...cycleForm, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCycleDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateCycle}>
                    Crear Ciclo
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {cycles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h4 className="font-medium mb-2">Sin ciclos de evaluación</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Crea tu primer ciclo para comenzar a evaluar el desempeño
                </p>
                <Button onClick={() => setShowCycleDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Ciclo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {cycles.map((cycle) => (
                <Card key={cycle.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-3 rounded-lg",
                          cycle.status === 'active' ? "bg-green-500/20" : "bg-muted"
                        )}>
                          <Calendar className={cn(
                            "h-5 w-5",
                            cycle.status === 'active' ? "text-green-500" : "text-muted-foreground"
                          )} />
                        </div>
                        <div>
                          <h4 className="font-medium">{cycle.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">
                              {CYCLE_TYPE_LABELS[cycle.cycle_type] || cycle.cycle_type}
                            </Badge>
                            <Badge variant={cycle.status === 'active' ? 'default' : 'secondary'}>
                              {STATUS_LABELS[cycle.status] || cycle.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(cycle.start_date), 'dd MMM yyyy', { locale: es })} -
                          {format(new Date(cycle.end_date), 'dd MMM yyyy', { locale: es })}
                        </p>
                        {cycle.evaluation_deadline && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Límite: {format(new Date(cycle.evaluation_deadline), 'dd MMM', { locale: es })}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Objectives Tab */}
        <TabsContent value="objectives" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Objetivos de Empleados</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  if (cycles.length === 0) {
                    toast.error('Crea primero un ciclo de evaluación');
                    return;
                  }
                  setAiLoading(true);
                  handleAISuggestObjectives('demo-employee', cycles[0]?.id || '');
                }}
                disabled={aiLoading || cycles.length === 0}
              >
                {aiLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                IA: Sugerir
              </Button>
              <Button className="gap-2" onClick={() => setShowObjectiveDialog(true)}>
                <Plus className="h-4 w-4" />
                Nuevo Objetivo
              </Button>
            </div>
          </div>

          {objectives.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h4 className="font-medium mb-2">Sin objetivos definidos</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Define objetivos SMART para los empleados o usa la IA para sugerirlos
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Objetivo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Peso</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {objectives.slice(0, 10).map((obj) => (
                    <TableRow key={obj.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {obj.ai_suggested && (
                            <Sparkles className="h-3 w-3 text-purple-500" />
                          )}
                          <span className="font-medium">{obj.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {obj.objective_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{obj.weight_percentage}%</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={obj.achievement_percentage} className="w-16 h-2" />
                          <span className="text-xs">{obj.achievement_percentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={obj.status === 'achieved' ? 'default' : 'secondary'}>
                          {OBJECTIVE_STATUS_LABELS[obj.status] || obj.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* 9-Box Grid Tab */}
        <TabsContent value="9box" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Matriz de Talento (9-Box Grid)</h3>
            <Button variant="outline" className="gap-2" disabled={aiLoading}>
              <Brain className="h-4 w-4" />
              Analizar con IA
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 9-Box Visual Grid */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribución del Talento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-1">
                  {/* Row 3 (High Potential) */}
                  <div className="aspect-square bg-orange-500/20 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-medium">Inconsistente</span>
                    <span className="text-lg font-bold">{gridDistribution.star}</span>
                  </div>
                  <div className="aspect-square bg-purple-500/20 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-medium">Alto Potencial</span>
                    <span className="text-lg font-bold">0</span>
                  </div>
                  <div className="aspect-square bg-yellow-500/20 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                    <Star className="h-4 w-4 text-yellow-500 mb-1" />
                    <span className="text-xs font-medium">Estrella</span>
                    <span className="text-lg font-bold">{gridDistribution.star}</span>
                  </div>

                  {/* Row 2 (Medium Potential) */}
                  <div className="aspect-square bg-amber-500/20 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-medium">Dilema</span>
                    <span className="text-lg font-bold">0</span>
                  </div>
                  <div className="aspect-square bg-cyan-500/20 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-medium">Pilar</span>
                    <span className="text-lg font-bold">{gridDistribution.core_player}</span>
                  </div>
                  <div className="aspect-square bg-green-500/20 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-medium">Alto Rend.</span>
                    <span className="text-lg font-bold">{gridDistribution.high_performer}</span>
                  </div>

                  {/* Row 1 (Low Potential) */}
                  <div className="aspect-square bg-red-500/20 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-medium">Bajo Rend.</span>
                    <span className="text-lg font-bold">{gridDistribution.underperformer}</span>
                  </div>
                  <div className="aspect-square bg-teal-500/20 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-medium">Efectivo</span>
                    <span className="text-lg font-bold">0</span>
                  </div>
                  <div className="aspect-square bg-blue-500/20 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-medium">Sólido</span>
                    <span className="text-lg font-bold">0</span>
                  </div>
                </div>
                <div className="flex justify-between mt-4 text-xs text-muted-foreground">
                  <span>← Bajo Rendimiento</span>
                  <span>Alto Rendimiento →</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Riesgo de Fuga</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Alto Riesgo</span>
                      <Badge variant="destructive">0</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Riesgo Medio</span>
                      <Badge variant="outline" className="bg-amber-500/20">0</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Bajo Riesgo</span>
                      <Badge variant="outline" className="bg-green-500/20">0</Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4 gap-2"
                    onClick={() => handleAIPredictFlightRisk('demo-employee')}
                    disabled={aiLoading}
                  >
                    {aiLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    Analizar Riesgo
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Candidatos Sucesión</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Identifica automáticamente empleados con alto potencial para roles críticos
                  </p>
                  <Button variant="outline" className="w-full mt-4 gap-2">
                    <Users className="h-4 w-4" />
                    Ver Pipeline
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Bonus Tab */}
        <TabsContent value="bonus" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Configuración de Bonus</h3>
            <Button className="gap-2" onClick={() => setShowBonusConfigDialog(true)}>
              <Settings className="h-4 w-4" />
              Nueva Configuración
            </Button>
          </div>

          <Card>
            <CardContent className="py-12 text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h4 className="font-medium mb-2">Sin configuración de bonus</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Define los parámetros de compensación variable basada en desempeño
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Importar Política
                </Button>
                <Button onClick={() => setShowBonusConfigDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Política
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bonus Distribution Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Métodos de Distribución</CardTitle>
              <CardDescription>
                Selecciona cómo se repartirá el pool de bonus entre empleados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border hover:border-primary cursor-pointer transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <span className="font-medium">Por Rendimiento</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Distribuye según puntuación de evaluación
                  </p>
                </div>
                <div className="p-4 rounded-lg border hover:border-primary cursor-pointer transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="font-medium">Por Salario</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Proporcional al salario base
                  </p>
                </div>
                <div className="p-4 rounded-lg border hover:border-primary cursor-pointer transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-medium">Híbrido</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Combina rendimiento + antigüedad + departamento
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bonus Config Dialog */}
      <HRBonusConfigDialog
        open={showBonusConfigDialog}
        onOpenChange={setShowBonusConfigDialog}
        companyId={companyId}
        onConfigCreated={() => {
          toast.success('Política de bonus configurada');
        }}
      />

      {/* Objective Form Dialog */}
      <HRObjectiveFormDialog
        open={showObjectiveDialog}
        onOpenChange={setShowObjectiveDialog}
        companyId={companyId}
        cycleId={cycles[0]?.id}
        onSuccess={fetchData}
      />
    </div>
  );
}

export default HRPerformancePanel;
