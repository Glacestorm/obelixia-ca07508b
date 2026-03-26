/**
 * HROffboardingPanel - Panel de Gestión de Salidas (Offboarding)
 * Fase 5 - Sistema de desvinculación optimizado con análisis IA
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  UserMinus, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Brain, 
  Calendar,
  DollarSign,
  Shield,
  Users,
  ArrowRight,
  RefreshCw,
  Plus,
  Sparkles,
  Scale,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  Building2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { HRTerminationAnalysisDialog } from './dialogs';

interface HROffboardingPanelProps {
  companyId: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  job_title?: string;
  hire_date?: string;
}

interface TerminationAnalysis {
  id: string;
  employee_id: string;
  company_id: string;
  termination_type: string;
  status: string;
  proposed_termination_date?: string;
  estimated_cost_min?: number;
  estimated_cost_max?: number;
  ai_analysis?: Record<string, unknown>;
  legal_risks?: Array<{ risk: string; probability: string; mitigation: string }>;
  recommended_approach?: string;
  legal_review_required?: boolean;
  created_at: string;
  employee?: Employee;
  tasks?: OffboardingTask[];
}

interface OffboardingTask {
  id: string;
  task_code: string;
  task_name: string;
  description?: string;
  task_type: string;
  phase: string;
  responsible_type: string;
  status: string;
  due_date?: string;
  completed_at?: string;
}

const TERMINATION_TYPES = [
  { value: 'voluntary', label: 'Baja Voluntaria', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  { value: 'objective', label: 'Despido Objetivo', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  { value: 'disciplinary', label: 'Despido Disciplinario', color: 'bg-red-500/10 text-red-600 border-red-500/30' },
  { value: 'mutual', label: 'Mutuo Acuerdo', color: 'bg-green-500/10 text-green-600 border-green-500/30' },
  { value: 'end_contract', label: 'Fin de Contrato', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
  { value: 'retirement', label: 'Jubilación', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30' },
  { value: 'collective', label: 'ERE/ERTE', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
  { value: 'probation', label: 'Periodo de Prueba', color: 'bg-slate-500/10 text-slate-600 border-slate-500/30' },
];

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Borrador', color: 'bg-slate-500/10 text-slate-600', icon: <FileText className="h-3 w-3" /> },
  under_review: { label: 'En Revisión', color: 'bg-amber-500/10 text-amber-600', icon: <Clock className="h-3 w-3" /> },
  approved: { label: 'Aprobado', color: 'bg-blue-500/10 text-blue-600', icon: <CheckCircle className="h-3 w-3" /> },
  in_progress: { label: 'En Proceso', color: 'bg-purple-500/10 text-purple-600', icon: <ArrowRight className="h-3 w-3" /> },
  executed: { label: 'Ejecutado', color: 'bg-green-500/10 text-green-600', icon: <CheckCircle className="h-3 w-3" /> },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/10 text-red-600', icon: <AlertCircle className="h-3 w-3" /> },
};

export function HROffboardingPanel({ companyId }: HROffboardingPanelProps) {
  const [activeTab, setActiveTab] = useState('active');
  const [terminations, setTerminations] = useState<TerminationAnalysis[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedTermination, setSelectedTermination] = useState<TerminationAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<Record<string, unknown> | null>(null);

  // Form state
  const [newTermination, setNewTermination] = useState({
    employeeId: '',
    terminationType: 'objective',
    proposedDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    reason: '',
    legalReviewRequired: false
  });

  // Fetch terminations
  const fetchTerminations = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_termination_analysis')
        .select(`
          *,
          employee:erp_hr_employees(id, first_name, last_name, job_title, hire_date)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTerminations((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching terminations:', error);
      toast.error('Error al cargar procesos de offboarding');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // Fetch employees for selection
  const fetchEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('erp_hr_employees')
        .select('id, first_name, last_name, job_title, hire_date')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('last_name');

      if (error) throw error;
      setEmployees((data as Employee[]) || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  }, [companyId]);

  useEffect(() => {
    fetchTerminations();
    fetchEmployees();
  }, [fetchTerminations, fetchEmployees]);

  // AI Analysis
  const runAnalysis = async (type: string) => {
    if (!selectedTermination?.employee) return;
    
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-offboarding-agent', {
        body: {
          action: type,
          employeeId: selectedTermination.employee_id,
          terminationId: selectedTermination.id,
          terminationType: selectedTermination.termination_type,
          terminationDate: selectedTermination.proposed_termination_date,
          context: {
            employee: selectedTermination.employee,
            termination: selectedTermination
          }
        }
      });

      if (error) throw error;

      if (data?.success) {
        setAnalysisResult(data.data);
        toast.success('Análisis completado');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Error en el análisis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Create new termination
  const createTermination = async () => {
    if (!newTermination.employeeId || !newTermination.terminationType) {
      toast.error('Selecciona un empleado y tipo de desvinculación');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('erp_hr_termination_analysis')
        .insert([{
          company_id: companyId,
          employee_id: newTermination.employeeId,
          termination_type: newTermination.terminationType,
          proposed_termination_date: newTermination.proposedDate,
          termination_reason: newTermination.reason,
          legal_review_required: newTermination.legalReviewRequired,
          status: 'draft'
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Proceso de offboarding creado');
      setShowNewDialog(false);
      setNewTermination({
        employeeId: '',
        terminationType: 'objective',
        proposedDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        reason: '',
        legalReviewRequired: false
      });
      fetchTerminations();
    } catch (error) {
      console.error('Error creating termination:', error);
      toast.error('Error al crear proceso');
    }
  };

  // Generate AI tasks
  const generateTasks = async (terminationId: string) => {
    const termination = terminations.find(t => t.id === terminationId);
    if (!termination) return;

    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-offboarding-agent', {
        body: {
          action: 'generate_tasks',
          terminationId,
          terminationType: termination.termination_type,
          terminationDate: termination.proposed_termination_date,
          context: {
            employee: termination.employee
          }
        }
      });

      if (error) throw error;

      if (data?.success && data.data?.tasks) {
        // Insert generated tasks
        const tasks = data.data.tasks.map((task: any) => ({
          termination_id: terminationId,
          task_code: task.task_code,
          task_name: task.task_name,
          description: task.description,
          task_type: task.task_type,
          phase: task.phase,
          responsible_type: task.responsible_type,
          order_in_phase: task.order_in_phase,
          due_date: task.days_before_termination && termination.proposed_termination_date
            ? format(addDays(new Date(termination.proposed_termination_date), -task.days_before_termination), 'yyyy-MM-dd')
            : null,
          ai_generated: true,
          status: 'pending'
        }));

        const { error: insertError } = await supabase
          .from('erp_hr_offboarding_tasks')
          .insert(tasks);

        if (insertError) throw insertError;

        toast.success(`${tasks.length} tareas generadas`);
        fetchTerminations();
      }
    } catch (error) {
      console.error('Error generating tasks:', error);
      toast.error('Error al generar tareas');
    }
  };

  // Filter terminations by status
  const activeTerminations = terminations.filter(t => 
    ['draft', 'under_review', 'approved', 'in_progress'].includes(t.status)
  );
  const completedTerminations = terminations.filter(t => 
    ['executed', 'cancelled'].includes(t.status)
  );

  const getTypeConfig = (type: string) => TERMINATION_TYPES.find(t => t.value === type) || TERMINATION_TYPES[0];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <UserMinus className="h-5 w-5 text-primary" />
            Gestión de Salidas (Offboarding)
          </h2>
          <p className="text-sm text-muted-foreground">
            Procesos de desvinculación optimizados con análisis IA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTerminations} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
            Actualizar
          </Button>
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nuevo Proceso
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Iniciar Proceso de Offboarding</DialogTitle>
                <DialogDescription>
                  Selecciona el empleado y configura el tipo de desvinculación
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Empleado</Label>
                  <Select
                    value={newTermination.employeeId}
                    onValueChange={(v) => setNewTermination(prev => ({ ...prev, employeeId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} - {emp.job_title || 'Sin puesto'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Desvinculación</Label>
                  <Select
                    value={newTermination.terminationType}
                    onValueChange={(v) => setNewTermination(prev => ({ ...prev, terminationType: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TERMINATION_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fecha Propuesta de Terminación</Label>
                  <Input
                    type="date"
                    value={newTermination.proposedDate}
                    onChange={(e) => setNewTermination(prev => ({ ...prev, proposedDate: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Motivo (opcional)</Label>
                  <Textarea
                    placeholder="Describe el motivo de la desvinculación..."
                    value={newTermination.reason}
                    onChange={(e) => setNewTermination(prev => ({ ...prev, reason: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="legal-review"
                    checked={newTermination.legalReviewRequired}
                    onCheckedChange={(checked) => 
                      setNewTermination(prev => ({ ...prev, legalReviewRequired: checked as boolean }))
                    }
                  />
                  <Label htmlFor="legal-review" className="text-sm">
                    Requiere revisión legal
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={createTermination}>
                  Crear Proceso
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeTerminations.length}</p>
                <p className="text-xs text-muted-foreground">En Proceso</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {completedTerminations.filter(t => t.status === 'executed').length}
                </p>
                <p className="text-xs text-muted-foreground">Completados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activeTerminations.filter(t => t.legal_review_required).length}
                </p>
                <p className="text-xs text-muted-foreground">Revisión Legal</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Brain className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activeTerminations.filter(t => t.ai_analysis && Object.keys(t.ai_analysis).length > 0).length}
                </p>
                <p className="text-xs text-muted-foreground">Con Análisis IA</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active" className="gap-1">
            <Clock className="h-3 w-3" />
            Activos ({activeTerminations.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Completados ({completedTerminations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeTerminations.length === 0 ? (
              <Card className="col-span-full border-dashed">
                <CardContent className="py-12 text-center">
                  <UserMinus className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No hay procesos de offboarding activos</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setShowNewDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Iniciar Proceso
                  </Button>
                </CardContent>
              </Card>
            ) : (
              activeTerminations.map(termination => {
                const typeConfig = getTypeConfig(termination.termination_type);
                const statusConfig = STATUS_LABELS[termination.status];

                return (
                  <Card 
                    key={termination.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedTermination(termination);
                      setShowAnalysisDialog(true);
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">
                            {termination.employee?.first_name} {termination.employee?.last_name}
                          </CardTitle>
                          <CardDescription>
                            {termination.employee?.job_title || 'Sin puesto'}
                          </CardDescription>
                        </div>
                        <Badge className={cn("text-xs", statusConfig?.color)}>
                          {statusConfig?.icon}
                          <span className="ml-1">{statusConfig?.label}</span>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={typeConfig.color}>
                          {typeConfig.label}
                        </Badge>
                        {termination.legal_review_required && (
                          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                            <Scale className="h-3 w-3 mr-1" />
                            Legal
                          </Badge>
                        )}
                      </div>

                      {termination.proposed_termination_date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Fecha: {format(new Date(termination.proposed_termination_date), 'dd/MM/yyyy')}
                          </span>
                        </div>
                      )}

                      {(termination.estimated_cost_min || termination.estimated_cost_max) && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-green-500" />
                          <span>
                            €{termination.estimated_cost_min?.toLocaleString()} - €{termination.estimated_cost_max?.toLocaleString()}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-xs text-muted-foreground">
                          Creado {formatDistanceToNow(new Date(termination.created_at), { 
                            locale: es, 
                            addSuffix: true 
                          })}
                        </span>
                        <Button variant="ghost" size="sm" className="h-7 gap-1">
                          <Brain className="h-3 w-3" />
                          Analizar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedTerminations.length === 0 ? (
              <Card className="col-span-full border-dashed">
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No hay procesos completados</p>
                </CardContent>
              </Card>
            ) : (
              completedTerminations.map(termination => {
                const typeConfig = getTypeConfig(termination.termination_type);
                const statusConfig = STATUS_LABELS[termination.status];

                return (
                  <Card key={termination.id} className="opacity-75">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">
                            {termination.employee?.first_name} {termination.employee?.last_name}
                          </CardTitle>
                          <CardDescription>
                            {termination.employee?.job_title || 'Sin puesto'}
                          </CardDescription>
                        </div>
                        <Badge className={cn("text-xs", statusConfig?.color)}>
                          {statusConfig?.icon}
                          <span className="ml-1">{statusConfig?.label}</span>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="outline" className={typeConfig.color}>
                        {typeConfig.label}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Analysis Dialog - Structured View */}
      <HRTerminationAnalysisDialog
        open={showAnalysisDialog}
        onOpenChange={setShowAnalysisDialog}
        employeeId={selectedTermination?.employee_id || ''}
        employeeName={selectedTermination?.employee ? `${selectedTermination.employee.first_name} ${selectedTermination.employee.last_name}` : ''}
        terminationType={getTypeConfig(selectedTermination?.termination_type || '').label}
        analysisResult={analysisResult as any}
        isLoading={isAnalyzing}
        onRunAnalysis={(type) => {
          const actionMap: Record<string, string> = {
            'risks': 'analyze_termination',
            'dates': 'suggest_optimal_dates',
            'costs': 'calculate_costs',
            'tasks': 'generate_tasks'
          };
          if (type === 'tasks' && selectedTermination?.id) {
            generateTasks(selectedTermination.id);
          } else {
            runAnalysis(actionMap[type] || type);
          }
        }}
      />
    </div>
  );
}

export default HROffboardingPanel;