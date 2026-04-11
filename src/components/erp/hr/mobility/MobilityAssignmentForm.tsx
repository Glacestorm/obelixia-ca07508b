/**
 * MobilityAssignmentForm — 5-section form for creating/editing mobility assignments
 * H1.0: Employee select from DB, country selects from KB, validation, pe_risk_flag, days_in_host
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, DollarSign, Shield, Briefcase, MapPin, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getKnownCountries } from '@/engines/erp/hr/internationalMobilityEngine';
import type { MobilityAssignment, AssignmentType, CompensationApproach, RiskLevel, AllowancePackage } from '@/hooks/erp/hr/useGlobalMobility';

interface Props {
  initial?: Partial<MobilityAssignment>;
  onSubmit: (data: Partial<MobilityAssignment>) => void;
  onCancel: () => void;
  isEditing?: boolean;
  companyId?: string;
}

interface EmployeeOption {
  id: string;
  first_name: string;
  last_name: string;
}

const ASSIGNMENT_TYPES: { value: AssignmentType; label: string }[] = [
  { value: 'long_term', label: 'Largo plazo (>12m)' },
  { value: 'short_term', label: 'Corto plazo (<12m)' },
  { value: 'commuter', label: 'Commuter' },
  { value: 'permanent_transfer', label: 'Traslado permanente' },
  { value: 'business_travel_extended', label: 'Viaje de negocio extendido' },
  { value: 'rotational', label: 'Rotacional' },
];

const COMP_APPROACHES: { value: CompensationApproach; label: string; desc: string }[] = [
  { value: 'tax_equalization', label: 'Tax Equalization', desc: 'Empleado paga impuesto hipotético, empresa asume diferencia' },
  { value: 'tax_protection', label: 'Tax Protection', desc: 'Empleado no paga más que en origen, puede beneficiarse de menor carga' },
  { value: 'laissez_faire', label: 'Laissez-faire', desc: 'Empleado asume su propia carga fiscal' },
  { value: 'ad_hoc', label: 'Ad hoc', desc: 'Acuerdo específico caso a caso' },
];

const RISK_LEVELS: { value: RiskLevel; label: string }[] = [
  { value: 'low', label: 'Bajo' },
  { value: 'medium', label: 'Medio' },
  { value: 'high', label: 'Alto' },
  { value: 'critical', label: 'Crítico' },
];

// Country options from knowledge base
const COUNTRY_OPTIONS = getKnownCountries().map(c => ({ code: c.code, name: c.name }));

export function MobilityAssignmentForm({ initial = {}, onSubmit, onCancel, isEditing, companyId }: Props) {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    employee_id: initial.employee_id || '',
    assignment_type: initial.assignment_type || 'long_term',
    start_date: initial.start_date || '',
    end_date: initial.end_date || '',
    home_country_code: initial.home_country_code || 'ES',
    host_country_code: initial.host_country_code || '',
    payroll_country_code: initial.payroll_country_code || 'ES',
    tax_residence_country: initial.tax_residence_country || 'ES',
    ss_regime_country: initial.ss_regime_country || 'ES',
    home_legal_entity_id: initial.home_legal_entity_id || '',
    host_legal_entity_id: initial.host_legal_entity_id || '',
    job_title_host: (initial as any).job_title_host || '',
    reporting_to: (initial as any).reporting_to || '',
    compensation_approach: initial.compensation_approach || 'tax_equalization',
    currency_code: initial.currency_code || 'EUR',
    split_payroll: initial.split_payroll || false,
    shadow_payroll: initial.shadow_payroll || false,
    hypothetical_tax: initial.hypothetical_tax || 0,
    allowance_housing: initial.allowance_package?.housing || 0,
    allowance_cola: initial.allowance_package?.cola || 0,
    allowance_hardship: initial.allowance_package?.hardship || 0,
    allowance_education: initial.allowance_package?.education || 0,
    allowance_relocation: initial.allowance_package?.relocation || 0,
    allowance_home_leave: initial.allowance_package?.home_leave || 0,
    risk_level: initial.risk_level || 'low',
    pe_risk_flag: initial.pe_risk_flag || false,
    days_in_host: initial.days_in_host || 0,
    notes: initial.notes || '',
  });

  // Load employees from DB
  useEffect(() => {
    if (!companyId) return;
    setLoadingEmployees(true);
    supabase
      .from('erp_hr_employees')
      .select('id, first_name, last_name')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .order('last_name')
      .then(({ data }) => {
        setEmployees((data || []) as EmployeeOption[]);
        setLoadingEmployees(false);
      });
  }, [companyId]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.employee_id) newErrors.employee_id = 'Selecciona un empleado';
    if (!form.start_date) newErrors.start_date = 'Fecha inicio obligatoria';
    if (!form.host_country_code) newErrors.host_country_code = 'País destino obligatorio';
    if (!form.home_country_code) newErrors.home_country_code = 'País origen obligatorio';
    if (form.end_date && form.start_date && form.end_date < form.start_date) {
      newErrors.end_date = 'Fecha fin no puede ser anterior al inicio';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const allowance_package: AllowancePackage = {
      housing: form.allowance_housing,
      cola: form.allowance_cola,
      hardship: form.allowance_hardship,
      education: form.allowance_education,
      relocation: form.allowance_relocation,
      home_leave: form.allowance_home_leave,
    };

    onSubmit({
      employee_id: form.employee_id,
      assignment_type: form.assignment_type as AssignmentType,
      start_date: form.start_date,
      end_date: form.end_date || null,
      home_country_code: form.home_country_code,
      host_country_code: form.host_country_code,
      payroll_country_code: form.payroll_country_code,
      tax_residence_country: form.tax_residence_country,
      ss_regime_country: form.ss_regime_country,
      home_legal_entity_id: form.home_legal_entity_id || null,
      host_legal_entity_id: form.host_legal_entity_id || null,
      compensation_approach: form.compensation_approach as CompensationApproach,
      currency_code: form.currency_code,
      split_payroll: form.split_payroll,
      shadow_payroll: form.shadow_payroll,
      hypothetical_tax: form.hypothetical_tax || null,
      allowance_package,
      risk_level: form.risk_level as RiskLevel,
      pe_risk_flag: form.pe_risk_flag,
      days_in_host: form.days_in_host || null,
      notes: form.notes || null,
      status: initial.status || 'draft',
    } as any);
  };

  const updateField = (field: string, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const renderCountrySelect = (field: string, label: string, placeholder: string) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={(form as any)[field]} onValueChange={v => updateField(field, v)}>
        <SelectTrigger className={`h-8 text-xs ${errors[field] ? 'border-destructive' : ''}`}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {COUNTRY_OPTIONS.map(c => (
            <SelectItem key={c.code} value={c.code}>
              {c.code} — {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errors[field] && <p className="text-[10px] text-destructive mt-0.5">{errors[field]}</p>}
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          {isEditing ? 'Editar asignación' : 'Nueva asignación internacional'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="basic" className="text-xs"><Briefcase className="h-3 w-3 mr-1" />Básico</TabsTrigger>
            <TabsTrigger value="jurisdictions" className="text-xs"><MapPin className="h-3 w-3 mr-1" />Jurisdicciones</TabsTrigger>
            <TabsTrigger value="compensation" className="text-xs"><DollarSign className="h-3 w-3 mr-1" />Compensación</TabsTrigger>
            <TabsTrigger value="benefits" className="text-xs"><Globe className="h-3 w-3 mr-1" />Beneficios</TabsTrigger>
            <TabsTrigger value="risk" className="text-xs"><Shield className="h-3 w-3 mr-1" />Riesgo</TabsTrigger>
          </TabsList>

          {/* Tab 1: Basic */}
          <TabsContent value="basic" className="space-y-3">
            {Object.keys(errors).length > 0 && (
              <div className="p-2 bg-destructive/10 rounded-lg border border-destructive/20 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                <p className="text-xs text-destructive">Corrige los campos obligatorios marcados en rojo</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Empleado *</Label>
                <Select value={form.employee_id} onValueChange={v => updateField('employee_id', v)}>
                  <SelectTrigger className={`h-8 text-xs ${errors.employee_id ? 'border-destructive' : ''}`}>
                    <SelectValue placeholder={loadingEmployees ? 'Cargando...' : 'Seleccionar empleado'} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        {loadingEmployees ? 'Cargando empleados...' : 'No hay empleados activos'}
                      </SelectItem>
                    ) : (
                      employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.last_name}, {emp.first_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.employee_id && <p className="text-[10px] text-destructive mt-0.5">{errors.employee_id}</p>}
              </div>
              <div>
                <Label className="text-xs">Tipo de asignación</Label>
                <Select value={form.assignment_type} onValueChange={v => updateField('assignment_type', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSIGNMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Fecha inicio *</Label>
                <Input type="date" value={form.start_date} onChange={e => updateField('start_date', e.target.value)} className={`h-8 text-sm ${errors.start_date ? 'border-destructive' : ''}`} />
                {errors.start_date && <p className="text-[10px] text-destructive mt-0.5">{errors.start_date}</p>}
              </div>
              <div>
                <Label className="text-xs">Fecha fin prevista</Label>
                <Input type="date" value={form.end_date} onChange={e => updateField('end_date', e.target.value)} className={`h-8 text-sm ${errors.end_date ? 'border-destructive' : ''}`} />
                {errors.end_date && <p className="text-[10px] text-destructive mt-0.5">{errors.end_date}</p>}
              </div>
              <div>
                <Label className="text-xs">Puesto en destino</Label>
                <Input value={form.job_title_host} onChange={e => updateField('job_title_host', e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Reporting to</Label>
                <Input value={form.reporting_to} onChange={e => updateField('reporting_to', e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Jurisdictions — THE 5-COUNTRY MODEL */}
          <TabsContent value="jurisdictions" className="space-y-3">
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 mb-2">
              <p className="text-xs text-blue-700 font-medium">⚠️ Modelo de 5 jurisdicciones</p>
              <p className="text-[11px] text-blue-600 mt-0.5">
                Cada campo puede ser diferente. Ej: trabaja en DE, empleador legal en ES, nómina split ES+DE, residencia fiscal en DE, SS con A1 en ES.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {renderCountrySelect('home_country_code', '🏠 País de origen *', 'Seleccionar país')}
              {renderCountrySelect('host_country_code', '✈️ País de destino (trabajo) *', 'Seleccionar país')}
              {renderCountrySelect('payroll_country_code', '💰 País de nómina principal', 'Seleccionar país')}
              {renderCountrySelect('tax_residence_country', '🏦 País residencia fiscal', 'Seleccionar país')}
              {renderCountrySelect('ss_regime_country', '🛡️ País régimen Seguridad Social', 'Seleccionar país')}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <Label className="text-xs">Días en país destino (estimados)</Label>
                <Input type="number" value={form.days_in_host} onChange={e => updateField('days_in_host', Number(e.target.value))} className="h-8 text-sm" placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <Label className="text-xs">Entidad legal origen (ID)</Label>
                <Input value={form.home_legal_entity_id} onChange={e => updateField('home_legal_entity_id', e.target.value)} className="h-8 text-sm" placeholder="Opcional" />
              </div>
              <div>
                <Label className="text-xs">Entidad legal destino (ID)</Label>
                <Input value={form.host_legal_entity_id} onChange={e => updateField('host_legal_entity_id', e.target.value)} className="h-8 text-sm" placeholder="Opcional" />
              </div>
            </div>
          </TabsContent>

          {/* Tab 3: Compensation */}
          <TabsContent value="compensation" className="space-y-3">
            <div>
              <Label className="text-xs">Enfoque de compensación</Label>
              <Select value={form.compensation_approach} onValueChange={v => updateField('compensation_approach', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMP_APPROACHES.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <span>{c.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                {COMP_APPROACHES.find(c => c.value === form.compensation_approach)?.desc}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Divisa</Label>
                <Input value={form.currency_code} onChange={e => updateField('currency_code', e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Impuesto hipotético (anual)</Label>
                <Input type="number" value={form.hypothetical_tax} onChange={e => updateField('hypothetical_tax', Number(e.target.value))} className="h-8 text-sm" />
              </div>
            </div>
            <div className="flex gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch checked={form.split_payroll} onCheckedChange={v => updateField('split_payroll', v)} />
                <Label className="text-xs">Split Payroll</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.shadow_payroll} onCheckedChange={v => updateField('shadow_payroll', v)} />
                <Label className="text-xs">Shadow Payroll</Label>
              </div>
            </div>
          </TabsContent>

          {/* Tab 4: Benefits (allowance_package) */}
          <TabsContent value="benefits" className="space-y-3">
            <p className="text-xs text-muted-foreground">Importes mensuales en divisa de referencia</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'allowance_housing', label: 'Housing allowance' },
                { key: 'allowance_cola', label: 'COLA (coste de vida)' },
                { key: 'allowance_hardship', label: 'Hardship allowance' },
                { key: 'allowance_education', label: 'Education allowance' },
                { key: 'allowance_relocation', label: 'Relocation (one-time)' },
                { key: 'allowance_home_leave', label: 'Home leave flights (anual)' },
              ].map(b => (
                <div key={b.key}>
                  <Label className="text-xs">{b.label}</Label>
                  <Input
                    type="number"
                    value={(form as any)[b.key]}
                    onChange={e => updateField(b.key, Number(e.target.value))}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Tab 5: Risk */}
          <TabsContent value="risk" className="space-y-3">
            <div>
              <Label className="text-xs">Nivel de riesgo</Label>
              <Select value={form.risk_level} onValueChange={v => updateField('risk_level', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RISK_LEVELS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Switch checked={form.pe_risk_flag} onCheckedChange={v => updateField('pe_risk_flag', v)} />
              <div>
                <Label className="text-xs">Riesgo de Establecimiento Permanente (PE)</Label>
                <p className="text-[10px] text-muted-foreground">Activar si la asignación puede crear PE en país destino</p>
              </div>
            </div>
            <div>
              <Label className="text-xs">Notas / observaciones</Label>
              <Textarea value={form.notes} onChange={e => updateField('notes', e.target.value)} rows={4} className="text-sm" />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
          <Button size="sm" onClick={handleSubmit}>{isEditing ? 'Guardar cambios' : 'Crear asignación'}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
