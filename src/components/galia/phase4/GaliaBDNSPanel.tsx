/**
 * GaliaBDNSPanel - Panel de interoperabilidad con BDNS
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Database, 
  Search, 
  RefreshCw, 
  Upload, 
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  User,
  FileText,
  Calendar
} from 'lucide-react';
import { useGaliaBDNS, BDNSConvocatoria } from '@/hooks/galia/useGaliaBDNS';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface GaliaBDNSPanelProps {
  className?: string;
  expedienteId?: string;
}

export function GaliaBDNSPanel({ className, expedienteId }: GaliaBDNSPanelProps) {
  const [activeTab, setActiveTab] = useState('search');
  const [searchText, setSearchText] = useState('');
  const [nifToValidate, setNifToValidate] = useState('');

  const {
    isLoading,
    error,
    searchResults,
    convocatoriaDetalle,
    syncResult,
    beneficiarioValidation,
    exportResult,
    searchConvocatorias,
    getConvocatoria,
    syncExpediente,
    validateBeneficiario,
    exportToBDNS,
  } = useGaliaBDNS();

  const handleSearch = useCallback(async () => {
    if (searchText.trim()) {
      await searchConvocatorias({ texto: searchText });
    }
  }, [searchText, searchConvocatorias]);

  const handleSync = useCallback(async () => {
    if (expedienteId) {
      await syncExpediente(expedienteId);
    }
  }, [expedienteId, syncExpediente]);

  const handleValidate = useCallback(async () => {
    if (nifToValidate.trim()) {
      await validateBeneficiario(nifToValidate);
    }
  }, [nifToValidate, validateBeneficiario]);

  const handleExport = useCallback(async () => {
    if (expedienteId) {
      await exportToBDNS(expedienteId);
    }
  }, [expedienteId, exportToBDNS]);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'abierta': return <Badge className="bg-green-100 text-green-700">Abierta</Badge>;
      case 'cerrada': return <Badge variant="secondary">Cerrada</Badge>;
      case 'resuelta': return <Badge className="bg-blue-100 text-blue-700">Resuelta</Badge>;
      default: return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const getValidationIcon = (estado: string) => {
    switch (estado) {
      case 'ok': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'ko': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pendiente': return <RefreshCw className="h-4 w-4 text-yellow-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
            <Database className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">BDNS</CardTitle>
            <p className="text-xs text-muted-foreground">Base de Datos Nacional de Subvenciones</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="search" className="text-xs">Buscar</TabsTrigger>
            <TabsTrigger value="validate" className="text-xs">Validar</TabsTrigger>
            <TabsTrigger value="sync" className="text-xs">Sincronizar</TabsTrigger>
            <TabsTrigger value="export" className="text-xs">Exportar</TabsTrigger>
          </TabsList>

          {/* Búsqueda de Convocatorias */}
          <TabsContent value="search" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Buscar convocatorias..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            <ScrollArea className="h-[350px]">
              {searchResults?.resultados && searchResults.resultados.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.resultados.map((conv: BDNSConvocatoria) => (
                    <div key={conv.codigoBDNS} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm line-clamp-2">{conv.titulo}</p>
                          <p className="text-xs text-muted-foreground mt-1">{conv.organoConvocante}</p>
                        </div>
                        {getEstadoBadge(conv.estado)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {conv.codigoBDNS}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(conv.fechaFinSolicitudes).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => getConvocatoria(conv.codigoBDNS)}
                        >
                          Ver detalle
                        </Button>
                        {conv.enlaceBDNS && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => window.open(conv.enlaceBDNS, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            BDNS
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Busca convocatorias en BDNS</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Validación de Beneficiario */}
          <TabsContent value="validate" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nif">NIF/CIF del beneficiario</Label>
              <div className="flex gap-2">
                <Input
                  id="nif"
                  placeholder="Ej: 12345678A"
                  value={nifToValidate}
                  onChange={(e) => setNifToValidate(e.target.value.toUpperCase())}
                />
                <Button onClick={handleValidate} disabled={isLoading || !nifToValidate}>
                  {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {beneficiarioValidation && (
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {/* Resultado */}
                  <div className={cn(
                    "p-4 rounded-lg border",
                    beneficiarioValidation.validacion.resultado === 'valido' && "bg-green-50 border-green-200 dark:bg-green-900/20",
                    beneficiarioValidation.validacion.resultado === 'invalido' && "bg-red-50 border-red-200 dark:bg-red-900/20",
                    beneficiarioValidation.validacion.resultado === 'con_reservas' && "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      {beneficiarioValidation.validacion.resultado === 'valido' && <CheckCircle className="h-5 w-5 text-green-600" />}
                      {beneficiarioValidation.validacion.resultado === 'invalido' && <XCircle className="h-5 w-5 text-red-600" />}
                      {beneficiarioValidation.validacion.resultado === 'con_reservas' && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
                      <span className="font-medium">{beneficiarioValidation.validacion.nombreBeneficiario}</span>
                    </div>
                    <p className="text-sm">{beneficiarioValidation.motivoRecomendacion}</p>
                  </div>

                  {/* Checks */}
                  <div className="space-y-2">
                    {beneficiarioValidation.validacion.checks.map((check, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded border bg-card">
                        <span className="text-sm">{check.tipo}</span>
                        <div className="flex items-center gap-2">
                          {getValidationIcon(check.estado)}
                          <span className="text-xs text-muted-foreground">{check.detalle}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Minimis */}
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-medium mb-2">Ayudas Minimis</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Recibido (3 años):</span>
                        <span className="ml-2 font-medium">
                          {beneficiarioValidation.validacion.minimis.importeRecibido3Anos.toLocaleString()}€
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Disponible:</span>
                        <span className="ml-2 font-medium text-green-600">
                          {beneficiarioValidation.validacion.minimis.limiteDisponible.toLocaleString()}€
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Sincronización */}
          <TabsContent value="sync" className="space-y-4">
            {expedienteId ? (
              <>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground mb-2">Expediente seleccionado:</p>
                  <p className="font-mono font-medium">{expedienteId}</p>
                </div>

                <Button onClick={handleSync} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Sincronizar con BDNS
                    </>
                  )}
                </Button>

                {syncResult && (
                  <div className={cn(
                    "p-4 rounded-lg border",
                    syncResult.sincronizacion.estado === 'sincronizado' && "bg-green-50 border-green-200 dark:bg-green-900/20",
                    syncResult.sincronizacion.estado === 'error' && "bg-red-50 border-red-200 dark:bg-red-900/20",
                    syncResult.sincronizacion.estado === 'pendiente' && "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20"
                  )}>
                    <div className="flex items-center gap-2 mb-3">
                      {syncResult.sincronizacion.estado === 'sincronizado' && <CheckCircle className="h-5 w-5 text-green-600" />}
                      {syncResult.sincronizacion.estado === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
                      {syncResult.sincronizacion.estado === 'pendiente' && <RefreshCw className="h-5 w-5 text-yellow-600" />}
                      <span className="font-medium capitalize">{syncResult.sincronizacion.estado}</span>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-muted-foreground">Código BDNS:</span>{' '}
                        {syncResult.sincronizacion.codigoBDNSConcesion}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Fecha:</span>{' '}
                        {new Date(syncResult.sincronizacion.fechaSincronizacion).toLocaleString()}
                      </p>
                    </div>

                    {syncResult.errores.length > 0 && (
                      <div className="mt-3 p-2 bg-red-100 rounded text-sm text-red-700">
                        {syncResult.errores.map((err, i) => <p key={i}>• {err}</p>)}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Upload className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Selecciona un expediente para sincronizar</p>
              </div>
            )}
          </TabsContent>

          {/* Exportación */}
          <TabsContent value="export" className="space-y-4">
            {expedienteId ? (
              <>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground mb-2">Expediente seleccionado:</p>
                  <p className="font-mono font-medium">{expedienteId}</p>
                </div>

                <Button onClick={handleExport} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar a formato BDNS
                    </>
                  )}
                </Button>

                {exportResult && (
                  <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Exportación generada</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-muted-foreground">Formato:</span>{' '}
                        <Badge variant="outline">{exportResult.exportacion.formato.toUpperCase()}</Badge>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Registros:</span>{' '}
                        {exportResult.exportacion.registros}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <a href={exportResult.exportacion.urlDescarga} download>
                        <Download className="h-3 w-3 mr-1" />
                        Descargar
                      </a>
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Download className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Selecciona un expediente para exportar</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GaliaBDNSPanel;
