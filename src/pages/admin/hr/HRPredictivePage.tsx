/**
 * HRPredictivePage — Auditoría Predictiva y Capa Premium
 * Ruta: /obelixia-admin/hr/predictive
 * Fase K: Predicción IT, simulador avanzado, validación cruzada,
 *         detección pluriempleo, feedback de rechazos, portal auditor
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Brain, TrendingUp, AlertTriangle, CheckCircle, Clock,
  Search, ShieldCheck, Users, BarChart3, FileWarning,
  ArrowUpRight, Zap, Eye, RefreshCw, ThermometerSun
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Demo data ──

interface PredictionCard {
  id: string;
  title: string;
  prediction: string;
  confidence: number;
  risk: 'high' | 'medium' | 'low';
  category: string;
  detail: string;
}

const PREDICTIONS: PredictionCard[] = [
  {
    id: '1', title: 'IT prolongada — Ana García',
    prediction: 'Probabilidad de extensión > 180 días: 72%',
    confidence: 72, risk: 'high', category: 'it',
    detail: 'Basado en diagnóstico M54.5, historial de 2 bajas previas y duración media del sector',
  },
  {
    id: '2', title: 'Pluriempleo no declarado — Ref. 4821',
    prediction: 'Indicadores de pluriempleo detectados en cruce TGSS',
    confidence: 85, risk: 'high', category: 'pluriempleo',
    detail: 'CCC secundario con solapamiento de períodos. Bases combinadas podrían superar tope máximo',
  },
  {
    id: '3', title: 'Desviación IRPF T2 — 3 empleados',
    prediction: 'Retención acumulada inferior al tipo legal proyectado',
    confidence: 68, risk: 'medium', category: 'irpf',
    detail: 'Cambios de situación familiar no comunicados a tiempo (Art. 89 RIRPF — plazo 10 días)',
  },
  {
    id: '4', title: 'Vencimiento contrato temporal — Elena F.',
    prediction: 'Contrato 402 vence en 28 días sin prórroga registrada',
    confidence: 95, risk: 'medium', category: 'contratos',
    detail: 'ET Art. 15.5 — Obligación de conversión o extinción con indemnización 12 d/año',
  },
  {
    id: '5', title: 'Anomalía en base de cotización — Marzo 2026',
    prediction: 'Base declarada difiere de base calculada en 2 empleados',
    confidence: 91, risk: 'low', category: 'validacion',
    detail: 'Validación cruzada RLC vs motor de nómina. Diferencia < 5€ — probable redondeo',
  },
];

const REJECTION_FEEDBACK = [
  { file: 'FAN-2026-03', reason: 'Error en campo NAF — dígito control', status: 'corregido', date: '2026-03-18' },
  { file: 'AFI-2026-Q1', reason: 'CCC no coincide con empresa fiscal', status: 'pendiente', date: '2026-04-02' },
  { file: 'Mod111-2026-T1', reason: 'Nº perceptores no coincide con RLC', status: 'corregido', date: '2026-04-01' },
];

const RISK_COLORS = {
  high: 'text-destructive bg-destructive/10',
  medium: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
  low: 'text-green-600 bg-green-100 dark:bg-green-900/30',
};

export function HRPredictivePage() {
  const [activeTab, setActiveTab] = useState('predictions');

  return (
    <DashboardLayout title="Auditoría Predictiva — Capa Premium">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Auditoría Predictiva
            </h1>
            <p className="text-muted-foreground mt-1">
              Detección temprana de riesgos, validación cruzada automática y feedback de rechazos
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => toast.success('Análisis predictivo lanzado')}>
            <RefreshCw className="h-4 w-4 mr-1" /> Ejecutar análisis
          </Button>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Alertas activas', value: PREDICTIONS.length, icon: AlertTriangle, color: 'text-amber-600' },
            { label: 'Riesgo alto', value: PREDICTIONS.filter(p => p.risk === 'high').length, icon: FileWarning, color: 'text-destructive' },
            { label: 'Validaciones OK', value: 14, icon: CheckCircle, color: 'text-green-600' },
            { label: 'Rechazos pendientes', value: 1, icon: ArrowUpRight, color: 'text-primary' },
            { label: 'Confianza media', value: '82%', icon: ThermometerSun, color: 'text-blue-600' },
          ].map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <kpi.icon className={cn("h-3.5 w-3.5", kpi.color)} />
                  <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="text-xl font-bold">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="predictions">Predicciones</TabsTrigger>
            <TabsTrigger value="cross-validation">Validación cruzada</TabsTrigger>
            <TabsTrigger value="rejections">Feedback rechazos</TabsTrigger>
            <TabsTrigger value="simulator">Simulador avanzado</TabsTrigger>
            <TabsTrigger value="auditor-portal">Portal auditor</TabsTrigger>
          </TabsList>

          {/* Predictions */}
          <TabsContent value="predictions" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Predicciones y alertas tempranas</CardTitle>
                <CardDescription>
                  IA predictiva sobre IT, pluriempleo, IRPF, contratos y bases de cotización
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[420px]">
                  <div className="space-y-3">
                    {PREDICTIONS.map((pred) => (
                      <div key={pred.id} className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={cn("p-1.5 rounded-md", RISK_COLORS[pred.risk])}>
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{pred.title}</p>
                              <Badge variant="outline" className="text-[10px] mt-0.5">{pred.category}</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground">Confianza</span>
                            <p className="font-mono text-sm font-semibold">{pred.confidence}%</p>
                          </div>
                        </div>
                        <p className="text-sm text-primary font-medium">{pred.prediction}</p>
                        <p className="text-xs text-muted-foreground mt-1">{pred.detail}</p>
                        <Progress value={pred.confidence} className="h-1 mt-2" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cross-validation */}
          <TabsContent value="cross-validation" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Validación cruzada automática
                </CardTitle>
                <CardDescription>
                  Comparación de artefactos oficiales (FAN, RLC, Mod. 111) contra datos del motor de nómina
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { artifact: 'RLC vs Motor Nómina', field: 'Bases cotización', status: 'ok', diff: '0,00 €' },
                    { artifact: 'RLC vs Motor Nómina', field: 'Cuota obrera SS', status: 'ok', diff: '0,00 €' },
                    { artifact: 'FAN vs Plantilla', field: 'Altas del período', status: 'ok', diff: '0' },
                    { artifact: 'Mod. 111 vs Nóminas', field: 'Retenciones IRPF', status: 'warning', diff: '-2,35 €' },
                    { artifact: 'Mod. 111 vs Nóminas', field: 'Nº perceptores', status: 'ok', diff: '0' },
                    { artifact: 'AFI vs TGSS', field: 'Variaciones datos', status: 'ok', diff: '0' },
                  ].map((cv, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{cv.artifact}</p>
                        <p className="text-xs text-muted-foreground">{cv.field}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono">{cv.diff}</span>
                        <Badge variant={cv.status === 'ok' ? 'secondary' : 'default'} className={cn(
                          "text-[10px]",
                          cv.status === 'ok' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30'
                        )}>
                          {cv.status === 'ok' ? '✓ OK' : '⚠ Revisar'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rejection feedback */}
          <TabsContent value="rejections" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Feedback automático de rechazos</CardTitle>
                <CardDescription>
                  Errores detectados en ficheros oficiales enviados a TGSS/AEAT
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {REJECTION_FEEDBACK.map((rej, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          rej.status === 'corregido' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
                        )}>
                          {rej.status === 'corregido'
                            ? <CheckCircle className="h-4 w-4 text-green-600" />
                            : <Clock className="h-4 w-4 text-amber-600" />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-medium">{rej.file}</p>
                          <p className="text-xs text-muted-foreground">{rej.reason}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={rej.status === 'corregido' ? 'secondary' : 'default'} className="text-[10px]">
                          {rej.status === 'corregido' ? 'Corregido' : 'Pendiente'}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-1">{rej.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced simulator */}
          <TabsContent value="simulator" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" /> Simulador de escenarios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { scenario: 'Subida salarial +5% plantilla', impact: '+1.245€/mes coste empresa', risk: 'low' },
                      { scenario: 'Conversión 3 temporales a indefinidos', impact: '-0,75% tipo desempleo', risk: 'low' },
                      { scenario: 'Cambio CCAA fiscal (2 empleados)', impact: 'Regularización IRPF T3', risk: 'medium' },
                      { scenario: 'IT prolongada >365 días', impact: 'Paso a INSS, provisión 18.200€', risk: 'high' },
                    ].map((sim, i) => (
                      <div key={i} className="p-3 rounded-lg border">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">{sim.scenario}</p>
                          <Badge variant={sim.risk === 'high' ? 'destructive' : sim.risk === 'medium' ? 'default' : 'secondary'} className="text-[10px]">
                            {sim.risk === 'high' ? 'Alto' : sim.risk === 'medium' ? 'Medio' : 'Bajo'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{sim.impact}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" /> Predicción de duración IT
                  </CardTitle>
                  <CardDescription>
                    Modelo predictivo basado en diagnóstico CIE-10, sector y antigüedad
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { diag: 'M54.5 — Lumbago', predicted: '45-60 días', actual: '38 días', accuracy: 82 },
                      { diag: 'F32.1 — Depresión moderada', predicted: '90-120 días', actual: 'En curso (67d)', accuracy: 74 },
                      { diag: 'S62.0 — Fractura escafoides', predicted: '60-90 días', actual: '72 días', accuracy: 91 },
                    ].map((it, i) => (
                      <div key={i} className="p-3 rounded-lg border">
                        <p className="text-sm font-medium">{it.diag}</p>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Predicción</span>
                            <p className="font-mono">{it.predicted}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Real</span>
                            <p className="font-mono">{it.actual}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Precisión</span>
                            <p className="font-mono font-semibold">{it.accuracy}%</p>
                          </div>
                        </div>
                        <Progress value={it.accuracy} className="h-1 mt-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Auditor portal */}
          <TabsContent value="auditor-portal" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" /> Portal de auditor externo
                </CardTitle>
                <CardDescription>
                  Vista de solo lectura para auditores externos con acceso controlado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border border-dashed bg-muted/30">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <h4 className="text-sm font-semibold">Acceso auditor — Configuración</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Estado</span>
                        <p className="font-medium">No configurado</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Última auditoría</span>
                        <p className="font-medium">—</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Alcance permitido</span>
                        <p className="font-medium">Nóminas, SS, IRPF, Contratos</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Restricciones</span>
                        <p className="font-medium">Solo lectura · Sin PII · Logs auditados</p>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => toast.info('Configuración del portal de auditor próximamente')}>
                    <Users className="h-4 w-4 mr-1" /> Configurar acceso auditor
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

export default HRPredictivePage;
