/**
 * ERPAIAssistantPanel - Asistente IA Especializado en Migración Contable
 * Chat interactivo, análisis predictivo y detección de anomalías
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  Send,
  Bot,
  User,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Brain,
  Lightbulb,
  Target,
  Loader2,
  RefreshCw,
  Clock,
  Zap,
  Shield,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ERPAIAssistantPanelProps {
  sessionId?: string;
  migrationId?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface AIAnalysis {
  successProbability: number;
  estimatedTime: string;
  potentialIssues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestion: string;
  }>;
  optimizations: string[];
}

interface Anomaly {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  affectedRecords: number;
  suggestedAction: string;
}

const QUICK_PROMPTS = [
  "¿Qué errores son más críticos de resolver?",
  "¿Cómo puedo mejorar la tasa de éxito?",
  "Explica los mapeos de cuentas sugeridos",
  "¿Hay anomalías contables detectadas?",
  "¿Cuánto tiempo tardará la migración?",
];

export function ERPAIAssistantPanel({ sessionId, migrationId }: ERPAIAssistantPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '¡Hola! Soy tu asistente especializado en migración contable. Puedo ayudarte con:\n\n• Análisis de errores y sugerencias de corrección\n• Explicación de mapeos de cuentas\n• Detección de anomalías contables\n• Optimización del proceso de migración\n\n¿En qué puedo ayudarte?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mock AI Analysis
  const [analysis] = useState<AIAnalysis>({
    successProbability: 94.5,
    estimatedTime: '45 minutos',
    potentialIssues: [
      {
        type: 'Mapeo incompleto',
        severity: 'medium',
        description: '12 cuentas del grupo 6 sin mapear',
        suggestion: 'Revisar cuentas de gastos 62x y 63x'
      },
      {
        type: 'Formato de fechas',
        severity: 'low',
        description: 'Detectados 3 formatos diferentes de fecha',
        suggestion: 'Se normalizarán automáticamente a ISO 8601'
      }
    ],
    optimizations: [
      'Procesar en lotes de 500 registros para mejor rendimiento',
      'Ejecutar validación de IVA en paralelo',
      'Programar para horario nocturno (menor carga)'
    ]
  });

  // Mock Anomalías
  const [anomalies] = useState<Anomaly[]>([
    {
      id: 'a1',
      type: 'Asiento descuadrado',
      severity: 'critical',
      description: 'Detectados 3 asientos donde Debe ≠ Haber',
      affectedRecords: 3,
      suggestedAction: 'Corregir antes de migrar - diferencia total: €1,234.56'
    },
    {
      id: 'a2',
      type: 'Tercero duplicado',
      severity: 'warning',
      description: 'Posibles clientes duplicados por NIF similar',
      affectedRecords: 8,
      suggestedAction: 'Fusionar registros o ignorar duplicados'
    },
    {
      id: 'a3',
      type: 'Cuenta sin movimientos',
      severity: 'info',
      description: 'Cuentas en plan origen sin asientos',
      affectedRecords: 45,
      suggestedAction: 'Excluir del mapeo para simplificar'
    }
  ]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Simular respuesta IA
    await new Promise(resolve => setTimeout(resolve, 1500));

    const responses: Record<string, string> = {
      'error': 'He identificado 45 errores en la migración. Los más críticos son:\n\n1. **3 asientos descuadrados** - Deben corregirse antes de migrar\n2. **12 cuentas sin mapear** - Del grupo 6 (gastos)\n3. **8 terceros duplicados** - Sugiero fusionarlos\n\n¿Quieres que te ayude a resolver alguno de estos?',
      'mapeo': 'Los mapeos sugeridos siguen las reglas del PGC 2007:\n\n• Cuentas 4xx → Se mantienen (Acreedores/Deudores)\n• Cuentas 6xx → Requieren revisión manual\n• Cuentas 7xx → Mapeo directo a ingresos\n\nLa IA tiene un 94% de confianza en estos mapeos. ¿Quieres ver el detalle de algún grupo?',
      'anomalía': 'He detectado las siguientes anomalías:\n\n⚠️ **Críticas**: 3 asientos descuadrados por €1,234.56\n⚠️ **Medias**: 8 posibles terceros duplicados\nℹ️ **Informativas**: 45 cuentas sin movimientos\n\nTe recomiendo resolver las críticas antes de continuar.',
      'tiempo': 'Según mi análisis:\n\n⏱️ **Tiempo estimado**: 45 minutos\n📊 **Registros**: 15,420\n⚡ **Velocidad**: ~340 registros/minuto\n\nRecomendación: Ejecutar en horario nocturno para mejor rendimiento.',
    };

    let responseContent = 'Entiendo tu consulta. Basándome en el análisis de la migración actual, puedo indicarte que el proceso está configurado correctamente. ¿Hay algo específico que quieras que revise?';

    const lowerInput = inputMessage.toLowerCase();
    if (lowerInput.includes('error') || lowerInput.includes('crítico')) {
      responseContent = responses['error'];
    } else if (lowerInput.includes('mapeo') || lowerInput.includes('cuenta')) {
      responseContent = responses['mapeo'];
    } else if (lowerInput.includes('anomalía') || lowerInput.includes('anomalia')) {
      responseContent = responses['anomalía'];
    } else if (lowerInput.includes('tiempo') || lowerInput.includes('tardar')) {
      responseContent = responses['tiempo'];
    }

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: responseContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);
  }, [inputMessage]);

  const handleQuickPrompt = (prompt: string) => {
    setInputMessage(prompt);
  };

  const getSeverityBadge = (severity: 'low' | 'medium' | 'high' | 'info' | 'warning' | 'critical') => {
    const config = {
      low: { label: 'Bajo', className: 'bg-blue-500/20 text-blue-600' },
      info: { label: 'Info', className: 'bg-blue-500/20 text-blue-600' },
      medium: { label: 'Medio', className: 'bg-yellow-500/20 text-yellow-600' },
      warning: { label: 'Atención', className: 'bg-yellow-500/20 text-yellow-600' },
      high: { label: 'Alto', className: 'bg-red-500/20 text-red-600' },
      critical: { label: 'Crítico', className: 'bg-red-500/20 text-red-600' },
    };
    const c = config[severity];
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Asistente IA de Migración</CardTitle>
              <CardDescription>
                Análisis inteligente, predicciones y recomendaciones
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat">Chat Asistente</TabsTrigger>
          <TabsTrigger value="analysis">Análisis Predictivo</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalías</TabsTrigger>
        </TabsList>

        {/* Chat */}
        <TabsContent value="chat">
          <Card className="h-[500px] flex flex-col">
            <CardContent className="flex-1 flex flex-col p-4">
              {/* Messages */}
              <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-3",
                        msg.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      {msg.role === 'assistant' && (
                        <div className="p-2 rounded-full bg-purple-500/20 h-fit">
                          <Bot className="h-4 w-4 text-purple-500" />
                        </div>
                      )}
                      <div className={cn(
                        "rounded-lg p-3 max-w-[80%]",
                        msg.role === 'user'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-xs opacity-60 mt-1">
                          {msg.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {msg.role === 'user' && (
                        <div className="p-2 rounded-full bg-primary h-fit">
                          <User className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="p-2 rounded-full bg-purple-500/20 h-fit">
                        <Bot className="h-4 w-4 text-purple-500" />
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Quick Prompts */}
              <div className="flex flex-wrap gap-2 py-3">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleQuickPrompt(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Escribe tu pregunta..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isLoading}
                />
                <Button onClick={handleSendMessage} disabled={isLoading || !inputMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Análisis Predictivo */}
        <TabsContent value="analysis">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Probabilidad de éxito */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Probabilidad de Éxito
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="relative inline-flex items-center justify-center">
                    <svg className="w-32 h-32">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-muted"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={`${analysis.successProbability * 3.52} 352`}
                        strokeLinecap="round"
                        className="text-green-500 -rotate-90 origin-center"
                      />
                    </svg>
                    <span className="absolute text-3xl font-bold">{analysis.successProbability}%</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Tiempo estimado: {analysis.estimatedTime}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Optimizaciones sugeridas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Optimizaciones Sugeridas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.optimizations.map((opt, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted">
                      <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <p className="text-sm">{opt}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Posibles problemas */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Problemas Potenciales Detectados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.potentialIssues.map((issue, i) => (
                    <div key={i} className="flex items-start justify-between p-3 rounded-lg border">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{issue.type}</span>
                          {getSeverityBadge(issue.severity)}
                        </div>
                        <p className="text-sm text-muted-foreground">{issue.description}</p>
                        <p className="text-sm text-green-600">💡 {issue.suggestion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Anomalías */}
        <TabsContent value="anomalies">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Detección de Anomalías
              </CardTitle>
              <CardDescription>
                Patrones inusuales detectados en los datos de origen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {anomalies.map((anomaly) => (
                    <div
                      key={anomaly.id}
                      className={cn(
                        "p-4 rounded-lg border",
                        anomaly.severity === 'critical' && "border-red-500/50 bg-red-500/5",
                        anomaly.severity === 'warning' && "border-yellow-500/50 bg-yellow-500/5",
                        anomaly.severity === 'info' && "border-blue-500/50 bg-blue-500/5"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {anomaly.severity === 'critical' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                            {anomaly.severity === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                            {anomaly.severity === 'info' && <CheckCircle className="h-4 w-4 text-blue-500" />}
                            <span className="font-medium">{anomaly.type}</span>
                            {getSeverityBadge(anomaly.severity)}
                          </div>
                          <p className="text-sm text-muted-foreground">{anomaly.description}</p>
                          <p className="text-sm">
                            <span className="text-muted-foreground">Registros afectados: </span>
                            <strong>{anomaly.affectedRecords}</strong>
                          </p>
                          <p className="text-sm text-green-600">→ {anomaly.suggestedAction}</p>
                        </div>
                        <Button size="sm" variant="outline">
                          Resolver
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ERPAIAssistantPanel;
