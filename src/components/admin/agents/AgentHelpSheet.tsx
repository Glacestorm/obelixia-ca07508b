/**
 * AgentHelpSheet - Panel de ayuda para agentes IA
 * Fase 2: UI con índice, ejemplos, conocimiento aprendido y chatbot
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  HelpCircle, 
  BookOpen, 
  MessageSquare, 
  Lightbulb, 
  ChevronRight,
  ChevronDown,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Clock,
  Brain,
  Target,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useAgentHelpSystem } from '@/hooks/admin/agents/useAgentHelpSystem';
import type { AgentType, AgentHelpSection, AgentHelpExample, LearnedKnowledge } from '@/hooks/admin/agents/agentHelpTypes';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AgentHelpSheetProps {
  agentId: string;
  agentType: AgentType;
  agentName: string;
  trigger?: React.ReactNode;
  className?: string;
}

export function AgentHelpSheet({
  agentId,
  agentType,
  agentName,
  trigger,
  className
}: AgentHelpSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [chatInput, setChatInput] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    isLoading,
    error,
    helpContent,
    chatHistory,
    isVoiceActive,
    isSpeaking,
    loadHelpContent,
    sendChatMessage,
    toggleVoice,
  } = useAgentHelpSystem(agentId);

  const refreshHelp = useCallback(() => {
    loadHelpContent(true);
  }, [loadHelpContent]);

  const stopSpeaking = useCallback(() => {
    // Placeholder - will be implemented with voice integration
  }, []);

  // Cargar contenido cuando se abre
  useEffect(() => {
    if (isOpen && !helpContent && !isLoading) {
      loadHelpContent();
    }
  }, [isOpen, helpContent, isLoading, loadHelpContent]);

  // Scroll al último mensaje
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim()) return;
    const message = chatInput;
    setChatInput('');
    await sendChatMessage(message);
  }, [chatInput, sendChatMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  const defaultTrigger = (
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <HelpCircle className="h-4 w-4" />
    </Button>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || defaultTrigger}
      </SheetTrigger>
      <SheetContent className={cn("w-full sm:max-w-xl lg:max-w-2xl p-0", className)}>
        <SheetHeader className="p-4 pb-2 bg-gradient-to-r from-primary/10 via-accent/5 to-background border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <SheetTitle className="text-lg">{agentName}</SheetTitle>
                <p className="text-xs text-muted-foreground">
                  Sistema de Ayuda Inteligente
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshHelp}
              disabled={isLoading}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-[calc(100vh-100px)]">
          <TabsList className="grid w-full grid-cols-4 px-4 py-2">
            <TabsTrigger value="overview" className="text-xs gap-1">
              <BookOpen className="h-3 w-3" />
              Índice
            </TabsTrigger>
            <TabsTrigger value="examples" className="text-xs gap-1">
              <Target className="h-3 w-3" />
              Ejemplos
            </TabsTrigger>
            <TabsTrigger value="learned" className="text-xs gap-1">
              <Lightbulb className="h-3 w-3" />
              Aprendido
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-xs gap-1">
              <MessageSquare className="h-3 w-3" />
              Chat
            </TabsTrigger>
          </TabsList>

          {/* TAB: ÍNDICE Y OVERVIEW */}
          <TabsContent value="overview" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : error ? (
                  <Card className="border-destructive/50 bg-destructive/5">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">{error}</span>
                      </div>
                    </CardContent>
                  </Card>
                ) : helpContent ? (
                  <>
                    {/* Descripción general */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          ¿Qué hace este agente?
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {helpContent.overview}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Tabla de contenidos */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Índice</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        {helpContent.tableOfContents.map((item, idx) => (
                          <Collapsible
                            key={idx}
                            open={expandedSections.has(item.anchor)}
                            onOpenChange={() => toggleSection(item.anchor)}
                          >
                            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-muted/50 rounded-md transition-colors text-left">
                              {expandedSections.has(item.anchor) ? (
                                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              )}
                              <span className="text-sm font-medium">{item.section}</span>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pl-7 space-y-1">
                              {item.subsections?.map((sub, subIdx) => (
                                <div 
                                  key={subIdx}
                                  className="text-xs text-muted-foreground py-1 hover:text-foreground cursor-pointer"
                                >
                                  {sub}
                                </div>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Capacidades */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Capacidades
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {helpContent.capabilities.map((cap, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {cap}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Tips */}
                    {helpContent.tips.length > 0 && (
                      <Card className="border-primary/20 bg-primary/5">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2 text-primary">
                            <Lightbulb className="h-4 w-4" />
                            Tips para sacar más provecho
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {helpContent.tips.map((tip, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-primary">•</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Warnings */}
                    {helpContent.warnings.length > 0 && (
                      <Card className="border-amber-500/20 bg-amber-500/5">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="h-4 w-4" />
                            Consideraciones importantes
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {helpContent.warnings.map((warning, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-amber-600">⚠</span>
                                {warning}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-sm">No hay contenido de ayuda disponible</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB: EJEMPLOS */}
          <TabsContent value="examples" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {helpContent?.examples.map((example, idx) => (
                  <ExampleCard key={example.id || idx} example={example} />
                ))}
                {helpContent?.useCases.map((useCase, idx) => (
                  <UseCaseCard key={useCase.id || idx} useCase={useCase} />
                ))}
                {(!helpContent?.examples.length && !helpContent?.useCases.length) && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-sm">No hay ejemplos disponibles aún</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB: CONOCIMIENTO APRENDIDO */}
          <TabsContent value="learned" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {helpContent?.learnedKnowledge.length ? (
                  helpContent.learnedKnowledge.map((knowledge, idx) => (
                    <LearnedKnowledgeCard key={knowledge.id || idx} knowledge={knowledge} />
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-sm">Este agente aún no ha aprendido conocimientos nuevos</p>
                    <p className="text-xs mt-2">
                      El agente aprenderá automáticamente de las interacciones
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB: CHAT */}
          <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {chatHistory.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Pregúntame sobre {agentName}</p>
                    <p className="text-xs mt-1">
                      Puedo responder dudas, dar ejemplos y explicar funcionalidades
                    </p>
                  </div>
                )}
                {chatHistory.map((msg) => (
                  <ChatBubble key={msg.id} message={msg} isSpeaking={isSpeaking} />
                ))}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            {/* Input de chat */}
            <div className="p-4 border-t bg-muted/30">
              <div className="flex items-center gap-2">
                <Button
                  variant={isVoiceActive ? "default" : "outline"}
                  size="icon"
                  onClick={toggleVoice}
                  className="h-9 w-9 shrink-0"
                >
                  {isVoiceActive ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
                <Input
                  ref={inputRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe tu pregunta..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isLoading}
                  size="icon"
                  className="h-9 w-9 shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant={isSpeaking ? "destructive" : "outline"}
                  size="icon"
                  onClick={stopSpeaking}
                  disabled={!isSpeaking}
                  className="h-9 w-9 shrink-0"
                >
                  {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// === SUBCOMPONENTES ===

function ExampleCard({ example }: { example: AgentHelpExample }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium">{example.title}</CardTitle>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">{example.description}</p>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0 space-y-3">
          {example.input && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Entrada:</p>
              <code className="text-xs bg-muted p-2 rounded block whitespace-pre-wrap">
                {example.input}
              </code>
            </div>
          )}
          {example.output && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Salida:</p>
              <code className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 p-2 rounded block whitespace-pre-wrap">
                {example.output}
              </code>
            </div>
          )}
          {example.tags && example.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {example.tags.map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function UseCaseCard({ useCase }: { useCase: AgentHelpSection }) {
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{useCase.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{useCase.content}</p>
      </CardContent>
    </Card>
  );
}

function LearnedKnowledgeCard({ knowledge }: { knowledge: LearnedKnowledge }) {
  const sourceColors: Record<string, string> = {
    user_feedback: 'bg-blue-500',
    interaction: 'bg-green-500',
    external: 'bg-purple-500',
    ai_generated: 'bg-amber-500'
  };

  const sourceLabels: Record<string, string> = {
    user_feedback: 'Feedback',
    interaction: 'Interacción',
    external: 'Externo',
    ai_generated: 'IA'
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium">{knowledge.title}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary" 
              className={cn("text-xs", sourceColors[knowledge.source])}
            >
              {sourceLabels[knowledge.source]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {Math.round(knowledge.confidence * 100)}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{knowledge.content}</p>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(knowledge.createdAt), { locale: es, addSuffix: true })}
          </span>
          <span>Usado {knowledge.usageCount} veces</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ChatBubble({ 
  message, 
  isSpeaking 
}: { 
  message: { id: string; role: 'user' | 'assistant'; content: string; timestamp: string; isVoice?: boolean };
  isSpeaking: boolean;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2",
          isUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <div className={cn(
          "flex items-center gap-2 mt-1 text-xs",
          isUser ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          <span>
            {formatDistanceToNow(new Date(message.timestamp), { locale: es, addSuffix: true })}
          </span>
          {message.isVoice && <Mic className="h-3 w-3" />}
          {!isUser && isSpeaking && <Volume2 className="h-3 w-3 animate-pulse" />}
        </div>
      </div>
    </div>
  );
}

export default AgentHelpSheet;
