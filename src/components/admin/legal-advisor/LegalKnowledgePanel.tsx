/**
 * LegalKnowledgePanel - Panel de gestión de la base de conocimiento legal
 * Búsqueda semántica, gestión de artículos y precedentes
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  BookOpen,
  Search,
  Plus,
  Tag,
  Globe,
  Calendar,
  Eye,
  Edit,
  Sparkles,
  FileText,
  Scale,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLegalKnowledge, type LegalKnowledgeItem } from '@/hooks/admin/legal';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function LegalKnowledgePanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const {
    isLoading,
    knowledge,
    stats,
    fetchKnowledge
  } = useLegalKnowledge();

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    await fetchKnowledge({ search: searchQuery });
    setIsSearching(false);
  }, [searchQuery, fetchKnowledge]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      law: <Scale className="h-4 w-4" />,
      regulation: <FileText className="h-4 w-4" />,
      precedent: <BookOpen className="h-4 w-4" />,
      doctrine: <BookOpen className="h-4 w-4" />,
      template: <FileText className="h-4 w-4" />
    };
    return icons[type] || <FileText className="h-4 w-4" />;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      law: 'bg-blue-500/10 text-blue-500',
      regulation: 'bg-purple-500/10 text-purple-500',
      precedent: 'bg-emerald-500/10 text-emerald-500',
      doctrine: 'bg-orange-500/10 text-orange-500',
      template: 'bg-slate-500/10 text-slate-500'
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Artículos</p>
                <p className="text-2xl font-bold">{stats?.total_items || 0}</p>
              </div>
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verificados</p>
                <p className="text-2xl font-bold text-emerald-500">{stats?.verified_count || 0}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jurisdicciones</p>
                <p className="text-2xl font-bold">{stats?.by_jurisdiction ? Object.keys(stats.by_jurisdiction).length : 0}</p>
              </div>
              <Globe className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Categorías</p>
                <p className="text-2xl font-bold">{stats?.by_type ? Object.keys(stats.by_type).length : 0}</p>
              </div>
              <Tag className="h-5 w-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Search */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Búsqueda Semántica
            </CardTitle>
            <CardDescription>Busca en la base de conocimiento legal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Describe tu consulta legal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[100px] resize-none"
              />
              <Button 
                onClick={handleSearch}
                disabled={!searchQuery.trim() || isSearching}
                className="w-full"
              >
                {isSearching ? (
                  <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Buscar
              </Button>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Búsquedas sugeridas</p>
              <div className="space-y-1">
                {[
                  'Normativa GDPR aplicable a fintech',
                  'Precedentes laborales despido',
                  'Requisitos MiFID II asesoramiento'
                ].map((suggestion, i) => (
                  <Button
                    key={i}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-auto py-2"
                    onClick={() => setSearchQuery(suggestion)}
                  >
                    <Search className="h-3 w-3 mr-2 shrink-0" />
                    <span className="truncate">{suggestion}</span>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Items */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Base de Conocimiento</CardTitle>
              <CardDescription>Artículos, leyes y precedentes</CardDescription>
            </div>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Añadir
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {knowledge.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={cn("p-2 rounded-lg shrink-0", getTypeColor(item.knowledge_type))}>
                          {getTypeIcon(item.knowledge_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium truncate">{item.title}</h4>
                            {item.is_verified && (
                              <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {item.summary}
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              <Globe className="h-3 w-3 mr-1" />
                              {item.jurisdiction_code}
                            </Badge>
                            <Badge className={cn("text-xs", getTypeColor(item.knowledge_type))}>
                              {item.knowledge_type}
                            </Badge>
                            {item.effective_date && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(item.effective_date).toLocaleDateString('es')}
                              </span>
                            )}
                          </div>
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {item.tags.slice(0, 4).map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-[10px]">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {knowledge.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-sm">No hay artículos en la base de conocimiento</p>
                    <p className="text-xs mt-1">Añade leyes, regulaciones o precedentes</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default LegalKnowledgePanel;
