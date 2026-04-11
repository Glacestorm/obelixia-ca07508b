/**
 * Formulario de Empleado — Global HR Core
 * H2.0: Expanded to 6 tabs with full master data capture
 * Tabs: Datos Personales, Organizativos, Empleo, Perfil, Accesos, Localización (dinámica por país)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { HRCNOSelect } from './shared/HRCNOSelect';
import { HRCollectiveAgreementSelect } from './shared/HRCollectiveAgreementSelect';
import { HRModelo145Section, EMPTY_MODELO145, type Modelo145Data } from './shared/HRModelo145Section';
import { calculateIRPFRetention } from '@/lib/irpf/irpfRetentionCalculator';
import { useEmployeeLegalProfile } from '@/hooks/erp/hr/useEmployeeLegalProfile';
import { resolveContractType } from '@/engines/erp/hr/contractTypeEngine';
import { canExtendContract } from '@/lib/hr/contractEngine';
import { computeContractExpiryAlert, isTemporaryContract, type ContractExpiryAlert } from '@/engines/erp/hr/contractExpiryAlertEngine';
import { getGenerationModeConfig, setGenerationModeConfig, shouldAutoGenerate, GENERATION_MODE_LABELS, type GenerationMode } from '@/engines/erp/hr/artifactGenerationModeEngine';
import { validateDNINIE } from '@/engines/erp/hr/dniNieValidator';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  User, FileText, Key, Users, Save, Loader2, Building2, Calendar,
  Phone, Mail, Globe, Shield, Eye, Edit, Lock, CalendarClock, AlertTriangle, Zap, Clock,
  Heart, CreditCard, MapPin, GraduationCap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { HRContractVoiceCopilot } from './copilot/HRContractVoiceCopilot';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_number: string | null;
  social_security_number?: string | null;
  position: string | null;
  department_id: string | null;
  hire_date: string | null;
  termination_date?: string | null;
  contract_end_date?: string | null;
  contract_type?: string | null;
  status: string;
  phone: string | null;
  jurisdiction?: string | null;
  country_code?: string | null;
  gross_salary?: number | null;
  base_salary?: number | null;
}

interface ModuleAccess {
  module_code: string;
  module_name: string;
  description: string;
  access_level: 'none' | 'read' | 'write' | 'admin';
}

interface HREmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  companyId: string;
  onSave: () => void;
}

// === H2.0: Profile data for hr_employee_profiles ===
interface ProfileData {
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  education_level: string;
  languages: string;
  skills: string;
  certifications: string;
  personal_notes: string;
}

const EMPTY_PROFILE: ProfileData = {
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relationship: '',
  education_level: '',
  languages: '',
  skills: '',
  certifications: '',
  personal_notes: '',
};

// === H2.0: Address structured data ===
interface AddressData {
  street: string;
  city: string;
  postal_code: string;
  province: string;
  country: string;
}

const EMPTY_ADDRESS: AddressData = { street: '', city: '', postal_code: '', province: '', country: 'ES' };

const AVAILABLE_MODULES = [
  { module_code: 'maestros', module_name: 'Maestros', description: 'Gestión de datos maestros' },
  { module_code: 'ventas', module_name: 'Ventas', description: 'Gestión comercial y ventas' },
  { module_code: 'compras', module_name: 'Compras', description: 'Gestión de compras' },
  { module_code: 'almacen', module_name: 'Almacén', description: 'Control de inventario' },
  { module_code: 'tesoreria', module_name: 'Tesorería', description: 'Gestión de tesorería' },
  { module_code: 'fiscal', module_name: 'Fiscal', description: 'Contabilidad y fiscal' },
  { module_code: 'hr', module_name: 'RRHH', description: 'Recursos Humanos' },
  { module_code: 'trade', module_name: 'Comercio Exterior', description: 'Importación y exportación' },
  { module_code: 'logistics', module_name: 'Logística', description: 'Gestión logística' },
  { module_code: 'banking', module_name: 'Banca', description: 'Gestión bancaria' },
  { module_code: 'advisor', module_name: 'Asesor IA', description: 'Asistente inteligente' }
];

const ACCESS_LEVELS = [
  { value: 'none', label: 'Sin acceso', icon: Lock, color: 'text-muted-foreground' },
  { value: 'read', label: 'Lectura', icon: Eye, color: 'text-blue-500' },
  { value: 'write', label: 'Escritura', icon: Edit, color: 'text-amber-500' },
  { value: 'admin', label: 'Administrador', icon: Shield, color: 'text-green-500' }
];

const GLOBAL_STATUSES = [
  { value: 'candidate', label: 'Candidato' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'active', label: 'Activo' },
  { value: 'temporary_leave', label: 'Baja temporal' },
  { value: 'excedencia', label: 'Excedencia' },
  { value: 'offboarding', label: 'Offboarding' },
  { value: 'terminated', label: 'Baja definitiva' },
];

const COUNTRIES = [
  { code: 'ES', flag: '🇪🇸', name: 'España' },
  { code: 'FR', flag: '🇫🇷', name: 'Francia' },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal' },
  { code: 'DE', flag: '🇩🇪', name: 'Alemania' },
  { code: 'IT', flag: '🇮🇹', name: 'Italia' },
  { code: 'UK', flag: '🇬🇧', name: 'Reino Unido' },
  { code: 'US', flag: '🇺🇸', name: 'Estados Unidos' },
  { code: 'MX', flag: '🇲🇽', name: 'México' },
  { code: 'AD', flag: '🇦🇩', name: 'Andorra' },
];

const GENDER_OPTIONS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
  { value: 'no_binario', label: 'No binario' },
  { value: 'no_especificado', label: 'Prefiero no indicar' },
];

const WORK_SCHEDULE_OPTIONS = [
  { value: 'full_time', label: 'Jornada completa' },
  { value: 'part_time', label: 'Jornada parcial' },
  { value: 'reduced', label: 'Jornada reducida' },
];

const EDUCATION_LEVELS = [
  { value: 'sin_estudios', label: 'Sin estudios' },
  { value: 'eso', label: 'Educación Secundaria (ESO)' },
  { value: 'bachillerato', label: 'Bachillerato' },
  { value: 'fp_medio', label: 'FP Grado Medio' },
  { value: 'fp_superior', label: 'FP Grado Superior' },
  { value: 'grado', label: 'Grado universitario' },
  { value: 'master', label: 'Máster' },
  { value: 'doctorado', label: 'Doctorado' },
];

// === IBAN validation ===
function validateIBAN(iban: string): { valid: boolean; error: string | null } {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  if (!clean) return { valid: true, error: null }; // optional field
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(clean)) {
    return { valid: false, error: 'Formato IBAN inválido (ej: ES7921000813610123456789)' };
  }
  return { valid: true, error: null };
}

export function HREmployeeFormDialog({ open, onOpenChange, employee, companyId, onSave }: HREmployeeFormDialogProps) {
  const isNew = !employee;
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setSaving] = useState(false);
  const [selectPortalContainer, setSelectPortalContainer] = useState<HTMLElement | null>(null);
  const [generationMode, setGenerationModeState] = useState<GenerationMode>(() => getGenerationModeConfig(companyId).mode);

  // Global form state (country-agnostic) — H2.0 expanded
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    employee_number: '', position: '', department_id: '',
    hire_date: '', termination_date: '', status: 'active', country_code: 'ES',
    base_salary: 0,
    // Organizational
    legal_entity_id: '', work_center_id: '', reports_to: '',
    // H2.0: New personal fields
    national_id: '',
    birth_date: '',
    gender: '',
    nationality: '',
    secondary_nationality: '',
    bank_account: '',
    // H2.0: New employment fields
    category: '',
    work_schedule: '',
    weekly_hours: 40,
    // H2.0: Address (JSONB destructured)
    address_street: '',
    address_city: '',
    address_postal_code: '',
    address_province: '',
    address_country: 'ES',
  });

  // H2.0: Profile data (hr_employee_profiles)
  const [profileData, setProfileData] = useState<ProfileData>({ ...EMPTY_PROFILE });

  // H2.0: International fields (non-ES extensions)
  const [intlFields, setIntlFields] = useState({
    local_id_number: '',
    local_id_type: '',
    immigration_status: '',
    work_permit_expiry: '',
    tax_residence_country: '',
  });

  // H2.0: DNI/NIE validation state
  const [dniValidation, setDniValidation] = useState<{ valid: boolean; type: 'DNI' | 'NIE'; error: string | null } | null>(null);
  const [ibanValidation, setIbanValidation] = useState<{ valid: boolean; error: string | null } | null>(null);

  // Prórroga / active contract state
  const [prorrogaData, setProrrogaData] = useState({
    contractId: '' as string,
    contractType: '',
    startDate: '',
    endDate: '',
    extensionDate: '',
    extensionCount: 0,
    status: '' as string,
  });

  // ES localization fields
  const [esFields, setEsFields] = useState({
    naf: '',
    contribution_group: '',
    contract_type_rd: '',
    collective_agreement: '',
    autonomous_community: '',
    cno_code: '',
    irpf_percentage: '',
    ocupacion_ss: '' as '' | 'a' | 'b' | 'd' | 'f' | 'g' | 'h',
    ccc: '',
    empresa_fiscal_nif: '',
    empresa_fiscal_nombre: '',
  });

  const [modelo145, setModelo145] = useState<Modelo145Data>({ ...EMPTY_MODELO145 });
  const [irpfManualOverride, setIrpfManualOverride] = useState(false);

  const { compute: computeLegalProfile, persist: persistLegalProfile } = useEmployeeLegalProfile(companyId);

  const contractProfile = useMemo(() => resolveContractType(esFields.contract_type_rd), [esFields.contract_type_rd]);

  const irpfCalculation = useMemo(() => {
    if (formData.country_code !== 'ES' || !formData.base_salary) return null;
    return calculateIRPFRetention({
      grossAnnualSalary: Number(formData.base_salary) || 0,
      socialSecurityEmployee: 0,
      numPayments: 14,
      modelo145,
    });
  }, [formData.base_salary, formData.country_code, modelo145]);

  const computedProfile = useMemo(() => {
    if (formData.country_code !== 'ES') return null;
    return computeLegalProfile({
      employeeId: employee?.id || null,
      firstName: formData.first_name,
      lastName: formData.last_name,
      companyId,
      baseSalary: Number(formData.base_salary) || 0,
      contractTypeRD: esFields.contract_type_rd,
      contributionGroup: esFields.contribution_group,
      irpfPercentage: parseFloat(esFields.irpf_percentage) || 0,
      irpfLegalRate: irpfCalculation?.retentionRate || 0,
      comunidadAutonoma: esFields.autonomous_community,
      empresaFiscalNIF: esFields.empresa_fiscal_nif,
      empresaFiscalNombre: esFields.empresa_fiscal_nombre,
      ccc: esFields.ccc,
      naf: esFields.naf,
      convenioColectivo: esFields.collective_agreement,
      cnoCode: esFields.cno_code,
      ocupacionSS: esFields.ocupacion_ss,
      hireDate: formData.hire_date,
      status: formData.status,
    });
  }, [formData, esFields, irpfCalculation, companyId, employee?.id, computeLegalProfile]);

  const extensionEligibility = useMemo(() => {
    if (!prorrogaData.contractType || !prorrogaData.startDate) return null;
    return canExtendContract(
      prorrogaData.contractType,
      prorrogaData.extensionCount,
      prorrogaData.startDate,
      prorrogaData.endDate || null,
    );
  }, [prorrogaData.contractType, prorrogaData.extensionCount, prorrogaData.startDate, prorrogaData.endDate]);

  const contractDurationMonths = useMemo(() => {
    if (!prorrogaData.startDate) return null;
    const end = prorrogaData.endDate || formData.termination_date;
    if (!end) return null;
    const s = new Date(prorrogaData.startDate);
    const e = new Date(end);
    return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  }, [prorrogaData.startDate, prorrogaData.endDate, formData.termination_date]);

  const legalDurationValidation = useMemo(() => {
    const maxMeses = contractProfile?.duracionMaximaMeses;
    const hireDate = formData.hire_date;
    if (!maxMeses || !hireDate) return null;
    const effectiveEndDate = formData.termination_date || prorrogaData.endDate;
    if (!effectiveEndDate) return null;
    const start = new Date(hireDate);
    const end = new Date(effectiveEndDate);
    const actualMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
      + (end.getDate() >= start.getDate() ? 0 : -1);
    const maxEndDate = new Date(start);
    maxEndDate.setMonth(maxEndDate.getMonth() + maxMeses);
    const maxEndStr = maxEndDate.toISOString().split('T')[0];
    const isWithinLimit = actualMonths <= maxMeses;
    return {
      actualMonths: Math.max(0, actualMonths), maxMeses, maxEndDate: maxEndStr, isWithinLimit,
      contractName: contractProfile?.name || esFields.contract_type_rd,
      normativa: contractProfile?.normativaReferencia || 'ET Art. 15, RDL 32/2021',
    };
  }, [formData.hire_date, formData.termination_date, prorrogaData.endDate, contractProfile, esFields.contract_type_rd]);

  const expiryAlert = useMemo<ContractExpiryAlert | null>(() => {
    if (!prorrogaData.contractId || !prorrogaData.endDate) return null;
    const code = esFields.contract_type_rd || prorrogaData.contractType;
    if (!code || !isTemporaryContract(code)) return null;
    return computeContractExpiryAlert({
      contractId: prorrogaData.contractId, employeeId: employee?.id || '',
      employeeName: `${formData.first_name} ${formData.last_name}`,
      contractType: contractProfile?.name || code, contractTypeCode: code,
      startDate: prorrogaData.startDate, endDate: prorrogaData.endDate,
      extensionCount: prorrogaData.extensionCount, status: prorrogaData.status, isTemporary: true,
    });
  }, [prorrogaData, esFields.contract_type_rd, formData.first_name, formData.last_name, employee?.id, contractProfile]);

  const terminationVsContractEnd = useMemo(() => {
    if (!formData.termination_date || !prorrogaData.endDate) return null;
    const term = new Date(formData.termination_date);
    const contractEnd = new Date(prorrogaData.endDate);
    if (term > contractEnd) return 'after';
    if (term < contractEnd) return 'before';
    return 'exact';
  }, [formData.termination_date, prorrogaData.endDate]);

  useEffect(() => {
    if (!irpfManualOverride && irpfCalculation) {
      setEsFields(prev => ({ ...prev, irpf_percentage: String(irpfCalculation.retentionRate) }));
    }
  }, [irpfCalculation, irpfManualOverride]);

  const [moduleAccess, setModuleAccess] = useState<Record<string, 'none' | 'read' | 'write' | 'admin'>>({});
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [legalEntities, setLegalEntities] = useState<Array<{ id: string; name: string }>>([]);
  const [workCenters, setWorkCenters] = useState<Array<{ id: string; name: string; legal_entity_id: string | null }>>([]);
  const [managers, setManagers] = useState<Array<{ id: string; name: string }>>([]);

  // H2.0: Validate DNI/NIE reactively
  useEffect(() => {
    if (!formData.national_id.trim()) {
      setDniValidation(null);
      return;
    }
    const result = validateDNINIE(formData.national_id);
    setDniValidation(result);
  }, [formData.national_id]);

  // H2.0: Validate IBAN reactively
  useEffect(() => {
    if (!formData.bank_account.trim()) {
      setIbanValidation(null);
      return;
    }
    setIbanValidation(validateIBAN(formData.bank_account));
  }, [formData.bank_account]);

  useEffect(() => {
    if (employee) {
      const emp = employee as any;
      setFormData({
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        employee_number: employee.employee_number || '',
        position: employee.position || '',
        department_id: employee.department_id || '',
        hire_date: employee.hire_date || '',
        termination_date: emp.termination_date || '',
        status: employee.status || 'active',
        country_code: employee.country_code || employee.jurisdiction || 'ES',
        base_salary: employee.base_salary || employee.gross_salary || 0,
        legal_entity_id: emp.legal_entity_id || '',
        work_center_id: emp.work_center_id || '',
        reports_to: emp.reports_to || '',
        // H2.0 fields
        national_id: emp.national_id || '',
        birth_date: emp.birth_date || '',
        gender: emp.gender || '',
        nationality: emp.nationality || '',
        secondary_nationality: emp.secondary_nationality || '',
        bank_account: emp.bank_account || '',
        category: emp.category || '',
        work_schedule: emp.work_schedule || '',
        weekly_hours: emp.weekly_hours ?? 40,
        address_street: emp.address?.street || '',
        address_city: emp.address?.city || '',
        address_postal_code: emp.address?.postal_code || '',
        address_province: emp.address?.province || '',
        address_country: emp.address?.country || 'ES',
      });
      loadModuleAccess(employee.id);
      loadEsExtension(employee.id);
      loadActiveContract(employee.id);
      loadProfile(employee.id);
      loadIntlExtension(employee.id);
    } else {
      setFormData({
        first_name: '', last_name: '', email: '', phone: '',
        employee_number: '', position: '', department_id: '',
        hire_date: new Date().toISOString().split('T')[0],
        termination_date: '',
        status: 'active', country_code: 'ES', base_salary: 0,
        legal_entity_id: '', work_center_id: '', reports_to: '',
        national_id: '', birth_date: '', gender: '', nationality: '', secondary_nationality: '',
        bank_account: '', category: '', work_schedule: '', weekly_hours: 40,
        address_street: '', address_city: '', address_postal_code: '', address_province: '', address_country: 'ES',
      });
      setEsFields({ naf: '', contribution_group: '', contract_type_rd: '', collective_agreement: '', autonomous_community: '', cno_code: '', irpf_percentage: '', ocupacion_ss: '' as '', ccc: '', empresa_fiscal_nif: '', empresa_fiscal_nombre: '' });
      setModelo145({ ...EMPTY_MODELO145 });
      setProfileData({ ...EMPTY_PROFILE });
      setIntlFields({ local_id_number: '', local_id_type: '', immigration_status: '', work_permit_expiry: '', tax_residence_country: '' });
      const defaultAccess: Record<string, 'none'> = {};
      AVAILABLE_MODULES.forEach(m => { defaultAccess[m.module_code] = 'none'; });
      setModuleAccess(defaultAccess);
    }
  }, [employee, open]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      setSelectPortalContainer(document.getElementById('hr-employee-form-dialog'));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const loadEsExtension = async (employeeId: string) => {
    try {
      const { data } = await supabase
        .from('hr_employee_extensions')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('country_code', 'ES')
        .maybeSingle();
      if (data) {
        const ext = (data.extension_data || {}) as Record<string, any>;
        setEsFields({
          naf: data.social_security_number || '',
          contribution_group: ext.contribution_group || '',
          contract_type_rd: ext.contract_type_rd || '',
          collective_agreement: ext.collective_agreement || '',
          autonomous_community: ext.autonomous_community || '',
          cno_code: ext.cno_code || '',
          irpf_percentage: ext.irpf_percentage || '',
          ocupacion_ss: ext.ocupacion_ss || '',
          ccc: ext.ccc || '',
          empresa_fiscal_nif: ext.empresa_fiscal_nif || '',
          empresa_fiscal_nombre: ext.empresa_fiscal_nombre || '',
        });
        if (ext.modelo145) {
          setModelo145({ ...EMPTY_MODELO145, ...ext.modelo145 });
        } else {
          setModelo145({ ...EMPTY_MODELO145 });
        }
      }
    } catch (err) {
      console.error('[ES Extension] load error:', err);
    }
  };

  // H2.0: Load international extension for non-ES countries
  const loadIntlExtension = async (employeeId: string) => {
    try {
      const { data } = await supabase
        .from('hr_employee_extensions')
        .select('*')
        .eq('employee_id', employeeId)
        .neq('country_code', 'ES')
        .maybeSingle();
      if (data) {
        const ext = (data.extension_data || {}) as Record<string, any>;
        setIntlFields({
          local_id_number: ext.local_id_number || '',
          local_id_type: ext.local_id_type || '',
          immigration_status: ext.immigration_status || '',
          work_permit_expiry: ext.work_permit_expiry || '',
          tax_residence_country: ext.tax_residence_country || '',
        });
      }
    } catch (err) {
      console.error('[Intl Extension] load error:', err);
    }
  };

  // H2.0: Load profile data
  const loadProfile = async (employeeId: string) => {
    try {
      const { data } = await supabase
        .from('hr_employee_profiles' as any)
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();
      if (data) {
        const d = data as any;
        setProfileData({
          emergency_contact_name: d.emergency_contact_name || '',
          emergency_contact_phone: d.emergency_contact_phone || '',
          emergency_contact_relationship: d.emergency_contact_relationship || '',
          education_level: d.education_level || '',
          languages: Array.isArray(d.languages) ? d.languages.join(', ') : (d.languages || ''),
          skills: Array.isArray(d.skills) ? d.skills.join(', ') : (d.skills || ''),
          certifications: Array.isArray(d.certifications) ? d.certifications.join(', ') : (d.certifications || ''),
          personal_notes: d.personal_notes || '',
        });
      }
    } catch (err) {
      console.error('[Profile] load error:', err);
    }
  };

  const loadActiveContract = async (employeeId: string) => {
    try {
      const { data } = await supabase
        .from('erp_hr_contracts')
        .select('id, contract_type, start_date, end_date, extension_date, extension_count, status')
        .eq('employee_id', employeeId)
        .eq('is_active', true)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setProrrogaData({
          contractId: data.id, contractType: data.contract_type || '',
          startDate: data.start_date || '', endDate: data.end_date || '',
          extensionDate: data.extension_date || '', extensionCount: data.extension_count || 0,
          status: data.status || '',
        });
      } else {
        setProrrogaData({ contractId: '', contractType: '', startDate: '', endDate: '', extensionDate: '', extensionCount: 0, status: '' });
      }
    } catch (err) {
      console.error('[ActiveContract] load error:', err);
    }
  };

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const [depts, entities, centers, mgrs] = await Promise.all([
        supabase.from('erp_hr_departments').select('id, name').eq('company_id', companyId).order('name'),
        supabase.from('erp_hr_legal_entities').select('id, name, legal_name').eq('company_id', companyId).order('name'),
        supabase.from('erp_hr_work_centers').select('id, name, code, legal_entity_id').eq('company_id', companyId).order('name'),
        supabase.from('erp_hr_employees').select('id, first_name, last_name').eq('company_id', companyId).eq('status', 'active').order('last_name'),
      ]);
      if (depts.data) setDepartments(depts.data as any);
      if (entities.data) {
        setLegalEntities(entities.data.map((entity: any) => ({ id: entity.id, name: entity.name || entity.legal_name || 'Entidad legal' })));
      }
      if (centers.data) {
        setWorkCenters(centers.data.map((center: any) => ({ id: center.id, name: center.name || center.code || 'Centro de trabajo', legal_entity_id: center.legal_entity_id ?? null })));
      }
      if (mgrs.data) setManagers(mgrs.data.map((m: any) => ({ id: m.id, name: `${m.first_name} ${m.last_name}` })));
    };
    load();
  }, [companyId, open]);

  const loadModuleAccess = async (employeeId: string) => {
    try {
      const { data } = await supabase.from('erp_hr_employee_module_access').select('module_code, access_level').eq('employee_id', employeeId);
      const access: Record<string, 'none' | 'read' | 'write' | 'admin'> = {};
      AVAILABLE_MODULES.forEach(m => {
        const found = data?.find((d: any) => d.module_code === m.module_code);
        access[m.module_code] = found ? found.access_level : 'none';
      });
      setModuleAccess(access);
    } catch {
      const defaultAccess: Record<string, 'none'> = {};
      AVAILABLE_MODULES.forEach(m => { defaultAccess[m.module_code] = 'none'; });
      setModuleAccess(defaultAccess);
    }
  };

  const handleChange = useCallback((field: string, value: string | number) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'legal_entity_id') { next.work_center_id = ''; }
      return next;
    });
  }, []);

  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Complete los campos obligatorios');
      return;
    }
    // H2.0: DNI/NIE validation
    if (formData.national_id.trim() && dniValidation && !dniValidation.valid) {
      toast.error(`DNI/NIE inválido: ${dniValidation.error}`);
      setActiveTab('personal');
      return;
    }
    // H2.0: IBAN validation
    if (formData.bank_account.trim() && ibanValidation && !ibanValidation.valid) {
      toast.error(`IBAN inválido: ${ibanValidation.error}`);
      setActiveTab('personal');
      return;
    }
    // H2.0: birth_date before hire_date
    if (formData.birth_date && formData.hire_date && formData.birth_date >= formData.hire_date) {
      toast.error('La fecha de nacimiento debe ser anterior a la fecha de alta');
      setActiveTab('personal');
      return;
    }
    // H2.0: weekly_hours range
    if (formData.weekly_hours < 0 || formData.weekly_hours > 60) {
      toast.error('Las horas semanales deben estar entre 0 y 60');
      setActiveTab('empleo');
      return;
    }
    // Validación legal: fecha de baja obligatoria en estados de baja (ET Art. 49.1)
    if (['terminated', 'offboarding'].includes(formData.status) && !formData.termination_date) {
      toast.error('La fecha de baja es obligatoria para estados de baja (ET Art. 49.1)');
      setActiveTab('empleo');
      return;
    }
    if (formData.termination_date && formData.hire_date && formData.termination_date < formData.hire_date) {
      toast.error('La fecha de baja no puede ser anterior a la fecha de alta');
      setActiveTab('empleo');
      return;
    }
    if (prorrogaData.contractId && prorrogaData.extensionDate) {
      if (prorrogaData.extensionDate < prorrogaData.startDate) {
        toast.error('La fecha de prórroga no puede ser anterior al inicio del contrato');
        setActiveTab('empleo');
        return;
      }
      if (prorrogaData.endDate && prorrogaData.endDate < prorrogaData.extensionDate) {
        toast.error('La fecha fin no puede ser anterior al inicio de la prórroga');
        setActiveTab('empleo');
        return;
      }
      if (extensionEligibility && !extensionEligibility.allowed) {
        toast.error(`Prórroga no permitida: ${extensionEligibility.reason}`);
        setActiveTab('empleo');
        return;
      }
      if (prorrogaData.extensionDate && prorrogaData.extensionCount < 2) {
        setProrrogaData(prev => ({ ...prev, extensionCount: prev.extensionCount + 1 }));
      }
    }

    setSaving(true);
    const saveErrors: string[] = [];

    try {
      // H2.0: Build address JSONB
      const addressObj = (formData.address_street || formData.address_city || formData.address_postal_code)
        ? { street: formData.address_street, city: formData.address_city, postal_code: formData.address_postal_code, province: formData.address_province, country: formData.address_country }
        : null;

      const dbData = {
        company_id: companyId,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || null,
        employee_number: formData.employee_number || null,
        job_title: formData.position || null,
        department_id: formData.department_id || null,
        hire_date: formData.hire_date,
        termination_date: formData.termination_date || null,
        status: formData.status,
        country_code: formData.country_code,
        base_salary: Number(formData.base_salary) || null,
        legal_entity_id: formData.legal_entity_id || null,
        work_center_id: formData.work_center_id || null,
        reports_to: formData.reports_to || null,
        // H2.0 new fields
        national_id: formData.national_id || null,
        birth_date: formData.birth_date || null,
        gender: formData.gender || null,
        nationality: formData.nationality || null,
        secondary_nationality: formData.secondary_nationality || null,
        bank_account: formData.bank_account || null,
        category: formData.category || null,
        work_schedule: formData.work_schedule || null,
        weekly_hours: formData.weekly_hours || null,
        address: addressObj,
      };

      let employeeId = employee?.id;
      if (isNew) {
        const { data, error } = await supabase.from('erp_hr_employees').insert([dbData]).select().single();
        if (error) throw error;
        employeeId = data.id;
        toast.success('Empleado creado');

        if (formData.country_code === 'ES' && shouldAutoGenerate(companyId, 'hire')) {
          toast.info('⚡ TA.2 Alta y Contrat@ generados automáticamente — revise en Ficheros Oficiales', { duration: 5000 });
        }
      } else {
        const { error } = await supabase.from('erp_hr_employees').update(dbData).eq('id', employee.id);
        if (error) throw error;
        toast.success('Empleado actualizado');

        if (formData.country_code === 'ES' && formData.termination_date && formData.status === 'terminated' && shouldAutoGenerate(companyId, 'termination')) {
          toast.info('⚡ TA.2 Baja generado automáticamente — tramitar vía SILTRA', { duration: 5000 });
        }
      }

      if (employeeId) {
        // Save module access
        await supabase.from('erp_hr_employee_module_access').delete().eq('employee_id', employeeId);
        const accessRecords = Object.entries(moduleAccess)
          .filter(([_, level]) => level !== 'none')
          .map(([code, level]) => ({ employee_id: employeeId, company_id: companyId, module_code: code, access_level: level }));
        if (accessRecords.length > 0) {
          await supabase.from('erp_hr_employee_module_access').insert(accessRecords);
        }

        // Save ES localization extension
        if (formData.country_code === 'ES') {
          const extensionPayload = {
            company_id: companyId,
            employee_id: employeeId,
            country_code: 'ES',
            social_security_number: esFields.naf || null,
            extension_data: {
              contribution_group: esFields.contribution_group || null,
              contract_type_rd: esFields.contract_type_rd || null,
              collective_agreement: esFields.collective_agreement || null,
              autonomous_community: esFields.autonomous_community || null,
              cno_code: esFields.cno_code || null,
              irpf_percentage: esFields.irpf_percentage || null,
              ocupacion_ss: esFields.ocupacion_ss || null,
              ccc: esFields.ccc || null,
              empresa_fiscal_nif: esFields.empresa_fiscal_nif || null,
              empresa_fiscal_nombre: esFields.empresa_fiscal_nombre || null,
              modelo145: JSON.parse(JSON.stringify(modelo145)),
            },
          };
          const { data: existing } = await supabase
            .from('hr_employee_extensions').select('id')
            .eq('employee_id', employeeId).eq('country_code', 'ES').maybeSingle();
          if (existing) {
            await supabase.from('hr_employee_extensions').update(extensionPayload).eq('id', existing.id);
          } else {
            await supabase.from('hr_employee_extensions').insert([extensionPayload]);
          }
        }

        // H2.0: Save non-ES international extension data
        if (formData.country_code !== 'ES' && (intlFields.local_id_number || intlFields.immigration_status || intlFields.tax_residence_country)) {
          try {
            const intlPayload = {
              company_id: companyId,
              employee_id: employeeId,
              country_code: formData.country_code,
              extension_data: {
                local_id_number: intlFields.local_id_number || null,
                local_id_type: intlFields.local_id_type || null,
                immigration_status: intlFields.immigration_status || null,
                work_permit_expiry: intlFields.work_permit_expiry || null,
                tax_residence_country: intlFields.tax_residence_country || null,
              },
            };
            const { data: existingIntl } = await supabase
              .from('hr_employee_extensions').select('id')
              .eq('employee_id', employeeId).eq('country_code', formData.country_code).maybeSingle();
            if (existingIntl) {
              await supabase.from('hr_employee_extensions').update(intlPayload).eq('id', existingIntl.id);
            } else {
              await supabase.from('hr_employee_extensions').insert([intlPayload]);
            }
          } catch (err) {
            console.error('[Intl Extension] save error:', err);
            saveErrors.push('Datos internacionales no se pudieron guardar');
          }
        }

        // H2.0: Save profile data (hr_employee_profiles)
        const hasProfileData = profileData.emergency_contact_name || profileData.education_level || profileData.languages || profileData.skills || profileData.personal_notes;
        if (hasProfileData) {
          try {
            const profilePayload: Record<string, any> = {
              employee_id: employeeId,
              company_id: companyId,
              emergency_contact_name: profileData.emergency_contact_name || null,
              emergency_contact_phone: profileData.emergency_contact_phone || null,
              emergency_contact_relationship: profileData.emergency_contact_relationship || null,
              education_level: profileData.education_level || null,
              languages: profileData.languages ? profileData.languages.split(',').map(s => s.trim()).filter(Boolean) : null,
              skills: profileData.skills ? profileData.skills.split(',').map(s => s.trim()).filter(Boolean) : null,
              certifications: profileData.certifications ? profileData.certifications.split(',').map(s => s.trim()).filter(Boolean) : null,
              personal_notes: profileData.personal_notes || null,
            };
            const { data: existingProfile } = await supabase
              .from('hr_employee_profiles' as any).select('id')
              .eq('employee_id', employeeId).maybeSingle();
            if (existingProfile) {
              await supabase.from('hr_employee_profiles' as any).update(profilePayload).eq('id', (existingProfile as any).id);
            } else {
              await supabase.from('hr_employee_profiles' as any).insert([profilePayload]);
            }
          } catch (err) {
            console.error('[Profile] save error:', err);
            saveErrors.push('Perfil complementario no se pudo guardar');
          }
        }

        // Persist legal profile for AI agents
        if (formData.country_code === 'ES' && computedProfile) {
          persistLegalProfile(employeeId!, computedProfile);
        }

        // Save contract prórroga data
        if (prorrogaData.contractId) {
          const contractUpdates: Record<string, any> = {};
          if (prorrogaData.extensionDate) contractUpdates.extension_date = prorrogaData.extensionDate;
          if (prorrogaData.endDate) contractUpdates.end_date = prorrogaData.endDate;
          contractUpdates.extension_count = prorrogaData.extensionCount;
          if (formData.termination_date) {
            contractUpdates.termination_date = formData.termination_date;
            contractUpdates.status = 'terminated';
          }
          if (prorrogaData.extensionDate && !formData.termination_date) {
            contractUpdates.status = 'extended';
            contractUpdates.ta2_movement_code = 'V01';
          }
          await supabase.from('erp_hr_contracts').update(contractUpdates).eq('id', prorrogaData.contractId);
        }
      }

      // H2.0: Warn about partial save failures
      if (saveErrors.length > 0) {
        toast.warning(`Empleado guardado, pero con errores parciales: ${saveErrors.join('; ')}`, { duration: 6000 });
      }

      onSave();
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error('Error al guardar empleado');
    } finally {
      setSaving(false);
    }
  };

  const selectedCountry = COUNTRIES.find(c => c.code === formData.country_code);
  const filteredWorkCenters = formData.legal_entity_id
    ? workCenters.filter((center) => center.legal_entity_id === formData.legal_entity_id)
    : workCenters;

  useEffect(() => {
    if (formData.work_center_id && !filteredWorkCenters.some((center) => center.id === formData.work_center_id)) {
      setFormData((prev) => ({ ...prev, work_center_id: '' }));
    }
  }, [filteredWorkCenters, formData.work_center_id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent id="hr-employee-form-dialog" className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isNew ? 'Nuevo Empleado' : `Editar: ${employee?.first_name} ${employee?.last_name}`}
          </DialogTitle>
          <DialogDescription>
            Complete los datos globales del empleado. Los campos específicos de localización se gestionan en la pestaña del país.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="personal" className="gap-1 text-xs"><User className="h-3 w-3" />Personal</TabsTrigger>
            <TabsTrigger value="org" className="gap-1 text-xs"><Building2 className="h-3 w-3" />Organización</TabsTrigger>
            <TabsTrigger value="empleo" className="gap-1 text-xs"><FileText className="h-3 w-3" />Empleo</TabsTrigger>
            <TabsTrigger value="perfil" className="gap-1 text-xs"><Heart className="h-3 w-3" />Perfil</TabsTrigger>
            <TabsTrigger value="access" className="gap-1 text-xs"><Key className="h-3 w-3" />Accesos</TabsTrigger>
            <TabsTrigger value="country" className="gap-1 text-xs"><Globe className="h-3 w-3" />{selectedCountry?.flag || '🌐'} País</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            {/* Tab 1: Personal Data — H2.0 EXPANDED */}
            <TabsContent value="personal" className="m-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input value={formData.first_name} onChange={(e) => handleChange('first_name', e.target.value)} placeholder="Nombre" />
                </div>
                <div className="space-y-2">
                  <Label>Apellidos *</Label>
                  <Input value={formData.last_name} onChange={(e) => handleChange('last_name', e.target.value)} placeholder="Apellidos" />
                </div>
              </div>

              {/* H2.0: DNI/NIE */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    DNI / NIE
                    <Badge variant="outline" className="text-[10px]">MOD23</Badge>
                  </Label>
                  <Input
                    value={formData.national_id}
                    onChange={(e) => handleChange('national_id', e.target.value)}
                    placeholder="12345678Z o X1234567L"
                    className={cn(
                      dniValidation && !dniValidation.valid && "border-destructive",
                      dniValidation?.valid && "border-emerald-500"
                    )}
                  />
                  {dniValidation && !dniValidation.valid && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> {dniValidation.error}
                    </p>
                  )}
                  {dniValidation?.valid && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Shield className="h-3 w-3" /> {dniValidation.type} válido ✓
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Fecha de nacimiento</Label>
                  <Input type="date" value={formData.birth_date} onChange={(e) => handleChange('birth_date', e.target.value)} />
                  {formData.birth_date && formData.hire_date && formData.birth_date >= formData.hire_date && (
                    <p className="text-xs text-destructive">Debe ser anterior a la fecha de alta</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="email@empresa.com" className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="+XX XXX XXX XXX" className="pl-10" />
                  </div>
                </div>
              </div>

              {/* H2.0: Gender + Nationality */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Género</Label>
                  <Select value={formData.gender || '__none'} onValueChange={(v) => handleChange('gender', v === '__none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent portalContainer={selectPortalContainer} position="popper">
                      <SelectItem value="__none">Sin especificar</SelectItem>
                      {GENDER_OPTIONS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nacionalidad</Label>
                  <Select value={formData.nationality || '__none'} onValueChange={(v) => handleChange('nationality', v === '__none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent portalContainer={selectPortalContainer} position="popper">
                      <SelectItem value="__none">Sin especificar</SelectItem>
                      {COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>2ª Nacionalidad</Label>
                  <Select value={formData.secondary_nationality || '__none'} onValueChange={(v) => handleChange('secondary_nationality', v === '__none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent portalContainer={selectPortalContainer} position="popper">
                      <SelectItem value="__none">Ninguna</SelectItem>
                      {COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nº Empleado</Label>
                  <Input value={formData.employee_number} onChange={(e) => handleChange('employee_number', e.target.value)} placeholder="EMP001" />
                </div>
                <div className="space-y-2">
                  <Label>Puesto / Cargo</Label>
                  <Input value={formData.position} onChange={(e) => handleChange('position', e.target.value)} placeholder="Ej: Ingeniero Senior" />
                </div>
              </div>

              {/* H2.0: Bank account */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <CreditCard className="h-3 w-3" /> Cuenta bancaria (IBAN)
                </Label>
                <Input
                  value={formData.bank_account}
                  onChange={(e) => handleChange('bank_account', e.target.value)}
                  placeholder="ES79 2100 0813 6101 2345 6789"
                  className={cn(
                    ibanValidation && !ibanValidation.valid && "border-destructive",
                    ibanValidation?.valid && "border-emerald-500"
                  )}
                />
                {ibanValidation && !ibanValidation.valid && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {ibanValidation.error}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Cuenta principal para domiciliación de nómina. No sustituye módulos bancarios avanzados.</p>
              </div>

              {/* H2.0: Address */}
              <Separator />
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5 text-sm font-semibold">
                  <MapPin className="h-4 w-4" /> Dirección
                </Label>
                <div className="space-y-2">
                  <Input value={formData.address_street} onChange={(e) => handleChange('address_street', e.target.value)} placeholder="Calle, número, piso" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Input value={formData.address_city} onChange={(e) => handleChange('address_city', e.target.value)} placeholder="Ciudad" />
                  <Input value={formData.address_postal_code} onChange={(e) => handleChange('address_postal_code', e.target.value)} placeholder="Código postal" />
                  <Input value={formData.address_province} onChange={(e) => handleChange('address_province', e.target.value)} placeholder="Provincia" />
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Organizational Data */}
            <TabsContent value="org" className="m-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>País de empleo *</Label>
                  <Select value={formData.country_code} onValueChange={(v) => handleChange('country_code', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent portalContainer={selectPortalContainer} position="popper">
                      {COUNTRIES.map(c => (
                        <SelectItem key={c.code} value={c.code} textValue={`${c.flag} ${c.name}`}>{c.flag} {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Select value={formData.department_id || '__none'} onValueChange={(v) => handleChange('department_id', v === '__none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent portalContainer={selectPortalContainer} position="popper">
                      <SelectItem value="__none">Sin asignar</SelectItem>
                      {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Entidad legal</Label>
                  <Select value={formData.legal_entity_id || '__none'} onValueChange={(v) => handleChange('legal_entity_id', v === '__none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent portalContainer={selectPortalContainer} position="popper">
                      <SelectItem value="__none">Sin asignar</SelectItem>
                      {legalEntities.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {legalEntities.length === 0 && (
                    <p className="text-xs text-muted-foreground">No hay entidades legales configuradas para esta empresa.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Centro de trabajo</Label>
                  <Select value={formData.work_center_id || '__none'} onValueChange={(v) => handleChange('work_center_id', v === '__none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent portalContainer={selectPortalContainer} position="popper">
                      <SelectItem value="__none">Sin asignar</SelectItem>
                      {filteredWorkCenters.map(wc => <SelectItem key={wc.id} value={wc.id}>{wc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {filteredWorkCenters.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      {formData.legal_entity_id ? 'No hay centros para la entidad legal seleccionada.' : 'No hay centros de trabajo configurados.'}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Manager directo</Label>
                <Select value={formData.reports_to || '__none'} onValueChange={(v) => handleChange('reports_to', v === '__none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar manager" /></SelectTrigger>
                  <SelectContent portalContainer={selectPortalContainer} position="popper">
                    <SelectItem value="__none">Sin asignar</SelectItem>
                    {managers.filter(m => m.id !== employee?.id).map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Tab 3: Employment Data — H2.0 expanded */}
            <TabsContent value="empleo" className="m-0 space-y-4">
              {/* Generation mode selector */}
              <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">Generación de ficheros</span>
                </div>
                <Select value={generationMode} onValueChange={(v: GenerationMode) => { setGenerationModeState(v); setGenerationModeConfig(companyId, { mode: v }); }}>
                  <SelectTrigger className="w-[180px] h-7 text-xs"><SelectValue placeholder="Seleccionar modo" /></SelectTrigger>
                  <SelectContent portalContainer={selectPortalContainer} position="popper">
                    <SelectItem value="automatic">{GENERATION_MODE_LABELS.automatic.icon} Automático</SelectItem>
                    <SelectItem value="manual">{GENERATION_MODE_LABELS.manual.icon} Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Expiry alert badge */}
              {expiryAlert && (
                <div className={cn("p-2.5 rounded-lg border flex items-start gap-2", expiryAlert.bgColor)}>
                  <Clock className={cn("h-4 w-4 mt-0.5 shrink-0", expiryAlert.color)} />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <p className={cn("text-xs font-semibold", expiryAlert.color)}>{expiryAlert.label}</p>
                      <Badge variant={expiryAlert.conversionRequired ? 'destructive' : 'outline'} className="text-[10px]">
                        {expiryAlert.daysRemaining}d
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{expiryAlert.legalConsequence}</p>
                    {expiryAlert.obligations.length > 0 && (
                      <ul className="text-[10px] text-muted-foreground list-disc pl-3 space-y-0.5">
                        {expiryAlert.obligations.slice(0, 2).map((o, i) => <li key={i}>{o}</li>)}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha de Alta</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="date" value={formData.hire_date} onChange={(e) => handleChange('hire_date', e.target.value)} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent portalContainer={selectPortalContainer} position="popper">
                      {GLOBAL_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fecha de Baja */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    Fecha de Baja
                    {['terminated', 'offboarding'].includes(formData.status) && (
                      <span className="text-destructive text-xs">*</span>
                    )}
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="date" value={formData.termination_date} onChange={(e) => handleChange('termination_date', e.target.value)} className="pl-10" min={formData.hire_date || undefined} />
                  </div>
                  {formData.termination_date && formData.hire_date && formData.termination_date < formData.hire_date && (
                    <p className="text-xs text-destructive flex items-center gap-1"><Shield className="h-3 w-3" />La fecha de baja no puede ser anterior a la fecha de alta (ET Art. 49)</p>
                  )}
                  {['terminated', 'offboarding'].includes(formData.status) && !formData.termination_date && (
                    <p className="text-xs text-destructive flex items-center gap-1"><Shield className="h-3 w-3" />Obligatoria para estados de baja (ET Art. 49.1, RD 625/1985 Art. 1)</p>
                  )}
                  {formData.termination_date && formData.status === 'active' && new Date(formData.termination_date) < new Date(new Date().toISOString().split('T')[0]) && (
                    <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" />La fecha de baja ya ha vencido ({formData.termination_date}). Actualice el estado del empleado (ET Art. 49.1).</p>
                  )}
                  {legalDurationValidation && formData.termination_date && (
                    legalDurationValidation.isWithinLimit ? (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Shield className="h-3 w-3" />Duración dentro del periodo legal ({legalDurationValidation.actualMonths}/{legalDurationValidation.maxMeses} meses) — {legalDurationValidation.normativa}</p>
                    ) : (
                      <div className="mt-1 p-2 rounded-md border border-destructive/30 bg-destructive/5 space-y-1">
                        <p className="text-xs text-destructive font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Duración ({legalDurationValidation.actualMonths} meses) excede el máximo legal de {legalDurationValidation.maxMeses} meses para «{legalDurationValidation.contractName}»</p>
                        <p className="text-xs text-muted-foreground">📅 Fecha máxima correcta: <span className="font-semibold text-foreground">{legalDurationValidation.maxEndDate}</span></p>
                        <p className="text-xs text-muted-foreground">⚖️ {legalDurationValidation.normativa} · ET Art. 15.5: Superado el límite, el contrato se convierte en indefinido.</p>
                      </div>
                    )
                  )}
                  {terminationVsContractEnd === 'after' && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Fecha de baja ({formData.termination_date}) posterior al fin de contrato ({prorrogaData.endDate}). Solo válido si hay conversión a indefinido.</p>
                  )}
                  {terminationVsContractEnd === 'before' && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1"><Shield className="h-3 w-3" />Baja anticipada al fin de contrato. Verifique causa de extinción (ET Art. 49).</p>
                  )}
                  <p className="text-xs text-muted-foreground">Fecha efectiva de cese. Genera obligaciones TA.2 (baja) y liquidación (ET Art. 49).</p>
                </div>
                <div />
              </div>

              {/* Prórroga de contrato */}
              {prorrogaData.contractId ? (
                <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" />Prórroga de Contrato</h4>
                    <div className="flex items-center gap-2">
                      {prorrogaData.extensionCount > 0 && <Badge variant="secondary" className="text-xs">{prorrogaData.extensionCount}/2 prórrogas</Badge>}
                      {contractDurationMonths !== null && <Badge variant="outline" className="text-xs">{contractDurationMonths} meses duración</Badge>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Fecha inicio prórroga</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="date" value={prorrogaData.extensionDate} onChange={(e) => setProrrogaData(prev => ({ ...prev, extensionDate: e.target.value }))} className="pl-10 h-8 text-sm" min={prorrogaData.startDate || undefined} disabled={extensionEligibility !== null && !extensionEligibility.allowed} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Nueva fecha fin contrato</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="date" value={prorrogaData.endDate} onChange={(e) => setProrrogaData(prev => ({ ...prev, endDate: e.target.value }))} className="pl-10 h-8 text-sm" min={prorrogaData.extensionDate || prorrogaData.startDate || undefined} disabled={extensionEligibility !== null && !extensionEligibility.allowed} />
                      </div>
                    </div>
                  </div>
                  {extensionEligibility && !extensionEligibility.allowed && (
                    <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/10 text-sm">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-destructive">{extensionEligibility.reason}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">ET Art. 15.1 — RDL 32/2021</p>
                      </div>
                    </div>
                  )}
                  {extensionEligibility?.allowed && prorrogaData.extensionDate && (
                    <div className="flex items-start gap-2 p-2 rounded-md bg-primary/5 text-sm">
                      <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-primary font-medium">Prórroga permitida</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Se generará movimiento TA.2 (V01).</p>
                      </div>
                    </div>
                  )}
                  {prorrogaData.extensionDate && prorrogaData.startDate && prorrogaData.extensionDate < prorrogaData.startDate && (
                    <p className="text-xs text-destructive flex items-center gap-1"><Shield className="h-3 w-3" />La fecha de prórroga no puede ser anterior al inicio del contrato</p>
                  )}
                  {prorrogaData.endDate && prorrogaData.extensionDate && prorrogaData.endDate < prorrogaData.extensionDate && (
                    <p className="text-xs text-destructive flex items-center gap-1"><Shield className="h-3 w-3" />La fecha fin no puede ser anterior al inicio de la prórroga</p>
                  )}
                  {legalDurationValidation && prorrogaData.endDate && (
                    legalDurationValidation.isWithinLimit ? (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Shield className="h-3 w-3" />Duración con prórroga dentro del periodo legal ({legalDurationValidation.actualMonths}/{legalDurationValidation.maxMeses} meses)</p>
                    ) : (
                      <div className="p-2 rounded-md border border-destructive/30 bg-destructive/5 space-y-1">
                        <p className="text-xs text-destructive font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Duración con prórroga ({legalDurationValidation.actualMonths} meses) excede el máximo de {legalDurationValidation.maxMeses} meses</p>
                        <p className="text-xs text-muted-foreground">📅 Fecha fin máxima legal: <span className="font-semibold text-foreground">{legalDurationValidation.maxEndDate}</span></p>
                        <p className="text-xs text-muted-foreground">⚖️ {legalDurationValidation.normativa} · ET Art. 15.5: Conversión automática a indefinido.</p>
                      </div>
                    )
                  )}
                  {contractDurationMonths !== null && contractDurationMonths > 24 && (!legalDurationValidation || legalDurationValidation.maxMeses >= 24) && (
                    <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Duración total ({contractDurationMonths} meses) supera el límite absoluto de 24 meses (ET Art. 15.1). Conversión a indefinido.</p>
                  )}
                  {prorrogaData.extensionDate && formData.termination_date && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Prórroga informada con fecha de baja — verifique coherencia.</p>
                  )}
                  <p className="text-xs text-muted-foreground">ET Art. 15.1, RDL 32/2021: Máx. 2 prórrogas, 24 meses duración total.</p>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-dashed bg-muted/20">
                  <p className="text-xs text-muted-foreground flex items-center gap-2"><CalendarClock className="h-4 w-4" />Sin contrato activo vinculado. Las prórrogas se gestionan desde el contrato del empleado.</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Salario bruto anual</Label>
                <Input type="number" value={formData.base_salary} onChange={(e) => handleChange('base_salary', e.target.value)} placeholder="30000" />
                <p className="text-xs text-muted-foreground">Importe bruto genérico. Los detalles de SS y retención fiscal se gestionan desde la localización del país.</p>
              </div>

              {/* H2.0: Category + Work Schedule + Weekly Hours */}
              <Separator />
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Categoría profesional</Label>
                  <Input value={formData.category} onChange={(e) => handleChange('category', e.target.value)} placeholder="Ej: Técnico, Directivo" />
                </div>
                <div className="space-y-2">
                  <Label>Jornada</Label>
                  <Select value={formData.work_schedule || '__none'} onValueChange={(v) => handleChange('work_schedule', v === '__none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent portalContainer={selectPortalContainer} position="popper">
                      <SelectItem value="__none">Sin especificar</SelectItem>
                      {WORK_SCHEDULE_OPTIONS.map(ws => <SelectItem key={ws.value} value={ws.value}>{ws.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Horas/semana</Label>
                  <Input type="number" min={0} max={60} value={formData.weekly_hours} onChange={(e) => handleChange('weekly_hours', Number(e.target.value))} />
                </div>
              </div>
            </TabsContent>

            {/* Tab 4: Perfil Complementario — H2.0 NEW */}
            <TabsContent value="perfil" className="m-0 space-y-4">
              {/* Emergency contact */}
              <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Heart className="h-4 w-4 text-destructive" /> Contacto de emergencia
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre</Label>
                    <Input value={profileData.emergency_contact_name} onChange={(e) => setProfileData(prev => ({ ...prev, emergency_contact_name: e.target.value }))} placeholder="Nombre completo" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Teléfono</Label>
                    <Input value={profileData.emergency_contact_phone} onChange={(e) => setProfileData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))} placeholder="+34 600 000 000" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Relación</Label>
                    <Input value={profileData.emergency_contact_relationship} onChange={(e) => setProfileData(prev => ({ ...prev, emergency_contact_relationship: e.target.value }))} placeholder="Cónyuge, padre, etc." className="h-8 text-sm" />
                  </div>
                </div>
              </div>

              {/* Education */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4" /> Nivel educativo
                </Label>
                <Select value={profileData.education_level || '__none'} onValueChange={(v) => setProfileData(prev => ({ ...prev, education_level: v === '__none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent portalContainer={selectPortalContainer} position="popper">
                    <SelectItem value="__none">Sin especificar</SelectItem>
                    {EDUCATION_LEVELS.map(el => <SelectItem key={el.value} value={el.value}>{el.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Skills, Languages, Certifications */}
              <div className="space-y-2">
                <Label>Idiomas <span className="text-xs text-muted-foreground">(separados por coma)</span></Label>
                <Input value={profileData.languages} onChange={(e) => setProfileData(prev => ({ ...prev, languages: e.target.value }))} placeholder="Español, Inglés, Francés" />
              </div>
              <div className="space-y-2">
                <Label>Competencias / Skills <span className="text-xs text-muted-foreground">(separados por coma)</span></Label>
                <Input value={profileData.skills} onChange={(e) => setProfileData(prev => ({ ...prev, skills: e.target.value }))} placeholder="Excel, SAP, Gestión de proyectos" />
              </div>
              <div className="space-y-2">
                <Label>Certificaciones <span className="text-xs text-muted-foreground">(separados por coma)</span></Label>
                <Input value={profileData.certifications} onChange={(e) => setProfileData(prev => ({ ...prev, certifications: e.target.value }))} placeholder="PMP, CISA, ISO 27001" />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notas personales</Label>
                <Textarea
                  value={profileData.personal_notes}
                  onChange={(e) => setProfileData(prev => ({ ...prev, personal_notes: e.target.value }))}
                  placeholder="Observaciones internas sobre el empleado..."
                  rows={3}
                />
              </div>

              <p className="text-xs text-muted-foreground italic">
                Estos datos se almacenan en el perfil complementario del empleado (hr_employee_profiles).
              </p>
            </TabsContent>

            {/* Tab 5: Module Access */}
            <TabsContent value="access" className="m-0 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Acceso a Módulos ERP</h4>
                  <p className="text-sm text-muted-foreground">Configure el nivel de acceso del empleado</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { const a: Record<string, 'none'> = {}; AVAILABLE_MODULES.forEach(m => a[m.module_code] = 'none'); setModuleAccess(a); }}>Sin acceso</Button>
                  <Button variant="outline" size="sm" onClick={() => { const a: Record<string, 'read'> = {}; AVAILABLE_MODULES.forEach(m => a[m.module_code] = 'read'); setModuleAccess(a); }}>Solo lectura</Button>
                </div>
              </div>
              <div className="space-y-2">
                {AVAILABLE_MODULES.map(module => {
                  const currentLevel = moduleAccess[module.module_code] || 'none';
                  const levelInfo = ACCESS_LEVELS.find(l => l.value === currentLevel) || ACCESS_LEVELS[0];
                  return (
                    <div key={module.module_code} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{module.module_name}</p>
                        <p className="text-xs text-muted-foreground">{module.description}</p>
                      </div>
                      <Select value={currentLevel} onValueChange={(v: any) => setModuleAccess(prev => ({ ...prev, [module.module_code]: v }))}>
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent portalContainer={selectPortalContainer} position="popper">
                          {ACCESS_LEVELS.map(level => (
                            <SelectItem key={level.value} value={level.value} textValue={level.label}>
                              <div className="flex items-center gap-2">
                                <level.icon className={cn("h-3 w-3", level.color)} />
                                {level.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Tab 6: Country-specific localization */}
            <TabsContent value="country" className="m-0 space-y-4">
              <div className="p-4 rounded-lg border border-dashed bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">{selectedCountry?.flag} Localización {selectedCountry?.name || formData.country_code}</h4>
                </div>

                {formData.country_code === 'ES' ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Campos específicos de la legislación laboral española:</p>

                    {/* H2.0: NAF/SS clarification */}
                    <Alert className="py-2">
                      <AlertDescription className="text-xs">
                        <strong>NAF (Nº Afiliación SS)</strong> = identificador único del trabajador ante la TGSS. Se almacena en la extensión ES como <code>social_security_number</code>.
                        El campo <code>ss_number</code> del core es un alias — la fuente de verdad para empleados españoles es el NAF en esta pestaña.
                      </AlertDescription>
                    </Alert>

                    {/* Empresa Fiscal */}
                    <div className="rounded-lg border p-3 space-y-2">
                      <Label className="text-xs font-semibold">Empresa Fiscal (ET Art. 1.2 / RD 1065/2007)</Label>
                      <p className="text-xs text-muted-foreground">Identificación fiscal del empleador real. Obligatorio en nómina (OM 27/12/1994 Art. 2).</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">NIF/CIF Empresa Fiscal</Label>
                          <Input value={esFields.empresa_fiscal_nif} onChange={(e) => setEsFields(prev => ({ ...prev, empresa_fiscal_nif: e.target.value }))} placeholder="B12345678" className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Razón social Empresa Fiscal</Label>
                          <Input value={esFields.empresa_fiscal_nombre} onChange={(e) => setEsFields(prev => ({ ...prev, empresa_fiscal_nombre: e.target.value }))} placeholder="Empresa S.L." className="h-8 text-sm" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">C.C.C. (Código Cuenta Cotización)</Label>
                        <Input value={esFields.ccc} onChange={(e) => setEsFields(prev => ({ ...prev, ccc: e.target.value }))} placeholder="28/1234567/89" className="h-8 text-sm" />
                        <p className="text-xs text-muted-foreground">LGSS Art. 15 / RD 84/1996 Art. 29.</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nº Afiliación SS (NAF) — Fuente de verdad</Label>
                        <Input value={esFields.naf} onChange={(e) => setEsFields(prev => ({ ...prev, naf: e.target.value }))} placeholder="28/12345678/90" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Grupo de cotización</Label>
                        <Select value={esFields.contribution_group || '__none'} onValueChange={(v) => setEsFields(prev => ({ ...prev, contribution_group: v === '__none' ? '' : v }))}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent portalContainer={selectPortalContainer} position="popper">
                            <SelectItem value="__none">Sin asignar</SelectItem>
                            <SelectItem value="1">1 - Ingenieros y Licenciados</SelectItem>
                            <SelectItem value="2">2 - Ingenieros Técnicos / Peritos</SelectItem>
                            <SelectItem value="3">3 - Jefes Administrativos y de Taller</SelectItem>
                            <SelectItem value="4">4 - Ayudantes no Titulados</SelectItem>
                            <SelectItem value="5">5 - Oficiales Administrativos</SelectItem>
                            <SelectItem value="6">6 - Subalternos</SelectItem>
                            <SelectItem value="7">7 - Auxiliares Administrativos</SelectItem>
                            <SelectItem value="8">8 - Oficiales 1ª y 2ª</SelectItem>
                            <SelectItem value="9">9 - Oficiales 3ª y Especialistas</SelectItem>
                            <SelectItem value="10">10 - Peones</SelectItem>
                            <SelectItem value="11">11 - Trabajadores menores 18 años</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Tipo contrato RD</Label>
                        <Select value={esFields.contract_type_rd || '__none'} onValueChange={(v) => setEsFields(prev => ({ ...prev, contract_type_rd: v === '__none' ? '' : v }))}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent portalContainer={selectPortalContainer} position="popper">
                            <SelectItem value="__none">Sin asignar</SelectItem>
                            <SelectItem value="100">100 - Indefinido ordinario</SelectItem>
                            <SelectItem value="130">130 - Indefinido discontinuo</SelectItem>
                            <SelectItem value="189">189 - Indefinido bonificado</SelectItem>
                            <SelectItem value="401">401 - Temporal por circunstancias</SelectItem>
                            <SelectItem value="402">402 - Temporal sustitución</SelectItem>
                            <SelectItem value="410">410 - Temporal de interinidad</SelectItem>
                            <SelectItem value="420">420 - Contrato de prácticas</SelectItem>
                            <SelectItem value="421">421 - Contrato de formación</SelectItem>
                            <SelectItem value="501">501 - De relevo</SelectItem>
                            <SelectItem value="510">510 - Jubilación parcial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Convenio colectivo</Label>
                        <HRCollectiveAgreementSelect value={esFields.collective_agreement} onValueChange={(id) => setEsFields(prev => ({ ...prev, collective_agreement: id }))} placeholder="Seleccionar convenio" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Comunidad Autónoma</Label>
                        <Select value={esFields.autonomous_community || '__none'} onValueChange={(v) => setEsFields(prev => ({ ...prev, autonomous_community: v === '__none' ? '' : v }))}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent portalContainer={selectPortalContainer} position="popper">
                            <SelectItem value="__none">Sin asignar</SelectItem>
                            {['Andalucía','Aragón','Asturias','Baleares','Canarias','Cantabria','Castilla-La Mancha','Castilla y León','Cataluña','Ceuta','Comunidad Valenciana','Extremadura','Galicia','La Rioja','Madrid','Melilla','Murcia','Navarra','País Vasco'].map(ca => (
                              <SelectItem key={ca} value={ca}>{ca}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">CNO (Cód. Nacional de Ocupación)</Label>
                        <HRCNOSelect value={esFields.cno_code} onValueChange={(code) => setEsFields(prev => ({ ...prev, cno_code: code }))} required />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Ocupación SS (AT/EP) — Cuadro II</Label>
                        <Select value={esFields.ocupacion_ss || '__none'} onValueChange={(v) => setEsFields(prev => ({ ...prev, ocupacion_ss: (v === '__none' ? '' : v) as '' | 'a' | 'b' | 'd' | 'f' | 'g' | 'h' }))}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent portalContainer={selectPortalContainer} position="popper">
                            <SelectItem value="__none">— Sin especificar (aplica CNAE / Cuadro I) —</SelectItem>
                            <SelectItem value="a">a — Trabajos exclusivos de oficina (AT 1,50%)</SelectItem>
                            <SelectItem value="b">b — Representantes de comercio (AT 2,00%)</SelectItem>
                            <SelectItem value="d">d — Oficios construcción/instalaciones (AT 6,70%)</SelectItem>
                            <SelectItem value="f">f — Conductores vehículo &gt;3,5 Tm (AT 6,70%)</SelectItem>
                            <SelectItem value="g">g — Personal de limpieza (AT 3,60%)</SelectItem>
                            <SelectItem value="h">h — Vigilantes/guardas/seguridad (AT 3,60%)</SelectItem>
                          </SelectContent>
                        </Select>
                        {esFields.ocupacion_ss === 'a' && <p className="text-xs text-muted-foreground mt-0.5">DA 61ª LGSS Cuadro II: IT 0,80% + IMS 0,70% = 1,50% fijo</p>}
                        {!esFields.ocupacion_ss && <p className="text-xs text-muted-foreground mt-0.5">Se aplicará el tipo AT/EP del CNAE de la empresa (Cuadro I)</p>}
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">% Retención IRPF solicitado por el empleado (Art. 88.5 RIRPF)</Label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={irpfManualOverride} onChange={(e) => { setIrpfManualOverride(e.target.checked); if (!e.target.checked && irpfCalculation) { setEsFields(prev => ({ ...prev, irpf_percentage: String(irpfCalculation.retentionRate) })); } }} className="rounded border-input" />
                            <span className="text-xs text-muted-foreground">Tipo voluntario solicitado</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input type="number" step="0.01" min="0" max="100" value={esFields.irpf_percentage} onChange={(e) => { setIrpfManualOverride(true); setEsFields(prev => ({ ...prev, irpf_percentage: e.target.value })); }} placeholder="15.00" className={cn("text-sm", !irpfManualOverride && "bg-muted/50")} readOnly={!irpfManualOverride} />
                          <span className="text-sm font-medium text-muted-foreground">%</span>
                        </div>
                        {irpfCalculation && (
                          <div className="text-xs text-muted-foreground space-y-0.5 mt-1 p-2 rounded bg-muted/30 border border-dashed">
                            <p className="font-medium text-foreground">Desglose del cálculo (Art. 80-86 RIRPF):</p>
                            <p>Bruto anual: {irpfCalculation.breakdown.grossSalary.toLocaleString('es-ES')}€</p>
                            <p>− SS obrera estimada: {irpfCalculation.breakdown.ssDeduction.toLocaleString('es-ES')}€</p>
                            <p>− Reducción rtos. trabajo: {irpfCalculation.breakdown.workIncomeReduction.toLocaleString('es-ES')}€</p>
                            {irpfCalculation.breakdown.compensatoryPension > 0 && <p>− Pensión compensatoria: {irpfCalculation.breakdown.compensatoryPension.toLocaleString('es-ES')}€</p>}
                            <p className="font-medium pt-1">Base retención: {irpfCalculation.taxableBase.toLocaleString('es-ES', { maximumFractionDigits: 2 })}€</p>
                            <p>Mínimo personal y familiar: {irpfCalculation.personalFamilyMinimum.toLocaleString('es-ES')}€
                              <span className="text-muted-foreground ml-1">
                                (Contr: {irpfCalculation.breakdown.minContribuyente.toLocaleString('es-ES')}€
                                {irpfCalculation.breakdown.minDescendientes > 0 && ` + Desc: ${irpfCalculation.breakdown.minDescendientes.toLocaleString('es-ES')}€`}
                                {irpfCalculation.breakdown.minAscendientes > 0 && ` + Asc: ${irpfCalculation.breakdown.minAscendientes.toLocaleString('es-ES')}€`}
                                {irpfCalculation.breakdown.minDiscapacidad > 0 && ` + Disc: ${irpfCalculation.breakdown.minDiscapacidad.toLocaleString('es-ES')}€`})
                              </span>
                            </p>
                            <p className="font-medium pt-1 text-primary">Tipo legal calculado: {irpfCalculation.retentionRate}% → {irpfCalculation.annualRetention.toLocaleString('es-ES')}€/año</p>
                            {irpfManualOverride && parseFloat(esFields.irpf_percentage) > irpfCalculation.retentionRate && (
                              <p className="text-blue-600 dark:text-blue-400 font-medium">✓ Art. 88.5 RIRPF: Tipo solicitado {esFields.irpf_percentage}% &gt; calculado {irpfCalculation.retentionRate}% → se aplicará {esFields.irpf_percentage}% en nómina</p>
                            )}
                            {irpfManualOverride && parseFloat(esFields.irpf_percentage) > 0 && parseFloat(esFields.irpf_percentage) <= irpfCalculation.retentionRate && (
                              <p className="text-amber-600 dark:text-amber-400 font-medium">⚠ El tipo solicitado ({esFields.irpf_percentage}%) no supera el calculado ({irpfCalculation.retentionRate}%) → se aplicará el legal</p>
                            )}
                          </div>
                        )}
                        {!formData.base_salary && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">Introduzca el salario bruto anual (pestaña Empleo) para calcular la retención automáticamente.</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      Estos datos se guardan en la extensión de localización del empleado (tabla hr_employee_extensions).
                    </p>

                    <Separator className="my-4" />
                    <HRModelo145Section data={modelo145} onChange={setModelo145} portalContainer={selectPortalContainer} />
                    <Separator className="my-4" />

                    {/* Cross-field validations & Legal Profile Summary */}
                    {computedProfile && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Perfil Legal Unificado</h4>
                        {esFields.contract_type_rd && (
                          <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
                            <p className="text-xs font-semibold">{contractProfile.name}</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                              <span>Desempleo SS: {computedProfile.ssRates.desempleo.tipo}</span>
                              <span>({computedProfile.ssRates.desempleo.empresa}% emp + {computedProfile.ssRates.desempleo.trabajador}% trab)</span>
                              <span>IRPF mín. 2%: {computedProfile.irpfMinimoAplicable ? 'Sí (Art. 86.2 RIRPF)' : 'No'}</span>
                              <span>Indemn. fin: {contractProfile.indemnizacionFinContratoDiasAnyo} d/año</span>
                              <span>Prueba máx: {contractProfile.periodoPruebaMaxMeses} meses</span>
                              {contractProfile.duracionMaximaMeses && <span>Duración máx: {contractProfile.duracionMaximaMeses} meses</span>}
                            </div>
                          </div>
                        )}
                        <div className="p-3 rounded-lg border bg-muted/30 grid grid-cols-3 gap-2 text-xs">
                          <div><p className="text-muted-foreground">Coste empresa/mes</p><p className="font-semibold text-sm">{computedProfile.costeMensualEmpresa.toLocaleString('es-ES')}€</p></div>
                          <div><p className="text-muted-foreground">Coste empresa/año</p><p className="font-semibold text-sm">{computedProfile.costeAnualEmpresa.toLocaleString('es-ES')}€</p></div>
                          <div><p className="text-muted-foreground">Neto est./mes</p><p className="font-semibold text-sm">{computedProfile.netoEstimadoMensual.toLocaleString('es-ES')}€</p></div>
                        </div>
                        {computedProfile.crossFieldValidations.length > 0 && (
                          <div className="space-y-1.5">
                            {computedProfile.crossFieldValidations.map((v, i) => (
                              <Alert key={i} variant={v.status === 'error' ? 'destructive' : 'default'} className="py-2">
                                <AlertDescription className="text-xs">
                                  <span className="font-medium">{v.status === 'error' ? '❌' : '⚠'} {v.field}:</span> {v.message}
                                  <span className="block text-muted-foreground mt-0.5">{v.legalRef}</span>
                                </AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground italic">Este perfil legal se comparte automáticamente con los agentes IA al guardar.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* H2.0: Non-ES international fields */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">Datos internacionales — {selectedCountry?.flag} {selectedCountry?.name || formData.country_code}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">ID local (número)</Label>
                          <Input value={intlFields.local_id_number} onChange={(e) => setIntlFields(prev => ({ ...prev, local_id_number: e.target.value }))} placeholder="Número de identificación local" className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Tipo de ID local</Label>
                          <Input value={intlFields.local_id_type} onChange={(e) => setIntlFields(prev => ({ ...prev, local_id_type: e.target.value }))} placeholder="Ej: Pasaporte, TIE, SSN" className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Estado migratorio</Label>
                          <Select value={intlFields.immigration_status || '__none'} onValueChange={(v) => setIntlFields(prev => ({ ...prev, immigration_status: v === '__none' ? '' : v }))}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                            <SelectContent portalContainer={selectPortalContainer} position="popper">
                              <SelectItem value="__none">No aplica</SelectItem>
                              <SelectItem value="citizen">Ciudadano</SelectItem>
                              <SelectItem value="permanent_resident">Residente permanente</SelectItem>
                              <SelectItem value="work_permit">Permiso de trabajo</SelectItem>
                              <SelectItem value="student_visa">Visa de estudiante</SelectItem>
                              <SelectItem value="pending">Pendiente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Vencimiento permiso de trabajo</Label>
                          <Input type="date" value={intlFields.work_permit_expiry} onChange={(e) => setIntlFields(prev => ({ ...prev, work_permit_expiry: e.target.value }))} className="h-8 text-sm" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">País de residencia fiscal</Label>
                        <Select value={intlFields.tax_residence_country || '__none'} onValueChange={(v) => setIntlFields(prev => ({ ...prev, tax_residence_country: v === '__none' ? '' : v }))}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent portalContainer={selectPortalContainer} position="popper">
                            <SelectItem value="__none">Sin especificar</SelectItem>
                            {COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      Plugin de localización avanzada para {selectedCountry?.flag} {selectedCountry?.name} pendiente (Fase G6). Datos internacionales básicos disponibles.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : <><Save className="h-4 w-4 mr-2" />Guardar</>}
          </Button>
        </DialogFooter>

        <HRContractVoiceCopilot
          contractType={contractProfile?.name}
          contractTypeCode={esFields.contract_type_rd}
          hireDate={formData.hire_date}
          terminationDate={formData.termination_date}
          endDate={prorrogaData.endDate}
          extensionCount={prorrogaData.extensionCount}
          status={formData.status}
          employeeName={`${formData.first_name} ${formData.last_name}`}
        />
      </DialogContent>
    </Dialog>
  );
}

export default HREmployeeFormDialog;
