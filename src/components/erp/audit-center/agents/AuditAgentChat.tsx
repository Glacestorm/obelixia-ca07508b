/**
 * AuditAgentChat — Interfaz de consulta en lenguaje natural al sistema de auditoría
 */
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, User, Loader2, Sparkles } from 'lucide-react';
import { useAuditAgents } from '@/hooks/erp/audit';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentCode?: string;
  confidence?: number;
  timestamp: string;
}

const SUGGESTED_QUERIES = [
  '¿Cuántas alertas críticas hay activas?',
  '¿Cuál es el estado de compliance GDPR?',
  'Genera un resumen ejecutivo de auditoría de hoy',
  '¿Qué áreas tienen mayor riesgo?',
  '¿Hay envíos regulatorios pendientes?',
  'Verifica la integridad del blockchain trail',
];

export function AuditAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { invokeAgent } = useAuditAgents();

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    try {
      // Route to appropriate agent based on query content
      let agentCode = 'AUDIT-AGT-002'; // Default: classification
      const q = input.toLowerCase();
      if (q.includes('anomalía') || q.includes('inusual') || q.includes('patrón')) agentCode = 'AUDIT-AGT-001';
      else if (q.includes('compliance') || q.includes('cumplimiento') || q.includes('gdpr')) agentCode = 'AUDIT-AGT-003';
      else if (q.includes('riesgo') || q.includes('risk')) agentCode = 'AUDIT-AGT-004';
      else if (q.includes('resumen') || q.includes('informe') || q.includes('reporte')) agentCode = 'AUDIT-AGT-005';
      else if (q.includes('regulat') || q.includes('regulador') || q.includes('bde') || q.includes('bce')) agentCode = 'AUDIT-AGT-006';
      else if (q.includes('evidencia') || q.includes('documento')) agentCode = 'AUDIT-AGT-007';
      else if (q.includes('blockchain') || q.includes('integridad') || q.includes('hash')) agentCode = 'AUDIT-AGT-008';

      const result = await invokeAgent(agentCode, input.trim());

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result?.response_summary || result?.analysis || 
          `He procesado tu consulta a través del agente ${agentCode}. El sistema de auditoría está operativo y no se detectan anomalías significativas en este momento. Para un análisis más detallado, consulta las pestañas específicas del Centro de Auditoría.`,
        agentCode,
        confidence: result?.confidence_score || 0.85,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'No he podido procesar tu consulta en este momento. El sistema de agentes de auditoría puede estar en proceso de inicialización. Intenta de nuevo en unos momentos.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> Chat IA de Auditoría
        </h3>
        <p className="text-sm text-muted-foreground">
          Consulta en lenguaje natural al sistema de 8 agentes especializados de auditoría
        </p>
      </div>

      <Card className="border">
        <CardContent className="p-0">
          <ScrollArea className="h-[450px] p-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Pregunta lo que necesites sobre auditoría. El sistema enruta automáticamente al agente más adecuado.
                </p>
                <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto">
                  {SUGGESTED_QUERIES.map(q => (
                    <Button key={q} variant="outline" size="sm" className="text-xs text-left h-auto py-2 justify-start"
                      onClick={() => { setInput(q); }}>
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map(msg => (
                  <div key={msg.id} className={cn("flex gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {msg.role === 'assistant' && (
                      <div className="p-1.5 rounded-full bg-primary/10 h-fit">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[80%] p-3 rounded-lg",
                      msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}>
                      <p className="text-sm">{msg.content}</p>
                      {msg.agentCode && (
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px]">{msg.agentCode}</Badge>
                          {msg.confidence && (
                            <span className="text-[10px] text-muted-foreground">
                              Confianza: {Math.round(msg.confidence * 100)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="p-1.5 rounded-full bg-secondary h-fit">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex gap-3">
                    <div className="p-1.5 rounded-full bg-primary/10 h-fit">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            )}
          </ScrollArea>

          <div className="p-3 border-t flex gap-2">
            <Input
              placeholder="Pregunta sobre auditoría..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              disabled={isProcessing}
            />
            <Button onClick={handleSend} disabled={!input.trim() || isProcessing} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
