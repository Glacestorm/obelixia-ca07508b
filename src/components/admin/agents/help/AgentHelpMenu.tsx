/**
 * AgentHelpMenu - Menú de ayuda completo para agentes
 * Incluye índice estructurado, ejemplos, conocimientos aprendidos y chatbot
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { 
  HelpCircle,
  Book,
  MessageSquare,
  Lightbulb,
  Search,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Brain,
  Target,
  ThumbsUp,
  ThumbsDown,
  Mic,
  MicOff,
  Volume2,
  Send,
  RefreshCw,
  BookOpen,
  Zap,
  Clock,
  Star,
  X,
  Plus,
  CheckCircle
} from 'lucide-react';
import { useAgentHelpSystem, type AgentHelpContext, type KnowledgeEntry } from '@/hooks/admin/agents/useAgentHelpSystem';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AgentHelpMenuProps {
  isOpen: boolean;
  onClose: () => void;
  agentContext: AgentHelpContext;
  className?: string;
}

export function AgentHelpMenu({ isOpen, onClose, agentContext, className }: AgentHelpMenuProps) {
  const [activeTab, setActiveTab] = useState<'index' | 'chat' | 'learned'>('index');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['capabilities']));
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [searchResults, setSearchResults] = useState<KnowledgeEntry[]>([]);

  const {
    isLoading,
    knowledgeEntries,
    helpIndex,
    learnedKnowledge,
    messages,
    fetchKnowledgeBase,
    searchKnowledge,
    sendMessage,
    textToSpeech,
    startVoiceInput,
    provideFeedback,
    clearConversation
  } = useAgentHelpSystem(agentContext);

  // Cargar base de conocimientos al abrir
  useEffect(() => {
    if (isOpen && agentContext?.agentId) {
      fetchKnowledgeBase();
    }
  }, [isOpen, agentContext?.agentId, fetchKnowledgeBase]);

  // Manejar búsqueda
  useEffect(() => {
    const search = async () => {
      if (searchQuery.length >= 2) {
        const results = await searchKnowledge(searchQuery);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    };
    search();
  }, [searchQuery, searchKnowledge]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const input = chatInput;
    setChatInput('');
    await sendMessage(input, 'text');
  };

  const handleVoiceInput = async () => {
    setIsRecording(true);
    const transcript = await startVoiceInput();
    setIsRecording(false);
    
    if (transcript) {
      await sendMessage(transcript, 'voice');
    }
  };

  const handlePlayAudio = async (text: string) => {
    await textToSpeech(text);
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ElementType> = {
      capabilities: Target,
      examples: BookOpen,
      best_practices: Star,
      learned: Brain,
      faq: HelpCircle,
      troubleshooting: Zap
    };
    return icons[category] || Book;
  };

  const entriesByCategory = knowledgeEntries.reduce((acc, entry) => {
    if (!acc[entry.category]) acc[entry.category] = [];
    acc[entry.category].push(entry);
    return acc;
  }, {} as Record<string, KnowledgeEntry[]>);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn("max-w-4xl h-[85vh] p-0 overflow-hidden", className)}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                  <HelpCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">
                    Ayuda: {agentContext.agentName}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    {agentContext.agentDescription}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="gap-1">
                <Brain className="h-3 w-3" />
                {knowledgeEntries.length} conocimientos
              </Badge>
            </div>
          </DialogHeader>

          {/* Search Bar */}
          <div className="px-6 py-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar en la documentación..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Search Results */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b bg-muted/30"
              >
                <ScrollArea className="max-h-48">
                  <div className="p-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {searchResults.length} resultados encontrados
                    </p>
                    {searchResults.map(result => (
                      <button
                        key={result.id}
                        onClick={() => {
                          setSelectedEntry(result);
                          setSearchQuery('');
                        }}
                        className="w-full p-2 rounded-lg hover:bg-background text-left flex items-center gap-2"
                      >
                        <Badge variant="outline" className="text-xs">
                          {result.category}
                        </Badge>
                        <span className="text-sm font-medium">{result.title}</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 mt-2 grid w-auto grid-cols-3">
              <TabsTrigger value="index" className="gap-2">
                <Book className="h-4 w-4" />
                Índice
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Chatbot
              </TabsTrigger>
              <TabsTrigger value="learned" className="gap-2">
                <Brain className="h-4 w-4" />
                Aprendido
              </TabsTrigger>
            </TabsList>

            {/* Index Tab */}
            <TabsContent value="index" className="flex-1 overflow-hidden m-0 p-0">
              <ScrollArea className="h-full px-6 py-4">
                <div className="space-y-4">
                  {helpIndex.map((section) => {
                    const Icon = getCategoryIcon(section.id);
                    const isExpanded = expandedSections.has(section.id);
                    const entries = entriesByCategory[section.id] || [];

                    return (
                      <Collapsible 
                        key={section.id} 
                        open={isExpanded}
                        onOpenChange={() => toggleSection(section.id)}
                      >
                        <Card>
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-primary/10">
                                    <Icon className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-base">{section.title}</CardTitle>
                                    <CardDescription className="text-xs">
                                      {entries.length} artículos
                                    </CardDescription>
                                  </div>
                                </div>
                                {isExpanded ? (
                                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0 pb-3">
                              <div className="space-y-2">
                                {entries.map((entry) => (
                                  <button
                                    key={entry.id}
                                    onClick={() => setSelectedEntry(entry)}
                                    className="w-full p-3 rounded-lg border hover:bg-muted/50 text-left transition-colors"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-sm">{entry.title}</span>
                                      <div className="flex items-center gap-2">
                                        {entry.isVerified && (
                                          <CheckCircle className="h-4 w-4 text-green-500" />
                                        )}
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    </div>
                                    {entry.description && (
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {entry.description}
                                      </p>
                                    )}
                                    {entry.tags && entry.tags.length > 0 && (
                                      <div className="flex gap-1 mt-2 flex-wrap">
                                        {entry.tags.slice(0, 3).map(tag => (
                                          <Badge key={tag} variant="secondary" className="text-xs">
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}

                  {/* Capabilities Summary */}
                  <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Capacidades del Agente
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {agentContext.capabilities.map((cap, idx) => (
                          <Badge key={idx} variant="outline" className="bg-background">
                            {cap}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Chat Tab */}
            <TabsContent value="chat" className="flex-1 overflow-hidden m-0 p-0 flex flex-col">
              {/* Messages */}
              <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                      <h3 className="font-semibold text-lg mb-2">Chatbot Especializado</h3>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Pregúntame cualquier cosa sobre el agente "{agentContext.agentName}". 
                        Puedo responder por texto o voz.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2 justify-center">
                        {[
                          '¿Qué puede hacer este agente?',
                          '¿Cómo puedo sacarle más provecho?',
                          'Dame un ejemplo de uso'
                        ].map((suggestion, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            onClick={() => sendMessage(suggestion, 'text')}
                            disabled={isLoading}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex",
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div className={cn(
                        "max-w-[80%] rounded-lg p-3",
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : message.role === 'system'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-muted'
                      )}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        
                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handlePlayAudio(message.content)}
                            >
                              <Volume2 className="h-3 w-3" />
                            </Button>
                            <div className="flex-1" />
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-6 w-6",
                                message.wasHelpful === true && "text-green-500"
                              )}
                              onClick={() => provideFeedback(message.id, true)}
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-6 w-6",
                                message.wasHelpful === false && "text-red-500"
                              )}
                              onClick={() => provideFeedback(message.id, false)}
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </Button>
                          </div>
                        )}

                        <p className="text-xs opacity-60 mt-1">
                          {formatDistanceToNow(new Date(message.timestamp), { 
                            addSuffix: true, 
                            locale: es 
                          })}
                        </p>
                      </div>
                    </motion.div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Pensando...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Chat Input */}
              <div className="p-4 border-t bg-background">
                <div className="flex items-center gap-2">
                  <Button
                    variant={isRecording ? "destructive" : "outline"}
                    size="icon"
                    onClick={handleVoiceInput}
                    disabled={isLoading}
                  >
                    {isRecording ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Escribe tu pregunta..."
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={isLoading || !chatInput.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {messages.length > 0 && (
                  <div className="flex justify-end mt-2">
                    <Button variant="ghost" size="sm" onClick={clearConversation}>
                      <X className="h-3 w-3 mr-1" />
                      Limpiar chat
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Learned Knowledge Tab */}
            <TabsContent value="learned" className="flex-1 overflow-hidden m-0 p-0">
              <ScrollArea className="h-full px-6 py-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      Conocimiento Aprendido
                    </h3>
                    <Badge variant="secondary">
                      {learnedKnowledge.length} elementos
                    </Badge>
                  </div>

                  {learnedKnowledge.length === 0 ? (
                    <Card className="bg-muted/30">
                      <CardContent className="py-8 text-center">
                        <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                        <h4 className="font-medium mb-2">Sin conocimientos aprendidos aún</h4>
                        <p className="text-sm text-muted-foreground">
                          El agente irá aprendiendo de las interacciones y feedback.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {learnedKnowledge.map((item) => (
                        <Card key={item.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="py-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{item.title}</h4>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {item.content}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge 
                                  variant={item.confidence >= 0.8 ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {Math.round(item.confidence * 100)}% confianza
                                </Badge>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(item.learnedAt), { 
                                    addSuffix: true, 
                                    locale: es 
                                  })}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs capitalize">
                                {item.source.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Usado {item.usageCount} veces
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Entry Detail Modal */}
        <AnimatePresence>
          {selectedEntry && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/95 backdrop-blur-sm z-10 flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <Button variant="ghost" onClick={() => setSelectedEntry(null)}>
                  <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
                  Volver
                </Button>
                <Badge variant="outline">{selectedEntry.category}</Badge>
              </div>
              <ScrollArea className="flex-1 px-6 py-6">
                <div className="max-w-2xl mx-auto">
                  <h2 className="text-2xl font-bold mb-4">{selectedEntry.title}</h2>
                  
                  {selectedEntry.description && (
                    <p className="text-muted-foreground mb-6">{selectedEntry.description}</p>
                  )}

                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: selectedEntry.content.replace(/\n/g, '<br/>') }} />
                  </div>

                  {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Etiquetas:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedEntry.tags.map(tag => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {selectedEntry.isVerified && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Verificado
                        </span>
                      )}
                    </span>
                    <span>Usado {selectedEntry.usageCount} veces</span>
                  </div>
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

export default AgentHelpMenu;
