/**
 * HREmployeeExpedient — Transversal employee view with 10 global tabs + dynamic country tab
 * Global HR Core: country-agnostic, loads localization dynamically
 */
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  User, FileText, DollarSign, Clock, FolderOpen, Globe, Briefcase,
  GraduationCap, BarChart3, ClipboardList, ArrowLeft, Mail, Phone, Building2, Flag,
  ExternalLink
} from 'lucide-react';
import { HRStatusBadge } from '../shared/HRStatusBadge';
import { HREntityBreadcrumb, type BreadcrumbItem } from '../shared/HREntityBreadcrumb';
import { supabase } from '@/integrations/supabase/client';
import {
  ExpedientFichaTab,
  ExpedientTrayectoriaTab,
  ExpedientContratosTab,
  ExpedientCompensacionTab,
  ExpedientTiempoTab,
  ExpedientFormacionTab,
  ExpedientDesempenoTab,
  ExpedientDocumentosTab,
  ExpedientMovilidadTab,
  ExpedientAuditoriaTab,
  ExpedientLocalizacionTab,
} from './tabs';

interface Props {
  companyId: string;
  employeeId: string;
  onBack: () => void;
  onNavigate?: (module: string, entityId?: string) => void;
  mvpMode?: boolean;
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
  nationality?: string;
  reports_to?: string;
  reports_to_name?: string;
  legal_entity_name?: string;
  work_center_name?: string;
  birth_date?: string;
  gender?: string;
  employee_number?: string;
  base_salary?: number;
  job_title?: string;
}

const COUNTRY_FLAGS: Record<string, string> = {
  ES: '🇪🇸', FR: '🇫🇷', PT: '🇵🇹', DE: '🇩🇪', IT: '🇮🇹', UK: '🇬🇧', US: '🇺🇸', MX: '🇲🇽', AD: '🇦🇩',
};

const CORE_TABS = [
  { id: 'ficha', label: 'Ficha', icon: User, mvp: true },
  { id: 'trayectoria', label: 'Trayectoria', icon: Briefcase, mvp: false },
  { id: 'contratos', label: 'Contratos', icon: FileText, mvp: true },
  { id: 'compensacion', label: 'Compensación', icon: DollarSign, mvp: true },
  { id: 'tiempo', label: 'Tiempo', icon: Clock, mvp: true },
  { id: 'formacion', label: 'Formación', icon: GraduationCap, mvp: false },
  { id: 'desempeno', label: 'Desempeño', icon: BarChart3, mvp: false },
  { id: 'documentos', label: 'Documentos', icon: FolderOpen, mvp: true },
  { id: 'movilidad', label: 'Movilidad', icon: Globe, mvp: false },
  { id: 'auditoria', label: 'Auditoría', icon: ClipboardList, mvp: false },
] as const;

export function HREmployeeExpedient({ companyId, employeeId, onBack, onNavigate, mvpMode = true }: Props) {
  const [activeTab, setActiveTab] = useState('ficha');
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployee = async () => {
      setLoading(true);
      try {
        const { data } = await (supabase
          .from('erp_hr_employees')
          .select('id, first_name, last_name, email, phone, status, hire_date, job_title, country_code, legal_entity_id, work_center_id, nationality, reports_to, birth_date, gender, employee_number, base_salary')
          .eq('id', employeeId)
          .single() as any);
        if (data) {
          const empData: EmployeeData = {
            ...data,
            position_title: data.job_title,
          };
          setEmployee(empData);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchEmployee();
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
  const countryFlag = employee.country_code ? COUNTRY_FLAGS[employee.country_code] || '🌐' : null;

  // Build dynamic tabs: core (filtered by mvpMode) + country localization tab
  const filteredCoreTabs = mvpMode ? CORE_TABS.filter(t => t.mvp) : CORE_TABS;
  const allTabs = [
    ...filteredCoreTabs,
    ...(employee.country_code ? [{
      id: 'localizacion',
      label: `${countryFlag} ${employee.country_code}`,
      icon: Flag,
      mvp: true,
    }] : []),
  ];

  const breadcrumb: BreadcrumbItem[] = [
    { id: 'company', label: 'Empresa', type: 'company', onClick: onBack },
    ...(employee.department_name ? [{ id: 'dept', label: employee.department_name, type: 'department' as const }] : []),
    { id: employee.id, label: `${employee.first_name} ${employee.last_name}`, type: 'employee' as const },
  ];

  return (
    <div className="space-y-4">
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
                {countryFlag && (
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {countryFlag} {employee.country_code}
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
                    <Clock className="h-3 w-3" /> Alta: {new Date(employee.hire_date).toLocaleDateString()}
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
            {allTabs.map(tab => {
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
          <ExpedientFichaTab employee={employee} />
        </TabsContent>

        <TabsContent value="trayectoria">
          <ExpedientTrayectoriaTab employeeId={employeeId} companyId={companyId} />
        </TabsContent>

        <TabsContent value="contratos">
          <ExpedientContratosTab employeeId={employeeId} companyId={companyId} onNavigate={(m) => onNavigate?.(m)} />
        </TabsContent>

        <TabsContent value="compensacion">
          <ExpedientCompensacionTab employeeId={employeeId} companyId={companyId} currentSalary={employee.base_salary} onNavigate={(m) => onNavigate?.(m)} />
        </TabsContent>

        <TabsContent value="tiempo">
          <ExpedientTiempoTab employeeId={employeeId} companyId={companyId} onNavigate={(m) => onNavigate?.(m)} />
        </TabsContent>

        <TabsContent value="formacion">
          <ExpedientFormacionTab employeeId={employeeId} companyId={companyId} onNavigate={(m) => onNavigate?.(m)} />
        </TabsContent>

        <TabsContent value="desempeno">
          <ExpedientDesempenoTab employeeId={employeeId} companyId={companyId} onNavigate={(m) => onNavigate?.(m)} />
        </TabsContent>

        <TabsContent value="documentos">
          <ExpedientDocumentosTab employeeId={employeeId} companyId={companyId} onNavigate={(m) => onNavigate?.(m)} />
        </TabsContent>

        <TabsContent value="movilidad">
          <ExpedientMovilidadTab employeeId={employeeId} companyId={companyId} onNavigate={(m) => onNavigate?.(m)} />
        </TabsContent>

        <TabsContent value="auditoria">
          <ExpedientAuditoriaTab employeeId={employeeId} companyId={companyId} onNavigate={(m) => onNavigate?.(m)} />
        </TabsContent>

        {employee.country_code && (
          <TabsContent value="localizacion">
            <ExpedientLocalizacionTab employeeId={employeeId} companyId={companyId} countryCode={employee.country_code} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default HREmployeeExpedient;
