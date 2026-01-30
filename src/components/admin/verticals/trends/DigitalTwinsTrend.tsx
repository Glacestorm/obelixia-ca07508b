/**
 * DigitalTwinsTrend - Tendencia #2: Digital Twins por Industria
 * Implementación completa con datos de ejemplo
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Cpu, 
  Activity, 
  Thermometer, 
  Gauge, 
  Zap,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Wifi,
  WifiOff,
  Box,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Datos de ejemplo de Digital Twins
const DEMO_TWINS = [
  {
    id: 'twin-001',
    name: 'Línea Producción A',
    type: 'manufacturing_line',
    industry: 'Industrial',
    status: 'online',
    health: 92,
    lastSync: '2 seg',
    sensors: [
      { id: 's1', name: 'Temperatura', value: 72, unit: '°C', status: 'normal', trend: 'stable' },
      { id: 's2', name: 'Presión', value: 4.2, unit: 'bar', status: 'normal', trend: 'up' },
      { id: 's3', name: 'RPM Motor', value: 1450, unit: 'rpm', status: 'normal', trend: 'stable' },
      { id: 's4', name: 'Vibración', value: 0.8, unit: 'mm/s', status: 'warning', trend: 'up' },
    ],
    alerts: 1,
    oee: 87.5,
  },
  {
    id: 'twin-002',
    name: 'Sistema HVAC Edificio B',
    type: 'hvac_system',
    industry: 'Services',
    status: 'online',
    health: 98,
    lastSync: '5 seg',
    sensors: [
      { id: 's1', name: 'Temp. Interior', value: 22, unit: '°C', status: 'normal', trend: 'stable' },
      { id: 's2', name: 'Humedad', value: 45, unit: '%', status: 'normal', trend: 'down' },
      { id: 's3', name: 'CO2', value: 420, unit: 'ppm', status: 'normal', trend: 'stable' },
      { id: 's4', name: 'Flujo Aire', value: 850, unit: 'm³/h', status: 'normal', trend: 'stable' },
    ],
    alerts: 0,
    efficiency: 94.2,
  },
  {
    id: 'twin-003',
    name: 'Invernadero Norte',
    type: 'greenhouse',
    industry: 'Agriculture',
    status: 'online',
    health: 88,
    lastSync: '3 seg',
    sensors: [
      { id: 's1', name: 'Temp. Suelo', value: 18, unit: '°C', status: 'normal', trend: 'stable' },
      { id: 's2', name: 'Humedad Rel.', value: 78, unit: '%', status: 'high', trend: 'up' },
      { id: 's3', name: 'Luz PAR', value: 650, unit: 'μmol', status: 'normal', trend: 'down' },
      { id: 's4', name: 'pH Suelo', value: 6.2, unit: '', status: 'normal', trend: 'stable' },
    ],
    alerts: 2,
    yieldPrediction: '+12%',
  },
  {
    id: 'twin-004',
    name: 'Equipo Resonancia #3',
    type: 'medical_equipment',
    industry: 'Healthcare',
    status: 'maintenance',
    health: 65,
    lastSync: '1 min',
    sensors: [
      { id: 's1', name: 'Temp. Helio', value: -269, unit: '°C', status: 'warning', trend: 'up' },
      { id: 's2', name: 'Campo Mag.', value: 1.48, unit: 'T', status: 'normal', trend: 'stable' },
      { id: 's3', name: 'Ciclos Uso', value: 12450, unit: '', status: 'normal', trend: 'up' },
      { id: 's4', name: 'Energía', value: 45, unit: 'kW', status: 'normal', trend: 'stable' },
    ],
    alerts: 3,
    uptime: 89.5,
  },
];

const DEMO_EVENTS = [
  { id: 1, twin: 'Línea Producción A', event: 'Vibración elevada detectada', severity: 'warning', time: '10:45:22' },
  { id: 2, twin: 'Equipo Resonancia #3', event: 'Mantenimiento preventivo requerido', severity: 'info', time: '10:42:15' },
  { id: 3, twin: 'Invernadero Norte', event: 'Humedad fuera de rango óptimo', severity: 'warning', time: '10:38:50' },
  { id: 4, twin: 'Sistema HVAC', event: 'Eficiencia energética optimizada', severity: 'success', time: '10:30:00' },
  { id: 5, twin: 'Línea Producción A', event: 'Sincronización completada', severity: 'info', time: '10:25:33' },
];

export function DigitalTwinsTrend() {
  const [selectedTwin, setSelectedTwin] = useState(DEMO_TWINS[0]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  const getSensorStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-green-500';
      case 'warning': return 'text-amber-500';
      case 'high': return 'text-orange-500';
      case 'critical': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-amber-500" />;
      case 'down': return <TrendingDown className="h-3 w-3 text-blue-500" />;
      default: return <Activity className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4 text-center">
            <Cpu className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{DEMO_TWINS.length}</p>
            <p className="text-xs text-muted-foreground">Twins Activos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <Wifi className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{DEMO_TWINS.filter(t => t.status === 'online').length}</p>
            <p className="text-xs text-muted-foreground">Online</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{DEMO_TWINS.reduce((acc, t) => acc + t.sensors.length, 0)}</p>
            <p className="text-xs text-muted-foreground">Sensores</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{DEMO_TWINS.reduce((acc, t) => acc + t.alerts, 0)}</p>
            <p className="text-xs text-muted-foreground">Alertas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Twin List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Box className="h-5 w-5 text-primary" />
                Digital Twins
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={handleRefresh}>
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {DEMO_TWINS.map((twin) => (
                  <div 
                    key={twin.id}
                    onClick={() => setSelectedTwin(twin)}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all",
                      selectedTwin.id === twin.id 
                        ? "border-primary bg-primary/5" 
                        : "hover:border-muted-foreground/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {twin.status === 'online' 
                          ? <Wifi className="h-4 w-4 text-green-500" />
                          : <WifiOff className="h-4 w-4 text-amber-500" />
                        }
                        <span className="font-medium text-sm">{twin.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">{twin.industry}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Health: {twin.health}%</span>
                      <span className="text-muted-foreground">Sync: {twin.lastSync}</span>
                    </div>
                    <Progress value={twin.health} className="h-1.5 mt-2" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Twin Detail */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {selectedTwin.status === 'online' 
                    ? <Wifi className="h-5 w-5 text-green-500" />
                    : <WifiOff className="h-5 w-5 text-amber-500" />
                  }
                  {selectedTwin.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Última sincronización: {selectedTwin.lastSync}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={selectedTwin.status === 'online' ? 'default' : 'secondary'}>
                  {selectedTwin.status === 'online' ? 'Online' : 'Mantenimiento'}
                </Badge>
                {selectedTwin.alerts > 0 && (
                  <Badge variant="destructive">{selectedTwin.alerts} alertas</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="sensors" className="h-full">
              <TabsList className="mb-4">
                <TabsTrigger value="sensors">Sensores</TabsTrigger>
                <TabsTrigger value="metrics">Métricas</TabsTrigger>
                <TabsTrigger value="3d">Modelo 3D</TabsTrigger>
              </TabsList>

              <TabsContent value="sensors" className="mt-0">
                <div className="grid grid-cols-2 gap-4">
                  {selectedTwin.sensors.map((sensor) => (
                    <Card key={sensor.id} className="bg-muted/30">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{sensor.name}</span>
                          {getTrendIcon(sensor.trend)}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className={cn("text-2xl font-bold", getSensorStatusColor(sensor.status))}>
                            {sensor.value}
                          </span>
                          <span className="text-sm text-muted-foreground">{sensor.unit}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            sensor.status === 'normal' && "bg-green-500",
                            sensor.status === 'warning' && "bg-amber-500",
                            sensor.status === 'high' && "bg-orange-500",
                            sensor.status === 'critical' && "bg-red-500"
                          )} />
                          <span className="text-xs text-muted-foreground capitalize">{sensor.status}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="metrics" className="mt-0">
                <div className="space-y-4">
                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Health Score</span>
                        <span className="text-2xl font-bold">{selectedTwin.health}%</span>
                      </div>
                      <Progress value={selectedTwin.health} className="h-2" />
                    </CardContent>
                  </Card>
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-green-500/10">
                      <CardContent className="p-4 text-center">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                        <p className="text-xl font-bold">
                          {selectedTwin.sensors.filter(s => s.status === 'normal').length}
                        </p>
                        <p className="text-xs text-muted-foreground">Sensores Normales</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-amber-500/10">
                      <CardContent className="p-4 text-center">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                        <p className="text-xl font-bold">
                          {selectedTwin.sensors.filter(s => s.status !== 'normal').length}
                        </p>
                        <p className="text-xs text-muted-foreground">Requieren Atención</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="3d" className="mt-0">
                <div className="h-[250px] bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Box className="h-16 w-16 mx-auto mb-4 text-primary animate-pulse" />
                    <p className="text-white font-medium">Modelo 3D</p>
                    <p className="text-sm text-slate-400">{selectedTwin.name}</p>
                    <Button variant="secondary" className="mt-4">
                      Abrir Visualizador 3D
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Events Log */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Eventos en Tiempo Real</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[150px]">
            <div className="space-y-2">
              {DEMO_EVENTS.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      event.severity === 'warning' && "bg-amber-500",
                      event.severity === 'info' && "bg-blue-500",
                      event.severity === 'success' && "bg-green-500",
                      event.severity === 'error' && "bg-red-500"
                    )} />
                    <div>
                      <p className="text-sm">{event.event}</p>
                      <p className="text-xs text-muted-foreground">{event.twin}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{event.time}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default DigitalTwinsTrend;
