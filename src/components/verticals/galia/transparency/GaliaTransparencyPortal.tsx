/**
 * GaliaTransparencyPortal - Portal de transparencia y explicabilidad IA
 * Cumple con Ley 19/2013 de transparencia y Art. 22 RGPD
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  Eye, 
  FileText, 
  Shield, 
  Brain,
  Search,
  Download,
  RefreshCw,
  CheckCircle,
  Clock,
  Users,
  Euro,
  TrendingUp,
  Building2,
  MapPin,
  AlertTriangle,
  Info,
  Scale,
  History,
  Sparkles
} from 'lucide-react';
import { useGaliaTransparency } from '@/hooks/galia/useGaliaTransparency';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface GaliaTransparencyPortalProps {
  expedienteId?: string;
  className?: string;
}

export function GaliaTransparencyPortal({ expedienteId, className }: GaliaTransparencyPortalProps) {
  const [activeTab, setActiveTab] = useState('public');
  const [searchCode, setSearchCode] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const {
    isLoading,
    publicData,
    decisionExplanation,
    auditTrail,
    publicReport,
    fetchPublicData,
    explainDecision,
    fetchAuditTrail,
    generatePublicReport,
  } = useGaliaTransparency();

  // Cargar datos públicos al montar
  useEffect(() => {
    fetchPublicData({ year: selectedYear });
  }, [selectedYear, fetchPublicData]);

  // Si hay expediente, cargar explicación y auditoría
  useEffect(() => {
    if (expedienteId) {
      explainDecision(expedienteId);
      fetchAuditTrail(expedienteId);
    }
  }, [expedienteId, explainDecision, fetchAuditTrail]);

  const handleSearch = () => {
    if (searchCode) {
      explainDecision(searchCode);
      fetchAuditTrail(searchCode);
      setActiveTab('explicability');
    }
  };

  const getImpactColor = (impacto: string) => {
    switch (impacto) {
      case 'positivo': return 'text-green-600 bg-green-100';
      case 'negativo': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600">
            <Eye className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Portal de Transparencia</h2>
            <p className="text-sm text-muted-foreground">
              Ley 19/2013 · Explicabilidad IA · Trazabilidad
            </p>
          </div>
        </div>

        {/* Buscador de expedientes */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Código de expediente..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="w-64"
          />
          <Button onClick={handleSearch} disabled={!searchCode || isLoading}>
            <Search className="h-4 w-4 mr-2" />
            Consultar
          </Button>
        </div>
      </div>

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="public" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Datos Públicos
          </TabsTrigger>
          <TabsTrigger value="explicability" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Explicabilidad IA
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Trazabilidad
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Informes
          </TabsTrigger>
        </TabsList>

        {/* === DATOS PÚBLICOS === */}
        <TabsContent value="public" className="space-y-4">
          {/* KPIs públicos */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {publicData?.estadisticas.totalProyectos || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Proyectos Financiados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <Euro className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {((publicData?.estadisticas.importeConcedido || 0) / 1000000).toFixed(1)}M€
                    </p>
                    <p className="text-sm text-muted-foreground">Inversión Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {typeof publicData?.estadisticas.empleoGenerado === 'object' 
                        ? ((publicData?.estadisticas.empleoGenerado as any)?.directo || 0) + ((publicData?.estadisticas.empleoGenerado as any)?.indirectoEstimado || 0)
                        : (publicData?.estadisticas.empleoGenerado || 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Empleos Generados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {((publicData?.indicadores.tasaAprobacion || 0) * 100).toFixed(0)}%
                    </p>
                    <p className="text-sm text-muted-foreground">Tasa Aprobación</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Distribución sectorial */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Distribución Sectorial de Ayudas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {publicData?.estadisticas.distribucionSectorial && 
                  Object.entries(publicData.estadisticas.distribucionSectorial).map(([sector, valor]) => (
                    <div key={sector} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{sector}</span>
                        <span className="font-medium">{valor}%</span>
                      </div>
                      <Progress value={valor as number} className="h-2" />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Indicadores de rendimiento */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Tiempo Medio de Resolución
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {publicData?.indicadores.tiempoMedioResolucion || 0} días
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Desde solicitud hasta resolución
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Euro className="h-4 w-4" />
                  Inversión Privada Movilizada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {((publicData?.indicadores.inversionPrivadaMovilizada || 0) / 1000000).toFixed(1)}M€
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Complementaria a fondos públicos
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* === EXPLICABILIDAD IA === */}
        <TabsContent value="explicability" className="space-y-4">
          {decisionExplanation ? (
            <>
              {/* Resumen de decisión */}
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-blue-600" />
                      <CardTitle>Explicación de Decisión IA</CardTitle>
                    </div>
                    <Badge variant="outline">
                      Art. 22 RGPD
                    </Badge>
                  </div>
                  <CardDescription>
                    {decisionExplanation.decision.tipo} - {decisionExplanation.decision.resultado}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Resumen ejecutivo */}
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">Resumen Ejecutivo</h4>
                    <p className="text-sm text-blue-800">
                      {decisionExplanation.explicacion.resumenEjecutivo}
                    </p>
                  </div>

                  {/* Factores determinantes */}
                  <div>
                    <h4 className="font-medium mb-3">Factores Determinantes</h4>
                    <div className="space-y-2">
                      {decisionExplanation.explicacion.factoresDeterminantes.map((factor, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border">
                          <Badge className={getImpactColor(factor.impacto)}>
                            {factor.impacto}
                          </Badge>
                          <div className="flex-1">
                            <p className="font-medium">{factor.factor}</p>
                            <p className="text-sm text-muted-foreground">{factor.explicacion}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">{factor.peso}%</p>
                            <p className="text-xs text-muted-foreground">Peso</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Limitaciones */}
                  {decisionExplanation.explicacion.limitaciones.length > 0 && (
                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <h4 className="font-medium text-amber-900">Limitaciones del Análisis</h4>
                      </div>
                      <ul className="text-sm text-amber-800 space-y-1">
                        {decisionExplanation.explicacion.limitaciones.map((lim, idx) => (
                          <li key={idx}>• {lim}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Trazabilidad técnica */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Información Técnica del Análisis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Modelo IA</p>
                      <p className="font-medium">{decisionExplanation.trazabilidad.modeloIA}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Versión Algoritmo</p>
                      <p className="font-medium">{decisionExplanation.trazabilidad.versionAlgoritmo}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Fecha Análisis</p>
                      <p className="font-medium">{decisionExplanation.trazabilidad.fechaAnalisis}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Datos Utilizados</p>
                      <p className="font-medium">{decisionExplanation.trazabilidad.datosUtilizados.length} fuentes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Derechos del usuario */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-green-600" />
                    Sus Derechos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Recurso Disponible</p>
                      <p className="font-medium">{decisionExplanation.derechosUsuario.recurso}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Plazo</p>
                      <p className="font-medium">{decisionExplanation.derechosUsuario.plazo}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Contacto</p>
                      <p className="font-medium">{decisionExplanation.derechosUsuario.contacto}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Introduce un código de expediente para ver la explicación de las decisiones IA
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* === TRAZABILIDAD === */}
        <TabsContent value="audit" className="space-y-4">
          {auditTrail ? (
            <>
              {/* Resumen de auditoría */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold">{auditTrail.resumen.totalAcciones}</p>
                    <p className="text-sm text-muted-foreground">Total Acciones</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold">{auditTrail.resumen.participantes}</p>
                    <p className="text-sm text-muted-foreground">Participantes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold">{auditTrail.resumen.tiempoTotal}</p>
                    <p className="text-sm text-muted-foreground">Tiempo Total</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <p className="text-lg font-bold text-green-600">Verificado</p>
                    </div>
                    <p className="text-sm text-muted-foreground">Integridad</p>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline de auditoría */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Trail de Auditoría Completo
                    </CardTitle>
                    <Badge variant="outline" className="font-mono">
                      {auditTrail.certificacion.codigoVerificacion}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="relative pl-6 border-l-2 border-muted space-y-4">
                      {auditTrail.trailCompleto.map((entry, idx) => (
                        <div key={entry.id} className="relative">
                          {/* Dot */}
                          <div className={cn(
                            "absolute -left-[25px] w-4 h-4 rounded-full border-2 border-background",
                            entry.actor.tipo === 'ia' ? 'bg-purple-500' :
                            entry.actor.tipo === 'sistema' ? 'bg-blue-500' : 'bg-green-500'
                          )} />
                          
                          {/* Content */}
                          <div className="p-4 rounded-lg border bg-card">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {entry.actor.tipo === 'ia' && <Sparkles className="h-3 w-3 mr-1" />}
                                  {entry.actor.tipo}
                                </Badge>
                                <span className="font-medium">{entry.accion}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {entry.timestamp}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {entry.detalles.descripcion}
                            </p>
                            {entry.verificacion.integridad === 'verificado' && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                                <CheckCircle className="h-3 w-3" />
                                Hash: {entry.verificacion.hash.substring(0, 16)}...
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Certificación */}
              <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="font-medium">Certificación de Auditoría</p>
                        <p className="text-sm text-muted-foreground">
                          Válido hasta: {auditTrail.certificacion.validezHasta}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Descargar Certificado
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Introduce un código de expediente para ver el trail de auditoría
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* === INFORMES === */}
        <TabsContent value="reports" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <select 
                className="px-3 py-2 rounded-lg border bg-background"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {[2024, 2023, 2022, 2021, 2020].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <Button 
                onClick={() => generatePublicReport(selectedYear)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Generar Informe
              </Button>
            </div>
          </div>

          {publicReport ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{publicReport.informe.titulo}</CardTitle>
                    <CardDescription>
                      Período: {publicReport.informe.periodo} · 
                      Publicado: {publicReport.informe.fechaPublicacion}
                    </CardDescription>
                  </div>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Resumen ejecutivo */}
                <div className="p-4 rounded-lg bg-muted">
                  <h4 className="font-medium mb-2">Resumen Ejecutivo</h4>
                  <p className="text-sm">{publicReport.contenido.resumenEjecutivo}</p>
                </div>

                {/* Datos agregados */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg border">
                    <p className="text-2xl font-bold">
                      {publicReport.contenido.datosAgregados.solicitudesRecibidas}
                    </p>
                    <p className="text-sm text-muted-foreground">Solicitudes Recibidas</p>
                  </div>
                  <div className="text-center p-4 rounded-lg border">
                    <p className="text-2xl font-bold text-green-600">
                      {publicReport.contenido.datosAgregados.solicitudesAprobadas}
                    </p>
                    <p className="text-sm text-muted-foreground">Aprobadas</p>
                  </div>
                  <div className="text-center p-4 rounded-lg border">
                    <p className="text-2xl font-bold">
                      {(publicReport.contenido.datosAgregados.importeTotal / 1000000).toFixed(1)}M€
                    </p>
                    <p className="text-sm text-muted-foreground">Importe Total</p>
                  </div>
                  <div className="text-center p-4 rounded-lg border">
                    <p className="text-2xl font-bold text-purple-600">
                      {publicReport.contenido.datosAgregados.empleoComprometido}
                    </p>
                    <p className="text-sm text-muted-foreground">Empleos Comprometidos</p>
                  </div>
                </div>

                {/* Metodología */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">Metodología</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {publicReport.metodologia}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Selecciona un año y genera un informe público de transparencia
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GaliaTransparencyPortal;
