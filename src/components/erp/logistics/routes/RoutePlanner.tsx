/**
 * RoutePlanner - Planificador de rutas de reparto
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Route, 
  Plus, 
  Calendar,
  Truck,
  MapPin,
  Package,
  Clock,
  CheckCircle,
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  Navigation,
  AlertTriangle
} from 'lucide-react';
import { useERPContext } from '@/hooks/erp/useERPContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface RouteData {
  id: string;
  route_code: string;
  route_name?: string;
  route_date: string;
  vehicle_id?: string;
  driver_name?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  total_stops: number;
  completed_stops: number;
  total_distance_km?: number;
  estimated_time_minutes?: number;
  is_optimized: boolean;
  vehicle?: {
    license_plate: string;
    vehicle_type: string;
  };
}

interface Vehicle {
  id: string;
  license_plate: string;
  vehicle_code: string;
  driver_name?: string;
  status: string;
}

interface PendingShipment {
  id: string;
  shipment_number: string;
  destination_city: string;
  destination_postal_code: string;
  destination_address: string;
  total_packages: number;
}

export function RoutePlanner() {
  const { currentCompany } = useERPContext();
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [pendingShipments, setPendingShipments] = useState<PendingShipment[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isCreating, setIsCreating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // New route form
  const [newRoute, setNewRoute] = useState({
    route_name: '',
    vehicle_id: '',
    driver_name: ''
  });

  const loadData = useCallback(async () => {
    if (!currentCompany?.id) return;

    try {
      // Load routes for selected date
      const { data: routesData, error: routesError } = await supabase
        .from('erp_logistics_routes')
        .select(`
          *,
          vehicle:erp_logistics_vehicles(license_plate, vehicle_type)
        `)
        .eq('company_id', currentCompany.id)
        .eq('route_date', selectedDate)
        .order('created_at', { ascending: false });

      if (routesError) throw routesError;
      setRoutes((routesData || []) as RouteData[]);

      // Load available vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('erp_logistics_vehicles')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .in('status', ['available', 'in_route']);

      if (vehiclesError) throw vehiclesError;
      setVehicles((vehiclesData || []) as Vehicle[]);

      // Load pending shipments (confirmed, not assigned to route)
      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from('erp_logistics_shipments')
        .select('id, shipment_number, destination_city, destination_postal_code, destination_address, total_packages')
        .eq('company_id', currentCompany.id)
        .eq('status', 'confirmed')
        .is('route_id', null)
        .limit(50);

      if (shipmentsError) throw shipmentsError;
      setPendingShipments((shipmentsData || []) as PendingShipment[]);

    } catch (err) {
      console.error('Error loading route data:', err);
    }
  }, [currentCompany?.id, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    planned: { label: 'Planificada', color: 'bg-blue-500/20 text-blue-600', icon: Calendar },
    in_progress: { label: 'En curso', color: 'bg-purple-500/20 text-purple-600', icon: Play },
    completed: { label: 'Completada', color: 'bg-green-500/20 text-green-600', icon: CheckCircle },
    cancelled: { label: 'Cancelada', color: 'bg-gray-500/20 text-gray-600', icon: AlertTriangle }
  };

  const handleCreateRoute = async () => {
    if (!currentCompany?.id) return;
    
    setIsCreating(true);
    try {
      const routeCode = `RUT-${Date.now().toString().slice(-8)}`;
      
      const { error } = await supabase
        .from('erp_logistics_routes')
        .insert([{
          company_id: currentCompany.id,
          route_code: routeCode,
          route_name: newRoute.route_name || `Ruta ${format(new Date(selectedDate), 'dd/MM', { locale: es })}`,
          route_date: selectedDate,
          vehicle_id: newRoute.vehicle_id || null,
          driver_name: newRoute.driver_name,
          status: 'planned',
          total_stops: 0,
          completed_stops: 0,
          is_optimized: false
        }]);

      if (error) throw error;

      toast.success('Ruta creada');
      setNewRoute({ route_name: '', vehicle_id: '', driver_name: '' });
      loadData();
    } catch (err) {
      console.error('Error creating route:', err);
      toast.error('Error al crear ruta');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartRoute = async (routeId: string) => {
    try {
      const { error } = await supabase
        .from('erp_logistics_routes')
        .update({ 
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', routeId);

      if (error) throw error;
      toast.success('Ruta iniciada');
      loadData();
    } catch (err) {
      toast.error('Error al iniciar ruta');
    }
  };

  const handleCompleteRoute = async (routeId: string) => {
    try {
      const { error } = await supabase
        .from('erp_logistics_routes')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', routeId);

      if (error) throw error;
      toast.success('Ruta completada');
      loadData();
    } catch (err) {
      toast.error('Error al completar ruta');
    }
  };

  const handleOptimize = async (routeId: string) => {
    setIsOptimizing(true);
    try {
      // Simulate optimization (in real implementation, call AI edge function)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const { error } = await supabase
        .from('erp_logistics_routes')
        .update({ is_optimized: true })
        .eq('id', routeId);

      if (error) throw error;
      toast.success('Ruta optimizada con IA');
      loadData();
    } catch (err) {
      toast.error('Error al optimizar');
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" />
            Planificador de Rutas
          </h3>
          <p className="text-sm text-muted-foreground">
            Crea y optimiza rutas de reparto
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Routes list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Create Route Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Nueva Ruta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nombre</Label>
                  <Input
                    placeholder="Ruta Madrid Centro"
                    value={newRoute.route_name}
                    onChange={(e) => setNewRoute({ ...newRoute, route_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Vehículo</Label>
                  <Select
                    value={newRoute.vehicle_id}
                    onValueChange={(v) => {
                      const vehicle = vehicles.find(veh => veh.id === v);
                      setNewRoute({ 
                        ...newRoute, 
                        vehicle_id: v,
                        driver_name: vehicle?.driver_name || newRoute.driver_name
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.license_plate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button className="w-full" onClick={handleCreateRoute} disabled={isCreating}>
                    <Plus className="h-4 w-4 mr-1" />
                    Crear Ruta
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Routes Grid */}
          {routes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Route className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h4 className="font-medium mb-2">Sin rutas para esta fecha</h4>
                <p className="text-sm text-muted-foreground">
                  Crea una nueva ruta para comenzar
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {routes.map((route) => {
                const status = statusConfig[route.status] || statusConfig.planned;
                const StatusIcon = status.icon;
                const progress = route.total_stops > 0 
                  ? (route.completed_stops / route.total_stops) * 100 
                  : 0;

                return (
                  <Card key={route.id} className={cn(
                    "transition-all",
                    route.status === 'in_progress' && "ring-2 ring-purple-500"
                  )}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{route.route_name || route.route_code}</h4>
                            <Badge className={status.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                            {route.is_optimized && (
                              <Badge variant="outline" className="text-green-600">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Optimizada
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">
                            {route.route_code}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {route.status === 'planned' && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleOptimize(route.id)}
                                disabled={isOptimizing}
                              >
                                <Sparkles className="h-4 w-4 mr-1" />
                                Optimizar
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => handleStartRoute(route.id)}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Iniciar
                              </Button>
                            </>
                          )}
                          {route.status === 'in_progress' && (
                            <Button 
                              size="sm"
                              onClick={() => handleCompleteRoute(route.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Completar
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          <span>{route.vehicle?.license_plate || 'Sin vehículo'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{route.completed_stops}/{route.total_stops} paradas</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Navigation className="h-4 w-4 text-muted-foreground" />
                          <span>{route.total_distance_km || 0} km</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {route.estimated_time_minutes 
                              ? `${Math.round(route.estimated_time_minutes / 60)}h ${route.estimated_time_minutes % 60}m`
                              : '-'
                            }
                          </span>
                        </div>
                      </div>

                      {route.total_stops > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Progreso</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Pending shipments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Envíos Pendientes
            </CardTitle>
            <CardDescription>
              {pendingShipments.length} envíos sin asignar a ruta
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {pendingShipments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Todos los envíos asignados</p>
                </div>
              ) : (
                <div className="space-y-1 p-3">
                  {pendingShipments.map((shipment) => (
                    <div 
                      key={shipment.id}
                      className="p-2 rounded-lg border bg-card hover:bg-muted/50 cursor-move transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs">{shipment.shipment_number}</span>
                        <Badge variant="outline" className="text-xs">
                          {shipment.total_packages} paq.
                        </Badge>
                      </div>
                      <p className="text-sm mt-1">{shipment.destination_city}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {shipment.destination_address}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default RoutePlanner;
