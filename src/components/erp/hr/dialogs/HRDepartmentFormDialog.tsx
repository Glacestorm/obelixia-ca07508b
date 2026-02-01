/**
 * HRDepartmentFormDialog - Crear/Editar departamentos
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { HREmployeeSearchSelect } from '../shared/HREmployeeSearchSelect';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';

interface HRDepartmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  parentDepartments?: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

const LOCATIONS = [
  { value: 'sede_central', label: 'Sede Central' },
  { value: 'nave_industrial', label: 'Nave Industrial' },
  { value: 'nave_1', label: 'Nave 1' },
  { value: 'nave_2', label: 'Nave 2' },
  { value: 'nave_3', label: 'Nave 3' },
  { value: 'oficina_comercial', label: 'Oficina Comercial' },
  { value: 'almacen', label: 'Almacén' },
  { value: 'otro', label: 'Otro' },
];

export function HRDepartmentFormDialog({
  open,
  onOpenChange,
  companyId,
  parentDepartments = [],
  onSuccess
}: HRDepartmentFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    parentId: '',
    managerId: '',
    location: '',
    budget: '',
    costCenter: '',
    description: ''
  });

  const handleSubmit = async () => {
    if (!form.name || !form.code) {
      toast.error('Nombre y código son obligatorios');
      return;
    }

    setLoading(true);
    try {
      // Simular guardado - aquí iría la lógica real con supabase
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success('Departamento creado correctamente');
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setForm({
        name: '',
        code: '',
        parentId: '',
        managerId: '',
        location: '',
        budget: '',
        costCenter: '',
        description: ''
      });
    } catch (error) {
      console.error('Error creating department:', error);
      toast.error('Error al crear el departamento');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generar código basado en nombre
  const handleNameChange = (name: string) => {
    const code = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
    setForm({ ...form, name, code });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Nuevo Departamento
          </DialogTitle>
          <DialogDescription>
            Crea un nuevo departamento o unidad organizativa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ej: Recursos Humanos"
              />
            </div>
            <div className="space-y-2">
              <Label>Código *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="RRHH"
                maxLength={10}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Departamento Superior (opcional)</Label>
            <Select value={form.parentId} onValueChange={(v) => setForm({ ...form, parentId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Sin departamento superior" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin departamento superior</SelectItem>
                {parentDepartments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Responsable / Manager</Label>
            <HREmployeeSearchSelect
              companyId={companyId}
              value={form.managerId}
              onValueChange={(id) => setForm({ ...form, managerId: id })}
              placeholder="Buscar responsable..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ubicación</Label>
              <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar ubicación" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map(loc => (
                    <SelectItem key={loc.value} value={loc.value}>
                      {loc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Centro de Coste</Label>
              <Input
                value={form.costCenter}
                onChange={(e) => setForm({ ...form, costCenter: e.target.value })}
                placeholder="CC-001"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Presupuesto Anual (€)</Label>
            <Input
              type="number"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
              placeholder="100000"
            />
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Funciones y responsabilidades del departamento..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creando...' : 'Crear Departamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRDepartmentFormDialog;
