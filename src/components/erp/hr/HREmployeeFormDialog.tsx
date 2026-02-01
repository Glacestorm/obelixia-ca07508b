/**
 * Formulario de Empleado con asignación de accesos a módulos ERP
 * Tabs: Datos Personales, Contrato, Accesos a Módulos, Familia
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  User,
  FileText,
  Key,
  Users,
  Save,
  Loader2,
  Building2,
  Calendar,
  Phone,
  Mail,
  CreditCard,
  Globe,
  Shield,
  Eye,
  Edit,
  Lock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
  hire_date: string | null;
  contract_end_date: string | null;
  contract_type: string | null;
  status: string;
  phone: string | null;
  jurisdiction: string | null;
  gross_salary: number | null;
}

interface ModuleAccess {
  module_code: string;
  module_name: string;
  description: string;
  icon: string;
  access_level: 'none' | 'read' | 'write' | 'admin';
}

interface HREmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  companyId: string;
  onSave: () => void;
}

const AVAILABLE_MODULES: Omit<ModuleAccess, 'access_level'>[] = [
  { module_code: 'maestros', module_name: 'Maestros', description: 'Gestión de datos maestros', icon: 'Database' },
  { module_code: 'ventas', module_name: 'Ventas', description: 'Gestión comercial y ventas', icon: 'ShoppingCart' },
  { module_code: 'compras', module_name: 'Compras', description: 'Gestión de compras y proveedores', icon: 'Package' },
  { module_code: 'almacen', module_name: 'Almacén', description: 'Control de inventario', icon: 'Warehouse' },
  { module_code: 'tesoreria', module_name: 'Tesorería', description: 'Gestión de tesorería', icon: 'Wallet' },
  { module_code: 'fiscal', module_name: 'Fiscal', description: 'Contabilidad y fiscal', icon: 'Calculator' },
  { module_code: 'hr', module_name: 'RRHH', description: 'Recursos Humanos', icon: 'Users' },
  { module_code: 'trade', module_name: 'Comercio Exterior', description: 'Importación y exportación', icon: 'Globe' },
  { module_code: 'logistics', module_name: 'Logística', description: 'Gestión logística', icon: 'Truck' },
  { module_code: 'banking', module_name: 'Banca', description: 'Gestión bancaria', icon: 'Building' },
  { module_code: 'advisor', module_name: 'Asesor IA', description: 'Asistente inteligente', icon: 'Brain' }
];

const ACCESS_LEVELS = [
  { value: 'none', label: 'Sin acceso', icon: Lock, color: 'text-gray-400' },
  { value: 'read', label: 'Lectura', icon: Eye, color: 'text-blue-500' },
  { value: 'write', label: 'Escritura', icon: Edit, color: 'text-amber-500' },
  { value: 'admin', label: 'Administrador', icon: Shield, color: 'text-green-500' }
];

export function HREmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  companyId,
  onSave
}: HREmployeeFormDialogProps) {
  const isNew = !employee;
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    employee_number: '',
    social_security_number: '',
    position: '',
    department_id: '',
    hire_date: '',
    contract_end_date: '',
    contract_type: 'indefinido',
    status: 'active',
    jurisdiction: 'ES',
    gross_salary: 0
  });

  // Module access state
  const [moduleAccess, setModuleAccess] = useState<Record<string, 'none' | 'read' | 'write' | 'admin'>>({});

  // Departments
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);

  // Initialize form
  useEffect(() => {
    if (employee) {
      setFormData({
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        employee_number: employee.employee_number || '',
        social_security_number: employee.social_security_number || '',
        position: employee.position || '',
        department_id: employee.department_id || '',
        hire_date: employee.hire_date || '',
        contract_end_date: employee.contract_end_date || '',
        contract_type: employee.contract_type || 'indefinido',
        status: employee.status || 'active',
        jurisdiction: employee.jurisdiction || 'ES',
        gross_salary: employee.gross_salary || 0
      });
      // Load existing access
      loadModuleAccess(employee.id);
    } else {
      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        employee_number: '',
        social_security_number: '',
        position: '',
        department_id: '',
        hire_date: new Date().toISOString().split('T')[0],
        contract_end_date: '',
        contract_type: 'indefinido',
        status: 'active',
        jurisdiction: 'ES',
        gross_salary: 0
      });
      // Default all modules to no access
      const defaultAccess: Record<string, 'none'> = {};
      AVAILABLE_MODULES.forEach(m => {
        defaultAccess[m.module_code] = 'none';
      });
      setModuleAccess(defaultAccess);
    }
  }, [employee, open]);

  // Load departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const { data } = await supabase
          .from('erp_hr_departments')
          .select('id, name')
          .eq('company_id', companyId)
          .order('name');
        
        if (data) {
          setDepartments(data);
        }
      } catch (error) {
        // Demo data
        setDepartments([
          { id: '1', name: 'Recursos Humanos' },
          { id: '2', name: 'Tecnología' },
          { id: '3', name: 'Administración' },
          { id: '4', name: 'Ventas' },
          { id: '5', name: 'Producción' }
        ]);
      }
    };
    if (open) fetchDepartments();
  }, [companyId, open]);

  // Load module access for existing employee
  const loadModuleAccess = async (employeeId: string) => {
    try {
      const { data } = await supabase
        .from('erp_hr_employee_module_access')
        .select('module_code, access_level')
        .eq('employee_id', employeeId);

      const access: Record<string, 'none' | 'read' | 'write' | 'admin'> = {};
      AVAILABLE_MODULES.forEach(m => {
        const found = data?.find((d: any) => d.module_code === m.module_code);
        access[m.module_code] = found ? found.access_level : 'none';
      });
      setModuleAccess(access);
    } catch (error) {
      console.error('Error loading module access:', error);
      // Default to no access
      const defaultAccess: Record<string, 'none'> = {};
      AVAILABLE_MODULES.forEach(m => {
        defaultAccess[m.module_code] = 'none';
      });
      setModuleAccess(defaultAccess);
    }
  };

  // Handle form changes
  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle access level change
  const handleAccessChange = (moduleCode: string, level: 'none' | 'read' | 'write' | 'admin') => {
    setModuleAccess(prev => ({ ...prev, [moduleCode]: level }));
  };

  // Set all modules to a level
  const setAllModulesAccess = (level: 'none' | 'read' | 'write' | 'admin') => {
    const newAccess: Record<string, typeof level> = {};
    AVAILABLE_MODULES.forEach(m => {
      newAccess[m.module_code] = level;
    });
    setModuleAccess(newAccess);
  };

  // Save employee
  const handleSave = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Complete los campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      let employeeId = employee?.id;

      if (isNew) {
        // Create new employee
        const { data, error } = await supabase
          .from('erp_hr_employees')
          .insert([{
            company_id: companyId,
            ...formData,
            gross_salary: Number(formData.gross_salary)
          }])
          .select()
          .single();

        if (error) throw error;
        employeeId = data.id;
        toast.success('Empleado creado correctamente');
      } else {
        // Update existing employee
        const { error } = await supabase
          .from('erp_hr_employees')
          .update({
            ...formData,
            gross_salary: Number(formData.gross_salary)
          })
          .eq('id', employee.id);

        if (error) throw error;
        toast.success('Empleado actualizado correctamente');
      }

      // Save module access
      if (employeeId) {
        // Delete existing access
        await supabase
          .from('erp_hr_employee_module_access')
          .delete()
          .eq('employee_id', employeeId);

        // Insert new access (only non-none)
        const accessRecords = Object.entries(moduleAccess)
          .filter(([_, level]) => level !== 'none')
          .map(([code, level]) => ({
            employee_id: employeeId,
            company_id: companyId,
            module_code: code,
            access_level: level
          }));

        if (accessRecords.length > 0) {
          const { error: accessError } = await supabase
            .from('erp_hr_employee_module_access')
            .insert(accessRecords);

          if (accessError) {
            console.error('Error saving access:', accessError);
          }
        }
      }

      onSave();
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error('Error al guardar empleado');
    } finally {
      setSaving(false);
    }
  };

  const getAccessIcon = (level: string) => {
    const found = ACCESS_LEVELS.find(l => l.value === level);
    return found ? found.icon : Lock;
  };

  const getAccessColor = (level: string) => {
    const found = ACCESS_LEVELS.find(l => l.value === level);
    return found ? found.color : 'text-gray-400';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isNew ? 'Nuevo Empleado' : `Editar: ${employee?.first_name} ${employee?.last_name}`}
          </DialogTitle>
          <DialogDescription>
            Complete los datos del empleado y configure sus accesos a los módulos del ERP.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal" className="gap-1">
              <User className="h-3 w-3" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="contract" className="gap-1">
              <FileText className="h-3 w-3" />
              Contrato
            </TabsTrigger>
            <TabsTrigger value="access" className="gap-1">
              <Key className="h-3 w-3" />
              Accesos
            </TabsTrigger>
            <TabsTrigger value="family" className="gap-1">
              <Users className="h-3 w-3" />
              Familia
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            {/* Personal Data */}
            <TabsContent value="personal" className="m-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Nombre *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    placeholder="Nombre"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Apellidos *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    placeholder="Apellidos"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="email@empresa.com"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="+34 600 000 000"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employee_number">Nº Empleado</Label>
                  <Input
                    id="employee_number"
                    value={formData.employee_number}
                    onChange={(e) => handleChange('employee_number', e.target.value)}
                    placeholder="EMP001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social_security_number">Nº Seguridad Social</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="social_security_number"
                      value={formData.social_security_number}
                      onChange={(e) => handleChange('social_security_number', e.target.value)}
                      placeholder="28/12345678/90"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="position">Puesto</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => handleChange('position', e.target.value)}
                    placeholder="Ej: Ingeniero Senior"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department_id">Departamento</Label>
                  <Select
                    value={formData.department_id}
                    onValueChange={(v) => handleChange('department_id', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Contract Data */}
            <TabsContent value="contract" className="m-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hire_date">Fecha de Alta</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="hire_date"
                      type="date"
                      value={formData.hire_date}
                      onChange={(e) => handleChange('hire_date', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contract_end_date">Fecha Fin Contrato</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contract_end_date"
                      type="date"
                      value={formData.contract_end_date}
                      onChange={(e) => handleChange('contract_end_date', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract_type">Tipo de Contrato</Label>
                  <Select
                    value={formData.contract_type}
                    onValueChange={(v) => handleChange('contract_type', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indefinido">Indefinido</SelectItem>
                      <SelectItem value="temporal">Temporal</SelectItem>
                      <SelectItem value="practicas">Prácticas</SelectItem>
                      <SelectItem value="formacion">Formación</SelectItem>
                      <SelectItem value="obra_servicio">Obra y Servicio</SelectItem>
                      <SelectItem value="interinidad">Interinidad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => handleChange('status', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="on_leave">En Baja</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gross_salary">Salario Bruto Anual (€)</Label>
                  <Input
                    id="gross_salary"
                    type="number"
                    value={formData.gross_salary}
                    onChange={(e) => handleChange('gross_salary', e.target.value)}
                    placeholder="30000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jurisdiction">Jurisdicción</Label>
                  <Select
                    value={formData.jurisdiction}
                    onValueChange={(v) => handleChange('jurisdiction', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ES">🇪🇸 España</SelectItem>
                      <SelectItem value="AD">🇦🇩 Andorra</SelectItem>
                      <SelectItem value="FR">🇫🇷 Francia</SelectItem>
                      <SelectItem value="PT">🇵🇹 Portugal</SelectItem>
                      <SelectItem value="UK">🇬🇧 Reino Unido</SelectItem>
                      <SelectItem value="US">🇺🇸 Estados Unidos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Module Access */}
            <TabsContent value="access" className="m-0 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Acceso a Módulos ERP</h4>
                  <p className="text-sm text-muted-foreground">
                    Configure el nivel de acceso del empleado a cada módulo
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAllModulesAccess('none')}
                  >
                    Sin acceso
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAllModulesAccess('read')}
                  >
                    Solo lectura
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {AVAILABLE_MODULES.map(module => {
                  const currentLevel = moduleAccess[module.module_code] || 'none';
                  const IconComponent = getAccessIcon(currentLevel);
                  
                  return (
                    <div
                      key={module.module_code}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          currentLevel === 'none' ? 'bg-gray-100' : 'bg-primary/10'
                        )}>
                          <Building2 className={cn(
                            "h-4 w-4",
                            currentLevel === 'none' ? 'text-gray-400' : 'text-primary'
                          )} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{module.module_name}</p>
                          <p className="text-xs text-muted-foreground">{module.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn("gap-1", getAccessColor(currentLevel))}
                        >
                          <IconComponent className="h-3 w-3" />
                          {ACCESS_LEVELS.find(l => l.value === currentLevel)?.label}
                        </Badge>
                        <Select
                          value={currentLevel}
                          onValueChange={(v: any) => handleAccessChange(module.module_code, v)}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ACCESS_LEVELS.map(level => (
                              <SelectItem key={level.value} value={level.value}>
                                <div className="flex items-center gap-2">
                                  <level.icon className={cn("h-3 w-3", level.color)} />
                                  {level.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Family */}
            <TabsContent value="family" className="m-0 space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Gestión de familiares</p>
                <p className="text-sm">Añada familiares para gestión de permisos por fallecimiento</p>
                <Button variant="outline" className="mt-4">
                  <Users className="h-4 w-4 mr-2" />
                  Añadir Familiar
                </Button>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HREmployeeFormDialog;
