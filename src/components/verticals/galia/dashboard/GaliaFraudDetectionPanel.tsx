/**
 * GALIA - Panel de Detección de Fraude
 * Dashboard interactivo con indicadores, alertas y análisis
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Shield, AlertTriangle, AlertCircle, CheckCircle, Search,
  Sparkles, Ban, Eye, FileWarning, Building2, Receipt, RefreshCw
} from 'lucide-react';
import { useGaliaFraudDetection, type ExpedienteDataForFraud, type FraudIndicator } from '@/hooks/galia/useGaliaFraudDetection';
import { cn } from '@/lib/utils';

const DEMO_DATA: ExpedienteDataForFraud = {
  beneficiario_nif: 'B12345678',
  beneficiario_nombre: 'Agropecuaria del Norte SL',
  importe_solicitado: 85000,
  partidas: [
    { concepto: 'Tractor John Deere 5100M', importe: 48000, proveedor: 'Suministros Ind. SL', nif_proveedor: 'B87654321' },
    { concepto: 'Reforma nave ganadera', importe: 17500, proveedor: 'Reformas Pepe', nif_proveedor: 'B11111111' },
    { concepto: 'Equipamiento informático', importe: 4500, proveedor: 'Informática Local', nif_proveedor: 'B22222222' },
    { concepto: 'Maquinaria auxiliar', importe: 15000, proveedor: 'Suministros Ind. SL', nif_proveedor: 'B87654321' },
  ],
  proveedores: [
    { nombre: 'Suministros Ind. SL', nif: 'B87654321', importe: 63000 },
    { nombre: 'Reformas Pepe', nif: 'B11111111', importe: 17500 },
    { nombre: 'Informática Local', nif: 'B22222222', importe: 4500 },
  ],
};

const riskColors: Record<string, string> = {
  critico: 'bg-red-500',
  alto: 'bg-orange-500',
  medio: 'bg-yellow-500',
  bajo: 'bg-green-500',
};

const riskBadgeVariants: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  critico: 'destructive',
  alto: 'destructive',
  medio: 'default',
  bajo: 'secondary',
};

const indicatorIcons: Record<string, React.ReactNode> = {
  fraccionamiento: <Receipt className="h-4 w-4" />,
  duplicidad: <FileWarning className="h-4 w-4" />,
  proveedor_ficticio: <Ban className="h-4 w-4" />,
  vinculacion: <Building2 className="h-4 w-4" />,
  desproporcion: <AlertTriangle className="h-4 w-4" />,
  efectivo: <AlertCircle className="h-4 w-4" />,
  concentracion: <Eye className="h-4 w-4" />,
  documental: <FileWarning className="h-4 w-4" />,
};

export function GaliaFraudDetectionPanel() {
  const { isAnalyzing, result, analyzeExpediente, clearResult } = useGaliaFraudDetection();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [customNif, setCustomNif] = useState('');
  const [customNombre, setCustomNombre] = useState('');
  const [customImporte, setCustomImporte] = useState('');
  const [customPartidas, setCustomPartidas] = useState('');

  const handleDemoAnalysis = useCallback(async () => {
    await analyzeExpediente(DEMO_DATA, 'full_scan');
  }, [analyzeExpediente]);

  const handleCustomAnalysis = useCallback(async () => {
    if (!customNif || !customNombre) return;
    let partidas: ExpedienteDataForFraud['partidas'] = [];
    try {
      if (customPartidas.trim()) {
        partidas = JSON.parse(customPartidas);
      }
    } catch {
      partidas = [{ concepto: customPartidas, importe: parseFloat(customImporte) || 0 }];
    }

    await analyzeExpediente({
      beneficiario_nif: customNif,
      beneficiario_nombre: customNombre,
      importe_solicitado: parseFloat(customImporte) || 0,
      partidas,
    }, 'full_scan');
  }, [customNif, customNombre, customImporte, customPartidas, analyzeExpediente]);

  const renderIndicator = (indicator: FraudIndicator, i: number) => (
    <div
      key={i}
      className={cn(
        'p-3 rounded-lg border transition-all hover:shadow-sm',
        indicator.nivel === 'critico' && 'border-red-300 bg-red-50 dark:bg-red-950/20',
        indicator.nivel === 'alto' && 'border-orange-300 bg-orange-50 dark:bg-orange-950/20',
        indicator.nivel === 'medio' && 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20',
        indicator.nivel === 'bajo' && 'border-green-300 bg-green-50 dark:bg-green-950/20',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="mt-0.5">{indicatorIcons[indicator.tipo] || <AlertTriangle className="h-4 w-4" />}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{indicator.titulo}</span>
              <Badge variant={riskBadgeVariants[indicator.nivel]} className="text-[10px] shrink-0">
                {indicator.nivel.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{indicator.descripcion}</p>
            {indicator.evidencia && (
              <p className="text-xs mt-1 italic text-muted-foreground/80">📋 {indicator.evidencia}</p>
            )}
            {indicator.accionRequerida && (
              <p className="text-xs mt-1 font-medium text-foreground">→ {indicator.accionRequerida}</p>
            )}
            {indicator.articuloNormativo && (
              <p className="text-[10px] mt-1 text-muted-foreground">📖 {indicator.articuloNormativo}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-red-500/10">
            <Shield className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Detección de Fraude</h2>
            <p className="text-xs text-muted-foreground">Análisis inteligente de indicios en expedientes LEADER</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <Button variant="ghost" size="sm" onClick={clearResult}>
              <RefreshCw className="h-4 w-4 mr-1" /> Limpiar
            </Button>
          )}
          <Button size="sm" onClick={handleDemoAnalysis} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Analizando...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-1" /> Análisis Demo</>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="text-xs">Dashboard</TabsTrigger>
          <TabsTrigger value="custom" className="text-xs">Análisis Manual</TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs">
            Alertas {result?.alertas?.length ? <Badge variant="destructive" className="ml-1 text-[9px] h-4">{result.alertas.length}</Badge> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          {result ? (
            <div className="space-y-4">
              {/* Risk Score */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-sm font-medium">Puntuación de Riesgo</span>
                      <Badge variant={riskBadgeVariants[result.riesgoGlobal]} className="ml-2">
                        {result.riesgoGlobal.toUpperCase()}
                      </Badge>
                    </div>
                    <span className="text-2xl font-bold">{result.puntuacionRiesgo}/100</span>
                  </div>
                  <Progress value={result.puntuacionRiesgo} className={cn('h-3', result.puntuacionRiesgo > 70 && '[&>div]:bg-red-500', result.puntuacionRiesgo > 40 && result.puntuacionRiesgo <= 70 && '[&>div]:bg-yellow-500')} />
                  <p className="text-xs text-muted-foreground mt-2">{result.resumen}</p>
                </CardContent>
              </Card>

              {/* Indicators */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Indicadores Detectados ({result.indicadores?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[350px]">
                    <div className="space-y-3 pr-2">
                      {result.indicadores?.map((ind, i) => renderIndicator(ind, i))}
                      {(!result.indicadores || result.indicadores.length === 0) && (
                        <div className="text-center py-6 text-muted-foreground">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                          <p className="text-sm">No se detectaron indicios de fraude</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Recommendations */}
              {result.recomendaciones?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Recomendaciones</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {result.recomendaciones.map((rec, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <CheckCircle className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground mb-2">Sistema de detección de fraude IA</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Analiza splitting, duplicidades, proveedores ficticios, vinculaciones y más
                </p>
                <Button size="sm" onClick={handleDemoAnalysis} disabled={isAnalyzing}>
                  <Sparkles className="h-4 w-4 mr-1" /> Ejecutar análisis de ejemplo
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="custom">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Search className="h-4 w-4" /> Análisis Manual de Expediente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">NIF Beneficiario</label>
                  <Input value={customNif} onChange={e => setCustomNif(e.target.value)} placeholder="B12345678" className="h-8 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium">Nombre</label>
                  <Input value={customNombre} onChange={e => setCustomNombre(e.target.value)} placeholder="Empresa SL" className="h-8 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Importe solicitado (€)</label>
                <Input value={customImporte} onChange={e => setCustomImporte(e.target.value)} placeholder="50000" type="number" className="h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium">Partidas (concepto:importe, una por línea o JSON)</label>
                <Textarea value={customPartidas} onChange={e => setCustomPartidas(e.target.value)} placeholder='Ej: Maquinaria agrícola: 30000€&#10;Reforma nave: 15000€' rows={4} className="text-sm" />
              </div>
              <Button className="w-full" size="sm" onClick={handleCustomAnalysis} disabled={isAnalyzing || !customNif || !customNombre}>
                {isAnalyzing ? 'Analizando...' : 'Lanzar Análisis de Fraude'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          {result?.alertas?.length ? (
            <div className="space-y-3">
              {result.alertas.map((alerta, i) => (
                <Card key={i} className={cn(
                  alerta.tipo === 'bloqueo' && 'border-red-300',
                  alerta.tipo === 'revision' && 'border-orange-300',
                )}>
                  <CardContent className="py-3 flex items-start gap-3">
                    {alerta.tipo === 'bloqueo' ? (
                      <Ban className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    ) : alerta.tipo === 'revision' ? (
                      <Eye className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={alerta.tipo === 'bloqueo' ? 'destructive' : 'default'} className="text-[10px]">
                          {alerta.tipo.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{alerta.urgencia}</Badge>
                      </div>
                      <p className="text-sm">{alerta.mensaje}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm">No hay alertas activas</p>
                <p className="text-xs mt-1">Ejecuta un análisis para generar alertas</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GaliaFraudDetectionPanel;
