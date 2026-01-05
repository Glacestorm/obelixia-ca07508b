/**
 * LogisticsModuleDashboard - Dashboard principal del módulo de Logística
 * Incluye tabs para Envíos, Operadoras, Flota, Rutas y Contabilidad
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Package,
  Truck,
  Route,
  Building2,
  Calculator,
  RefreshCw,
  Plus,
  Search,
  Filter,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Settings,
  FileText
} from 'lucide-react';
import { useERPLogistics, type Shipment, type ShipmentStatus } from '@/hooks/erp/useERPLogistics';
import { useERPContext } from '@/hooks/erp';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

// === STATUS CONFIGS ===
const STATUS_CONFIG: Record<ShipmentStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Borrador', color: 'bg-muted text-muted-foreground', icon: FileText },
  pending: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-600', icon: Clock },
  confirmed: { label: 'Confirmado', color: 'bg-blue-500/20 text-blue-600', icon: CheckCircle2 },
  picked_up: { label: 'Recogido', color: 'bg-indigo-500/20 text-indigo-600', icon: Package },
  in_transit: { label: 'En tránsito', color: 'bg-purple-500/20 text-purple-600', icon: Truck },
  out_for_delivery: { label: 'En reparto', color: 'bg-orange-500/20 text-orange-600', icon: Route },
  delivered: { label: 'Entregado', color: 'bg-green-500/20 text-green-600', icon: CheckCircle2 },
  failed: { label: 'Fallido', color: 'bg-red-500/20 text-red-600', icon: XCircle },
  returned: { label: 'Devuelto', color: 'bg-amber-500/20 text-amber-600', icon: ArrowRight },
  cancelled: { label: 'Cancelado', color: 'bg-gray-500/20 text-gray-600', icon: XCircle }
};

// === CARRIER LOGOS ===
const CARRIER_COLORS: Record<string, string> = {
  'SEUR': 'bg-red-500',
  'CORREOS_EXPRESS': 'bg-yellow-500',
  'MRW': 'bg-blue-600',
  'GLS': 'bg-yellow-400',
  'NACEX': 'bg-green-600',
  'UPS': 'bg-amber-700',
  'DHL_EXPRESS': 'bg-yellow-500',
  'FEDEX': 'bg-purple-600',
  'ENVIALIA': 'bg-orange-500',
  'CTT_EXPRESS': 'bg-red-600',
  'TIPSA': 'bg-blue-500',
  'SENDING': 'bg-teal-500'
};

// === STATS CARD ===
function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  color = 'primary'
}: { 
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  color?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className={cn(
                "flex items-center gap-1 text-xs",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}>
                {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(trend.value)}%
              </div>
            )}
          </div>
          <div className={cn(
            "p-2 rounded-lg",
            `bg-${color}/10`
          )}>
            <Icon className={cn("h-5 w-5", `text-${color}`)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// === SHIPMENTS TAB ===
function ShipmentsTabContent() {
  const { shipments, isLoading, fetchShipments, carriers, updateShipmentStatus } = useERPLogistics();
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | 'all'>('all');

  const filteredShipments = useMemo(() => {
    if (statusFilter === 'all') return shipments;
    return shipments.filter(s => s.status === statusFilter);
  }, [shipments, statusFilter]);

  const getCarrierName = (shipment: Shipment) => {
    const account = shipment.carrier_account;
    if (!account) return 'Sin operadora';
    const carrier = (account as any)?.carrier;
    return carrier?.carrier_name || 'Desconocida';
  };

  const getCarrierCode = (shipment: Shipment) => {
    const account = shipment.carrier_account;
    if (!account) return '';
    const carrier = (account as any)?.carrier;
    return carrier?.carrier_code || '';
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
        >
          Todos
        </Button>
        {(['pending', 'in_transit', 'out_for_delivery', 'delivered', 'failed'] as ShipmentStatus[]).map(status => {
          const config = STATUS_CONFIG[status];
          return (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="gap-1"
            >
              <config.icon className="h-3 w-3" />
              {config.label}
            </Button>
          );
        })}
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={() => fetchShipments()}>
          <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
          Actualizar
        </Button>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nuevo Envío
        </Button>
      </div>

      {/* Tabla de envíos */}
      <Card>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Envío</TableHead>
                <TableHead>Operadora</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Bultos</TableHead>
                <TableHead className="text-right">Coste</TableHead>
                <TableHead>Contabilizado</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShipments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hay envíos que mostrar
                  </TableCell>
                </TableRow>
              ) : (
                filteredShipments.map(shipment => {
                  const statusConfig = STATUS_CONFIG[shipment.status];
                  const carrierCode = getCarrierCode(shipment);
                  
                  return (
                    <TableRow key={shipment.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-mono font-medium">
                        {shipment.shipment_number}
                        {shipment.tracking_number && (
                          <p className="text-xs text-muted-foreground">{shipment.tracking_number}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-6 h-6 rounded flex items-center justify-center text-white text-[8px] font-bold",
                            CARRIER_COLORS[carrierCode] || 'bg-gray-400'
                          )}>
                            {carrierCode.slice(0, 2)}
                          </div>
                          <span className="text-sm">{getCarrierName(shipment)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {shipment.destination_city}
                            <span className="text-muted-foreground ml-1">
                              ({shipment.destination_postal_code})
                            </span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("gap-1", statusConfig.color)}>
                          <statusConfig.icon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                        {shipment.has_incident && (
                          <Badge variant="destructive" className="ml-1 gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Incidencia
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {shipment.total_packages} bulto{shipment.total_packages !== 1 ? 's' : ''}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {shipment.total_weight.toFixed(1)} kg
                        </p>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {shipment.total_cost.toFixed(2)} €
                      </TableCell>
                      <TableCell>
                        {shipment.is_accounted ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Sí
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Pendiente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(shipment.created_at), { addSuffix: true, locale: es })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
}

// === CARRIERS TAB ===
function CarriersTabContent() {
  const { carriers, carrierAccounts, fetchCarriers, isLoading } = useERPLogistics();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Operadoras Logísticas</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona las conexiones con operadoras nacionales e internacionales
          </p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Conectar Operadora
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {carriers.map(carrier => {
          const hasAccount = carrierAccounts.some(a => (a as any).carrier_id === carrier.id);
          const services = carrier.services || [];
          
          return (
            <Card key={carrier.id} className={cn(
              "relative overflow-hidden transition-all",
              hasAccount && "ring-2 ring-primary/50"
            )}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold",
                    CARRIER_COLORS[carrier.carrier_code] || 'bg-gray-400'
                  )}>
                    {carrier.carrier_code.slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{carrier.carrier_name}</CardTitle>
                    <CardDescription className="capitalize">
                      {carrier.carrier_type === 'national' && 'Nacional'}
                      {carrier.carrier_type === 'international' && 'Internacional'}
                      {carrier.carrier_type === 'urgent' && 'Urgente'}
                      {carrier.carrier_type === 'freight' && 'Carga'}
                    </CardDescription>
                  </div>
                  {hasAccount && (
                    <Badge className="bg-green-500/20 text-green-600">Conectado</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {services.slice(0, 3).map((service: { code: string; name: string }) => (
                    <Badge key={service.code} variant="outline" className="text-xs">
                      {service.name}
                    </Badge>
                  ))}
                  {services.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{services.length - 3}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {carrier.supports_tracking && (
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3" /> Tracking
                    </span>
                  )}
                  {carrier.supports_labels && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Etiquetas
                    </span>
                  )}
                </div>
                <Button 
                  variant={hasAccount ? "outline" : "default"} 
                  size="sm" 
                  className="w-full"
                >
                  {hasAccount ? 'Gestionar' : 'Conectar'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// === FLEET TAB ===
function FleetTabContent() {
  const { vehicles, fetchVehicles, isLoading } = useERPLogistics();

  const vehicleTypeLabels: Record<string, string> = {
    van: 'Furgoneta',
    truck: 'Camión',
    motorcycle: 'Moto',
    bicycle: 'Bici',
    car: 'Coche'
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    available: { label: 'Disponible', color: 'bg-green-500/20 text-green-600' },
    in_route: { label: 'En ruta', color: 'bg-blue-500/20 text-blue-600' },
    maintenance: { label: 'Mantenimiento', color: 'bg-amber-500/20 text-amber-600' },
    inactive: { label: 'Inactivo', color: 'bg-gray-500/20 text-gray-600' }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Flota Propia</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona los vehículos de tu flota de reparto
          </p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Añadir Vehículo
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h4 className="font-medium mb-2">Sin vehículos registrados</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Añade vehículos a tu flota para gestionar rutas propias
            </p>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Añadir Vehículo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map(vehicle => {
            const statusConfig = statusLabels[vehicle.status] || statusLabels.inactive;
            const hasAlerts = (vehicle.itv_expiry && new Date(vehicle.itv_expiry) < new Date()) ||
                             (vehicle.insurance_expiry && new Date(vehicle.insurance_expiry) < new Date());
            
            return (
              <Card key={vehicle.id} className={cn(hasAlerts && "border-amber-500/50")}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-base">{vehicle.license_plate}</CardTitle>
                        <CardDescription>{vehicle.vehicle_code}</CardDescription>
                      </div>
                    </div>
                    <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tipo</span>
                    <span>{vehicleTypeLabels[vehicle.vehicle_type] || vehicle.vehicle_type}</span>
                  </div>
                  {vehicle.brand && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Marca/Modelo</span>
                      <span>{vehicle.brand} {vehicle.model}</span>
                    </div>
                  )}
                  {vehicle.driver_name && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Conductor</span>
                      <span>{vehicle.driver_name}</span>
                    </div>
                  )}
                  {hasAlerts && (
                    <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg text-amber-600 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      Documentación pendiente
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// === ACCOUNTING TAB ===
function AccountingTabContent() {
  const { accountingRules, shipments, generateAccountingEntry } = useERPLogistics();
  const [autoMode, setAutoMode] = useState(true);

  const pendingAccounting = useMemo(() => {
    return shipments.filter(s => 
      s.status === 'delivered' && 
      !s.is_accounted && 
      s.accounting_mode !== 'none'
    );
  }, [shipments]);

  const ruleTypeLabels: Record<string, string> = {
    shipment_cost: 'Coste envío',
    carrier_invoice: 'Factura operadora',
    fleet_expense: 'Gasto flota',
    fuel: 'Combustible',
    tolls: 'Peajes',
    maintenance: 'Mantenimiento'
  };

  return (
    <div className="space-y-6">
      {/* Configuración modo automático */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Contabilización Automática
              </CardTitle>
              <CardDescription>
                Los asientos se generan automáticamente al confirmar envíos
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-mode" className="text-sm">
                {autoMode ? 'Activado' : 'Desactivado'}
              </Label>
              <Switch
                id="auto-mode"
                checked={autoMode}
                onCheckedChange={setAutoMode}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Envíos pendientes de contabilizar */}
      {pendingAccounting.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pendientes de Contabilizar</CardTitle>
            <CardDescription>
              {pendingAccounting.length} envío{pendingAccounting.length !== 1 ? 's' : ''} entregado{pendingAccounting.length !== 1 ? 's' : ''} sin asiento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingAccounting.slice(0, 5).map(shipment => (
                <div key={shipment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-mono text-sm font-medium">{shipment.shipment_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {shipment.destination_city} • {shipment.total_cost.toFixed(2)} €
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => generateAccountingEntry(shipment.id, 'post')}>
                    <Calculator className="h-4 w-4 mr-1" />
                    Contabilizar
                  </Button>
                </div>
              ))}
            </div>
            {pendingAccounting.length > 5 && (
              <Button variant="ghost" className="w-full mt-2">
                Ver todos ({pendingAccounting.length})
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reglas de contabilización */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Reglas de Contabilización</CardTitle>
              <CardDescription>
                Configura las cuentas contables para cada tipo de operación
              </CardDescription>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Nueva Regla
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {accountingRules.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay reglas configuradas</p>
              <p className="text-xs">Se usarán las cuentas por defecto (6240/4100)</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Regla</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Debe</TableHead>
                  <TableHead>Haber</TableHead>
                  <TableHead>Auto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountingRules.map(rule => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.rule_name}</TableCell>
                    <TableCell>{ruleTypeLabels[rule.rule_type] || rule.rule_type}</TableCell>
                    <TableCell className="font-mono text-sm">{rule.debit_account_code}</TableCell>
                    <TableCell className="font-mono text-sm">{rule.credit_account_code}</TableCell>
                    <TableCell>
                      {rule.auto_post ? (
                        <Badge className="bg-green-500/20 text-green-600">Sí</Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// === MAIN COMPONENT ===
export function LogisticsModuleDashboard() {
  const erpContext = useERPContext();
  const selectedCompany = erpContext?.currentCompany || null;
  const { 
    stats, 
    isLoading, 
    initialize,
    startAutoRefresh,
    stopAutoRefresh
  } = useERPLogistics();
  
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (selectedCompany?.id) {
      initialize();
      startAutoRefresh(90000);
    }
    return () => stopAutoRefresh();
  }, [selectedCompany?.id, initialize, startAutoRefresh, stopAutoRefresh]);

  if (!selectedCompany) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h4 className="font-medium mb-2">Selecciona una empresa</h4>
          <p className="text-sm text-muted-foreground">
            Selecciona una empresa para ver el módulo de logística
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Logística
          </h2>
          <p className="text-muted-foreground">
            Gestión integral de envíos, operadoras y flota propia
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Activity className="h-3 w-3" />
            {stats?.inTransitShipments || 0} en tránsito
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Total Envíos"
          value={stats?.totalShipments || 0}
          icon={Package}
          color="primary"
        />
        <StatsCard
          title="Pendientes"
          value={stats?.pendingShipments || 0}
          icon={Clock}
          color="yellow-500"
        />
        <StatsCard
          title="En Tránsito"
          value={stats?.inTransitShipments || 0}
          icon={Truck}
          color="blue-500"
        />
        <StatsCard
          title="Entregados"
          value={stats?.deliveredShipments || 0}
          icon={CheckCircle2}
          color="green-500"
        />
        <StatsCard
          title="Coste Total"
          value={`${(stats?.totalCost || 0).toFixed(0)} €`}
          subtitle={`Incidencias: ${(stats?.incidentRate || 0).toFixed(1)}%`}
          icon={Calculator}
          color="purple-500"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Envíos</span>
          </TabsTrigger>
          <TabsTrigger value="carriers" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Operadoras</span>
          </TabsTrigger>
          <TabsTrigger value="fleet" className="gap-2">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Flota</span>
          </TabsTrigger>
          <TabsTrigger value="routes" className="gap-2">
            <Route className="h-4 w-4" />
            <span className="hidden sm:inline">Rutas</span>
          </TabsTrigger>
          <TabsTrigger value="accounting" className="gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Contabilidad</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <ShipmentsTabContent />
        </TabsContent>

        <TabsContent value="carriers" className="mt-6">
          <CarriersTabContent />
        </TabsContent>

        <TabsContent value="fleet" className="mt-6">
          <FleetTabContent />
        </TabsContent>

        <TabsContent value="routes" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center">
              <Route className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h4 className="font-medium mb-2">Planificador de Rutas</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Disponible en Fase 4: Flota Propia y Rutas
              </p>
              <Badge variant="outline">Próximamente</Badge>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounting" className="mt-6">
          <AccountingTabContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LogisticsModuleDashboard;
