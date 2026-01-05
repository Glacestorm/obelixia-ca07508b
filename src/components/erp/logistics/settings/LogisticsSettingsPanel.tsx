/**
 * ERP Logistics Module - Settings Panel
 * Configuración global del módulo de logística
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Settings,
  Save,
  RefreshCw,
  Package,
  Truck,
  Building2,
  Calculator,
  Bell,
  Globe,
  Clock,
  AlertTriangle,
  CheckCircle,
  Shield,
  Zap,
  FileText,
  MapPin,
  Euro,
  Loader2,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useERPContext } from '@/hooks/erp/useERPContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LogisticsSettings {
  // General
  default_carrier_id: string | null;
  auto_assign_carrier: boolean;
  default_shipment_priority: 'low' | 'normal' | 'high' | 'urgent';
  
  // Tracking
  auto_tracking_sync: boolean;
  tracking_sync_interval_minutes: number;
  notify_on_status_change: boolean;
  
  // Notifications
  notify_delays: boolean;
  delay_threshold_hours: number;
  notify_deliveries: boolean;
  notify_failures: boolean;
  notification_email: string;
  
  // Accounting
  auto_accounting: boolean;
  default_debit_account: string;
  default_credit_account: string;
  
  // Fleet
  enable_fleet_module: boolean;
  fleet_maintenance_alerts: boolean;
  maintenance_km_threshold: number;
  document_expiry_alert_days: number;
  
  // Integrations
  enable_api_integrations: boolean;
  webhook_url: string;
  
  // Advanced
  max_shipments_per_route: number;
  default_route_optimization: 'distance' | 'time' | 'cost';
  enable_proof_of_delivery: boolean;
}

const DEFAULT_SETTINGS: LogisticsSettings = {
  default_carrier_id: null,
  auto_assign_carrier: false,
  default_shipment_priority: 'normal',
  
  auto_tracking_sync: true,
  tracking_sync_interval_minutes: 30,
  notify_on_status_change: true,
  
  notify_delays: true,
  delay_threshold_hours: 24,
  notify_deliveries: true,
  notify_failures: true,
  notification_email: '',
  
  auto_accounting: true,
  default_debit_account: '6240',
  default_credit_account: '4100',
  
  enable_fleet_module: true,
  fleet_maintenance_alerts: true,
  maintenance_km_threshold: 10000,
  document_expiry_alert_days: 30,
  
  enable_api_integrations: false,
  webhook_url: '',
  
  max_shipments_per_route: 50,
  default_route_optimization: 'distance',
  enable_proof_of_delivery: true,
};

export function LogisticsSettingsPanel() {
  const { currentCompany } = useERPContext();
  const [settings, setSettings] = useState<LogisticsSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [carriers, setCarriers] = useState<Array<{ id: string; carrier_name: string }>>([]);
  const [activeTab, setActiveTab] = useState('general');

  // Load settings
  const loadSettings = useCallback(async () => {
    if (!currentCompany?.id) return;
    
    setIsLoading(true);
    try {
      // Load carriers for dropdown
      const { data: carriersData } = await supabase
        .from('erp_logistics_carriers')
        .select('id, carrier_name')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('carrier_name');
      
      setCarriers(carriersData || []);

      // For now, we'll use localStorage for settings
      // In production, this would be a dedicated settings table
      const savedSettings = localStorage.getItem(`logistics_settings_${currentCompany.id}`);
      if (savedSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany?.id]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Update setting
  const updateSetting = <K extends keyof LogisticsSettings>(key: K, value: LogisticsSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Save settings
  const saveSettings = async () => {
    if (!currentCompany?.id) return;

    setIsSaving(true);
    try {
      // Save to localStorage (in production, save to database)
      localStorage.setItem(`logistics_settings_${currentCompany.id}`, JSON.stringify(settings));
      
      setHasChanges(false);
      toast.success('Configuración guardada correctamente');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
    toast.info('Configuración restaurada a valores por defecto');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Cargando configuración...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Configuración de Logística
          </h2>
          <p className="text-muted-foreground">
            Personaliza el comportamiento del módulo de logística
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={resetToDefaults} disabled={isSaving}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Restablecer
          </Button>
          <Button onClick={saveSettings} disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Cambios
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-700 dark:text-amber-400">
            Tienes cambios sin guardar
          </span>
        </div>
      )}

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general" className="gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Alertas</span>
          </TabsTrigger>
          <TabsTrigger value="accounting" className="gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Contabilidad</span>
          </TabsTrigger>
          <TabsTrigger value="fleet" className="gap-2">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Flota</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Integraciones</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Avanzado</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuración de Envíos</CardTitle>
              <CardDescription>Opciones generales para la gestión de envíos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Default Carrier */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Operadora por Defecto</Label>
                  <Select 
                    value={settings.default_carrier_id || 'none'} 
                    onValueChange={(v) => updateSetting('default_carrier_id', v === 'none' ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar operadora" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin preferencia</SelectItem>
                      {carriers.map(carrier => (
                        <SelectItem key={carrier.id} value={carrier.id}>
                          {carrier.carrier_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Se preseleccionará al crear nuevos envíos
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Prioridad por Defecto</Label>
                  <Select 
                    value={settings.default_shipment_priority} 
                    onValueChange={(v) => updateSetting('default_shipment_priority', v as LogisticsSettings['default_shipment_priority'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Auto Assign */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Asignación Automática de Operadora</Label>
                  <p className="text-sm text-muted-foreground">
                    Selecciona la mejor operadora según destino y coste
                  </p>
                </div>
                <Switch
                  checked={settings.auto_assign_carrier}
                  onCheckedChange={(v) => updateSetting('auto_assign_carrier', v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tracking Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sincronización de Tracking</CardTitle>
              <CardDescription>Configura la sincronización con operadoras</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sincronización Automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Actualiza estados desde las APIs de operadoras
                  </p>
                </div>
                <Switch
                  checked={settings.auto_tracking_sync}
                  onCheckedChange={(v) => updateSetting('auto_tracking_sync', v)}
                />
              </div>

              {settings.auto_tracking_sync && (
                <div className="space-y-2">
                  <Label>Intervalo de Sincronización (minutos)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={120}
                    value={settings.tracking_sync_interval_minutes}
                    onChange={(e) => updateSetting('tracking_sync_interval_minutes', parseInt(e.target.value) || 30)}
                    className="w-[200px]"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificar Cambios de Estado</Label>
                  <p className="text-sm text-muted-foreground">
                    Envía notificaciones cuando cambia el estado de un envío
                  </p>
                </div>
                <Switch
                  checked={settings.notify_on_status_change}
                  onCheckedChange={(v) => updateSetting('notify_on_status_change', v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alertas y Notificaciones</CardTitle>
              <CardDescription>Configura cuándo recibir alertas del sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alertar Retrasos</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifica cuando un envío supera el tiempo estimado
                  </p>
                </div>
                <Switch
                  checked={settings.notify_delays}
                  onCheckedChange={(v) => updateSetting('notify_delays', v)}
                />
              </div>

              {settings.notify_delays && (
                <div className="space-y-2 ml-4 pl-4 border-l-2 border-muted">
                  <Label>Umbral de Retraso (horas)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={168}
                    value={settings.delay_threshold_hours}
                    onChange={(e) => updateSetting('delay_threshold_hours', parseInt(e.target.value) || 24)}
                    className="w-[200px]"
                  />
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificar Entregas</Label>
                  <p className="text-sm text-muted-foreground">
                    Recibe confirmación cuando se entrega un envío
                  </p>
                </div>
                <Switch
                  checked={settings.notify_deliveries}
                  onCheckedChange={(v) => updateSetting('notify_deliveries', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificar Fallos</Label>
                  <p className="text-sm text-muted-foreground">
                    Alerta inmediata cuando falla una entrega
                  </p>
                </div>
                <Switch
                  checked={settings.notify_failures}
                  onCheckedChange={(v) => updateSetting('notify_failures', v)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Email de Notificaciones</Label>
                <Input
                  type="email"
                  placeholder="alertas@empresa.com"
                  value={settings.notification_email}
                  onChange={(e) => updateSetting('notification_email', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Además de las notificaciones en la app, recibirás emails en esta dirección
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounting Settings */}
        <TabsContent value="accounting" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contabilización Automática</CardTitle>
              <CardDescription>Configura la generación automática de asientos contables</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Contabilización Automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Genera asientos al confirmar envíos
                  </p>
                </div>
                <Switch
                  checked={settings.auto_accounting}
                  onCheckedChange={(v) => updateSetting('auto_accounting', v)}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Cuenta de Gasto (Debe)</Label>
                  <Input
                    value={settings.default_debit_account}
                    onChange={(e) => updateSetting('default_debit_account', e.target.value)}
                    placeholder="6240"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ej: 6240 - Transportes
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Cuenta de Proveedor (Haber)</Label>
                  <Input
                    value={settings.default_credit_account}
                    onChange={(e) => updateSetting('default_credit_account', e.target.value)}
                    placeholder="4100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ej: 4100 - Proveedores
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Cuentas por defecto</p>
                    <p>Estas cuentas se usarán cuando no haya una regla específica configurada para la operadora o tipo de operación.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fleet Settings */}
        <TabsContent value="fleet" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Gestión de Flota</CardTitle>
              <CardDescription>Configuración para vehículos propios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Módulo de Flota</Label>
                  <p className="text-sm text-muted-foreground">
                    Habilita la gestión de vehículos propios
                  </p>
                </div>
                <Switch
                  checked={settings.enable_fleet_module}
                  onCheckedChange={(v) => updateSetting('enable_fleet_module', v)}
                />
              </div>

              {settings.enable_fleet_module && (
                <>
                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Alertas de Mantenimiento</Label>
                      <p className="text-sm text-muted-foreground">
                        Notifica cuando un vehículo necesita revisión
                      </p>
                    </div>
                    <Switch
                      checked={settings.fleet_maintenance_alerts}
                      onCheckedChange={(v) => updateSetting('fleet_maintenance_alerts', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Umbral de Mantenimiento (km)</Label>
                    <Input
                      type="number"
                      min={1000}
                      max={50000}
                      step={1000}
                      value={settings.maintenance_km_threshold}
                      onChange={(e) => updateSetting('maintenance_km_threshold', parseInt(e.target.value) || 10000)}
                      className="w-[200px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      Alertar cuando falten estos km para el próximo mantenimiento
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Días de Antelación para Documentos</Label>
                    <Input
                      type="number"
                      min={7}
                      max={90}
                      value={settings.document_expiry_alert_days}
                      onChange={(e) => updateSetting('document_expiry_alert_days', parseInt(e.target.value) || 30)}
                      className="w-[200px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      Alertar X días antes del vencimiento de ITV, seguro, etc.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Settings */}
        <TabsContent value="integrations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Integraciones API</CardTitle>
              <CardDescription>Conecta con sistemas externos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Habilitar Integraciones API</Label>
                  <p className="text-sm text-muted-foreground">
                    Permite conexión con sistemas externos vía webhooks
                  </p>
                </div>
                <Switch
                  checked={settings.enable_api_integrations}
                  onCheckedChange={(v) => updateSetting('enable_api_integrations', v)}
                />
              </div>

              {settings.enable_api_integrations && (
                <>
                  <Separator />

                  <div className="space-y-2">
                    <Label>URL de Webhook</Label>
                    <Input
                      type="url"
                      placeholder="https://tu-sistema.com/webhook/logistics"
                      value={settings.webhook_url}
                      onChange={(e) => updateSetting('webhook_url', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Recibirás eventos de envíos en esta URL
                    </p>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <p className="text-sm font-medium">Eventos disponibles:</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">shipment.created</Badge>
                      <Badge variant="outline">shipment.updated</Badge>
                      <Badge variant="outline">shipment.delivered</Badge>
                      <Badge variant="outline">shipment.failed</Badge>
                      <Badge variant="outline">route.started</Badge>
                      <Badge variant="outline">route.completed</Badge>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuración Avanzada</CardTitle>
              <CardDescription>Opciones para usuarios avanzados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Máximo de Envíos por Ruta</Label>
                <Input
                  type="number"
                  min={10}
                  max={200}
                  value={settings.max_shipments_per_route}
                  onChange={(e) => updateSetting('max_shipments_per_route', parseInt(e.target.value) || 50)}
                  className="w-[200px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Optimización de Rutas por Defecto</Label>
                <Select 
                  value={settings.default_route_optimization} 
                  onValueChange={(v) => updateSetting('default_route_optimization', v as LogisticsSettings['default_route_optimization'])}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distance">Menor Distancia</SelectItem>
                    <SelectItem value="time">Menor Tiempo</SelectItem>
                    <SelectItem value="cost">Menor Coste</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Prueba de Entrega (POD)</Label>
                  <p className="text-sm text-muted-foreground">
                    Requiere firma o foto al entregar
                  </p>
                </div>
                <Switch
                  checked={settings.enable_proof_of_delivery}
                  onCheckedChange={(v) => updateSetting('enable_proof_of_delivery', v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LogisticsSettingsPanel;
