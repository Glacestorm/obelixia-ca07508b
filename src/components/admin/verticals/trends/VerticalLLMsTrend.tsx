/**
 * VerticalLLMsTrend - Tendencia #5: Vertical LLMs Fine-tuned
 * Implementación completa con datos de ejemplo
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Brain, 
  Sparkles, 
  Target,
  TrendingUp,
  Zap,
  MessageSquare,
  Settings,
  BarChart3,
  RefreshCw,
  CheckCircle2,
  Clock,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Modelos verticales disponibles
const VERTICAL_LLMS = [
  {
    id: 'llm-healthcare',
    name: 'HealthcareLLM',
    vertical: 'Healthcare',
    icon: '🏥',
    status: 'active',
    baseModel: 'Gemini 2.5 Flash',
    fineTuned: true,
    accuracy: 96.8,
    specializations: ['Diagnóstico', 'Farmacología', 'Historial clínico', 'Codificación CIE-10'],
    trainingData: '2.3M documentos médicos',
    lastFineTune: '2024-01-20',
    usage: { queries: 12450, avgLatency: '340ms' },
    prompts: 156,
  },
  {
    id: 'llm-accounting',
    name: 'AccountingLLM',
    vertical: 'Finance',
    icon: '📊',
    status: 'active',
    baseModel: 'GPT-5 Mini',
    fineTuned: true,
    accuracy: 97.2,
    specializations: ['NIIF/NIC', 'PGC Español', 'Fiscalidad', 'Auditoría'],
    trainingData: '890K asientos contables',
    lastFineTune: '2024-01-18',
    usage: { queries: 8920, avgLatency: '280ms' },
    prompts: 89,
  },
  {
    id: 'llm-agriculture',
    name: 'AgriLLM',
    vertical: 'Agriculture',
    icon: '🌾',
    status: 'training',
    baseModel: 'Gemini 2.5 Pro',
    fineTuned: false,
    accuracy: 89.4,
    specializations: ['Cultivos', 'Climatología', 'Fitosanidad', 'PAC/Subvenciones'],
    trainingData: '450K registros agrícolas',
    lastFineTune: 'En progreso...',
    usage: { queries: 3210, avgLatency: '520ms' },
    prompts: 45,
    trainingProgress: 67,
  },
  {
    id: 'llm-industrial',
    name: 'IndustrialLLM',
    vertical: 'Industrial',
    icon: '🏭',
    status: 'active',
    baseModel: 'GPT-5',
    fineTuned: true,
    accuracy: 95.1,
    specializations: ['OEE', 'Mantenimiento', 'ISO 9001', 'Lean Manufacturing'],
    trainingData: '1.1M registros industriales',
    lastFineTune: '2024-01-15',
    usage: { queries: 5670, avgLatency: '390ms' },
    prompts: 72,
  },
  {
    id: 'llm-legal',
    name: 'LegalLLM',
    vertical: 'Legal',
    icon: '⚖️',
    status: 'planned',
    baseModel: 'GPT-5',
    fineTuned: false,
    accuracy: 0,
    specializations: ['Derecho mercantil', 'RGPD', 'Contratos', 'Litigios'],
    trainingData: 'Pendiente',
    lastFineTune: 'Planificado Q2 2024',
    usage: null,
    prompts: 0,
  },
];

const DEMO_CONVERSATION = [
  { role: 'user', content: '¿Cuál es el tratamiento de las provisiones según NIC 37?' },
  { role: 'assistant', content: 'Según la NIC 37, las provisiones deben reconocerse cuando:\n\n1. **Obligación presente**: La entidad tiene una obligación presente (legal o implícita)\n2. **Salida de recursos probable**: Es probable que haya salida de recursos\n3. **Estimación fiable**: Puede hacerse una estimación fiable del importe\n\n📊 **Medición**: Al valor presente de los desembolsos esperados.\n\n⚠️ **Importante**: No se reconocen provisiones para pérdidas futuras de operaciones.' },
];

export function VerticalLLMsTrend() {
  const [selectedLLM, setSelectedLLM] = useState(VERTICAL_LLMS[0]);
  const [testPrompt, setTestPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const activeModels = VERTICAL_LLMS.filter(m => m.status === 'active').length;
  const totalQueries = VERTICAL_LLMS.reduce((acc, m) => acc + (m.usage?.queries || 0), 0);
  const avgAccuracy = (VERTICAL_LLMS.filter(m => m.accuracy > 0).reduce((acc, m) => acc + m.accuracy, 0) / VERTICAL_LLMS.filter(m => m.accuracy > 0).length).toFixed(1);

  const handleTestPrompt = () => {
    if (!testPrompt.trim()) return;
    setIsLoading(true);
    setTimeout(() => {
      toast.success('Respuesta generada correctamente');
      setIsLoading(false);
    }, 1500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500">Activo</Badge>;
      case 'training': return <Badge className="bg-blue-500">Entrenando</Badge>;
      case 'planned': return <Badge variant="outline">Planificado</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4 text-center">
            <Brain className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{activeModels}</p>
            <p className="text-xs text-muted-foreground">Modelos Activos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{(totalQueries / 1000).toFixed(1)}k</p>
            <p className="text-xs text-muted-foreground">Consultas Totales</p>
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
            <Database className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{VERTICAL_LLMS.reduce((acc, m) => acc + m.prompts, 0)}</p>
            <p className="text-xs text-muted-foreground">Prompts Especializados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LLM List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Modelos Verticales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {VERTICAL_LLMS.map((llm) => (
                  <div 
                    key={llm.id}
                    onClick={() => setSelectedLLM(llm)}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all",
                      selectedLLM.id === llm.id 
                        ? "border-primary bg-primary/5" 
                        : "hover:border-muted-foreground/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{llm.icon}</span>
                        <div>
                          <p className="font-medium text-sm">{llm.name}</p>
                          <p className="text-xs text-muted-foreground">{llm.vertical}</p>
                        </div>
                      </div>
                      {getStatusBadge(llm.status)}
                    </div>
                    
                    {llm.status === 'training' && llm.trainingProgress && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Fine-tuning</span>
                          <span>{llm.trainingProgress}%</span>
                        </div>
                        <Progress value={llm.trainingProgress} className="h-1.5" />
                      </div>
                    )}
                    
                    {llm.status === 'active' && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                        <span>Precisión: {llm.accuracy}%</span>
                        <span>{llm.usage?.avgLatency}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* LLM Detail */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-2xl">{selectedLLM.icon}</span>
                {selectedLLM.name}
              </CardTitle>
              {getStatusBadge(selectedLLM.status)}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="h-full">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">General</TabsTrigger>
                <TabsTrigger value="test">Probar</TabsTrigger>
                <TabsTrigger value="prompts">Prompts</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-0 space-y-4">
                {/* Model Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Modelo Base</p>
                    <p className="font-medium">{selectedLLM.baseModel}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Fine-tuned</p>
                    <p className="font-medium">{selectedLLM.fineTuned ? 'Sí' : 'No'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Datos de Entrenamiento</p>
                    <p className="font-medium">{selectedLLM.trainingData}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Último Fine-tune</p>
                    <p className="font-medium">{selectedLLM.lastFineTune}</p>
                  </div>
                </div>

                {/* Accuracy */}
                {selectedLLM.accuracy > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Precisión en dominio</span>
                      <span className="font-bold">{selectedLLM.accuracy}%</span>
                    </div>
                    <Progress value={selectedLLM.accuracy} className="h-2" />
                  </div>
                )}

                {/* Specializations */}
                <div>
                  <p className="text-sm font-medium mb-2">Especializaciones</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedLLM.specializations.map((spec, i) => (
                      <Badge key={i} variant="outline" className="gap-1">
                        <Sparkles className="h-3 w-3 text-primary" />
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Usage Stats */}
                {selectedLLM.usage && (
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-blue-500/10">
                      <CardContent className="p-3 text-center">
                        <p className="text-xl font-bold">{selectedLLM.usage.queries.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Consultas</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-500/10">
                      <CardContent className="p-3 text-center">
                        <p className="text-xl font-bold">{selectedLLM.usage.avgLatency}</p>
                        <p className="text-xs text-muted-foreground">Latencia Media</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="test" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Probar {selectedLLM.name}</p>
                  <Textarea 
                    placeholder={`Escribe una consulta para ${selectedLLM.vertical}...`}
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <Button 
                    onClick={handleTestPrompt} 
                    disabled={isLoading || !testPrompt.trim()}
                    className="w-full gap-2"
                  >
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    Generar Respuesta
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">Ejemplo de Conversación</p>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-3">
                      {DEMO_CONVERSATION.map((msg, i) => (
                        <div 
                          key={i}
                          className={cn(
                            "p-3 rounded-lg",
                            msg.role === 'user' 
                              ? "bg-primary/10 ml-8" 
                              : "bg-muted/50 mr-8"
                          )}
                        >
                          <p className="text-xs font-medium mb-1 text-muted-foreground">
                            {msg.role === 'user' ? 'Usuario' : selectedLLM.name}
                          </p>
                          <p className="text-sm whitespace-pre-line">{msg.content}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="prompts" className="mt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{selectedLLM.prompts} Prompts Especializados</p>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Settings className="h-3 w-3" />
                      Gestionar
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {['Análisis de normativa', 'Generación de informes', 'Resolución de dudas', 'Clasificación automática'].map((prompt, i) => (
                      <div key={i} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-sm">{prompt}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">Activo</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default VerticalLLMsTrend;
