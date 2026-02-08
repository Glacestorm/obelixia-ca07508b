import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Bot,
  Send,
  User,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Sparkles,
  AlertCircle,
  X,
  Trash2,
  Maximize2,
  Minimize2,
  History,
  HelpCircle,
  FileText,
  Search,
  MessageSquare,
  ArrowRight,
  BookOpen,
  Scale,
  Euro,
  Calendar,
  CheckCircle,
  Clock,
  Zap,
} from 'lucide-react';
import { useGaliaAsistenteIA, GaliaMessage } from '@/hooks/galia/useGaliaAsistenteIA';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GaliaAsistenteVirtualMejoradoProps {
  modo?: 'ciudadano' | 'tecnico';
  galId?: string;
  expedienteId?: string;
  solicitudId?: string;
  className?: string;
  onClose?: () => void;
  defaultExpanded?: boolean;
}

interface FAQItem {
  id: string;
  pregunta: string;
  respuesta: string;
  categoria: string;
  veces_consultada: number;
}

interface ConversationHistory {
  id: string;
  fecha: string;
  resumen: string;
  mensajes: number;
}

// Quick action suggestions based on mode
const QUICK_ACTIONS_CIUDADANO = [
  { icon: HelpCircle, label: '¿Qué es LEADER?', query: '¿Qué es el programa LEADER y qué tipo de ayudas ofrece?' },
  { icon: FileText, label: 'Documentación', query: '¿Qué documentación necesito para solicitar una ayuda LEADER?' },
  { icon: Euro, label: 'Subvención máxima', query: '¿Cuál es el porcentaje máximo de subvención que puedo obtener?' },
  { icon: Calendar, label: 'Plazos', query: '¿Cuáles son los plazos para presentar solicitudes?' },
];

const QUICK_ACTIONS_TECNICO = [
  { icon: Scale, label: 'Elegibilidad', query: 'Analiza los criterios de elegibilidad para este expediente' },
  { icon: Euro, label: 'Moderación costes', query: 'Revisa la moderación de costes y detecta posibles desviaciones' },
  { icon: FileText, label: 'Normativa', query: '¿Qué normativa aplica para la justificación de gastos?' },
  { icon: CheckCircle, label: 'Checklist', query: 'Genera un checklist de verificación para el expediente' },
];

export function GaliaAsistenteVirtualMejorado({
  modo = 'ciudadano',
  galId,
  expedienteId,
  solicitudId,
  className,
  onClose,
  defaultExpanded = false,
}: GaliaAsistenteVirtualMejoradoProps) {
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState('chat');
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [faqSearch, setFaqSearch] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ConversationHistory[]>([]);
  const [loadingFaq, setLoadingFaq] = useState(false);
  const [expedienteContext, setExpedienteContext] = useState<any>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isLoading,
    error,
    sessionId,
    sendMessage,
    submitFeedback,
    clearMessages,
    getWelcomeMessage,
  } = useGaliaAsistenteIA({
    modo,
    galId,
    expedienteId,
    solicitudId,
  });

  // Display messages with welcome
  const [displayMessages, setDisplayMessages] = useState<GaliaMessage[]>([]);

  useEffect(() => {
    if (displayMessages.length === 0 && messages.length === 0) {
      setDisplayMessages([getWelcomeMessage()]);
    } else {
      setDisplayMessages([getWelcomeMessage(), ...messages]);
    }
  }, [messages, getWelcomeMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayMessages, isLoading]);

  // Load FAQ items
  const loadFAQ = useCallback(async () => {
    setLoadingFaq(true);
    try {
      const { data, error } = await supabase
        .from('galia_faq')
        .select('*')
        .eq('is_active', true)
        .order('veces_consultada', { ascending: false })
        .limit(20);

      if (!error && data) {
        setFaqItems(data as FAQItem[]);
      }
    } catch (err) {
      console.error('Error loading FAQ:', err);
    } finally {
      setLoadingFaq(false);
    }
  }, []);

  // Load conversation history
  const loadHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('galia_interacciones_ia')
        .select('session_id, created_at, pregunta')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        // Group by session
        const sessions = data.reduce((acc: Record<string, any>, item: any) => {
          if (!acc[item.session_id]) {
            acc[item.session_id] = {
              id: item.session_id,
              fecha: item.created_at,
              mensajes: 0,
              resumen: item.pregunta?.substring(0, 50) + '...',
            };
          }
          acc[item.session_id].mensajes++;
          return acc;
        }, {});

        setConversationHistory(Object.values(sessions).slice(0, 10));
      }
    } catch (err) {
      console.error('Error loading history:', err);
    }
  }, []);

  // Load expediente context if provided
  const loadExpedienteContext = useCallback(async () => {
    if (!expedienteId) return;
    
    try {
      const { data, error } = await supabase
        .from('galia_expedientes')
        .select('numero_expediente, titulo_proyecto, estado, importe_solicitado, importe_concedido')
        .eq('id', expedienteId)
        .single();

      if (!error && data) {
        setExpedienteContext(data);
      }
    } catch (err) {
      console.error('Error loading expediente context:', err);
    }
  }, [expedienteId]);

  useEffect(() => {
    loadFAQ();
    loadHistory();
    loadExpedienteContext();
  }, [loadFAQ, loadHistory, loadExpedienteContext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message);
    inputRef.current?.focus();
  };

  const handleQuickAction = async (query: string) => {
    setInput('');
    await sendMessage(query);
  };

  const handleFAQClick = async (faq: FAQItem) => {
    // Increment view count
    await supabase
      .from('galia_faq')
      .update({ veces_consultada: (faq.veces_consultada || 0) + 1 })
      .eq('id', faq.id);

    // Send as message or show directly
    await sendMessage(faq.pregunta);
    setActiveTab('chat');
  };

  const handleFeedback = async (messageId: string, positive: boolean) => {
    await submitFeedback(messageId, positive ? 5 : 1);
    toast.success('Gracias por tu valoración');
  };

  const handleClear = () => {
    clearMessages();
    setDisplayMessages([getWelcomeMessage()]);
  };

  const filteredFAQ = faqItems.filter(faq =>
    faq.pregunta.toLowerCase().includes(faqSearch.toLowerCase()) ||
    faq.respuesta.toLowerCase().includes(faqSearch.toLowerCase())
  );

  const quickActions = modo === 'ciudadano' ? QUICK_ACTIONS_CIUDADANO : QUICK_ACTIONS_TECNICO;

  const cardHeight = isExpanded ? 'h-[80vh]' : 'h-[600px]';

  return (
    <Card className={cn(
      "flex flex-col transition-all duration-300",
      cardHeight,
      isExpanded && "fixed inset-4 z-50 shadow-2xl",
      className
    )}>
      <CardHeader className="pb-2 border-b shrink-0 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent animate-pulse">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Asistente GALIA
                <Badge variant="secondary" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  Mejorado
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {modo === 'ciudadano' ? 'Ayudas LEADER • Información 24/7' : 'Copiloto Técnico • Análisis Experto'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Gemini 2.5
            </Badge>
            {messages.length > 0 && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClear} title="Limpiar chat">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            {onClose && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Expediente Context Banner */}
        {expedienteContext && (
          <div className="mt-2 p-2 rounded-lg bg-muted/50 border text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-3 w-3 text-primary" />
                <span className="font-medium">{expedienteContext.numero_expediente}</span>
                <Badge variant="outline" className="text-[10px]">{expedienteContext.estado}</Badge>
              </div>
              <span className="text-muted-foreground">
                {expedienteContext.importe_concedido 
                  ? `${expedienteContext.importe_concedido.toLocaleString()}€ concedido`
                  : `${expedienteContext.importe_solicitado?.toLocaleString() || 0}€ solicitado`
                }
              </span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 mx-4 mt-2 mb-0" style={{ width: 'calc(100% - 2rem)' }}>
            <TabsTrigger value="chat" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="faq" className="text-xs">
              <BookOpen className="h-3 w-3 mr-1" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <History className="h-3 w-3 mr-1" />
              Historial
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden mt-0 px-0">
            {/* Quick Actions */}
            {messages.length === 0 && (
              <div className="px-4 py-2 border-b">
                <p className="text-xs text-muted-foreground mb-2">Preguntas rápidas:</p>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => handleQuickAction(action.query)}
                      disabled={isLoading}
                    >
                      <action.icon className="h-3 w-3 mr-1" />
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <ScrollArea ref={scrollRef} className="flex-1 p-4">
              <div className="space-y-4">
                {displayMessages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onFeedback={handleFeedback}
                  />
                ))}

                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary animate-bounce" />
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-sm text-muted-foreground">Analizando...</span>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t shrink-0">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={modo === 'ciudadano' 
                    ? "Escribe tu consulta sobre ayudas LEADER..." 
                    : "Pregunta sobre normativa, expedientes..."
                  }
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="submit" disabled={isLoading || !input.trim()}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Sesión: {sessionId.slice(0, 8)}... • Powered by Lovable AI
              </p>
            </div>
          </TabsContent>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="flex-1 flex flex-col overflow-hidden mt-0">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  placeholder="Buscar en preguntas frecuentes..."
                  className="pl-9"
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              {loadingFaq ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredFAQ.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No se encontraron preguntas frecuentes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFAQ.map((faq) => (
                    <button
                      key={faq.id}
                      onClick={() => handleFAQClick(faq)}
                      className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{faq.pregunta}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {faq.respuesta}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px]">{faq.categoria}</Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {faq.veces_consultada || 0} consultas
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="flex-1 flex flex-col overflow-hidden mt-0">
            <ScrollArea className="flex-1 p-4">
              {conversationHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay conversaciones anteriores</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversationHistory.map((conv) => (
                    <div
                      key={conv.id}
                      className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium line-clamp-1">{conv.resumen}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(conv.fecha).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {conv.mensajes} mensajes
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Separate MessageBubble component for cleaner code
function MessageBubble({ 
  message, 
  onFeedback 
}: { 
  message: GaliaMessage; 
  onFeedback: (id: string, positive: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex gap-3",
        message.role === 'user' ? "justify-end" : "justify-start"
      )}
    >
      {message.role === 'assistant' && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      
      <div
        className={cn(
          "max-w-[80%] rounded-lg p-3",
          message.role === 'user'
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        {message.role === 'assistant' ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm">{message.content}</p>
        )}

        {/* Metadata for assistant messages */}
        {message.role === 'assistant' && message.id !== 'welcome' && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              {message.confianza && (
                <Badge variant={message.confianza > 0.8 ? 'default' : 'secondary'} className="text-[10px]">
                  {Math.round(message.confianza * 100)}% confianza
                </Badge>
              )}
              {message.intencion && (
                <Badge variant="outline" className="text-[10px]">
                  {message.intencion}
                </Badge>
              )}
              {message.derivadoTecnico && (
                <Badge variant="destructive" className="text-[10px]">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Derivar
                </Badge>
              )}
            </div>
            {!message.feedback && message.id !== 'welcome' && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-green-100 hover:text-green-600"
                  onClick={() => onFeedback(message.id, true)}
                >
                  <ThumbsUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-red-100 hover:text-red-600"
                  onClick={() => onFeedback(message.id, false)}
                >
                  <ThumbsDown className="h-3 w-3" />
                </Button>
              </div>
            )}
            {message.feedback && (
              <Badge variant="outline" className="text-[10px]">
                <CheckCircle className="h-3 w-3 mr-1" />
                Valorado
              </Badge>
            )}
          </div>
        )}
      </div>

      {message.role === 'user' && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}

export default GaliaAsistenteVirtualMejorado;
