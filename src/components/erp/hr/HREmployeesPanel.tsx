/**
 * Panel de Empleados - HREmployeesPanel
 * Búsqueda avanzada por nombre, NSS, número empleado
 * Lista completa con acciones: editar, ver ficha, accesos
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Search,
  Plus,
  MoreHorizontal,
  UserPlus,
  Edit,
  Eye,
  Key,
  FileText,
  Trash2,
  Download,
  Filter,
  Users,
  UserCheck,
  UserX,
  RefreshCw,
  Grid3X3,
  List
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HREmployeeFormDialog } from './HREmployeeFormDialog';
import { cn } from '@/lib/utils';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_number: string | null;
  social_security_number: string | null;
  position: string | null;
  department_id: string | null;
  department_name?: string;
  hire_date: string | null;
  contract_end_date: string | null;
  contract_type: string | null;
  status: string;
  phone: string | null;
  avatar_url: string | null;
  jurisdiction: string | null;
  gross_salary: number | null;
}

interface HREmployeesPanelProps {
  companyId: string;
}

export function HREmployeesPanel({ companyId }: HREmployeesPanelProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'name' | 'ssn' | 'number'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'on_leave'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_employees')
        .select(`
          *,
          erp_hr_departments(name)
        `)
        .eq('company_id', companyId)
        .order('last_name', { ascending: true });

      if (error) throw error;

      const formattedEmployees = (data || []).map((emp: any) => ({
        ...emp,
        department_name: emp.erp_hr_departments?.name || 'Sin departamento'
      }));

      setEmployees(formattedEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      // Datos demo para desarrollo
      setEmployees([
        {
          id: '1',
          first_name: 'María',
          last_name: 'García López',
          email: 'maria.garcia@empresa.com',
          employee_number: 'EMP001',
          social_security_number: '28/12345678/90',
          position: 'Directora RRHH',
          department_id: '1',
          department_name: 'Recursos Humanos',
          hire_date: '2020-03-15',
          contract_end_date: null,
          contract_type: 'indefinido',
          status: 'active',
          phone: '+34 612 345 678',
          avatar_url: null,
          jurisdiction: 'ES',
          gross_salary: 45000
        },
        {
          id: '2',
          first_name: 'Carlos',
          last_name: 'Rodríguez Martín',
          email: 'carlos.rodriguez@empresa.com',
          employee_number: 'EMP002',
          social_security_number: '28/98765432/10',
          position: 'Ingeniero Senior',
          department_id: '2',
          department_name: 'Tecnología',
          hire_date: '2019-06-01',
          contract_end_date: null,
          contract_type: 'indefinido',
          status: 'active',
          phone: '+34 623 456 789',
          avatar_url: null,
          jurisdiction: 'ES',
          gross_salary: 52000
        },
        {
          id: '3',
          first_name: 'Ana',
          last_name: 'Martínez Sánchez',
          email: 'ana.martinez@empresa.com',
          employee_number: 'EMP003',
          social_security_number: '28/11223344/55',
          position: 'Contable',
          department_id: '3',
          department_name: 'Administración',
          hire_date: '2021-09-01',
          contract_end_date: '2026-08-31',
          contract_type: 'temporal',
          status: 'active',
          phone: '+34 634 567 890',
          avatar_url: null,
          jurisdiction: 'ES',
          gross_salary: 32000
        },
        {
          id: '4',
          first_name: 'Juan',
          last_name: 'López Fernández',
          email: 'juan.lopez@empresa.com',
          employee_number: 'EMP004',
          social_security_number: '28/55667788/99',
          position: 'Comercial',
          department_id: '4',
          department_name: 'Ventas',
          hire_date: '2022-01-15',
          contract_end_date: null,
          contract_type: 'indefinido',
          status: 'on_leave',
          phone: '+34 645 678 901',
          avatar_url: null,
          jurisdiction: 'ES',
          gross_salary: 28000
        },
        {
          id: '5',
          first_name: 'Elena',
          last_name: 'Fernández Ruiz',
          email: 'elena.fernandez@empresa.com',
          employee_number: 'EMP005',
          social_security_number: '28/99887766/55',
          position: 'Becario',
          department_id: '2',
          department_name: 'Tecnología',
          hire_date: '2025-09-01',
          contract_end_date: '2026-03-01',
          contract_type: 'practicas',
          status: 'inactive',
          phone: '+34 656 789 012',
          avatar_url: null,
          jurisdiction: 'ES',
          gross_salary: 12000
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Filtrado de empleados
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Filtro por estado
      if (statusFilter !== 'all' && emp.status !== statusFilter) return false;

      // Filtro por búsqueda
      if (!searchTerm) return true;

      const term = searchTerm.toLowerCase();

      switch (searchType) {
        case 'name':
          return `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(term);
        case 'ssn':
          return emp.social_security_number?.toLowerCase().includes(term);
        case 'number':
          return emp.employee_number?.toLowerCase().includes(term);
        case 'all':
        default:
          return (
            `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(term) ||
            emp.social_security_number?.toLowerCase().includes(term) ||
            emp.employee_number?.toLowerCase().includes(term) ||
            emp.email?.toLowerCase().includes(term) ||
            emp.position?.toLowerCase().includes(term)
          );
      }
    });
  }, [employees, searchTerm, searchType, statusFilter]);

  // Handlers
  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setShowFormDialog(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowFormDialog(true);
  };

  const handleViewEmployee = (employee: Employee) => {
    toast.info(`Ficha de ${employee.first_name} ${employee.last_name}`);
    // TODO: Abrir ficha completa
  };

  const handleManageAccess = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowFormDialog(true);
    // El dialog se abrirá en la pestaña de accesos
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    if (!confirm(`¿Eliminar a ${employee.first_name} ${employee.last_name}?`)) return;
    
    try {
      const { error } = await supabase
        .from('erp_hr_employees')
        .delete()
        .eq('id', employee.id);

      if (error) throw error;

      setEmployees(prev => prev.filter(e => e.id !== employee.id));
      toast.success('Empleado eliminado');
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Error al eliminar empleado');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Activo</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-500/20 text-gray-700 border-gray-500/30">Inactivo</Badge>;
      case 'on_leave':
        return <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">Baja</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getContractBadge = (type: string | null) => {
    switch (type) {
      case 'indefinido':
        return <Badge variant="outline" className="text-xs">Indefinido</Badge>;
      case 'temporal':
        return <Badge variant="outline" className="text-xs text-amber-600">Temporal</Badge>;
      case 'practicas':
        return <Badge variant="outline" className="text-xs text-blue-600">Prácticas</Badge>;
      case 'formacion':
        return <Badge variant="outline" className="text-xs text-purple-600">Formación</Badge>;
      default:
        return null;
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Stats
  const stats = useMemo(() => ({
    total: employees.length,
    active: employees.filter(e => e.status === 'active').length,
    inactive: employees.filter(e => e.status === 'inactive').length,
    onLeave: employees.filter(e => e.status === 'on_leave').length
  }), [employees]);

  return (
    <div className="space-y-4">
      {/* Stats rápidas */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => setStatusFilter('all')}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className={cn("h-4 w-4", statusFilter === 'all' && "text-primary")} />
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-green-500/50" onClick={() => setStatusFilter('active')}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <UserCheck className={cn("h-4 w-4 text-green-500", statusFilter === 'active' && "text-green-600")} />
              <div>
                <p className="text-xs text-muted-foreground">Activos</p>
                <p className="text-lg font-bold text-green-600">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-amber-500/50" onClick={() => setStatusFilter('on_leave')}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <UserX className={cn("h-4 w-4 text-amber-500", statusFilter === 'on_leave' && "text-amber-600")} />
              <div>
                <p className="text-xs text-muted-foreground">En Baja</p>
                <p className="text-lg font-bold text-amber-600">{stats.onLeave}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-gray-500/50" onClick={() => setStatusFilter('inactive')}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <UserX className={cn("h-4 w-4 text-gray-500", statusFilter === 'inactive' && "text-gray-600")} />
              <div>
                <p className="text-xs text-muted-foreground">Inactivos</p>
                <p className="text-lg font-bold text-gray-600">{stats.inactive}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de herramientas */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <div className="flex flex-1 gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar empleados..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={searchType} onValueChange={(v: any) => setSearchType(v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo</SelectItem>
                  <SelectItem value="name">Por Nombre</SelectItem>
                  <SelectItem value="ssn">Por NSS</SelectItem>
                  <SelectItem value="number">Por Nº Empleado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
              >
                {viewMode === 'table' ? <Grid3X3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchEmployees}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              <Button onClick={handleAddEmployee}>
                <UserPlus className="h-4 w-4 mr-2" />
                Nuevo Empleado
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de empleados */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Empleados ({filteredEmployees.length})</span>
            {statusFilter !== 'all' && (
              <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
                Limpiar filtro
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {viewMode === 'table' ? (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Nº Empleado</TableHead>
                    <TableHead>NSS</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map(employee => (
                    <TableRow key={employee.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={employee.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(employee.first_name, employee.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                            <p className="text-xs text-muted-foreground">{employee.position}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {employee.employee_number || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {employee.social_security_number || '-'}
                      </TableCell>
                      <TableCell>{employee.department_name}</TableCell>
                      <TableCell>{getContractBadge(employee.contract_type)}</TableCell>
                      <TableCell>{getStatusBadge(employee.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewEmployee(employee)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver ficha
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditEmployee(employee)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleManageAccess(employee)}>
                              <Key className="h-4 w-4 mr-2" />
                              Gestionar accesos
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => toast.info('Generando documentos...')}>
                              <FileText className="h-4 w-4 mr-2" />
                              Documentos
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast.info('Exportando ficha...')}>
                              <Download className="h-4 w-4 mr-2" />
                              Exportar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteEmployee(employee)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No se encontraron empleados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <ScrollArea className="h-[500px] p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEmployees.map(employee => (
                  <Card
                    key={employee.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => handleViewEmployee(employee)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={employee.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(employee.first_name, employee.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">
                              {employee.first_name} {employee.last_name}
                            </p>
                            {getStatusBadge(employee.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">{employee.position}</p>
                          <p className="text-xs text-muted-foreground">{employee.department_name}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs font-mono">
                              {employee.employee_number}
                            </Badge>
                            {getContractBadge(employee.contract_type)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dialog de formulario */}
      <HREmployeeFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        employee={selectedEmployee}
        companyId={companyId}
        onSave={() => {
          fetchEmployees();
          setShowFormDialog(false);
        }}
      />
    </div>
  );
}

export default HREmployeesPanel;
