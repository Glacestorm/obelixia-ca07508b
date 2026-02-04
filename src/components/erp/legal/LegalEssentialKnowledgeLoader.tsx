/**
 * LegalEssentialKnowledgeLoader
 * Componente para cargar el contenido jurídico esencial en la base de conocimiento
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  BookOpen, 
  Database, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Scale,
  FileText,
  Globe
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  KNOWLEDGE_CATEGORIES, 
  ALL_ESSENTIAL_KNOWLEDGE,
  type EssentialKnowledgeItem 
} from '@/data/legal/essentialKnowledgeBase';

interface LegalEssentialKnowledgeLoaderProps {
  onLoadComplete?: () => void;
}

interface CategoryInfo {
  key: keyof typeof KNOWLEDGE_CATEGORIES;
  label: string;
  icon: React.ReactNode;
  count: number;
  description: string;
}

export function LegalEssentialKnowledgeLoader({ onLoadComplete }: LegalEssentialKnowledgeLoaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(['SPANISH', 'ANDORRAN', 'EUROPEAN', 'PROCUREMENT'])
  );
  const [results, setResults] = useState<{ success: number; errors: number }>({ success: 0, errors: 0 });

  const categories: CategoryInfo[] = [
    {
      key: 'SPANISH',
      label: 'Legislación Española',
      icon: <Scale className="h-4 w-4" />,
      count: KNOWLEDGE_CATEGORIES.SPANISH.length,
      description: 'Estatuto Trabajadores, LGT, LIVA, LOPDGDD, Código Comercio...'
    },
    {
      key: 'ANDORRAN',
      label: 'Legislación Andorrana',
      icon: <FileText className="h-4 w-4" />,
      count: KNOWLEDGE_CATEGORIES.ANDORRAN.length,
      description: 'APDA, IGI y normativa del Principado'
    },
    {
      key: 'EUROPEAN',
      label: 'Normativa Europea',
      icon: <Globe className="h-4 w-4" />,
      count: KNOWLEDGE_CATEGORIES.EUROPEAN.length,
      description: 'RGPD, DORA, NIS2, AI Act...'
    },
    {
      key: 'PROCUREMENT',
      label: 'Compras y Contratación',
      icon: <BookOpen className="h-4 w-4" />,
      count: KNOWLEDGE_CATEGORIES.PROCUREMENT.length,
      description: 'Ley 15/2010, LCSP, Incoterms, IVA intracomunitario...'
    }
  ];

  const toggleCategory = (key: string) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const getSelectedItems = useCallback((): EssentialKnowledgeItem[] => {
    const items: EssentialKnowledgeItem[] = [];
    selectedCategories.forEach(key => {
      const category = KNOWLEDGE_CATEGORIES[key as keyof typeof KNOWLEDGE_CATEGORIES];
      if (category) {
        items.push(...category);
      }
    });
    return items;
  }, [selectedCategories]);

  const handleLoadKnowledge = useCallback(async () => {
    const items = getSelectedItems();
    if (items.length === 0) {
      toast.error('Selecciona al menos una categoría');
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setLoadedCount(0);
    setResults({ success: 0, errors: 0 });

    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        try {
          // Verificar si ya existe
          const { data: existing } = await supabase
            .from('legal_knowledge_base')
            .select('id')
            .eq('title', item.title)
            .eq('jurisdiction_code', item.jurisdiction_code)
            .maybeSingle();

          if (existing) {
            // Actualizar existente
            const { error } = await supabase
              .from('legal_knowledge_base')
              .update({
                content: item.content,
                summary: item.summary,
                legal_area: item.legal_area,
                sub_area: item.sub_area,
                reference_code: item.reference_code,
                effective_date: item.effective_date,
                source_url: item.source_url,
                source_name: item.source_name,
                tags: item.tags,
                keywords: item.keywords,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);

            if (error) throw error;
          } else {
            // Insertar nuevo
            const { error } = await supabase
              .from('legal_knowledge_base')
              .insert([{
                title: item.title,
                content: item.content,
                summary: item.summary,
                knowledge_type: item.knowledge_type,
                jurisdiction_code: item.jurisdiction_code,
                legal_area: item.legal_area,
                sub_area: item.sub_area,
                reference_code: item.reference_code,
                effective_date: item.effective_date,
                source_url: item.source_url,
                source_name: item.source_name,
                tags: item.tags,
                keywords: item.keywords,
                is_active: true,
                is_verified: true,
                view_count: 0,
                helpful_count: 0
              }]);

            if (error) throw error;
          }

          successCount++;
        } catch (err) {
          console.error(`Error loading ${item.title}:`, err);
          errorCount++;
        }

        setLoadedCount(i + 1);
        setProgress(((i + 1) / items.length) * 100);
        setResults({ success: successCount, errors: errorCount });
      }

      if (errorCount === 0) {
        toast.success(`${successCount} documentos cargados correctamente`);
      } else {
        toast.warning(`${successCount} cargados, ${errorCount} errores`);
      }

      onLoadComplete?.();
    } catch (error) {
      console.error('Error loading knowledge:', error);
      toast.error('Error al cargar la base de conocimiento');
    } finally {
      setIsLoading(false);
    }
  }, [getSelectedItems, onLoadComplete]);

  const totalSelected = getSelectedItems().length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Database className="h-4 w-4 mr-2" />
          Cargar Base Esencial
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Cargar Base de Conocimiento Esencial
          </DialogTitle>
          <DialogDescription>
            Carga el contenido jurídico fundamental necesario para el funcionamiento del módulo legal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Categorías */}
          <ScrollArea className="h-[280px] pr-4">
            <div className="space-y-3">
              {categories.map((cat) => (
                <div
                  key={cat.key}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    selectedCategories.has(cat.key)
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/30'
                  }`}
                  onClick={() => !isLoading && toggleCategory(cat.key)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedCategories.has(cat.key)}
                      disabled={isLoading}
                      onCheckedChange={() => toggleCategory(cat.key)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 rounded bg-primary/10 text-primary">
                          {cat.icon}
                        </div>
                        <span className="font-medium">{cat.label}</span>
                        <Badge variant="secondary" className="text-xs">
                          {cat.count} docs
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {cat.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Resumen selección */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm">
              <strong>{totalSelected}</strong> documentos seleccionados
            </span>
            <span className="text-xs text-muted-foreground">
              Total disponible: {ALL_ESSENTIAL_KNOWLEDGE.length}
            </span>
          </div>

          {/* Progreso */}
          {isLoading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando documentos...
                </span>
                <span>{loadedCount} / {totalSelected}</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  {results.success} exitosos
                </span>
                {results.errors > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {results.errors} errores
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleLoadKnowledge}
              disabled={isLoading || totalSelected === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cargando...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Cargar {totalSelected} Documentos
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LegalEssentialKnowledgeLoader;
