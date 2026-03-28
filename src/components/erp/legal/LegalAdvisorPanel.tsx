/**
 * LegalAdvisorPanel - Chat de asesoría jurídica IA multi-jurisdiccional
 * Consultas legales con selección de jurisdicción y especialidad + FAQ
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useWebSpeech } from '@/hooks/useWebSpeech';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactMarkdown from 'react-markdown';
import { 
  Send, 
  Scale, 
  Loader2, 
  Bot, 
  User,
  Globe,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import { linkifyLegalReferences, resolveLegalReference } from '@/utils/legalReferenceResolver';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LegalAdvisorPanelProps {
  companyId: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  jurisdiction?: string;
  specialty?: string;
  references?: string[];
  confidence?: number;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  jurisdiction: string;
  specialty: string;
  legal_references: string[];
  asked_count: number;
  helpful_count: number;
  confidence: number;
}

const JURISDICTIONS = [
  { code: 'AD', name: 'Andorra', flag: '🇦🇩' },
  { code: 'ES', name: 'España', flag: '🇪🇸' },
  { code: 'EU', name: 'Europa', flag: '🇪🇺' },
  { code: 'INT', name: 'Internacional', flag: '🌍' }
];

const SPECIALTIES = [
  { code: 'labor', name: 'Derecho Laboral', icon: '👷' },
  { code: 'corporate', name: 'Derecho Mercantil', icon: '🏢' },
  { code: 'tax', name: 'Derecho Fiscal', icon: '💰' },
  { code: 'data_protection', name: 'Protección de Datos', icon: '🔒' },
  { code: 'banking', name: 'Derecho Bancario', icon: '🏦' },
  { code: 'general', name: 'General', icon: '⚖️' }
];

export function LegalAdvisorPanel({ companyId }: LegalAdvisorPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [jurisdiction, setJurisdiction] = useState('ES');
  const [specialty, setSpecialty] = useState('general');
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load FAQ items when jurisdiction/specialty change
  const loadFAQ = useCallback(async () => {
    setFaqLoading(true);
    try {
      const { data } = await supabase
        .from('legal_advisor_faq' as any)
        .select('*')
        .eq('jurisdiction', jurisdiction)
        .eq('specialty', specialty)
        .order('asked_count', { ascending: false })
        .limit(20);
      setFaqItems((data as any[] || []) as FAQItem[]);
    } catch {
      // silent
    } finally {
      setFaqLoading(false);
    }
  }, [jurisdiction, specialty]);

  useEffect(() => {
    loadFAQ();
  }, [loadFAQ]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      jurisdiction,
      specialty
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('legal-ai-advisor', {
        body: {
          action: 'consult_legal',
          context: {
            companyId,
            jurisdiction,
            specialty,
            query: userMessage.content,
            conversationHistory: messages.slice(-6).map(m => ({
              role: m.role,
              content: m.content
            }))
          }
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data?.data?.advice || data?.data?.response || 'No se pudo obtener una respuesta.',
        timestamp: new Date(),
        jurisdiction,
        specialty,
        references: data?.data?.references || data?.data?.legal_basis || [],
        confidence: data?.data?.confidence || 0.85
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Refresh FAQ after a new question
      setTimeout(() => loadFAQ(), 2000);
    } catch (error) {
      console.error('Error consulting legal advisor:', error);
      toast.error('Error al consultar el asesor jurídico');
      
      const fallbackMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Lo siento, no pude procesar tu consulta en este momento. Por favor, intenta de nuevo.',
        timestamp: new Date(),
        jurisdiction,
        specialty
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copiado al portapapeles');
  };

  const handleFeedback = async (messageId: string, isPositive: boolean) => {
    toast.success(isPositive ? 'Gracias por tu feedback positivo' : 'Gracias, mejoraremos nuestra respuesta');
    
    // Find the message and try to update FAQ feedback
    const msg = messages.find(m => m.id === messageId);
    if (msg && msg.role === 'assistant') {
      const prevUserMsg = messages[messages.indexOf(msg) - 1];
      if (prevUserMsg) {
        try {
          const { data: faq } = await supabase
            .from('legal_advisor_faq' as any)
            .select('id, helpful_count, not_helpful_count')
            .eq('jurisdiction', jurisdiction)
            .eq('specialty', specialty)
            .ilike('question', `%${prevUserMsg.content.substring(0, 50)}%`)
            .limit(1);
          
          if (faq && faq.length > 0) {
            const f = faq[0] as any;
            await supabase.from('legal_advisor_faq' as any)
              .update({
                [isPositive ? 'helpful_count' : 'not_helpful_count']: 
                  (isPositive ? (f.helpful_count || 0) : (f.not_helpful_count || 0)) + 1
              } as any)
              .eq('id', f.id);
          }
        } catch { /* silent */ }
      }
    }
  };

  const handleFAQClick = (faq: FAQItem) => {
    setInput(faq.question);
    setActiveTab('chat');
  };

  const getJurisdictionInfo = (code: string) => {
    return JURISDICTIONS.find(j => j.code === code) || JURISDICTIONS[0];
  };

  const getSpecialtyInfo = (code: string) => {
    return SPECIALTIES.find(s => s.code === code) || SPECIALTIES[5];
  };

  // Dynamic suggested queries based on jurisdiction + specialty
  const getSuggestedQueries = () => {
    const suggestions: Record<string, Record<string, string[]>> = {
      ES: {
        labor: [
          '¿Cuáles son los requisitos para un despido procedente?',
          '¿Qué indemnización corresponde por despido improcedente?',
          '¿Cuánto dura el periodo de prueba según el ET?'
        ],
        corporate: [
          '¿Qué requisitos tiene la constitución de una SL?',
          '¿Cuándo es obligatoria una auditoría de cuentas?',
          '¿Qué mayorías se necesitan para modificar estatutos?'
        ],
        tax: [
          '¿Cuál es el tipo del Impuesto de Sociedades 2026?',
          '¿Qué gastos son deducibles en el IS?',
          '¿Cuándo se presenta el modelo 303 de IVA?'
        ],
        data_protection: [
          '¿Cuándo es obligatorio nombrar un DPO?',
          '¿Qué plazo hay para notificar una brecha de seguridad?',
          '¿Qué base legal necesito para tratar datos de empleados?'
        ],
        banking: [
          '¿Qué obligaciones impone MiFID II a las entidades?',
          '¿Cuáles son los requisitos AML/KYC vigentes?',
          '¿Qué es DORA y a quién aplica?'
        ],
        general: [
          '¿Cuáles son los requisitos para un despido procedente?',
          '¿Qué obligaciones tengo bajo GDPR?',
          '¿Cómo debo documentar un contrato mercantil?'
        ],
      },
      AD: {
        labor: [
          '¿Qué tipos de contrato regula el Codi de Relacions Laborals?',
          '¿Cuál es la indemnización por acomiadament a Andorra?',
          '¿Qué permisos retribuïts contempla la legislació andorrana?'
        ],
        general: [
          '¿Qué impuestos se aplican a las sociedades en Andorra?',
          '¿Cómo se constituye una societat a Andorra?',
          '¿Qué obligaciones impone la APDA Llei 29/2021?'
        ],
      },
    };

    return suggestions[jurisdiction]?.[specialty] 
      || suggestions[jurisdiction]?.general 
      || suggestions.ES.general;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Panel de configuración */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Configuración
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Jurisdicción</label>
            <Select value={jurisdiction} onValueChange={setJurisdiction}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar jurisdicción" />
              </SelectTrigger>
              <SelectContent className="z-[9999] bg-popover">
                {JURISDICTIONS.map((j) => (
                  <SelectItem key={j.code} value={j.code} textValue={j.name}>
                    <span className="flex items-center gap-2">
                      <span>{j.flag}</span>
                      <span>{j.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Especialidad</label>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar especialidad" />
              </SelectTrigger>
              <SelectContent className="z-[9999] bg-popover">
                {SPECIALTIES.map((s) => (
                  <SelectItem key={s.code} value={s.code} textValue={s.name}>
                    <span className="flex items-center gap-2">
                      <span>{s.icon}</span>
                      <span>{s.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Consultas Sugeridas</h4>
            <div className="space-y-2">
              {getSuggestedQueries().map((suggestion, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2 px-2 text-xs"
                  onClick={() => { setInput(suggestion); setActiveTab('chat'); }}
                >
                  <BookOpen className="h-3 w-3 mr-2 flex-shrink-0" />
                  <span className="line-clamp-2">{suggestion}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* FAQ stats */}
          {faqItems.length > 0 && (
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                <HelpCircle className="h-4 w-4" />
                FAQ: {faqItems.length} preguntas
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setActiveTab('faq')}
              >
                Ver preguntas frecuentes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat principal + FAQ */}
      <Card className="lg:col-span-3">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-5 w-5 text-indigo-500" />
              Asesor Jurídico IA
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {getJurisdictionInfo(jurisdiction).flag} {getJurisdictionInfo(jurisdiction).name}
              </Badge>
              <Badge variant="secondary">
                {getSpecialtyInfo(specialty).icon} {getSpecialtyInfo(specialty).name}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4 pt-2">
              <TabsTrigger value="chat" className="text-xs">💬 Chat</TabsTrigger>
              <TabsTrigger value="faq" className="text-xs">
                📋 FAQ
                {faqItems.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">{faqItems.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="mt-0">
              <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <Scale className="h-12 w-12 mb-4 opacity-50" />
                    <p className="font-medium">Asesor Jurídico IA</p>
                    <p className="text-sm mt-1">
                      Jurisdicción: <strong>{getJurisdictionInfo(jurisdiction).name}</strong> · 
                      Especialidad: <strong>{getSpecialtyInfo(specialty).name}</strong>
                    </p>
                    <p className="text-xs mt-2 max-w-md">
                      Realiza tu consulta y recibirás una respuesta específica con referencias legales concretas.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3",
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {message.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg p-3",
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          )}
                        >
                          {message.role === 'assistant' ? (
                            <div className="text-sm prose prose-sm dark:prose-invert max-w-none [&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/30 [&_a:hover]:decoration-primary">
                              <ReactMarkdown
                                components={{
                                  a: ({ href, children }) => (
                                    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5">
                                      {children}
                                      <ExternalLink className="h-3 w-3 inline-block flex-shrink-0" />
                                    </a>
                                  )
                                }}
                              >
                                {linkifyLegalReferences(message.content)}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          )}
                          
                          {message.role === 'assistant' && message.references && message.references.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border/50">
                              <p className="text-xs font-medium mb-1 flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                Base legal:
                              </p>
                              <ul className="text-xs space-y-1">
                                {message.references.map((ref, i) => {
                                  const resolved = resolveLegalReference(ref);
                                  return (
                                    <li key={i}>
                                      {resolved ? (
                                        <a
                                          href={resolved.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer group"
                                        >
                                          <span>•</span>
                                          <span>{ref}</span>
                                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 ml-1 opacity-60">
                                            {resolved.source}
                                          </Badge>
                                        </a>
                                      ) : (
                                        <span className="text-muted-foreground">• {ref}</span>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}

                          {message.role === 'assistant' && message.confidence && (
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                {message.confidence >= 0.8 ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                ) : (
                                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                                )}
                                Confianza: {Math.round(message.confidence * 100)}%
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(message.content)}>
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleFeedback(message.id, true)}>
                                  <ThumbsUp className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleFeedback(message.id, false)}>
                                  <ThumbsDown className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                        {message.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="bg-muted rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Analizando consulta jurídica...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t">
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Consulta de ${getSpecialtyInfo(specialty).name} (${getJurisdictionInfo(jurisdiction).name})...`}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isLoading || !input.trim()}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Las respuestas son orientativas. Consulte siempre con un profesional para casos específicos.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="faq" className="mt-0">
              <ScrollArea className="h-[450px] p-4">
                {faqLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : faqItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
                    <HelpCircle className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No hay preguntas frecuentes aún para esta combinación.</p>
                    <p className="text-xs mt-1">Las consultas realizadas se guardarán automáticamente como FAQ.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        Preguntas frecuentes — {getJurisdictionInfo(jurisdiction).flag} {getSpecialtyInfo(specialty).name}
                      </span>
                    </div>
                    {faqItems.map((faq) => (
                      <Card 
                        key={faq.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleFAQClick(faq)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{faq.question}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {faq.answer.substring(0, 150)}...
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <Badge variant="outline" className="text-[10px]">
                                {faq.asked_count}x
                              </Badge>
                              {faq.helpful_count > 0 && (
                                <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                                  <ThumbsUp className="h-2.5 w-2.5" /> {faq.helpful_count}
                                </span>
                              )}
                            </div>
                          </div>
                          {faq.legal_references && faq.legal_references.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {faq.legal_references.slice(0, 3).map((ref, i) => (
                                <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0">
                                  {ref}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default LegalAdvisorPanel;
