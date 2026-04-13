/**
 * HREmployeeCopilotSheet — S9.11-H5++
 * Copiloto contextual del empleado seleccionado.
 * 3 modos: Consultar, Acciones asistidas, Escenarios demo guiados.
 * Sin persistencia. Sin voz. Historial acotado a 10 mensajes.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import {
  Send, Loader2, MessageSquare, Wrench, Presentation,
  AlertTriangle, Info, ChevronRight, Bot, User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface HREmployeeCopilotSheetProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  employeeId: string;
  employeeName: string;
  activeModule?: string;
  userPermissions?: string[];
}

type AssistantMode = 'consult' | 'assisted_action' | 'demo_guided';

const CONSULT_SUGGESTIONS = [
  'Resume la situación laboral actual de este empleado',
  '¿Tiene incidencias o ausencias activas?',
  '¿Qué documentos pendientes o vencidos tiene?',
  '¿Qué contrato y jornada tiene?',
  '¿Ves alertas o riesgos de compliance sobre este empleado?',
  '¿Qué debería revisar ahora sobre este caso?',
];

const ACTION_SUGGESTIONS = [
  'Prepara una simulación de nómina con bonus de 300 €',
  'Prepara borrador de regularización',
  'Prepara revisión de expediente',
  'Prepara propuesta de cambio salarial',
  'Prepara borrador de finiquito',
  'Prepara comunicación / handoff-ready',
];

const DEMO_SCENARIOS = [
  { id: 'alta', title: 'Alta empleado DEMO', desc: 'Registro completo y comunicación de incorporación' },
  { id: 'nomina', title: 'Nómina compleja DEMO', desc: 'HE, retribución flexible, stock options, permisos' },
  { id: 'incidencias', title: 'Nacimiento / IT / AT DEMO', desc: 'Gestión de incidencias especiales' },
  { id: 'movilidad', title: 'Movilidad internacional', desc: 'Desplazamiento temporal fuera de España' },
  { id: 'atrasos', title: 'Atrasos y regularización', desc: 'Regularización de baja médica no introducida' },
  { id: 'reduccion', title: 'Reducción de jornada', desc: 'Por guarda legal u otros supuestos' },
  { id: 'costes', title: 'Costes, SS y Hacienda', desc: 'Informes, seguros sociales, modelos 111/190' },
  { id: 'salida', title: 'Baja / despido / liquidación', desc: 'Disciplinario, objetivo, comunicación salida' },
  { id: 'cliente-principal', title: 'Caso cliente principal', desc: 'Playbook enterprise: España + filiales extranjeras (11 fases)' },
];

const ENTERPRISE_PLAYBOOK_PROMPT = `Desglosa el siguiente caso de cliente enterprise por fases usando el formato obligatorio.

Caso: Cliente con filiales extranjeras que necesita evaluar la plataforma. Cubrir:
1. Alta y registro del empleado
2. Comunicación de incorporación / readiness oficial
3. Nómina compleja (HE, seguro médico retribución flexible, stock options, 1 día permiso no retribuido, baja AT)
4. Incidencias especiales: AT, nacimiento, permiso no retribuido
5. Movilidad internacional / desplazamiento temporal
6. Atrasos y regularización de baja médica
7. Reducción de jornada por guarda legal
8. Costes, reporting y registro horario
9. Seguros sociales y Hacienda (modelos 111, 190)
10. Baja, despido disciplinario y objetivo, liquidación
11. Comunicación de salida / readiness oficial

Para CADA fase usa estrictamente:
**Fase N: [Título]**
- Qué demostrar: ...
- Pantalla/módulo: ...
- Inputs relevantes: ...
- Outputs/artefactos: ...
- Clasificación: interno_real | simulación | preparación_oficial | handoff_ready`;

const MAX_HISTORY = 10;

export function HREmployeeCopilotSheet({
  open,
  onClose,
  companyId,
  employeeId,
  employeeName,
  activeModule,
  userPermissions,
}: HREmployeeCopilotSheetProps) {
  const [activeTab, setActiveTab] = useState<AssistantMode>('consult');
  const [messages, setMessages] = useState<Record<AssistantMode, Message[]>>({
    consult: [],
    assisted_action: [],
    demo_guided: [],
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevEmployeeRef = useRef<string>(employeeId);

  // Reset conversation when employeeId changes
  useEffect(() => {
    if (prevEmployeeRef.current !== employeeId) {
      setMessages({ consult: [], assisted_action: [], demo_guided: [] });
      setError(null);
      setInput('');
      prevEmployeeRef.current = employeeId;
    }
  }, [employeeId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  const currentMessages = messages[activeTab];

  const sendMessage = useCallback(async (text: string, mode?: AssistantMode) => {
    const effectiveMode = mode || activeTab;
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    const userMsg: Message = { role: 'user', content: trimmed, timestamp: new Date() };

    setMessages(prev => {
      const updated = [...prev[effectiveMode], userMsg];
      return { ...prev, [effectiveMode]: updated };
    });
    setInput('');
    setIsLoading(true);

    try {
      // Build history (max 10 recent messages)
      const recentHistory = [...messages[effectiveMode], userMsg]
        .slice(-MAX_HISTORY)
        .map(m => ({ role: m.role, content: m.content }));

      const { data, error: fnError } = await supabase.functions.invoke('erp-hr-ai-agent', {
        body: {
          action: 'chat',
          company_id: companyId,
          message: trimmed,
          context: {
            employee_id: employeeId,
            employee_name: employeeName,
            copilot_mode: 'employee_contextual',
            active_module: activeModule || 'hr',
            assistant_mode: effectiveMode,
            current_user_permissions: userPermissions || [],
          },
          history: recentHistory,
        },
      });

      if (fnError) throw new Error(fnError.message || 'Error en la consulta');

      const response = data?.data?.rawContent
        || data?.data?.response
        || data?.response
        || (typeof data?.data === 'string' ? data.data : null)
        || 'No se obtuvo respuesta del agente.';

      const assistantMsg: Message = { role: 'assistant', content: response, timestamp: new Date() };
      setMessages(prev => {
        const updated = [...prev[effectiveMode], assistantMsg].slice(-MAX_HISTORY * 2);
        return { ...prev, [effectiveMode]: updated };
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error de conexión con el asistente';
      setError(errMsg);
      const errorMsg: Message = {
        role: 'assistant',
        content: `⚠️ ${errMsg}. Intenta de nuevo o reformula tu pregunta.`,
        timestamp: new Date(),
      };
      setMessages(prev => ({
        ...prev,
        [effectiveMode]: [...prev[effectiveMode], errorMsg],
      }));
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, isLoading, messages, companyId, employeeId, employeeName, activeModule, userPermissions]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }, [input, sendMessage]);

  const handleDemoScenario = useCallback((scenarioId: string) => {
    const scenario = DEMO_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return;

    if (scenarioId === 'cliente-principal') {
      sendMessage(ENTERPRISE_PLAYBOOK_PROMPT, 'demo_guided');
    } else {
      sendMessage(
        `Genera una demo guiada del escenario "${scenario.title}" para el empleado seleccionado. Usa el formato obligatorio por fases con clasificación.`,
        'demo_guided',
      );
    }
  }, [sendMessage]);

  const renderMessages = (msgs: Message[]) => {
    if (msgs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Bot className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            Sin mensajes aún. Escribe una pregunta o selecciona una sugerencia.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Contexto: {employeeName}
          </p>
        </div>
      );
    }

    return msgs.map((msg, i) => (
      <div
        key={i}
        className={cn(
          'flex gap-2 mb-3',
          msg.role === 'user' ? 'justify-end' : 'justify-start'
        )}
      >
        {msg.role === 'assistant' && (
          <div className="shrink-0 mt-1">
            <Bot className="h-5 w-5 text-primary" />
          </div>
        )}
        <div
          className={cn(
            'rounded-lg px-3 py-2 max-w-[85%] text-sm',
            msg.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          )}
        >
          {msg.role === 'assistant' ? (
            <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1.5 [&>ul]:mb-1.5">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          ) : (
            <p>{msg.content}</p>
          )}
        </div>
        {msg.role === 'user' && (
          <div className="shrink-0 mt-1">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>
    ));
  };

  const renderChatInput = () => (
    <div className="flex gap-2 pt-2 border-t">
      <Input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribe tu pregunta..."
        disabled={isLoading}
        className="text-sm"
      />
      <Button
        size="icon"
        onClick={() => sendMessage(input)}
        disabled={!input.trim() || isLoading}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  );

  const renderSuggestions = (suggestions: string[], mode: AssistantMode) => (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => {
            setActiveTab(mode);
            sendMessage(s, mode);
          }}
          disabled={isLoading}
          className="text-xs px-2.5 py-1.5 rounded-full border bg-background hover:bg-accent/50 text-foreground transition-colors disabled:opacity-50"
        >
          {s}
        </button>
      ))}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-4 pt-4 pb-2 border-b space-y-1.5">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-base truncate">{employeeName}</SheetTitle>
            <Badge variant="secondary" className="text-[10px] shrink-0">Copiloto contextual</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground leading-tight">
            Responde con base en datos del sistema. Las acciones sensibles se preparan como propuesta y requieren revisión humana.
          </p>
        </SheetHeader>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={v => setActiveTab(v as AssistantMode)}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="grid grid-cols-3 mx-4 mt-2">
            <TabsTrigger value="consult" className="text-xs gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> Consultar
            </TabsTrigger>
            <TabsTrigger value="assisted_action" className="text-xs gap-1">
              <Wrench className="h-3.5 w-3.5" /> Acciones
            </TabsTrigger>
            <TabsTrigger value="demo_guided" className="text-xs gap-1">
              <Presentation className="h-3.5 w-3.5" /> Demo
            </TabsTrigger>
          </TabsList>

          {/* Tab: Consultar */}
          <TabsContent value="consult" className="flex-1 flex flex-col min-h-0 px-4 mt-2">
            {messages.consult.length === 0 && renderSuggestions(CONSULT_SUGGESTIONS, 'consult')}
            <ScrollArea className="flex-1 min-h-0" ref={scrollRef as any}>
              <div className="pr-2 pb-2">
                {renderMessages(messages.consult)}
                {isLoading && activeTab === 'consult' && (
                  <div className="flex gap-2 items-center text-muted-foreground text-xs py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Pensando...
                  </div>
                )}
              </div>
            </ScrollArea>
            {renderChatInput()}
          </TabsContent>

          {/* Tab: Acciones asistidas */}
          <TabsContent value="assisted_action" className="flex-1 flex flex-col min-h-0 px-4 mt-2">
            {/* Safety banner */}
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-3 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>Las acciones sensibles se preparan como propuesta o borrador. Requieren validación humana.</span>
            </div>
            {messages.assisted_action.length === 0 && renderSuggestions(ACTION_SUGGESTIONS, 'assisted_action')}
            <ScrollArea className="flex-1 min-h-0" ref={scrollRef as any}>
              <div className="pr-2 pb-2">
                {renderMessages(messages.assisted_action)}
                {isLoading && activeTab === 'assisted_action' && (
                  <div className="flex gap-2 items-center text-muted-foreground text-xs py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparando...
                  </div>
                )}
              </div>
            </ScrollArea>
            {renderChatInput()}
          </TabsContent>

          {/* Tab: Demo guiada */}
          <TabsContent value="demo_guided" className="flex-1 flex flex-col min-h-0 px-4 mt-2">
            {messages.demo_guided.length === 0 ? (
              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-2 pr-2 pb-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    Selecciona un escenario para generar una demo guiada estructurada por fases.
                  </p>
                  {DEMO_SCENARIOS.map(scenario => (
                    <Card
                      key={scenario.id}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => handleDemoScenario(scenario.id)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{scenario.title}</p>
                          <p className="text-xs text-muted-foreground">{scenario.desc}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <>
                <ScrollArea className="flex-1 min-h-0" ref={scrollRef as any}>
                  <div className="pr-2 pb-2">
                    {renderMessages(messages.demo_guided)}
                    {isLoading && activeTab === 'demo_guided' && (
                      <div className="flex gap-2 items-center text-muted-foreground text-xs py-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generando demo...
                      </div>
                    )}
                  </div>
                </ScrollArea>
                {renderChatInput()}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer info */}
        <div className="px-4 py-2 border-t">
          <p className="text-[10px] text-muted-foreground text-center">
            Copiloto contextual · Sin persistencia · Voz: mejora futura
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default HREmployeeCopilotSheet;
