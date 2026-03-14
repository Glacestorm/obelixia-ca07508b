/**
 * EmployeePortalHome — Panel de inicio del portal del empleado
 * Muestra resumen rápido: datos básicos, accesos rápidos, alertas documentales
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  FolderOpen,
  Send,
  Clock,
  Palmtree,
  User,
  CalendarDays,
  Building2,
  Briefcase,
} from 'lucide-react';
import { EmployeeProfile } from '@/hooks/erp/hr/useEmployeePortal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { type PortalSection } from './EmployeePortalNav';

interface Props {
  employee: EmployeeProfile;
  onNavigate: (section: PortalSection) => void;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  temporary_leave: 'Baja temporal',
  excedencia: 'Excedencia',
  onboarding: 'En incorporación',
  candidate: 'Candidato',
  offboarding: 'En salida',
  terminated: 'Finalizado',
};

const QUICK_ACTIONS = [
  { id: 'payslips' as PortalSection, label: 'Ver nóminas', icon: FileText, color: 'text-blue-500' },
  { id: 'documents' as PortalSection, label: 'Mis documentos', icon: FolderOpen, color: 'text-emerald-500' },
  { id: 'requests' as PortalSection, label: 'Nueva solicitud', icon: Send, color: 'text-amber-500' },
  { id: 'leave' as PortalSection, label: 'Vacaciones', icon: Palmtree, color: 'text-teal-500' },
  { id: 'time' as PortalSection, label: 'Fichaje', icon: Clock, color: 'text-purple-500' },
  { id: 'profile' as PortalSection, label: 'Mi perfil', icon: User, color: 'text-rose-500' },
];

export function EmployeePortalHome({ employee, onNavigate }: Props) {
  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-6">
        <h1 className="text-2xl font-bold">
          ¡Hola, {employee.first_name}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Bienvenido a tu portal de empleado. Aquí puedes gestionar tus nóminas, documentos y solicitudes.
        </p>
      </div>

      {/* Employee summary card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Resumen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Puesto</p>
                <p className="text-sm font-medium">{employee.job_title || 'No definido'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Categoría</p>
                <p className="text-sm font-medium">{employee.category || 'No definida'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarDays className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Antigüedad</p>
                <p className="text-sm font-medium">
                  {format(new Date(employee.hire_date), 'dd MMM yyyy', { locale: es })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={employee.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                {STATUS_LABELS[employee.status || ''] || employee.status || 'Desconocido'}
              </Badge>
              {employee.employee_number && (
                <span className="text-xs text-muted-foreground">Nº {employee.employee_number}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">Accesos rápidos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_ACTIONS.map(action => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                className="h-auto flex-col gap-2 py-4 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                onClick={() => onNavigate(action.id)}
              >
                <Icon className={`h-5 w-5 ${action.color}`} />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
