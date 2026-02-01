/**
 * HRSeveranceCalculatorDialog - Calculador de finiquitos e indemnizaciones
 * Supervisado por el Agente IA con explicación paso a paso
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calculator, 
  User, 
  Calendar, 
  DollarSign, 
  Brain, 
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface HRSeveranceCalculatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  preselectedEmployeeId?: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  employee_number: string;
  hire_date: string;
  base_salary: number;
  department_id?: string;
}

// Helper to get full name
const getFullName = (emp: Employee) => `${emp.first_name} ${emp.last_name}`.trim();

interface SeveranceResult {
  severance_calculation: {
    work_period: {
      start_date: string;
      end_date: string;
      total_days: number;
      total_years: number;
    };
    finiquito: {
      days_worked_current_month: number;
      salary_current_month: number;
      pending_vacation_days: number;
      vacation_amount: number;
      pending_extra_pays: number;
      extra_pays_amount: number;
      gross_total: number;
      irpf_retention: number;
      net_total: number;
    };
    indemnization?: {
      type: string;
      days_per_year: number;
      total_days: number;
      daily_salary: number;
      gross_amount: number;
      tax_exempt: number;
      taxable: number;
      tax_retention: number;
      net_amount: number;
      legal_reference: string;
    };
    grand_total: {
      gross: number;
      net: number;
    };
    explanation: string;
    confidence: number;
  };
}

const TERMINATION_TYPES = [
  { value: 'voluntary', label: 'Baja voluntaria', description: 'Art. 49.1.d ET - Dimisión del trabajador' },
  { value: 'objective', label: 'Despido objetivo', description: 'Art. 52 ET - 20 días/año, máx 12 meses' },
  { value: 'disciplinary_improcedent', label: 'Despido improcedente', description: 'Art. 56 ET - 33 días/año, máx 24 meses' },
  { value: 'collective', label: 'Despido colectivo (ERE)', description: 'Art. 51 ET - Según acuerdo' },
  { value: 'end_contract', label: 'Fin de contrato temporal', description: '12 días/año (post-2015)' },
  { value: 'mutual_agreement', label: 'Mutuo acuerdo', description: 'Art. 49.1.a ET - Sin indemnización' },
];

export function HRSeveranceCalculatorDialog({
  open,
  onOpenChange,
  companyId,
  preselectedEmployeeId
}: HRSeveranceCalculatorDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [terminationType, setTerminationType] = useState<string>('');
  const [terminationDate, setTerminationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [pendingVacationDays, setPendingVacationDays] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<SeveranceResult | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string>('');

  // Load employees
  useEffect(() => {
    if (!open) return;
    
    const fetchEmployees = async () => {
      const { data, error } = await supabase
        .from('erp_hr_employees')
        .select('id, first_name, last_name, employee_number, hire_date, base_salary, department_id')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('first_name');
      
      if (data) {
        setEmployees(data as unknown as Employee[]);
        if (preselectedEmployeeId) {
          const emp = data.find((e: any) => e.id === preselectedEmployeeId);
          if (emp) setSelectedEmployee(emp as unknown as Employee);
        }
      }
    };
    
    fetchEmployees();
  }, [open, companyId, preselectedEmployeeId]);

  const handleCalculate = useCallback(async () => {
    if (!selectedEmployee || !terminationType || !terminationDate) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    setIsCalculating(true);
    setResult(null);
    setAiExplanation('');

    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-ai-agent', {
        body: {
          action: 'calculate_severance',
          company_id: companyId,
          employee_id: selectedEmployee.id,
          severance_data: {
            start_date: selectedEmployee.hire_date,
            end_date: terminationDate,
            base_salary: selectedEmployee.base_salary,
            termination_type: terminationType,
            pending_vacation_days: pendingVacationDays,
            pending_extra_pays: 2 // Assuming 2 extra pays per year (common in Spain)
          }
        }
      });

      if (error) throw error;

      if (data?.severance_calculation) {
        setResult({ severance_calculation: data.severance_calculation });
        setAiExplanation(data.severance_calculation.explanation || '');
        toast.success('Cálculo completado');
      } else if (data?.response) {
        // AI returned text explanation - parse it
        setAiExplanation(data.response);
        toast.info('El agente ha proporcionado una explicación');
      }
    } catch (error) {
      console.error('Severance calculation error:', error);
      toast.error('Error al calcular el finiquito');
    } finally {
      setIsCalculating(false);
    }
  }, [selectedEmployee, terminationType, terminationDate, pendingVacationDays, companyId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const resetForm = () => {
    setSelectedEmployee(null);
    setTerminationType('');
    setTerminationDate(new Date().toISOString().split('T')[0]);
    setPendingVacationDays(0);
    setResult(null);
    setAiExplanation('');
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) resetForm(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Calculador de Finiquitos e Indemnizaciones
          </DialogTitle>
          <DialogDescription>
            Cálculo automático supervisado por el Agente IA según normativa laboral española
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-150px)] pr-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Form */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Datos del Trabajador
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee">Empleado</Label>
                    <Select 
                      value={selectedEmployee?.id || ''} 
                      onValueChange={(val) => {
                        const emp = employees.find(e => e.id === val);
                        setSelectedEmployee(emp || null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar empleado..." />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {getFullName(emp)} ({emp.employee_number})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedEmployee && (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg text-sm">
                      <div>
                        <p className="text-muted-foreground">Fecha alta</p>
                        <p className="font-medium">{new Date(selectedEmployee.hire_date).toLocaleDateString('es-ES')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Salario base</p>
                        <p className="font-medium">{formatCurrency(selectedEmployee.base_salary)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Empleado</p>
                        <p className="font-medium">{getFullName(selectedEmployee)}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Tipo de Extinción
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="termination-type">Causa de extinción</Label>
                    <Select value={terminationType} onValueChange={setTerminationType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {TERMINATION_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex flex-col">
                              <span>{type.label}</span>
                              <span className="text-xs text-muted-foreground">{type.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="termination-date">Fecha de baja</Label>
                    <Input
                      id="termination-date"
                      type="date"
                      value={terminationDate}
                      onChange={(e) => setTerminationDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vacation-days">Días de vacaciones pendientes</Label>
                    <Input
                      id="vacation-days"
                      type="number"
                      min={0}
                      max={30}
                      value={pendingVacationDays}
                      onChange={(e) => setPendingVacationDays(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Art. 38.1 ET: Las vacaciones no disfrutadas se abonan en el finiquito
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Button 
                onClick={handleCalculate} 
                className="w-full"
                disabled={!selectedEmployee || !terminationType || isCalculating}
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Calculando con IA...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Calcular Finiquito
                  </>
                )}
              </Button>
            </div>

            {/* Right: Results */}
            <div className="space-y-4">
              {result?.severance_calculation ? (
                <>
                  {/* Finiquito */}
                  <Card className="border-green-500/30 bg-green-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-500" />
                          Finiquito
                        </span>
                        <Badge variant="secondary">
                          {formatCurrency(result.severance_calculation.finiquito.net_total)}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Salario mes en curso</span>
                        <span>{formatCurrency(result.severance_calculation.finiquito.salary_current_month)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Vacaciones ({result.severance_calculation.finiquito.pending_vacation_days} días)</span>
                        <span>{formatCurrency(result.severance_calculation.finiquito.vacation_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pagas extras prorrateadas</span>
                        <span>{formatCurrency(result.severance_calculation.finiquito.extra_pays_amount)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium">
                        <span>Bruto</span>
                        <span>{formatCurrency(result.severance_calculation.finiquito.gross_total)}</span>
                      </div>
                      <div className="flex justify-between text-destructive">
                        <span>IRPF</span>
                        <span>-{formatCurrency(result.severance_calculation.finiquito.irpf_retention)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-green-600">
                        <span>Neto</span>
                        <span>{formatCurrency(result.severance_calculation.finiquito.net_total)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Indemnización */}
                  {result.severance_calculation.indemnization && (
                    <Card className="border-amber-500/30 bg-amber-500/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                            Indemnización
                          </span>
                          <Badge variant="secondary">
                            {formatCurrency(result.severance_calculation.indemnization.net_amount)}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tipo</span>
                          <span className="text-right">{result.severance_calculation.indemnization.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Antigüedad</span>
                          <span>{result.severance_calculation.work_period.total_years.toFixed(2)} años</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Días indemnización</span>
                          <span>{result.severance_calculation.indemnization.total_days} días</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Salario diario</span>
                          <span>{formatCurrency(result.severance_calculation.indemnization.daily_salary)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-medium">
                          <span>Bruto</span>
                          <span>{formatCurrency(result.severance_calculation.indemnization.gross_amount)}</span>
                        </div>
                        <div className="flex justify-between text-green-600">
                          <span>Exento IRPF</span>
                          <span>{formatCurrency(result.severance_calculation.indemnization.tax_exempt)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-amber-600">
                          <span>Neto</span>
                          <span>{formatCurrency(result.severance_calculation.indemnization.net_amount)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {result.severance_calculation.indemnization.legal_reference}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Grand Total */}
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Total a percibir</p>
                          <p className="text-2xl font-bold text-primary">
                            {formatCurrency(result.severance_calculation.grand_total.net)}
                          </p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* AI Confidence */}
                  {result.severance_calculation.confidence && (
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <Brain className="h-4 w-4 text-primary" />
                      <span className="text-sm">
                        Confianza del cálculo: <strong>{result.severance_calculation.confidence}%</strong>
                      </span>
                    </div>
                  )}
                </>
              ) : aiExplanation ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      Explicación del Agente IA
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{aiExplanation}</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Calculator className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      Completa los datos y pulsa "Calcular Finiquito" para obtener el cálculo detallado
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Legal Notice */}
              <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  Este cálculo es orientativo. Consulte con un profesional para casos específicos. 
                  Normativa aplicable: Estatuto de los Trabajadores (RDL 2/2015), Ley Reguladora de la Jurisdicción Social.
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default HRSeveranceCalculatorDialog;
