/**
 * ExpedientFichaTab — Global employee profile data (country-agnostic)
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, MapPin, Building2, Calendar, Globe, Users } from 'lucide-react';
import { HRStatusBadge } from '../../shared/HRStatusBadge';

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
  nationality?: string;
  reports_to_name?: string;
  legal_entity_name?: string;
  work_center_name?: string;
  birth_date?: string;
  gender?: string;
  employee_number?: string;
  base_salary?: number;
}

interface Props {
  employee: EmployeeData;
}

export function ExpedientFichaTab({ employee }: Props) {
  return (
    <div className="space-y-4">
      {/* Identity & Contact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Datos Personales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <Field label="Nombre" value={employee.first_name} />
            <Field label="Apellidos" value={employee.last_name} />
            <Field label="Nº Empleado" value={employee.employee_number} />
            <Field label="Email" value={employee.email} icon={<Mail className="h-3 w-3" />} />
            <Field label="Teléfono" value={employee.phone} icon={<Phone className="h-3 w-3" />} />
            <Field label="Fecha nacimiento" value={employee.birth_date ? new Date(employee.birth_date).toLocaleDateString() : undefined} />
            <Field label="Género" value={employee.gender} />
            <Field label="Nacionalidad" value={employee.nationality} icon={<Globe className="h-3 w-3" />} />
            <div>
              <p className="text-xs text-muted-foreground">Estado</p>
              <HRStatusBadge entity="employee" status={employee.status} size="md" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organizational Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Datos Organizativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <Field label="Puesto" value={employee.position_title} />
            <Field label="Departamento" value={employee.department_name} />
            <Field label="Manager" value={employee.reports_to_name} icon={<Users className="h-3 w-3" />} />
            <Field label="Entidad legal" value={employee.legal_entity_name} icon={<Building2 className="h-3 w-3" />} />
            <Field label="Centro de trabajo" value={employee.work_center_name} icon={<MapPin className="h-3 w-3" />} />
            <Field label="País de empleo" value={employee.country_code} icon={<Globe className="h-3 w-3" />} />
            <Field label="Fecha alta" value={employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : undefined} icon={<Calendar className="h-3 w-3" />} />
            <Field label="Salario bruto anual" value={employee.base_salary ? `${employee.base_salary.toLocaleString()} €` : undefined} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</p>
      <p className="font-medium">{value || '—'}</p>
    </div>
  );
}
