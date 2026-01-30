/**
 * PredictiveAnalyticsTrend - Tendencia #7: Predictive Industry Analytics
 * Implementación completa con datos de ejemplo
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Target,
  Zap,
  Clock,
  CheckCircle2,
  Activity,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Predicciones activas
const ACTIVE_PREDICTIONS = [
  {
    id: 'pred-001',
    name: 'Demanda Q1 2024',
    type: 'demand',
    vertical: 'Industrial',
    prediction: '+12% vs Q4',
    confidence: 87,
    impact: 'high',
    status: 'active',
    accuracy: 92,
    lastUpdate: '2 horas',
  },
  {
    id: 'pred-002',
    name: 'Churn Rate Febrero',
    type: 'churn',
    vertical: 'Services',
    prediction: '3.2% esperado',
    confidence: 91,
    impact: 'medium',
    status: 'active',
    accuracy: 89,
    lastUpdate: '30 min',
  },
  {
    id: 'pred-003',
    name: 'Fallo Compresor #4',
    type: 'maintenance',
    vertical: 'Industrial',
    prediction: 'En 72 horas',
    confidence: 94,
    impact: 'critical',
    status: 'alert',
    accuracy: 96,
    lastUpdate: '5 min',
  },
  {
    id: 'pred-004',
    name: 'Cosecha Trigo Norte',
    type: 'yield',
    vertical: 'Agriculture',
    prediction: '8.2 ton/ha',
    confidence: 82,
    impact: 'high',
    status: 'active',
    accuracy: 85,
    lastUpdate: '1 día',
  },
  {
    id: 'pred-005',
    name: 'Ocupación UCI',
    type: 'capacity',
    vertical: 'Healthcare',
    prediction: '78% próxima semana',
    confidence: 88,
    impact: 'high',
    status: 'active',
    accuracy: 91,
    lastUpdate: '4 horas',
  },
];

const ANOMALIES = [
  { id: 1, metric: 'Consumo energético', deviation: '+23%', severity: 'high', detected: '10:42', source: 'Industrial' },
  { id: 2, metric: 'Tasa de conversión', deviation: '-15%', severity: 'medium', detected: '10:30', source: 'Sales' },
  { id: 3, metric: 'Tiempo respuesta API', deviation: '+180ms', severity: 'low', detected: '10:15', source: 'IT' },
  { id: 4, metric: 'Stock componente XR-42', deviation: '-40%', severity: 'high', detected: '09:55', source: 'Inventory' },
];

const FORECAST_DATA = [
  { month: 'Ene', actual: 420, predicted: 415, variance: 1.2 },
  { month: 'Feb', actual: 485, predicted: 478, variance: 1.5 },
  { month: 'Mar', actual: 520, predicted: 530, variance: -1.9 },
  { month: 'Abr', actual: null, predicted: 565, variance: null },
  { month: 'May', actual: null, predicted: 598, variance: null },
  { month: 'Jun', actual: null, predicted: 642, variance: null },
];

export function PredictiveAnalyticsTrend() {
  const [selectedPrediction, setSelectedPrediction] = useState(ACTIVE_PREDICTIONS[0]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  const avgAccuracy = (ACTIVE_PREDICTIONS.reduce((acc, p) => acc + p.accuracy, 0) / ACTIVE_PREDICTIONS.length).toFixed(1);
  const criticalAlerts = ACTIVE_PREDICTIONS.filter(p => p.status === 'alert').length;

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'critical': return <Badge variant="destructive">Crítico</Badge>;
      case 'high': return <Badge className="bg-orange-500">Alto</Badge>;
      case 'medium': return <Badge className="bg-amber-500">Medio</Badge>;
      case 'low': return <Badge variant="secondary">Bajo</Badge>;
      default: return null;
    }
  };

  const getPredictionIcon = (type: string) => {
    switch (type) {
      case 'demand': return <TrendingUp className="h-5 w-5 text-blue-500" />;
      case 'churn': return <TrendingDown className="h-5 w-5 text-red-500" />;
      case 'maintenance': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'yield': return <Target className="h-5 w-5 text-green-500" />;
      case 'capacity': return <Activity className="h-5 w-5 text-purple-500" />;
      default: return <BarChart3 className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-teal-500/10 to-green-500/10 border-teal-200 dark:border-teal-800">
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 text-teal-500" />
            <p className="text-2xl font-bold">{ACTIVE_PREDICTIONS.length}</p>
            <p className="text-xs text-muted-foreground">Predicciones Activas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <Target className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{avgAccuracy}%</p>
            <p className="text-xs text-muted-foreground">Precisión Media</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{ANOMALIES.length}</p>
            <p className="text-xs text-muted-foreground">Anomalías Detectadas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border-red-200 dark:border-red-800">
          <CardContent className="p-4 text-center">
            <Zap className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <p className="text-2xl font-bold">{criticalAlerts}</p>
            <p className="text-xs text-muted-foreground">Alertas Críticas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Predictions List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Predicciones
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={handleRefresh}>
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {ACTIVE_PREDICTIONS.map((pred) => (
                  <div 
                    key={pred.id}
                    onClick={() => setSelectedPrediction(pred)}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all",
                      selectedPrediction.id === pred.id 
                        ? "border-primary bg-primary/5" 
                        : "hover:border-muted-foreground/30",
                      pred.status === 'alert' && "border-red-500/50 bg-red-500/5"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getPredictionIcon(pred.type)}
                        <span className="font-medium text-sm">{pred.name}</span>
                      </div>
                      {pred.status === 'alert' && (
                        <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{pred.vertical}</span>
                      <span className="font-medium">{pred.prediction}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <Progress value={pred.confidence} className="h-1.5 flex-1 mr-2" />
                      <span className="text-xs text-muted-foreground">{pred.confidence}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Prediction Detail */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {getPredictionIcon(selectedPrediction.type)}
                {selectedPrediction.name}
              </CardTitle>
              {getImpactBadge(selectedPrediction.impact)}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="detail" className="h-full">
              <TabsList className="mb-4">
                <TabsTrigger value="detail">Detalle</TabsTrigger>
                <TabsTrigger value="forecast">Forecast</TabsTrigger>
                <TabsTrigger value="factors">Factores</TabsTrigger>
              </TabsList>

              <TabsContent value="detail" className="mt-0 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-muted/30">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{selectedPrediction.prediction}</p>
                      <p className="text-xs text-muted-foreground">Predicción</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/30">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{selectedPrediction.confidence}%</p>
                      <p className="text-xs text-muted-foreground">Confianza</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/30">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{selectedPrediction.accuracy}%</p>
                      <p className="text-xs text-muted-foreground">Precisión Histórica</p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Última actualización: {selectedPrediction.lastUpdate}
                      </span>
                    </div>
                    <p className="text-sm">
                      Modelo predictivo basado en datos históricos, tendencias de mercado y 
                      variables externas. Actualización automática cada 30 minutos.
                    </p>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button className="flex-1 gap-2">
                    <Target className="h-4 w-4" />
                    Ver Detalles
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Recalcular
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="forecast" className="mt-0">
                <div className="space-y-4">
                  <div className="grid grid-cols-6 gap-2">
                    {FORECAST_DATA.map((item, i) => (
                      <div key={i} className="text-center">
                        <div className={cn(
                          "h-24 rounded-lg flex flex-col justify-end p-2",
                          item.actual ? "bg-primary/20" : "bg-muted/50 border-2 border-dashed"
                        )}>
                          <div 
                            className={cn(
                              "rounded-t",
                              item.actual ? "bg-primary" : "bg-muted-foreground/30"
                            )}
                            style={{ height: `${(item.predicted || 0) / 7}%` }}
                          />
                        </div>
                        <p className="text-xs font-medium mt-1">{item.month}</p>
                        <p className="text-xs text-muted-foreground">{item.predicted}k</p>
                        {item.variance !== null && (
                          <p className={cn(
                            "text-xs",
                            item.variance > 0 ? "text-green-500" : "text-red-500"
                          )}>
                            {item.variance > 0 ? '+' : ''}{item.variance}%
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-primary" />
                      <span>Actual</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-muted-foreground/30 border-2 border-dashed" />
                      <span>Predicción</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="factors" className="mt-0">
                <div className="space-y-3">
                  {[
                    { factor: 'Tendencia histórica', weight: 35, trend: 'up' },
                    { factor: 'Estacionalidad', weight: 25, trend: 'stable' },
                    { factor: 'Variables externas', weight: 20, trend: 'up' },
                    { factor: 'Comportamiento cliente', weight: 15, trend: 'down' },
                    { factor: 'Eventos especiales', weight: 5, trend: 'stable' },
                  ].map((f, i) => (
                    <div key={i} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{f.factor}</span>
                        <div className="flex items-center gap-2">
                          {f.trend === 'up' && <ArrowUpRight className="h-4 w-4 text-green-500" />}
                          {f.trend === 'down' && <ArrowDownRight className="h-4 w-4 text-red-500" />}
                          {f.trend === 'stable' && <Activity className="h-4 w-4 text-muted-foreground" />}
                          <span className="text-sm font-bold">{f.weight}%</span>
                        </div>
                      </div>
                      <Progress value={f.weight} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Anomalies */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Anomalías Detectadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ANOMALIES.map((anomaly) => (
              <Card key={anomaly.id} className={cn(
                "bg-muted/30",
                anomaly.severity === 'high' && "border-red-500/50",
                anomaly.severity === 'medium' && "border-amber-500/50",
                anomaly.severity === 'low' && "border-blue-500/50"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{anomaly.metric}</span>
                    <Badge variant={
                      anomaly.severity === 'high' ? 'destructive' : 
                      anomaly.severity === 'medium' ? 'secondary' : 'outline'
                    }>
                      {anomaly.severity}
                    </Badge>
                  </div>
                  <p className={cn(
                    "text-xl font-bold",
                    anomaly.deviation.startsWith('+') ? "text-red-500" : "text-blue-500"
                  )}>
                    {anomaly.deviation}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {anomaly.source} • {anomaly.detected}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PredictiveAnalyticsTrend;
