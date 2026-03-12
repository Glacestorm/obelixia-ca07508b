/**
 * Formulario de Empleado — Global HR Core
 * Tabs: Datos Personales, Organizativos, Empleo, Accesos, Localización (dinámica por país)
 * No hardcodea lógica española en el core — la sección de localización se carga según country_code
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

  // Global form state (country-agnostic)
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    employee_number: '', position: '', department_id: '',
    hire_date: '', status: 'active', country_code: 'ES',
    base_salary: 0,
    // Organizational
    legal_entity_id: '', work_center_id: '', reports_to: '',
  });

  // Module access state
  const [moduleAccess, setModuleAccess] = useState<Record<string, 'none' | 'read' | 'write' | 'admin'>>({});
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [legalEntities, setLegalEntities] = useState<Array<{ id: string; name: string }>>([]);
  const [workCenters, setWorkCenters] = useState<Array<{ id: string; name: string }>>([]);
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
    } else {
      setFormData({
        first_name: '', last_name: '', email: '', phone: '',
        employee_number: '', position: '', department_id: '',
        hire_date: new Date().toISOString().split('T')[0],
        status: 'active', country_code: 'ES', base_salary: 0,
        legal_entity_id: '', work_center_id: '', reports_to: '',
      });
      const defaultAccess: Record<string, 'none'> = {};
      AVAILABLE_MODULES.forEach(m => { defaultAccess[m.module_code] = 'none'; });
      setModuleAccess(defaultAccess);
    }
  }, [employee, open]);

  // Load reference data
  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const [depts, entities, centers, mgrs] = await Promise.all([
        supabase.from('erp_hr_departments').select('id, name').eq('company_id', companyId).order('name'),
        supabase.from('erp_hr_legal_entities').select('id, name').eq('company_id', companyId).order('name'),
        supabase.from('erp_hr_work_centers').select('id, name').eq('company_id', companyId).order('name'),
        supabase.from('erp_hr_employees').select('id, first_name, last_name').eq('company_id', companyId).eq('status', 'active').order('last_name'),
      ]);
      if (depts.data) setDepartments(depts.data as any);
      if (entities.data) setLegalEntities(entities.data as any);
      if (centers.data) setWorkCenters(centers.data as any);
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

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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

      // Save module access
      if (employeeId) {
        await supabase.from('erp_hr_employee_module_access').delete().eq('employee_id', employeeId);
        const accessRecords = Object.entries(moduleAccess)
          .filter(([_, level]) => level !== 'none')
          .map(([code, level]) => ({ employee_id: employeeId, company_id: companyId, module_code: code, access_level: level }));
        if (accessRecords.length > 0) {
          await supabase.from('erp_hr_employee_module_access').insert(accessRecords);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
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
                    <SelectContent>
                      {COUNTRIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Select value={formData.department_id} onValueChange={(v) => handleChange('department_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Entidad legal</Label>
                  <Select value={formData.legal_entity_id} onValueChange={(v) => handleChange('legal_entity_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {legalEntities.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Centro de trabajo</Label>
                  <Select value={formData.work_center_id} onValueChange={(v) => handleChange('work_center_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {workCenters.map(wc => <SelectItem key={wc.id} value={wc.id}>{wc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Manager directo</Label>
                <Select value={formData.reports_to} onValueChange={(v) => handleChange('reports_to', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar manager" /></SelectTrigger>
                  <SelectContent>
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
                            <SelectItem key={level.value} value={level.value}>
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
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        'Nº Afiliación SS (NAF)', 'Grupo de cotización', 'Tipo contrato RD',
                        'Convenio colectivo', 'Comunidad Autónoma', 'CNO (Código Nacional de Ocupación)',
                      ].map(label => (
                        <div key={label} className="p-3 rounded-lg border border-dashed">
                          <Label className="text-xs text-muted-foreground">{label}</Label>
                          <Input disabled placeholder="Plugin ES — Fase G2" className="mt-1 bg-muted/20" />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      Estos campos se habilitarán cuando se active el plugin de localización España (Fase G2).
                    </p>
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
