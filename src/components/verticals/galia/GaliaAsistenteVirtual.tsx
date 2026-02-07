import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { useGaliaAsistenteIA, GaliaMessage } from '@/hooks/galia/useGaliaAsistenteIA';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface GaliaAsistenteVirtualProps {
  modo?: 'ciudadano' | 'tecnico';
  galId?: string;
  expedienteId?: string;
  solicitudId?: string;
  className?: string;
  onClose?: () => void;
}

export function GaliaAsistenteVirtual({
  modo = 'ciudadano',
  galId,
  expedienteId,
  solicitudId,
  className,
  onClose,
}: GaliaAsistenteVirtualProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isLoading,
    error,
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

  // Add welcome message on mount
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
  }, [displayMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message);
    inputRef.current?.focus();
  };

  const handleFeedback = async (messageId: string, positive: boolean) => {
    await submitFeedback(messageId, positive ? 5 : 1);
  };

  const handleClear = () => {
    clearMessages();
    setDisplayMessages([getWelcomeMessage()]);
  };

  return (
    <Card className={cn("flex flex-col h-[600px]", className)}>
      <CardHeader className="pb-2 border-b shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">
                Asistente GALIA
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {modo === 'ciudadano' ? 'Ayudas LEADER' : 'Copiloto Técnico'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              IA
            </Badge>
            {messages.length > 0 && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClear}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {onClose && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages */}
        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          <div className="space-y-4">
            {displayMessages.map((message) => (
              <div
                key={message.id}
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
                          <span className="text-xs text-muted-foreground">
                            Confianza: {Math.round(message.confianza * 100)}%
                          </span>
                        )}
                        {message.derivadoTecnico && (
                          <Badge variant="outline" className="text-xs">
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
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Pensando...</span>
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
            Asistente IA para información general. Consultas oficiales, contacta con tu técnico.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default GaliaAsistenteVirtual;
