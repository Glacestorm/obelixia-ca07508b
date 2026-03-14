/**
 * HRPayrollRecalculationPanel - Panel principal de recálculo de nóminas
 * Permite recalcular nóminas verificando cumplimiento de convenios colectivos
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileCheck,
  Brain,
  Scale,
  UserCheck,
  Search,
  Filter,
  Download,
  Play,
  Pause,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { HRPayrollRecalculationDialog } from './dialogs/HRPayrollRecalculationDialog';

interface RecalculationRecord {
  id: string;
  employee_id: string;
  employee_name?: string;
  period: string;
  status: string;
  ai_validation_status?: string;
  legal_validation_status?: string;
  hr_approval_status?: string;
  differences?: Record<string, { original: number; recalculated: number; diff: number }>;
  compliance_issues?: Array<{ type: string; severity: string; message: string }>;
  original_values?: Record<string, number>;
  recalculated_values?: Record<string, number>;
  ai_validation?: { status: string; analysis: string; recommendations: string[] };
  legal_validation?: { status: string; opinion: string; risk_level: string };
  hr_approval?: { status: string; approver: string; notes: string; approved_at: string };
  run_id?: string | null;
  source_run_id?: string | null;
  created_at: string;
}

interface HRPayrollRecalculationPanelProps {
  companyId: string;
  employees?: Array<{ id: string; full_name: string; employee_number?: string }>;
}

export function HRPayrollRecalculationPanel({ companyId, employees = [] }: HRPayrollRecalculationPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalculations, setRecalculations] = useState<RecalculationRecord[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecalculation, setSelectedRecalculation] = useState<RecalculationRecord | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [progress, setProgress] = useState(0);

  // Generar opciones de período (últimos 12 meses)
  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: format(date, 'MMMM yyyy', { locale: es })
    };
  });

  // Cargar recálculos existentes
  const loadRecalculations = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_payroll_recalculations')
        .select('*, run_id, source_run_id')
        .eq('company_id', companyId)
        .eq('period', selectedPeriod)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map database records to RecalculationRecord interface
      const mapped: RecalculationRecord[] = (data || []).map((rec) => ({
        id: rec.id,
        employee_id: rec.employee_id,
        employee_name: undefined, // Would need join to get name
        period: rec.period,
        status: rec.status,
        ai_validation_status: rec.ai_validation_status || undefined,
        legal_validation_status: rec.legal_validation_status || undefined,
        hr_approval_status: rec.hr_approval_status || undefined,
        differences: rec.differences as RecalculationRecord['differences'],
        compliance_issues: rec.compliance_issues as RecalculationRecord['compliance_issues'],
        original_values: rec.original_values as Record<string, number>,
        recalculated_values: rec.recalculated_values as Record<string, number>,
        ai_validation: rec.ai_validation as RecalculationRecord['ai_validation'],
        legal_validation: rec.legal_validation as RecalculationRecord['legal_validation'],
        hr_approval: rec.hr_approval as RecalculationRecord['hr_approval'],
        run_id: (rec as any).run_id || null,
        source_run_id: (rec as any).source_run_id || null,
        created_at: rec.created_at
      }));
      
      setRecalculations(mapped);
    } catch (error) {
      console.error('Error loading recalculations:', error);
      toast.error('Error al cargar los recálculos');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, selectedPeriod]);

  // Cargar datos al montar y cuando cambie el período
  useEffect(() => {
    loadRecalculations();
  }, [loadRecalculations]);

  // Ejecutar recálculo individual
  const handleSingleRecalculation = async (employeeId: string) => {
    setIsRecalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-payroll-recalculation', {
        body: {
          action: 'recalculate_single',
          employee_id: employeeId,
          period: selectedPeriod,
          company_id: companyId
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Recálculo completado');
        await loadRecalculations();
      } else {
        throw new Error(data?.error || 'Error en el recálculo');
      }
    } catch (error) {
      console.error('Recalculation error:', error);
      toast.error('Error al recalcular nómina');
    } finally {
      setIsRecalculating(false);
    }
  };

  // Ejecutar recálculo masivo
  const handleBatchRecalculation = async () => {
    const targetEmployees = selectedEmployee === 'all' 
      ? employees.map(e => e.id)
      : [selectedEmployee];

    setIsRecalculating(true);
    setProgress(0);

    try {
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < targetEmployees.length; i += batchSize) {
        batches.push(targetEmployees.slice(i, i + batchSize));
      }

      for (let i = 0; i < batches.length; i++) {
        const { data, error } = await supabase.functions.invoke('erp-hr-payroll-recalculation', {
          body: {
            action: 'recalculate_batch',
            employee_ids: batches[i],
            period: selectedPeriod,
            company_id: companyId
          }
        });

        if (error) throw error;

        setProgress(Math.round(((i + 1) / batches.length) * 100));
      }

      toast.success(`Recálculo completado para ${targetEmployees.length} empleados`);
      await loadRecalculations();
    } catch (error) {
      console.error('Batch recalculation error:', error);
      toast.error('Error en el recálculo masivo');
    } finally {
      setIsRecalculating(false);
      setProgress(0);
    }
  };

  // Filtrar recálculos
  const filteredRecalculations = recalculations.filter(rec => {
    if (statusFilter !== 'all' && rec.status !== statusFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return rec.employee_name?.toLowerCase().includes(search);
    }
    return true;
  });

  // Obtener badge de estado
  const getStatusBadge = (status: string) => {
    const configs: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: React.ElementType }> = {
      draft: { variant: 'outline', label: 'Borrador', icon: Clock },
      ai_reviewed: { variant: 'secondary', label: 'IA Revisado', icon: Brain },
      legal_reviewed: { variant: 'secondary', label: 'Legal Revisado', icon: Scale },
      pending_approval: { variant: 'default', label: 'Pendiente HR', icon: UserCheck },
      approved: { variant: 'default', label: 'Aprobado', icon: CheckCircle },
      rejected: { variant: 'destructive', label: 'Rechazado', icon: AlertTriangle }
    };

    const config = configs[status] || configs.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Contar por estado
  const statusCounts = {
    total: recalculations.length,
    pending: recalculations.filter(r => r.status === 'pending_approval').length,
    issues: recalculations.filter(r => (r.compliance_issues?.length || 0) > 0).length,
    approved: recalculations.filter(r => r.status === 'approved').length
  };

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calculator className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.total}</p>
                <p className="text-sm text-muted-foreground">Total Recálculos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.pending}</p>
                <p className="text-sm text-muted-foreground">Pendientes Aprobación</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.issues}</p>
                <p className="text-sm text-muted-foreground">Con Incidencias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.approved}</p>
                <p className="text-sm text-muted-foreground">Aprobados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel principal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Recálculo de Nóminas con Convenios
              </CardTitle>
              <CardDescription>
                Verifica cumplimiento de convenios colectivos y recalcula conceptos salariales
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadRecalculations}
                disabled={isLoading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                Actualizar
              </Button>
              <Button
                size="sm"
                onClick={handleBatchRecalculation}
                disabled={isRecalculating || employees.length === 0}
              >
                {isRecalculating ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Recalcular {selectedEmployee === 'all' ? 'Todos' : 'Seleccionado'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progreso de recálculo */}
          {isRecalculating && progress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Procesando recálculos...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Empleado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los empleados</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="ai_reviewed">IA Revisado</SelectItem>
                  <SelectItem value="pending_approval">Pendiente HR</SelectItem>
                  <SelectItem value="approved">Aprobado</SelectItem>
                  <SelectItem value="rejected">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empleado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Tabla de recálculos */}
          <ScrollArea className="h-[400px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Run</TableHead>
                  <TableHead>Validación IA</TableHead>
                  <TableHead>Validación Legal</TableHead>
                  <TableHead>Incidencias</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecalculations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {isLoading ? 'Cargando...' : 'No hay recálculos para este período'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecalculations.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-medium">
                        {rec.employee_name || 'Empleado'}
                      </TableCell>
                      <TableCell>{rec.period}</TableCell>
                      <TableCell>{getStatusBadge(rec.status)}</TableCell>
                      <TableCell>
                        {rec.ai_validation_status ? (
                          <Badge variant={rec.ai_validation_status === 'approved' ? 'default' : 'secondary'}>
                            <Brain className="h-3 w-3 mr-1" />
                            {rec.ai_validation_status === 'approved' ? 'OK' : 'Pendiente'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {rec.legal_validation_status ? (
                          <Badge variant={rec.legal_validation_status === 'approved' ? 'default' : 'secondary'}>
                            <Scale className="h-3 w-3 mr-1" />
                            {rec.legal_validation_status === 'approved' ? 'OK' : 'Pendiente'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(rec.compliance_issues?.length || 0) > 0 ? (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {rec.compliance_issues?.length}
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Sin incidencias
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRecalculation(rec);
                            setShowDetailDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialog de detalle */}
      {selectedRecalculation && (
        <HRPayrollRecalculationDialog
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
          recalculation={selectedRecalculation}
          onApproved={() => {
            loadRecalculations();
            setShowDetailDialog(false);
          }}
        />
      )}
    </div>
  );
}

export default HRPayrollRecalculationPanel;
