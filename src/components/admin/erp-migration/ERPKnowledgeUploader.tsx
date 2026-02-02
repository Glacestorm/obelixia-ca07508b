/**
 * ERP Knowledge Uploader Component
 * Gestión de base de conocimiento para migraciones ERP
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  BookOpen,
  Upload,
  FileText,
  Search,
  Plus,
  Trash2,
  Edit,
  Eye,
  Download,
  CheckCircle,
  Clock,
  Tag,
  Folder,
  HelpCircle,
  Lightbulb,
  BookMarked,
  GraduationCap,
  Video,
  Link as LinkIcon,
  Star,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  content: string;
  summary: string;
  tags: string[];
  connectorId?: string;
  articleType: 'guide' | 'faq' | 'tutorial' | 'regulation' | 'troubleshooting';
  difficulty: 'basic' | 'intermediate' | 'advanced';
  views: number;
  helpful: number;
  createdAt: string;
  updatedAt: string;
  author?: string;
  attachments?: { name: string; url: string; type: string }[];
  isVerified: boolean;
}

interface ERPKnowledgeUploaderProps {
  sessionId?: string;
}

const KNOWLEDGE_CATEGORIES = [
  { id: 'migration-guides', label: 'Guías de Migración', icon: BookOpen },
  { id: 'system-exports', label: 'Exportación de Sistemas', icon: Download },
  { id: 'accounting-regulations', label: 'Normativa Contable', icon: BookMarked },
  { id: 'troubleshooting', label: 'Resolución de Problemas', icon: HelpCircle },
  { id: 'best-practices', label: 'Mejores Prácticas', icon: Lightbulb },
  { id: 'video-tutorials', label: 'Tutoriales en Vídeo', icon: Video },
];

const ARTICLE_TYPES = [
  { value: 'guide', label: 'Guía', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'faq', label: 'FAQ', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  { value: 'tutorial', label: 'Tutorial', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  { value: 'regulation', label: 'Normativa', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
  { value: 'troubleshooting', label: 'Troubleshooting', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
];

// Mock data for demo
const MOCK_ARTICLES: KnowledgeArticle[] = [
  {
    id: '1',
    title: 'Guía Completa de Migración desde ContaPlus',
    category: 'migration-guides',
    subcategory: 'contaplus',
    content: `# Migración desde ContaPlus a ObelixIA

## Preparación
1. Realizar backup completo del sistema ContaPlus
2. Exportar plan de cuentas en formato CSV
3. Exportar asientos del ejercicio a migrar

## Proceso de Exportación
### Paso 1: Acceder a ContaPlus
- Abrir ContaPlus Elite/Profesional
- Ir a Utilidades > Exportación de datos

### Paso 2: Seleccionar datos
- Marcar: Plan de cuentas, Asientos, Clientes, Proveedores
- Formato: CSV con separador punto y coma

## Importación en ObelixIA
1. Subir los ficheros exportados
2. Validar el mapeo automático
3. Revisar asientos descuadrados
4. Ejecutar migración

## Verificación Post-Migración
- Comprobar saldos de apertura
- Verificar IVA repercutido/soportado
- Conciliar con última declaración presentada`,
    summary: 'Guía paso a paso para migrar datos contables desde ContaPlus a ObelixIA ERP',
    tags: ['contaplus', 'migración', 'pgc', 'españa'],
    connectorId: 'contaplus',
    articleType: 'guide',
    difficulty: 'intermediate',
    views: 1250,
    helpful: 98,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-02-01T14:30:00Z',
    author: 'Equipo ObelixIA',
    isVerified: true,
  },
  {
    id: '2',
    title: 'PGC 2007: Estructura y Grupos de Cuentas',
    category: 'accounting-regulations',
    content: `# Plan General de Contabilidad 2007

## Grupos de Cuentas

### Grupo 1 - Financiación Básica
Comprende el patrimonio neto y la financiación ajena a largo plazo.

### Grupo 2 - Inmovilizado
Elementos del activo destinados a servir de forma duradera.

### Grupo 3 - Existencias
Mercaderías, materias primas, productos en curso.

### Grupo 4 - Acreedores y Deudores
Cuentas personales y efectos comerciales.

### Grupo 5 - Cuentas Financieras
Deudas y créditos por operaciones de tráfico.

### Grupo 6 - Compras y Gastos
Aprovisionamientos y gastos de explotación.

### Grupo 7 - Ventas e Ingresos
Enajenación de bienes y prestación de servicios.

### Grupos 8 y 9 - Gastos e Ingresos en Patrimonio Neto
Subvenciones, diferencias de conversión.`,
    summary: 'Referencia completa de la estructura del PGC 2007 para migraciones',
    tags: ['pgc', 'normativa', 'españa', 'contabilidad'],
    articleType: 'regulation',
    difficulty: 'basic',
    views: 890,
    helpful: 145,
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-10T09:00:00Z',
    author: 'Equipo ObelixIA',
    isVerified: true,
  },
  {
    id: '3',
    title: 'Resolución de Errores: Asientos Descuadrados',
    category: 'troubleshooting',
    content: `# Cómo resolver asientos descuadrados en migración

## Causas Comunes
1. **Redondeo de decimales**: Diferencias de céntimos por conversión
2. **Cuentas no mapeadas**: El sistema origen usa cuentas que no existen en destino
3. **Errores en origen**: Los datos originales ya estaban descuadrados

## Soluciones

### Para errores de redondeo
- Configurar cuenta de ajuste automático (cuenta 679/779)
- Establecer tolerancia máxima (ej: 0.05€)

### Para cuentas no mapeadas
- Revisar el panel de mapeo
- Crear las cuentas faltantes
- O reasignar a cuenta puente

### Para errores en origen
- Identificar asientos problemáticos
- Corregir en sistema origen y re-exportar
- O marcar para ajuste manual post-migración`,
    summary: 'Guía de troubleshooting para resolver asientos que no cuadran durante la migración',
    tags: ['errores', 'asientos', 'descuadre', 'solución'],
    articleType: 'troubleshooting',
    difficulty: 'intermediate',
    views: 567,
    helpful: 89,
    createdAt: '2024-02-05T11:00:00Z',
    updatedAt: '2024-02-10T16:45:00Z',
    author: 'Soporte Técnico',
    isVerified: true,
  },
  {
    id: '4',
    title: 'FAQ: Preguntas Frecuentes sobre Migración ERP',
    category: 'migration-guides',
    content: `# Preguntas Frecuentes

## ¿Cuánto tiempo tarda una migración típica?
Depende del volumen de datos:
- Pequeña empresa (<5 años): 1-2 horas
- Mediana empresa (5-10 años): 4-8 horas
- Gran empresa (>10 años): 1-3 días

## ¿Se pueden migrar varios ejercicios a la vez?
Sí, el sistema permite migración multi-ejercicio. Recomendamos empezar por el ejercicio actual y luego históricos.

## ¿Qué pasa si hay errores durante la migración?
El sistema crea checkpoints automáticos. Puede hacer rollback parcial o completo en cualquier momento.

## ¿Los terceros (clientes/proveedores) se migran automáticamente?
Sí, se migran con sus datos fiscales completos. El sistema detecta duplicados y permite fusionarlos.`,
    summary: 'Respuestas a las preguntas más comunes sobre el proceso de migración',
    tags: ['faq', 'preguntas', 'migración', 'general'],
    articleType: 'faq',
    difficulty: 'basic',
    views: 2340,
    helpful: 312,
    createdAt: '2024-01-01T08:00:00Z',
    updatedAt: '2024-02-15T10:00:00Z',
    author: 'Equipo ObelixIA',
    isVerified: true,
  },
];

export function ERPKnowledgeUploader({ sessionId }: ERPKnowledgeUploaderProps) {
  const [articles, setArticles] = useState<KnowledgeArticle[]>(MOCK_ARTICLES);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Form state for new article
  const [newArticle, setNewArticle] = useState({
    title: '',
    category: '',
    content: '',
    summary: '',
    tags: '',
    articleType: 'guide' as const,
    difficulty: 'basic' as const,
  });

  const filteredArticles = articles.filter((article) => {
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const matchesSearch = 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleUploadDocument = useCallback(async () => {
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setUploadProgress(i);
    }

    const article: KnowledgeArticle = {
      id: `article-${Date.now()}`,
      title: newArticle.title,
      category: newArticle.category,
      content: newArticle.content,
      summary: newArticle.summary,
      tags: newArticle.tags.split(',').map(t => t.trim()).filter(Boolean),
      articleType: newArticle.articleType,
      difficulty: newArticle.difficulty,
      views: 0,
      helpful: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isVerified: false,
    };

    setArticles(prev => [article, ...prev]);
    setIsUploading(false);
    setIsUploadDialogOpen(false);
    setNewArticle({
      title: '',
      category: '',
      content: '',
      summary: '',
      tags: '',
      articleType: 'guide',
      difficulty: 'basic',
    });
    toast.success('Artículo añadido a la base de conocimiento');
  }, [newArticle]);

  const handleDeleteArticle = useCallback((articleId: string) => {
    setArticles(prev => prev.filter(a => a.id !== articleId));
    toast.success('Artículo eliminado');
  }, []);

  const getTypeConfig = (type: string) => {
    return ARTICLE_TYPES.find(t => t.value === type) || ARTICLE_TYPES[0];
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'basic':
        return <Badge variant="outline" className="text-green-600 border-green-600">Básico</Badge>;
      case 'intermediate':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Intermedio</Badge>;
      case 'advanced':
        return <Badge variant="outline" className="text-red-600 border-red-600">Avanzado</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-indigo-200 dark:border-indigo-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Base de Conocimiento ERP</CardTitle>
                <CardDescription>
                  Documentación, guías y tutoriales para migraciones
                </CardDescription>
              </div>
            </div>
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Añadir Artículo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Añadir Nuevo Artículo</DialogTitle>
                  <DialogDescription>
                    Crea contenido para la base de conocimiento de migraciones
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input
                      value={newArticle.title}
                      onChange={(e) => setNewArticle(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Título del artículo..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Categoría</Label>
                      <Select
                        value={newArticle.category}
                        onValueChange={(value) => setNewArticle(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {KNOWLEDGE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={newArticle.articleType}
                        onValueChange={(value: any) => setNewArticle(prev => ({ ...prev, articleType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ARTICLE_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Dificultad</Label>
                    <Select
                      value={newArticle.difficulty}
                      onValueChange={(value: any) => setNewArticle(prev => ({ ...prev, difficulty: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Básico</SelectItem>
                        <SelectItem value="intermediate">Intermedio</SelectItem>
                        <SelectItem value="advanced">Avanzado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Resumen</Label>
                    <Textarea
                      value={newArticle.summary}
                      onChange={(e) => setNewArticle(prev => ({ ...prev, summary: e.target.value }))}
                      placeholder="Breve descripción del artículo..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contenido (Markdown)</Label>
                    <Textarea
                      value={newArticle.content}
                      onChange={(e) => setNewArticle(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="# Título&#10;&#10;Escribe el contenido en formato Markdown..."
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Etiquetas (separadas por coma)</Label>
                    <Input
                      value={newArticle.tags}
                      onChange={(e) => setNewArticle(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="migración, contaplus, pgc..."
                    />
                  </div>
                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Guardando artículo...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleUploadDocument} 
                    disabled={!newArticle.title || !newArticle.category || isUploading}
                  >
                    {isUploading ? 'Guardando...' : 'Guardar Artículo'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-background/50">
              <div className="text-2xl font-bold text-primary">{articles.length}</div>
              <div className="text-xs text-muted-foreground">Artículos</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <div className="text-2xl font-bold text-green-600">
                {articles.filter(a => a.isVerified).length}
              </div>
              <div className="text-xs text-muted-foreground">Verificados</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <div className="text-2xl font-bold text-blue-600">
                {articles.reduce((sum, a) => sum + a.views, 0).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Visualizaciones</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <div className="text-2xl font-bold text-purple-600">
                {KNOWLEDGE_CATEGORIES.length}
              </div>
              <div className="text-xs text-muted-foreground">Categorías</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar artículos, guías, FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {KNOWLEDGE_CATEGORIES.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {KNOWLEDGE_CATEGORIES.map((category) => {
          const IconComponent = category.icon;
          const count = articles.filter(a => a.category === category.id).length;
          return (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              className="h-auto py-3 flex flex-col items-center gap-1"
              onClick={() => setSelectedCategory(
                selectedCategory === category.id ? 'all' : category.id
              )}
            >
              <IconComponent className="h-5 w-5" />
              <span className="text-xs text-center">{category.label}</span>
              <Badge variant="secondary" className="text-xs">{count}</Badge>
            </Button>
          );
        })}
      </div>

      {/* Articles List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Artículos ({filteredArticles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {filteredArticles.map((article) => {
                const typeConfig = getTypeConfig(article.articleType);
                return (
                  <div
                    key={article.id}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{article.title}</h4>
                          {article.isVerified && (
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {article.summary}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={cn('text-xs', typeConfig.color)}>
                            {typeConfig.label}
                          </Badge>
                          {getDifficultyBadge(article.difficulty)}
                          {article.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {article.views}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {article.helpful}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedArticle(article);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteArticle(article.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredArticles.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No se encontraron artículos</p>
                  <p className="text-sm">Intenta con otros términos de búsqueda</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* View Article Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedArticle && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DialogTitle>{selectedArticle.title}</DialogTitle>
                  {selectedArticle.isVerified && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verificado
                    </Badge>
                  )}
                </div>
                <DialogDescription className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(selectedArticle.updatedAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {selectedArticle.views} vistas
                  </span>
                  {selectedArticle.author && (
                    <span>Por: {selectedArticle.author}</span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className={getTypeConfig(selectedArticle.articleType).color}>
                    {getTypeConfig(selectedArticle.articleType).label}
                  </Badge>
                  {getDifficultyBadge(selectedArticle.difficulty)}
                  {selectedArticle.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {selectedArticle.content}
                  </pre>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <div className="flex items-center gap-2 mr-auto">
                  <span className="text-sm text-muted-foreground">¿Te resultó útil?</span>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Star className="h-3 w-3" />
                    Sí ({selectedArticle.helpful})
                  </Button>
                </div>
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Cerrar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ERPKnowledgeUploader;
