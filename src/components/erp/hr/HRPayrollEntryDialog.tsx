/**
 * HRPayrollEntryDialog - Dialog para crear/editar nóminas con conceptos
 * Persiste datos reales en erp_hr_payrolls
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
import { DollarSign, Calculator, Save, Euro, TrendingUp, TrendingDown, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { HREmployeeSearchSelect, EmployeeOption } from './shared/HREmployeeSearchSelect';

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

interface HRPayrollEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  month?: string;
  payrollId?: string | null;
  onSave?: () => void;
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
  { code: 'IRPF', name: 'Retención IRPF', type: 'deduction', category: 'irpf', amount: 15, isPercentage: true, cotizaSS: false, tributaIRPF: false, isEditable: true },
  { code: 'ANTICIPO', name: 'Anticipo', type: 'deduction', category: 'other', amount: 0, isPercentage: false, cotizaSS: false, tributaIRPF: false, isEditable: true },
  { code: 'CUOTA_SIND', name: 'Cuota sindical', type: 'deduction', category: 'other', amount: 0, isPercentage: false, cotizaSS: false, tributaIRPF: false, isEditable: true },
];

export function HRPayrollEntryDialog({
  open,
  onOpenChange,
  companyId = '',
  month = '',
  payrollId = null,
  onSave
}: HRPayrollEntryDialogProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('');
  const [selectedEmployeeCategory, setSelectedEmployeeCategory] = useState('');
  const [earnings, setEarnings] = useState<PayrollConcept[]>([]);
  const [deductions, setDeductions] = useState<PayrollConcept[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('earnings');
  const [isEditMode, setIsEditMode] = useState(false);

  // Parse month
  const [periodYear, periodMonth] = month ? month.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];

  // Init concepts
  const resetConcepts = useCallback((baseSalary = 0, irpfRate = 15) => {
    setEarnings(DEFAULT_EARNINGS.map((e, i) => ({
      ...e,
      id: `earning-${i}`,
      amount: e.code === 'BASE' ? baseSalary : 0
    })));
    setDeductions(DEFAULT_DEDUCTIONS.map((d, i) => ({
      ...d,
      id: `deduction-${i}`,
      amount: d.code === 'IRPF' ? irpfRate : 0
    })));
  }, []);

  // Load existing payroll or reset
  useEffect(() => {
    if (!open) return;

    if (payrollId) {
      setIsEditMode(true);
      // Load existing payroll
      (async () => {
        const { data, error } = await supabase
          .from('erp_hr_payrolls')
          .select(`
            *,
            erp_hr_employees!erp_hr_payrolls_employee_id_fkey(first_name, last_name, job_title, base_salary)
          `)
          .eq('id', payrollId)
          .single();

        if (error || !data) {
          toast.error('Error al cargar nómina');
          return;
        }

        setSelectedEmployeeId(data.employee_id);
        const emp = data.erp_hr_employees as any;
        setSelectedEmployeeName(emp ? `${emp.first_name} ${emp.last_name}` : '');
        setSelectedEmployeeCategory(emp?.job_title || '');

        // Restore complements as earnings
        const complements = Array.isArray(data.complements) ? data.complements : [];
        const restoredEarnings = DEFAULT_EARNINGS.map((e, i) => {
          const saved = complements.find((c: any) => c.code === e.code);
          return {
            ...e,
            id: `earning-${i}`,
            amount: e.code === 'BASE' ? (data.base_salary || 0) : (saved?.amount || 0)
          };
        });
        setEarnings(restoredEarnings);

        // Restore deductions
        const otherDeds = Array.isArray(data.other_deductions) ? data.other_deductions : [];
        const restoredDeductions = DEFAULT_DEDUCTIONS.map((d, i) => {
          if (d.code === 'IRPF') return { ...d, id: `deduction-${i}`, amount: data.irpf_percentage || 15 };
          const saved = otherDeds.find((o: any) => o.code === d.code);
          return { ...d, id: `deduction-${i}`, amount: saved?.amount || 0 };
        });
        setDeductions(restoredDeductions);
      })();
    } else {
      setIsEditMode(false);
      setSelectedEmployeeId('');
      setSelectedEmployeeName('');
      setSelectedEmployeeCategory('');
      resetConcepts();
    }
  }, [open, payrollId, resetConcepts]);

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

  const handleEmployeeSelect = async (employeeId: string, employee?: EmployeeOption) => {
    setSelectedEmployeeId(employeeId);

    if (employee) {
      setSelectedEmployeeName(`${employee.first_name} ${employee.last_name}`);
      setSelectedEmployeeCategory(employee.job_title || 'Sin categoría');

      // Fetch base salary
      const { data } = await supabase
        .from('erp_hr_employees')
        .select('base_salary')
        .eq('id', employeeId)
        .single();

      const baseSalary = data?.base_salary ? parseFloat(data.base_salary) / 12 : 0; // Annual → monthly
      resetConcepts(Math.round(baseSalary * 100) / 100, 15);
    }
  };

  const handleSave = async () => {
    if (!selectedEmployeeId) {
      toast.error('Selecciona un empleado');
      return;
    }

    const baseSalary = earnings.find(e => e.code === 'BASE')?.amount || 0;
    if (baseSalary <= 0) {
      toast.error('El salario base debe ser mayor que 0');
      return;
    }

    setIsSaving(true);
    try {
      const complements = earnings
        .filter(e => e.code !== 'BASE' && e.amount > 0)
        .map(e => ({ code: e.code, name: e.name, amount: e.amount, cotizaSS: e.cotizaSS, tributaIRPF: e.tributaIRPF }));

      const otherDeds = deductions
        .filter(d => d.category === 'other' && d.amount > 0)
        .map(d => ({ code: d.code, name: d.name, amount: d.amount }));

      const payrollRecord = {
        company_id: companyId,
        employee_id: selectedEmployeeId,
        period_month: periodMonth,
        period_year: periodYear,
        payroll_type: 'mensual' as const,
        base_salary: baseSalary,
        complements: complements,
        gross_salary: parseFloat(totals.totalEarnings.toFixed(2)),
        ss_worker: parseFloat(totals.totalSS.toFixed(2)),
        irpf_amount: parseFloat(totals.irpfAmount.toFixed(2)),
        irpf_percentage: totals.irpfRate,
        other_deductions: otherDeds,
        total_deductions: parseFloat(totals.totalDeductions.toFixed(2)),
        net_salary: parseFloat(totals.netSalary.toFixed(2)),
        ss_company: parseFloat(totals.companySS.toFixed(2)),
        total_cost: parseFloat(totals.totalCost.toFixed(2)),
        status: 'calculated' as const,
        calculated_at: new Date().toISOString(),
      };

      if (isEditMode && payrollId) {
        const { error } = await supabase
          .from('erp_hr_payrolls')
          .update(payrollRecord as any)
          .eq('id', payrollId);
        if (error) throw error;
        toast.success('Nómina actualizada correctamente');
      } else {
        const { error } = await supabase
          .from('erp_hr_payrolls')
          .insert(payrollRecord as any);
        if (error) throw error;
        toast.success('Nómina creada y calculada correctamente');
      }

      onSave?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving payroll:', error);
      if (error?.message?.includes('unique') || error?.code === '23505') {
        toast.error('Ya existe una nómina para este empleado en este período');
      } else {
        toast.error(`Error al guardar: ${error?.message || 'Error desconocido'}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            {isEditMode ? 'Editar Nómina' : 'Nueva Nómina'} — {new Date(periodYear, periodMonth - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modifica los conceptos salariales' : 'Selecciona un empleado y configura los conceptos'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="mb-4 p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label className="text-xs">Empleado</Label>
                {isEditMode ? (
                  <p className="text-sm font-medium mt-1">{selectedEmployeeName}</p>
                ) : (
                  <HREmployeeSearchSelect
                    value={selectedEmployeeId}
                    onValueChange={handleEmployeeSelect}
                    companyId={companyId}
                    placeholder="Buscar empleado..."
                  />
                )}
              </div>
              {selectedEmployeeCategory && (
                <div>
                  <Label className="text-xs">Categoría</Label>
                  <Badge variant="outline" className="mt-1">{selectedEmployeeCategory}</Badge>
                </div>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="earnings" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                Devengos
                <Badge variant="secondary" className="ml-1 text-xs">€{totals.totalEarnings.toFixed(2)}</Badge>
              </TabsTrigger>
              <TabsTrigger value="deductions" className="gap-1">
                <TrendingDown className="h-3 w-3" />
                Deducciones
                <Badge variant="secondary" className="ml-1 text-xs">€{totals.totalDeductions.toFixed(2)}</Badge>
              </TabsTrigger>
              <TabsTrigger value="summary" className="gap-1">
                <Calculator className="h-3 w-3" />
                Resumen
              </TabsTrigger>
            </TabsList>

            <TabsContent value="earnings" className="mt-4">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {earnings.map(concept => (
                    <div key={concept.id} className={cn("flex items-center gap-2 p-2 rounded-lg border", concept.amount > 0 ? "bg-background" : "bg-muted/30")}>
                      <div className="flex-1"><span className="text-sm">{concept.name}</span></div>
                      <div className="w-24">
                        <Input type="number" value={concept.amount || ''} onChange={(e) => updateConcept(concept.id, parseFloat(e.target.value) || 0)} className="h-8 text-sm" placeholder="0" step="0.01" />
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
                  <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Seguridad Social (automático)</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between py-1 px-2 bg-muted/50 rounded"><span>CC ({SS_RATES.cc_worker}%)</span><span>€{totals.ssCC.toFixed(2)}</span></div>
                    <div className="flex justify-between py-1 px-2 bg-muted/50 rounded"><span>Desempleo ({SS_RATES.unemployment_general_worker}%)</span><span>€{totals.ssDesempleo.toFixed(2)}</span></div>
                    <div className="flex justify-between py-1 px-2 bg-muted/50 rounded"><span>FP ({SS_RATES.fp_worker}%)</span><span>€{totals.ssFP.toFixed(2)}</span></div>
                    <div className="flex justify-between py-1 px-2 bg-muted/50 rounded"><span>MEI ({SS_RATES.mei}%)</span><span>€{totals.ssMEI.toFixed(2)}</span></div>
                    <div className="flex justify-between py-1 px-2 bg-primary/10 rounded font-medium"><span>Total SS Trabajador</span><span>€{totals.totalSS.toFixed(2)}</span></div>
                  </div>
                  <Separator className="my-3" />
                  <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Otras deducciones</h4>
                  {deductions.map(concept => (
                    <div key={concept.id} className="flex items-center gap-2 p-2 rounded-lg border">
                      <div className="flex-1"><span className="text-sm">{concept.name}</span></div>
                      <div className="w-24">
                        <Input type="number" value={concept.amount || ''} onChange={(e) => updateConcept(concept.id, parseFloat(e.target.value) || 0)} className="h-8 text-sm" placeholder="0" step="0.01" />
                      </div>
                      <span className="text-xs text-muted-foreground">{concept.isPercentage ? '%' : '€'}</span>
                      {concept.code === 'IRPF' && <span className="text-sm font-medium">= €{totals.irpfAmount.toFixed(2)}</span>}
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
                    {totals.otherDeductions > 0 && (
                      <div className="flex justify-between"><span>Otras deducciones</span><span className="text-red-600">-€{totals.otherDeductions.toFixed(2)}</span></div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex justify-between text-lg font-bold"><span>Salario Neto</span><span className="text-primary">€{totals.netSalary.toFixed(2)}</span></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" />Coste Empresa</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Salario Bruto</span><span>€{totals.totalEarnings.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>SS Empresa ({(SS_RATES.cc_company + SS_RATES.unemployment_general_company + SS_RATES.fogasa + SS_RATES.fp_company).toFixed(2)}%)</span><span>€{totals.companySS.toFixed(2)}</span></div>
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
          <Button onClick={handleSave} disabled={!selectedEmployeeId || isSaving || totals.totalEarnings <= 0}>
            {isSaving ? (
              <><Calculator className="h-4 w-4 mr-1 animate-spin" />Guardando...</>
            ) : (
              <><Save className="h-4 w-4 mr-1" />{isEditMode ? 'Actualizar Nómina' : 'Calcular y Guardar'}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRPayrollEntryDialog;
