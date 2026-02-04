/**
 * LegalAdvisorPanel - Chat de asesoría jurídica IA multi-jurisdiccional
 * Consultas legales con selección de jurisdicción y especialidad
 */

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  ThumbsDown
} from 'lucide-react';
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
            conversationHistory: messages.slice(-5).map(m => ({
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
        content: data?.data?.advice || data?.data?.response || 'No se pudo obtener una respuesta. Intente nuevamente.',
        timestamp: new Date(),
        jurisdiction,
        specialty,
        references: data?.data?.references || [],
        confidence: data?.data?.confidence || 0.85
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error consulting legal advisor:', error);
      toast.error('Error al consultar el asesor jurídico');
      
      // Fallback response
      const fallbackMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Lo siento, no pude procesar tu consulta en este momento. Por favor, intenta de nuevo o contacta con soporte técnico.',
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

  const handleFeedback = (messageId: string, isPositive: boolean) => {
    toast.success(isPositive ? 'Gracias por tu feedback positivo' : 'Gracias, mejoraremos nuestra respuesta');
  };

  const getJurisdictionInfo = (code: string) => {
    return JURISDICTIONS.find(j => j.code === code) || JURISDICTIONS[0];
  };

  const getSpecialtyInfo = (code: string) => {
    return SPECIALTIES.find(s => s.code === code) || SPECIALTIES[5];
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
              {[
                '¿Cuáles son los requisitos para despido procedente?',
                '¿Qué obligaciones tengo bajo GDPR?',
                '¿Cómo debo documentar un contrato mercantil?'
              ].map((suggestion, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2 px-2 text-xs"
                  onClick={() => setInput(suggestion)}
                >
                  <BookOpen className="h-3 w-3 mr-2 flex-shrink-0" />
                  <span className="line-clamp-2">{suggestion}</span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chat principal */}
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
          <ScrollArea className="h-[450px] p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Scale className="h-12 w-12 mb-4 opacity-50" />
                <p className="font-medium">Bienvenido al Asesor Jurídico IA</p>
                <p className="text-sm mt-1">
                  Selecciona jurisdicción y especialidad, luego realiza tu consulta legal.
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
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      
                      {message.role === 'assistant' && message.references && message.references.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <p className="text-xs font-medium mb-1 flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            Referencias:
                          </p>
                          <ul className="text-xs space-y-0.5">
                            {message.references.map((ref, i) => (
                              <li key={i} className="text-muted-foreground">• {ref}</li>
                            ))}
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleCopy(message.content)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleFeedback(message.id, true)}
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleFeedback(message.id, false)}
                            >
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
                        <span className="text-sm">Analizando consulta...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu consulta legal..."
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
              Las respuestas son orientativas. Consulte siempre con un profesional para casos específicos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LegalAdvisorPanel;
