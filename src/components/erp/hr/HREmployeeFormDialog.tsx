/**
 * Formulario de Empleado — Global HR Core
 * Tabs: Datos Personales, Organizativos, Empleo, Accesos, Localización (dinámica por país)
 * No hardcodea lógica española en el core — la sección de localización se carga según country_code
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HRCNOSelect } from './shared/HRCNOSelect';
import { HRCollectiveAgreementSelect } from './shared/HRCollectiveAgreementSelect';
import { HRModelo145Section, EMPTY_MODELO145, type Modelo145Data } from './shared/HRModelo145Section';
import { calculateIRPFRetention } from '@/lib/irpf/irpfRetentionCalculator';
import { useEmployeeLegalProfile } from '@/hooks/erp/hr/useEmployeeLegalProfile';
import { resolveContractType } from '@/engines/erp/hr/contractTypeEngine';
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
  Phone, Mail, Globe, Shield, Eye, Edit, Lock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

// Global employee statuses (lifecycle)
const GLOBAL_STATUSES = [
  { value: 'candidate', label: 'Candidato' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'active', label: 'Activo' },
  { value: 'temporary_leave', label: 'Baja temporal' },
  { value: 'excedencia', label: 'Excedencia' },
  { value: 'offboarding', label: 'Offboarding' },
  { value: 'terminated', label: 'Baja definitiva' },
];

// Supported countries (extensible)
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

export function HREmployeeFormDialog({ open, onOpenChange, employee, companyId, onSave }: HREmployeeFormDialogProps) {
  const isNew = !employee;
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setSaving] = useState(false);
  const [selectPortalContainer, setSelectPortalContainer] = useState<HTMLElement | null>(null);

  // Global form state (country-agnostic)
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    employee_number: '', position: '', department_id: '',
    hire_date: '', status: 'active', country_code: 'ES',
    base_salary: 0,
    // Organizational
    legal_entity_id: '', work_center_id: '', reports_to: '',
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

  // Modelo 145 data (IRPF withholding communication)
  const [modelo145, setModelo145] = useState<Modelo145Data>({ ...EMPTY_MODELO145 });

  // IRPF manual override
  const [irpfManualOverride, setIrpfManualOverride] = useState(false);

  // Unified Legal Profile
  const { compute: computeLegalProfile, persist: persistLegalProfile } = useEmployeeLegalProfile(companyId);

  // Reactive contract profile for cross-field info
  const contractProfile = useMemo(() => resolveContractType(esFields.contract_type_rd), [esFields.contract_type_rd]);

  // Auto-calculate IRPF from salary + M145
  const irpfCalculation = useMemo(() => {
    if (formData.country_code !== 'ES' || !formData.base_salary) return null;
    return calculateIRPFRetention({
      grossAnnualSalary: Number(formData.base_salary) || 0,
      socialSecurityEmployee: 0,
      numPayments: 14,
      modelo145,
    });
  }, [formData.base_salary, formData.country_code, modelo145]);

  // Compute legal profile reactively when relevant fields change
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

  // Sync calculated IRPF to field when not in manual override
  useEffect(() => {
    if (!irpfManualOverride && irpfCalculation) {
      setEsFields(prev => ({
        ...prev,
        irpf_percentage: String(irpfCalculation.retentionRate),
      }));
    }
  }, [irpfCalculation, irpfManualOverride]);

  // Module access state
  const [moduleAccess, setModuleAccess] = useState<Record<string, 'none' | 'read' | 'write' | 'admin'>>({});
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [legalEntities, setLegalEntities] = useState<Array<{ id: string; name: string }>>([]);
  const [workCenters, setWorkCenters] = useState<Array<{ id: string; name: string; legal_entity_id: string | null }>>([]);
  const [managers, setManagers] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (employee) {
      setFormData({
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        employee_number: employee.employee_number || '',
        position: employee.position || '',
        department_id: employee.department_id || '',
        hire_date: employee.hire_date || '',
        status: employee.status || 'active',
        country_code: employee.country_code || employee.jurisdiction || 'ES',
        base_salary: employee.base_salary || employee.gross_salary || 0,
        legal_entity_id: '',
        work_center_id: '',
        reports_to: '',
      });
      loadModuleAccess(employee.id);
      loadEsExtension(employee.id);
    } else {
      setFormData({
        first_name: '', last_name: '', email: '', phone: '',
        employee_number: '', position: '', department_id: '',
        hire_date: new Date().toISOString().split('T')[0],
        status: 'active', country_code: 'ES', base_salary: 0,
        legal_entity_id: '', work_center_id: '', reports_to: '',
      });
      setEsFields({ naf: '', contribution_group: '', contract_type_rd: '', collective_agreement: '', autonomous_community: '', cno_code: '', irpf_percentage: '', ocupacion_ss: '' as '', ccc: '', empresa_fiscal_nif: '', empresa_fiscal_nombre: '' });
      setModelo145({ ...EMPTY_MODELO145 });
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
        // Load Modelo 145 data
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

  // Load reference data
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
        setLegalEntities(
          entities.data.map((entity: any) => ({
            id: entity.id,
            name: entity.name || entity.legal_name || 'Entidad legal',
          })),
        );
      }
      if (centers.data) {
        setWorkCenters(
          centers.data.map((center: any) => ({
            id: center.id,
            name: center.name || center.code || 'Centro de trabajo',
            legal_entity_id: center.legal_entity_id ?? null,
          })),
        );
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
      if (field === 'legal_entity_id') {
        next.work_center_id = '';
      }
      return next;
    });
  }, []);

  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Complete los campos obligatorios');
      return;
    }
    setSaving(true);
    try {
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
        status: formData.status,
        country_code: formData.country_code,
        base_salary: Number(formData.base_salary) || null,
        legal_entity_id: formData.legal_entity_id || null,
        work_center_id: formData.work_center_id || null,
        reports_to: formData.reports_to || null,
      };

      let employeeId = employee?.id;
      if (isNew) {
        const { data, error } = await supabase.from('erp_hr_employees').insert([dbData]).select().single();
        if (error) throw error;
        employeeId = data.id;
        toast.success('Empleado creado');
      } else {
        const { error } = await supabase.from('erp_hr_employees').update(dbData).eq('id', employee.id);
        if (error) throw error;
        toast.success('Empleado actualizado');
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
            .from('hr_employee_extensions')
            .select('id')
            .eq('employee_id', employeeId)
            .eq('country_code', 'ES')
            .maybeSingle();

          if (existing) {
            await supabase.from('hr_employee_extensions').update(extensionPayload).eq('id', existing.id);
          } else {
            await supabase.from('hr_employee_extensions').insert([extensionPayload]);
          }
        }
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="personal" className="gap-1 text-xs"><User className="h-3 w-3" />Personal</TabsTrigger>
            <TabsTrigger value="org" className="gap-1 text-xs"><Building2 className="h-3 w-3" />Organización</TabsTrigger>
            <TabsTrigger value="empleo" className="gap-1 text-xs"><FileText className="h-3 w-3" />Empleo</TabsTrigger>
            <TabsTrigger value="access" className="gap-1 text-xs"><Key className="h-3 w-3" />Accesos</TabsTrigger>
            <TabsTrigger value="country" className="gap-1 text-xs"><Globe className="h-3 w-3" />{selectedCountry?.flag || '🌐'} País</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            {/* Tab 1: Personal Data (global) */}
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
            </TabsContent>

            {/* Tab 2: Organizational Data (global) */}
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
                  <Select
                    value={formData.department_id || '__none'}
                    onValueChange={(v) => handleChange('department_id', v === '__none' ? '' : v)}
                  >
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
                  <Select
                    value={formData.legal_entity_id || '__none'}
                    onValueChange={(v) => handleChange('legal_entity_id', v === '__none' ? '' : v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent portalContainer={selectPortalContainer} position="popper">
                      <SelectItem value="__none">Sin asignar</SelectItem>
                      {legalEntities.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {legalEntities.length === 0 && (
                    <p className="text-xs text-muted-foreground">No hay entidades legales configuradas para esta empresa, pero ya puede abrir el desplegable y dejarlo en “Sin asignar”.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Centro de trabajo</Label>
                  <Select
                    value={formData.work_center_id || '__none'}
                    onValueChange={(v) => handleChange('work_center_id', v === '__none' ? '' : v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent portalContainer={selectPortalContainer} position="popper">
                      <SelectItem value="__none">Sin asignar</SelectItem>
                      {filteredWorkCenters.map(wc => <SelectItem key={wc.id} value={wc.id}>{wc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {filteredWorkCenters.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      {formData.legal_entity_id
                        ? 'No hay centros de trabajo para la entidad legal seleccionada, pero puede abrir el desplegable y dejarlo en “Sin asignar”.'
                        : 'No hay centros de trabajo configurados para esta empresa, pero ya puede abrir el desplegable y dejarlo en “Sin asignar”.'}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Manager directo</Label>
                <Select
                  value={formData.reports_to || '__none'}
                  onValueChange={(v) => handleChange('reports_to', v === '__none' ? '' : v)}
                >
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

            {/* Tab 3: Employment Data (global) */}
            <TabsContent value="empleo" className="m-0 space-y-4">
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
                    <SelectContent>
                      {GLOBAL_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Salario bruto anual</Label>
                <Input type="number" value={formData.base_salary} onChange={(e) => handleChange('base_salary', e.target.value)} placeholder="30000" />
                <p className="text-xs text-muted-foreground">Importe bruto genérico. Los detalles de SS y retención fiscal se gestionan desde la localización del país.</p>
              </div>
            </TabsContent>

            {/* Tab 4: Module Access */}
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
                        <SelectContent>
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

            {/* Tab 5: Country-specific localization (dynamic) */}
            <TabsContent value="country" className="m-0 space-y-4">
              <div className="p-4 rounded-lg border border-dashed bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">{selectedCountry?.flag} Localización {selectedCountry?.name || formData.country_code}</h4>
                </div>

                {formData.country_code === 'ES' ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Campos específicos de la legislación laboral española:</p>

                    {/* Empresa Fiscal (ET Art. 1.2, Art. 42-44; LGSS Art. 15) */}
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
                        <p className="text-xs text-muted-foreground">LGSS Art. 15 / RD 84/1996 Art. 29. Identifica al empleador ante la TGSS.</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nº Afiliación SS (NAF)</Label>
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
                        <HRCollectiveAgreementSelect
                          value={esFields.collective_agreement}
                          onValueChange={(id) => setEsFields(prev => ({ ...prev, collective_agreement: id }))}
                          placeholder="Seleccionar convenio"
                        />
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
                        <HRCNOSelect
                          value={esFields.cno_code}
                          onValueChange={(code) => setEsFields(prev => ({ ...prev, cno_code: code }))}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Ocupación SS (AT/EP) — Cuadro II</Label>
                        <Select
                          value={esFields.ocupacion_ss || '__none'}
                          onValueChange={(v) => setEsFields(prev => ({ ...prev, ocupacion_ss: (v === '__none' ? '' : v) as '' | 'a' | 'b' | 'd' | 'f' | 'g' | 'h' }))}
                        >
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
                        {esFields.ocupacion_ss === 'a' && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            DA 61ª LGSS Cuadro II: IT 0,80% + IMS 0,70% = 1,50% fijo
                          </p>
                        )}
                        {!esFields.ocupacion_ss && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Se aplicará el tipo AT/EP del CNAE de la empresa (Cuadro I, DA 61ª LGSS)
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">% Retención IRPF solicitado por el empleado (Art. 88.5 RIRPF)</Label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={irpfManualOverride}
                              onChange={(e) => {
                                setIrpfManualOverride(e.target.checked);
                                if (!e.target.checked && irpfCalculation) {
                                  setEsFields(prev => ({ ...prev, irpf_percentage: String(irpfCalculation.retentionRate) }));
                                }
                              }}
                              className="rounded border-input"
                            />
                            <span className="text-xs text-muted-foreground">Tipo voluntario solicitado</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={esFields.irpf_percentage}
                            onChange={(e) => {
                              setIrpfManualOverride(true);
                              setEsFields(prev => ({ ...prev, irpf_percentage: e.target.value }));
                            }}
                            placeholder="15.00"
                            className={cn("text-sm", !irpfManualOverride && "bg-muted/50")}
                            readOnly={!irpfManualOverride}
                          />
                          <span className="text-sm font-medium text-muted-foreground">%</span>
                        </div>
                        {irpfCalculation && (
                          <div className="text-xs text-muted-foreground space-y-0.5 mt-1 p-2 rounded bg-muted/30 border border-dashed">
                            <p className="font-medium text-foreground">Desglose del cálculo (Art. 80-86 RIRPF):</p>
                            <p>Bruto anual: {irpfCalculation.breakdown.grossSalary.toLocaleString('es-ES')}€</p>
                            <p>− SS obrera estimada: {irpfCalculation.breakdown.ssDeduction.toLocaleString('es-ES')}€</p>
                            <p>− Reducción rtos. trabajo: {irpfCalculation.breakdown.workIncomeReduction.toLocaleString('es-ES')}€</p>
                            {irpfCalculation.breakdown.compensatoryPension > 0 && (
                              <p>− Pensión compensatoria: {irpfCalculation.breakdown.compensatoryPension.toLocaleString('es-ES')}€</p>
                            )}
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
                              <p className="text-blue-600 dark:text-blue-400 font-medium">
                                ✓ Art. 88.5 RIRPF: Tipo solicitado {esFields.irpf_percentage}% &gt; calculado {irpfCalculation.retentionRate}% → se aplicará {esFields.irpf_percentage}% en nómina
                              </p>
                            )}
                            {irpfManualOverride && parseFloat(esFields.irpf_percentage) > 0 && parseFloat(esFields.irpf_percentage) <= irpfCalculation.retentionRate && (
                              <p className="text-amber-600 dark:text-amber-400 font-medium">
                                ⚠ El tipo solicitado ({esFields.irpf_percentage}%) no supera el calculado ({irpfCalculation.retentionRate}%) → se aplicará el legal
                              </p>
                            )}
                          </div>
                        )}
                        {!formData.base_salary && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            Introduzca el salario bruto anual (pestaña Empleo) para calcular la retención automáticamente.
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      Estos datos se guardan en la extensión de localización del empleado (tabla hr_employee_extensions).
                    </p>

                    <Separator className="my-4" />

                    {/* Modelo 145 — Datos para cálculo de retenciones IRPF */}
                    <HRModelo145Section
                      data={modelo145}
                      onChange={setModelo145}
                      portalContainer={selectPortalContainer}
                    />
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Globe className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      Plugin de localización para {selectedCountry?.flag} {selectedCountry?.name || formData.country_code} pendiente (Fase G6).
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
      </DialogContent>
    </Dialog>
  );
}

export default HREmployeeFormDialog;
