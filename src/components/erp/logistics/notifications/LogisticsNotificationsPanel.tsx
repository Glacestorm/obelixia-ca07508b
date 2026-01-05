/**
 * Logistics Notifications Panel
 * Real-time alerts for shipments, fleet, and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Bell,
  AlertTriangle,
  Package,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  Filter,
  Trash2,
  Eye,
  FileWarning,
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow, addDays, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface LogisticsAlert {
  id: string;
  type: 'shipment_delay' | 'document_expiry' | 'delivery_failed' | 'route_deviation' | 'vehicle_maintenance' | 'carrier_issue';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  is_read: boolean;
  is_resolved: boolean;
  metadata?: Record<string, unknown>;
}

interface NotificationSettings {
  shipment_delays: boolean;
  document_expiry: boolean;
  delivery_failures: boolean;
  route_deviations: boolean;
  vehicle_maintenance: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
}

export function LogisticsNotificationsPanel() {
  const [alerts, setAlerts] = useState<LogisticsAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    shipment_delays: true,
    document_expiry: true,
    delivery_failures: true,
    route_deviations: true,
    vehicle_maintenance: true,
    email_notifications: false,
    push_notifications: true
  });

  // Generate alerts from current data
  const generateAlerts = useCallback(async () => {
    setLoading(true);
    const generatedAlerts: LogisticsAlert[] = [];

    try {
      // Check delayed shipments
      const { data: delayedShipments } = await supabase
        .from('erp_logistics_shipments')
        .select('*')
        .in('status', ['pending', 'in_transit'])
        .lt('estimated_delivery_date', new Date().toISOString());

      delayedShipments?.forEach(shipment => {
        generatedAlerts.push({
          id: `delay-${shipment.id}`,
          type: 'shipment_delay',
          severity: 'warning',
          title: 'Envío retrasado',
          message: `El envío ${shipment.tracking_number} debería haber sido entregado`,
          entity_type: 'shipment',
          entity_id: shipment.id,
          created_at: new Date().toISOString(),
          is_read: false,
          is_resolved: false,
          metadata: { tracking_number: shipment.tracking_number }
        });
      });

      // Check failed deliveries
      const { data: failedShipments } = await supabase
        .from('erp_logistics_shipments')
        .select('*')
        .eq('status', 'failed')
        .gte('updated_at', addDays(new Date(), -7).toISOString());

      failedShipments?.forEach(shipment => {
        generatedAlerts.push({
          id: `failed-${shipment.id}`,
          type: 'delivery_failed',
          severity: 'critical',
          title: 'Entrega fallida',
          message: `La entrega del envío ${shipment.tracking_number} ha fallado`,
          entity_type: 'shipment',
          entity_id: shipment.id,
          created_at: shipment.updated_at || new Date().toISOString(),
          is_read: false,
          is_resolved: false,
          metadata: { tracking_number: shipment.tracking_number }
        });
      });

      // Check vehicle documents expiring soon
      const thirtyDaysFromNow = addDays(new Date(), 30);
      const { data: vehicles } = await supabase
        .from('erp_logistics_vehicles')
        .select('*')
        .eq('status', 'available');

      vehicles?.forEach(vehicle => {
        if (vehicle.itv_expiry && isBefore(new Date(vehicle.itv_expiry), thirtyDaysFromNow)) {
          generatedAlerts.push({
            id: `itv-${vehicle.id}`,
            type: 'document_expiry',
            severity: isBefore(new Date(vehicle.itv_expiry), new Date()) ? 'critical' : 'warning',
            title: 'ITV próxima a vencer',
            message: `La ITV del vehículo ${vehicle.license_plate} vence pronto`,
            entity_type: 'vehicle',
            entity_id: vehicle.id,
            created_at: new Date().toISOString(),
            is_read: false,
            is_resolved: false,
            metadata: { license_plate: vehicle.license_plate, expiry_date: vehicle.itv_expiry }
          });
        }

        if (vehicle.insurance_expiry && isBefore(new Date(vehicle.insurance_expiry), thirtyDaysFromNow)) {
          generatedAlerts.push({
            id: `insurance-${vehicle.id}`,
            type: 'document_expiry',
            severity: isBefore(new Date(vehicle.insurance_expiry), new Date()) ? 'critical' : 'warning',
            title: 'Seguro próximo a vencer',
            message: `El seguro del vehículo ${vehicle.license_plate} vence pronto`,
            entity_type: 'vehicle',
            entity_id: vehicle.id,
            created_at: new Date().toISOString(),
            is_read: false,
            is_resolved: false,
          metadata: { license_plate: vehicle.license_plate, expiry_date: vehicle.insurance_expiry }
          });
        }
      });

      // Check inactive carriers
      const { data: carriers } = await supabase
        .from('erp_logistics_carriers')
        .select('*')
        .eq('is_active', false);

      carriers?.forEach(carrier => {
        generatedAlerts.push({
          id: `carrier-${carrier.id}`,
          type: 'carrier_issue',
          severity: 'info',
          title: 'Transportista inactivo',
          message: `El transportista ${carrier.carrier_name} está marcado como inactivo`,
          entity_type: 'carrier',
          entity_id: carrier.id,
          created_at: new Date().toISOString(),
          is_read: false,
          is_resolved: false,
          metadata: { carrier_name: carrier.carrier_name }
        });
      });

      // Sort by severity and date
      generatedAlerts.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setAlerts(generatedAlerts);
    } catch (error) {
      console.error('Error generating alerts:', error);
      toast.error('Error al cargar alertas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    generateAlerts();
  }, [generateAlerts]);

  const markAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, is_read: true } : a
    ));
  };

  const markAsResolved = (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, is_resolved: true, is_read: true } : a
    ));
    toast.success('Alerta marcada como resuelta');
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const getAlertIcon = (type: LogisticsAlert['type']) => {
    switch (type) {
      case 'shipment_delay': return <Clock className="h-4 w-4" />;
      case 'document_expiry': return <FileWarning className="h-4 w-4" />;
      case 'delivery_failed': return <XCircle className="h-4 w-4" />;
      case 'route_deviation': return <MapPin className="h-4 w-4" />;
      case 'vehicle_maintenance': return <Truck className="h-4 w-4" />;
      case 'carrier_issue': return <AlertTriangle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: LogisticsAlert['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'warning': return 'bg-yellow-500 text-white';
      case 'info': return 'bg-blue-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (activeTab === 'all') return !alert.is_resolved;
    if (activeTab === 'critical') return alert.severity === 'critical' && !alert.is_resolved;
    if (activeTab === 'unread') return !alert.is_read && !alert.is_resolved;
    if (activeTab === 'resolved') return alert.is_resolved;
    return true;
  });

  const unreadCount = alerts.filter(a => !a.is_read && !a.is_resolved).length;
  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.is_resolved).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Centro de Alertas</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} nuevas
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generateAlerts}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
              Actualizar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">{alerts.filter(a => !a.is_resolved).length}</div>
            <div className="text-xs text-muted-foreground">Activas</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-destructive/10">
            <div className="text-2xl font-bold text-destructive">{criticalCount}</div>
            <div className="text-xs text-muted-foreground">Críticas</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-yellow-500/10">
            <div className="text-2xl font-bold text-yellow-600">
              {alerts.filter(a => a.severity === 'warning' && !a.is_resolved).length}
            </div>
            <div className="text-xs text-muted-foreground">Advertencias</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-green-500/10">
            <div className="text-2xl font-bold text-green-600">
              {alerts.filter(a => a.is_resolved).length}
            </div>
            <div className="text-xs text-muted-foreground">Resueltas</div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <Card className="border-dashed">
            <CardContent className="pt-4 space-y-3">
              <h4 className="font-medium text-sm">Configuración de Notificaciones</h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(settings).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={key} className="text-xs capitalize">
                      {key.replace(/_/g, ' ')}
                    </Label>
                    <Switch
                      id={key}
                      checked={value}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, [key]: checked }))
                      }
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="text-xs">
              Todas
            </TabsTrigger>
            <TabsTrigger value="critical" className="text-xs">
              Críticas
              {criticalCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-[10px]">
                  {criticalCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              Sin leer
            </TabsTrigger>
            <TabsTrigger value="resolved" className="text-xs">
              Resueltas
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-3">
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mb-2 text-green-500" />
                  <p className="text-sm">No hay alertas en esta categoría</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAlerts.map(alert => (
                    <div
                      key={alert.id}
                      className={cn(
                        "p-3 rounded-lg border transition-all",
                        !alert.is_read && "bg-accent/30 border-primary/30",
                        alert.is_resolved && "opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1">
                          <div className={cn(
                            "p-1.5 rounded-full",
                            getSeverityColor(alert.severity)
                          )}>
                            {getAlertIcon(alert.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm truncate">
                                {alert.title}
                              </h4>
                              <Badge variant="outline" className="text-[10px]">
                                {alert.type.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {alert.message}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(alert.created_at), {
                                addSuffix: true,
                                locale: es
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!alert.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => markAsRead(alert.id)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {!alert.is_resolved && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => markAsResolved(alert.id)}
                            >
                              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => dismissAlert(alert.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default LogisticsNotificationsPanel;
