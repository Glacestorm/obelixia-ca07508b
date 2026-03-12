/**
 * HREmployeeExpedient — Transversal employee view with 9 tabs
 * Core component for navigating all data related to a single employee
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  User, FileText, DollarSign, Clock, FolderOpen, Globe, Landmark,
  Send, ClipboardList, ArrowLeft, Mail, Phone, MapPin, Building2
} from 'lucide-react';
import { HRStatusBadge } from '../shared/HRStatusBadge';
import { HREntityBreadcrumb, type BreadcrumbItem } from '../shared/HREntityBreadcrumb';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Props {
  companyId: string;
  employeeId: string;
  onBack: () => void;
  onNavigate?: (module: string, entityId?: string) => void;
}

interface EmployeeData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  status: string;
  hire_date: string;
  department_name?: string;
  position_title?: string;
  country_code?: string;
  legal_entity_id?: string;
  work_center_id?: string;
}

const TABS = [
  { id: 'ficha', label: 'Ficha', icon: User },
  { id: 'contratos', label: 'Contratos', icon: FileText },
  { id: 'nominas', label: 'Nóminas', icon: DollarSign },
  { id: 'tiempo', label: 'Tiempo', icon: Clock },
  { id: 'documentos', label: 'Documentos', icon: FolderOpen },
  { id: 'movilidad', label: 'Movilidad', icon: Globe },
  { id: 'ss-fiscal', label: 'SS/Fiscal', icon: Landmark },
  { id: 'envios', label: 'Envíos', icon: Send },
  { id: 'auditoria', label: 'Auditoría', icon: ClipboardList },
] as const;

export function HREmployeeExpedient({ companyId, employeeId, onBack, onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState('ficha');
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('erp_hr_employees')
          .select('id, first_name, last_name, email, phone, status, hire_date, position_title, country_code, legal_entity_id, work_center_id')
          .eq('id', employeeId)
          .single();
        if (data) setEmployee({ ...data, department_name: (data as any).department_name ?? null } as unknown as EmployeeData);
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetch();
  }, [employeeId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-pulse space-y-3">
            <div className="h-16 w-16 rounded-full bg-muted mx-auto" />
            <div className="h-4 w-48 bg-muted mx-auto rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!employee) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <User className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Empleado no encontrado</p>
          <Button variant="outline" size="sm" onClick={onBack} className="mt-3 gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Volver
          </Button>
        </CardContent>
      </Card>
    );
  }

  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();

  const breadcrumb: BreadcrumbItem[] = [
    { id: 'company', label: 'Empresa', type: 'company', onClick: onBack },
    ...(employee.department_name ? [{ id: 'dept', label: employee.department_name, type: 'department' as const }] : []),
    { id: employee.id, label: `${employee.first_name} ${employee.last_name}`, type: 'employee' as const },
  ];

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <HREntityBreadcrumb items={breadcrumb} />

      {/* Employee Header Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Avatar className="h-14 w-14 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold truncate">
                  {employee.first_name} {employee.last_name}
                </h2>
                <HRStatusBadge entity="employee" status={employee.status} size="md" />
                {employee.country_code && (
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {employee.country_code}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                {employee.position_title && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> {employee.position_title}
                  </span>
                )}
                {employee.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {employee.email}
                  </span>
                )}
                {employee.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {employee.phone}
                  </span>
                )}
                {employee.hire_date && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Alta: {new Date(employee.hire_date).toLocaleDateString('es-ES')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 text-xs">
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </ScrollArea>

        <TabsContent value="ficha">
          <ExpedientSection title="Datos Personales" icon={User}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <Field label="Nombre" value={employee.first_name} />
              <Field label="Apellidos" value={employee.last_name} />
              <Field label="Email" value={employee.email} />
              <Field label="Teléfono" value={employee.phone} />
              <Field label="País" value={employee.country_code} />
              <Field label="Departamento" value={employee.department_name} />
              <Field label="Puesto" value={employee.position_title} />
              <Field label="Fecha alta" value={employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('es-ES') : undefined} />
              <Field label="Estado" value={employee.status} />
            </div>
          </ExpedientSection>
        </TabsContent>

        <TabsContent value="contratos">
          <ExpedientSection title="Historial Contractual" icon={FileText}>
            <PlaceholderContent text="Contratos vinculados a este empleado" actionLabel="Ver contratos" onAction={() => onNavigate?.('contracts')} />
          </ExpedientSection>
        </TabsContent>

        <TabsContent value="nominas">
          <ExpedientSection title="Historial de Nóminas" icon={DollarSign}>
            <PlaceholderContent text="Nóminas procesadas para este empleado" actionLabel="Ver nóminas" onAction={() => onNavigate?.('payroll')} />
          </ExpedientSection>
        </TabsContent>

        <TabsContent value="tiempo">
          <ExpedientSection title="Tiempo y Ausencias" icon={Clock}>
            <PlaceholderContent text="Fichajes, vacaciones e incidencias" actionLabel="Ver vacaciones" onAction={() => onNavigate?.('vacations')} />
          </ExpedientSection>
        </TabsContent>

        <TabsContent value="documentos">
          <ExpedientSection title="Documentos" icon={FolderOpen}>
            <PlaceholderContent text="Documentos y evidencias de compliance" actionLabel="Gestor documental" onAction={() => onNavigate?.('documents')} />
          </ExpedientSection>
        </TabsContent>

        <TabsContent value="movilidad">
          <ExpedientSection title="Movilidad Internacional" icon={Globe}>
            <PlaceholderContent text="Asignaciones internacionales activas" actionLabel="Ver movilidad" onAction={() => onNavigate?.('mobility-assignments')} />
          </ExpedientSection>
        </TabsContent>

        <TabsContent value="ss-fiscal">
          <ExpedientSection title="Seguridad Social y Fiscal" icon={Landmark}>
            <PlaceholderContent text="Eventos de SS, retenciones y fiscalidad" actionLabel="Ver SS" onAction={() => onNavigate?.('ss')} />
          </ExpedientSection>
        </TabsContent>

        <TabsContent value="envios">
          <ExpedientSection title="Envíos Oficiales" icon={Send}>
            <PlaceholderContent text="Milena PA, Contrat@, certificados" actionLabel="Ver envíos" onAction={() => onNavigate?.('official-submissions')} />
          </ExpedientSection>
        </TabsContent>

        <TabsContent value="auditoria">
          <ExpedientSection title="Auditoría del Expediente" icon={ClipboardList}>
            <PlaceholderContent text="Timeline de cambios en este expediente" actionLabel="Ver auditoría" onAction={() => onNavigate?.('audit-trail')} />
          </ExpedientSection>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExpedientSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || '—'}</p>
    </div>
  );
}

function PlaceholderContent({ text, actionLabel, onAction }: { text: string; actionLabel: string; onAction?: () => void }) {
  return (
    <div className="text-center py-6 space-y-3">
      <p className="text-sm text-muted-foreground">{text}</p>
      {onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default HREmployeeExpedient;
