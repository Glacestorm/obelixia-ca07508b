/**
 * LegalAdvisorPanel - Panel de consulta al Asesor Legal IA
 * Interfaz de chat para consultas legales con contexto multi-jurisdiccional
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Scale,
  Send,
  AlertTriangle,
  Globe,
  Building,
  FileText,
  Loader2,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLegalAdvisor, type LegalAdvice, type LegalContext } from '@/hooks/admin/legal';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type JurisdictionCode = 'AD' | 'ES' | 'EU' | 'INT';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  advice?: LegalAdvice;
  timestamp: Date;
}

export function LegalAdvisorPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [jurisdictionCode, setJurisdictionCode] = useState<JurisdictionCode>('ES');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { isLoading, consultLegal } = useLegalAdvisor();

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    const context: LegalContext = {
      jurisdictions: [jurisdictionCode]
    };

    const advice = await consultLegal(input.trim(), context);

    if (advice) {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: advice.response,
        advice,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    }
  }, [input, jurisdictionCode, isLoading, consultLegal]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getRiskBadge = (level: string) => {
    const variants: Record<string, string> = {
      low: 'bg-emerald-500/10 text-emerald-500',
      medium: 'bg-amber-500/10 text-amber-500',
      high: 'bg-red-500/10 text-red-500',
      critical: 'bg-red-600/20 text-red-600'
    };
    return variants[level] || 'bg-muted text-muted-foreground';
  };

  const jurisdictionLabels: Record<JurisdictionCode, string> = {
    AD: '🇦🇩 Andorra',
    ES: '🇪🇸 España',
    EU: '🇪🇺 Unión Europea',
    INT: '🌍 Internacional'
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Chat Panel */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <Scale className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Asesor Legal IA</CardTitle>
                <CardDescription>Consultas multi-jurisdiccionales</CardDescription>
              </div>
            </div>
            <Select value={jurisdictionCode} onValueChange={(v) => setJurisdictionCode(v as JurisdictionCode)}>
              <SelectTrigger className="w-[180px]">
                <Globe className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(jurisdictionLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Messages */}
          <ScrollArea className="h-[400px] pr-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Scale className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">Inicia una consulta legal</p>
                  <p className="text-xs mt-1">Describe tu situación o pregunta</p>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg p-3',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    
                    {msg.advice && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getRiskBadge(msg.advice.risk_level)}>
                            Riesgo: {msg.advice.risk_level}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Confianza: {msg.advice.confidence_score}%
                          </Badge>
                        </div>
                        
                        {msg.advice.recommendations.length > 0 && (
                          <div className="text-xs space-y-1">
                            <p className="font-medium">Recomendaciones:</p>
                            <ul className="list-disc list-inside space-y-0.5">
                              {msg.advice.recommendations.slice(0, 3).map((rec, i) => (
                                <li key={i} className="text-muted-foreground">{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {msg.advice.legal_basis.length > 0 && (
                          <div className="text-xs">
                            <span className="font-medium">Base legal: </span>
                            <span className="text-muted-foreground">
                              {msg.advice.legal_basis.slice(0, 2).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <p className="text-[10px] opacity-60 mt-2">
                      {formatDistanceToNow(msg.timestamp, { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Analizando consulta...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe tu consulta legal..."
              className="min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              className="px-4"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Consultas Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { label: 'Verificar contrato', icon: FileText, query: 'Necesito verificar la conformidad de un contrato mercantil' },
            { label: 'Normativa GDPR', icon: Shield, query: '¿Cuáles son las obligaciones GDPR para tratamiento de datos?' },
            { label: 'Compliance bancario', icon: Building, query: 'Requisitos de compliance para operaciones bancarias en Andorra' },
            { label: 'Riesgo laboral', icon: AlertTriangle, query: 'Evaluar riesgos en un despido objetivo' }
          ].map((item, i) => (
            <Button
              key={i}
              variant="outline"
              className="w-full justify-start gap-2 h-auto py-3"
              onClick={() => setInput(item.query)}
              disabled={isLoading}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="text-sm text-left">{item.label}</span>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default LegalAdvisorPanel;
