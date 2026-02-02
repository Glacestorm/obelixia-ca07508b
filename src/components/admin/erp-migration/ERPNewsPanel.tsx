/**
 * ERP News Panel Component
 * Noticias y actualizaciones del módulo de migración ERP
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Newspaper,
  Bell,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ArrowRight,
  ExternalLink,
  TrendingUp,
  Zap,
  Shield,
  BookOpen,
  Package,
  RefreshCw,
  Clock,
  Star,
  MessageSquare,
  ThumbsUp,
  Eye,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: 'new-connector' | 'feature' | 'regulation' | 'security' | 'case-study' | 'tip';
  priority: 'low' | 'medium' | 'high' | 'critical';
  publishedAt: string;
  author?: string;
  tags: string[];
  readTime: number;
  views: number;
  likes: number;
  imageUrl?: string;
  externalLink?: string;
  isNew: boolean;
  isRead: boolean;
}

interface ERPNewsPanelProps {
  sessionId?: string;
}

const NEWS_CATEGORIES = [
  { id: 'all', label: 'Todas', icon: Newspaper },
  { id: 'new-connector', label: 'Conectores', icon: Package },
  { id: 'feature', label: 'Nuevas Funciones', icon: Sparkles },
  { id: 'regulation', label: 'Normativa', icon: BookOpen },
  { id: 'security', label: 'Seguridad', icon: Shield },
  { id: 'case-study', label: 'Casos de Éxito', icon: TrendingUp },
  { id: 'tip', label: 'Consejos', icon: Zap },
];

const PRIORITY_CONFIG = {
  critical: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', label: 'Crítico' },
  high: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300', label: 'Alta' },
  medium: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', label: 'Media' },
  low: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', label: 'Baja' },
};

const CATEGORY_CONFIG = {
  'new-connector': { icon: Package, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900' },
  'feature': { icon: Sparkles, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900' },
  'regulation': { icon: BookOpen, color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900' },
  'security': { icon: Shield, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900' },
  'case-study': { icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900' },
  'tip': { icon: Zap, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900' },
};

// Mock news data
const MOCK_NEWS: NewsItem[] = [
  {
    id: '1',
    title: 'Nuevo Conector: Sage 200cloud con API REST Nativa',
    summary: 'Hemos lanzado el nuevo conector para Sage 200cloud con soporte completo de API REST, permitiendo migraciones en tiempo real y sincronización bidireccional.',
    content: `# Nuevo Conector Sage 200cloud

Nos complace anunciar el lanzamiento del conector Sage 200cloud con capacidades avanzadas de API REST.

## Características Principales

- **Sincronización en tiempo real**: Los cambios se reflejan instantáneamente
- **Bidireccionalidad**: Migra datos en ambas direcciones
- **Soporte multi-empresa**: Gestiona varias empresas simultáneamente
- **Validación automática**: Verifica la integridad de datos antes de migrar

## Entidades Soportadas

- Plan de cuentas completo
- Asientos contables
- Maestro de terceros
- Cartera de efectos
- Activos fijos

## Cómo Empezar

1. Ve al panel de Migración ERP
2. Selecciona Sage 200cloud como sistema origen
3. Introduce las credenciales de API
4. ¡Comienza a migrar!`,
    category: 'new-connector',
    priority: 'high',
    publishedAt: '2024-02-15T10:00:00Z',
    author: 'Equipo de Integraciones',
    tags: ['sage', 'api', 'cloud', 'nuevo'],
    readTime: 3,
    views: 1250,
    likes: 89,
    isNew: true,
    isRead: false,
  },
  {
    id: '2',
    title: 'Obligatoriedad Factura Electrónica 2026: Prepara tu Migración',
    summary: 'La Ley Crea y Crece establece la obligatoriedad de factura electrónica. Te explicamos cómo preparar tus datos históricos para cumplir con la normativa.',
    content: `# Factura Electrónica Obligatoria 2026

## Marco Legal

La Ley Crea y Crece (Ley 18/2022) establece la obligatoriedad de facturación electrónica B2B para todas las empresas y autónomos.

## Fechas Clave

- **2025**: Empresas > 8 millones de facturación
- **2026**: Resto de empresas y autónomos

## Preparación para la Migración

1. **Auditoría de datos históricos**
   - Revisar facturas de los últimos 4 años
   - Verificar datos fiscales de clientes

2. **Formato de exportación**
   - Facturae 3.2.2
   - Incluir firma electrónica

3. **Validación**
   - Comprobar NIF/CIF válidos
   - Verificar formato de fechas

## Cómo te ayudamos

Nuestro módulo de migración incluye:
- Conversión automática a Facturae
- Validación de datos fiscales
- Generación de firma electrónica`,
    category: 'regulation',
    priority: 'critical',
    publishedAt: '2024-02-10T08:00:00Z',
    author: 'Departamento Legal',
    tags: ['factura-e', 'normativa', '2026', 'obligatorio'],
    readTime: 5,
    views: 3420,
    likes: 156,
    isNew: true,
    isRead: false,
  },
  {
    id: '3',
    title: 'Mejora: Detección Automática de Sistema Origen con IA',
    summary: 'Nueva funcionalidad que utiliza inteligencia artificial para detectar automáticamente el sistema ERP de origen a partir de los ficheros exportados.',
    content: `# Detección Automática con IA

## Cómo Funciona

Nuestro nuevo sistema de IA analiza los archivos que subes y detecta automáticamente:

- Sistema ERP de origen
- Versión del software
- Formato de plan de cuentas
- Estructura de datos

## Sistemas Detectables

- ContaPlus (todas las versiones)
- Sage 50/200
- A3 Asesor
- Holded
- Odoo
- Y más de 20 sistemas adicionales

## Ventajas

- **Ahorro de tiempo**: No necesitas saber el formato exacto
- **Menos errores**: La IA configura el mapeo óptimo
- **Más confianza**: Validación previa antes de migrar`,
    category: 'feature',
    priority: 'medium',
    publishedAt: '2024-02-08T14:00:00Z',
    author: 'Equipo de IA',
    tags: ['ia', 'detección', 'automático', 'mejora'],
    readTime: 2,
    views: 890,
    likes: 67,
    isNew: false,
    isRead: true,
  },
  {
    id: '4',
    title: 'Caso de Éxito: Migración de 50 Empresas en un Grupo Corporativo',
    summary: 'Descubre cómo Grupo Empresarial XYZ migró 50 empresas desde diferentes sistemas ERP a ObelixIA en solo 2 semanas.',
    content: `# Caso de Éxito: Grupo Empresarial XYZ

## El Reto

Grupo XYZ necesitaba consolidar 50 empresas que usaban diferentes sistemas:
- 20 empresas en ContaPlus
- 15 empresas en Sage 50
- 10 empresas en A3 Asesor
- 5 empresas en sistemas propietarios

## La Solución

Utilizando el módulo de Migración ERP de ObelixIA:

1. **Análisis previo**: 3 días para mapear todos los sistemas
2. **Configuración**: 2 días para crear plantillas de migración
3. **Ejecución**: 5 días para migrar todas las empresas
4. **Validación**: 4 días para verificar y ajustar

## Resultados

- **50 empresas** migradas exitosamente
- **0 errores** en cuadre contable
- **99.8%** de datos migrados automáticamente
- **ROI positivo** en el primer trimestre

## Testimonio

> "El proceso fue increíblemente fluido. Lo que esperábamos que tardara meses se completó en semanas."
> 
> — Director Financiero, Grupo XYZ`,
    category: 'case-study',
    priority: 'low',
    publishedAt: '2024-02-05T09:00:00Z',
    author: 'Marketing',
    tags: ['caso-exito', 'grupo', 'multi-empresa', 'consolidación'],
    readTime: 4,
    views: 567,
    likes: 45,
    isNew: false,
    isRead: true,
  },
  {
    id: '5',
    title: 'Actualización de Seguridad: Cifrado End-to-End para Migraciones',
    summary: 'Hemos implementado cifrado end-to-end para todos los datos durante el proceso de migración, cumpliendo con los más altos estándares de seguridad.',
    content: `# Cifrado End-to-End

## Nueva Implementación

A partir de hoy, todas las migraciones utilizan cifrado AES-256 end-to-end.

## Características

- Cifrado en tránsito (TLS 1.3)
- Cifrado en reposo (AES-256)
- Claves rotativas cada 24 horas
- Sin acceso a datos por parte de terceros

## Cumplimiento

- GDPR / RGPD
- DORA
- NIS2
- ISO 27001`,
    category: 'security',
    priority: 'high',
    publishedAt: '2024-02-01T11:00:00Z',
    author: 'Equipo de Seguridad',
    tags: ['seguridad', 'cifrado', 'gdpr', 'cumplimiento'],
    readTime: 2,
    views: 1120,
    likes: 78,
    isNew: false,
    isRead: false,
  },
  {
    id: '6',
    title: 'Consejo: Optimiza tus Migraciones con Validación Previa',
    summary: 'Aprende a usar la función de validación previa para detectar y corregir errores antes de ejecutar la migración completa.',
    content: `# Validación Previa: Tu Mejor Aliado

## Por qué Validar Antes

La validación previa te permite:
- Detectar errores de formato
- Identificar datos faltantes
- Ver asientos descuadrados
- Corregir antes de migrar

## Cómo Hacerlo

1. Sube tus archivos
2. Haz clic en "Validar"
3. Revisa el informe
4. Corrige los errores
5. Vuelve a validar
6. Ejecuta la migración

## Errores Comunes

- NIFs mal formateados
- Fechas en formato incorrecto
- Cuentas sin mapear
- Asientos sin contrapartida`,
    category: 'tip',
    priority: 'low',
    publishedAt: '2024-01-28T15:00:00Z',
    author: 'Soporte Técnico',
    tags: ['consejo', 'validación', 'optimización', 'errores'],
    readTime: 3,
    views: 445,
    likes: 34,
    isNew: false,
    isRead: true,
  },
];

export function ERPNewsPanel({ sessionId }: ERPNewsPanelProps) {
  const [news, setNews] = useState<NewsItem[]>(MOCK_NEWS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const filteredNews = news.filter((item) => 
    selectedCategory === 'all' || item.category === selectedCategory
  );

  const unreadCount = news.filter(n => !n.isRead && n.isNew).length;

  const handleOpenNews = useCallback((item: NewsItem) => {
    setSelectedNews(item);
    setIsDetailOpen(true);
    // Mark as read
    setNews(prev => prev.map(n => 
      n.id === item.id ? { ...n, isRead: true, views: n.views + 1 } : n
    ));
  }, []);

  const handleLike = useCallback((newsId: string) => {
    setNews(prev => prev.map(n => 
      n.id === newsId ? { ...n, likes: n.likes + 1 } : n
    ));
  }, []);

  const getCategoryConfig = (category: string) => {
    return CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.feature;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border-emerald-200 dark:border-emerald-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                <Newspaper className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Noticias y Actualizaciones
                  {unreadCount > 0 && (
                    <Badge className="bg-red-500 text-white">{unreadCount} nuevas</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Conectores, funciones, normativa y consejos
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Bell className="h-4 w-4" />
              Suscribirse
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-background/50">
              <div className="text-2xl font-bold text-primary">{news.length}</div>
              <div className="text-xs text-muted-foreground">Noticias</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <div className="text-2xl font-bold text-red-600">{unreadCount}</div>
              <div className="text-xs text-muted-foreground">Sin Leer</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <div className="text-2xl font-bold text-green-600">
                {news.filter(n => n.category === 'new-connector').length}
              </div>
              <div className="text-xs text-muted-foreground">Conectores</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <div className="text-2xl font-bold text-purple-600">
                {news.filter(n => n.category === 'feature').length}
              </div>
              <div className="text-xs text-muted-foreground">Funciones</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          {NEWS_CATEGORIES.map((cat) => {
            const IconComponent = cat.icon;
            const count = cat.id === 'all' 
              ? news.length 
              : news.filter(n => n.category === cat.id).length;
            return (
              <TabsTrigger 
                key={cat.id} 
                value={cat.id}
                className="text-xs gap-1"
              >
                <IconComponent className="h-3 w-3" />
                {cat.label}
                <Badge variant="secondary" className="text-xs ml-1">{count}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-4">
          {/* Featured News */}
          {filteredNews.filter(n => n.priority === 'critical' || n.priority === 'high').length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Destacados
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {filteredNews
                  .filter(n => n.priority === 'critical' || n.priority === 'high')
                  .slice(0, 2)
                  .map((item) => {
                    const catConfig = getCategoryConfig(item.category);
                    const CatIcon = catConfig.icon;
                    return (
                      <Card 
                        key={item.id} 
                        className={cn(
                          "cursor-pointer hover:shadow-lg transition-all",
                          item.isNew && !item.isRead && "ring-2 ring-primary"
                        )}
                        onClick={() => handleOpenNews(item)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={cn("p-2 rounded-lg", catConfig.bgColor)}>
                              <CatIcon className={cn("h-5 w-5", catConfig.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {item.isNew && !item.isRead && (
                                  <Badge className="bg-primary text-primary-foreground text-xs">Nuevo</Badge>
                                )}
                                <Badge className={cn("text-xs", PRIORITY_CONFIG[item.priority].color)}>
                                  {PRIORITY_CONFIG[item.priority].label}
                                </Badge>
                              </div>
                              <h4 className="font-semibold line-clamp-2">{item.title}</h4>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {item.summary}
                              </p>
                              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {item.readTime} min
                                </span>
                                <span className="flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  {item.views}
                                </span>
                                <span className="flex items-center gap-1">
                                  <ThumbsUp className="h-3 w-3" />
                                  {item.likes}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}

          {/* All News List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Todas las Noticias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {filteredNews.map((item) => {
                    const catConfig = getCategoryConfig(item.category);
                    const CatIcon = catConfig.icon;
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer",
                          item.isNew && !item.isRead && "border-primary"
                        )}
                        onClick={() => handleOpenNews(item)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn("p-2 rounded-lg flex-shrink-0", catConfig.bgColor)}>
                            <CatIcon className={cn("h-4 w-4", catConfig.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {item.isNew && !item.isRead && (
                                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                              )}
                              <h4 className="font-medium text-sm truncate">{item.title}</h4>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {item.summary}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {NEWS_CATEGORIES.find(c => c.id === item.category)?.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(item.publishedAt), { 
                                  addSuffix: true, 
                                  locale: es 
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {item.views}
                            </span>
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" />
                              {item.likes}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredNews.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No hay noticias en esta categoría</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* News Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedNews && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={cn("text-xs", PRIORITY_CONFIG[selectedNews.priority].color)}>
                    {PRIORITY_CONFIG[selectedNews.priority].label}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {NEWS_CATEGORIES.find(c => c.id === selectedNews.category)?.label}
                  </Badge>
                </div>
                <DialogTitle>{selectedNews.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(selectedNews.publishedAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {selectedNews.readTime} min lectura
                  </span>
                  {selectedNews.author && (
                    <span>Por: {selectedNews.author}</span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <Separator className="my-4" />
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {selectedNews.content}
                </pre>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {selectedNews.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {selectedNews.views} vistas
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1"
                    onClick={() => handleLike(selectedNews.id)}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    {selectedNews.likes}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Share2 className="h-4 w-4" />
                    Compartir
                  </Button>
                  {selectedNews.externalLink && (
                    <Button variant="outline" size="sm" className="gap-1" asChild>
                      <a href={selectedNews.externalLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Ver más
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ERPNewsPanel;
