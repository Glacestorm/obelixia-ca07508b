/**
 * LegalKnowledgePanel - Base de conocimiento jurídico con búsqueda semántica
 * Fase 7: Integración con LegalKnowledgeUploader y categorización automática
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Search, 
  FileText,
  Scale,
  GraduationCap,
  Clock,
  ExternalLink,
  Sparkles,
  RefreshCw,
  ThumbsUp,
  Eye,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLegalKnowledge, LegalKnowledgeItem } from '@/hooks/admin/legal/useLegalKnowledge';
import { LegalKnowledgeUploader } from './LegalKnowledgeUploader';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface LegalKnowledgePanelProps {
  companyId: string;
}

export function LegalKnowledgePanel({ companyId }: LegalKnowledgePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeType, setActiveType] = useState('all');
  const [searchResults, setSearchResults] = useState<LegalKnowledgeItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const {
    knowledge,
    stats,
    isLoading,
    fetchKnowledge,
    incrementViewCount,
    markAsHelpful,
    verifyKnowledgeItem,
  } = useLegalKnowledge();

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    
    setIsSearching(true);
    setHasSearched(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('legal-ai-advisor', {
        body: {
          action: 'search_knowledge',
          query: searchQuery,
          context: {
            companyId,
            type: activeType === 'all' ? undefined : activeType
          }
        }
      });

      if (error) throw error;
      
      // Si hay resultados de la API, usarlos; sino filtrar localmente
      if (data?.data?.results) {
        setSearchResults(data.data.results);
      } else {
        // Filtrado local como fallback
        const filtered = knowledge.filter(item =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.summary && item.summary.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error('Error searching knowledge:', error);
      // Filtrado local como fallback
      const filtered = knowledge.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, activeType, companyId, knowledge]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'law': return <Scale className="h-4 w-4" />;
      case 'regulation': return <Scale className="h-4 w-4" />;
      case 'precedent': return <GraduationCap className="h-4 w-4" />;
      case 'doctrine': return <BookOpen className="h-4 w-4" />;
      case 'template': return <FileText className="h-4 w-4" />;
      case 'circular': return <FileText className="h-4 w-4" />;
      case 'convention': return <FileText className="h-4 w-4" />;
      case 'treaty': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, { label: string; className: string }> = {
      law: { label: 'Legislación', className: 'bg-blue-600' },
      regulation: { label: 'Reglamento', className: 'bg-blue-500' },
      precedent: { label: 'Jurisprudencia', className: 'bg-purple-600' },
      doctrine: { label: 'Doctrina', className: 'bg-amber-600' },
      template: { label: 'Plantilla', className: 'bg-green-600' },
      circular: { label: 'Circular', className: 'bg-cyan-600' },
      convention: { label: 'Convenio', className: 'bg-orange-600' },
      treaty: { label: 'Tratado', className: 'bg-indigo-600' },
    };
    const item = config[type] || { label: type, className: 'bg-gray-600' };
    return <Badge className={item.className}>{item.label}</Badge>;
  };

  const getJurisdictionFlag = (code: string) => {
    const flags: Record<string, string> = { 'AD': '🇦🇩', 'ES': '🇪🇸', 'EU': '🇪🇺', 'UK': '🇬🇧', 'AE': '🇦🇪', 'US': '🇺🇸', 'INT': '🌍' };
    return flags[code] || '🏳️';
  };

  // Use search results if searched, otherwise use all knowledge
  const displayItems = hasSearched ? searchResults : knowledge;
  const filteredResults = displayItems.filter(
    item => activeType === 'all' || item.knowledge_type === activeType
  );

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      {stats && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span><strong>{stats.total_items}</strong> documentos</span>
          <span><strong>{stats.verified_count}</strong> verificados</span>
          <Button variant="ghost" size="sm" onClick={() => fetchKnowledge()}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Actualizar
          </Button>
        </div>
      )}

      {/* Barra de búsqueda */}
      <Card>
        <CardContent className="py-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <Input
                placeholder="Búsqueda semántica en la base de conocimiento jurídico..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching || isLoading}>
              <Search className="h-4 w-4 mr-2" />
              {isSearching ? 'Buscando...' : 'Buscar'}
            </Button>
            <LegalKnowledgeUploader companyId={companyId} onUploadComplete={() => fetchKnowledge()} />
          </div>
        </CardContent>
      </Card>

      {/* Tabs por tipo */}
      <Tabs value={activeType} onValueChange={setActiveType}>
        <TabsList>
          <TabsTrigger value="all">
            <BookOpen className="h-4 w-4 mr-2" />
            Todos
          </TabsTrigger>
          <TabsTrigger value="law">
            <Scale className="h-4 w-4 mr-2" />
            Legislación
          </TabsTrigger>
          <TabsTrigger value="precedent">
            <GraduationCap className="h-4 w-4 mr-2" />
            Jurisprudencia
          </TabsTrigger>
          <TabsTrigger value="doctrine">
            <BookOpen className="h-4 w-4 mr-2" />
            Doctrina
          </TabsTrigger>
          <TabsTrigger value="internal">
            <FileText className="h-4 w-4 mr-2" />
            Internos
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeType} className="mt-4">
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {filteredResults.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          {getTypeIcon(item.knowledge_type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{item.title}</h3>
                            {item.is_verified && <CheckCircle className="h-4 w-4 text-green-500" />}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {item.summary || item.content.substring(0, 150) + '...'}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {getTypeBadge(item.knowledge_type)}
                            <Badge variant="outline">
                              {getJurisdictionFlag(item.jurisdiction_code)} {item.jurisdiction_code}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true, locale: es })}
                            </span>
                            {item.source_name && (
                              <span className="text-xs text-muted-foreground">
                                Fuente: {item.source_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Eye className="h-3 w-3" /> {item.view_count}
                          <ThumbsUp className="h-3 w-3 ml-2" /> {item.helpful_count}
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => markAsHelpful(item.id)}>
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          {item.source_url && (
                            <Button size="sm" variant="ghost" onClick={() => window.open(item.source_url!, '_blank')}>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredResults.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>{hasSearched ? 'No se encontraron resultados' : 'Carga documentos para comenzar'}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LegalKnowledgePanel;
