/**
 * LegalKnowledgePanel - Base de conocimiento jurídico con búsqueda semántica
 */

import { useState } from 'react';
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
  Upload,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LegalKnowledgePanelProps {
  companyId: string;
}

interface KnowledgeItem {
  id: string;
  title: string;
  type: 'law' | 'precedent' | 'doctrine' | 'internal';
  jurisdiction: string;
  summary: string;
  relevance: number;
  lastUpdated: string;
  source: string;
}

export function LegalKnowledgePanel({ companyId }: LegalKnowledgePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeType, setActiveType] = useState('all');
  const [results, setResults] = useState<KnowledgeItem[]>([
    {
      id: '1',
      title: 'Reglamento General de Protección de Datos (GDPR)',
      type: 'law',
      jurisdiction: 'EU',
      summary: 'Reglamento (UE) 2016/679 sobre protección de personas físicas en tratamiento de datos personales.',
      relevance: 0.95,
      lastUpdated: '2024-01-15',
      source: 'EUR-Lex'
    },
    {
      id: '2',
      title: 'STS 1234/2024 - Despido Objetivo',
      type: 'precedent',
      jurisdiction: 'ES',
      summary: 'Sentencia del Tribunal Supremo sobre requisitos formales del despido objetivo.',
      relevance: 0.88,
      lastUpdated: '2024-02-10',
      source: 'CENDOJ'
    },
    {
      id: '3',
      title: 'Directiva MiFID II - Análisis doctrinal',
      type: 'doctrine',
      jurisdiction: 'EU',
      summary: 'Análisis académico sobre obligaciones de transparencia en servicios de inversión.',
      relevance: 0.82,
      lastUpdated: '2023-11-20',
      source: 'Revista Derecho Financiero'
    },
    {
      id: '4',
      title: 'Política Interna de Compliance',
      type: 'internal',
      jurisdiction: 'AD',
      summary: 'Manual interno de cumplimiento normativo y procedimientos de control.',
      relevance: 0.78,
      lastUpdated: '2024-01-01',
      source: 'Documentación Interna'
    },
    {
      id: '5',
      title: 'Llei 29/2021 de Protecció de Dades (APDA)',
      type: 'law',
      jurisdiction: 'AD',
      summary: 'Ley andorrana de protección de datos personales adaptada al marco europeo.',
      relevance: 0.90,
      lastUpdated: '2021-12-01',
      source: 'BOPA'
    }
  ]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-ai-advisor', {
        body: {
          action: 'search_knowledge',
          context: {
            companyId,
            query: searchQuery,
            type: activeType === 'all' ? undefined : activeType
          }
        }
      });

      if (error) throw error;
      
      if (data?.data?.results) {
        setResults(data.data.results);
      }
    } catch (error) {
      console.error('Error searching knowledge:', error);
      toast.error('Error en la búsqueda');
    } finally {
      setIsSearching(false);
    }
  };

  const getTypeIcon = (type: KnowledgeItem['type']) => {
    switch (type) {
      case 'law': return <Scale className="h-4 w-4" />;
      case 'precedent': return <GraduationCap className="h-4 w-4" />;
      case 'doctrine': return <BookOpen className="h-4 w-4" />;
      case 'internal': return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: KnowledgeItem['type']) => {
    const config = {
      law: { label: 'Legislación', className: 'bg-blue-600' },
      precedent: { label: 'Jurisprudencia', className: 'bg-purple-600' },
      doctrine: { label: 'Doctrina', className: 'bg-amber-600' },
      internal: { label: 'Interno', className: 'bg-green-600' }
    };
    return <Badge className={config[type].className}>{config[type].label}</Badge>;
  };

  const getJurisdictionFlag = (code: string) => {
    const flags: Record<string, string> = { 'AD': '🇦🇩', 'ES': '🇪🇸', 'EU': '🇪🇺', 'INT': '🌍' };
    return flags[code] || '🏳️';
  };

  const filteredResults = results.filter(
    item => activeType === 'all' || item.type === activeType
  );

  return (
    <div className="space-y-6">
      {/* Barra de búsqueda */}
      <Card>
        <CardContent className="py-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500" />
              <Input
                placeholder="Búsqueda semántica en la base de conocimiento jurídico..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              <Search className="h-4 w-4 mr-2" />
              {isSearching ? 'Buscando...' : 'Buscar'}
            </Button>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Subir Documento
            </Button>
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
                          {getTypeIcon(item.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{item.title}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {item.summary}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {getTypeBadge(item.type)}
                            <Badge variant="outline">
                              {getJurisdictionFlag(item.jurisdiction)} {item.jurisdiction}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(item.lastUpdated).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Fuente: {item.source}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(item.relevance * 100)}% relevancia
                        </Badge>
                        <Button size="sm" variant="ghost">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LegalKnowledgePanel;
