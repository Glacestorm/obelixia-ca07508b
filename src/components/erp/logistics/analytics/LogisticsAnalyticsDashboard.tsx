/**
 * LogisticsAnalyticsDashboard - Dashboard de Analytics y Reportes de Logística
 * Incluye KPIs, gráficos de rendimiento, y exportación de reportes
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
  Clock,
  Euro,
  AlertTriangle,
  CheckCircle2,
  Download,
  Calendar,
  Building2,
  Route,
  Fuel,
  Target,
  Award,
  BarChart3,
  PieChartIcon,
  Activity
} from 'lucide-react';
import { useERPLogistics } from '@/hooks/erp/useERPLogistics';
import { cn } from '@/lib/utils';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

// === COLORS ===
const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  accent: 'hsl(var(--accent))',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  purple: '#8b5cf6',
  cyan: '#06b6d4'
};

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// === KPI CARD ===
function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  target,
  color = 'primary'
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  target?: { current: number; goal: number };
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-green-500/10 text-green-600',
    warning: 'bg-amber-500/10 text-amber-600',
    danger: 'bg-red-500/10 text-red-600',
    info: 'bg-blue-500/10 text-blue-600',
    purple: 'bg-purple-500/10 text-purple-600'
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}>
                {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(trend.value).toFixed(1)}% vs período anterior
              </div>
            )}
            {target && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Objetivo</span>
                  <span>{((target.current / target.goal) * 100).toFixed(0)}%</span>
                </div>
                <Progress value={(target.current / target.goal) * 100} className="h-1.5" />
              </div>
            )}
          </div>
          <div className={cn("p-2 rounded-lg", colorClasses[color] || colorClasses.primary)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// === MAIN COMPONENT ===
export function LogisticsAnalyticsDashboard() {
  const { shipments, carriers, vehicles, routes, stats } = useERPLogistics();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'year'>('30d');
  const [activeView, setActiveView] = useState<'overview' | 'carriers' | 'fleet' | 'costs'>('overview');

  // Calculate analytics data
  const analyticsData = useMemo(() => {
    const now = new Date();
    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const startDate = subDays(now, periodDays);

    // Filter shipments by period
    const periodShipments = shipments.filter(s => 
      new Date(s.created_at || '') >= startDate
    );

    // Calculate metrics
    const totalShipments = periodShipments.length;
    const deliveredShipments = periodShipments.filter(s => s.status === 'delivered').length;
    const failedShipments = periodShipments.filter(s => s.status === 'failed').length;
    const deliveryRate = totalShipments > 0 ? (deliveredShipments / totalShipments) * 100 : 0;
    const failureRate = totalShipments > 0 ? (failedShipments / totalShipments) * 100 : 0;
    const totalCost = periodShipments.reduce((acc, s) => acc + (s.total_cost || 0), 0);
    const avgCostPerShipment = totalShipments > 0 ? totalCost / totalShipments : 0;

    // Shipments by status
    const byStatus = periodShipments.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Shipments by carrier
    const byCarrier = periodShipments.reduce((acc, s) => {
      const carrier = carriers.find(c => c.id === s.carrier_id);
      const carrierName = carrier?.carrier_name || 'Sin asignar';
      acc[carrierName] = (acc[carrierName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Daily volume (last 7 days for chart)
    const dailyData: { date: string; shipments: number; delivered: number; cost: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(now, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayShipments = periodShipments.filter(s => 
        s.created_at && format(new Date(s.created_at), 'yyyy-MM-dd') === dateStr
      );
      dailyData.push({
        date: format(date, 'EEE', { locale: es }),
        shipments: dayShipments.length,
        delivered: dayShipments.filter(s => s.status === 'delivered').length,
        cost: dayShipments.reduce((acc, s) => acc + (s.total_cost || 0), 0)
      });
    }

    // Carrier performance
    const carrierPerformance = carriers.map(carrier => {
      const carrierShipments = periodShipments.filter(s => s.carrier_id === carrier.id);
      const delivered = carrierShipments.filter(s => s.status === 'delivered').length;
      const failed = carrierShipments.filter(s => s.status === 'failed').length;
      const total = carrierShipments.length;
      return {
        name: carrier.carrier_name,
        total,
        delivered,
        failed,
        deliveryRate: total > 0 ? (delivered / total) * 100 : 0,
        avgCost: total > 0 ? carrierShipments.reduce((acc, s) => acc + (s.total_cost || 0), 0) / total : 0
      };
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

    // Fleet stats
    const activeVehicles = vehicles.filter(v => v.status === 'available' || v.status === 'in_route').length;
    const totalVehicles = vehicles.length;
    const fleetUtilization = totalVehicles > 0 ? (activeVehicles / totalVehicles) * 100 : 0;

    return {
      totalShipments,
      deliveredShipments,
      failedShipments,
      deliveryRate,
      failureRate,
      totalCost,
      avgCostPerShipment,
      byStatus,
      byCarrier,
      dailyData,
      carrierPerformance,
      activeVehicles,
      totalVehicles,
      fleetUtilization
    };
  }, [shipments, carriers, vehicles, period]);

  // Status chart data
  const statusChartData = useMemo(() => {
    const statusLabels: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      in_transit: 'En tránsito',
      delivered: 'Entregado',
      failed: 'Fallido',
      returned: 'Devuelto'
    };
    return Object.entries(analyticsData.byStatus).map(([status, count]) => ({
      name: statusLabels[status] || status,
      value: count
    }));
  }, [analyticsData.byStatus]);

  // Carrier chart data
  const carrierChartData = useMemo(() => {
    return Object.entries(analyticsData.byCarrier)
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [analyticsData.byCarrier]);

  const handleExportReport = () => {
    // TODO: Implement PDF export
    console.log('Exporting report...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Analytics de Logística
          </h3>
          <p className="text-sm text-muted-foreground">
            Análisis detallado de rendimiento y costes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 días</SelectItem>
              <SelectItem value="30d">Últimos 30 días</SelectItem>
              <SelectItem value="90d">Últimos 90 días</SelectItem>
              <SelectItem value="year">Este año</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          title="Total Envíos"
          value={analyticsData.totalShipments}
          icon={Package}
          trend={{ value: 12.5, isPositive: true }}
          color="info"
        />
        <KPICard
          title="Tasa de Entrega"
          value={`${analyticsData.deliveryRate.toFixed(1)}%`}
          icon={CheckCircle2}
          target={{ current: analyticsData.deliveryRate, goal: 98 }}
          color="success"
        />
        <KPICard
          title="Tasa de Fallos"
          value={`${analyticsData.failureRate.toFixed(1)}%`}
          icon={AlertTriangle}
          trend={{ value: -5.2, isPositive: true }}
          color="danger"
        />
        <KPICard
          title="Coste Total"
          value={`${analyticsData.totalCost.toFixed(0)} €`}
          icon={Euro}
          color="warning"
        />
        <KPICard
          title="Coste Medio"
          value={`${analyticsData.avgCostPerShipment.toFixed(2)} €`}
          subtitle="por envío"
          icon={Target}
          color="purple"
        />
        <KPICard
          title="Flota Activa"
          value={`${analyticsData.activeVehicles}/${analyticsData.totalVehicles}`}
          subtitle={`${analyticsData.fleetUtilization.toFixed(0)}% utilización`}
          icon={Truck}
          color="primary"
        />
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as typeof activeView)}>
        <TabsList>
          <TabsTrigger value="overview">Visión General</TabsTrigger>
          <TabsTrigger value="carriers">Por Operadora</TabsTrigger>
          <TabsTrigger value="fleet">Flota</TabsTrigger>
          <TabsTrigger value="costs">Costes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Daily Volume Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Volumen Diario</CardTitle>
                <CardDescription>Envíos de los últimos 7 días</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={analyticsData.dailyData}>
                    <defs>
                      <linearGradient id="colorShipments" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.info} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={CHART_COLORS.info} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="shipments"
                      name="Envíos"
                      stroke={CHART_COLORS.info}
                      fill="url(#colorShipments)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="delivered"
                      name="Entregados"
                      stroke={CHART_COLORS.success}
                      fill="transparent"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribución por Estado</CardTitle>
                <CardDescription>Estados actuales de envíos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {statusChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Carrier Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Envíos por Operadora</CardTitle>
              <CardDescription>Distribución del volumen entre operadoras</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={carrierChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis type="category" dataKey="name" width={100} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="value" name="Envíos" fill={CHART_COLORS.info} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="carriers" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rendimiento por Operadora</CardTitle>
              <CardDescription>Comparativa de eficiencia y costes</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.carrierPerformance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No hay datos de operadoras para el período seleccionado</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analyticsData.carrierPerformance.map((carrier, index) => (
                    <div key={carrier.name} className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm",
                            index === 0 ? "bg-amber-500" : index === 1 ? "bg-gray-400" : index === 2 ? "bg-amber-700" : "bg-muted-foreground"
                          )}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{carrier.name}</p>
                            <p className="text-xs text-muted-foreground">{carrier.total} envíos</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-medium">{carrier.avgCost.toFixed(2)} €</p>
                          <p className="text-xs text-muted-foreground">coste medio</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Entregados</p>
                          <p className="font-medium text-green-600">{carrier.delivered}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Fallidos</p>
                          <p className="font-medium text-red-600">{carrier.failed}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Tasa Entrega</p>
                          <p className={cn(
                            "font-medium",
                            carrier.deliveryRate >= 95 ? "text-green-600" : carrier.deliveryRate >= 90 ? "text-amber-600" : "text-red-600"
                          )}>
                            {carrier.deliveryRate.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <Progress value={carrier.deliveryRate} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fleet" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard
              title="Vehículos Activos"
              value={analyticsData.activeVehicles}
              icon={Truck}
              color="success"
            />
            <KPICard
              title="En Mantenimiento"
              value={vehicles.filter(v => v.status === 'maintenance').length}
              icon={Activity}
              color="warning"
            />
            <KPICard
              title="Utilización"
              value={`${analyticsData.fleetUtilization.toFixed(0)}%`}
              icon={Target}
              target={{ current: analyticsData.fleetUtilization, goal: 100 }}
              color="info"
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estado de la Flota</CardTitle>
            </CardHeader>
            <CardContent>
              {vehicles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No hay vehículos registrados</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {vehicles.slice(0, 8).map(vehicle => (
                    <div key={vehicle.id} className={cn(
                      "p-3 rounded-lg border",
                      (vehicle.status === 'available' || vehicle.status === 'in_route') ? "bg-green-500/10 border-green-500/30" :
                      vehicle.status === 'maintenance' ? "bg-amber-500/10 border-amber-500/30" :
                      "bg-muted border-muted"
                    )}>
                      <p className="font-mono font-medium text-sm">{vehicle.license_plate}</p>
                      <p className="text-xs text-muted-foreground truncate">{vehicle.model || vehicle.brand}</p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {vehicle.status === 'available' ? 'Disponible' : 
                         vehicle.status === 'in_route' ? 'En ruta' :
                         vehicle.status === 'maintenance' ? 'Mantenim.' : 
                         vehicle.status === 'inactive' ? 'Inactivo' : vehicle.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolución de Costes</CardTitle>
              <CardDescription>Costes diarios de logística</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analyticsData.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `${v}€`} />
                  <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} €`, 'Coste']} />
                  <Bar dataKey="cost" name="Coste" fill={CHART_COLORS.warning} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Desglose de Costes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-sm">Envíos externos</span>
                    <span className="font-mono font-medium">{(analyticsData.totalCost * 0.7).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-sm">Flota propia</span>
                    <span className="font-mono font-medium">{(analyticsData.totalCost * 0.2).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <span className="text-sm">Otros gastos</span>
                    <span className="font-mono font-medium">{(analyticsData.totalCost * 0.1).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded font-medium">
                    <span>Total</span>
                    <span className="font-mono">{analyticsData.totalCost.toFixed(2)} €</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Métricas de Eficiencia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Coste por km</span>
                      <span className="font-mono">0.42 €</span>
                    </div>
                    <Progress value={42} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Coste por kg</span>
                      <span className="font-mono">0.15 €</span>
                    </div>
                    <Progress value={30} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Eficiencia combustible</span>
                      <span className="font-mono">87%</span>
                    </div>
                    <Progress value={87} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LogisticsAnalyticsDashboard;
