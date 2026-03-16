/**
 * HRLaborCopilotPanel — V2-RRHH-FASE-7
 * Contextual HR Labor Copilot panel with guided prompts,
 * company selector, and markdown-rendered responses.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bot, Send, Sparkles, Building2, Briefcase, Calendar,
  Shield, FileText, Search, Zap, AlertTriangle, Loader2,
  Trash2, ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import { useHRLaborCopilot, type CopilotMessage } from '@/hooks/erp/hr/useHRLaborCopilot';
import { SEVERITY_CONFIG } from '@/engines/erp/hr/controlTowerEngine';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

// ─── Icon Map ───────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Briefcase, Building2, Calendar, Shield, FileText, Search, Zap, AlertTriangle,
};

// ─── Component ──────────────────────────────────────────────────────────────

export function HRLaborCopilotPanel() {
  const [inputValue, setInputValue] = useState('');
  const [showPrompts, setShowPrompts] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearConversation,
    focusedCompanyId,
    setFocusedCompanyId,
    guidedPrompts,
    availableCompanies,
    isControlTowerLoading,
    portfolioSize,
  } = useHRLaborCopilot();

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;
    const q = inputValue;
    setInputValue('');
    setShowPrompts(false);
    await sendMessage(q);
  }, [inputValue, isLoading, sendMessage]);

  const handleGuidedPrompt = useCallback(async (prompt: typeof guidedPrompts[0]) => {
    setShowPrompts(false);
    await sendMessage(prompt.prompt, prompt.id);
  }, [sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const focusedCompany = availableCompanies.find(c => c.id === focusedCompanyId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/70">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Copiloto Laboral</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Asistente contextual · {portfolioSize} empresa{portfolioSize !== 1 ? 's' : ''} en cartera
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearConversation}
                  className="text-muted-foreground"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          {/* Company Selector */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Select
                value={focusedCompanyId || '__all__'}
                onValueChange={(v) => setFocusedCompanyId(v === '__all__' ? null : v)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Toda la cartera" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5" />
                      Toda la cartera
                    </div>
                  </SelectItem>
                  {availableCompanies.map(c => {
                    const sev = SEVERITY_CONFIG[c.severity as keyof typeof SEVERITY_CONFIG];
                    return (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <div className={cn('h-2 w-2 rounded-full', sev?.dotColor)} />
                          <span>{c.name}</span>
                          <span className="text-muted-foreground text-xs">({c.score})</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {focusedCompany && (
              <Badge variant="outline" className="text-xs">
                Salud: {focusedCompany.score}/100
              </Badge>
            )}
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 mt-3 p-2 rounded-lg bg-muted/50 border border-muted">
            <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-tight">
              Respuestas basadas en datos reales del sistema. Modo preparatorio — sin envíos oficiales. 
              No constituye asesoramiento legal vinculante.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="min-h-[500px] flex flex-col">
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages */}
          <ScrollArea className="flex-1 px-4 pt-4" ref={scrollRef as any}>
            <div className="space-y-4 pb-4" ref={scrollRef}>
              {messages.length === 0 && !isControlTowerLoading && (
                <div className="text-center py-8">
                  <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary/40" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Pregúntame sobre tu cartera de empresas
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Selecciona una empresa o usa las preguntas guiadas
                  </p>
                </div>
              )}

              {isControlTowerLoading && messages.length === 0 && (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary/40" />
                  <p className="text-sm text-muted-foreground">
                    Cargando señales de la Control Tower…
                  </p>
                </div>
              )}

              {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analizando datos reales…</span>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Guided Prompts */}
          {showPrompts && messages.length === 0 && !isControlTowerLoading && (
            <div className="px-4 pb-3">
              <button
                onClick={() => setShowPrompts(!showPrompts)}
                className="flex items-center gap-1 text-xs text-muted-foreground mb-2 hover:text-foreground transition-colors"
              >
                Preguntas sugeridas
                {showPrompts ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              <div className="grid grid-cols-2 gap-2">
                {guidedPrompts.map(prompt => {
                  const Icon = ICON_MAP[prompt.icon] || Sparkles;
                  return (
                    <button
                      key={prompt.id}
                      onClick={() => handleGuidedPrompt(prompt)}
                      disabled={isLoading}
                      className="flex items-center gap-2 p-2.5 rounded-lg border bg-card hover:bg-muted/60 
                                 transition-colors text-left text-xs disabled:opacity-50"
                    >
                      <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{prompt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t bg-muted/30">
            <div className="flex items-center gap-2">
              <Input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  focusedCompanyId
                    ? `Pregunta sobre ${focusedCompany?.name || 'esta empresa'}…`
                    : 'Pregunta sobre tu cartera…'
                }
                disabled={isLoading || isControlTowerLoading}
                className="text-sm"
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading || isControlTowerLoading}
                size="icon"
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setShowPrompts(p => !p)}
                className="text-[11px] text-muted-foreground mt-1.5 hover:text-foreground transition-colors"
              >
                {showPrompts ? 'Ocultar' : 'Mostrar'} preguntas sugeridas
              </button>
            )}

            {/* Show guided prompts inline when conversation active */}
            {showPrompts && messages.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {guidedPrompts.slice(0, 4).map(prompt => {
                  const Icon = ICON_MAP[prompt.icon] || Sparkles;
                  return (
                    <button
                      key={prompt.id}
                      onClick={() => handleGuidedPrompt(prompt)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 p-1.5 rounded border bg-card hover:bg-muted/60 
                                 transition-colors text-left text-[11px] disabled:opacity-50"
                    >
                      <Icon className="h-3 w-3 text-primary shrink-0" />
                      <span className="truncate">{prompt.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Message Bubble ─────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: CopilotMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[85%] rounded-xl px-4 py-3 text-sm',
        isUser
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted/70 border',
      )}>
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        <p className={cn(
          'text-[10px] mt-1.5',
          isUser ? 'text-primary-foreground/60' : 'text-muted-foreground',
        )}>
          {message.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

export default HRLaborCopilotPanel;
