/**
 * HRPayrollEntryDialog - Dialog para crear/editar nóminas con conceptos
 * Persiste datos reales en erp_hr_payrolls
 * 
 * S9.13: Conectado al motor de convenios colectivos (agreementSalaryResolver)
 *   - Resuelve contrato vigente para el periodo de nómina
 *   - Prioriza salario contractual sobre erp_hr_employees.base_salary
 *   - Valida mínimo de convenio sobre bloque salarial fijo
 *   - Persiste conceptos con códigos ES_SAL_BASE, ES_COMP_CONVENIO, ES_MEJORA_VOLUNTARIA
 *   - Trazabilidad completa del convenio aplicado
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
import { DollarSign, Calculator, Save, Euro, TrendingUp, TrendingDown, Building2, Scale, AlertTriangle, CheckCircle, Info, ChevronDown, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { HREmployeeSearchSelect, EmployeeOption } from './shared/HREmployeeSearchSelect';
import { resolveEmployeeSalary, resolveAgreementConcepts, type SalaryResolutionResult, type ResolvedConceptForPayroll } from '@/engines/erp/hr/agreementSalaryResolver';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HRFlexibleRemunerationPanel } from './HRFlexibleRemunerationPanel';

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

type AgreementResolutionMode = 'auto' | 'manual' | 'missing_group' | null;

/** Classic trio ERP codes — excluded from dynamic concept injection to prevent duplication */
const CLASSIC_TRIO_ERP_CODES = new Set(['ES_SAL_BASE', 'ES_COMP_CONVENIO', 'ES_MEJORA_VOLUNTARIA']);

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
  { code: 'MEJORA_VOL', name: 'Mejora voluntaria', type: 'earning', category: 'fixed', amount: 0, isPercentage: false, cotizaSS: true, tributaIRPF: true, isEditable: true },
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

/** Map UI codes to persistence codes for agreement-resolved concepts */
const PERSISTENCE_CODE_MAP: Record<string, string> = {
  'BASE': 'ES_SAL_BASE',
  'PLUS_CONV': 'ES_COMP_CONVENIO',
  'MEJORA_VOL': 'ES_MEJORA_VOLUNTARIA',
};

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

  // S9.13: Agreement resolution state
  const [agreementResolution, setAgreementResolution] = useState<SalaryResolutionResult | null>(null);
  const [agreementName, setAgreementName] = useState('');
  const [resolutionMode, setResolutionMode] = useState<AgreementResolutionMode>(null);
  const [resolutionLoading, setResolutionLoading] = useState(false);
  // Phase 2A: dynamic agreement concepts
  const [agreementConcepts, setAgreementConcepts] = useState<ResolvedConceptForPayroll[]>([]);
  const [unmappedConcepts, setUnmappedConcepts] = useState<ResolvedConceptForPayroll[]>([]);
  // S9.18: Flex plan state
  const [flexPlanOpen, setFlexPlanOpen] = useState(false);

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
        const complements = Array.isArray(data.complements) ? data.complements as any[] : [];
        const restoredEarnings = DEFAULT_EARNINGS.map((e, i) => {
          const saved = complements.find((c: any) => c.code === e.code || c.code === PERSISTENCE_CODE_MAP[e.code]);
          return {
            ...e,
            id: `earning-${i}`,
            amount: e.code === 'BASE' ? (Number(data.base_salary) || 0) : (saved?.amount || 0)
          };
        });
        setEarnings(restoredEarnings);

        // Check if there's agreement trace in complements
        const agreementTrace = complements.find((c: any) => c.code === '__agreement_trace');
        if (agreementTrace) {
          setResolutionMode('auto');
        }

        // Restore deductions
        const otherDeds = Array.isArray(data.other_deductions) ? data.other_deductions as any[] : [];
        const restoredDeductions = DEFAULT_DEDUCTIONS.map((d, i) => {
          if (d.code === 'IRPF') return { ...d, id: `deduction-${i}`, amount: Number(data.irpf_percentage) || 15 };
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
      setAgreementResolution(null);
      setAgreementName('');
      setResolutionMode(null);
      setAgreementConcepts([]);
      setUnmappedConcepts([]);
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

  /**
   * S9.13: Resolve the applicable contract for the payroll period.
   * Ajuste 1: Not just status='active' — find the contract effective for the period.
   * Ajuste 2: Prioritize contract salary over erp_hr_employees.base_salary.
   */
  const resolveContractForPeriod = async (employeeId: string): Promise<{
    contractSalary: number | null;
    agreementId: string | null;
    professionalGroup: string | null;
  }> => {
    // Build period boundaries
    const periodStart = `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`;
    const periodEnd = `${periodYear}-${String(periodMonth).padStart(2, '0')}-28`; // safe last day approx

    // Query: contract whose start_date <= periodEnd AND (end_date IS NULL OR end_date >= periodStart)
    // Order by start_date desc to get most recent applicable contract
    const { data: contracts, error } = await supabase
      .from('erp_hr_contracts')
      .select('base_salary, annual_salary, collective_agreement_id, professional_group, start_date, end_date')
      .eq('employee_id', employeeId)
      .lte('start_date', periodEnd)
      .or(`end_date.is.null,end_date.gte.${periodStart}`)
      .order('start_date', { ascending: false })
      .limit(1);

    if (error || !contracts || contracts.length === 0) {
      return { contractSalary: null, agreementId: null, professionalGroup: null };
    }

    const contract = contracts[0] as any;

    // Resolve monthly salary: prefer base_salary (monthly), fallback annual_salary/12
    let contractSalary: number | null = null;
    if (contract.base_salary && Number(contract.base_salary) > 0) {
      contractSalary = Number(contract.base_salary);
    } else if (contract.annual_salary && Number(contract.annual_salary) > 0) {
      contractSalary = Math.round((Number(contract.annual_salary) / 12) * 100) / 100;
    }

    return {
      contractSalary,
      agreementId: contract.collective_agreement_id || null,
      professionalGroup: contract.professional_group || null,
    };
  };

  const handleEmployeeSelect = async (employeeId: string, employee?: EmployeeOption) => {
    setSelectedEmployeeId(employeeId);
    setAgreementResolution(null);
    setAgreementName('');
    setResolutionMode(null);
    setAgreementConcepts([]);
    setUnmappedConcepts([]);

    if (!employee) return;

    setSelectedEmployeeName(`${employee.first_name} ${employee.last_name}`);
    setSelectedEmployeeCategory(employee.job_title || 'Sin categoría');
    setResolutionLoading(true);

    try {
      // Step 1: Get employee base_salary as fallback
      const { data: empData } = await supabase
        .from('erp_hr_employees')
        .select('base_salary')
        .eq('id', employeeId)
        .single();

      const empBaseSalaryAnnual = empData?.base_salary ? Number(empData.base_salary) : 0;

      // Step 2: Resolve contract for this period (Ajuste 1 & 2)
      const { contractSalary, agreementId, professionalGroup } = await resolveContractForPeriod(employeeId);

      // Ajuste 2: Prioritize contract salary, fallback to employee base_salary / 12
      const salarioPactado = contractSalary ?? (empBaseSalaryAnnual > 0 ? Math.round((empBaseSalaryAnnual / 12) * 100) / 100 : 0);

      // Step 3: Try agreement resolution if we have agreement + group
      if (agreementId && professionalGroup) {
        // Fetch agreement_code from erp_hr_collective_agreements
        const { data: agreement } = await supabase
          .from('erp_hr_collective_agreements')
          .select('code, name')
          .eq('id', agreementId)
          .single();

        if (agreement?.code) {
          const resolution = await resolveEmployeeSalary(
            companyId,
            agreement.code,
            professionalGroup,
            periodYear,
            salarioPactado
          );

          setAgreementResolution(resolution);
          setAgreementName(agreement.name || agreement.code);

          if (resolution.tableEntry) {
            // Auto-resolved from agreement tables
            setResolutionMode('auto');

            // Pre-fill earnings with classic trio
            const classicEarnings = DEFAULT_EARNINGS.map((e, i) => {
              let amount = 0;
              if (e.code === 'BASE') amount = resolution.salarioBaseConvenio;
              else if (e.code === 'PLUS_CONV') amount = resolution.plusConvenioTabla;
              else if (e.code === 'MEJORA_VOL') amount = resolution.mejoraVoluntaria;
              return { ...e, id: `earning-${i}`, amount };
            });
            const classicDeductions = DEFAULT_DEDUCTIONS.map((d, i) => ({
              ...d, id: `deduction-${i}`, amount: d.code === 'IRPF' ? 15 : 0
            }));

            // Phase 2A: Resolve dynamic agreement concepts
            try {
              const payrollDate = new Date(periodYear, periodMonth - 1, 1);
              const dynConcepts = await resolveAgreementConcepts(
                agreementId, companyId || null, professionalGroup, null, payrollDate
              );

              // Separate mapped (non-classic-trio) from unmapped
              const mapped: ResolvedConceptForPayroll[] = [];
              const unmappedList: ResolvedConceptForPayroll[] = [];
              for (const c of dynConcepts) {
                if (c.unmapped) {
                  unmappedList.push(c);
                } else if (c.erpConceptCode && CLASSIC_TRIO_ERP_CODES.has(c.erpConceptCode)) {
                  // Skip — already handled by classic trio resolution
                } else {
                  mapped.push(c);
                }
              }

              // Inject mapped concepts as additional earnings/deductions
              const dynamicEarnings = mapped
                .filter(c => c.type === 'earning')
                .map((c, i) => ({
                  id: `dyn-earning-${i}`,
                  code: c.erpConceptCode || c.agreementConceptCode,
                  name: c.agreementConceptName,
                  type: 'earning' as const,
                  category: 'variable' as const,
                  amount: c.amount,
                  isPercentage: c.isPercentage,
                  cotizaSS: c.cotizaSS,
                  tributaIRPF: c.tributaIRPF,
                  isEditable: true,
                }));

              const dynamicDeductions = mapped
                .filter(c => c.type === 'deduction')
                .map((c, i) => ({
                  id: `dyn-deduction-${i}`,
                  code: c.erpConceptCode || c.agreementConceptCode,
                  name: c.agreementConceptName,
                  type: 'deduction' as const,
                  category: 'other' as const,
                  amount: c.amount,
                  isPercentage: c.isPercentage,
                  cotizaSS: c.cotizaSS,
                  tributaIRPF: c.tributaIRPF,
                  isEditable: true,
                }));

              setEarnings([...classicEarnings, ...dynamicEarnings]);
              setDeductions([...classicDeductions, ...dynamicDeductions]);
              setAgreementConcepts(mapped);
              setUnmappedConcepts(unmappedList);
            } catch (conceptErr) {
              console.warn('[HRPayrollEntryDialog] concept resolution error (non-fatal):', conceptErr);
              setEarnings(classicEarnings);
              setDeductions(classicDeductions);
            }

            return; // Done — agreement resolved
          } else {
            // No table found or ambiguous — resolution returned fallback
            setResolutionMode('manual');
          }
        }
      } else if (agreementId && !professionalGroup) {
        // Ajuste S9.14-4: Contract has agreement but missing professional_group
        // Show explicit warning, degrade to manual — do NOT attempt auto-resolution
        setResolutionMode('missing_group');
        const { data: agreement } = await supabase
          .from('erp_hr_collective_agreements')
          .select('name')
          .eq('id', agreementId)
          .single();
        setAgreementName(agreement?.name || '');
      }

      // Fallback: no agreement or no table → manual mode
      if (!resolutionMode) setResolutionMode('manual');
      resetConcepts(salarioPactado, 15);
    } catch (err) {
      console.error('[HRPayrollEntryDialog] agreement resolution error:', err);
      setResolutionMode('manual');
      resetConcepts(0, 15);
    } finally {
      setResolutionLoading(false);
    }
  };

  /**
   * S9.13 Ajuste 3: Validate fixed salary block against agreement minimum.
   * Only BASE + PLUS_CONV + MEJORA_VOL count — not bonus/horas extra.
   */
  const getFixedSalaryBlock = useCallback(() => {
    const fixedCodes = ['BASE', 'PLUS_CONV', 'MEJORA_VOL'];
    return earnings
      .filter(e => fixedCodes.includes(e.code))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [earnings]);

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

    // Ajuste 3: Validate agreement minimum against fixed salary block
    if (agreementResolution?.tableEntry) {
      const minimoConvenio = agreementResolution.trace.totalMinimoConvenio;
      const fixedBlock = getFixedSalaryBlock();
      if (fixedBlock < minimoConvenio) {
        toast.error(
          `El bloque salarial fijo (${fixedBlock.toFixed(2)}€) es inferior al mínimo de convenio (${minimoConvenio.toFixed(2)}€). Ajuste BASE + Plus Convenio + Mejora Voluntaria.`,
          { duration: 6000 }
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      // Ajuste 4: Use persistence codes (ES_SAL_BASE, ES_COMP_CONVENIO, ES_MEJORA_VOLUNTARIA)
      const complements = earnings
        .filter(e => e.code !== 'BASE' && e.amount > 0)
        .map(e => ({
          code: PERSISTENCE_CODE_MAP[e.code] || e.code,
          name: e.name,
          amount: e.amount,
          cotizaSS: e.cotizaSS,
          tributaIRPF: e.tributaIRPF,
        }));

      // Ajuste 5 & trazabilidad: Include agreement trace if resolved
      if (agreementResolution?.trace) {
        complements.push({
          code: '__agreement_trace',
          name: 'Traza de convenio',
          amount: 0,
          cotizaSS: false,
          tributaIRPF: false,
          ...({ trace: agreementResolution.trace, mode: resolutionMode } as any),
        });
      }

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

  // S9.13: Agreement resolution card
  const renderAgreementCard = () => {
    if (!selectedEmployeeId || resolutionLoading) return null;
    if (resolutionMode === null) return null;

    if (resolutionMode === 'auto' && agreementResolution) {
      const r = agreementResolution;
      const trace = r.trace;
      return (
        <Card className="mb-4 border-primary/30 bg-primary/5">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              Convenio aplicado
              <Badge variant="default" className="text-[10px] h-5 bg-green-600">
                <CheckCircle className="h-3 w-3 mr-0.5" />
                Automático
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Convenio</span>
                <p className="font-medium truncate" title={agreementName}>{agreementName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Grupo profesional</span>
                <p className="font-medium">{trace.professionalGroup}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Año/Tabla</span>
                <p className="font-medium">{trace.year}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Mínimo convenio</span>
                <p className="font-medium text-primary">{trace.totalMinimoConvenio.toFixed(2)}€</p>
              </div>
            </div>
            <Separator className="my-2" />
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-1.5 bg-background rounded border">
                <span className="text-muted-foreground">Base convenio</span>
                <p className="font-semibold">{r.salarioBaseConvenio.toFixed(2)}€</p>
              </div>
              <div className="p-1.5 bg-background rounded border">
                <span className="text-muted-foreground">Plus convenio</span>
                <p className="font-semibold">{r.plusConvenioTabla.toFixed(2)}€</p>
              </div>
              <div className={cn("p-1.5 rounded border", r.hasMejoraVoluntaria ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" : "bg-background")}>
                <span className="text-muted-foreground">Mejora voluntaria</span>
                <p className="font-semibold">
                  {r.hasMejoraVoluntaria ? `${r.mejoraVoluntaria.toFixed(2)}€` : '—'}
                </p>
              </div>
            </div>
            {trace.formula && (
              <p className="text-[10px] text-muted-foreground mt-2 italic">
                <Info className="h-3 w-3 inline mr-0.5" />
                {trace.formula}
              </p>
            )}
          </CardContent>
        </Card>
      );
    }

    // Missing professional_group — specific warning
    if (resolutionMode === 'missing_group') {
      return (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-lg border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-700/30">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300">
            <p className="font-medium">Convenio asignado{agreementName ? ` (${agreementName})` : ''} pero falta grupo profesional en el contrato.</p>
            <p className="mt-1">No se puede resolver la tabla salarial automáticamente. Complete el campo "Grupo profesional" en el contrato del empleado para activar la resolución de convenio.</p>
            <Badge variant="outline" className="mt-1.5 text-[10px] border-amber-400/50 text-amber-700 dark:text-amber-400">Salario manual</Badge>
          </div>
        </div>
      );
    }

    // Manual / degradation mode
    return (
      <div className="mb-4 flex items-center gap-2 p-3 rounded-lg border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-700/30">
        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
        <div className="text-xs text-amber-800 dark:text-amber-300">
          <p>Sin convenio aplicable — salario manual. No se ha podido resolver tabla salarial de convenio para este empleado y periodo.</p>
          <Badge variant="outline" className="mt-1 text-[10px] border-amber-400/50 text-amber-700 dark:text-amber-400">Salario manual</Badge>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            {isEditMode ? 'Editar Nómina' : 'Nueva Nómina'} — {new Date(periodYear, periodMonth - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modifica los conceptos salariales' : 'Selecciona un empleado y configura los conceptos'}
          </DialogDescription>
        </DialogHeader>

        {/* S9.18-H2: Fixed top section — no scroll */}
        <div className="shrink-0">
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

          {/* S9.13: Agreement resolution card */}
          {resolutionLoading ? (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
              <Calculator className="h-4 w-4 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Resolviendo convenio colectivo...</p>
            </div>
          ) : (
            renderAgreementCard()
          )}

          {/* S9.18: Flexible remuneration card */}
          {selectedEmployeeId && companyId && (
            <Collapsible open={flexPlanOpen} onOpenChange={setFlexPlanOpen} className="mb-4">
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors text-xs">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">Retribución Flexible ES</span>
                <ChevronDown className={cn("h-3 w-3 ml-auto transition-transform", flexPlanOpen && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <HRFlexibleRemunerationPanel
                  employeeId={selectedEmployeeId}
                  companyId={companyId}
                  year={periodYear}
                  compact
                />
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        {/* S9.18-H2: Scrollable bottom section — tabs + concepts */}
        <div className="flex-1 overflow-y-auto min-h-0">
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
              <div className="pr-4 pb-4">
                <div className="space-y-2">
                  {earnings.map(concept => {
                    const isDynamic = concept.id.startsWith('dyn-');
                    const isClassicResolved = resolutionMode === 'auto' && ['BASE', 'PLUS_CONV', 'MEJORA_VOL'].includes(concept.code) && concept.amount > 0;
                    return (
                    <div key={concept.id} className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border",
                      concept.amount > 0 ? "bg-background" : "bg-muted/30",
                      isClassicResolved ? "border-primary/30 bg-primary/5" : "",
                      isDynamic && concept.amount > 0 ? "border-accent/30 bg-accent/5" : "",
                    )}>
                      <div className="flex-1">
                        <span className="text-sm">{concept.name}</span>
                        {isClassicResolved && (
                          <Badge variant="outline" className="ml-1 text-[9px] h-4 text-primary border-primary/30">Convenio</Badge>
                        )}
                        {isDynamic && (
                          <Badge variant="outline" className="ml-1 text-[9px] h-4 text-accent-foreground border-accent/30 bg-accent/10">Convenio</Badge>
                        )}
                      </div>
                      <div className="w-24">
                        <Input type="number" value={concept.amount || ''} onChange={(e) => updateConcept(concept.id, parseFloat(e.target.value) || 0)} className="h-8 text-sm" placeholder="0" step="0.01" />
                      </div>
                      <div className="flex gap-1">
                        {concept.cotizaSS && <Badge variant="outline" className="text-[10px] h-5">SS</Badge>}
                        {concept.tributaIRPF && <Badge variant="outline" className="text-[10px] h-5">IRPF</Badge>}
                      </div>
                    </div>
                    );
                  })}
                  {/* Phase 2A: Unmapped agreement concepts */}
                  {unmappedConcepts.length > 0 && (
                    <>
                      <Separator className="my-2" />
                      <h4 className="text-xs font-medium text-muted-foreground uppercase mb-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        Conceptos de convenio pendientes de mapping ({unmappedConcepts.length})
                      </h4>
                      {unmappedConcepts.map((c, i) => (
                        <div key={`unmapped-${i}`} className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-amber-300/50 bg-amber-50/30 dark:bg-amber-950/10">
                          <div className="flex-1">
                            <span className="text-sm text-muted-foreground">{c.agreementConceptName}</span>
                            <Badge variant="outline" className="ml-1 text-[9px] h-4 border-amber-400/50 text-amber-600 dark:text-amber-400">Sin mapping</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">{c.agreementConceptCode}</span>
                          <span className="text-xs text-muted-foreground">{c.amount > 0 ? `${c.amount}${c.isPercentage ? '%' : '€'}` : '—'}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="deductions" className="mt-4">
              <div className="pr-4 pb-4">
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
              </div>
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

        <DialogFooter className="shrink-0 mt-4">
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
