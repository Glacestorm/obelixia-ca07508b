/**
 * LegalKnowledgeUploader - Carga de documentos jurídicos con categorización automática
 * Fase 7: Base de Conocimiento Jurídico Enterprise
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Upload, 
  FileText, 
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Tag,
  Calendar,
  Globe,
  Scale,
  Plus,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LegalKnowledgeUploaderProps {
  companyId: string;
  onUploadComplete?: () => void;
}

interface UploadedDocument {
  id: string;
  title: string;
  content: string;
  status: 'pending' | 'processing' | 'categorized' | 'error';
  autoCategories?: {
    knowledge_type: string;
    jurisdiction: string;
    legal_area: string;
    tags: string[];
    effective_date?: string;
    confidence: number;
  };
  error?: string;
}

const KNOWLEDGE_TYPES = [
  { value: 'law', label: 'Legislación', icon: '📜' },
  { value: 'regulation', label: 'Reglamento', icon: '📋' },
  { value: 'precedent', label: 'Jurisprudencia', icon: '⚖️' },
  { value: 'doctrine', label: 'Doctrina', icon: '📚' },
  { value: 'template', label: 'Plantilla', icon: '📝' },
  { value: 'circular', label: 'Circular', icon: '📨' },
  { value: 'convention', label: 'Convenio', icon: '🤝' },
  { value: 'treaty', label: 'Tratado', icon: '🌍' },
];

const JURISDICTIONS = [
  { value: 'AD', label: 'Andorra', flag: '🇦🇩' },
  { value: 'ES', label: 'España', flag: '🇪🇸' },
  { value: 'EU', label: 'Unión Europea', flag: '🇪🇺' },
  { value: 'UK', label: 'Reino Unido', flag: '🇬🇧' },
  { value: 'AE', label: 'Emiratos Árabes', flag: '🇦🇪' },
  { value: 'US', label: 'Estados Unidos', flag: '🇺🇸' },
  { value: 'INT', label: 'Internacional', flag: '🌍' },
];

const LEGAL_AREAS = [
  { value: 'labor', label: 'Laboral' },
  { value: 'corporate', label: 'Mercantil' },
  { value: 'tax', label: 'Fiscal' },
  { value: 'data_protection', label: 'Protección de Datos' },
  { value: 'banking', label: 'Bancario/Financiero' },
  { value: 'contract', label: 'Contractual' },
  { value: 'administrative', label: 'Administrativo' },
  { value: 'criminal', label: 'Penal' },
  { value: 'civil', label: 'Civil' },
  { value: 'intellectual_property', label: 'Propiedad Intelectual' },
];

export function LegalKnowledgeUploader({ companyId, onUploadComplete }: LegalKnowledgeUploaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // Form state for manual entry
  const [manualMode, setManualMode] = useState(false);
  const [manualForm, setManualForm] = useState({
    title: '',
    content: '',
    knowledge_type: '',
    jurisdiction: '',
    legal_area: '',
    reference_code: '',
    source_name: '',
    source_url: '',
    effective_date: '',
    tags: [] as string[],
  });
  const [newTag, setNewTag] = useState('');

  // Handle file drop/select
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newDocs: UploadedDocument[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const text = await file.text();
      
      newDocs.push({
        id: `${Date.now()}-${i}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        content: text,
        status: 'pending',
      });
    }

    setDocuments(prev => [...prev, ...newDocs]);
  }, []);

  // Auto-categorize documents using AI
  const categorizeDocuments = useCallback(async () => {
    if (documents.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress(0);

    const pendingDocs = documents.filter(d => d.status === 'pending');
    
    for (let i = 0; i < pendingDocs.length; i++) {
      const doc = pendingDocs[i];
      
      setDocuments(prev => prev.map(d => 
        d.id === doc.id ? { ...d, status: 'processing' as const } : d
      ));

      try {
        const { data, error } = await supabase.functions.invoke('legal-ai-advisor', {
          body: {
            action: 'categorize_document',
            context: {
              companyId,
              title: doc.title,
              content: doc.content.substring(0, 10000), // Limit for API
            }
          }
        });

        if (error) throw error;

        if (data?.success && data?.data) {
          setDocuments(prev => prev.map(d => 
            d.id === doc.id ? { 
              ...d, 
              status: 'categorized' as const,
              autoCategories: data.data
            } : d
          ));
        } else {
          throw new Error('Invalid response from categorization');
        }
      } catch (err) {
        console.error('Error categorizing document:', err);
        setDocuments(prev => prev.map(d => 
          d.id === doc.id ? { 
            ...d, 
            status: 'error' as const,
            error: err instanceof Error ? err.message : 'Error desconocido'
          } : d
        ));
      }

      setProcessingProgress(((i + 1) / pendingDocs.length) * 100);
    }

    setIsProcessing(false);
  }, [documents, companyId]);

  // Save categorized documents to database
  const saveDocuments = useCallback(async () => {
    const categorizedDocs = documents.filter(d => d.status === 'categorized' && d.autoCategories);
    
    if (categorizedDocs.length === 0) {
      toast.error('No hay documentos categorizados para guardar');
      return;
    }

    try {
      for (const doc of categorizedDocs) {
        const { error } = await supabase
          .from('legal_knowledge_base')
          .insert({
            title: doc.title,
            content: doc.content,
            knowledge_type: doc.autoCategories!.knowledge_type,
            jurisdiction_code: doc.autoCategories!.jurisdiction,
            legal_area: doc.autoCategories!.legal_area,
            tags: doc.autoCategories!.tags,
            effective_date: doc.autoCategories!.effective_date,
            is_active: true,
            is_verified: false,
          });

        if (error) throw error;
      }

      toast.success(`${categorizedDocs.length} documentos guardados correctamente`);
      setDocuments([]);
      onUploadComplete?.();
      setIsOpen(false);
    } catch (err) {
      console.error('Error saving documents:', err);
      toast.error('Error al guardar los documentos');
    }
  }, [documents, onUploadComplete]);

  // Manual form submit
  const handleManualSubmit = useCallback(async () => {
    if (!manualForm.title || !manualForm.content || !manualForm.knowledge_type || 
        !manualForm.jurisdiction || !manualForm.legal_area) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    try {
      const { error } = await supabase
        .from('legal_knowledge_base')
        .insert({
          title: manualForm.title,
          content: manualForm.content,
          knowledge_type: manualForm.knowledge_type,
          jurisdiction_code: manualForm.jurisdiction,
          legal_area: manualForm.legal_area,
          reference_code: manualForm.reference_code || null,
          source_name: manualForm.source_name || null,
          source_url: manualForm.source_url || null,
          effective_date: manualForm.effective_date || null,
          tags: manualForm.tags,
          is_active: true,
          is_verified: false,
        });

      if (error) throw error;

      toast.success('Conocimiento añadido correctamente');
      setManualForm({
        title: '',
        content: '',
        knowledge_type: '',
        jurisdiction: '',
        legal_area: '',
        reference_code: '',
        source_name: '',
        source_url: '',
        effective_date: '',
        tags: [],
      });
      onUploadComplete?.();
      setIsOpen(false);
    } catch (err) {
      console.error('Error adding knowledge:', err);
      toast.error('Error al añadir conocimiento');
    }
  }, [manualForm, onUploadComplete]);

  const addTag = () => {
    if (newTag && !manualForm.tags.includes(newTag)) {
      setManualForm(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setManualForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Subir Documento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Añadir Conocimiento Jurídico
          </DialogTitle>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="flex gap-2 border-b pb-3">
          <Button 
            variant={!manualMode ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setManualMode(false)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Subir Archivos
          </Button>
          <Button 
            variant={manualMode ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setManualMode(true)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Entrada Manual
          </Button>
        </div>

        {!manualMode ? (
          /* File Upload Mode */
          <div className="flex-1 overflow-auto space-y-4">
            {/* Drop Zone */}
            <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
              <CardContent className="py-8">
                <label className="flex flex-col items-center justify-center cursor-pointer">
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Arrastra archivos o haz clic para seleccionar
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Soportados: .txt, .md, .pdf (texto), .docx
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".txt,.md,.pdf,.docx"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              </CardContent>
            </Card>

            {/* Document List */}
            {documents.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      Documentos ({documents.length})
                    </CardTitle>
                    <Button 
                      size="sm" 
                      onClick={categorizeDocuments}
                      disabled={isProcessing || documents.every(d => d.status !== 'pending')}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Categorizar con IA
                    </Button>
                  </div>
                  {isProcessing && (
                    <Progress value={processingProgress} className="h-1 mt-2" />
                  )}
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div 
                          key={doc.id}
                          className={cn(
                            "p-3 rounded-lg border",
                            doc.status === 'categorized' && "bg-green-500/5 border-green-500/20",
                            doc.status === 'processing' && "bg-blue-500/5 border-blue-500/20",
                            doc.status === 'error' && "bg-red-500/5 border-red-500/20"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-sm">{doc.title}</span>
                                {doc.status === 'processing' && (
                                  <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                                )}
                                {doc.status === 'categorized' && (
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                )}
                                {doc.status === 'error' && (
                                  <AlertCircle className="h-3 w-3 text-red-500" />
                                )}
                              </div>
                              
                              {doc.autoCategories && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {JURISDICTIONS.find(j => j.value === doc.autoCategories?.jurisdiction)?.flag}{' '}
                                    {doc.autoCategories.jurisdiction}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {doc.autoCategories.knowledge_type}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {doc.autoCategories.legal_area}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs text-muted-foreground">
                                    {Math.round(doc.autoCategories.confidence)}% confianza
                                  </Badge>
                                </div>
                              )}
                              
                              {doc.error && (
                                <p className="text-xs text-red-500 mt-1">{doc.error}</p>
                              )}
                            </div>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6"
                              onClick={() => removeDocument(doc.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Save Button */}
            {documents.some(d => d.status === 'categorized') && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDocuments([])}>
                  Limpiar
                </Button>
                <Button onClick={saveDocuments}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Guardar {documents.filter(d => d.status === 'categorized').length} documentos
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Manual Entry Mode */
          <ScrollArea className="flex-1">
            <div className="space-y-4 pr-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="Ej: Reglamento General de Protección de Datos"
                  value={manualForm.title}
                  onChange={(e) => setManualForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              {/* Type, Jurisdiction, Area */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select 
                    value={manualForm.knowledge_type}
                    onValueChange={(v) => setManualForm(prev => ({ ...prev, knowledge_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {KNOWLEDGE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Jurisdicción *</Label>
                  <Select 
                    value={manualForm.jurisdiction}
                    onValueChange={(v) => setManualForm(prev => ({ ...prev, jurisdiction: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {JURISDICTIONS.map(j => (
                        <SelectItem key={j.value} value={j.value}>
                          {j.flag} {j.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Área Legal *</Label>
                  <Select 
                    value={manualForm.legal_area}
                    onValueChange={(v) => setManualForm(prev => ({ ...prev, legal_area: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {LEGAL_AREAS.map(area => (
                        <SelectItem key={area.value} value={area.value}>
                          {area.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Reference, Source, Date */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="reference">Código/Referencia</Label>
                  <Input
                    id="reference"
                    placeholder="Ej: RGPD 2016/679"
                    value={manualForm.reference_code}
                    onChange={(e) => setManualForm(prev => ({ ...prev, reference_code: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="source">Fuente</Label>
                  <Input
                    id="source"
                    placeholder="Ej: DOUE, BOE, BOPA"
                    value={manualForm.source_name}
                    onChange={(e) => setManualForm(prev => ({ ...prev, source_name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="effective_date">Fecha Vigencia</Label>
                  <Input
                    id="effective_date"
                    type="date"
                    value={manualForm.effective_date}
                    onChange={(e) => setManualForm(prev => ({ ...prev, effective_date: e.target.value }))}
                  />
                </div>
              </div>

              {/* Source URL */}
              <div className="space-y-2">
                <Label htmlFor="source_url">URL Fuente</Label>
                <Input
                  id="source_url"
                  type="url"
                  placeholder="https://..."
                  value={manualForm.source_url}
                  onChange={(e) => setManualForm(prev => ({ ...prev, source_url: e.target.value }))}
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Etiquetas</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Añadir etiqueta..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {manualForm.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {manualForm.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Contenido *</Label>
                <Textarea
                  id="content"
                  placeholder="Pega aquí el contenido del documento legal..."
                  rows={10}
                  value={manualForm.content}
                  onChange={(e) => setManualForm(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleManualSubmit}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Guardar Conocimiento
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default LegalKnowledgeUploader;
