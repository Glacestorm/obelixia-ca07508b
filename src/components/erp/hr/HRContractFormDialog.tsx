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
import { FileText, Save, Loader2, AlertCircle, Briefcase, Scale, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HREmployeeSearchSelect } from './shared/HREmployeeSearchSelect';
import { HRCNOSelect } from './shared/HRCNOSelect';
import { HRCollectiveAgreementSelect, type AgreementData } from './shared/HRCollectiveAgreementSelect';

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
    notes: ''
  });

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
        notes: data.notes || ''
      });
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
      notes: ''
    });
    setSelectedAgreement(null);
    setAvailableGroups([]);
    setUseCustomGroup(false);
    setGroupMismatchWarning(false);
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

    setLoading(true);
    try {
      // Manejar IDs locales del catálogo (convertir a null para insertar luego en DB)
      const agreementId = formData.collective_agreement_id.startsWith('local_') 
        ? null 
        : formData.collective_agreement_id;

      const contractData = {
        company_id: companyId,
        employee_id: formData.employee_id,
        contract_type: formData.contract_type,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        probation_end_date: formData.probation_end_date || null,
        base_salary: formData.base_salary ? parseFloat(formData.base_salary) : null,
        annual_salary: formData.annual_salary ? parseFloat(formData.annual_salary) : null,
        working_hours: parseFloat(formData.working_hours) || 40,
        workday_type: formData.workday_type,
        category: formData.category || null,
        cno_code: formData.cno_code || null,
        cno_description: formData.cno_description || null,
        collective_agreement_id: agreementId,
        professional_group: formData.professional_group || null,
        notes: formData.notes || null
      };

      if (contractId) {
        const { error } = await supabase
          .from('erp_hr_contracts')
          .update(contractData)
          .eq('id', contractId);
        if (error) throw error;
        toast.success('Contrato actualizado');
      } else {
        const { error } = await supabase
          .from('erp_hr_contracts')
          .insert([contractData]);
        if (error) throw error;
        toast.success('Contrato creado');
      }

      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving contract:', error);
      toast.error('Error al guardar el contrato');
    } finally {
      setLoading(false);
    }
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
                <Label>Grupo Profesional</Label>
                <Input
                  value={formData.professional_group}
                  onChange={(e) => setFormData(prev => ({ ...prev, professional_group: e.target.value }))}
                  placeholder="Ej: 2"
                />
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
