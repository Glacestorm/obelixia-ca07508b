/**
 * HRTrainingEnrollDialog - Dialog para inscribir empleados en formaciones
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { GraduationCap, Loader2, UserPlus, Search, Users, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
}

interface Training {
  id: string;
  title: string;
  cost_per_person: number;
  duration_hours: number;
  modality: string;
}

interface HRTrainingEnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  training: Training | null;
  companyId: string;
  onEnrolled?: () => void;
}

export function HRTrainingEnrollDialog({
  open,
  onOpenChange,
  training,
  companyId,
  onEnrolled
}: HRTrainingEnrollDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Demo employees
  const [employees] = useState<Employee[]>([
    { id: '1', name: 'María García López', department: 'Desarrollo', position: 'Senior Developer' },
    { id: '2', name: 'Carlos Rodríguez Martín', department: 'Desarrollo', position: 'Tech Lead' },
    { id: '3', name: 'Ana Fernández Ruiz', department: 'Marketing', position: 'Marketing Manager' },
    { id: '4', name: 'Pedro Sánchez Gil', department: 'RRHH', position: 'HR Specialist' },
    { id: '5', name: 'Laura Martínez Díaz', department: 'Ventas', position: 'Sales Executive' },
    { id: '6', name: 'Javier López Torres', department: 'Desarrollo', position: 'Junior Developer' },
    { id: '7', name: 'Elena Ruiz Navarro', department: 'Finanzas', position: 'Financial Analyst' },
    { id: '8', name: 'David García Moreno', department: 'Operaciones', position: 'Operations Manager' },
  ]);

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const selectAll = () => {
    setSelectedEmployees(filteredEmployees.map(e => e.id));
  };

  const clearSelection = () => {
    setSelectedEmployees([]);
  };

  const totalCost = training ? selectedEmployees.length * training.cost_per_person : 0;

  const handleEnroll = async () => {
    if (selectedEmployees.length === 0) {
      toast.error('Selecciona al menos un empleado');
      return;
    }

    setIsEnrolling(true);
    try {
      // Simular inscripción
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`${selectedEmployees.length} empleado(s) inscrito(s) correctamente`);
      onEnrolled?.();
      onOpenChange(false);
      setSelectedEmployees([]);
    } catch (error) {
      console.error('Error enrolling employees:', error);
      toast.error('Error al inscribir empleados');
    } finally {
      setIsEnrolling(false);
    }
  };

  if (!training) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Inscribir Empleados
          </DialogTitle>
          <DialogDescription>
            Inscribe empleados en: <strong>{training.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info de formación */}
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <Badge variant="secondary">{training.modality}</Badge>
            <span className="text-sm text-muted-foreground">
              {training.duration_hours}h
            </span>
            <span className="text-sm font-medium">
              {training.cost_per_person.toLocaleString()}€/persona
            </span>
          </div>

          {/* Búsqueda y acciones */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar empleados..."
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm" onClick={selectAll}>
              Seleccionar todos
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Limpiar
            </Button>
          </div>

          {/* Lista de empleados */}
          <ScrollArea className="h-[300px] border rounded-lg">
            <div className="p-2 space-y-1">
              {filteredEmployees.map((employee) => {
                const isSelected = selectedEmployees.includes(employee.id);
                return (
                  <div
                    key={employee.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleEmployee(employee.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleEmployee(employee.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{employee.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {employee.position} • {employee.department}
                      </p>
                    </div>
                    {isSelected && (
                      <Badge variant="default" className="text-xs">
                        Seleccionado
                      </Badge>
                    )}
                  </div>
                );
              })}
              {filteredEmployees.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron empleados
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Resumen */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>{selectedEmployees.length}</strong> empleado(s) seleccionado(s)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                Coste total: <strong>{totalCost.toLocaleString()}€</strong>
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleEnroll} disabled={isEnrolling || selectedEmployees.length === 0}>
            {isEnrolling ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            Inscribir ({selectedEmployees.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRTrainingEnrollDialog;
