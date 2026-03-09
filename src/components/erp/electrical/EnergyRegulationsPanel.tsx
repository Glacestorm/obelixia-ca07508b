/**
 * EnergyRegulationsPanel - Normativa eléctrica por ámbito + bot consulta IA
 * Ámbitos: Local, Autonómica, Estatal, Europea
 * Con voice input/output y chat IA
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Scale, Search, RefreshCw, ExternalLink, Loader2, Send,
  Mic, MicOff, Volume2, VolumeX, Bot, FileText, Globe,
  Building, Flag, MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface Regulation {
  id: string;
  title: string;
  summary: string;
  scope: 'local' | 'autonomica' | 'estatal' | 'europea';
  category: string;
  effective_date: string;
  source: string;
  url?: string;
  applies_to: string[];
  tags?: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SCOPE_CONFIG = {
  local: { icon: MapPin, label: 'Local', color: 'text-emerald-600' },
  autonomica: { icon: Building, label: 'Autonómica', color: 'text-blue-600' },
  estatal: { icon: Flag, label: 'Estatal', color: 'text-amber-600' },
  europea: { icon: Globe, label: 'Europea', color: 'text-purple-600' },
};

export function EnergyRegulationsPanel() {
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const fetchRegulations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('energy-ai-recommendation', {
        body: { action: 'get_regulations', params: { scope: scope !== 'all' ? scope : undefined, search } },
      });
      if (!error && data?.success && Array.isArray(data.data)) {
        setRegulations(data.data);
      } else {
        setRegulations(getSampleRegulations());
      }
    } catch {
      setRegulations(getSampleRegulations());
    } finally {
      setLoading(false);
    }
  }, [scope, search]);

  useEffect(() => { fetchRegulations(); }, [fetchRegulations]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const filtered = regulations.filter(r => {
    if (scope !== 'all' && r.scope !== scope) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.summary.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // === CHAT IA ===
  const sendChat = useCallback(async (text?: string) => {
    const msg = text || chatInput.trim();
    if (!msg) return;

    const userMsg: ChatMessage = { role: 'user', content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('energy-ai-recommendation', {
        body: { action: 'regulatory_chat', params: { question: msg, context: regulations.slice(0, 5).map(r => r.title).join(', ') } },
      });

      const reply = (!error && data?.success && data?.data?.answer) ? data.data.answer : 'Lo siento, no pude procesar la consulta. Inténtalo de nuevo.';
      const assistantMsg: ChatMessage = { role: 'assistant', content: reply, timestamp: new Date() };
      setMessages(prev => [...prev, assistantMsg]);

      // Auto-speak if user used voice
      if (text && 'speechSynthesis' in window) {
        speakText(reply);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error de conexión con el asistente.', timestamp: new Date() }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, regulations]);

  // === VOICE ===
  const toggleListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Tu navegador no soporta reconocimiento de voz');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      sendChat(transcript);
    };
    recognition.onerror = () => { setIsListening(false); toast.error('Error en reconocimiento de voz'); };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, sendChat]);

  const speakText = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="normativa">
        <TabsList>
          <TabsTrigger value="normativa" className="text-xs">Normativa</TabsTrigger>
          <TabsTrigger value="consulta" className="text-xs">Consulta IA</TabsTrigger>
        </TabsList>

        <TabsContent value="normativa" className="mt-4 space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary" />
                  Normativa Energética
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={fetchRegulations} disabled={loading}>
                  <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                </Button>
              </div>
              <CardDescription className="text-xs">Regulación local, autonómica, estatal y europea del sector energético</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input className="pl-8 h-8 text-xs" placeholder="Buscar normativa..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="flex gap-1">
                  {['all', ...Object.keys(SCOPE_CONFIG)].map(s => (
                    <Button key={s} variant={scope === s ? 'default' : 'outline'} size="sm" className="text-xs h-8" onClick={() => setScope(s)}>
                      {s === 'all' ? 'Todas' : SCOPE_CONFIG[s as keyof typeof SCOPE_CONFIG]?.label}
                    </Button>
                  ))}
                </div>
              </div>

              <ScrollArea className="h-[400px]">
                {loading ? (
                  <div className="py-8 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" /></div>
                ) : filtered.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Sin normativa encontrada</div>
                ) : (
                  <div className="space-y-2">
                    {filtered.map(reg => {
                      const scopeInfo = SCOPE_CONFIG[reg.scope];
                      const ScopeIcon = scopeInfo?.icon || FileText;
                      return (
                        <div key={reg.id} className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <ScopeIcon className={cn("h-3.5 w-3.5", scopeInfo?.color)} />
                                <Badge variant="outline" className="text-[10px]">{scopeInfo?.label || reg.scope}</Badge>
                                <Badge variant="outline" className="text-[10px]">{reg.category}</Badge>
                              </div>
                              <p className="text-sm font-medium leading-tight">{reg.title}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{reg.summary}</p>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-[10px] text-muted-foreground">{reg.source}</span>
                                <span className="text-[10px] text-muted-foreground">Efectiva: {format(new Date(reg.effective_date), 'dd/MM/yyyy', { locale: es })}</span>
                                {reg.applies_to?.map(a => <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>)}
                              </div>
                            </div>
                            {reg.url && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                <a href={reg.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consulta" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                Consulta Normativa con IA
              </CardTitle>
              <CardDescription className="text-xs">Pregunta sobre normativa energética por texto o voz</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ScrollArea className="h-[300px] border rounded-lg p-3">
                {messages.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <Bot className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p>Pregúntame sobre normativa energética, peajes, impuestos o cualquier regulación del sector.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((m, i) => (
                      <div key={i} className={cn("flex gap-2", m.role === 'user' ? 'justify-end' : 'justify-start')}>
                        <div className={cn("max-w-[80%] rounded-lg p-3 text-sm", m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                          {m.content}
                          {m.role === 'assistant' && (
                            <Button variant="ghost" size="icon" className="h-5 w-5 mt-1 opacity-60 hover:opacity-100" onClick={() => isSpeaking ? stopSpeaking() : speakText(m.content)}>
                              {isSpeaking ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex gap-2 justify-start">
                        <div className="bg-muted rounded-lg p-3"><Loader2 className="h-4 w-4 animate-spin" /></div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </ScrollArea>

              <div className="flex items-center gap-2">
                <Button variant={isListening ? 'destructive' : 'outline'} size="icon" className="h-9 w-9 shrink-0" onClick={toggleListening}>
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Input className="h-9 text-sm" placeholder="Escribe tu consulta..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()} disabled={chatLoading} />
                <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => sendChat()} disabled={chatLoading || !chatInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getSampleRegulations(): Regulation[] {
  const now = new Date();
  return [
    { id: '1', title: 'Real Decreto 244/2019 de autoconsumo', summary: 'Regulación de las condiciones administrativas, técnicas y económicas del autoconsumo de energía eléctrica.', scope: 'estatal', category: 'autoconsumo', effective_date: '2019-04-06', source: 'BOE', applies_to: ['peajes', 'tarifas', 'autoconsumo'], tags: ['solar'] },
    { id: '2', title: 'Directiva (UE) 2019/944 sobre el mercado interior de electricidad', summary: 'Normas comunes para el mercado interior de la electricidad, incluyendo derechos de los consumidores y comunidades energéticas.', scope: 'europea', category: 'mercado', effective_date: '2019-06-14', source: 'DOUE', applies_to: ['mercado', 'consumidores'], tags: ['electricity'] },
    { id: '3', title: 'Orden TED/1484/2024 - Peajes de transporte y distribución eléctrica', summary: 'Establece los peajes de acceso a las redes de transporte y distribución de energía eléctrica para 2025.', scope: 'estatal', category: 'peajes', effective_date: '2025-01-01', source: 'BOE', applies_to: ['peajes', 'tarifas'] },
    { id: '4', title: 'Decreto autonómico de simplificación de autoconsumo', summary: 'Simplificación de trámites administrativos para instalaciones de autoconsumo de menos de 100 kW.', scope: 'autonomica', category: 'autoconsumo', effective_date: now.toISOString().split('T')[0], source: 'BOJA', applies_to: ['autoconsumo', 'permisos'] },
    { id: '5', title: 'Ordenanza municipal de eficiencia energética', summary: 'Regulación local sobre requisitos mínimos de eficiencia energética en edificios nuevos y rehabilitaciones.', scope: 'local', category: 'eficiencia', effective_date: now.toISOString().split('T')[0], source: 'BOP', applies_to: ['edificios', 'eficiencia'] },
    { id: '6', title: 'Impuesto especial sobre la electricidad - Ley 38/1992 modificada', summary: 'Actualización del tipo impositivo del impuesto especial sobre la electricidad tras la prórroga de medidas anticrisis.', scope: 'estatal', category: 'impuestos', effective_date: '2025-01-01', source: 'BOE', applies_to: ['impuestos', 'fiscalidad'] },
  ];
}

export default EnergyRegulationsPanel;
