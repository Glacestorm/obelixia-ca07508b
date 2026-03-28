/**
 * LegalAdvisorPanel - Chat de asesoría jurídica IA multi-jurisdiccional
 * Con ejecución de acciones legales, routing a supervisores/agentes, y seguimiento de trámites
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
  Send, Scale, Loader2, Bot, User, Globe, BookOpen, AlertTriangle,
  CheckCircle2, Copy, ThumbsUp, ThumbsDown, HelpCircle, TrendingUp,
  ExternalLink, Mic, MicOff, Volume2, VolumeX, Zap, ClipboardList,
  ArrowRight, Gavel, Shield
} from 'lucide-react';
import { linkifyLegalReferences, resolveLegalReference } from '@/utils/legalReferenceResolver';
import { supabase } from '@/integrations/supabase/client';
import { useLegalProcedures, type IntentClassification } from '@/hooks/erp/legal/useLegalProcedures';
import { LegalProcedureCard } from './LegalProcedureCard';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

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
  // Action-related
  classification?: IntentClassification;
  procedureId?: string;
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
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [jurisdiction, setJurisdiction] = useState('ES');
  const [specialty, setSpecialty] = useState('general');
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    isListening, startListening, stopListening, sttSupported,
    isSpeaking, speak, stopSpeaking, ttsSupported,
  } = useWebSpeech({
    lang: jurisdiction === 'AD' ? 'ca-AD' : 'es-ES',
    onResult: (text) => setInput(prev => prev ? prev + ' ' + text : text),
  });

  const {
    activeProcedures, completedProcedures, isClassifying,
    classifyIntent, cancelProcedure, fetchProcedures,
  } = useLegalProcedures(companyId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load FAQ
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
    } catch { /* silent */ }
    finally { setFaqLoading(false); }
  }, [jurisdiction, specialty]);

  useEffect(() => { loadFAQ(); }, [loadFAQ]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      jurisdiction,
      specialty,
    };

    setMessages(prev => [...prev, userMessage]);
    const query = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Step 1: Classify intent via action router
      const conversationHistory = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const classification = await classifyIntent(query, jurisdiction, specialty, sessionId, conversationHistory);

      // Step 2: Always get legal advice from the legal-ai-advisor
      const { data, error } = await supabase.functions.invoke('legal-ai-advisor', {
        body: {
          action: 'consult_legal',
          context: {
            companyId, jurisdiction, specialty,
            query: query,
            conversationHistory,
          }
        }
      });

      if (error) throw error;

      // Build response content
      let responseContent = data?.data?.advice || data?.data?.response || 'No se pudo obtener una respuesta.';
      
      // If actionable, enrich the response with action info
      if (classification?.intent_type === 'actionable' && classification.procedure_type) {
        const actionBlock = [
          '',
          '---',
          '',
          '⚡ **Trámite Ejecutable Detectado**',
          '',
          `**${classification.title}**`,
          '',
          classification.description || '',
          '',
          `📋 **Pasos a seguir:** ${classification.steps?.length || 0} pasos identificados`,
          `🎯 **Módulo:** ${classification.target_module?.toUpperCase()}`,
          classification.target_supervisor 
            ? `👤 **Supervisor:** ${classification.target_supervisor}` 
            : `🤖 **Agente:** ${classification.target_agent}`,
          `⚠️ **Riesgo:** ${classification.risk_assessment || 'Evaluado'}`,
          `📊 **Confianza:** ${Math.round((classification.confidence || 0) * 100)}%`,
          '',
          classification.requires_human_review 
            ? '🔒 Este trámite requiere **revisión humana** antes de ejecutarse.' 
            : '✅ Trámite iniciado automáticamente.',
          '',
          classification.manual_action_hint 
            ? `💡 **Acceso manual:** ${classification.manual_action_hint}` 
            : '',
          '',
          '> Consulta el tab **📋 Trámites** para hacer seguimiento en tiempo real.',
        ].filter(Boolean).join('\n');

        responseContent += actionBlock;
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        jurisdiction,
        specialty,
        references: data?.data?.references || data?.data?.legal_basis || [],
        confidence: data?.data?.confidence || 0.85,
        classification: classification || undefined,
        procedureId: classification?.procedure_id,
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (autoSpeak && ttsSupported) {
        speak(data?.data?.advice || data?.data?.response || responseContent);
      }
      
      setTimeout(() => loadFAQ(), 2000);
    } catch (error) {
      console.error('Error consulting legal advisor:', error);
      toast.error('Error al consultar el asesor jurídico');
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Lo siento, no pude procesar tu consulta en este momento. Por favor, intenta de nuevo.',
        timestamp: new Date(),
        jurisdiction,
        specialty,
      }]);
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
    const msg = messages.find(m => m.id === messageId);
    if (msg?.role === 'assistant') {
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

  const handleNavigateToModule = (link: string) => {
    navigate(link);
  };

  const getJurisdictionInfo = (code: string) => JURISDICTIONS.find(j => j.code === code) || JURISDICTIONS[0];
  const getSpecialtyInfo = (code: string) => SPECIALTIES.find(s => s.code === code) || SPECIALTIES[5];

  const getSuggestedQueries = () => {
    const suggestions: Record<string, Record<string, string[]>> = {
      ES: {
        labor: [
          'Quiero despedir a un empleado por bajo rendimiento',
          'Necesito iniciar un ERE temporal de 3 meses',
          '¿Qué indemnización corresponde por despido improcedente?',
        ],
        corporate: [
          'Quiero modificar los estatutos de la sociedad',
          '¿Cuándo es obligatoria una auditoría de cuentas?',
          'Necesito disolver una filial inactiva',
        ],
        tax: [
          '¿Cuál es el tipo del Impuesto de Sociedades 2026?',
          'Quiero aplazar el pago de IVA del trimestre',
          '¿Qué gastos son deducibles en el IS?',
        ],
        data_protection: [
          'Un empleado ha solicitado el derecho al olvido',
          '¿Cuándo es obligatorio nombrar un DPO?',
          'Necesito notificar una brecha de seguridad',
        ],
        banking: [
          '¿Qué obligaciones impone MiFID II a las entidades?',
          '¿Cuáles son los requisitos AML/KYC vigentes?',
          'Quiero revisar el cumplimiento DORA',
        ],
        general: [
          'Quiero despedir a un empleado por causas objetivas',
          '¿Qué obligaciones tengo bajo GDPR?',
          'Necesito revisar el convenio colectivo aplicable',
        ],
      },
      AD: {
        labor: [
          'Vull acomiadar un treballador segons el Codi Laboral',
          '¿Cuál es la indemnización por despido en Andorra?',
          '¿Qué permisos retribuidos contempla la legislación andorrana?',
        ],
        general: [
          '¿Qué impuestos se aplican a las sociedades en Andorra?',
          '¿Cómo se constituye una sociedad en Andorra?',
          '¿Qué obligaciones impone la APDA Llei 29/2021?',
        ],
      },
    };

    return suggestions[jurisdiction]?.[specialty] 
      || suggestions[jurisdiction]?.general 
      || suggestions.ES.general;
  };

  const totalActiveProcedures = activeProcedures.length;

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
              <SelectTrigger><SelectValue placeholder="Seleccionar jurisdicción" /></SelectTrigger>
              <SelectContent className="z-[9999] bg-popover">
                {JURISDICTIONS.map((j) => (
                  <SelectItem key={j.code} value={j.code} textValue={j.name}>
                    <span className="flex items-center gap-2"><span>{j.flag}</span><span>{j.name}</span></span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Especialidad</label>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger><SelectValue placeholder="Seleccionar especialidad" /></SelectTrigger>
              <SelectContent className="z-[9999] bg-popover">
                {SPECIALTIES.map((s) => (
                  <SelectItem key={s.code} value={s.code} textValue={s.name}>
                    <span className="flex items-center gap-2"><span>{s.icon}</span><span>{s.name}</span></span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action capabilities notice */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Acciones ejecutables</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Puedes pedir acciones concretas como despidos, contratos, sanciones, etc. 
              El sistema las clasificará y enrutará al supervisor o agente apropiado.
            </p>
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
                  {suggestion.toLowerCase().includes('quiero') || suggestion.toLowerCase().includes('necesito') 
                    ? <Zap className="h-3 w-3 mr-2 flex-shrink-0 text-primary" />
                    : <BookOpen className="h-3 w-3 mr-2 flex-shrink-0" />
                  }
                  <span className="line-clamp-2">{suggestion}</span>
                </Button>
              ))}
            </div>
          </div>

          {faqItems.length > 0 && (
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                <HelpCircle className="h-4 w-4" />
                FAQ: {faqItems.length} preguntas
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setActiveTab('faq')}>
                Ver preguntas frecuentes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat + FAQ + Trámites */}
      <Card className="lg:col-span-3">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-5 w-5 text-indigo-500" />
              Asesor Jurídico IA
              {isClassifying && (
                <Badge variant="secondary" className="text-[10px] animate-pulse gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Clasificando...
                </Badge>
              )}
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
              <TabsTrigger value="procedures" className="text-xs gap-1">
                📋 Trámites
                {totalActiveProcedures > 0 && (
                  <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center">
                    {totalActiveProcedures}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="faq" className="text-xs">
                ❓ FAQ
                {faqItems.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">{faqItems.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ============ CHAT TAB ============ */}
            <TabsContent value="chat" className="mt-0">
              <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <div className="relative">
                      <Scale className="h-12 w-12 mb-4 opacity-50" />
                      <Zap className="h-5 w-5 absolute -top-1 -right-1 text-primary" />
                    </div>
                    <p className="font-medium">Asesor Jurídico IA con Acciones Ejecutables</p>
                    <p className="text-sm mt-1">
                      Jurisdicción: <strong>{getJurisdictionInfo(jurisdiction).name}</strong> · 
                      Especialidad: <strong>{getSpecialtyInfo(specialty).name}</strong>
                    </p>
                    <p className="text-xs mt-2 max-w-md">
                      Realiza consultas informativas o solicita acciones concretas (despidos, contratos, sanciones...). 
                      El sistema clasificará tu intención y la enrutará al supervisor o agente apropiado.
                    </p>
                    <div className="flex items-center gap-4 mt-4 text-xs">
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        <span>Consultas</span>
                      </div>
                      <div className="flex items-center gap-1 text-primary">
                        <Zap className="h-3 w-3" />
                        <span>Acciones</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ClipboardList className="h-3 w-3" />
                        <span>Seguimiento</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn("flex gap-3", message.role === 'user' ? 'justify-end' : 'justify-start')}
                      >
                        {message.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          </div>
                        )}
                        <div className={cn(
                          "max-w-[80%] rounded-lg p-3",
                          message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        )}>
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
                          
                          {/* Action card inline */}
                          {message.classification?.intent_type === 'actionable' && message.classification.module_deep_link && (
                            <div className="mt-3 p-2 rounded-md bg-primary/5 border border-primary/20">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => handleNavigateToModule(message.classification!.module_deep_link!)}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Ir al módulo
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => setActiveTab('procedures')}
                                >
                                  <ClipboardList className="h-3 w-3" />
                                  Ver trámite
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* References */}
                          {message.role === 'assistant' && message.references && message.references.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border/50">
                              <p className="text-xs font-medium mb-1 flex items-center gap-1">
                                <BookOpen className="h-3 w-3" /> Base legal:
                              </p>
                              <ul className="text-xs space-y-1">
                                {message.references.map((ref, i) => {
                                  const resolved = resolveLegalReference(ref);
                                  return (
                                    <li key={i}>
                                      {resolved ? (
                                        <a href={resolved.url} target="_blank" rel="noopener noreferrer" 
                                           className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer group">
                                          <span>•</span><span>{ref}</span>
                                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 ml-1 opacity-60">{resolved.source}</Badge>
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

                          {/* Confidence + actions */}
                          {message.role === 'assistant' && message.confidence && (
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                {message.confidence >= 0.8 ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                ) : (
                                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                                )}
                                Confianza: {Math.round(message.confidence * 100)}%
                                {message.classification?.intent_type === 'actionable' && (
                                  <Badge variant="outline" className="ml-2 text-[9px] px-1 py-0 border-primary/30 text-primary">
                                    <Zap className="h-2.5 w-2.5 mr-0.5" /> Acción
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {ttsSupported && (
                                  <Button variant="ghost" size="icon" className="h-6 w-6" 
                                    onClick={() => isSpeaking ? stopSpeaking() : speak(message.content)}>
                                    {isSpeaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                                  </Button>
                                )}
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
                            <span className="text-sm">
                              {isClassifying ? 'Clasificando intención y enrutando...' : 'Analizando consulta jurídica...'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t space-y-2">
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                  {sttSupported && (
                    <Button type="button" variant={isListening ? 'destructive' : 'outline'} size="icon"
                      onClick={isListening ? stopListening : startListening} disabled={isLoading}
                      className={cn("flex-shrink-0", isListening && "animate-pulse")}>
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  )}
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isListening ? 'Escuchando...' : `Consulta o acción de ${getSpecialtyInfo(specialty).name}...`}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isLoading || !input.trim()}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    💡 Pide acciones concretas: "Quiero despedir a..." | "Necesito un contrato de..." | Consultas informativas
                  </p>
                  {ttsSupported && (
                    <Button variant="ghost" size="sm" onClick={() => setAutoSpeak(!autoSpeak)}
                      className={cn("text-xs h-6 gap-1", autoSpeak && "text-primary")}>
                      <Volume2 className="h-3 w-3" />
                      {autoSpeak ? 'Voz activa' : 'Voz'}
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ============ PROCEDURES TAB ============ */}
            <TabsContent value="procedures" className="mt-0">
              <ScrollArea className="h-[450px] p-4">
                {/* Active procedures */}
                {activeProcedures.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Gavel className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Trámites Activos ({activeProcedures.length})</span>
                    </div>
                    <div className="space-y-2">
                      {activeProcedures.map(proc => (
                        <LegalProcedureCard
                          key={proc.id}
                          procedure={proc}
                          onCancel={cancelProcedure}
                          onNavigate={handleNavigateToModule}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed procedures */}
                {completedProcedures.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Historial ({completedProcedures.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {completedProcedures.slice(0, 10).map(proc => (
                        <LegalProcedureCard
                          key={proc.id}
                          procedure={proc}
                          onNavigate={handleNavigateToModule}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                )}

                {activeProcedures.length === 0 && completedProcedures.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
                    <ClipboardList className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No hay trámites registrados</p>
                    <p className="text-xs mt-1">
                      Pide una acción concreta en el chat (ej: "Quiero despedir a un empleado") y aparecerá aquí.
                    </p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* ============ FAQ TAB ============ */}
            <TabsContent value="faq" className="mt-0">
              <ScrollArea className="h-[450px] p-4">
                {faqLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : faqItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
                    <HelpCircle className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No hay preguntas frecuentes aún.</p>
                    <p className="text-xs mt-1">Las consultas realizadas se guardarán automáticamente.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        FAQ — {getJurisdictionInfo(jurisdiction).flag} {getSpecialtyInfo(specialty).name}
                      </span>
                    </div>
                    {faqItems.map((faq) => (
                      <Card key={faq.id} className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleFAQClick(faq)}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{faq.question}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {faq.answer.substring(0, 150)}...
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <Badge variant="outline" className="text-[10px]">{faq.asked_count}x</Badge>
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
                                <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0">{ref}</Badge>
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
