/**
 * GALIA - Moderador de Costes IA
 * Análisis automático de presupuestos y detección de anomalías
 * Integrado con useGaliaAnalisisCostes hook
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Calculator, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  FileSpreadsheet,
  Sparkles,
  RefreshCw,
  Eye,
  Download,
  BarChart3,
  Target,
  Lightbulb,
  Scale,
  Save
} from 'lucide-react';
import { useGaliaAnalisisCostes, GaliaAnalisisCoste } from '@/hooks/galia/useGaliaAnalisisCostes';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GaliaModeradorCostesProps {
  expedienteId?: string;
  onAnalisisComplete?: (items: GaliaAnalisisCoste[]) => void;
}

interface CostItem {
  id: string;
  concepto: string;
  descripcion: string;
  importeSolicitado: number;
  importeReferencia: number;
  desviacion: number;
  estado: 'ok' | 'alerta' | 'critico';
  comentarioIA?: string;
  necesitaOfertas: boolean;
}

interface AnalisisResult {
  items: CostItem[];
  resumen: {
    totalSolicitado: number;
    totalModerado: number;
    ahorroPotencial: number;
    alertas: number;
    criticos: number;
  };
  recomendacionesGenerales: string[];
  confianza: number;
}

export function GaliaModeradorCostes({ expedienteId, onAnalisisComplete }: GaliaModeradorCostesProps) {
  const [presupuestoInput, setPresupuestoInput] = useState('');
  const [tipoProyecto, setTipoProyecto] = useState('');
  const [resultado, setResultado] = useState<AnalisisResult | null>(null);
  const [activeTab, setActiveTab] = useState('input');

  // Hook integrado para análisis de costes
  const {
    analisis,
    isLoading: isAnalyzing,
    analizarCostes,
    guardarEnExpediente,
    getResumen,
    actualizarEstadoRevision,
    limpiarAnalisis
  } = useGaliaAnalisisCostes(expedienteId);

  // Resumen calculado del hook
  const resumenHook = useMemo(() => getResumen(), [analisis, getResumen]);

  const analizarPresupuesto = useCallback(async () => {
    if (!presupuestoInput.trim()) {
      toast.error('Introduce el presupuesto a analizar');
      return;
    }

    // Usar el hook para analizar
    const items = await analizarCostes(presupuestoInput);
    
    if (items && items.length > 0) {
      // Convertir a formato del componente
      const convertedItems: CostItem[] = items.map(item => ({
        id: item.id,
        concepto: item.concepto,
        descripcion: item.categoria,
        importeSolicitado: item.importe_declarado,
        importeReferencia: item.importe_referencia || 0,
        desviacion: item.desviacion_porcentaje || 0,
        estado: item.clasificacion,
        comentarioIA: item.justificacion_ia || undefined,
        necesitaOfertas: item.requiere_ofertas
      }));

      const totalSolicitado = items.reduce((sum, i) => sum + i.importe_declarado, 0);
      const totalModerado = items.reduce((sum, i) => sum + (i.importe_referencia || i.importe_declarado), 0);

      setResultado({
        items: convertedItems,
        resumen: {
          totalSolicitado,
          totalModerado,
          ahorroPotencial: totalSolicitado - totalModerado,
          alertas: items.filter(i => i.clasificacion === 'alerta').length,
          criticos: items.filter(i => i.clasificacion === 'critico').length
        },
        recomendacionesGenerales: items
          .filter(i => i.recomendaciones.length > 0)
          .flatMap(i => i.recomendaciones),
        confianza: 0.85
      });

      setActiveTab('resultado');
      onAnalisisComplete?.(items);
      toast.success('Análisis completado');
    }
  }, [presupuestoInput, analizarCostes, onAnalisisComplete]);

  const handleGuardarEnExpediente = useCallback(async () => {
    if (!expedienteId || analisis.length === 0) {
      toast.error('No hay análisis para guardar o falta el expediente');
      return;
    }

    const success = await guardarEnExpediente(expedienteId, analisis);
    if (success) {
      toast.success('Análisis guardado en el expediente');
    }
  }, [expedienteId, analisis, guardarEnExpediente]);

  const getEstadoBadge = (estado: CostItem['estado']) => {
    switch (estado) {
      case 'ok':
        return (
          <Badge className="bg-green-500/20 text-green-700 border-green-500/30 gap-1">
            <CheckCircle className="h-3 w-3" />
            OK
          </Badge>
        );
      case 'alerta':
        return (
          <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30 gap-1">
            <AlertTriangle className="h-3 w-3" />
            Revisar
          </Badge>
        );
      case 'critico':
        return (
          <Badge className="bg-red-500/20 text-red-700 border-red-500/30 gap-1">
            <AlertTriangle className="h-3 w-3" />
            Crítico
          </Badge>
        );
    }
  };

  const getDesviacionIcon = (desviacion: number) => {
    if (desviacion <= 5) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (desviacion <= 15) return <TrendingUp className="h-4 w-4 text-amber-600" />;
    return <TrendingUp className="h-4 w-4 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
            <Scale className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Moderador de Costes IA</h2>
            <p className="text-sm text-muted-foreground">
              Análisis automático de presupuestos LEADER
            </p>
          </div>
        </div>
        
        <Badge variant="outline" className="gap-1">
          <Sparkles className="h-3 w-3" />
          Powered by GALIA AI
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="input" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Entrada
          </TabsTrigger>
          <TabsTrigger value="resultado" className="gap-2" disabled={!resultado}>
            <BarChart3 className="h-4 w-4" />
            Resultado
          </TabsTrigger>
          <TabsTrigger value="catalogo" className="gap-2">
            <Target className="h-4 w-4" />
            Catálogo
          </TabsTrigger>
        </TabsList>

        {/* Input Tab */}
        <TabsContent value="input" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Presupuesto a analizar</CardTitle>
              <CardDescription>
                Pega el presupuesto en formato tabla o describe las partidas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de proyecto</Label>
                <Input
                  placeholder="Ej: Turismo rural, Agroalimentario, Energías renovables..."
                  value={tipoProyecto}
                  onChange={(e) => setTipoProyecto(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Presupuesto desglosado</Label>
                <Textarea
                  placeholder={`Ejemplo:
Concepto | Descripción | Importe
Maquinaria | Tractor 120CV | 85.000€
Obra civil | Nave 200m² | 120.000€
Instalación | Fotovoltaica 50kWp | 65.000€`}
                  value={presupuestoInput}
                  onChange={(e) => setPresupuestoInput(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={analizarPresupuesto}
                  disabled={isAnalyzing}
                  className="gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Analizando...
                    </>
                  ) : (
                    <>
                      <Calculator className="h-4 w-4" />
                      Analizar presupuesto
                    </>
                  )}
                </Button>
                <Button variant="outline" className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Importar Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Consejos para mejor análisis</p>
                  <ul className="mt-2 space-y-1 text-blue-800/80">
                    <li>• Incluye descripción técnica detallada de cada partida</li>
                    <li>• Especifica unidades, medidas y características técnicas</li>
                    <li>• Indica si se trata de inversión nueva o segunda mano</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resultado Tab */}
        <TabsContent value="resultado" className="space-y-6">
          {resultado && (
            <>
              {/* Resumen */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="bg-muted/50">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">
                      {resultado.resumen.totalSolicitado.toLocaleString('es-ES')}€
                    </div>
                    <div className="text-xs text-muted-foreground">Total solicitado</div>
                  </CardContent>
                </Card>
                <Card className="bg-green-500/10 border-green-500/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-700">
                      {resultado.resumen.totalModerado.toLocaleString('es-ES')}€
                    </div>
                    <div className="text-xs text-green-600">Coste moderado</div>
                  </CardContent>
                </Card>
                <Card className="bg-amber-500/10 border-amber-500/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-amber-700">
                      {resultado.resumen.ahorroPotencial.toLocaleString('es-ES')}€
                    </div>
                    <div className="text-xs text-amber-600">Ajuste sugerido</div>
                  </CardContent>
                </Card>
                <Card className={cn(
                  "border",
                  resultado.resumen.alertas > 0 ? "bg-amber-500/10 border-amber-500/20" : "bg-green-500/10 border-green-500/20"
                )}>
                  <CardContent className="p-4 text-center">
                    <div className={cn(
                      "text-2xl font-bold",
                      resultado.resumen.alertas > 0 ? "text-amber-700" : "text-green-700"
                    )}>
                      {resultado.resumen.alertas}
                    </div>
                    <div className="text-xs text-muted-foreground">Alertas</div>
                  </CardContent>
                </Card>
                <Card className={cn(
                  "border",
                  resultado.resumen.criticos > 0 ? "bg-red-500/10 border-red-500/20" : "bg-green-500/10 border-green-500/20"
                )}>
                  <CardContent className="p-4 text-center">
                    <div className={cn(
                      "text-2xl font-bold",
                      resultado.resumen.criticos > 0 ? "text-red-700" : "text-green-700"
                    )}>
                      {resultado.resumen.criticos}
                    </div>
                    <div className="text-xs text-muted-foreground">Críticos</div>
                  </CardContent>
                </Card>
              </div>

              {/* Confianza */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Nivel de confianza del análisis</span>
                    <span className="text-sm font-bold">{Math.round(resultado.confianza * 100)}%</span>
                  </div>
                  <Progress value={resultado.confianza * 100} className="h-2" />
                </CardContent>
              </Card>

              {/* Detalle de partidas */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalle de partidas</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {resultado.items.map((item) => (
                        <Card key={item.id} className={cn(
                          "border-l-4",
                          item.estado === 'ok' && "border-l-green-500",
                          item.estado === 'alerta' && "border-l-amber-500",
                          item.estado === 'critico' && "border-l-red-500"
                        )}>
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold">{item.concepto}</h4>
                                <p className="text-sm text-muted-foreground">{item.descripcion}</p>
                              </div>
                              {getEstadoBadge(item.estado)}
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground">Solicitado</div>
                                <div className="font-semibold">{item.importeSolicitado.toLocaleString('es-ES')}€</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Referencia</div>
                                <div className="font-semibold">{item.importeReferencia.toLocaleString('es-ES')}€</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Desviación</div>
                                <div className="font-semibold flex items-center gap-1">
                                  {getDesviacionIcon(item.desviacion)}
                                  {item.desviacion > 0 ? '+' : ''}{item.desviacion.toFixed(1)}%
                                </div>
                              </div>
                            </div>

                            {item.comentarioIA && (
                              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                                <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                <span>{item.comentarioIA}</span>
                              </div>
                            )}

                            {item.necesitaOfertas && (
                              <Badge variant="outline" className="gap-1">
                                <FileSpreadsheet className="h-3 w-3" />
                                Requiere 3 ofertas comparativas
                              </Badge>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Recomendaciones */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Recomendaciones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {resultado.recomendacionesGenerales.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-4">
                {expedienteId && (
                  <Button 
                    className="gap-2" 
                    onClick={handleGuardarEnExpediente}
                    disabled={analisis.length === 0}
                  >
                    <Save className="h-4 w-4" />
                    Guardar en Expediente
                  </Button>
                )}
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar informe
                </Button>
                <Button variant="outline" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Vista previa PDF
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* Catálogo Tab */}
        <TabsContent value="catalogo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Catálogo de costes de referencia</CardTitle>
              <CardDescription>
                Base de datos de precios máximos admisibles por categoría
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground text-center py-8">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Catálogo de costes en desarrollo</p>
                <p className="mt-1">Los precios de referencia se actualizan trimestralmente</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GaliaModeradorCostes;
