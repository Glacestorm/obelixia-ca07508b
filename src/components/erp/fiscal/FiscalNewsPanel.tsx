/**
 * FiscalNewsPanel - Panel de noticias fiscales relevantes para el CNAE de la empresa
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Newspaper,
  TrendingUp,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Lightbulb,
  Upload,
  Sparkles,
  Building2,
  Filter,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  category: string;
  published_at: string;
  url: string;
  relevance_score: number;
  importance_level: string;
  ai_summary?: string;
  detected_trends?: string[];
}

interface FiscalNewsPanelProps {
  companyId?: string;
  companyCnae?: string;
  className?: string;
  onAddToKnowledge?: (article: NewsArticle) => void;
}

export function FiscalNewsPanel({ 
  companyId, 
  companyCnae,
  className,
  onAddToKnowledge 
}: FiscalNewsPanelProps) {
  const { user } = useAuth();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch fiscal/legal news
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .or('category.eq.Legal,category.eq.Fiscal,category.eq.Economy,category.ilike.%fiscal%,category.ilike.%tax%')
        .order('relevance_score', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      setArticles((data || []) as NewsArticle[]);
    } catch (error) {
      console.error('Error fetching fiscal news:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSavedIds = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('saved_news')
        .select('article_id')
        .eq('user_id', user.id);
      
      if (data) {
        setSavedIds(new Set(data.map(d => d.article_id)));
      }
    } catch (error) {
      console.error('Error fetching saved:', error);
    }
  }, [user]);

  const toggleSave = async (articleId: string) => {
    if (!user) {
      toast.error('Inicia sesión para guardar noticias');
      return;
    }

    try {
      if (savedIds.has(articleId)) {
        await supabase
          .from('saved_news')
          .delete()
          .eq('user_id', user.id)
          .eq('article_id', articleId);
        
        setSavedIds(prev => {
          const next = new Set(prev);
          next.delete(articleId);
          return next;
        });
        toast.success('Noticia eliminada de guardados');
      } else {
        await supabase
          .from('saved_news')
          .insert({ user_id: user.id, article_id: articleId });
        
        setSavedIds(prev => new Set([...prev, articleId]));
        toast.success('Noticia guardada');
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      toast.error('Error al guardar');
    }
  };

  const handleAddToKnowledge = async (article: NewsArticle) => {
    try {
      const { error } = await supabase
        .from('erp_fiscal_knowledge_base')
        .insert({
          knowledge_type: 'news',
          title: article.title,
          content: article.ai_summary || article.excerpt,
          source_url: article.url,
          tags: article.detected_trends || [article.category],
          is_active: true,
          verified_by: user?.id || null,
          metadata: {
            source: article.source,
            published_at: article.published_at,
            importance_level: article.importance_level,
            article_id: article.id
          }
        });

      if (error) throw error;
      toast.success('Noticia añadida a base de conocimiento fiscal');
      onAddToKnowledge?.(article);
    } catch (error) {
      console.error('Error adding to knowledge:', error);
      toast.error('Error al añadir a conocimiento');
    }
  };

  const refreshNews = async () => {
    setRefreshing(true);
    try {
      await supabase.functions.invoke('fetch-sector-news', {
        body: { categories: ['Legal', 'Fiscal', 'Economy'] }
      });
      toast.success('Noticias fiscales actualizadas');
      await fetchNews();
    } catch (error) {
      console.error('Error refreshing:', error);
      toast.error('Error al actualizar noticias');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
    fetchSavedIds();
  }, [fetchNews, fetchSavedIds]);

  const getImportanceColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-amber-500 text-white';
      case 'medium': return 'bg-blue-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredArticles = activeTab === 'saved' 
    ? articles.filter(a => savedIds.has(a.id))
    : activeTab === 'important'
    ? articles.filter(a => a.importance_level === 'high' || a.importance_level === 'critical')
    : articles;

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Noticias Fiscales</CardTitle>
              {companyCnae && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3 w-3" />
                  CNAE: {companyCnae}
                </p>
              )}
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshNews}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 rounded-none border-b mx-0 px-4">
            <TabsTrigger value="all" className="text-xs gap-1">
              <Newspaper className="h-3 w-3" />
              Todas
            </TabsTrigger>
            <TabsTrigger value="important" className="text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />
              Importantes
            </TabsTrigger>
            <TabsTrigger value="saved" className="text-xs gap-1">
              <Bookmark className="h-3 w-3" />
              Guardadas
              {savedIds.size > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {savedIds.size}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-4 py-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-8">
                <Newspaper className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {activeTab === 'saved' ? 'Sin noticias guardadas' : 'Sin noticias fiscales recientes'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredArticles.map((article) => (
                  <div 
                    key={article.id}
                    className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={cn("text-[10px]", getImportanceColor(article.importance_level))}>
                            {article.importance_level === 'critical' ? 'Crítica' :
                             article.importance_level === 'high' ? 'Alta' :
                             article.importance_level === 'medium' ? 'Media' : 'Normal'}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {article.category}
                          </Badge>
                        </div>
                        
                        <a 
                          href={article.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-sm hover:text-primary hover:underline line-clamp-2"
                        >
                          {article.title}
                        </a>
                        
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {article.ai_summary || article.excerpt}
                        </p>

                        {article.detected_trends && article.detected_trends.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {article.detected_trends.slice(0, 3).map((trend, idx) => (
                              <Badge key={idx} variant="secondary" className="text-[10px]">
                                <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                                {trend}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                          <span>{article.source}</span>
                          <span>•</span>
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(article.published_at), { addSuffix: true, locale: es })}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleSave(article.id)}
                        >
                          {savedIds.has(article.id) ? (
                            <BookmarkCheck className="h-4 w-4 text-primary" />
                          ) : (
                            <Bookmark className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleAddToKnowledge(article)}
                          title="Añadir a base de conocimiento"
                        >
                          <Lightbulb className="h-4 w-4" />
                        </Button>
                        <a href={article.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default FiscalNewsPanel;
