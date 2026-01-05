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
import { useERPLogistics, type Shipment, type ShipmentStatus, type LogisticsCarrier } from '@/hooks/erp/useERPLogistics';
import { useERPContext } from '@/hooks/erp';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ShipmentsManager } from './shipments/ShipmentsManager';
import { CarriersManager } from './carriers/CarriersManager';
import { LogisticsAccountingPanel } from './accounting/LogisticsAccountingPanel';
import { FleetManager } from './fleet/FleetManager';
import { RoutePlanner } from './routes/RoutePlanner';
import { LogisticsAnalyticsDashboard } from './analytics/LogisticsAnalyticsDashboard';
import { LogisticsNotificationsPanel } from './notifications/LogisticsNotificationsPanel';
import { LogisticsReportsPanel } from './reports/LogisticsReportsPanel';
import { LogisticsSettingsPanel } from './settings/LogisticsSettingsPanel';

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

// === SHIPMENTS TAB - Using full component ===
function ShipmentsTabContent() {
  const { carriers } = useERPLogistics();
  return <ShipmentsManager carriers={carriers as LogisticsCarrier[]} />;
}

// === CARRIERS TAB - Using full component ===
function CarriersTabContent() {
  const { carriers, carrierAccounts } = useERPLogistics();
  return <CarriersManager carriers={carriers as LogisticsCarrier[]} accounts={carrierAccounts} />;
}

// === FLEET TAB - Using full component ===
function FleetTabContent() {
  return <FleetManager />;
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
                    <TableCell>{ruleTypeLabels[rule.operation_type || rule.rule_type] || rule.rule_type}</TableCell>
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

      {/* Notifications Panel - Collapsible at top */}
      <LogisticsNotificationsPanel />

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
        <TabsList className="grid w-full grid-cols-8">
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
          <TabsTrigger value="analytics" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Informes</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Config</span>
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
          <RoutePlanner />
        </TabsContent>

        <TabsContent value="accounting" className="mt-6">
          <LogisticsAccountingPanel />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <LogisticsAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <LogisticsReportsPanel />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <LogisticsSettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LogisticsModuleDashboard;
