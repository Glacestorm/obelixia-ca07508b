/**
 * VehicleForm - Formulario para crear/editar vehículos
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Truck, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useERPContext } from '@/hooks/erp/useERPContext';

interface Vehicle {
  id?: string;
  vehicle_code: string;
  license_plate: string;
  vehicle_type: 'van' | 'truck' | 'motorcycle' | 'bicycle' | 'car';
  brand?: string;
  model?: string;
  year?: number;
  driver_name?: string;
  driver_phone?: string;
  status: 'available' | 'in_route' | 'maintenance' | 'inactive';
  max_weight?: number;
  max_volume?: number;
  fuel_type?: string;
  itv_expiry?: string;
  insurance_expiry?: string;
  is_active: boolean;
}

interface VehicleFormProps {
  vehicle?: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function VehicleForm({ vehicle, isOpen, onClose, onSuccess }: VehicleFormProps) {
  const { currentCompany } = useERPContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<Partial<Vehicle>>({
    vehicle_code: '',
    license_plate: '',
    vehicle_type: 'van',
    brand: '',
    model: '',
    driver_name: '',
    status: 'available',
    max_weight: 0,
    max_volume: 0,
    is_active: true
  });

  useEffect(() => {
    if (vehicle) {
      setForm({ ...vehicle });
    } else {
      setForm({
        vehicle_code: `VEH-${Date.now().toString().slice(-6)}`,
        license_plate: '',
        vehicle_type: 'van',
        brand: '',
        model: '',
        driver_name: '',
        status: 'available',
        max_weight: 500,
        max_volume: 5,
        is_active: true
      });
    }
  }, [vehicle, isOpen]);

  const vehicleTypes = [
    { value: 'van', label: 'Furgoneta' },
    { value: 'truck', label: 'Camión' },
    { value: 'motorcycle', label: 'Moto' },
    { value: 'bicycle', label: 'Bicicleta' },
    { value: 'car', label: 'Coche' }
  ];

  const statusOptions = [
    { value: 'available', label: 'Disponible' },
    { value: 'in_route', label: 'En ruta' },
    { value: 'maintenance', label: 'Mantenimiento' },
    { value: 'inactive', label: 'Inactivo' }
  ];

  const handleSubmit = async () => {
    if (!currentCompany?.id || !form.license_plate) {
      toast.error('Complete los campos requeridos');
      return;
    }

    setIsSubmitting(true);
    try {
      if (vehicle?.id) {
        const { error } = await supabase
          .from('erp_logistics_vehicles')
          .update({
            vehicle_code: form.vehicle_code,
            license_plate: form.license_plate,
            vehicle_type: form.vehicle_type,
            brand: form.brand,
            model: form.model,
            driver_name: form.driver_name,
            driver_phone: form.driver_phone,
            status: form.status,
            max_weight: form.max_weight,
            max_volume: form.max_volume,
            itv_expiry: form.itv_expiry,
            insurance_expiry: form.insurance_expiry,
            is_active: form.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', vehicle.id);

        if (error) throw error;
        toast.success('Vehículo actualizado');
      } else {
        const { error } = await supabase
          .from('erp_logistics_vehicles')
          .insert([{
            company_id: currentCompany.id,
            vehicle_code: form.vehicle_code || `VEH-${Date.now().toString().slice(-6)}`,
            license_plate: form.license_plate || '',
            vehicle_type: form.vehicle_type || 'van',
            brand: form.brand,
            model: form.model,
            driver_name: form.driver_name,
            driver_phone: form.driver_phone,
            status: form.status || 'available',
            max_weight: form.max_weight,
            max_volume: form.max_volume,
            itv_expiry: form.itv_expiry,
            insurance_expiry: form.insurance_expiry,
            is_active: form.is_active !== false
          }]);

        if (error) throw error;
        toast.success('Vehículo creado');
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving vehicle:', err);
      toast.error('Error al guardar vehículo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {vehicle ? 'Editar Vehículo' : 'Nuevo Vehículo'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                value={form.vehicle_code || ''}
                onChange={(e) => setForm({ ...form, vehicle_code: e.target.value })}
                placeholder="VEH-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Matrícula *</Label>
              <Input
                value={form.license_plate || ''}
                onChange={(e) => setForm({ ...form, license_plate: e.target.value.toUpperCase() })}
                placeholder="1234ABC"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.vehicle_type}
                onValueChange={(v) => setForm({ ...form, vehicle_type: v as Vehicle['vehicle_type'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as Vehicle['status'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input
                value={form.brand || ''}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="Ford, Mercedes..."
              />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input
                value={form.model || ''}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="Transit, Sprinter..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Conductor</Label>
              <Input
                value={form.driver_name || ''}
                onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
                placeholder="Nombre del conductor"
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono conductor</Label>
              <Input
                value={form.driver_phone || ''}
                onChange={(e) => setForm({ ...form, driver_phone: e.target.value })}
                placeholder="+34 600 000 000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Peso máximo (kg)</Label>
              <Input
                type="number"
                value={form.max_weight || 0}
                onChange={(e) => setForm({ ...form, max_weight: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Volumen máximo (m³)</Label>
              <Input
                type="number"
                value={form.max_volume || 0}
                onChange={(e) => setForm({ ...form, max_volume: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Vto. ITV
              </Label>
              <Input
                type="date"
                value={form.itv_expiry ? form.itv_expiry.split('T')[0] : ''}
                onChange={(e) => setForm({ ...form, itv_expiry: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Vto. Seguro
              </Label>
              <Input
                type="date"
                value={form.insurance_expiry ? form.insurance_expiry.split('T')[0] : ''}
                onChange={(e) => setForm({ ...form, insurance_expiry: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => setForm({ ...form, is_active: v })}
            />
            <Label>Vehículo activo</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {vehicle ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default VehicleForm;
