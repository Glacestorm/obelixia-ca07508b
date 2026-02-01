/**
 * HRPayrollEntryDialog - Dialog para crear/editar nóminas con conceptos
 */

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Plus, Trash2, Calculator, Save, Euro, TrendingUp, TrendingDown, Building2, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PayrollConcept {
  id: string;
  code: string;
  name: string;
  type: 'earning' | 'deduction';
  category: 'fixed' | 'variable' | 'in_kind' | 'ss' | 'irpf' | 'other';
  amount: number;
  isPercentage: boolean;
  cotizaSS: boolean;
  tributaIRPF: boolean;
  isEditable: boolean;
}

interface EmployeeData {
  id: string;
  name: string;
  department: string;
  category: string;
  baseSalary: number;
  seniorityYears: number;
  irpfRate: number;
}

interface HRPayrollEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  employee?: EmployeeData;
  month?: string;
  onSave?: (payrollData: any) => void;
}

const SS_RATES = {
  cc_company: 23.60,
  cc_worker: 4.70,
  unemployment_general_company: 5.50,
  unemployment_general_worker: 1.55,
  fogasa: 0.20,
  fp_company: 0.60,
  fp_worker: 0.10,
  mei: 0.13,
};

const DEFAULT_EARNINGS: Omit<PayrollConcept, 'id'>[] = [
  { code: 'BASE', name: 'Salario base', type: 'earning', category: 'fixed', amount: 0, isPercentage: false, cotizaSS: true, tributaIRPF: true, isEditable: true },
  { code: 'PLUS_CONV', name: 'Plus convenio', type: 'earning', category: 'fixed', amount: 0, isPercentage: false, cotizaSS: true, tributaIRPF: true, isEditable: true },
  { code: 'PLUS_ANT', name: 'Plus antigüedad', type: 'earning', category: 'fixed', amount: 0, isPercentage: false, cotizaSS: true, tributaIRPF: true, isEditable: true },
  { code: 'HORAS_EXTRA', name: 'Horas extraordinarias', type: 'earning', category: 'variable', amount: 0, isPercentage: false, cotizaSS: true, tributaIRPF: true, isEditable: true },
  { code: 'COMISIONES', name: 'Comisiones', type: 'earning', category: 'variable', amount: 0, isPercentage: false, cotizaSS: true, tributaIRPF: true, isEditable: true },
  { code: 'BONUS', name: 'Incentivos/Bonus', type: 'earning', category: 'variable', amount: 0, isPercentage: false, cotizaSS: true, tributaIRPF: true, isEditable: true },
  { code: 'NOCTURNIDAD', name: 'Nocturnidad', type: 'earning', category: 'variable', amount: 0, isPercentage: false, cotizaSS: true, tributaIRPF: true, isEditable: true },
  { code: 'DIETAS', name: 'Dietas', type: 'earning', category: 'variable', amount: 0, isPercentage: false, cotizaSS: false, tributaIRPF: false, isEditable: true },
];

const DEFAULT_DEDUCTIONS: Omit<PayrollConcept, 'id'>[] = [
  { code: 'IRPF', name: 'Retención IRPF', type: 'deduction', category: 'irpf', amount: 0, isPercentage: true, cotizaSS: false, tributaIRPF: false, isEditable: true },
  { code: 'ANTICIPO', name: 'Anticipo', type: 'deduction', category: 'other', amount: 0, isPercentage: false, cotizaSS: false, tributaIRPF: false, isEditable: true },
  { code: 'CUOTA_SIND', name: 'Cuota sindical', type: 'deduction', category: 'other', amount: 0, isPercentage: false, cotizaSS: false, tributaIRPF: false, isEditable: true },
];

const DEMO_EMPLOYEES: EmployeeData[] = [
  { id: '1', name: 'María García López', department: 'Administración', category: 'Grupo 5', baseSalary: 2800, seniorityYears: 5, irpfRate: 15.2 },
  { id: '2', name: 'Juan Martínez Ruiz', department: 'Producción', category: 'Grupo 7', baseSalary: 2400, seniorityYears: 3, irpfRate: 12.5 },
  { id: '3', name: 'Ana Fernández Castro', department: 'Comercial', category: 'Grupo 4', baseSalary: 3200, seniorityYears: 8, irpfRate: 18.0 },
];

export function HRPayrollEntryDialog({ open, onOpenChange, month = 'Febrero 2026', onSave }: HRPayrollEntryDialogProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeData | null>(null);
  const [earnings, setEarnings] = useState<PayrollConcept[]>([]);
  const [deductions, setDeductions] = useState<PayrollConcept[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [activeTab, setActiveTab] = useState('earnings');

  useEffect(() => {
    if (open) {
      const initialEarnings = DEFAULT_EARNINGS.map((e, i) => ({
        ...e,
        id: `earning-${i}`,
        amount: e.code === 'BASE' && selectedEmployee ? selectedEmployee.baseSalary : 0
      }));
      const initialDeductions = DEFAULT_DEDUCTIONS.map((d, i) => ({
        ...d,
        id: `deduction-${i}`,
        amount: d.code === 'IRPF' && selectedEmployee ? selectedEmployee.irpfRate : 0
      }));
      setEarnings(initialEarnings);
      setDeductions(initialDeductions);
    }
  }, [open, selectedEmployee]);

  const calculateTotals = useCallback(() => {
    const totalEarnings = earnings.reduce((sum, e) => sum + (e.amount || 0), 0);
    const baseCotizacion = earnings.filter(e => e.cotizaSS).reduce((sum, e) => sum + (e.amount || 0), 0);
    const baseIRPF = earnings.filter(e => e.tributaIRPF).reduce((sum, e) => sum + (e.amount || 0), 0);

    const ssCC = baseCotizacion * (SS_RATES.cc_worker / 100);
    const ssDesempleo = baseCotizacion * (SS_RATES.unemployment_general_worker / 100);
    const ssFP = baseCotizacion * (SS_RATES.fp_worker / 100);
    const ssMEI = baseCotizacion * (SS_RATES.mei / 100);
    const totalSS = ssCC + ssDesempleo + ssFP + ssMEI;

    const irpfRate = deductions.find(d => d.code === 'IRPF')?.amount || 0;
    const irpfAmount = baseIRPF * (irpfRate / 100);
    const otherDeductions = deductions.filter(d => d.category === 'other').reduce((sum, d) => sum + (d.amount || 0), 0);

    const totalDeductions = totalSS + irpfAmount + otherDeductions;
    const netSalary = totalEarnings - totalDeductions;
    const companySS = baseCotizacion * ((SS_RATES.cc_company + SS_RATES.unemployment_general_company + SS_RATES.fogasa + SS_RATES.fp_company) / 100);
    const totalCost = totalEarnings + companySS;

    return { totalEarnings, baseCotizacion, baseIRPF, ssCC, ssDesempleo, ssFP, ssMEI, totalSS, irpfRate, irpfAmount, otherDeductions, totalDeductions, netSalary, companySS, totalCost };
  }, [earnings, deductions]);

  const totals = calculateTotals();

  const updateConcept = (id: string, value: number) => {
    if (earnings.find(e => e.id === id)) {
      setEarnings(prev => prev.map(e => e.id === id ? { ...e, amount: value } : e));
    } else {
      setDeductions(prev => prev.map(d => d.id === id ? { ...d, amount: value } : d));
    }
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const emp = DEMO_EMPLOYEES.find(e => e.id === employeeId);
    if (emp) {
      setSelectedEmployee(emp);
      setEarnings(prev => prev.map(e => e.code === 'BASE' ? { ...e, amount: emp.baseSalary } : e));
      setDeductions(prev => prev.map(d => d.code === 'IRPF' ? { ...d, amount: emp.irpfRate } : d));
    }
  };

  const handleSave = async () => {
    if (!selectedEmployee) {
      toast.error('Selecciona un empleado');
      return;
    }
    setIsCalculating(true);
    try {
      const payrollData = { employee_id: selectedEmployee.id, month, earnings: earnings.filter(e => e.amount > 0), deductions: deductions.filter(d => d.amount > 0), totals, status: 'calculated' };
      onSave?.(payrollData);
      toast.success('Nómina guardada correctamente');
      onOpenChange(false);
    } catch (error) {
      toast.error('Error al guardar la nómina');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Entrada de Nómina - {month}
          </DialogTitle>
          <DialogDescription>Configura los conceptos salariales</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="mb-4 p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Empleado</Label>
                <Select value={selectedEmployee?.id || ''} onValueChange={handleEmployeeSelect}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {DEMO_EMPLOYEES.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        <div className="flex items-center gap-2"><User className="h-4 w-4" />{emp.name}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedEmployee && (
                <>
                  <div>
                    <Label className="text-xs">Departamento</Label>
                    <div className="flex items-center gap-2 mt-1"><Building2 className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{selectedEmployee.department}</span></div>
                  </div>
                  <div>
                    <Label className="text-xs">Categoría</Label>
                    <Badge variant="outline">{selectedEmployee.category}</Badge>
                  </div>
                </>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="earnings" className="gap-1"><TrendingUp className="h-3 w-3" />Devengos<Badge variant="secondary" className="ml-1 text-xs">€{totals.totalEarnings.toFixed(2)}</Badge></TabsTrigger>
              <TabsTrigger value="deductions" className="gap-1"><TrendingDown className="h-3 w-3" />Deducciones<Badge variant="secondary" className="ml-1 text-xs">€{totals.totalDeductions.toFixed(2)}</Badge></TabsTrigger>
              <TabsTrigger value="summary" className="gap-1"><Calculator className="h-3 w-3" />Resumen</TabsTrigger>
            </TabsList>

            <TabsContent value="earnings" className="mt-4">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {earnings.map(concept => (
                    <div key={concept.id} className={cn("flex items-center gap-2 p-2 rounded-lg border", concept.amount > 0 ? "bg-background" : "bg-muted/30")}>
                      <div className="flex-1"><span className="text-sm">{concept.name}</span></div>
                      <div className="w-24">
                        <Input type="number" value={concept.amount || ''} onChange={(e) => updateConcept(concept.id, parseFloat(e.target.value) || 0)} className="h-8 text-sm" placeholder="0" />
                      </div>
                      <div className="flex gap-1">
                        {concept.cotizaSS && <Badge variant="outline" className="text-[10px] h-5">SS</Badge>}
                        {concept.tributaIRPF && <Badge variant="outline" className="text-[10px] h-5">IRPF</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="deductions" className="mt-4">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Seguridad Social</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between py-1 px-2 bg-muted/50 rounded"><span>CC ({SS_RATES.cc_worker}%)</span><span>€{totals.ssCC.toFixed(2)}</span></div>
                    <div className="flex justify-between py-1 px-2 bg-muted/50 rounded"><span>Desempleo ({SS_RATES.unemployment_general_worker}%)</span><span>€{totals.ssDesempleo.toFixed(2)}</span></div>
                    <div className="flex justify-between py-1 px-2 bg-muted/50 rounded"><span>FP ({SS_RATES.fp_worker}%)</span><span>€{totals.ssFP.toFixed(2)}</span></div>
                    <div className="flex justify-between py-1 px-2 bg-muted/50 rounded"><span>MEI ({SS_RATES.mei}%)</span><span>€{totals.ssMEI.toFixed(2)}</span></div>
                    <div className="flex justify-between py-1 px-2 bg-primary/10 rounded font-medium"><span>Total SS</span><span>€{totals.totalSS.toFixed(2)}</span></div>
                  </div>
                  <Separator className="my-3" />
                  {deductions.map(concept => (
                    <div key={concept.id} className="flex items-center gap-2 p-2 rounded-lg border">
                      <div className="flex-1"><span className="text-sm">{concept.name}</span></div>
                      <div className="w-24">
                        <Input type="number" value={concept.amount || ''} onChange={(e) => updateConcept(concept.id, parseFloat(e.target.value) || 0)} className="h-8 text-sm" placeholder="0" />
                      </div>
                      <span className="text-xs text-muted-foreground">{concept.isPercentage ? '%' : '€'}</span>
                      {concept.code === 'IRPF' && <span className="text-sm font-medium">€{totals.irpfAmount.toFixed(2)}</span>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="summary" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Euro className="h-4 w-4" />Resumen Nómina</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Total Devengos</span><span className="font-medium text-green-600">€{totals.totalEarnings.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Deducciones SS</span><span className="text-red-600">-€{totals.totalSS.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>IRPF ({totals.irpfRate}%)</span><span className="text-red-600">-€{totals.irpfAmount.toFixed(2)}</span></div>
                    <Separator className="my-2" />
                    <div className="flex justify-between text-lg font-bold"><span>Salario Neto</span><span className="text-primary">€{totals.netSalary.toFixed(2)}</span></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" />Coste Empresa</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Salario Bruto</span><span>€{totals.totalEarnings.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>SS Empresa</span><span>€{totals.companySS.toFixed(2)}</span></div>
                    <Separator className="my-2" />
                    <div className="flex justify-between text-lg font-bold"><span>Coste Total</span><span className="text-amber-600">€{totals.totalCost.toFixed(2)}</span></div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!selectedEmployee || isCalculating}>
            {isCalculating ? <><Calculator className="h-4 w-4 mr-1 animate-spin" />Calculando...</> : <><Save className="h-4 w-4 mr-1" />Guardar Nómina</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRPayrollEntryDialog;
