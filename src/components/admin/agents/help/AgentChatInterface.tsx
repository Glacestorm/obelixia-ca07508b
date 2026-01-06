// Agent Chat Interface - Text and Voice chat with agents
import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  Bot,
  User,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { AgentChatMessage, AgentChatSession, AgentHelpConfig } from '@/hooks/admin/agents/agentHelpTypes';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AgentChatInterfaceProps {
  config: AgentHelpConfig;
  chatSession: AgentChatSession | null;
  onSendMessage: (content: string, isVoice?: boolean) => Promise<AgentChatMessage | null>;
  onFeedback: (messageId: string, feedback: 'positive' | 'negative') => void;
  onClearChat: () => void;
  isLoading?: boolean;
  className?: string;
}

export const AgentChatInterface = memo(function AgentChatInterface({
  config,
  chatSession,
  onSendMessage,
  onFeedback,
  onClearChat,
  isLoading,
  className,
}: AgentChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = chatSession?.messages || [];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Handle send message
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isSending) return;
    
    const content = inputValue.trim();
    setInputValue('');
    setIsSending(true);
    
    try {
      await onSendMessage(content, false);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [inputValue, isSending, onSendMessage]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Toggle voice listening (placeholder - would integrate with STT)
  const toggleListening = useCallback(() => {
    setIsListening(prev => !prev);
    // TODO: Integrate with actual STT
  }, []);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between bg-gradient-to-r from-accent/10 to-primary/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-sm">Chat con {config.name}</h3>
            <p className="text-xs text-muted-foreground">Pregunta lo que necesites</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Toggle
            size="sm"
            pressed={voiceEnabled}
            onPressedChange={setVoiceEnabled}
            aria-label="Activar respuestas de voz"
          >
            {voiceEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Toggle>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearChat}
              className="text-xs"
            >
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <Bot className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              ¡Hola! Soy el asistente de {config.name}
            </p>
            <p className="text-xs text-muted-foreground">
              Pregúntame sobre capacidades, ejemplos o cómo usar este agente
            </p>
            
            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {['¿Qué puedes hacer?', '¿Cómo empiezo?', 'Dame un ejemplo'].map((q) => (
                <Button
                  key={q}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setInputValue(q);
                    inputRef.current?.focus();
                  }}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onFeedback={onFeedback}
              />
            ))}
            
            {isSending && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Pensando...</span>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t bg-background">
        <div className="flex items-center gap-2">
          <Button
            variant={isListening ? 'destructive' : 'outline'}
            size="icon"
            onClick={toggleListening}
            disabled={isSending}
          >
            {isListening ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Escribe tu pregunta..."
            disabled={isSending}
            className="flex-1"
          />
          
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            size="icon"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {isListening && (
          <div className="mt-2 p-2 rounded bg-destructive/10 text-center">
            <Badge variant="destructive" className="animate-pulse">
              <Mic className="h-3 w-3 mr-1" />
              Escuchando...
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
});

// Message Bubble Component
interface MessageBubbleProps {
  message: AgentChatMessage;
  onFeedback: (messageId: string, feedback: 'positive' | 'negative') => void;
}

const MessageBubble = memo(function MessageBubble({
  message,
  onFeedback,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn(
      "flex gap-2",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <div className={cn(
        "shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isUser ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      
      <div className={cn(
        "flex flex-col max-w-[80%]",
        isUser ? "items-end" : "items-start"
      )}>
        <Card className={cn(
          "px-3 py-2",
          isUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted"
        )}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </Card>
        
        <div className="flex items-center gap-2 mt-1 px-1">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.timestamp), { 
              addSuffix: true, 
              locale: es 
            })}
          </span>
          
          {message.isVoice && (
            <Badge variant="outline" className="text-xs">
              <Mic className="h-2 w-2 mr-1" />
              Voz
            </Badge>
          )}
          
          {!isUser && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6",
                  message.feedback === 'positive' && "text-green-500"
                )}
                onClick={() => onFeedback(message.id, 'positive')}
              >
                <ThumbsUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6",
                  message.feedback === 'negative' && "text-red-500"
                )}
                onClick={() => onFeedback(message.id, 'negative')}
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default AgentChatInterface;
