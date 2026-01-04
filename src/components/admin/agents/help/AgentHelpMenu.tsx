/**
 * AgentHelpMenu - Menú de ayuda completo para agentes
 * Índice estructurado, ejemplos, tips, conocimientos aprendidos
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  HelpCircle,
  Zap,
  FileText,
  Lightbulb,
  Brain,
  Award,
  Search,
  MessageCircle,
  BookOpen,
  Sparkles,
  Clock,
  CheckCircle,
  ChevronRight,
  ExternalLink,
  ThumbsUp,
} from 'lucide-react';
import { useAgentHelp, KNOWLEDGE_CATEGORIES, type AgentKnowledge } from '@/hooks/admin/agents/useAgentHelp';
import { AgentHelpChatbot } from './AgentHelpChatbot';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';

interface AgentHelpMenuProps {
  agentId: string;
  agentType: 'crm' | 'erp' | 'supervisor' | 'vertical';
  agentName: string;
  agentDescription?: string;
  agentIcon?: React.ReactNode;
  moduleType?: string;
  className?: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  capability: <Zap className="h-4 w-4" />,
  example: <FileText className="h-4 w-4" />,
  tip: <Lightbulb className="h-4 w-4" />,
  learned: <Brain className="h-4 w-4" />,
  faq: <HelpCircle className="h-4 w-4" />,
  best_practice: <Award className="h-4 w-4" />,
};

export function AgentHelpMenu({
  agentId,
  agentType,
  agentName,
  agentDescription,
  agentIcon,
  moduleType,
  className
}: AgentHelpMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('index');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<AgentKnowledge | null>(null);

  const {
    knowledge,
    getIndexedSections,
    incrementUsage,
  } = useAgentHelp({
    agentId,
    agentType,
    agentName,
    agentDescription,
    moduleType
  });

  const sections = getIndexedSections();

  // Filtrar conocimientos por búsqueda
  const filteredKnowledge = searchQuery.trim()
    ? knowledge.filter(k => 
        k.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const handleSelectItem = useCallback((item: AgentKnowledge) => {
    setSelectedItem(item);
    incrementUsage(item.id);
  }, [incrementUsage]);

  const renderKnowledgeItem = (item: AgentKnowledge) => (
    <div
      key={item.id}
      onClick={() => handleSelectItem(item)}
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
        selectedItem?.id === item.id 
          ? "border-primary bg-primary/5" 
          : "border-border hover:border-primary/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{item.title}</h4>
          {item.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {item.description}
            </p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      </div>
      
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="outline" className="text-xs">
          {KNOWLEDGE_CATEGORIES[item.category as keyof typeof KNOWLEDGE_CATEGORIES]?.label || item.category}
        </Badge>
        {item.usage_count > 0 && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <ThumbsUp className="h-3 w-3" />
            {item.usage_count}
          </span>
        )}
        {item.is_verified && (
          <CheckCircle className="h-3 w-3 text-emerald-500" />
        )}
      </div>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2", className)}
        >
          <HelpCircle className="h-4 w-4" />
          Ayuda
        </Button>
      </SheetTrigger>
      
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 border-b bg-gradient-to-r from-primary/10 via-accent/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-white">
              {agentIcon || <Sparkles className="h-5 w-5" />}
            </div>
            <div>
              <SheetTitle className="text-lg">Ayuda: {agentName}</SheetTitle>
              {agentDescription && (
                <p className="text-sm text-muted-foreground mt-0.5">{agentDescription}</p>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-3 grid grid-cols-3">
            <TabsTrigger value="index" className="gap-1.5 text-xs">
              <BookOpen className="h-3.5 w-3.5" />
              Índice
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-1.5 text-xs">
              <MessageCircle className="h-3.5 w-3.5" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="learned" className="gap-1.5 text-xs">
              <Brain className="h-3.5 w-3.5" />
              Aprendido
            </TabsTrigger>
          </TabsList>

          {/* Tab: Índice */}
          <TabsContent value="index" className="flex-1 mt-0 overflow-hidden flex flex-col">
            {/* Búsqueda */}
            <div className="px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar en la ayuda..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="px-4 pb-4 space-y-4">
                {/* Resultados de búsqueda */}
                {searchQuery.trim() ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Resultados ({filteredKnowledge.length})
                    </h3>
                    {filteredKnowledge.length > 0 ? (
                      filteredKnowledge.map(renderKnowledgeItem)
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No se encontraron resultados
                      </p>
                    )}
                  </div>
                ) : selectedItem ? (
                  // Vista detallada de item seleccionado
                  <div className="space-y-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedItem(null)}
                      className="gap-1 -ml-2"
                    >
                      ← Volver al índice
                    </Button>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {CATEGORY_ICONS[selectedItem.category]}
                        <Badge variant="outline">
                          {KNOWLEDGE_CATEGORIES[selectedItem.category as keyof typeof KNOWLEDGE_CATEGORIES]?.label}
                        </Badge>
                        {selectedItem.is_verified && (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Verificado
                          </Badge>
                        )}
                      </div>
                      
                      <h2 className="text-xl font-semibold">{selectedItem.title}</h2>
                      
                      {selectedItem.description && (
                        <p className="text-muted-foreground">{selectedItem.description}</p>
                      )}
                      
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{selectedItem.content}</ReactMarkdown>
                      </div>

                      {/* Ejemplo input/output */}
                      {selectedItem.example_input && (
                        <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
                          <h4 className="text-sm font-medium mb-2">Ejemplo de uso:</h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Input: </span>
                              <code className="bg-background px-1 rounded">{selectedItem.example_input}</code>
                            </div>
                            {selectedItem.example_output && (
                              <div>
                                <span className="text-muted-foreground">Output: </span>
                                <code className="bg-background px-1 rounded">{selectedItem.example_output}</code>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {selectedItem.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {selectedItem.tags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Metadatos */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {selectedItem.usage_count} usos
                        </span>
                        {selectedItem.last_used_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Usado {formatDistanceToNow(new Date(selectedItem.last_used_at), { addSuffix: true, locale: es })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Índice por secciones
                  <Accordion type="multiple" defaultValue={Object.keys(sections)} className="space-y-2">
                    {Object.entries(sections).map(([category, items]) => (
                      <AccordionItem key={category} value={category} className="border rounded-lg px-3">
                        <AccordionTrigger className="py-3 hover:no-underline">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "p-1.5 rounded-md",
                              KNOWLEDGE_CATEGORIES[category as keyof typeof KNOWLEDGE_CATEGORIES]?.color.replace('text-', 'bg-') + '/10'
                            )}>
                              {CATEGORY_ICONS[category]}
                            </div>
                            <span className="font-medium">
                              {KNOWLEDGE_CATEGORIES[category as keyof typeof KNOWLEDGE_CATEGORIES]?.label}
                            </span>
                            <Badge variant="secondary" className="ml-auto mr-2 text-xs">
                              {items.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-3 space-y-2">
                          {items.map(renderKnowledgeItem)}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Tab: Chat */}
          <TabsContent value="chat" className="flex-1 mt-0 overflow-hidden">
            <AgentHelpChatbot
              agentId={agentId}
              agentType={agentType}
              agentName={agentName}
              agentDescription={agentDescription}
              moduleType={moduleType}
            />
          </TabsContent>

          {/* Tab: Aprendido */}
          <TabsContent value="learned" className="flex-1 mt-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Conocimientos Aprendidos</h3>
                  <Badge variant="outline" className="gap-1">
                    <Brain className="h-3 w-3" />
                    {knowledge.filter(k => k.category === 'learned').length} items
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  El agente aprende continuamente de las interacciones y feedback. 
                  Estos son los conocimientos adquiridos recientemente.
                </p>

                <div className="space-y-2">
                  {knowledge
                    .filter(k => k.category === 'learned' || k.source === 'interaction')
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map(item => (
                      <div 
                        key={item.id}
                        className="p-3 rounded-lg border bg-gradient-to-r from-purple-500/5 to-transparent"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{item.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {item.content}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
                          </div>
                        </div>
                        
                        {item.source && (
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              Fuente: {item.source}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Confianza: {item.confidence_score || 85}%
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))
                  }
                  
                  {knowledge.filter(k => k.category === 'learned').length === 0 && (
                    <div className="text-center py-8">
                      <Brain className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Aún no hay conocimientos aprendidos.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Interactúa con el agente para que empiece a aprender.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

export default AgentHelpMenu;
