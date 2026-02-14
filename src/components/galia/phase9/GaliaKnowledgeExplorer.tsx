/**
 * GALIA Knowledge Explorer
 * Navegador de normativa con búsqueda semántica y consultas al agente experto
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  BookOpen,
  Globe,
  Building,
  MapPin,
  FileText,
  Sparkles,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Send,
  ChevronRight,
  Scale,
  Landmark,
  ScrollText,
  Info,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { useGaliaKnowledgeBase, KnowledgeItem, SearchResult, ExpertQueryResult } from '@/hooks/galia/useGaliaKnowledgeBase';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const CATEGORIAS = [
  { value: 'ue', label: 'Unión Europea', icon: Globe, color: 'bg-blue-500' },
  { value: 'nacional', label: 'Nacional', icon: Landmark, color: 'bg-red-500' },
  { value: 'autonomico', label: 'Autonómico', icon: Building, color: 'bg-yellow-500' },
  { value: 'local', label: 'Local', icon: MapPin, color: 'bg-green-500' },
  { value: 'institucional', label: 'Institucional', icon: Scale, color: 'bg-purple-500' },
];

const TIPOS = [
  { value: 'reglamento', label: 'Reglamento' },
  { value: 'ley', label: 'Ley' },
  { value: 'real_decreto', label: 'Real Decreto' },
  { value: 'orden', label: 'Orden' },
  { value: 'convocatoria', label: 'Convocatoria' },
  { value: 'guia', label: 'Guía' },
  { value: 'faq', label: 'FAQ' },
  { value: 'procedimiento', label: 'Procedimiento' },
];

interface GaliaKnowledgeExplorerProps {
  onSelectDocument?: (doc: KnowledgeItem) => void;
  userRole?: 'ciudadano' | 'tecnico' | 'auditor';
  className?: string;
}

export function GaliaKnowledgeExplorer({
  onSelectDocument,
  userRole = 'tecnico',
  className
}: GaliaKnowledgeExplorerProps) {
  const [activeTab, setActiveTab] = useState<'browse' | 'search' | 'expert'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');
  const [selectedTipo, setSelectedTipo] = useState<string>('');
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeItem | null>(null);
  
  // Expert chat state
  const [expertQuestion, setExpertQuestion] = useState('');
  const [expertHistory, setExpertHistory] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    sources?: KnowledgeItem[];
    confidence?: number;
  }>>([]);

  const {
    sources,
    items,
    searchResults,
    isLoading,
    fetchSources,
    fetchItems,
    searchKnowledge,
    queryExpert,
    incrementQueryCount,
  } = useGaliaKnowledgeBase();

  // Initial load
  useEffect(() => {
    fetchSources();
    fetchItems({ limit: 50 });
  }, [fetchSources, fetchItems]);

  // Handle search
  const handleSearch = useCallback(async () => {
    if (searchQuery.trim()) {
      await searchKnowledge(searchQuery, {
        categoria: selectedCategoria || undefined,
        tipo: selectedTipo || undefined,
        limit: 20
      });
    }
  }, [searchQuery, selectedCategoria, selectedTipo, searchKnowledge]);

  // Handle expert query
  const handleExpertQuery = useCallback(async () => {
    if (!expertQuestion.trim()) return;

    // Add user message
    setExpertHistory(prev => [...prev, { role: 'user', content: expertQuestion }]);
    const question = expertQuestion;
    setExpertQuestion('');

    const result = await queryExpert(question, { userRole });
    
    if (result) {
      setExpertHistory(prev => [...prev, {
        role: 'assistant',
        content: result.answer,
        sources: result.sources as unknown as KnowledgeItem[],
        confidence: result.confidence
      }]);
    }
  }, [expertQuestion, userRole, queryExpert]);

  // Select document
  const handleSelectDocument = useCallback((doc: KnowledgeItem) => {
    setSelectedDocument(doc);
    incrementQueryCount(doc.id);
    onSelectDocument?.(doc);
  }, [incrementQueryCount, onSelectDocument]);

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.categoria]) acc[item.categoria] = [];
    acc[item.categoria].push(item);
    return acc;
  }, {} as Record<string, KnowledgeItem[]>);

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Base de Conocimiento LEADER</CardTitle>
              <CardDescription className="text-xs">
                Normativa, procedimientos y consultas al experto IA
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {items.length} documentos
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 m-2 mb-0" style={{ width: 'calc(100% - 16px)' }}>
            <TabsTrigger value="browse" className="text-xs">
              <ScrollText className="h-3 w-3 mr-1" />
              Explorar
            </TabsTrigger>
            <TabsTrigger value="search" className="text-xs">
              <Search className="h-3 w-3 mr-1" />
              Buscar
            </TabsTrigger>
            <TabsTrigger value="expert" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Experto IA
            </TabsTrigger>
          </TabsList>

          {/* Browse Tab */}
          <TabsContent value="browse" className="flex-1 m-0 p-2 overflow-hidden">
            <ScrollArea className="h-[400px]">
              <Accordion type="multiple" defaultValue={['nacional', 'ue']}>
                {CATEGORIAS.map(cat => {
                  const catItems = groupedItems[cat.value] || [];
                  if (catItems.length === 0) return null;
                  
                  const Icon = cat.icon;
                  return (
                    <AccordionItem key={cat.value} value={cat.value}>
                      <AccordionTrigger className="hover:no-underline py-2">
                        <div className="flex items-center gap-2">
                          <div className={cn("p-1.5 rounded", cat.color)}>
                            <Icon className="h-3 w-3 text-white" />
                          </div>
                          <span className="text-sm font-medium">{cat.label}</span>
                          <Badge variant="secondary" className="text-xs ml-auto mr-2">
                            {catItems.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-1 pl-8">
                          {catItems.map(item => (
                            <button
                              key={item.id}
                              onClick={() => handleSelectDocument(item)}
                              className={cn(
                                "w-full text-left p-2 rounded-md text-xs hover:bg-muted transition-colors",
                                selectedDocument?.id === item.id && "bg-muted"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="truncate">{item.titulo}</span>
                                <Badge variant="outline" className="text-[10px] ml-auto shrink-0">
                                  {item.tipo}
                                </Badge>
                              </div>
                            </button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </ScrollArea>
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search" className="flex-1 m-0 p-2 flex flex-col overflow-hidden">
            <div className="space-y-2 mb-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar en la base de conocimiento..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="text-sm"
                />
                <Button size="sm" onClick={handleSearch} disabled={isLoading}>
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex gap-2">
                <Select value={selectedCategoria || '_all'} onValueChange={(v) => setSelectedCategoria(v === '_all' ? '' : v)}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todas</SelectItem>
                    {CATEGORIAS.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedTipo || '_all'} onValueChange={(v) => setSelectedTipo(v === '_all' ? '' : v)}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todos</SelectItem>
                    {TIPOS.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ScrollArea className="flex-1">
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((result, idx) => (
                    <button
                      key={result.item.id}
                      onClick={() => handleSelectDocument(result.item)}
                      className="w-full text-left p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-sm font-medium line-clamp-2">
                          {result.item.titulo}
                        </span>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {Math.round(result.score * 20)}%
                        </Badge>
                      </div>
                      {result.highlights[0] && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {result.highlights[0]}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px]">
                          {result.item.categoria}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {result.item.tipo}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery && !isLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No se encontraron resultados
                </div>
              ) : null}
            </ScrollArea>
          </TabsContent>

          {/* Expert Tab */}
          <TabsContent value="expert" className="flex-1 m-0 p-2 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 mb-2">
              <div className="space-y-3 pr-2">
                {expertHistory.length === 0 ? (
                  <div className="text-center py-6">
                    <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary/50" />
                    <h4 className="font-medium mb-1">Agente Experto LEADER</h4>
                    <p className="text-xs text-muted-foreground mb-4">
                      Consulta sobre normativa, procedimientos y requisitos de ayudas LEADER
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-left">
                      {[
                        '¿Qué documentos necesito para solicitar una ayuda LEADER?',
                        '¿Cuáles son los plazos de justificación?',
                        'Explica el procedimiento de reintegro',
                        '¿Qué normativa aplica a mi proyecto?'
                      ].map((q, i) => (
                        <button
                          key={i}
                          onClick={() => setExpertQuestion(q)}
                          className="text-xs p-2 rounded-lg border hover:bg-muted transition-colors text-left"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  expertHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-3 rounded-lg text-sm",
                        msg.role === 'user' 
                          ? "bg-primary text-primary-foreground ml-8"
                          : "bg-muted mr-8"
                      )}
                    >
                      {msg.role === 'assistant' && msg.confidence !== undefined && (
                        <div className="flex items-center gap-2 mb-2">
                          {msg.confidence >= 0.8 ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : msg.confidence >= 0.5 ? (
                            <Info className="h-3 w-3 text-yellow-500" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            Confianza: {Math.round(msg.confidence * 100)}%
                          </span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <span className="text-[10px] text-muted-foreground">Fuentes:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {msg.sources.map((src: any, i) => (
                              <Badge key={i} variant="outline" className="text-[10px]">
                                {src.titulo?.slice(0, 30) || 'Documento'}...
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            
            <div className="flex gap-2">
              <Textarea
                placeholder="Haz una pregunta al experto..."
                value={expertQuestion}
                onChange={(e) => setExpertQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleExpertQuery())}
                className="text-sm min-h-[60px] resize-none"
                rows={2}
              />
              <Button 
                size="icon" 
                onClick={handleExpertQuery} 
                disabled={isLoading || !expertQuestion.trim()}
                className="h-[60px] w-10"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Document Preview Panel */}
        {selectedDocument && (
          <>
            <Separator />
            <div className="p-3 bg-muted/30">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-sm line-clamp-2">{selectedDocument.titulo}</h4>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => setSelectedDocument(null)}
                >
                  ×
                </Button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-[10px]">
                  {selectedDocument.categoria}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {selectedDocument.tipo}
                </Badge>
                {selectedDocument.boe_referencia && (
                  <Badge variant="outline" className="text-[10px]">
                    {selectedDocument.boe_referencia}
                  </Badge>
                )}
              </div>
              {selectedDocument.resumen && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-3">
                  {selectedDocument.resumen}
                </p>
              )}
              <ScrollArea className="h-[100px]">
                <p className="text-xs">{selectedDocument.contenido_texto}</p>
              </ScrollArea>
              {selectedDocument.fuente_url && (
                <Button variant="link" size="sm" className="h-6 p-0 mt-2 text-xs" asChild>
                  <a href={selectedDocument.fuente_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Ver fuente original
                  </a>
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default GaliaKnowledgeExplorer;
