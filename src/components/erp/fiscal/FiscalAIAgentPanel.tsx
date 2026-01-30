/**
 * FiscalAIAgentPanel - Panel principal del Agente IA Fiscal ultraespecializado
 */

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Bot,
  Send,
  Brain,
  AlertTriangle,
  CheckCircle,
  FileText,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  BookOpen,
  Calendar,
  TrendingUp,
  Loader2,
  MessageSquare,
  XCircle,
  Clock,
  Zap
} from 'lucide-react';
import { useERPFiscalAgent } from '@/hooks/erp/useERPFiscalAgent';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';

interface FiscalAIAgentPanelProps {
  companyId?: string;
  className?: string;
}

export function FiscalAIAgentPanel({ companyId, className }: FiscalAIAgentPanelProps) {
  const [activeTab, setActiveTab] = useState('chat');
  const [message, setMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const {
    isLoading,
    activeSession,
    alerts,
    knowledge,
    formTemplates,
    config,
    chatHistory,
    startSession,
    endSession,
    chat,
    checkCompliance,
    resolveAlert,
    updateConfig
  } = useERPFiscalAgent(companyId);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;
    
    const currentMessage = message;
    setMessage('');
    
    if (!activeSession) {
      await startSession('general');
    }
    
    await chat(currentMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'error': return 'bg-red-400 text-white';
      case 'warning': return 'bg-amber-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  if (!companyId) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="py-12 text-center">
          <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">Selecciona una empresa para activar el Agente Fiscal IA</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Agente Fiscal IA
                {activeSession && (
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Activo
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Asesor fiscal inteligente con normativa multinacional
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {alerts.filter(a => !a.is_resolved).length > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {alerts.filter(a => !a.is_resolved).length}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => checkCompliance()}
              disabled={isLoading}
            >
              <Shield className="h-4 w-4 mr-1" />
              Verificar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 rounded-none border-b">
            <TabsTrigger value="chat" className="gap-1 text-xs">
              <MessageSquare className="h-3.5 w-3.5" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1 text-xs">
              <AlertTriangle className="h-3.5 w-3.5" />
              Alertas
              {alerts.filter(a => !a.is_resolved).length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-[10px] justify-center">
                  {alerts.filter(a => !a.is_resolved).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="gap-1 text-xs">
              <BookOpen className="h-3.5 w-3.5" />
              Normativa
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-1 text-xs">
              <Settings className="h-3.5 w-3.5" />
              Config
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="flex-1 flex flex-col m-0 p-0">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {chatHistory.length === 0 && (
                  <div className="text-center py-8">
                    <Bot className="h-12 w-12 mx-auto mb-4 text-primary/50" />
                    <p className="text-sm text-muted-foreground mb-4">
                      ¡Hola! Soy tu Agente Fiscal IA especializado.
                    </p>
                    <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => chat('¿Cuáles son los plazos de presentación del Modelo 303?')}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Plazos MOD303
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => chat('Genera un asiento de compra con IVA 21%')}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Asiento compra
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => chat('¿Qué requisitos tiene el SII para facturas emitidas?')}
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        Requisitos SII
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => checkCompliance()}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Check cumplimiento
                      </Button>
                    </div>
                  </div>
                )}

                {chatHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-3",
                      msg.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <div className="p-1.5 rounded-lg bg-primary/10 h-fit">
                        <Brain className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-lg px-4 py-2 max-w-[80%]",
                        msg.role === 'user'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3">
                    <div className="p-1.5 rounded-lg bg-primary/10 h-fit">
                      <Brain className="h-4 w-4 text-primary animate-pulse" />
                    </div>
                    <div className="rounded-lg px-4 py-3 bg-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Pregunta sobre normativa fiscal, asientos, cumplimiento..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isLoading}
                  size="icon"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="flex-1 m-0 p-0">
            <ScrollArea className="h-full p-4">
              <div className="space-y-3">
                {alerts.filter(a => !a.is_resolved).length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="text-sm text-muted-foreground">
                      Sin alertas de cumplimiento pendientes
                    </p>
                  </div>
                ) : (
                  alerts.filter(a => !a.is_resolved).map((alert) => (
                    <Card key={alert.id} className="border-l-4" style={{
                      borderLeftColor: alert.severity === 'critical' ? 'hsl(var(--destructive))' :
                        alert.severity === 'error' ? 'hsl(var(--destructive))' :
                        alert.severity === 'warning' ? 'hsl(45, 100%, 50%)' : 'hsl(var(--primary))'
                    }}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <Badge className={cn("mt-0.5", getSeverityColor(alert.severity))}>
                              {getSeverityIcon(alert.severity)}
                            </Badge>
                            <div>
                              <p className="font-medium text-sm">{alert.title}</p>
                              {alert.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {alert.description}
                                </p>
                              )}
                              {alert.recommended_action && (
                                <p className="text-xs text-primary mt-2">
                                  → {alert.recommended_action}
                                </p>
                              )}
                              <p className="text-[10px] text-muted-foreground mt-2">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: es })}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Knowledge Tab */}
          <TabsContent value="knowledge" className="flex-1 m-0 p-0">
            <ScrollArea className="h-full p-4">
              <div className="space-y-3">
                {knowledge.slice(0, 10).map((item) => (
                  <Card key={item.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <BookOpen className="h-4 w-4 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {item.content.substring(0, 150)}...
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.tags?.slice(0, 3).map((tag, idx) => (
                              <Badge key={idx} variant="outline" className="text-[10px]">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Config Tab */}
          <TabsContent value="config" className="flex-1 m-0 p-0">
            <ScrollArea className="h-full p-4">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-sm flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Configuración del Agente
                  </h3>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="agent-enabled" className="text-sm">
                      Agente activo
                    </Label>
                    <Switch
                      id="agent-enabled"
                      checked={config?.agent_enabled ?? true}
                      onCheckedChange={(checked) => updateConfig({ agent_enabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-entries" className="text-sm">
                      Generar asientos automáticos
                    </Label>
                    <Switch
                      id="auto-entries"
                      checked={config?.auto_generate_entries ?? false}
                      onCheckedChange={(checked) => updateConfig({ auto_generate_entries: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-alerts" className="text-sm">
                      Alertas automáticas
                    </Label>
                    <Switch
                      id="auto-alerts"
                      checked={config?.auto_generate_alerts ?? true}
                      onCheckedChange={(checked) => updateConfig({ auto_generate_alerts: checked })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Umbral aprobación manual (€)</Label>
                  <Input
                    type="number"
                    value={config?.require_approval_threshold ?? 10000}
                    onChange={(e) => updateConfig({ require_approval_threshold: Number(e.target.value) })}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Asientos superiores a este importe requieren aprobación
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Días aviso antes de vencimiento</Label>
                  <Input
                    type="number"
                    value={config?.notification_days_before_deadline ?? 7}
                    onChange={(e) => updateConfig({ notification_days_before_deadline: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium text-sm mb-3">Formularios disponibles</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {formTemplates.slice(0, 6).map((form) => (
                      <div key={form.id} className="p-2 rounded-lg bg-muted text-xs">
                        <p className="font-medium">{form.form_code}</p>
                        <p className="text-muted-foreground truncate">{form.form_name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default FiscalAIAgentPanel;
