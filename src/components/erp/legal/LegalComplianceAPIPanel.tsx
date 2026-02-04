/**
 * Legal Compliance API Panel - Fase 10
 * API de consulta legal para otros módulos ERP
 * Endpoint central para validaciones de compliance en tiempo real
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Code2, 
  Webhook,
  Activity,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Copy,
  ExternalLink,
  BarChart3,
  TrendingUp,
  Zap,
  Shield,
  FileJson,
  Terminal,
  Play,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface LegalComplianceAPIPanelProps {
  companyId: string;
}

interface APIEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT';
  path: string;
  description: string;
  category: string;
  rateLimit: string;
  latencyAvg: number;
  callsToday: number;
  successRate: number;
}

interface APICall {
  id: string;
  endpoint: string;
  method: string;
  module: string;
  status: 'success' | 'error' | 'pending';
  responseTime: number;
  timestamp: string;
  requestBody?: string;
  responseBody?: string;
}

interface APIMetrics {
  totalCallsToday: number;
  avgResponseTime: number;
  successRate: number;
  activeModules: number;
}

export function LegalComplianceAPIPanel({ companyId }: LegalComplianceAPIPanelProps) {
  const [activeTab, setActiveTab] = useState('endpoints');
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([]);
  const [recentCalls, setRecentCalls] = useState<APICall[]>([]);
  const [metrics, setMetrics] = useState<APIMetrics>({
    totalCallsToday: 0,
    avgResponseTime: 0,
    successRate: 0,
    activeModules: 0
  });
  const [testEndpoint, setTestEndpoint] = useState('');
  const [testResponse, setTestResponse] = useState('');

  // Demo endpoints
  const demoEndpoints: APIEndpoint[] = [
    {
      id: '1',
      method: 'POST',
      path: '/api/legal/validate-operation',
      description: 'Valida una operación antes de su ejecución',
      category: 'Validation',
      rateLimit: '100/min',
      latencyAvg: 45,
      callsToday: 234,
      successRate: 99.1
    },
    {
      id: '2',
      method: 'POST',
      path: '/api/legal/check-compliance',
      description: 'Verifica compliance de una entidad o proceso',
      category: 'Compliance',
      rateLimit: '50/min',
      latencyAvg: 120,
      callsToday: 156,
      successRate: 98.7
    },
    {
      id: '3',
      method: 'GET',
      path: '/api/legal/risk-assessment',
      description: 'Obtiene evaluación de riesgo legal',
      category: 'Risk',
      rateLimit: '100/min',
      latencyAvg: 85,
      callsToday: 89,
      successRate: 100
    },
    {
      id: '4',
      method: 'POST',
      path: '/api/legal/document-review',
      description: 'Solicita revisión legal de documento',
      category: 'Documents',
      rateLimit: '20/min',
      latencyAvg: 2500,
      callsToday: 23,
      successRate: 95.6
    },
    {
      id: '5',
      method: 'GET',
      path: '/api/legal/jurisdiction-rules',
      description: 'Obtiene reglas por jurisdicción',
      category: 'Reference',
      rateLimit: '200/min',
      latencyAvg: 25,
      callsToday: 412,
      successRate: 100
    },
    {
      id: '6',
      method: 'POST',
      path: '/api/legal/contract-analysis',
      description: 'Análisis IA de cláusulas contractuales',
      category: 'Analysis',
      rateLimit: '10/min',
      latencyAvg: 5000,
      callsToday: 12,
      successRate: 91.6
    }
  ];

  // Demo recent calls
  const demoRecentCalls: APICall[] = [
    {
      id: '1',
      endpoint: '/api/legal/validate-operation',
      method: 'POST',
      module: 'HR',
      status: 'success',
      responseTime: 42,
      timestamp: new Date(Date.now() - 120000).toISOString(),
      requestBody: '{"operation": "termination", "employeeId": "EMP-123"}',
      responseBody: '{"valid": true, "riskLevel": "high", "requiredApproval": true}'
    },
    {
      id: '2',
      endpoint: '/api/legal/check-compliance',
      method: 'POST',
      module: 'Fiscal',
      status: 'success',
      responseTime: 98,
      timestamp: new Date(Date.now() - 300000).toISOString()
    },
    {
      id: '3',
      endpoint: '/api/legal/document-review',
      method: 'POST',
      module: 'Contracts',
      status: 'pending',
      responseTime: 0,
      timestamp: new Date(Date.now() - 60000).toISOString()
    },
    {
      id: '4',
      endpoint: '/api/legal/validate-operation',
      method: 'POST',
      module: 'Treasury',
      status: 'error',
      responseTime: 15,
      timestamp: new Date(Date.now() - 600000).toISOString()
    }
  ];

  useEffect(() => {
    setEndpoints(demoEndpoints);
    setRecentCalls(demoRecentCalls);
    setMetrics({
      totalCallsToday: demoEndpoints.reduce((sum, e) => sum + e.callsToday, 0),
      avgResponseTime: Math.round(demoEndpoints.reduce((sum, e) => sum + e.latencyAvg, 0) / demoEndpoints.length),
      successRate: 98.2,
      activeModules: 4
    });
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  const runTestCall = () => {
    if (!testEndpoint) {
      toast.error('Selecciona un endpoint');
      return;
    }
    setTestResponse(JSON.stringify({
      success: true,
      data: {
        validation: 'passed',
        riskLevel: 'low',
        compliance: true,
        recommendations: []
      },
      metadata: {
        responseTime: '45ms',
        timestamp: new Date().toISOString()
      }
    }, null, 2));
    toast.success('Test ejecutado');
  };

  const getMethodBadge = (method: string) => {
    const colors = {
      GET: 'bg-green-500/10 text-green-600',
      POST: 'bg-blue-500/10 text-blue-600',
      PUT: 'bg-yellow-500/10 text-yellow-600'
    };
    return (
      <Badge variant="outline" className={colors[method as keyof typeof colors] || colors.GET}>
        {method}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      success: <CheckCircle className="h-4 w-4 text-green-500" />,
      error: <XCircle className="h-4 w-4 text-red-500" />,
      pending: <Clock className="h-4 w-4 text-blue-500" />
    };
    return icons[status as keyof typeof icons] || icons.pending;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 border-cyan-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
                <Code2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  Legal Compliance API
                  <Badge className="bg-green-500/20 text-green-600">
                    <Zap className="h-3 w-3 mr-1" />
                    Online
                  </Badge>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Endpoints de validación legal para integración con módulos ERP
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <FileJson className="h-4 w-4 mr-2" />
                OpenAPI Spec
              </Button>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Docs
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.totalCallsToday.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Llamadas hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Zap className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.avgResponseTime}ms</p>
                <p className="text-xs text-muted-foreground">Latencia media</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.successRate}%</p>
                <p className="text-xs text-muted-foreground">Tasa de éxito</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Webhook className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.activeModules}</p>
                <p className="text-xs text-muted-foreground">Módulos conectados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="playground">Playground</TabsTrigger>
        </TabsList>

        {/* Endpoints Tab */}
        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Endpoints Disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {endpoints.map((endpoint) => (
                  <div key={endpoint.id} className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getMethodBadge(endpoint.method)}
                          <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                            {endpoint.path}
                          </code>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(endpoint.path)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            {endpoint.category}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {endpoint.latencyAvg}ms avg
                          </span>
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {endpoint.callsToday} calls today
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {endpoint.successRate}% success
                          </span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {endpoint.rateLimit}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Llamadas Recientes</CardTitle>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {recentCalls.map((call) => (
                    <div key={call.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(call.status)}
                          <div>
                            <div className="flex items-center gap-2">
                              {getMethodBadge(call.method)}
                              <code className="text-xs font-mono">{call.endpoint}</code>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Módulo: {call.module} · 
                              {call.responseTime > 0 && ` ${call.responseTime}ms · `}
                              {formatDistanceToNow(new Date(call.timestamp), { locale: es, addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Playground Tab */}
        <TabsContent value="playground" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                API Playground
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <select 
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                    value={testEndpoint}
                    onChange={(e) => setTestEndpoint(e.target.value)}
                  >
                    <option value="">Seleccionar endpoint...</option>
                    {endpoints.map((ep) => (
                      <option key={ep.id} value={ep.path}>
                        {ep.method} {ep.path}
                      </option>
                    ))}
                  </select>
                  <Button onClick={runTestCall}>
                    <Play className="h-4 w-4 mr-2" />
                    Ejecutar
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Request Body</p>
                    <textarea 
                      className="w-full h-48 rounded-md border bg-muted/50 p-3 font-mono text-xs"
                      placeholder='{"key": "value"}'
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Response</p>
                    <pre className="w-full h-48 rounded-md border bg-muted/50 p-3 font-mono text-xs overflow-auto">
                      {testResponse || '// Response will appear here'}
                    </pre>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Fix missing import
const Eye = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

export default LegalComplianceAPIPanel;
