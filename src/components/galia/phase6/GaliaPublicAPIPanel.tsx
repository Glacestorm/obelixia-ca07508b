/**
 * GaliaPublicAPIPanel - Public API Documentation & Testing UI
 * 
 * REST/GraphQL API explorer for third-party integrations.
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Globe,
  Code,
  Book,
  Play,
  Copy,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Loader2,
  Terminal,
  FileJson,
  Key,
  BarChart3,
  FileText,
  Search
} from 'lucide-react';
import { useGaliaPublicAPI } from '@/hooks/galia/useGaliaPublicAPI';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface GaliaPublicAPIPanelProps {
  className?: string;
}

export function GaliaPublicAPIPanel({ className }: GaliaPublicAPIPanelProps) {
  const [activeTab, setActiveTab] = useState('docs');
  const [testEndpoint, setTestEndpoint] = useState('convocatorias');
  const [testResult, setTestResult] = useState<unknown>(null);
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  const {
    isLoading,
    error,
    getConvocatorias,
    getExpedienteStatus,
    checkEligibility,
    getGlobalStats,
    getOpenAPISpec
  } = useGaliaPublicAPI();

  const baseUrl = 'https://avaugfnqvvqcilhiudlf.supabase.co/functions/v1/galia-public-api';

  const endpoints = [
    {
      method: 'GET',
      path: '/convocatorias',
      description: 'Lista de convocatorias activas',
      example: `curl "${baseUrl}/convocatorias"`,
      color: 'bg-green-100 text-green-800'
    },
    {
      method: 'GET',
      path: '/convocatorias/:id',
      description: 'Detalle de una convocatoria',
      example: `curl "${baseUrl}/convocatorias/CONV-2024-001"`,
      color: 'bg-green-100 text-green-800'
    },
    {
      method: 'GET',
      path: '/expedientes/:codigo',
      description: 'Estado de un expediente',
      example: `curl "${baseUrl}/expedientes/EXP-2024-0001"`,
      color: 'bg-green-100 text-green-800'
    },
    {
      method: 'POST',
      path: '/expedientes/check-eligibility',
      description: 'Verificar elegibilidad',
      example: `curl -X POST "${baseUrl}/expedientes/check-eligibility" \\
  -H "Content-Type: application/json" \\
  -d '{"nif":"12345678A","tipoProyecto":"turismo","presupuesto":50000,"territorio":"rural"}'`,
      color: 'bg-blue-100 text-blue-800'
    },
    {
      method: 'GET',
      path: '/stats/global',
      description: 'Estadísticas globales',
      example: `curl "${baseUrl}/stats/global"`,
      color: 'bg-green-100 text-green-800'
    },
    {
      method: 'GET',
      path: '/stats/gal/:codigo',
      description: 'Estadísticas por GAL',
      example: `curl "${baseUrl}/stats/gal/GAL-ASTURIAS-001"`,
      color: 'bg-green-100 text-green-800'
    },
    {
      method: 'GET',
      path: '/docs/openapi',
      description: 'Especificación OpenAPI 3.0',
      example: `curl "${baseUrl}/docs/openapi"`,
      color: 'bg-green-100 text-green-800'
    }
  ];

  const handleTest = useCallback(async () => {
    let result;
    switch (testEndpoint) {
      case 'convocatorias':
        result = await getConvocatorias(5);
        break;
      case 'stats':
        result = await getGlobalStats();
        break;
      case 'openapi':
        result = await getOpenAPISpec();
        break;
      default:
        result = await getConvocatorias();
    }
    setTestResult(result);
  }, [testEndpoint, getConvocatorias, getGlobalStats, getOpenAPISpec]);

  const copyToClipboard = useCallback((text: string, endpoint: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(endpoint);
    toast.success('Copiado al portapapeles');
    setTimeout(() => setCopiedEndpoint(null), 2000);
  }, []);

  return (
    <Card className={cn("border-2 border-primary/20", className)}>
      <CardHeader className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-pink-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                API Pública GALIA
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  OpenAPI 3.0
                </Badge>
              </CardTitle>
              <CardDescription>
                REST API para integraciones de terceros
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            v1.0.0
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="docs" className="text-xs">
              <Book className="h-3 w-3 mr-1" />
              Docs
            </TabsTrigger>
            <TabsTrigger value="endpoints" className="text-xs">
              <Code className="h-3 w-3 mr-1" />
              Endpoints
            </TabsTrigger>
            <TabsTrigger value="test" className="text-xs">
              <Play className="h-3 w-3 mr-1" />
              Probar
            </TabsTrigger>
            <TabsTrigger value="auth" className="text-xs">
              <Key className="h-3 w-3 mr-1" />
              Auth
            </TabsTrigger>
          </TabsList>

          <TabsContent value="docs" className="mt-4 space-y-4">
            <div className="p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg">
              <h4 className="font-medium mb-2">Bienvenido a la API GALIA</h4>
              <p className="text-sm text-muted-foreground mb-4">
                API REST pública para consultar información sobre ayudas LEADER.
                Diseñada para integraciones con gestores, contabilidad y portales.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <FileJson className="h-4 w-4 mr-2" />
                  OpenAPI Spec
                </Button>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Postman Collection
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <FileText className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-xs font-medium">Convocatorias</p>
                <p className="text-xs text-muted-foreground">Consultar ayudas</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <Search className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-xs font-medium">Expedientes</p>
                <p className="text-xs text-muted-foreground">Estado solicitudes</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <BarChart3 className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-xs font-medium">Estadísticas</p>
                <p className="text-xs text-muted-foreground">KPIs públicos</p>
              </div>
            </div>

            <Alert>
              <Terminal className="h-4 w-4" />
              <AlertTitle>Base URL</AlertTitle>
              <AlertDescription>
                <code className="text-xs bg-muted px-2 py-1 rounded block mt-1 overflow-auto">
                  {baseUrl}
                </code>
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="endpoints" className="mt-4">
            <ScrollArea className="h-[350px]">
              <div className="space-y-3">
                {endpoints.map((endpoint, idx) => (
                  <div 
                    key={idx}
                    className="p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-xs", endpoint.color)}>
                          {endpoint.method}
                        </Badge>
                        <code className="text-sm font-mono">{endpoint.path}</code>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(endpoint.example, endpoint.path)}
                      >
                        {copiedEndpoint === endpoint.path ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {endpoint.description}
                    </p>
                    <div className="bg-muted/50 p-2 rounded text-xs font-mono overflow-x-auto">
                      <pre className="whitespace-pre-wrap">{endpoint.example}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="test" className="mt-4 space-y-4">
            <div className="flex gap-2">
              <select 
                value={testEndpoint}
                onChange={(e) => setTestEndpoint(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
              >
                <option value="convocatorias">GET /convocatorias</option>
                <option value="stats">GET /stats/global</option>
                <option value="openapi">GET /docs/openapi</option>
              </select>
              <Button onClick={handleTest} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium">Respuesta</span>
                {testResult && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6"
                    onClick={() => copyToClipboard(JSON.stringify(testResult, null, 2), 'result')}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copiar
                  </Button>
                )}
              </div>
              <ScrollArea className="h-[200px]">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {testResult 
                    ? JSON.stringify(testResult, null, 2) 
                    : '// Ejecuta una petición para ver el resultado'
                  }
                </pre>
              </ScrollArea>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="auth" className="mt-4 space-y-4">
            <Alert>
              <Key className="h-4 w-4" />
              <AlertTitle>Autenticación</AlertTitle>
              <AlertDescription className="text-xs">
                La API pública no requiere autenticación para endpoints de consulta.
                Para operaciones de escritura, se requiere un API Key.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-medium text-sm">Niveles de Acceso</h4>
              
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-green-100 text-green-800">Público</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sin autenticación. Acceso a convocatorias, estadísticas públicas y documentación.
                </p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-blue-100 text-blue-800">Ciudadano</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Token JWT de ciudadano. Acceso a sus propios expedientes y elegibilidad.
                </p>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-purple-100 text-purple-800">Integrador</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  API Key de integrador. Acceso a endpoints de lotes y webhooks.
                </p>
              </div>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Ejemplo con API Key</h4>
              <code className="text-xs block overflow-x-auto">
                curl -H "Authorization: Bearer YOUR_API_KEY" \<br/>
                &nbsp;&nbsp;"{baseUrl}/integrations/batch"
              </code>
            </div>

            <Button variant="outline" className="w-full">
              <Key className="h-4 w-4 mr-2" />
              Solicitar API Key de Integrador
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default GaliaPublicAPIPanel;
