/**
 * EmployeeProfileSection — "Mi perfil" del Portal del Empleado
 * V2-ES.9.7: Consulta + actualización controlada de datos personales
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  User, Building2, Briefcase, Calendar, Phone, Mail,
  MapPin, CreditCard, Shield, Lock, Edit2, Save,
  Loader2, AlertTriangle, CheckCircle2, Info, Clock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EmployeeProfile } from '@/hooks/erp/hr/useEmployeePortal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { type PortalSection } from './EmployeePortalNav';

interface Props {
  employee: EmployeeProfile;
  onNavigate: (section: PortalSection) => void;
  onRefresh: () => void;
}

interface FullEmployeeData {
  phone: string | null;
  email: string | null;
  address: any;
  bank_account: string | null;
  nationality: string | null;
  birth_date: string | null;
  gender: string | null;
  social_security_number: string | null;
  weekly_hours: number | null;
  work_schedule: string | null;
  autonomous_community: string | null;
}

// Fields the employee can edit directly (non-sensitive)
const EDITABLE_FIELDS = ['phone', 'email'] as const;
// Fields that require a formal request for changes
const SENSITIVE_FIELDS = ['bank_account', 'address', 'national_id'] as const;

export function EmployeeProfileSection({ employee, onNavigate, onRefresh }: Props) {
  const [fullData, setFullData] = useState<FullEmployeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState({ phone: '', email: '' });

  const fetchFullProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_employees')
        .select('phone, email, address, bank_account, nationality, birth_date, gender, social_security_number, weekly_hours, work_schedule, autonomous_community')
        .eq('id', employee.id)
        .single();

      if (error) throw error;
      setFullData(data as FullEmployeeData);
      setEditValues({
        phone: (data as FullEmployeeData).phone || '',
        email: (data as FullEmployeeData).email || '',
      });
    } catch (err) {
      console.error('[EmployeeProfileSection] fetch error:', err);
      toast.error('Error al cargar perfil');
    } finally {
      setLoading(false);
    }
  }, [employee.id]);

  useEffect(() => { fetchFullProfile(); }, [fetchFullProfile]);

  const handleSave = async () => {
    const trimPhone = editValues.phone.trim();
    const trimEmail = editValues.email.trim();

    // Basic validation
    if (trimEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) {
      toast.error('Email no válido');
      return;
    }
    if (trimPhone && trimPhone.length > 20) {
      toast.error('Teléfono demasiado largo');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('erp_hr_employees')
        .update({
          phone: trimPhone || null,
          email: trimEmail || null,
        })
        .eq('id', employee.id);

      if (error) throw error;

      toast.success('Datos actualizados');
      setEditing(false);
      onRefresh();
      fetchFullProfile();
    } catch (err) {
      console.error('[EmployeeProfileSection] save error:', err);
      toast.error('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditValues({
      phone: fullData?.phone || '',
      email: fullData?.email || '',
    });
  };

  // Parse address
  const addr = fullData?.address as any;
  const addressStr = addr
    ? [addr.street, addr.city, addr.postal_code, addr.province, addr.country].filter(Boolean).join(', ')
    : null;

  const maskBankAccount = (iban: string | null) => {
    if (!iban) return '—';
    if (iban.length <= 8) return '****' + iban.slice(-4);
    return iban.slice(0, 4) + ' **** **** ' + iban.slice(-4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!fullData) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Mi Perfil
          </h2>
          <p className="text-sm text-muted-foreground">Consulta y actualiza tus datos personales</p>
        </div>
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No se pudieron cargar los datos del perfil</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchFullProfile}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Mi Perfil
          </h2>
          <p className="text-sm text-muted-foreground">
            Consulta y actualiza tus datos personales
          </p>
        </div>
        {!editing ? (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditing(true)}>
            <Edit2 className="h-4 w-4" /> Editar datos de contacto
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={saving}>
              Cancelar
            </Button>
            <Button size="sm" className="gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </Button>
          </div>
        )}
      </div>

      {/* Personal data */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Datos personales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReadOnlyField icon={User} label="Nombre completo" value={`${employee.first_name} ${employee.last_name}`} />
            <ReadOnlyField icon={Shield} label="DNI/NIE" value={employee.national_id || '—'} masked />
            <ReadOnlyField icon={Calendar} label="Fecha de nacimiento" value={fullData?.birth_date ? format(new Date(fullData.birth_date), 'dd/MM/yyyy') : '—'} />
            <ReadOnlyField icon={User} label="Nacionalidad" value={fullData?.nationality || '—'} />

            {/* Editable: Phone */}
            {editing ? (
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Teléfono
                </Label>
                <Input
                  value={editValues.phone}
                  onChange={e => setEditValues(v => ({ ...v, phone: e.target.value }))}
                  placeholder="+34 600 000 000"
                  maxLength={20}
                />
              </div>
            ) : (
              <ReadOnlyField icon={Phone} label="Teléfono" value={employee.phone || '—'} editable />
            )}

            {/* Editable: Email */}
            {editing ? (
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email personal
                </Label>
                <Input
                  value={editValues.email}
                  onChange={e => setEditValues(v => ({ ...v, email: e.target.value }))}
                  placeholder="email@ejemplo.com"
                  type="email"
                  maxLength={255}
                />
              </div>
            ) : (
              <ReadOnlyField icon={Mail} label="Email personal" value={employee.email || '—'} editable />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Address & Banking */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Domicilio y datos bancarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReadOnlyField icon={MapPin} label="Dirección" value={addressStr || 'No registrada'} sensitive />
            <ReadOnlyField icon={MapPin} label="Comunidad autónoma" value={fullData?.autonomous_community || '—'} />
            <ReadOnlyField icon={CreditCard} label="Cuenta bancaria (IBAN)" value={maskBankAccount(fullData?.bank_account || null)} sensitive />
            <ReadOnlyField icon={Shield} label="Nº Seguridad Social" value={fullData?.social_security_number || '—'} masked />
          </div>
          <div className="mt-3 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Para cambiar dirección, cuenta bancaria o datos fiscales, abre una{' '}
              <button className="underline font-medium" onClick={() => onNavigate('requests')}>
                solicitud administrativa
              </button>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Labor data (read-only) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" /> Datos laborales
            <Badge variant="secondary" className="text-[10px]">Solo lectura</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReadOnlyField icon={Briefcase} label="Puesto" value={employee.job_title || 'No definido'} />
            <ReadOnlyField icon={Building2} label="Categoría" value={employee.category || 'No definida'} />
            <ReadOnlyField icon={Calendar} label="Fecha de alta" value={format(new Date(employee.hire_date), 'dd/MM/yyyy')} />
            <ReadOnlyField icon={User} label="Tipo de contrato" value={employee.contract_type || 'No definido'} />
            <ReadOnlyField icon={User} label="Nº empleado" value={employee.employee_number || employee.employee_code || '—'} />
            <ReadOnlyField icon={Clock} label="Jornada semanal" value={fullData?.weekly_hours ? `${fullData.weekly_hours}h` : '—'} />
            {fullData?.work_schedule && (
              <ReadOnlyField icon={Clock} label="Horario" value={fullData.work_schedule} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick links: Docs + Help */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Accesos rápidos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2 h-11 flex-1 min-w-[140px]" onClick={() => onNavigate('documents')}>
            <FolderOpen className="h-4 w-4" /> Mis documentos
          </Button>
          <Button variant="outline" className="gap-2 h-11 flex-1 min-w-[140px]" onClick={() => onNavigate('help')}>
            <HelpCircle className="h-4 w-4" /> Ayuda RRHH
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function ReadOnlyField({ icon: Icon, label, value, masked, editable, sensitive }: {
  icon: React.ElementType; label: string; value: string;
  masked?: boolean; editable?: boolean; sensitive?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-[11px] text-muted-foreground">{label}</p>
          {editable && (
            <Badge variant="outline" className="text-[8px] h-3 px-1 bg-primary/5 text-primary border-primary/20">Editable</Badge>
          )}
          {sensitive && (
            <Lock className="h-2.5 w-2.5 text-muted-foreground/50" />
          )}
        </div>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
