/**
 * ActiveHelpPanel - Panel de Ayuda Activa con chat, voz, calendario fiscal y análisis en tiempo real
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
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
  AlertTriangle,
  CalendarDays,
  CheckCircle,
  Clock,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useERPActiveHelp } from '@/hooks/erp/useERPActiveHelp';
import { useERPFiscalVoice } from '@/hooks/erp/useERPFiscalVoice';
import { FiscalVoiceButton } from './FiscalVoiceButton';
import { ActiveHelpBubble } from './ActiveHelpBubble';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { format, addDays, isSameDay, isAfter, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';

interface ActiveHelpPanelProps {
  companyId?: string;
  className?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

interface FiscalEvent {
  id: string;
  date: Date;
  title: string;
  type: 'tax_filing' | 'payment' | 'declaration' | 'reminder';
  model?: string;
  status: 'pending' | 'completed' | 'overdue';
}

// Demo fiscal events
const DEMO_FISCAL_EVENTS: FiscalEvent[] = [
  { id: '1', date: addDays(startOfToday(), 3), title: 'Modelo 303 - IVA Trimestral', type: 'tax_filing', model: '303', status: 'pending' },
  { id: '2', date: addDays(startOfToday(), 5), title: 'Modelo 111 - Retenciones IRPF', type: 'tax_filing', model: '111', status: 'pending' },
  { id: '3', date: addDays(startOfToday(), 10), title: 'Modelo 115 - Retenciones Alquileres', type: 'payment', model: '115', status: 'pending' },
  { id: '4', date: addDays(startOfToday(), 15), title: 'Intrastat - Declaración Mensual', type: 'declaration', status: 'pending' },
  { id: '5', date: addDays(startOfToday(), -2), title: 'Modelo 130 - Pago Fraccionado', type: 'tax_filing', model: '130', status: 'overdue' },
  { id: '6', date: addDays(startOfToday(), -5), title: 'SII - Envío Facturas Emitidas', type: 'declaration', status: 'completed' },
];

export function ActiveHelpPanel({ companyId, className }: ActiveHelpPanelProps) {
  const [activeTab, setActiveTab] = useState('chat');
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
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

  // Calculate compliance stats
  const complianceStats = useMemo(() => {
    const total = DEMO_FISCAL_EVENTS.length;
    const completed = DEMO_FISCAL_EVENTS.filter(e => e.status === 'completed').length;
    const overdue = DEMO_FISCAL_EVENTS.filter(e => e.status === 'overdue').length;
    const pending = DEMO_FISCAL_EVENTS.filter(e => e.status === 'pending').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, overdue, pending, percentage };
  }, []);

  // Events for the next 7 days
  const upcomingEvents = useMemo(() => {
    const today = startOfToday();
    const weekFromNow = addDays(today, 7);
    return DEMO_FISCAL_EVENTS
      .filter(e => e.status !== 'completed' && isAfter(e.date, today) && isBefore(e.date, weekFromNow))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, []);

  // Get events for selected date
  const eventsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return DEMO_FISCAL_EVENTS.filter(e => isSameDay(e.date, selectedDate));
  }, [selectedDate]);

  // Dates that have events (for calendar highlighting)
  const eventDates = useMemo(() => {
    return DEMO_FISCAL_EVENTS.map(e => e.date);
  }, []);

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

  const getEventIcon = (type: FiscalEvent['type']) => {
    switch (type) {
      case 'tax_filing': return <FileText className="h-4 w-4" />;
      case 'payment': return <Clock className="h-4 w-4" />;
      case 'declaration': return <CalendarDays className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: FiscalEvent['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">Completado</Badge>;
      case 'overdue':
        return <Badge variant="destructive" className="text-xs">Vencido</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Pendiente</Badge>;
    }
  };

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
          <TabsList className="grid w-full grid-cols-4 rounded-none border-b">
            <TabsTrigger value="chat" className="gap-1 text-xs">
              <MessageSquare className="h-3.5 w-3.5" />
              Consultas
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1 text-xs">
              <CalendarDays className="h-3.5 w-3.5" />
              Calendario
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
                    <div className="flex flex-col gap-2 max-w-lg mx-auto w-full">
                      {quickQuestions.map((q, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="text-xs h-auto py-3 px-4 text-left justify-start whitespace-normal break-words"
                          onClick={() => {
                            setQuery(q);
                            setTimeout(() => handleSendQuery(), 50);
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

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="flex-1 m-0 p-0 overflow-auto">
            <div className="p-4 space-y-4">
              {/* Compliance indicator */}
              <div className="p-4 rounded-lg border bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Cumplimiento Fiscal</span>
                  <span className="text-lg font-bold text-emerald-600">{complianceStats.percentage}%</span>
                </div>
                <Progress value={complianceStats.percentage} className="h-2 mb-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    {complianceStats.completed} completados
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-500" />
                    {complianceStats.pending} pendientes
                  </span>
                  {complianceStats.overdue > 0 && (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                      {complianceStats.overdue} vencidos
                    </span>
                  )}
                </div>
              </div>

              {/* Mini calendar */}
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={es}
                  className="rounded-md border"
                  modifiers={{
                    hasEvent: eventDates,
                  }}
                  modifiersStyles={{
                    hasEvent: {
                      fontWeight: 'bold',
                      textDecoration: 'underline',
                      textDecorationColor: 'hsl(var(--primary))',
                    }
                  }}
                />
              </div>

              {/* Events for selected date */}
              {eventsForSelectedDate.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">
                    Eventos del {selectedDate && format(selectedDate, "d 'de' MMMM", { locale: es })}
                  </h4>
                  {eventsForSelectedDate.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {getEventIcon(event.type)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(event.date, "HH:mm", { locale: es })}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(event.status)}
                    </div>
                  ))}
                </div>
              )}

              {/* Upcoming events (next 7 days) */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Próximos 7 días
                </h4>
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sin obligaciones próximas
                  </p>
                ) : (
                  upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                          {getEventIcon(event.type)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(event.date, "EEEE d 'de' MMMM", { locale: es })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {Math.ceil((event.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} días
                      </Badge>
                    </div>
                  ))
                )}
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
