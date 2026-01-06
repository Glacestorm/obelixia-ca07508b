// Agent Help Menu Component - Universal for all agents
import React, { useState, useMemo, memo } from 'react';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  BookOpen, 
  Lightbulb, 
  Code, 
  Brain, 
  CheckCircle, 
  Search,
  Star,
  Clock,
  Zap
} from 'lucide-react';
import { AgentHelpConfig, AgentKnowledge } from '@/hooks/admin/agents/agentHelpTypes';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AgentHelpMenuProps {
  config: AgentHelpConfig;
  learnedKnowledge: AgentKnowledge[];
  isLoading?: boolean;
  className?: string;
}

export const AgentHelpMenu = memo(function AgentHelpMenu({
  config,
  learnedKnowledge,
  isLoading,
  className,
}: AgentHelpMenuProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Filter content based on search
  const filteredCapabilities = useMemo(() => {
    if (!searchQuery) return config.capabilities;
    return config.capabilities.filter(cap => 
      cap.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [config.capabilities, searchQuery]);

  const filteredKnowledge = useMemo(() => {
    if (!searchQuery) return learnedKnowledge;
    return learnedKnowledge.filter(k => 
      k.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [learnedKnowledge, searchQuery]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/20">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">{config.name}</h2>
            <p className="text-sm text-muted-foreground">{config.shortDescription}</p>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar en la ayuda..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 mx-4 mt-2" style={{ width: 'calc(100% - 2rem)' }}>
          <TabsTrigger value="overview" className="text-xs">
            <BookOpen className="h-3 w-3 mr-1" />
            General
          </TabsTrigger>
          <TabsTrigger value="examples" className="text-xs">
            <Code className="h-3 w-3 mr-1" />
            Ejemplos
          </TabsTrigger>
          <TabsTrigger value="learned" className="text-xs">
            <Brain className="h-3 w-3 mr-1" />
            Aprendido
          </TabsTrigger>
          <TabsTrigger value="tips" className="text-xs">
            <Lightbulb className="h-3 w-3 mr-1" />
            Tips
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 px-4 py-2">
          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0 space-y-4">
            {/* Full Description */}
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Descripción
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {config.fullDescription}
                </p>
              </CardContent>
            </Card>

            {/* Capabilities */}
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Capacidades ({filteredCapabilities.length})
                </h3>
                <div className="space-y-2">
                  {filteredCapabilities.map((cap, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-sm">{cap}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Best Practices */}
            {config.bestPractices.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Mejores Prácticas
                  </h3>
                  <div className="space-y-2">
                    {config.bestPractices.map((practice, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {idx + 1}
                        </Badge>
                        <span className="text-sm">{practice}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Index/TOC */}
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-medium mb-3">Índice de Contenidos</h3>
                <Accordion type="single" collapsible className="w-full">
                  {config.sections.map((section) => (
                    <AccordionItem key={section.id} value={section.id}>
                      <AccordionTrigger className="text-sm py-2">
                        {section.title}
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground mb-2">
                          {section.content}
                        </p>
                        {section.subsections && (
                          <div className="ml-4 space-y-1">
                            {section.subsections.map((sub) => (
                              <div key={sub.id} className="text-xs text-muted-foreground">
                                • {sub.title}
                              </div>
                            ))}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Examples Tab */}
          <TabsContent value="examples" className="mt-0 space-y-3">
            {config.examples.map((example) => (
              <Card key={example.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm">{example.title}</h4>
                    {example.tags && (
                      <div className="flex gap-1">
                        {example.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {example.description}
                  </p>
                  <div className="space-y-2">
                    <div className="p-2 rounded bg-muted/50">
                      <span className="text-xs font-medium text-muted-foreground">Input:</span>
                      <p className="text-sm mt-1">{example.input}</p>
                    </div>
                    <div className="p-2 rounded bg-primary/5 border-l-2 border-primary">
                      <span className="text-xs font-medium text-primary">Output:</span>
                      <p className="text-sm mt-1">{example.output}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {config.examples.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Code className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay ejemplos disponibles aún</p>
              </div>
            )}
          </TabsContent>

          {/* Learned Knowledge Tab */}
          <TabsContent value="learned" className="mt-0 space-y-3">
            {filteredKnowledge.length > 0 ? (
              filteredKnowledge.map((knowledge) => (
                <Card key={knowledge.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm">{knowledge.title}</h4>
                      <Badge 
                        variant={knowledge.confidence > 0.8 ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {Math.round(knowledge.confidence * 100)}% confianza
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {knowledge.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(knowledge.createdAt), { 
                          addSuffix: true, 
                          locale: es 
                        })}
                      </span>
                      <span>Usado {knowledge.usageCount} veces</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {searchQuery 
                    ? 'No se encontraron resultados' 
                    : 'El agente aún no ha aprendido nada nuevo'}
                </p>
                <p className="text-xs mt-1">
                  Interactúa con el agente para que aprenda
                </p>
              </div>
            )}
          </TabsContent>

          {/* Tips Tab */}
          <TabsContent value="tips" className="mt-0 space-y-3">
            {config.tips.map((tip) => (
              <Card key={tip.id} className={cn(
                "border-l-4",
                tip.priority === 'high' && "border-l-red-500",
                tip.priority === 'medium' && "border-l-yellow-500",
                tip.priority === 'low' && "border-l-green-500"
              )}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      {tip.title}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {tip.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {tip.content}
                  </p>
                </CardContent>
              </Card>
            ))}
            
            {config.tips.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay tips disponibles aún</p>
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
});

export default AgentHelpMenu;
