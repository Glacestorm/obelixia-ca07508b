/**
 * LegalNewsPanel - Noticias y actualizaciones legales
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Newspaper, 
  ExternalLink, 
  Clock,
  Globe,
  BookmarkPlus
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface LegalNewsPanelProps {
  companyId: string;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  jurisdiction: string;
  source: string;
  url: string;
  publishedAt: string;
  isImportant: boolean;
}

export function LegalNewsPanel({ companyId }: LegalNewsPanelProps) {
  const [news] = useState<NewsItem[]>([
    {
      id: '1',
      title: 'ESMA publica nuevas directrices sobre cumplimiento MiFID II',
      summary: 'La Autoridad Europea de Valores y Mercados ha emitido nuevas orientaciones sobre la aplicación de las normas de transparencia en costes.',
      category: 'Servicios Financieros',
      jurisdiction: 'EU',
      source: 'ESMA',
      url: '#',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      isImportant: true
    },
    {
      id: '2',
      title: 'Nueva sentencia del TS sobre despido objetivo',
      summary: 'El Tribunal Supremo establece nuevos criterios para la carta de despido objetivo por causas económicas.',
      category: 'Laboral',
      jurisdiction: 'ES',
      source: 'CENDOJ',
      url: '#',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      isImportant: false
    },
    {
      id: '3',
      title: 'AEPD sanciona con 1.2M€ por brecha de seguridad',
      summary: 'La Agencia Española de Protección de Datos impone multa por falta de medidas de seguridad adecuadas.',
      category: 'Protección de Datos',
      jurisdiction: 'ES',
      source: 'AEPD',
      url: '#',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      isImportant: true
    },
    {
      id: '4',
      title: 'Andorra actualiza normativa bancaria',
      summary: 'El Gobierno andorrano aprueba nuevas medidas de supervisión para entidades financieras.',
      category: 'Bancario',
      jurisdiction: 'AD',
      source: 'BOPA',
      url: '#',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      isImportant: false
    },
    {
      id: '5',
      title: 'EBA emite informe sobre implementación DORA',
      summary: 'La Autoridad Bancaria Europea publica guía práctica para la implementación del Reglamento de Resiliencia Operativa Digital.',
      category: 'Tecnología',
      jurisdiction: 'EU',
      source: 'EBA',
      url: '#',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
      isImportant: true
    }
  ]);

  const getJurisdictionFlag = (code: string) => {
    const flags: Record<string, string> = { 'AD': '🇦🇩', 'ES': '🇪🇸', 'EU': '🇪🇺', 'INT': '🌍' };
    return flags[code] || '🏳️';
  };

  const handleBookmark = (newsId: string) => {
    toast.success('Noticia guardada en favoritos');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            Noticias Legales
          </h2>
          <p className="text-sm text-muted-foreground">
            Actualizaciones normativas y jurisprudenciales relevantes
          </p>
        </div>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {news.map((item) => (
            <Card 
              key={item.id} 
              className={`hover:shadow-md transition-shadow ${item.isImportant ? 'border-l-4 border-l-amber-500' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {item.isImportant && (
                        <Badge variant="destructive" className="text-xs">Importante</Badge>
                      )}
                      <Badge variant="secondary">{item.category}</Badge>
                      <Badge variant="outline">
                        {getJurisdictionFlag(item.jurisdiction)} {item.jurisdiction}
                      </Badge>
                    </div>
                    <h3 className="font-medium mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {item.summary}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {item.source}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(item.publishedAt), {
                          addSuffix: true,
                          locale: es
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleBookmark(item.id)}>
                      <BookmarkPlus className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default LegalNewsPanel;
