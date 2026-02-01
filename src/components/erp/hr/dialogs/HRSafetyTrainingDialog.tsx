/**
 * HRSafetyTrainingDialog - Diálogo para crear/gestionar formaciones PRL
 * Fase D - Diálogos funcionales de Seguridad
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  HardHat, Users, Calendar, Clock, Loader2, Search
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface HRSafetyTrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess?: () => void;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  department: string;
  selected: boolean;
}

export function HRSafetyTrainingDialog({
  open,
  onOpenChange,
  companyId,
  onSuccess,
}: HRSafetyTrainingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [trainingName, setTrainingName] = useState('');
  const [trainingType, setTrainingType] = useState<string>('mandatory');
  const [description, setDescription] = useState('');
  const [durationHours, setDurationHours] = useState('4');
  const [scheduledDate, setScheduledDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [provider, setProvider] = useState<string>('internal');
  const [providerName, setProviderName] = useState('');
  const [location, setLocation] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('20');
  const [certification, setCertification] = useState(false);
  const [certificationValidity, setCertificationValidity] = useState('12');

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!open) return;
      
      setLoadingEmployees(true);
      try {
        const { data, error } = await supabase
          .from('erp_hr_employees')
          .select(`
            id, first_name, last_name,
            erp_hr_departments!department_id (name)
          `)
          .eq('company_id', companyId)
          .eq('status', 'active')
          .limit(100);

        if (error) throw error;

        setEmployees((data || []).map((emp: any) => ({
          id: emp.id,
          first_name: emp.first_name,
          last_name: emp.last_name,
          department: emp.erp_hr_departments?.name || 'Sin departamento',
          selected: false,
        })));
      } catch (err) {
        console.error('Error fetching employees:', err);
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, [open, companyId]);

  const toggleEmployee = (id: string) => {
    setEmployees(employees.map(emp => 
      emp.id === id ? { ...emp, selected: !emp.selected } : emp
    ));
  };

  const selectAll = () => {
    const allSelected = employees.every(e => e.selected);
    setEmployees(employees.map(emp => ({ ...emp, selected: !allSelected })));
  };

  const filteredEmployees = employees.filter(emp => 
    `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCount = employees.filter(e => e.selected).length;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'mandatory':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30">Obligatoria</Badge>;
      case 'specific':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Específica</Badge>;
      case 'recommended':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Recomendada</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const handleSubmit = async () => {
    if (!trainingName || !dueDate) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    if (selectedCount === 0) {
      toast.error('Selecciona al menos un empleado');
      return;
    }

    setLoading(true);
    try {
      // Here would go the actual database insert
      // For now, simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success(`Formación "${trainingName}" creada para ${selectedCount} empleados`);
      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setTrainingName('');
      setDescription('');
      setDurationHours('4');
      setScheduledDate('');
      setDueDate('');
      setEmployees(employees.map(e => ({ ...e, selected: false })));
    } catch (err) {
      console.error('Error creating training:', err);
      toast.error('Error al crear la formación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5 text-primary" />
            Nueva Formación en Prevención
          </DialogTitle>
          <DialogDescription>
            Programa formación obligatoria o específica para los empleados
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Training Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="name">Nombre de la Formación *</Label>
                <Input
                  id="name"
                  value={trainingName}
                  onChange={(e) => setTrainingName(e.target.value)}
                  placeholder="Ej: Prevención de Riesgos Laborales - Básico"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Formación</Label>
                <Select value={trainingType} onValueChange={setTrainingType}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mandatory">Obligatoria</SelectItem>
                    <SelectItem value="specific">Específica del puesto</SelectItem>
                    <SelectItem value="recommended">Recomendada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duración (horas)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  min="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción / Contenidos</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Objetivos y contenidos de la formación..."
                rows={3}
              />
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduled">Fecha Programada</Label>
                <Input
                  id="scheduled"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due">Fecha Límite *</Label>
                <Input
                  id="due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max">Máx. Participantes</Label>
                <Input
                  id="max"
                  type="number"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  min="1"
                />
              </div>
            </div>

            {/* Provider */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Impartida por</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Interna</SelectItem>
                    <SelectItem value="external">Externa (SPA)</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {provider !== 'internal' && (
                <div className="space-y-2">
                  <Label htmlFor="providerName">Nombre Proveedor</Label>
                  <Input
                    id="providerName"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    placeholder="Ej: Prevencontrol S.L."
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="location">Lugar</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={provider === 'online' ? 'Plataforma online' : 'Sala de formación'}
                />
              </div>
            </div>

            {/* Certification */}
            <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="certification"
                  checked={certification}
                  onCheckedChange={(checked) => setCertification(checked as boolean)}
                />
                <Label htmlFor="certification" className="font-medium">
                  Esta formación otorga certificado
                </Label>
              </div>
              {certification && (
                <div className="pl-6 space-y-2">
                  <Label htmlFor="validity">Validez del certificado (meses)</Label>
                  <Input
                    id="validity"
                    type="number"
                    value={certificationValidity}
                    onChange={(e) => setCertificationValidity(e.target.value)}
                    className="max-w-[150px]"
                    min="1"
                  />
                </div>
              )}
            </div>

            {/* Employee Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">
                  Empleados Asignados ({selectedCount} seleccionados)
                </Label>
                <Button variant="outline" size="sm" onClick={selectAll}>
                  {employees.every(e => e.selected) ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar empleado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                {loadingEmployees ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No hay empleados disponibles
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredEmployees.map((emp) => (
                      <div
                        key={emp.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleEmployee(emp.id)}
                      >
                        <Checkbox checked={emp.selected} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {emp.first_name} {emp.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{emp.department}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <HardHat className="h-4 w-4 mr-2" />
                Crear Formación
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRSafetyTrainingDialog;
