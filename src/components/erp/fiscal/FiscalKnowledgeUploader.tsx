/**
 * FiscalKnowledgeUploader - Componente para subir documentación fiscal como base de conocimiento
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Upload,
  FileText,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle,
  Link as LinkIcon,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  knowledge_type: string;
  source_url?: string;
  tags?: string[];
  created_at: string;
}

interface FiscalKnowledgeUploaderProps {
  jurisdictionId?: string;
  className?: string;
  onKnowledgeAdded?: () => void;
}

const KNOWLEDGE_TYPES = [
  { value: 'regulation', label: 'Regulación/Normativa' },
  { value: 'law', label: 'Ley' },
  { value: 'directive', label: 'Directiva EU' },
  { value: 'circular', label: 'Circular/Consulta' },
  { value: 'form_template', label: 'Plantilla Formulario' },
  { value: 'deadline_rule', label: 'Regla de Plazos' },
  { value: 'news', label: 'Noticia Relevante' },
  { value: 'custom', label: 'Documentación Personalizada' }
];

export function FiscalKnowledgeUploader({ 
  jurisdictionId, 
  className,
  onKnowledgeAdded 
}: FiscalKnowledgeUploaderProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    knowledge_type: 'regulation',
    source_url: '',
    tags: ''
  });

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('erp_fiscal_knowledge_base')
        .select('id, title, content, knowledge_type, source_url, tags, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (jurisdictionId) {
        query = query.eq('jurisdiction_id', jurisdictionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDocuments((data || []) as KnowledgeDocument[]);
    } catch (error) {
      console.error('Error fetching knowledge:', error);
    } finally {
      setLoading(false);
    }
  }, [jurisdictionId]);

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Título y contenido son obligatorios');
      return;
    }

    setUploading(true);
    try {
      const tagsArray = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const { error } = await supabase
        .from('erp_fiscal_knowledge_base')
        .insert({
          jurisdiction_id: jurisdictionId || null,
          knowledge_type: formData.knowledge_type,
          title: formData.title,
          content: formData.content,
          source_url: formData.source_url || null,
          tags: tagsArray,
          is_active: true,
          verified_by: user?.id || null
        });

      if (error) throw error;

      toast.success('Conocimiento fiscal añadido correctamente');
      setFormData({ title: '', content: '', knowledge_type: 'regulation', source_url: '', tags: '' });
      setDialogOpen(false);
      fetchDocuments();
      onKnowledgeAdded?.();
    } catch (error) {
      console.error('Error adding knowledge:', error);
      toast.error('Error al añadir conocimiento');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('erp_fiscal_knowledge_base')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      toast.success('Documento eliminado');
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Error al eliminar');
    }
  };

  // Auto-fetch on mount
  useState(() => {
    fetchDocuments();
  });

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Base de Conocimiento Fiscal</CardTitle>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Añadir
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Añadir Conocimiento Fiscal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Tipo de Conocimiento</Label>
                  <Select 
                    value={formData.knowledge_type} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, knowledge_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KNOWLEDGE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input 
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ej: Modelo 303 - Requisitos presentación"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Contenido *</Label>
                  <Textarea 
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Contenido del documento, normativa, instrucciones..."
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label>URL Fuente (opcional)</Label>
                  <Input 
                    value={formData.source_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, source_url: e.target.value }))}
                    placeholder="https://boe.es/..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Etiquetas (separadas por coma)</Label>
                  <Input 
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="IVA, Modelo 303, trimestral"
                  />
                </div>

                <Button onClick={handleSubmit} disabled={uploading} className="w-full">
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Guardar Conocimiento
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[300px] px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Sin documentos en la base de conocimiento
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Añade normativas, leyes o documentación fiscal
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div 
                  key={doc.id}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">
                          {KNOWLEDGE_TYPES.find(t => t.value === doc.knowledge_type)?.label || doc.knowledge_type}
                        </Badge>
                        {doc.source_url && (
                          <a 
                            href={doc.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <p className="font-medium text-sm truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {doc.content.substring(0, 100)}...
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {doc.tags?.slice(0, 3).map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true, locale: es })}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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

export default FiscalKnowledgeUploader;
