/**
 * GaliaAdminIntegrationsPanel - Phase 8F
 * Panel de Integraciones con Administraciones Públicas
 * AEAT, TGSS, Registro Mercantil, Catastro/SIGPAC
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  RefreshCw, 
  Building2,
  FileCheck,
  MapPin,
  Landmark,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Settings,
  Activity,
  History,
  Maximize2,
  Minimize2,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { useGaliaAdminIntegrations, AdminIntegration, AdminIntegrationType } from '@/hooks/galia/useGaliaAdminIntegrations';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface GaliaAdminIntegrationsPanelProps {
  expedienteId?: string;
  beneficiarioNIF?: string;
  className?: string;
}

const INTEGRATION_ICONS: Record<AdminIntegrationType, React.ReactNode> = {
  aeat: <Landmark className="h-5 w-5" />,
  tgss: <ShieldCheck className="h-5 w-5" />,
  registro_mercantil: <Building2 className="h-5 w-5" />,
  catastro: <MapPin className="h-5 w-5" />,
  sigpac: <MapPin className="h-5 w-5" />,
  bdns: <FileCheck className="h-5 w-5" />
};

const INTEGRATION_COLORS: Record<AdminIntegrationType, string> = {
  aeat: 'from-red-500 to-red-600',
  tgss: 'from-blue-500 to-blue-600',
  registro_mercantil: 'from-purple-500 to-purple-600',
  catastro: 'from-green-500 to-green-600',
  sigpac: 'from-emerald-500 to-emerald-600',
  bdns: 'from-amber-500 to-amber-600'
};

export function GaliaAdminIntegrationsPanel({ 
  expedienteId,
  beneficiarioNIF,
  className 
}: GaliaAdminIntegrationsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('integraciones');
  const [searchNIF, setSearchNIF] = useState(beneficiarioNIF || '');
  const [searchRefCatastral, setSearchRefCatastral] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<Record<string, unknown> | null>(null);

  const {
    isLoading,
    integrations,
    consultaLogs,
    error,
    lastRefresh,
    fetchIntegrations,
    consultarAEAT,
    consultarTGSS,
    consultarRegistroMercantil,
    consultarCatastro,
    validarBeneficiarioCompleto,
    fetchConsultaLogs,
    startAutoRefresh,
    stopAutoRefresh
  } = useGaliaAdminIntegrations();

  useEffect(() => {
    startAutoRefresh(180000);
    fetchConsultaLogs();
    return () => stopAutoRefresh();
  }, []);

  const handleValidacionCompleta = useCallback(async () => {
    if (!searchNIF) return;
    setIsValidating(true);
    setValidationResult(null);
    
    const result = await validarBeneficiarioCompleto(searchNIF, searchRefCatastral || undefined);
    if (result) {
      setValidationResult(result);
    }
    setIsValidating(false);
  }, [searchNIF, searchRefCatastral, validarBeneficiarioCompleto]);

  const handleConsultaIndividual = useCallback(async (type: AdminIntegrationType) => {
    if (!searchNIF && type !== 'catastro' && type !== 'sigpac') return;
    
    switch (type) {
      case 'aeat':
        await consultarAEAT(searchNIF, 'certificado_corriente');
        break;
      case 'tgss':
        await consultarTGSS(searchNIF, 'certificado_corriente');
        break;
      case 'registro_mercantil':
        await consultarRegistroMercantil(searchNIF);
        break;
      case 'catastro':
        if (searchRefCatastral) {
          await consultarCatastro(searchRefCatastral);
        }
        break;
    }
  }, [searchNIF, searchRefCatastral, consultarAEAT, consultarTGSS, consultarRegistroMercantil, consultarCatastro]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Activo</Badge>;
      case 'inactive':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Inactivo</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Error</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className={cn(
      "transition-all duration-300 overflow-hidden",
      isExpanded ? "fixed inset-4 z-50 shadow-2xl" : "",
      className
    )}>
      <CardHeader className="pb-2 bg-gradient-to-r from-red-500/10 via-blue-500/10 to-green-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-blue-500">
              <Landmark className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Integraciones Administrativas
                <Badge variant="outline" className="text-xs">8F</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {lastRefresh 
                  ? `Actualizado ${formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}`
                  : 'Sincronizando...'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { fetchIntegrations(); fetchConsultaLogs(); }}
              disabled={isLoading}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8"
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn("pt-3", isExpanded ? "h-[calc(100%-80px)]" : "")}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mb-3">
            <TabsTrigger value="integraciones" className="text-xs">
              <Building2 className="h-3 w-3 mr-1" />
              Servicios
            </TabsTrigger>
            <TabsTrigger value="consulta" className="text-xs">
              <Search className="h-3 w-3 mr-1" />
              Consulta
            </TabsTrigger>
            <TabsTrigger value="validacion" className="text-xs">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Validación
            </TabsTrigger>
            <TabsTrigger value="historial" className="text-xs">
              <History className="h-3 w-3 mr-1" />
              Historial
            </TabsTrigger>
          </TabsList>

          {/* TAB: Integraciones */}
          <TabsContent value="integraciones" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[350px]"}>
              {error ? (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  {error}
                </div>
              ) : (
                <div className="grid gap-3">
                  {integrations.map((integration) => (
                    <div 
                      key={integration.id} 
                      className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg bg-gradient-to-br text-white",
                            INTEGRATION_COLORS[integration.type]
                          )}>
                            {INTEGRATION_ICONS[integration.type]}
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">{integration.name}</h4>
                            <p className="text-xs text-muted-foreground">{integration.description}</p>
                          </div>
                        </div>
                        {getStatusBadge(integration.status)}
                      </div>
                      
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div className="p-2 rounded bg-muted/50">
                          <span className="text-muted-foreground">Consultas</span>
                          <p className="font-medium">{integration.stats?.totalQueries || 0}</p>
                        </div>
                        <div className="p-2 rounded bg-muted/50">
                          <span className="text-muted-foreground">Éxito</span>
                          <p className="font-medium">{integration.stats?.successRate?.toFixed(1) || 0}%</p>
                        </div>
                        <div className="p-2 rounded bg-muted/50">
                          <span className="text-muted-foreground">Tiempo</span>
                          <p className="font-medium">{integration.stats?.avgResponseTime || 0}ms</p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {integration.lastSync 
                            ? `Última sync: ${formatDistanceToNow(new Date(integration.lastSync), { locale: es, addSuffix: true })}`
                            : 'Sin sincronizar'
                          }
                        </span>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          <Settings className="h-3 w-3 mr-1" />
                          Configurar
                        </Button>
                      </div>
                    </div>
                  ))}

                  {integrations.length === 0 && !isLoading && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Cargando integraciones...</p>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* TAB: Consulta */}
          <TabsContent value="consulta" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[350px]"}>
              <div className="space-y-4">
                <div className="p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-medium text-sm mb-3">Consulta Individual</h4>
                  
                  <div className="grid gap-3">
                    <div>
                      <Label className="text-xs">NIF/CIF Beneficiario</Label>
                      <Input 
                        value={searchNIF}
                        onChange={(e) => setSearchNIF(e.target.value.toUpperCase())}
                        placeholder="B12345678"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs">Referencia Catastral (opcional)</Label>
                      <Input 
                        value={searchRefCatastral}
                        onChange={(e) => setSearchRefCatastral(e.target.value.toUpperCase())}
                        placeholder="1234567AB1234C0001XY"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleConsultaIndividual('aeat')}
                    disabled={!searchNIF || isLoading}
                    className="justify-start"
                  >
                    <Landmark className="h-4 w-4 mr-2 text-red-500" />
                    AEAT
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleConsultaIndividual('tgss')}
                    disabled={!searchNIF || isLoading}
                    className="justify-start"
                  >
                    <ShieldCheck className="h-4 w-4 mr-2 text-blue-500" />
                    TGSS
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleConsultaIndividual('registro_mercantil')}
                    disabled={!searchNIF || isLoading}
                    className="justify-start"
                  >
                    <Building2 className="h-4 w-4 mr-2 text-purple-500" />
                    Registro Mercantil
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleConsultaIndividual('catastro')}
                    disabled={!searchRefCatastral || isLoading}
                    className="justify-start"
                  >
                    <MapPin className="h-4 w-4 mr-2 text-green-500" />
                    Catastro
                  </Button>
                </div>

                <div className="p-3 rounded-lg border bg-card text-center">
                  <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">
                    Selecciona un servicio para realizar una consulta individual
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB: Validación */}
          <TabsContent value="validacion" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[350px]"}>
              <div className="space-y-4">
                <div className="p-4 rounded-lg border bg-gradient-to-br from-primary/5 to-accent/5">
                  <h4 className="font-medium text-sm mb-1 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Validación Completa de Beneficiario
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Consulta cruzada AEAT + TGSS + Registro Mercantil + Catastro + BDNS
                  </p>

                  <div className="grid gap-3">
                    <div>
                      <Label className="text-xs">NIF/CIF Beneficiario *</Label>
                      <Input 
                        value={searchNIF}
                        onChange={(e) => setSearchNIF(e.target.value.toUpperCase())}
                        placeholder="B12345678"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs">Referencia Catastral (opcional)</Label>
                      <Input 
                        value={searchRefCatastral}
                        onChange={(e) => setSearchRefCatastral(e.target.value.toUpperCase())}
                        placeholder="1234567AB1234C0001XY"
                        className="mt-1"
                      />
                    </div>

                    <Button 
                      onClick={handleValidacionCompleta}
                      disabled={!searchNIF || isValidating}
                      className="w-full"
                    >
                      {isValidating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Validando...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          Ejecutar Validación Completa
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {validationResult && (
                  <div className="space-y-3">
                    <div className={cn(
                      "p-4 rounded-lg border",
                      (validationResult as { validacionGlobal?: { apto?: boolean } }).validacionGlobal?.apto 
                        ? "bg-green-500/10 border-green-500/30" 
                        : "bg-red-500/10 border-red-500/30"
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">Resultado Global</h4>
                        {(validationResult as { validacionGlobal?: { apto?: boolean } }).validacionGlobal?.apto ? (
                          <Badge className="bg-green-500/20 text-green-400">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            APTO
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            NO APTO
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Puntuación:</span>
                        <Progress 
                          value={(validationResult as { validacionGlobal?: { puntuacion?: number } }).validacionGlobal?.puntuacion || 0} 
                          className="flex-1 h-2" 
                        />
                        <span className="text-sm font-medium">
                          {(validationResult as { validacionGlobal?: { puntuacion?: number } }).validacionGlobal?.puntuacion || 0}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries((validationResult as { resultados?: Record<string, unknown> }).resultados || {}).map(([key, value]) => {
                        const result = value as { consultado?: boolean; corrienteObligaciones?: boolean; corrientePagos?: boolean; situacionActiva?: boolean; propiedadVerificada?: boolean };
                        const isOk = result.corrienteObligaciones || result.corrientePagos || result.situacionActiva || result.propiedadVerificada;
                        return (
                          <div 
                            key={key}
                            className={cn(
                              "p-2 rounded border text-xs",
                              isOk ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium uppercase">{key}</span>
                              {isOk ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-500" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {(validationResult as { recomendaciones?: string[] }).recomendaciones && (validationResult as { recomendaciones?: string[] }).recomendaciones!.length > 0 && (
                      <div className="p-3 rounded-lg border bg-amber-500/5 border-amber-500/20">
                        <h5 className="text-xs font-medium mb-2 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                          Recomendaciones
                        </h5>
                        <ul className="text-xs space-y-1">
                          {(validationResult as { recomendaciones?: string[] }).recomendaciones!.map((rec: string, idx: number) => (
                            <li key={idx} className="text-muted-foreground">• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB: Historial */}
          <TabsContent value="historial" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[350px]"}>
              <div className="space-y-2">
                {consultaLogs.map((log) => (
                  <div 
                    key={log.id}
                    className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "p-1 rounded",
                          INTEGRATION_COLORS[log.integrationType] ? `bg-gradient-to-br ${INTEGRATION_COLORS[log.integrationType]}` : 'bg-muted'
                        )}>
                          {INTEGRATION_ICONS[log.integrationType] || <Activity className="h-3 w-3" />}
                        </div>
                        <span className="text-xs font-medium uppercase">{log.integrationType}</span>
                      </div>
                      <Badge 
                        variant={log.status === 'success' ? 'default' : log.status === 'error' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {log.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{log.queryType}</p>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>{log.responseTime}ms</span>
                      <span>{formatDistanceToNow(new Date(log.timestamp), { locale: es, addSuffix: true })}</span>
                    </div>
                  </div>
                ))}

                {consultaLogs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Sin consultas recientes</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default GaliaAdminIntegrationsPanel;
