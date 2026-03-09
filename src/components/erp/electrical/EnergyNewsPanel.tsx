/**
 * EnergyNewsPanel - Noticias del sector energético
 * Patrón replicado de módulos FISCAL / RRHH adaptado a energía
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Newspaper, Search, RefreshCw, Bookmark, ExternalLink, Loader2,
  Zap, Flame, Sun, TrendingUp, AlertTriangle, Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface EnergyNewsItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  source: string;
  url?: string;
  published_at: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  energy_type?: string;
  tags?: string[];
}

interface Props {
  companyId?: string;
}

const CATEGORIES = ['all', 'mercado', 'regulacion', 'tecnologia', 'precios', 'renovables', 'gas', 'autoconsumo'];
const IMPORTANCE_COLORS: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-700 border-red-200',
  high: 'bg-orange-500/10 text-orange-700 border-orange-200',
  medium: 'bg-blue-500/10 text-blue-700 border-blue-200',
  low: 'bg-muted text-muted-foreground',
};

export function EnergyNewsPanel({ companyId }: Props) {
  const [news, setNews] = useState<EnergyNewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('energy-ai-recommendation', {
        body: {
          action: 'get_energy_news',
          params: { category: category !== 'all' ? category : undefined, search },
        },
      });

      if (!error && data?.success && Array.isArray(data.data)) {
        setNews(data.data);
      } else {
        // Fallback sample data
        setNews(getSampleNews());
      }
    } catch {
      setNews(getSampleNews());
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  const toggleSave = (id: string) => {
    setSaved(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast.info('Noticia desmarcada'); }
      else { next.add(id); toast.success('Noticia guardada'); }
      return next;
    });
  };

  const filtered = news.filter(n => {
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.summary.toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== 'all' && n.category !== category) return false;
    return true;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-primary" />
            Noticias del Sector Energético
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchNews} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="pl-8 h-8 text-xs" placeholder="Buscar noticias..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c === 'all' ? 'Todas' : c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="py-8 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No se encontraron noticias</div>
          ) : (
            <div className="space-y-2">
              {filtered.map(item => (
                <div key={item.id} className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className={cn("text-[10px]", IMPORTANCE_COLORS[item.importance])}>{item.importance}</Badge>
                        <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                        {item.energy_type && <Badge variant="outline" className="text-[10px] capitalize">{item.energy_type}</Badge>}
                      </div>
                      <p className="text-sm font-medium leading-tight">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-muted-foreground">{item.source}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(item.published_at), 'dd MMM yyyy', { locale: es })}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleSave(item.id)}>
                        <Bookmark className={cn("h-3.5 w-3.5", saved.has(item.id) && "fill-primary text-primary")} />
                      </Button>
                      {item.url && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <a href={item.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function getSampleNews(): EnergyNewsItem[] {
  const now = new Date();
  return [
    { id: '1', title: 'Nuevo real decreto sobre autoconsumo colectivo en comunidades de vecinos', summary: 'El Gobierno aprueba nueva regulación que facilita el autoconsumo compartido en edificios residenciales, eliminando barreras administrativas y simplificando trámites.', category: 'regulacion', source: 'BOE', published_at: now.toISOString(), importance: 'high', energy_type: 'solar', tags: ['autoconsumo', 'regulación'] },
    { id: '2', title: 'Precio del pool eléctrico alcanza mínimos del trimestre', summary: 'La alta generación renovable y el descenso de la demanda industrial provocan una caída significativa en el precio mayorista de electricidad.', category: 'mercado', source: 'OMIE', published_at: new Date(now.getTime() - 86400000).toISOString(), importance: 'medium', energy_type: 'electricity' },
    { id: '3', title: 'CNMC revisa las tarifas de acceso para gas natural en 2026', summary: 'La Comisión Nacional de los Mercados propone nuevos peajes de acceso a redes de gas natural para el próximo periodo regulatorio.', category: 'regulacion', source: 'CNMC', published_at: new Date(now.getTime() - 2 * 86400000).toISOString(), importance: 'high', energy_type: 'gas' },
    { id: '4', title: 'Almacenamiento con baterías: costes bajan un 15% en primer trimestre', summary: 'Los sistemas de almacenamiento de energía mediante baterías de litio registran nuevos mínimos históricos de coste por kWh instalado.', category: 'tecnologia', source: 'Bloomberg NEF', published_at: new Date(now.getTime() - 3 * 86400000).toISOString(), importance: 'medium', energy_type: 'solar' },
    { id: '5', title: 'Alerta: subida prevista del gas TTF para el próximo trimestre', summary: 'Los futuros del gas natural TTF anticipan un incremento del 12% para los próximos 3 meses debido a tensiones geopolíticas y menor producción noruega.', category: 'precios', source: 'Reuters', published_at: new Date(now.getTime() - 4 * 86400000).toISOString(), importance: 'critical', energy_type: 'gas' },
    { id: '6', title: 'España supera los 20 GW de potencia fotovoltaica instalada', summary: 'El país alcanza un nuevo hito en capacidad solar fotovoltaica, consolidándose como líder europeo en energía solar.', category: 'renovables', source: 'REE', published_at: new Date(now.getTime() - 5 * 86400000).toISOString(), importance: 'low', energy_type: 'solar' },
  ];
}

export default EnergyNewsPanel;
