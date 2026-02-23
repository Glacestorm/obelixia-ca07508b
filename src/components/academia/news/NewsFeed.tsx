
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink, Calendar, Tag, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source_name: string;
  source_url: string;
  importance_score: number;
  tags: string[];
  is_regulation: boolean;
  effective_date?: string;
  created_at: string;
}

export const NewsFeed = ({ courseId }: { courseId: string }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('academia_course_news')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('importance_score', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNews(data || []);
    } catch (err) {
      console.error('Error loading news:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshNews = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase.functions.invoke('fetch-sector-news', {
        body: { query: 'novedades contables fiscales España 2025 BOE', limit: 5 }
      });

      if (error) throw error;
      
      if (data.success) {
        toast.success(`${data.count} noticias actualizadas`);
        fetchNews();
      }
    } catch (err) {
      console.error('Error refreshing news:', err);
      toast.error('Error al actualizar noticias');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [courseId]);

  if (loading && news.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">Cargando novedades...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Actualidad Normativa 2025-2026
        </h3>
        <Button variant="ghost" size="sm" onClick={refreshNews} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {news.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:border-primary/50 transition-colors">
              <div className={`h-1 w-full ${
                item.importance_score > 80 ? 'bg-red-500' : 
                item.importance_score > 60 ? 'bg-amber-500' : 'bg-blue-500'
              }`} />
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={item.is_regulation ? "destructive" : "outline"}>
                    {item.is_regulation ? 'REGULACIÓN OFICIAL' : 'NOVEDAD'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(item.created_at), 'd MMM yyyy', { locale: es })}
                  </span>
                </div>
                
                <h4 className="font-bold text-sm mb-2 line-clamp-2">{item.title}</h4>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-3">
                  {item.summary}
                </p>

                <div className="flex flex-wrap gap-1 mb-3">
                  {item.tags?.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] h-5">
                      <Tag className="h-3 w-3 mr-1" /> {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 border-t mt-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Fuente: {item.source_name}
                  </span>
                  <a 
                    href={item.source_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs flex items-center text-primary hover:underline"
                  >
                    Leer original <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}

          {news.length === 0 && (
            <div className="text-center py-10 border rounded-lg bg-muted/20">
              <CheckCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No hay novedades pendientes de revisión.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
