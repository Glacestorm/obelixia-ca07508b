/**
 * AgentHelpChatbot - Chatbot especializado por agente con voz
 * Respuestas escritas y habladas a preguntas escritas o habladas
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RefreshCw,
  Sparkles,
  User,
  Bot,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  MessageSquare,
  Wand2,
} from 'lucide-react';
import { useAgentHelp, type HelpConversation } from '@/hooks/admin/agents/useAgentHelp';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

interface AgentHelpChatbotProps {
  agentId: string;
  agentType: 'crm' | 'erp' | 'supervisor' | 'vertical';
  agentName: string;
  agentDescription?: string;
  moduleType?: string;
  className?: string;
}

// Sugerencias de preguntas según tipo de agente
const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  supervisor: [
    '¿Cómo coordinas a todos los agentes?',
    '¿Qué optimizaciones puedes hacer?',
    '¿Cómo resuelves conflictos entre agentes?',
    'Dame un resumen del estado del sistema',
  ],
  crm: [
    '¿Cómo puedo mejorar mi pipeline?',
    '¿Qué leads debería priorizar?',
    '¿Cómo predices el churn?',
    'Dame tips para cerrar más deals',
  ],
  erp: [
    '¿Cómo automatizo asientos repetitivos?',
    '¿Qué validaciones aplicas?',
    '¿Cómo optimizas la conciliación?',
    'Ayúdame con el cierre mensual',
  ],
  vertical: [
    '¿Qué funciones específicas ofreces?',
    '¿Cómo me ayudas con la normativa?',
    'Dame ejemplos de automatización',
    '¿Qué informes puedes generar?',
  ],
};

export function AgentHelpChatbot({
  agentId,
  agentType,
  agentName,
  agentDescription,
  moduleType,
  className
}: AgentHelpChatbotProps) {
  const [input, setInput] = useState('');
  const [autoSpeak, setAutoSpeak] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isLoading,
    isSpeaking,
    isListening,
    sendMessage,
    clearConversation,
    speakResponse,
    startListening,
    stopListening,
    provideFeedback,
  } = useAgentHelp({
    agentId,
    agentType,
    agentName,
    agentDescription,
    moduleType
  });

  const suggestions = SUGGESTED_QUESTIONS[agentType] || SUGGESTED_QUESTIONS.crm;

  // Auto-scroll al nuevo mensaje
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Enviar mensaje
  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    
    const message = input;
    setInput('');
    
    const response = await sendMessage(message);
    
    if (response && autoSpeak) {
      await speakResponse(response);
    }
  }, [input, isLoading, sendMessage, speakResponse, autoSpeak]);

  // Enviar sugerencia
  const handleSuggestion = useCallback(async (suggestion: string) => {
    const response = await sendMessage(suggestion);
    if (response && autoSpeak) {
      await speakResponse(response);
    }
  }, [sendMessage, speakResponse, autoSpeak]);

  // Toggle grabación de voz
  const handleVoiceToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Hablar respuesta
  const handleSpeak = useCallback((text: string) => {
    if (!isSpeaking) {
      speakResponse(text);
    }
  }, [isSpeaking, speakResponse]);

  // Feedback
  const handleFeedback = useCallback((messageId: string, positive: boolean) => {
    provideFeedback(messageId, positive ? 5 : 1, positive);
  }, [provideFeedback]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header con controles */}
      <div className="px-4 py-2 border-b flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquare className="h-4 w-4" />
          <span>Chat con {agentName}</span>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={autoSpeak ? "default" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setAutoSpeak(!autoSpeak)}
              >
                {autoSpeak ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {autoSpeak ? 'Desactivar respuestas por voz' : 'Activar respuestas por voz'}
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={clearConversation}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Nueva conversación</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Área de mensajes */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {/* Mensaje de bienvenida si no hay mensajes */}
          {messages.length === 0 && (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Wand2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">¡Hola! Soy {agentName}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {agentDescription || 'Estoy aquí para ayudarte. Pregúntame lo que necesites.'}
                </p>
              </div>
              
              {/* Sugerencias */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Prueba preguntando:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestions.map((q, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-1.5 px-3"
                      onClick={() => handleSuggestion(q)}
                      disabled={isLoading}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Mensajes */}
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5",
                  message.role === 'user' 
                    ? "bg-primary text-primary-foreground rounded-br-md" 
                    : "bg-muted rounded-bl-md"
                )}>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {message.role === 'assistant' ? (
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    ) : (
                      <p className="m-0">{message.content}</p>
                    )}
                  </div>
                  
                  {/* Controles del mensaje del asistente */}
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleSpeak(message.content)}
                            disabled={isSpeaking}
                          >
                            <Volume2 className={cn("h-3 w-3", isSpeaking && "animate-pulse")} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Escuchar respuesta</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:text-emerald-500"
                            onClick={() => handleFeedback(message.id, true)}
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Útil</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:text-rose-500"
                            onClick={() => handleFeedback(message.id, false)}
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>No útil</TooltipContent>
                      </Tooltip>
                      
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                  )}
                </div>
                
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Indicador de carga */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Pensando...</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 border-t bg-background/95 backdrop-blur">
        {/* Indicador de escucha activa */}
        {isListening && (
          <div className="mb-2 flex items-center justify-center gap-2 text-sm text-primary">
            <div className="flex gap-0.5">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-primary rounded-full"
                  animate={{
                    height: [8, 16, 8],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>
            <span>Escuchando...</span>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={`Pregunta a ${agentName}...`}
              disabled={isLoading || isListening}
              className="pr-10"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                onClick={handleVoiceToggle}
                disabled={isLoading}
                className="flex-shrink-0"
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isListening ? 'Detener grabación' : 'Hablar'}
            </TooltipContent>
          </Tooltip>
        </div>
        
        <p className="text-xs text-muted-foreground text-center mt-2">
          Pulsa el micrófono para hablar o escribe tu pregunta
        </p>
      </div>
    </div>
  );
}

export default AgentHelpChatbot;
