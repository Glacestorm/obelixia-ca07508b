import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Bot, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Lightbulb,
  AlertCircle
} from 'lucide-react';
import { AgentMessage, VerticalAgentTask } from '@/hooks/admin/verticals/agents/useVerticalAgent';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AgentChatInterfaceProps {
  messages: AgentMessage[];
  isTyping: boolean;
  onSendMessage: (message: string) => Promise<AgentMessage | null>;
  pendingApprovals: VerticalAgentTask[];
  onApprove: (taskId: string) => Promise<void>;
  onReject: (taskId: string, reason: string) => Promise<void>;
}

export function AgentChatInterface({
  messages,
  isTyping,
  onSendMessage,
  pendingApprovals,
  onApprove,
  onReject,
}: AgentChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const message = input.trim();
    setInput('');
    setIsSending(true);

    try {
      await onSendMessage(message);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderAlert = (alert: { level: string; message: string }) => {
    const config = {
      critical: { icon: AlertTriangle, color: 'bg-destructive/10 text-destructive border-destructive/20' },
      warning: { icon: AlertCircle, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
      info: { icon: Lightbulb, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    }[alert.level] || { icon: AlertCircle, color: 'bg-muted' };

    const Icon = config.icon;

    return (
      <div className={cn("flex items-start gap-2 p-2 rounded-lg border", config.color)}>
        <Icon className="h-4 w-4 mt-0.5 shrink-0" />
        <span className="text-sm">{alert.message}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role === 'agent' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}

              <div
                className={cn(
                  "max-w-[80%] space-y-2",
                  msg.role === 'user' ? 'items-end' : 'items-start'
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2",
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted rounded-bl-sm'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>

                {/* Alerts */}
                {msg.alerts && msg.alerts.length > 0 && (
                  <div className="space-y-1">
                    {msg.alerts.map((alert, idx) => (
                      <div key={idx}>{renderAlert(alert)}</div>
                    ))}
                  </div>
                )}

                {/* Recommendations */}
                {msg.recommendations && msg.recommendations.length > 0 && (
                  <div className="space-y-1">
                    {msg.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2 rounded-lg bg-accent/50 border border-accent"
                      >
                        <Lightbulb className="h-4 w-4 text-accent-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{rec.title}</p>
                          <p className="text-xs text-muted-foreground">{rec.description}</p>
                        </div>
                        <Badge
                          variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}
                          className="shrink-0"
                        >
                          {rec.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action requiring approval */}
                {msg.action && msg.action.requiresApproval && msg.action.status === 'pending' && (
                  <div className="p-3 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5">
                    <p className="text-sm font-medium mb-2">
                      Acción propuesta: {msg.action.type}
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Confianza: {Math.round((msg.action.confidence || 0) * 100)}%
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Aprobar
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Rechazar
                      </Button>
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true, locale: es })}
                </p>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Pending approvals banner */}
      {pendingApprovals.length > 0 && (
        <div className="px-4 py-2 bg-yellow-500/10 border-t border-yellow-500/20">
          <p className="text-xs text-yellow-700 dark:text-yellow-400">
            {pendingApprovals.length} tarea{pendingApprovals.length > 1 ? 's' : ''} esperando aprobación en la pestaña "Tareas"
          </p>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            disabled={isSending}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || isSending}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AgentChatInterface;
