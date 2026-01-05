/**
 * FleetManager - Gestor completo de flota de vehículos
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Truck, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  Wrench,
  Route,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { useERPLogistics } from '@/hooks/erp/useERPLogistics';
import { useERPContext } from '@/hooks/erp/useERPContext';
import { VehicleForm } from './VehicleForm';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Vehicle {
  id: string;
  company_id: string;
  vehicle_code: string;
  license_plate: string;
  vehicle_type: 'van' | 'truck' | 'motorcycle' | 'bicycle' | 'car';
  brand?: string;
  model?: string;
  driver_name?: string;
  driver_phone?: string;
  status: 'available' | 'in_route' | 'maintenance' | 'inactive';
  max_weight?: number;
  max_volume?: number;
  itv_expiry?: string;
  insurance_expiry?: string;
  is_active: boolean;
}

export function FleetManager() {
  const { currentCompany } = useERPContext();
  const { fetchVehicles, isLoading } = useERPLogistics();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const loadVehicles = useCallback(async () => {
    if (!currentCompany?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('erp_logistics_vehicles')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('vehicle_code');

      if (error) throw error;
      setVehicles((data || []) as Vehicle[]);
    } catch (err) {
      console.error('Error loading vehicles:', err);
    }
  }, [currentCompany?.id]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const vehicleTypeLabels: Record<string, string> = {
    van: 'Furgoneta',
    truck: 'Camión',
    motorcycle: 'Moto',
    bicycle: 'Bicicleta',
    car: 'Coche'
  };

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    available: { label: 'Disponible', color: 'bg-green-500/20 text-green-600', icon: CheckCircle },
    in_route: { label: 'En ruta', color: 'bg-blue-500/20 text-blue-600', icon: Route },
    maintenance: { label: 'Mantenimiento', color: 'bg-amber-500/20 text-amber-600', icon: Wrench },
    inactive: { label: 'Inactivo', color: 'bg-gray-500/20 text-gray-600', icon: Truck }
  };

  const getDocumentAlert = (vehicle: Vehicle) => {
    const alerts: string[] = [];
    const today = new Date();
    
    if (vehicle.itv_expiry) {
      const itvDate = new Date(vehicle.itv_expiry);
      const daysUntilItv = differenceInDays(itvDate, today);
      if (daysUntilItv < 0) alerts.push('ITV caducada');
      else if (daysUntilItv <= 30) alerts.push(`ITV en ${daysUntilItv} días`);
    }
    
    if (vehicle.insurance_expiry) {
      const insuranceDate = new Date(vehicle.insurance_expiry);
      const daysUntilInsurance = differenceInDays(insuranceDate, today);
      if (daysUntilInsurance < 0) alerts.push('Seguro caducado');
      else if (daysUntilInsurance <= 30) alerts.push(`Seguro en ${daysUntilInsurance} días`);
    }
    
    return alerts;
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setIsFormOpen(true);
  };

  const handleDelete = async (vehicleId: string) => {
    if (!confirm('¿Eliminar este vehículo?')) return;

    try {
      const { error } = await supabase
        .from('erp_logistics_vehicles')
        .update({ is_active: false })
        .eq('id', vehicleId);

      if (error) throw error;
      toast.success('Vehículo eliminado');
      loadVehicles();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const filteredVehicles = vehicles.filter(v => 
    v.is_active &&
    (v.license_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     v.vehicle_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     v.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const stats = {
    total: filteredVehicles.length,
    available: filteredVehicles.filter(v => v.status === 'available').length,
    inRoute: filteredVehicles.filter(v => v.status === 'in_route').length,
    maintenance: filteredVehicles.filter(v => v.status === 'maintenance').length,
    withAlerts: filteredVehicles.filter(v => getDocumentAlert(v).length > 0).length
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.available}</p>
                <p className="text-xs text-muted-foreground">Disponibles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Route className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inRoute}</p>
                <p className="text-xs text-muted-foreground">En ruta</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Wrench className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.maintenance}</p>
                <p className="text-xs text-muted-foreground">Mant.</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withAlerts}</p>
                <p className="text-xs text-muted-foreground">Alertas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Flota de Vehículos</CardTitle>
              <CardDescription>Gestiona los vehículos de reparto propios</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadVehicles}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Actualizar
              </Button>
              <Button size="sm" onClick={() => { setEditingVehicle(null); setIsFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" />
                Nuevo Vehículo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por matrícula, código o conductor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {filteredVehicles.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h4 className="font-medium mb-2">Sin vehículos</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Añade vehículos a tu flota para gestionar rutas propias
              </p>
              <Button size="sm" onClick={() => { setEditingVehicle(null); setIsFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" />
                Añadir Vehículo
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Conductor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Capacidad</TableHead>
                  <TableHead>Documentación</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.map((vehicle) => {
                  const status = statusConfig[vehicle.status] || statusConfig.inactive;
                  const StatusIcon = status.icon;
                  const alerts = getDocumentAlert(vehicle);

                  return (
                    <TableRow key={vehicle.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{vehicle.license_plate}</p>
                          <p className="text-xs text-muted-foreground">{vehicle.vehicle_code}</p>
                          {vehicle.brand && (
                            <p className="text-xs text-muted-foreground">
                              {vehicle.brand} {vehicle.model}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {vehicleTypeLabels[vehicle.vehicle_type] || vehicle.vehicle_type}
                      </TableCell>
                      <TableCell>
                        {vehicle.driver_name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("gap-1", status.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {vehicle.max_weight ? `${vehicle.max_weight} kg` : '-'}
                        {vehicle.max_volume ? ` / ${vehicle.max_volume} m³` : ''}
                      </TableCell>
                      <TableCell>
                        {alerts.length > 0 ? (
                          <div className="space-y-1">
                            {alerts.map((alert, i) => (
                              <Badge key={i} variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {alert}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            OK
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEdit(vehicle)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDelete(vehicle.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <VehicleForm
        vehicle={editingVehicle}
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingVehicle(null); }}
        onSuccess={loadVehicles}
      />
    </div>
  );
}

export default FleetManager;
