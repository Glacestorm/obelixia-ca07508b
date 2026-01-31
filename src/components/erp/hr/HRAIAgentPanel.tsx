/**
 * HRAIAgentPanel - Agente IA especializado en RRHH
 * Chat bidireccional con voz, integrado con supervisor de agentes
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Brain, Send, Mic, MicOff, Volume2, VolumeX, Sparkles,
  Users, FileText, Calculator, Calendar, Shield, BookOpen,
  Loader2, RefreshCw, Lightbulb
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface HRAIAgentPanelProps {
  companyId: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

export function HRAIAgentPanel({ companyId }: HRAIAgentPanelProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Speech recognition - use any for browser compatibility
  const recognitionRef = useRef<any>(null);

  // Suggested questions
  const suggestedQuestions = [
    "¿Cómo calculo la indemnización por despido improcedente?",
    "¿Cuáles son los tipos de contrato según el ET?",
    "¿Qué obligaciones tengo en prevención de riesgos?",
    "¿Cómo gestiono las vacaciones según convenio?",
    "¿Cuándo es obligatoria la formación PRL?",
    "¿Qué normativa aplica a mi CNAE?"
  ];

  useEffect(() => {
    // Initialize with welcome message
    setMessages([{
      role: 'assistant',
      content: `¡Hola! 👋 Soy el **Agente IA de Recursos Humanos**. 

Estoy especializado en:
- 📋 **Legislación laboral** (Estatuto de los Trabajadores, convenios)
- 💰 **Nóminas e IRPF** (cálculos, deducciones, retenciones)
- 📝 **Contratos** (tipos, requisitos, extinciones)
- 🏖️ **Vacaciones y permisos** (según normativa y convenio)
- ⚠️ **Prevención de Riesgos Laborales** (obligaciones según CNAE)
- 💼 **Finiquitos e indemnizaciones** (cálculos automáticos)

¿En qué puedo ayudarte hoy?`,
      timestamp: new Date(),
      suggestions: suggestedQuestions.slice(0, 3)
    }]);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionClass();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        handleSend(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast.error('Error en reconocimiento de voz');
      };
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error('Reconocimiento de voz no disponible');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const speakText = useCallback((text: string) => {
    if (!autoSpeak) return;
    
    // Clean markdown for speech
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#/g, '')
      .replace(/- /g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-ES';
    utterance.rate = 1;
    utterance.pitch = 1;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  }, [autoSpeak]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const handleSend = async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-ai-agent', {
        body: {
          action: 'chat',
          company_id: companyId,
          message: text,
          context: {
            user_id: user?.id,
            module: 'hr'
          },
          history: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          }))
        }
      });

      if (error) throw error;

      const response = data?.response || 'Lo siento, no pude procesar tu consulta.';
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        suggestions: data?.suggestions
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Auto-speak response
      if (autoSpeak) {
        speakText(response);
      }

    } catch (error) {
      console.error('[HRAIAgent] Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.',
        timestamp: new Date()
      }]);
      toast.error('Error al comunicarse con el agente');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    handleSend(suggestion);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Chat principal */}
      <Card className="lg:col-span-3">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Agente IA de RRHH</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Especializado en legislación laboral española
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={autoSpeak ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  if (isSpeaking) stopSpeaking();
                  setAutoSpeak(!autoSpeak);
                }}
              >
                {autoSpeak ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={toggleListening}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Messages */}
          <ScrollArea className="h-[450px] p-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-3",
                    message.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10">
                        <Brain className="h-4 w-4 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg p-3",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <div 
                      className="text-sm whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ 
                        __html: message.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br/>')
                      }}
                    />
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            <Lightbulb className="h-3 w-3 mr-1" />
                            {suggestion.slice(0, 40)}...
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10">
                      <Brain className="h-4 w-4 text-primary animate-pulse" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analizando consulta...
                    </div>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
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
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Escribe tu consulta sobre RRHH..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !inputValue.trim()}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Panel lateral */}
      <div className="space-y-4">
        {/* Capacidades */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Capacidades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { icon: FileText, label: 'Contratos laborales' },
              { icon: Calculator, label: 'Cálculo nóminas' },
              { icon: Calendar, label: 'Gestión vacaciones' },
              { icon: Shield, label: 'Prevención riesgos' },
              { icon: Users, label: 'Convenios colectivos' },
              { icon: BookOpen, label: 'Normativa CNAE' },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Preguntas sugeridas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Preguntas frecuentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {suggestedQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-2 text-xs"
                    onClick={() => handleSuggestionClick(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default HRAIAgentPanel;
