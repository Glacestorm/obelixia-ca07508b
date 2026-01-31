/**
 * HRDepartmentsPanel - Gestión de departamentos, talleres y organización
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, Users, Plus, Search, Edit, Trash2,
  ChevronRight, ChevronDown, User, Briefcase, MapPin
} from 'lucide-react';

interface HRDepartmentsPanelProps {
  companyId: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
  manager: string;
  employees: number;
  budget: number;
  location: string;
  subdepartments?: Department[];
  expanded?: boolean;
}

export function HRDepartmentsPanel({ companyId }: HRDepartmentsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set(['1']));

  // Demo data - Estructura organizativa
  const departments: Department[] = [
    {
      id: '1',
      name: 'Dirección General',
      code: 'DIR',
      manager: 'Carlos Rodríguez',
      employees: 2,
      budget: 180000,
      location: 'Sede Central',
      subdepartments: [
        {
          id: '1.1',
          name: 'Administración',
          code: 'ADM',
          manager: 'María García',
          employees: 8,
          budget: 280000,
          location: 'Sede Central'
        },
        {
          id: '1.2',
          name: 'Recursos Humanos',
          code: 'RRHH',
          manager: 'Ana López',
          employees: 3,
          budget: 95000,
          location: 'Sede Central'
        }
      ]
    },
    {
      id: '2',
      name: 'Producción',
      code: 'PROD',
      manager: 'Juan Martínez',
      employees: 18,
      budget: 450000,
      location: 'Nave Industrial',
      subdepartments: [
        {
          id: '2.1',
          name: 'Taller Mecánico',
          code: 'TM',
          manager: 'Pedro Sánchez',
          employees: 8,
          budget: 180000,
          location: 'Nave 1'
        },
        {
          id: '2.2',
          name: 'Taller Electrónico',
          code: 'TE',
          manager: 'Luis García',
          employees: 6,
          budget: 150000,
          location: 'Nave 2'
        },
        {
          id: '2.3',
          name: 'Almacén',
          code: 'ALM',
          manager: 'Roberto Vila',
          employees: 4,
          budget: 120000,
          location: 'Nave 3'
        }
      ]
    },
    {
      id: '3',
      name: 'Comercial',
      code: 'COM',
      manager: 'Elena Fernández',
      employees: 10,
      budget: 320000,
      location: 'Sede Central',
      subdepartments: [
        {
          id: '3.1',
          name: 'Ventas Nacionales',
          code: 'VN',
          manager: 'Sara Ruiz',
          employees: 5,
          budget: 150000,
          location: 'Sede Central'
        },
        {
          id: '3.2',
          name: 'Ventas Internacionales',
          code: 'VI',
          manager: 'David Martín',
          employees: 3,
          budget: 120000,
          location: 'Sede Central'
        },
        {
          id: '3.3',
          name: 'Marketing',
          code: 'MKT',
          manager: 'Laura Díaz',
          employees: 2,
          budget: 50000,
          location: 'Sede Central'
        }
      ]
    },
    {
      id: '4',
      name: 'Tecnología',
      code: 'IT',
      manager: 'Miguel Torres',
      employees: 6,
      budget: 250000,
      location: 'Sede Central'
    }
  ];

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedDepts);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedDepts(newExpanded);
  };

  const totalEmployees = departments.reduce((sum, d) => sum + d.employees, 0);
  const totalBudget = departments.reduce((sum, d) => sum + d.budget, 0);

  const renderDepartment = (dept: Department, level: number = 0) => {
    const hasChildren = dept.subdepartments && dept.subdepartments.length > 0;
    const isExpanded = expandedDepts.has(dept.id);

    return (
      <div key={dept.id}>
        <div 
          className={`
            flex items-center justify-between p-3 rounded-lg border 
            hover:bg-muted/50 transition-colors cursor-pointer
            ${level > 0 ? 'ml-6 border-l-2 border-l-primary/30' : ''}
          `}
          style={{ marginLeft: level * 24 }}
          onClick={() => hasChildren && toggleExpand(dept.id)}
        >
          <div className="flex items-center gap-3">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <div className="w-4" />
            )}
            
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{dept.name}</span>
                <Badge variant="outline" className="text-xs">{dept.code}</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {dept.manager}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {dept.location}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{dept.employees}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                €{(dept.budget / 1000).toFixed(0)}k
              </p>
            </div>
            
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                <Edit className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {dept.subdepartments!.map(sub => renderDepartment(sub, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Departamentos</p>
                <p className="text-lg font-bold">{departments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Total Empleados</p>
                <p className="text-lg font-bold">{totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Centros de Trabajo</p>
                <p className="text-lg font-bold">3</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Presupuesto RRHH</p>
                <p className="text-lg font-bold">€{(totalBudget / 1000000).toFixed(1)}M</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organigrama */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Estructura Organizativa</CardTitle>
              <CardDescription>Departamentos, talleres y centros de trabajo</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nuevo Departamento
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {departments.map(dept => renderDepartment(dept))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Distribución por ubicación */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Sede Central', 'Nave Industrial', 'Nave 1'].map((location, index) => (
          <Card key={location}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {location}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Empleados</span>
                  <span className="font-medium">{[29, 12, 8][index]}</span>
                </div>
                <Progress value={[62, 25, 17][index]} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {[62, 25, 17][index]}% del total
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default HRDepartmentsPanel;
