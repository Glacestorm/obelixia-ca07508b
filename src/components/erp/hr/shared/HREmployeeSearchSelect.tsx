/**
 * HREmployeeSearchSelect - Componente reutilizable de búsqueda avanzada de empleados
 * Permite buscar por nombre, NSS, número de empleado, teléfono, email, DNI
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Search, 
  User, 
  X, 
  ChevronsUpDown, 
  Phone, 
  Mail, 
  Hash,
  Building2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmployeeOption {
  id: string;
  first_name: string;
  last_name: string;
  employee_number?: string;
  social_security_number?: string;
  phone?: string;
  email?: string;
  job_title?: string;
  department_name?: string;
  status?: string;
}

interface HREmployeeSearchSelectProps {
  value: string;
  onValueChange: (employeeId: string, employee?: EmployeeOption) => void;
  companyId: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showInactive?: boolean;
  excludeIds?: string[];
  onEmployeesFetched?: (employees: EmployeeOption[]) => void;
}

export function HREmployeeSearchSelect({
  value,
  onValueChange,
  companyId,
  placeholder = 'Buscar empleado...',
  disabled = false,
  className,
  showInactive = false,
  excludeIds = [],
  onEmployeesFetched
}: HREmployeeSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);

  // Use refs for callback props to avoid infinite loops
  const onEmployeesFetchedRef = useRef(onEmployeesFetched);
  onEmployeesFetchedRef.current = onEmployeesFetched;
  const excludeIdsRef = useRef(excludeIds);
  excludeIdsRef.current = excludeIds;

  // Fetch employees - only depends on companyId
  const fetchEmployees = useCallback(async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_employees')
        .select('id, first_name, last_name, employee_number, social_security_number, phone, email, job_title, department_id, status')
        .eq('company_id', companyId)
        .order('first_name');

      if (error) {
        console.warn('Error fetching employees:', error.message);
        setEmployees([]);
        return;
      }

      const currentExcludeIds = excludeIdsRef.current;
      const filtered = currentExcludeIds.length > 0
        ? (data || []).filter((e: any) => !currentExcludeIds.includes(e.id))
        : (data || []);
      setEmployees(filtered as EmployeeOption[]);
      onEmployeesFetchedRef.current?.(filtered as EmployeeOption[]);

      if (value) {
        const selected = filtered.find((e: any) => e.id === value);
        setSelectedEmployee(selected as EmployeeOption || null);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, value]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Update selected employee when value changes externally
  useEffect(() => {
    if (value && employees.length > 0) {
      const selected = employees.find(e => e.id === value);
      setSelectedEmployee(selected || null);
    } else if (!value) {
      setSelectedEmployee(null);
    }
  }, [value, employees]);

  // Filter employees based on search term
  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees;

    const term = searchTerm.toLowerCase().trim();
    return employees.filter(emp => {
      const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
      const employeeNumber = emp.employee_number?.toLowerCase() || '';
      const nss = emp.social_security_number?.toLowerCase() || '';
      const phone = emp.phone?.toLowerCase() || '';
      const email = emp.email?.toLowerCase() || '';
      const jobTitle = emp.job_title?.toLowerCase() || '';

      return (
        fullName.includes(term) ||
        employeeNumber.includes(term) ||
        nss.includes(term) ||
        phone.includes(term) ||
        email.includes(term) ||
        jobTitle.includes(term)
      );
    });
  }, [employees, searchTerm]);

  const handleSelect = (employee: EmployeeOption) => {
    setSelectedEmployee(employee);
    onValueChange(employee.id, employee);
    setOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEmployee(null);
    onValueChange('', undefined);
    setSearchTerm('');
  };

  const getFullName = (emp: EmployeeOption) => 
    `${emp.first_name} ${emp.last_name}`.trim();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !selectedEmployee && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedEmployee ? (
              <>
                <User className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{getFullName(selectedEmployee)}</span>
                {selectedEmployee.employee_number && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    #{selectedEmployee.employee_number}
                  </Badge>
                )}
              </>
            ) : (
              <>
                <Search className="h-4 w-4 shrink-0" />
                <span>{placeholder}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {selectedEmployee && (
              <X 
                className="h-4 w-4 opacity-50 hover:opacity-100 cursor-pointer" 
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, NSS, nº empleado, teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 px-1">
            Busca por nombre, número SS, empleado, DNI, teléfono o email
          </p>
        </div>

        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {searchTerm ? 'No se encontraron empleados' : 'No hay empleados disponibles'}
            </div>
          ) : (
            <div className="p-1">
              {filteredEmployees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => handleSelect(emp)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors",
                    selectedEmployee?.id === emp.id && "bg-accent"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="font-medium truncate">
                          {getFullName(emp)}
                        </span>
                        {emp.status === 'inactive' && (
                          <Badge variant="destructive" className="text-xs">
                            Inactivo
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                        {emp.employee_number && (
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {emp.employee_number}
                          </span>
                        )}
                        {emp.social_security_number && (
                          <span>NSS: {emp.social_security_number}</span>
                        )}
                        {emp.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {emp.phone}
                          </span>
                        )}
                        {emp.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {emp.email}
                          </span>
                        )}
                      </div>

                      {emp.job_title && (
                        <div className="mt-1">
                          <Badge variant="outline" className="text-xs">
                            {emp.job_title}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export default HREmployeeSearchSelect;
