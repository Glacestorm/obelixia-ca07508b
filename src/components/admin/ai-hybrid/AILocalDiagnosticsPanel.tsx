import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity,
  CheckCircle,
  XCircle,
  Cpu,
  Download,
  Play,
  RotateCw,
  Server,
  Zap,
} from 'lucide-react';
import { useLocalAIDiagnostics } from '@/hooks/admin/ai-hybrid/useLocalAIDiagnostics';
import { cn } from '@/lib/utils';

interface AILocalDiagnosticsPanelProps {
  endpointUrl: string;
}

export function AILocalDiagnosticsPanel({ endpointUrl }: AILocalDiagnosticsPanelProps) {
  const {
    endpoint,
    models,
    benchmarks,
    health,
    isLoading,
    isDiscovering,
    isBenchmarking,
    discoverEndpoint,
    listAvailableModels,
    benchmarkModel,
    monitorHealth,
    getRecommendedModels,
    installModel,
  } = useLocalAIDiagnostics();

  useEffect(() => {
    if (endpointUrl) {
      discoverEndpoint(endpointUrl);
      monitorHealth();
    }
  }, [endpointUrl]);

  const recommendedModels = getRecommendedModels();

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <div className="text-sm font-medium">Estado del Servicio</div>
              <Activity className={cn(
                "h-4 w-4",
                health?.status === 'healthy' ? "text-success" : 
                health?.status === 'degraded' ? "text-warning" : "text-destructive"
              )} />
            </div>
            <div className="text-2xl font-bold">
              {health?.status === 'healthy' ? 'Operativo' : 
               health?.status === 'degraded' ? 'Degradado' : 'Sin conexión'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Latencia: {health?.latencyMs || 0}ms | Versión: {health?.version || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <div className="text-sm font-medium">Modelos Instalados</div>
              <Server className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{models.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Detectados en {endpointUrl}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <div className="text-sm font-medium">Capacidad de Inferencia</div>
              <Zap className="h-4 w-4 text-warning" />
            </div>
            <div className="text-2xl font-bold">
              {benchmarks.length > 0 
                ? `${Math.round(benchmarks[0].tokensPerSecond)} t/s` 
                : '-'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Último benchmark (Llama 3.2)
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Installed Models */}
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Modelos Instalados</CardTitle>
                <CardDescription>Modelos disponibles para inferencia local</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => listAvailableModels(endpointUrl)}>
                <RotateCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {models.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                  <Server className="h-8 w-8 mb-2 opacity-20" />
                  <p>No se encontraron modelos instalados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {models.map((model) => (
                    <div key={model.digest} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {model.name}
                          <Badge variant="outline" className="text-[10px] h-5">
                            {model.parameterSize || 'Unknown'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {model.sizeFormatted} • {model.quantization || 'Q4_K_M'}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        disabled={isBenchmarking}
                        onClick={() => benchmarkModel(model.name)}
                      >
                        <Play className="h-3 w-3 mr-1" /> Test
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recommended Models */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">Modelos Recomendados</CardTitle>
            <CardDescription>Optimiza tu experiencia con estos modelos</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {recommendedModels.map((rec) => {
                  const isInstalled = models.some(m => m.name.includes(rec.id));
                  return (
                    <div key={rec.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div>
                        <div className="font-medium text-sm">{rec.name}</div>
                        <p className="text-xs text-muted-foreground mb-1">{rec.useCase}</p>
                        <div className="flex gap-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Cpu className="h-3 w-3" /> Min RAM: {rec.minRam}
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="h-3 w-3" /> Size: {rec.size}
                          </span>
                        </div>
                      </div>
                      {isInstalled ? (
                        <Badge variant="secondary" className="bg-success/10 text-success hover:bg-success/20">
                          <CheckCircle className="h-3 w-3 mr-1" /> Instalado
                        </Badge>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => installModel(rec.id)}
                        >
                          <Download className="h-3 w-3 mr-1" /> Instalar
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Benchmark Results */}
      {benchmarks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultados de Rendimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {benchmarks.map((bench, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{bench.modelId}</span>
                    <span className="text-muted-foreground">
                      {bench.tokensPerSecond.toFixed(1)} t/s
                    </span>
                  </div>
                  <Progress value={Math.min(100, (bench.tokensPerSecond / 100) * 100)} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>TTFT: {bench.timeToFirstTokenMs}ms</span>
                    <span>Total: {bench.totalTimeMs}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
