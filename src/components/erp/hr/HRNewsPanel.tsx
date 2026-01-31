/**
 * HRNewsPanel - Noticias laborales relevantes filtradas por CNAE
 * Con capacidad de guardar y añadir a base de conocimiento
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Newspaper, Bookmark, BookmarkCheck, BookOpen, Search,
  ExternalLink, Clock, AlertTriangle, TrendingUp, Filter,
  RefreshCw, Sparkles, Building2, Shield, FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface HRNewsPanelProps {
  companyId: string;
  onAddToKnowledge?: (article: NewsArticle) => void;
}

interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  source_name: string;
  source_url: string;
  published_at: string;
  importance_level?: string;
  relevance_score?: number;
  detected_trends?: string[];
  ai_summary?: string;
  affects_cnae?: string[];
}

export function HRNewsPanel({ companyId, onAddToKnowledge }: HRNewsPanelProps) {
  const { user } = useAuth();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [savedArticles, setSavedArticles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Demo articles - en producción vendrían de news_articles con filtro laboral
  const demoArticles: NewsArticle[] = [
    {
      id: '1',
      title: 'Nueva reforma laboral 2026: cambios en contratación temporal',
      excerpt: 'El Gobierno aprueba medidas que limitan aún más el uso de contratos temporales y refuerzan la indefinición del empleo.',
      category: 'Legislación Laboral',
      source_name: 'BOE',
      source_url: 'https://boe.es',
      published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      importance_level: 'high',
      relevance_score: 95,
      detected_trends: ['reforma laboral', 'contratos'],
      ai_summary: 'Cambios significativos en la contratación temporal que afectan a todas las empresas.',
      affects_cnae: ['*']
    },
    {
      id: '2',
      title: 'Actualización del SMI para 2026: 1.184€ mensuales',
      excerpt: 'El Salario Mínimo Interprofesional sube un 4% hasta los 1.184 euros mensuales en 14 pagas.',
      category: 'Salarios',
      source_name: 'Ministerio de Trabajo',
      source_url: 'https://mites.gob.es',
      published_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      importance_level: 'high',
      relevance_score: 98,
      detected_trends: ['SMI', 'salarios'],
      ai_summary: 'Incremento del SMI que afecta a la estructura salarial de todas las empresas.',
      affects_cnae: ['*']
    },
    {
      id: '3',
      title: 'Nuevas obligaciones en prevención de riesgos para sector industrial',
      excerpt: 'Publicada la modificación del Real Decreto de prevención en el sector industrial con nuevos requisitos de evaluación.',
      category: 'PRL',
      source_name: 'INSST',
      source_url: 'https://insst.es',
      published_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      importance_level: 'medium',
      relevance_score: 75,
      detected_trends: ['PRL', 'industria'],
      ai_summary: 'Cambios en obligaciones de prevención para empresas del sector industrial.',
      affects_cnae: ['10', '20', '24', '25', '28', '29']
    },
    {
      id: '4',
      title: 'Registro horario digital obligatorio: nuevos requisitos técnicos',
      excerpt: 'La Inspección de Trabajo publica guía sobre requisitos técnicos del registro horario digital.',
      category: 'Control Horario',
      source_name: 'Inspección de Trabajo',
      source_url: 'https://mites.gob.es/itss',
      published_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
      importance_level: 'medium',
      relevance_score: 85,
      detected_trends: ['registro horario', 'digitalización'],
      ai_summary: 'Clarificación sobre requisitos del sistema de registro horario digital.',
      affects_cnae: ['*']
    },
    {
      id: '5',
      title: 'Convenio colectivo del metal: tablas salariales 2026',
      excerpt: 'Publicadas las nuevas tablas salariales del convenio del metal con incremento del 3.5%.',
      category: 'Convenios',
      source_name: 'CCOO',
      source_url: 'https://ccoo.es',
      published_at: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
      importance_level: 'medium',
      relevance_score: 70,
      detected_trends: ['convenio', 'metal', 'salarios'],
      ai_summary: 'Actualización salarial para empresas bajo convenio del metal.',
      affects_cnae: ['24', '25', '28', '29', '30']
    },
    {
      id: '6',
      title: 'Igualdad retributiva: obligación de auditoría salarial',
      excerpt: 'Recordatorio: empresas de más de 50 trabajadores deben tener auditoría salarial actualizada.',
      category: 'Igualdad',
      source_name: 'Instituto de la Mujer',
      source_url: 'https://inmujeres.es',
      published_at: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
      importance_level: 'high',
      relevance_score: 80,
      detected_trends: ['igualdad', 'auditoría salarial'],
      ai_summary: 'Obligación legal de auditoría salarial para garantizar igualdad retributiva.',
      affects_cnae: ['*']
    },
  ];

  useEffect(() => {
    // En producción, cargar desde Supabase
    setArticles(demoArticles);
    setIsLoading(false);
  }, []);

  const getImportanceBadge = (level?: string) => {
    switch (level) {
      case 'high':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30">Urgente</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">Importante</Badge>;
      case 'low':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Informativo</Badge>;
      default:
        return null;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'legislación laboral':
        return <FileText className="h-4 w-4" />;
      case 'prl':
        return <Shield className="h-4 w-4" />;
      case 'convenios':
        return <Building2 className="h-4 w-4" />;
      default:
        return <Newspaper className="h-4 w-4" />;
    }
  };

  const handleSaveArticle = async (article: NewsArticle) => {
    try {
      // Toggle saved state
      const newSaved = new Set(savedArticles);
      if (newSaved.has(article.id)) {
        newSaved.delete(article.id);
        toast.success('Noticia eliminada de guardados');
      } else {
        newSaved.add(article.id);
        toast.success('Noticia guardada');
      }
      setSavedArticles(newSaved);
    } catch (error) {
      console.error('Error saving article:', error);
      toast.error('Error al guardar noticia');
    }
  };

  const handleAddToKnowledge = async (article: NewsArticle) => {
    try {
      // En producción, guardar en tabla real de conocimiento RRHH
      // Por ahora, simular guardado
      console.log('Adding to HR knowledge:', article.title);
      /*
      const { error } = await supabase
        .from('erp_hr_knowledge_base')
        .insert({
          knowledge_type: 'news',
          title: article.title,
          content: article.ai_summary || article.excerpt,
          source_url: article.source_url,
          tags: article.detected_trends || [article.category],
          is_active: true,
          metadata: {
            source: article.source_name,
            published_at: article.published_at,
            importance_level: article.importance_level || 'medium',
            article_id: article.id,
            affects_cnae: article.affects_cnae
          }
        });
      if (error) throw error;
      */
      toast.success('Noticia añadida a base de conocimiento RRHH');
      onAddToKnowledge?.(article);
    } catch (error) {
      console.error('Error adding to knowledge:', error);
      toast.error('Error al añadir a conocimiento');
    }
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = 
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'saved') {
      return matchesSearch && savedArticles.has(article.id);
    }
    if (activeTab === 'urgent') {
      return matchesSearch && article.importance_level === 'high';
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Header con búsqueda */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Newspaper className="h-4 w-4" />
                Noticias Laborales
              </CardTitle>
              <CardDescription>
                Actualizaciones normativas y legislativas relevantes para RRHH
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar noticias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-1" />
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs y contenido */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Newspaper className="h-4 w-4" />
            Todas
            <Badge variant="secondary" className="ml-1">{articles.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="urgent" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Urgentes
            <Badge variant="secondary" className="ml-1">
              {articles.filter(a => a.importance_level === 'high').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="saved" className="gap-2">
            <BookmarkCheck className="h-4 w-4" />
            Guardadas
            <Badge variant="secondary" className="ml-1">{savedArticles.size}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
                  <p>Cargando noticias...</p>
                </div>
              ) : filteredArticles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay noticias que mostrar</p>
                </div>
              ) : (
                filteredArticles.map((article) => (
                  <Card key={article.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="gap-1">
                                {getCategoryIcon(article.category)}
                                {article.category}
                              </Badge>
                              {getImportanceBadge(article.importance_level)}
                              {article.relevance_score && article.relevance_score >= 90 && (
                                <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  Alta relevancia
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleSaveArticle(article)}
                              >
                                {savedArticles.has(article.id) ? (
                                  <BookmarkCheck className="h-4 w-4 text-primary" />
                                ) : (
                                  <Bookmark className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>

                          <h3 className="font-semibold text-sm mb-1">{article.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{article.excerpt}</p>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{article.source_name}</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(article.published_at), { 
                                  addSuffix: true, 
                                  locale: es 
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleAddToKnowledge(article)}
                              >
                                <BookOpen className="h-3 w-3 mr-1" />
                                Añadir a conocimiento
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                asChild
                              >
                                <a href={article.source_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Ver fuente
                                </a>
                              </Button>
                            </div>
                          </div>

                          {article.detected_trends && article.detected_trends.length > 0 && (
                            <div className="flex items-center gap-1 mt-3 flex-wrap">
                              <TrendingUp className="h-3 w-3 text-muted-foreground" />
                              {article.detected_trends.map((trend, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {trend}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRNewsPanel;
