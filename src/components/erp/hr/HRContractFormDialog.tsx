/**
 * HRContractFormDialog - Crear/Editar contratos laborales
 * Incluye CNO obligatorio desde 15/02/2022 (RD 504/2022)
 * Incluye Convenio Colectivo obligatorio (Art. 8.5 ET)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Save, Loader2, AlertCircle, Briefcase, Scale, Info, Calculator, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HREmployeeSearchSelect } from './shared/HREmployeeSearchSelect';
import { HRCNOSelect } from './shared/HRCNOSelect';
import { HRCollectiveAgreementSelect, type AgreementData } from './shared/HRCollectiveAgreementSelect';
import { Switch } from '@/components/ui/switch';
import { ConfirmationDialog } from '@/components/erp/maestros/shared/ConfirmationDialog';
import {
  diagnoseContractParametrization,
  type ParametrizationDiagnostic,
} from '@/engines/erp/hr/contractSalaryParametrization';
import { logDataModification } from '@/lib/security/auditLogger';
import { useAuth } from '@/hooks/useAuth';

interface HRContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  contractId?: string;
  employeeId?: string;
  companyCNAE?: string;
  onSaved?: () => void;
}

const CONTRACT_TYPES = [
  { value: 'indefinido', label: 'Indefinido' },
  { value: 'temporal', label: 'Temporal' },
  { value: 'formacion', label: 'Formación y Aprendizaje' },
  { value: 'practicas', label: 'Prácticas' },
  { value: 'obra_servicio', label: 'Obra o Servicio' },
  { value: 'interinidad', label: 'Interinidad' },
  { value: 'relevo', label: 'Relevo' }
];

const WORKDAY_TYPES = [
  { value: 'completa', label: 'Jornada Completa' },
  { value: 'parcial', label: 'Jornada Parcial' },
  { value: 'reducida', label: 'Jornada Reducida' }
];

export function HRContractFormDialog({
  open,
  onOpenChange,
  companyId,
  contractId,
  employeeId,
  companyCNAE,
  onSaved
}: HRContractFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<AgreementData | null>(null);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [useCustomGroup, setUseCustomGroup] = useState(false);
  const [groupMismatchWarning, setGroupMismatchWarning] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: employeeId || '',
    contract_type: 'indefinido',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    probation_end_date: '',
    base_salary: '',
    annual_salary: '',
    working_hours: '40',
    workday_type: 'completa',
    category: '',
    professional_group: '',
    cno_code: '',
    cno_description: '',
    collective_agreement_id: '',
    notes: '',
    // S9.21p — Source of truth contractual de parametrización salarial
    salary_amount_unit: '' as '' | 'monthly' | 'annual',
    salary_periods_per_year: '' as string,
    extra_payments_prorated: null as boolean | null,
  });
  // S9.21p — Estado para confirmación de incoherencia
  const { user } = useAuth();
  const [showIncoherenceDialog, setShowIncoherenceDialog] = useState(false);
  const [pendingDiagnostic, setPendingDiagnostic] = useState<ParametrizationDiagnostic | null>(null);
  const [previousIncoherenceConfirmed, setPreviousIncoherenceConfirmed] = useState(false);

  // Fetch professional groups when agreement changes
  const fetchProfessionalGroups = useCallback(async (agreementCode: string) => {
    if (!agreementCode) {
      setAvailableGroups([]);
      return;
    }
    setLoadingGroups(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_agreement_salary_tables')
        .select('professional_group')
        .eq('agreement_code', agreementCode)
        .eq('is_active', true);

      if (error) {
        console.error('[HRContractFormDialog] Error fetching groups:', error);
        setAvailableGroups([]);
        return;
      }

      const groups = [...new Set(
        (data ?? [])
          .map(r => (r.professional_group ?? '').trim())
          .filter(g => g.length > 0)
      )].sort((a, b) => a.localeCompare(b, 'es'));

      setAvailableGroups(groups);
    } catch (err) {
      console.error('[HRContractFormDialog] Unexpected error fetching groups:', err);
      setAvailableGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  // Prefill agreement from ES extension for new contracts
  const prefillFromESExtension = useCallback(async (empId: string) => {
    if (!empId || contractId) return; // Only for new contracts
    try {
      const { data: ext } = await supabase
        .from('hr_employee_extensions')
        .select('extension_data')
        .eq('employee_id', empId)
        .eq('country_code', 'ES')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ext?.extension_data) {
        const extData = ext.extension_data as Record<string, unknown>;
        const agreementId = extData.collective_agreement as string | undefined;
        if (agreementId && !formData.collective_agreement_id) {
          setFormData(prev => ({ ...prev, collective_agreement_id: agreementId }));
        }
      }
    } catch (err) {
      console.error('[HRContractFormDialog] Prefill from ES extension error:', err);
    }
  }, [contractId, formData.collective_agreement_id]);

  useEffect(() => {
    if (open) {
      if (contractId) {
        fetchContract();
      } else {
        resetForm();
      }
    }
  }, [open, contractId]);

  const fetchContract = async () => {
    if (!contractId) return;
    
    const { data } = await supabase
      .from('erp_hr_contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (data) {
      setFormData({
        employee_id: data.employee_id || '',
        contract_type: data.contract_type || 'indefinido',
        start_date: data.start_date || '',
        end_date: data.end_date || '',
        probation_end_date: data.probation_end_date || '',
        base_salary: data.base_salary?.toString() || '',
        annual_salary: data.annual_salary?.toString() || '',
        working_hours: data.working_hours?.toString() || '40',
        workday_type: data.workday_type || 'completa',
        category: data.category || '',
        professional_group: data.professional_group || '',
        cno_code: (data as Record<string, unknown>).cno_code as string || '',
        cno_description: (data as Record<string, unknown>).cno_description as string || '',
        collective_agreement_id: (data as Record<string, unknown>).collective_agreement_id as string || '',
        notes: data.notes || '',
        salary_amount_unit: ((data as any).salary_amount_unit as 'monthly' | 'annual' | null) || '',
        salary_periods_per_year: (data as any).salary_periods_per_year != null
          ? String((data as any).salary_periods_per_year)
          : '',
        extra_payments_prorated: ((data as any).extra_payments_prorated ?? null) as boolean | null,
      });
      // S9.21p — capturar si ya tenía confirmación previa de incoherencia
      setPreviousIncoherenceConfirmed(
        Boolean((data as any).manual_incoherence_confirmation_at)
      );
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: employeeId || '',
      contract_type: 'indefinido',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      probation_end_date: '',
      base_salary: '',
      annual_salary: '',
      working_hours: '40',
      workday_type: 'completa',
      category: '',
      professional_group: '',
      cno_code: '',
      cno_description: '',
      collective_agreement_id: '',
      notes: '',
      salary_amount_unit: '',
      salary_periods_per_year: '',
      extra_payments_prorated: null,
    });
    setSelectedAgreement(null);
    setAvailableGroups([]);
    setUseCustomGroup(false);
    setGroupMismatchWarning(false);
    setPreviousIncoherenceConfirmed(false);
    setPendingDiagnostic(null);
  };

  // When employee changes on new contract, try prefill
  useEffect(() => {
    if (formData.employee_id && !contractId && open) {
      prefillFromESExtension(formData.employee_id);
    }
  }, [formData.employee_id, contractId, open, prefillFromESExtension]);

  // When agreement changes, fetch groups and validate current value
  useEffect(() => {
    if (selectedAgreement?.code) {
      fetchProfessionalGroups(selectedAgreement.code);
    } else {
      setAvailableGroups([]);
    }
  }, [selectedAgreement?.code, fetchProfessionalGroups]);

  // Validate professional_group against available groups when groups load
  useEffect(() => {
    if (availableGroups.length > 0 && formData.professional_group) {
      const isValid = availableGroups.includes(formData.professional_group);
      if (!isValid) {
        setGroupMismatchWarning(true);
        setUseCustomGroup(true);
      } else {
        setGroupMismatchWarning(false);
        setUseCustomGroup(false);
      }
    } else {
      setGroupMismatchWarning(false);
    }
  }, [availableGroups, formData.professional_group]);

  // S9.21p — snapshot del contrato para diagnóstico
  const buildContractSnapshot = useCallback(() => {
    const periodsNum = formData.salary_periods_per_year
      ? parseInt(formData.salary_periods_per_year, 10)
      : null;
    return {
      salary_amount_unit: (formData.salary_amount_unit || null) as 'monthly' | 'annual' | null,
      salary_periods_per_year: Number.isFinite(periodsNum as number) ? periodsNum : null,
      extra_payments_prorated: formData.extra_payments_prorated,
      base_salary: formData.base_salary ? parseFloat(formData.base_salary) : null,
      annual_salary: formData.annual_salary ? parseFloat(formData.annual_salary) : null,
    };
  }, [formData.salary_amount_unit, formData.salary_periods_per_year, formData.extra_payments_prorated, formData.base_salary, formData.annual_salary]);

  // S9.21p — diagnóstico en vivo (warnings inline)
  const liveDiagnostic = diagnoseContractParametrization(buildContractSnapshot());

  /**
   * S9.21p — Persistencia con orden estricto:
   *   1. Si el contrato resulta incoherent y el usuario confirmó → log central PRIMERO
   *   2. Si el log falla → no actualizar, dejar formulario abierto
   *   3. Si va bien → actualizar BD con campos manual_incoherence_*
   *   4. Si se resuelve incoherencia previa → log de resolución PRIMERO, luego limpiar
   */
  const persistContract = useCallback(async (
    diagnostic: ParametrizationDiagnostic,
    confirmedIncoherence: boolean,
  ) => {
    setLoading(true);
    try {
      const agreementId = formData.collective_agreement_id.startsWith('local_')
        ? null
        : formData.collective_agreement_id;

      const snapshot = buildContractSnapshot();

      const baseContractData: Record<string, unknown> = {
        company_id: companyId,
        employee_id: formData.employee_id,
        contract_type: formData.contract_type,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        probation_end_date: formData.probation_end_date || null,
        base_salary: snapshot.base_salary,
        annual_salary: snapshot.annual_salary,
        working_hours: parseFloat(formData.working_hours) || 40,
        workday_type: formData.workday_type,
        category: formData.category || null,
        cno_code: formData.cno_code || null,
        cno_description: formData.cno_description || null,
        collective_agreement_id: agreementId,
        professional_group: formData.professional_group || null,
        notes: formData.notes || null,
        // Source of truth contractual
        salary_amount_unit: snapshot.salary_amount_unit,
        salary_periods_per_year: snapshot.salary_periods_per_year,
        extra_payments_prorated: snapshot.extra_payments_prorated,
      };

      const isIncoherent = diagnostic.status === 'incoherent';
      const isResolution = previousIncoherenceConfirmed && diagnostic.status === 'complete';

      // ── Paso 1: log central PRIMERO si hay confirmación o resolución ──
      if (isIncoherent && confirmedIncoherence) {
        try {
          await logDataModification(
            'erp_hr_contracts',
            contractId || 'new',
            contractId ? 'update' : 'create',
            undefined,
            {
              event: 'incoherence_acceptance',
              severity: diagnostic.incoherenceSeverity,
              reasons: diagnostic.reasons,
              affectedFields: diagnostic.affectedFields,
              snapshot,
              confirmed_by: user?.id,
              confirmed_at: new Date().toISOString(),
            },
          );
        } catch (logErr) {
          console.error('[HRContractFormDialog] central audit log failed:', logErr);
          toast.error('No se pudo registrar la auditoría central. No se actualiza el contrato.');
          setLoading(false);
          return;
        }
      } else if (isResolution) {
        try {
          await logDataModification(
            'erp_hr_contracts',
            contractId || 'unknown',
            'update',
            undefined,
            {
              event: 'incoherence_resolution',
              snapshot,
              resolved_by: user?.id,
              resolved_at: new Date().toISOString(),
            },
          );
        } catch (logErr) {
          console.error('[HRContractFormDialog] resolution audit log failed:', logErr);
          toast.error('No se pudo registrar la resolución. La huella local se conserva.');
          setLoading(false);
          return;
        }
      }

      // ── Paso 2: campos de auditoría local ──
      if (isIncoherent && confirmedIncoherence) {
        baseContractData.manual_incoherence_confirmation_at = new Date().toISOString();
        baseContractData.manual_incoherence_confirmed_by = user?.id || null;
        baseContractData.manual_incoherence_confirmation_type = diagnostic.incoherenceSeverity;
      } else if (isResolution) {
        // log central OK → limpiar huella local
        baseContractData.manual_incoherence_confirmation_at = null;
        baseContractData.manual_incoherence_confirmed_by = null;
        baseContractData.manual_incoherence_confirmation_type = null;
      }
      // En estados pending o complete sin previous, no se tocan los campos manual_incoherence_*

      // ── Paso 3: status del contrato ──
      if (isIncoherent) {
        baseContractData.status = 'incoherent';
      }

      // ── Paso 4: UPDATE/INSERT en BD ──
      if (contractId) {
        const { error } = await supabase
          .from('erp_hr_contracts')
          .update(baseContractData as any)
          .eq('id', contractId);
        if (error) throw error;
        toast.success(isIncoherent
          ? 'Contrato actualizado (incoherencia registrada)'
          : 'Contrato actualizado');
      } else {
        const { error } = await supabase
          .from('erp_hr_contracts')
          .insert([baseContractData] as any);
        if (error) throw error;
        toast.success(isIncoherent
          ? 'Contrato creado (incoherencia registrada)'
          : 'Contrato creado');
      }

      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving contract:', error);
      toast.error('Error al guardar el contrato');
    } finally {
      setLoading(false);
    }
  }, [formData, companyId, contractId, buildContractSnapshot, previousIncoherenceConfirmed, user?.id, onSaved, onOpenChange]);

  const handleSubmit = async () => {
    if (!formData.employee_id || !formData.start_date) {
      toast.error('Empleado y fecha de inicio son obligatorios');
      return;
    }

    // Validar CNO obligatorio (RD 504/2022)
    if (!formData.cno_code) {
      toast.error('El código CNO es obligatorio para comunicaciones al Sistema RED y TGSS');
      return;
    }

    // Validar Convenio Colectivo obligatorio (Art. 8.5 ET)
    if (!formData.collective_agreement_id) {
      toast.error('El convenio colectivo es obligatorio según Art. 8.5 del Estatuto de los Trabajadores');
      return;
    }

    // S9.21p — Validaciones bloqueantes de parametrización
    const snap = buildContractSnapshot();
    const diagnostic = diagnoseContractParametrization(snap);

    if (diagnostic.status === 'pending') {
      // pending = falta info; permitido guardar (legacy aún operará en nivel 3)
      // pero avisar al usuario
      toast.warning('Parametrización salarial incompleta — la nómina usará lógica legacy');
    }

    if (diagnostic.status === 'incoherent') {
      // Abrir confirmación. La persistencia ocurrirá tras confirmar.
      setPendingDiagnostic(diagnostic);
      setShowIncoherenceDialog(true);
      return;
    }

    // complete o pending → guardar directamente (resolución se detecta dentro)
    await persistContract(diagnostic, false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {contractId ? 'Editar Contrato' : 'Nuevo Contrato'}
          </DialogTitle>
          <DialogDescription>
            Complete los datos del contrato laboral
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Empleado *</Label>
                <HREmployeeSearchSelect
                  value={formData.employee_id}
                  onValueChange={(id) => setFormData(prev => ({ ...prev, employee_id: id }))}
                  companyId={companyId}
                  placeholder="Buscar empleado..."
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Contrato *</Label>
                <Select
                  value={formData.contract_type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, contract_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fin Período Prueba</Label>
                <Input
                  type="date"
                  value={formData.probation_end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, probation_end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Salario Base Mensual (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.base_salary}
                  onChange={(e) => setFormData(prev => ({ ...prev, base_salary: e.target.value }))}
                  placeholder="2500.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Salario Anual (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.annual_salary}
                  onChange={(e) => setFormData(prev => ({ ...prev, annual_salary: e.target.value }))}
                  placeholder="35000.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Horas Semanales</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.working_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, working_hours: e.target.value }))}
                />
              </div>
            </div>

            {/* CONVENIO COLECTIVO (OBLIGATORIO Art. 8.5 ET) */}
            <div className="space-y-2 p-3 rounded-lg border-2 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                <Label className="font-semibold">
                  Convenio Colectivo Aplicable *
                </Label>
                <Badge variant="outline" className="text-xs">
                  Art. 8.5 ET
                </Badge>
              </div>
              <HRCollectiveAgreementSelect
                value={formData.collective_agreement_id}
                onValueChange={(id, agreement) => {
                  setFormData(prev => ({ ...prev, collective_agreement_id: id }));
                  setSelectedAgreement(agreement);
                  // Actualizar jornada si viene del convenio
                  if (agreement && !formData.working_hours) {
                    setFormData(prev => ({ 
                      ...prev, 
                      collective_agreement_id: id,
                      working_hours: agreement.working_hours_week.toString()
                    }));
                  }
                }}
                companyId={companyId}
                companyCNAE={companyCNAE}
                required
                showValidation
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                El empresario debe informar por escrito del convenio aplicable
              </p>
            </div>

            {/* CNO - Código Nacional de Ocupación (OBLIGATORIO) */}
            <div className="space-y-2 p-3 rounded-lg border-2 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <Label className="font-semibold">
                  Código Nacional de Ocupación (CNO) *
                </Label>
                <Badge variant="outline" className="text-xs">
                  Obligatorio Sistema RED
                </Badge>
              </div>
              <HRCNOSelect
                value={formData.cno_code}
                onValueChange={(code, desc) => setFormData(prev => ({ 
                  ...prev, 
                  cno_code: code, 
                  cno_description: desc 
                }))}
                required
                showValidation
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                RD 504/2022 - Obligatorio desde 15/02/2022 para Contrat@, TGSS e IT
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo Jornada</Label>
                <Select
                  value={formData.workday_type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, workday_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKDAY_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoría Profesional</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Ej: Técnico"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label>Grupo Profesional</Label>
                  {selectedAgreement && availableGroups.length > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/30">
                      <Info className="h-2.5 w-2.5 mr-0.5" />
                      Nómina
                    </Badge>
                  )}
                </div>
                {loadingGroups ? (
                  <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-background text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Cargando grupos...
                  </div>
                ) : availableGroups.length > 0 && !useCustomGroup ? (
                  <>
                    <Select
                      value={availableGroups.includes(formData.professional_group) ? formData.professional_group : ''}
                      onValueChange={(v) => {
                        if (v === '__custom__') {
                          setUseCustomGroup(true);
                          setGroupMismatchWarning(true);
                        } else {
                          setFormData(prev => ({ ...prev, professional_group: v }));
                          setGroupMismatchWarning(false);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar grupo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableGroups.map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                        <SelectItem value="__custom__">
                          <span className="text-muted-foreground italic">Otro (texto libre)</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Requerido para resolución automática de convenio en nómina
                    </p>
                  </>
                ) : (
                  <>
                    <Input
                      value={formData.professional_group}
                      onChange={(e) => setFormData(prev => ({ ...prev, professional_group: e.target.value }))}
                      placeholder={availableGroups.length > 0 ? 'Valor personalizado...' : 'Ej: Grupo I'}
                    />
                    {availableGroups.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-[11px] text-primary"
                          onClick={() => {
                            setUseCustomGroup(false);
                            setGroupMismatchWarning(false);
                          }}
                        >
                          ← Volver a selección guiada
                        </Button>
                      </div>
                    )}
                    {groupMismatchWarning && (
                      <p className="text-[11px] text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Este valor no coincide con la tabla salarial del convenio. La nómina no resolverá automáticamente.
                      </p>
                    )}
                    {!selectedAgreement && (
                      <p className="text-[11px] text-muted-foreground">
                        Seleccione un convenio para ver grupos disponibles
                      </p>
                    )}
                    {selectedAgreement && availableGroups.length === 0 && !loadingGroups && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Sin tabla salarial para este convenio. Introduzca manualmente.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observaciones adicionales..."
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {contractId ? 'Actualizar' : 'Crear Contrato'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRContractFormDialog;
