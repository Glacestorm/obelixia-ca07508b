/**
 * Panel de Empleados - HREmployeesPanel
 * Global HR Core: country-agnostic listing with global filters
 * Filters: country, legal entity, status, search
 * No ES-specific columns (NSS, contract_type) in core view
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  MoreHorizontal,
  UserPlus,
  Edit,
  Eye,
  Key,
  FileText,
  Trash2,
  Download,
  Users,
  UserCheck,
  UserX,
  RefreshCw,
  Grid3X3,
  List,
  Globe,
  Building2,
  ClipboardList
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HREmployeeFormDialog } from './HREmployeeFormDialog';
import { HREmployeeProfileDialog, HREmployeeDocumentsDialog, HREmployeeExportDialog } from './dialogs';
import { HRStatusBadge } from './shared/HRStatusBadge';
import { cn } from '@/lib/utils';

const COUNTRY_FLAGS: Record<string, string> = {
  ES: '🇪🇸', FR: '🇫🇷', PT: '🇵🇹', DE: '🇩🇪', IT: '🇮🇹', UK: '🇬🇧', US: '🇺🇸', MX: '🇲🇽', AD: '🇦🇩',
};

const EMPLOYEE_STATUSES = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'temporary_leave', label: 'Baja temporal' },
  { value: 'offboarding', label: 'Offboarding' },
  { value: 'terminated', label: 'Baja definitiva' },
  { value: 'on_leave', label: 'En baja' },
  { value: 'inactive', label: 'Inactivos' },
];

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_number: string | null;
  position: string | null;
  department_id: string | null;
  department_name?: string;
  hire_date: string | null;
  status: string;
  phone: string | null;
  avatar_url: string | null;
  country_code: string | null;
  legal_entity_id: string | null;
  legal_entity_name?: string;
  reports_to: string | null;
  reports_to_name?: string;
  base_salary: number | null;
  // Compat fields for dialogs
  contract_type?: string | null;
  gross_salary?: number | null;
  social_security_number?: string | null;
  contract_end_date?: string | null;
  jurisdiction?: string | null;
}

interface HREmployeesPanelProps {
  companyId: string;
  onOpenExpedient?: (employeeId: string) => void;
}

export function HREmployeesPanel({ companyId, onOpenExpedient }: HREmployeesPanelProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showDocumentsDialog, setShowDocumentsDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Available countries and entities for filters
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availableEntities, setAvailableEntities] = useState<Array<{ id: string; name: string }>>([]);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_employees')
        .select(`
          id, first_name, last_name, email, employee_number, job_title, department_id,
          hire_date, status, phone, country_code, legal_entity_id, reports_to, base_salary,
          erp_hr_departments!erp_hr_employees_department_id_fkey(name)
        `)
        .eq('company_id', companyId)
        .order('last_name', { ascending: true });

      if (error) throw error;

      const formattedEmployees = (data || []).map((emp: any) => ({
        ...emp,
        position: emp.job_title,
        department_name: emp.erp_hr_departments?.name || 'Sin departamento',
        avatar_url: null,
      }));

      setEmployees(formattedEmployees);

      // Extract unique countries & entities for filters
      const countries = [...new Set(formattedEmployees.map((e: any) => e.country_code).filter(Boolean))] as string[];
      setAvailableCountries(countries);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // Fetch legal entities for filter
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const { data } = await supabase
          .from('erp_hr_legal_entities')
          .select('id, name')
          .eq('company_id', companyId)
          .order('name');
        if (data) setAvailableEntities(data as any);
      } catch { /* ignore */ }
    };
    fetchEntities();
  }, [companyId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (statusFilter !== 'all' && emp.status !== statusFilter) return false;
      if (countryFilter !== 'all' && emp.country_code !== countryFilter) return false;
      if (entityFilter !== 'all' && emp.legal_entity_id !== entityFilter) return false;
      if (!searchTerm) return true;

      const term = searchTerm.toLowerCase();
      return (
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(term) ||
        emp.employee_number?.toLowerCase().includes(term) ||
        emp.email?.toLowerCase().includes(term) ||
        emp.position?.toLowerCase().includes(term)
      );
    });
  }, [employees, searchTerm, statusFilter, countryFilter, entityFilter]);

  const handleDeleteEmployee = async (employee: Employee) => {
    if (!confirm(`¿Eliminar a ${employee.first_name} ${employee.last_name}?`)) return;
    try {
      const { error } = await supabase.from('erp_hr_employees').delete().eq('id', employee.id);
      if (error) throw error;
      setEmployees(prev => prev.filter(e => e.id !== employee.id));
      toast.success('Empleado eliminado');
    } catch {
      toast.error('Error al eliminar empleado');
    }
  };

  const stats = useMemo(() => ({
    total: employees.length,
    active: employees.filter(e => e.status === 'active').length,
    onLeave: employees.filter(e => ['on_leave', 'temporary_leave'].includes(e.status)).length,
    inactive: employees.filter(e => ['inactive', 'terminated'].includes(e.status)).length,
  }), [employees]);

  const getInitials = (f: string, l: string) => `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();

  return (
    <div className="space-y-4">
      {/* Stats */}
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
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => setStatusFilter('active')}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Activos</p>
                <p className="text-lg font-bold text-green-600">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => setStatusFilter('temporary_leave')}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">En Baja</p>
                <p className="text-lg font-bold text-amber-600">{stats.onLeave}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => setStatusFilter('terminated')}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Bajas</p>
                <p className="text-lg font-bold text-muted-foreground">{stats.inactive}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
            <div className="flex flex-1 gap-2 w-full lg:w-auto flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, nº empleado, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableCountries.length > 1 && (
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-[130px]">
                    <Globe className="h-3.5 w-3.5 mr-1" />
                    <SelectValue placeholder="País" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los países</SelectItem>
                    {availableCountries.map(c => (
                      <SelectItem key={c} value={c}>{COUNTRY_FLAGS[c] || '🌐'} {c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {availableEntities.length > 1 && (
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="w-[160px]">
                    <Building2 className="h-3.5 w-3.5 mr-1" />
                    <SelectValue placeholder="Entidad legal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las entidades</SelectItem>
                    {availableEntities.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}>
                {viewMode === 'table' ? <Grid3X3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={fetchEmployees} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              <Button onClick={() => { setSelectedEmployee(null); setShowFormDialog(true); }}>
                <UserPlus className="h-4 w-4 mr-2" />
                Nuevo Empleado
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Empleados ({filteredEmployees.length})</span>
            {(statusFilter !== 'all' || countryFilter !== 'all' || entityFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setStatusFilter('all'); setCountryFilter('all'); setEntityFilter('all'); }}>
                Limpiar filtros
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
                    <TableHead>País</TableHead>
                    <TableHead>Departamento</TableHead>
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
                            <p className="text-xs text-muted-foreground">{employee.position || '—'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{employee.employee_number || '—'}</TableCell>
                      <TableCell>
                        {employee.country_code ? (
                          <Badge variant="outline" className="text-xs gap-1">
                            {COUNTRY_FLAGS[employee.country_code] || '🌐'} {employee.country_code}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell>{employee.department_name}</TableCell>
                      <TableCell>
                        <HRStatusBadge entity="employee" status={employee.status} size="sm" />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onOpenExpedient && (
                              <DropdownMenuItem onClick={() => onOpenExpedient(employee.id)}>
                                <ClipboardList className="h-4 w-4 mr-2" />
                                Ver expediente
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => { setSelectedEmployee(employee); setShowProfileDialog(true); }}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver ficha
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedEmployee(employee); setShowFormDialog(true); }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setSelectedEmployee(employee); setShowDocumentsDialog(true); }}>
                              <FileText className="h-4 w-4 mr-2" />
                              Documentos
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedEmployee(employee); setShowExportDialog(true); }}>
                              <Download className="h-4 w-4 mr-2" />
                              Exportar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteEmployee(employee)} className="text-destructive">
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
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                    onClick={() => onOpenExpedient ? onOpenExpedient(employee.id) : setShowProfileDialog(true)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={employee.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(employee.first_name, employee.last_name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">{employee.first_name} {employee.last_name}</p>
                            <HRStatusBadge entity="employee" status={employee.status} size="sm" />
                          </div>
                          <p className="text-sm text-muted-foreground">{employee.position || '—'}</p>
                          <p className="text-xs text-muted-foreground">{employee.department_name}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs font-mono">{employee.employee_number}</Badge>
                            {employee.country_code && (
                              <Badge variant="outline" className="text-xs">
                                {COUNTRY_FLAGS[employee.country_code] || '🌐'} {employee.country_code}
                              </Badge>
                            )}
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

      {/* Dialogs */}
      <HREmployeeFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        employee={selectedEmployee}
        companyId={companyId}
        onSave={() => { fetchEmployees(); setShowFormDialog(false); }}
      />
      <HREmployeeProfileDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        employee={selectedEmployee}
        onEdit={() => { setShowProfileDialog(false); setShowFormDialog(true); }}
        onManageAccess={() => { setShowProfileDialog(false); setShowFormDialog(true); }}
      />
      <HREmployeeDocumentsDialog
        open={showDocumentsDialog}
        onOpenChange={setShowDocumentsDialog}
        employee={selectedEmployee}
        companyId={companyId}
      />
      <HREmployeeExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        employee={selectedEmployee}
      />
    </div>
  );
}

export default HREmployeesPanel;
