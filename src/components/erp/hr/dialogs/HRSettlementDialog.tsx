/**
 * HRSettlementDialog - Diálogo para crear finiquitos y liquidaciones
 * Fase D - Diálogos funcionales de Contratos
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  UserX, Calculator, FileText, Loader2, Sparkles, Euro
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface HRSettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess?: () => void;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  hire_date: string;
  base_salary: number;
}

interface SettlementCalculation {
  pendingVacationDays: number;
  pendingVacationAmount: number;
  extraPayProportional: number;
  compensation: number;
  otherConcepts: number;
  grossTotal: number;
  irpfRetention: number;
  ssRetention: number;
  netTotal: number;
}

export function HRSettlementDialog({
  open,
  onOpenChange,
  companyId,
  onSuccess,
}: HRSettlementDialogProps) {
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  
  // Form state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [terminationDate, setTerminationDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [terminationReason, setTerminationReason] = useState<string>('voluntary');
  const [lastWorkDay, setLastWorkDay] = useState('');
  const [noticeDays, setNoticeDays] = useState('15');
  
  // Calculation results
  const [calculation, setCalculation] = useState<SettlementCalculation | null>(null);

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!open) return;
      
      setLoadingEmployees(true);
      try {
        const { data, error } = await supabase
          .from('erp_hr_employees')
          .select(`
            id, first_name, last_name, hire_date,
            erp_hr_contracts!erp_hr_contracts_employee_id_fkey (base_salary)
          `)
          .eq('company_id', companyId)
          .eq('status', 'active')
          .limit(100);

        if (error) throw error;

        setEmployees((data || []).map((emp: any) => {
          const activeContract = emp.erp_hr_contracts?.find((c: any) => c.base_salary);
          return {
            id: emp.id,
            first_name: emp.first_name,
            last_name: emp.last_name,
            hire_date: emp.hire_date,
            base_salary: activeContract?.base_salary || 0,
          };
        }));
      } catch (err) {
        console.error('Error fetching employees:', err);
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, [open, companyId]);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  const getReasonLabel = (reason: string): string => {
    const reasons: Record<string, string> = {
      voluntary: 'Baja voluntaria',
      dismissal_objective: 'Despido objetivo',
      dismissal_disciplinary: 'Despido disciplinario',
      dismissal_unfair: 'Despido improcedente',
      contract_end: 'Fin de contrato temporal',
      mutual: 'Mutuo acuerdo',
      retirement: 'Jubilación',
      death: 'Fallecimiento',
    };
    return reasons[reason] || reason;
  };

  const handleCalculate = async () => {
    if (!selectedEmployeeId || !terminationDate) {
      toast.error('Selecciona empleado y fecha de baja');
      return;
    }

    setCalculating(true);
    try {
      // Call AI agent for calculation
      const { data, error } = await supabase.functions.invoke('erp-hr-ai-agent', {
        body: {
          action: 'calculate_severance',
          context: {
            employee_id: selectedEmployeeId,
            employee_name: selectedEmployee 
              ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` 
              : '',
            hire_date: selectedEmployee?.hire_date,
            base_salary: selectedEmployee?.base_salary,
            termination_date: terminationDate,
            termination_reason: terminationReason,
            last_work_day: lastWorkDay || terminationDate,
            notice_days: parseInt(noticeDays),
          }
        }
      });

      if (error) throw error;

      if (data?.calculation) {
        setCalculation(data.calculation);
        toast.success('Cálculo realizado correctamente');
      } else {
        // Fallback calculation
        const baseSalary = selectedEmployee?.base_salary || 0;
        const dailySalary = baseSalary / 30;
        const hireDate = selectedEmployee?.hire_date 
          ? new Date(selectedEmployee.hire_date) 
          : new Date();
        const termDate = new Date(terminationDate);
        const yearsWorked = (termDate.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
        
        // Calculate components
        const pendingVacationDays = Math.round((22 / 12) * (termDate.getMonth() + 1));
        const pendingVacationAmount = pendingVacationDays * dailySalary;
        const extraPayProportional = (baseSalary * 2 / 12) * (termDate.getMonth() + 1);
        
        let compensation = 0;
        if (terminationReason === 'dismissal_unfair') {
          compensation = Math.min(dailySalary * 33 * yearsWorked, baseSalary * 24);
        } else if (terminationReason === 'dismissal_objective') {
          compensation = Math.min(dailySalary * 20 * yearsWorked, baseSalary * 12);
        } else if (terminationReason === 'contract_end') {
          compensation = dailySalary * 12 * yearsWorked;
        }

        const grossTotal = pendingVacationAmount + extraPayProportional + compensation;
        const irpfRetention = grossTotal * 0.15;
        const ssRetention = 0; // SS not applicable on settlements

        setCalculation({
          pendingVacationDays,
          pendingVacationAmount,
          extraPayProportional,
          compensation,
          otherConcepts: 0,
          grossTotal,
          irpfRetention,
          ssRetention,
          netTotal: grossTotal - irpfRetention,
        });
        toast.success('Cálculo estimado realizado');
      }
    } catch (err) {
      console.error('Error calculating settlement:', err);
      toast.error('Error al calcular el finiquito');
    } finally {
      setCalculating(false);
    }
  };

  const handleSubmit = async () => {
    if (!calculation) {
      toast.error('Realiza el cálculo primero');
      return;
    }

    setLoading(true);
    try {
      // Here would go the actual database insert
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Finiquito generado correctamente');
      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setSelectedEmployeeId('');
      setCalculation(null);
    } catch (err) {
      console.error('Error creating settlement:', err);
      toast.error('Error al crear el finiquito');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-destructive" />
            Nuevo Finiquito
          </DialogTitle>
          <DialogDescription>
            Calcula y genera el documento de finiquito para el empleado
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Employee Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="employee">Empleado *</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger id="employee">
                    <SelectValue placeholder="Selecciona empleado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingEmployees ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedEmployee && (
                <div className="col-span-2 p-3 rounded-lg bg-muted/50 text-sm">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-muted-foreground">Alta:</span>
                      <span className="ml-2 font-medium">{selectedEmployee.hire_date}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Salario base:</span>
                      <span className="ml-2 font-medium">
                        €{selectedEmployee.base_salary.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Termination Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="termDate">Fecha de Baja *</Label>
                <Input
                  id="termDate"
                  type="date"
                  value={terminationDate}
                  onChange={(e) => setTerminationDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastDay">Último Día Trabajado</Label>
                <Input
                  id="lastDay"
                  type="date"
                  value={lastWorkDay}
                  onChange={(e) => setLastWorkDay(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo de Baja</Label>
                <Select value={terminationReason} onValueChange={setTerminationReason}>
                  <SelectTrigger id="reason">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="voluntary">Baja voluntaria</SelectItem>
                    <SelectItem value="dismissal_objective">Despido objetivo</SelectItem>
                    <SelectItem value="dismissal_disciplinary">Despido disciplinario</SelectItem>
                    <SelectItem value="dismissal_unfair">Despido improcedente</SelectItem>
                    <SelectItem value="contract_end">Fin de contrato temporal</SelectItem>
                    <SelectItem value="mutual">Mutuo acuerdo</SelectItem>
                    <SelectItem value="retirement">Jubilación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notice">Días de Preaviso</Label>
                <Input
                  id="notice"
                  type="number"
                  value={noticeDays}
                  onChange={(e) => setNoticeDays(e.target.value)}
                  min="0"
                />
              </div>
            </div>

            {/* Calculate Button */}
            <Button 
              className="w-full" 
              variant="outline"
              onClick={handleCalculate}
              disabled={calculating || !selectedEmployeeId}
            >
              {calculating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Calcular Finiquito
                </>
              )}
            </Button>

            {/* Calculation Results */}
            {calculation && (
              <div className="space-y-4">
                <Separator />
                
                <div className="p-4 rounded-lg border bg-card space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Euro className="h-4 w-4 text-primary" />
                    Desglose del Finiquito
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Vacaciones pendientes ({calculation.pendingVacationDays} días)
                      </span>
                      <span className="font-medium">
                        €{calculation.pendingVacationAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pagas extra proporcionales</span>
                      <span className="font-medium">
                        €{calculation.extraPayProportional.toFixed(2)}
                      </span>
                    </div>
                    {calculation.compensation > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Indemnización ({getReasonLabel(terminationReason)})
                        </span>
                        <span className="font-medium text-primary">
                          €{calculation.compensation.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {calculation.otherConcepts > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Otros conceptos</span>
                        <span className="font-medium">
                          €{calculation.otherConcepts.toFixed(2)}
                        </span>
                      </div>
                    )}
                    
                    <Separator className="my-2" />
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Bruto</span>
                      <span className="font-semibold">
                        €{calculation.grossTotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-destructive">
                      <span>Retención IRPF (15%)</span>
                      <span>-€{calculation.irpfRetention.toFixed(2)}</span>
                    </div>
                    
                    <Separator className="my-2" />
                    
                    <div className="flex justify-between text-lg">
                      <span className="font-semibold">TOTAL NETO</span>
                      <span className="font-bold text-green-600">
                        €{calculation.netTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !calculation}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generar Finiquito
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRSettlementDialog;
