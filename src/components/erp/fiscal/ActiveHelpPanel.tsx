/**
 * ActiveHelpPanel - Panel de Ayuda Activa con chat, voz y análisis en tiempo real
 */

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  HelpCircle,
  Send,
  Loader2,
  Mic,
  Volume2,
  Brain,
  Globe,
  Sparkles,
  Settings,
  MessageSquare,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useERPActiveHelp } from '@/hooks/erp/useERPActiveHelp';
import { useERPFiscalVoice } from '@/hooks/erp/useERPFiscalVoice';
import { FiscalVoiceButton } from './FiscalVoiceButton';
import { ActiveHelpBubble } from './ActiveHelpBubble';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

interface ActiveHelpPanelProps {
  companyId?: string;
  className?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

export function ActiveHelpPanel({ companyId, className }: ActiveHelpPanelProps) {
  const [activeTab, setActiveTab] = useState('chat');
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const {
    isAnalyzing,
    bubbles,
    lastAnalysis,
    config,
    searchHelp,
    dismissBubble,
    clearBubbles,
    updateConfig
  } = useERPActiveHelp(companyId);

  const { speak } = useERPFiscalVoice();

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSendQuery = async () => {
    if (!query.trim() || isLoading) return;

    const userQuery = query.trim();
    setQuery('');
    setChatHistory(prev => [...prev, { role: 'user', content: userQuery }]);
    setIsLoading(true);

    try {
      const result = await searchHelp(userQuery, {
        useExternal: !config.useLocalAI
      });

      if (result) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: result.answer,
          sources: result.sources
        };
        setChatHistory(prev => [...prev, assistantMessage]);

        // Auto-speak if enabled
        if (config.voiceAlerts) {
          speak(result.answer);
        }
      }
    } catch (error) {
      console.error('[ActiveHelpPanel] Query error:', error);
      toast.error('Error al procesar consulta');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceTranscript = async (text: string) => {
    if (text.trim()) {
      setQuery(text);
      // Auto-send after voice input
      setTimeout(() => {
        handleSendQuery();
      }, 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuery();
    }
  };

  const quickQuestions = [
    '¿Cuándo vence el Modelo 303?',
    '¿Cómo contabilizo una factura intracomunitaria?',
    '¿Qué cuenta uso para gastos de representación?',
    '¿Cuál es el tipo de IVA para servicios digitales?'
  ];

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500">
              <HelpCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Ayuda Fiscal Activa
                <Badge variant="secondary" className="text-xs">
                  {config.useLocalAI ? (
                    <>
                      <Brain className="h-3 w-3 mr-1" />
                      Local
                    </>
                  ) : (
                    <>
                      <Globe className="h-3 w-3 mr-1" />
                      Externa
                    </>
                  )}
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Asistente inteligente con análisis en tiempo real
              </p>
            </div>
          </div>
          {bubbles.length > 0 && (
            <Badge variant="outline" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {bubbles.length} alertas
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 rounded-none border-b">
            <TabsTrigger value="chat" className="gap-1 text-xs">
              <MessageSquare className="h-3.5 w-3.5" />
              Consultas
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1 text-xs">
              <Activity className="h-3.5 w-3.5" />
              Alertas
              {bubbles.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-[10px] justify-center">
                  {bubbles.length}
                </Badge>
              )}
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
                  <div className="text-center py-6">
                    <HelpCircle className="h-10 w-10 mx-auto mb-3 text-emerald-500/50" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Pregúntame cualquier duda fiscal
                    </p>
                    <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                      {quickQuestions.map((q, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="text-xs h-auto py-2 text-left"
                          onClick={() => {
                            setQuery(q);
                            handleSendQuery();
                          }}
                        >
                          {q}
                        </Button>
                      ))}
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
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 h-fit">
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-lg px-4 py-2 max-w-[85%]",
                        msg.role === 'user'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-current/10">
                              <p className="text-[10px] opacity-60 mb-1">Fuentes:</p>
                              <div className="flex flex-wrap gap-1">
                                {msg.sources.map((src, sIdx) => (
                                  <Badge key={sIdx} variant="outline" className="text-[10px]">
                                    {src}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 h-fit">
                      <Sparkles className="h-4 w-4 text-emerald-600 animate-pulse" />
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
                <FiscalVoiceButton
                  onTranscript={handleVoiceTranscript}
                  lastResponse={chatHistory.filter(m => m.role === 'assistant').slice(-1)[0]?.content}
                  disabled={isLoading}
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe tu consulta fiscal..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendQuery}
                  disabled={!query.trim() || isLoading}
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
                {bubbles.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      Sin alertas activas
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Las alertas aparecerán cuando analices asientos
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-end mb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearBubbles}
                        className="text-xs"
                      >
                        Limpiar todo
                      </Button>
                    </div>
                    {bubbles.map((bubble) => (
                      <ActiveHelpBubble
                        key={bubble.id}
                        bubble={bubble}
                        onDismiss={dismissBubble}
                        onSpeak={config.voiceAlerts ? speak : undefined}
                      />
                    ))}
                  </>
                )}
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
                    Configuración de Ayuda
                  </h3>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="help-enabled" className="text-sm">Ayuda activa</Label>
                      <p className="text-xs text-muted-foreground">
                        Análisis automático de asientos
                      </p>
                    </div>
                    <Switch
                      id="help-enabled"
                      checked={config.enabled}
                      onCheckedChange={(checked) => updateConfig({ enabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auto-analyze" className="text-sm">Análisis automático</Label>
                      <p className="text-xs text-muted-foreground">
                        Analizar mientras escribes
                      </p>
                    </div>
                    <Switch
                      id="auto-analyze"
                      checked={config.autoAnalyze}
                      onCheckedChange={(checked) => updateConfig({ autoAnalyze: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="voice-alerts" className="text-sm">Alertas por voz</Label>
                      <p className="text-xs text-muted-foreground">
                        Leer alertas en voz alta
                      </p>
                    </div>
                    <Switch
                      id="voice-alerts"
                      checked={config.voiceAlerts}
                      onCheckedChange={(checked) => updateConfig({ voiceAlerts: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="show-bubbles" className="text-sm">Mostrar globos</Label>
                      <p className="text-xs text-muted-foreground">
                        Alertas flotantes en pantalla
                      </p>
                    </div>
                    <Switch
                      id="show-bubbles"
                      checked={config.showBubbles}
                      onCheckedChange={(checked) => updateConfig({ showBubbles: checked })}
                    />
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-medium text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Fuente de IA
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={config.useLocalAI ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateConfig({ useLocalAI: true })}
                      className="gap-2"
                    >
                      <Brain className="h-4 w-4" />
                      IA Local
                    </Button>
                    <Button
                      variant={!config.useLocalAI ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateConfig({ useLocalAI: false })}
                      className="gap-2"
                    >
                      <Globe className="h-4 w-4" />
                      IA Externa
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {config.useLocalAI 
                      ? 'Usa la base de conocimiento interna del ERP'
                      : 'Busca información actualizada en internet'
                    }
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default ActiveHelpPanel;
