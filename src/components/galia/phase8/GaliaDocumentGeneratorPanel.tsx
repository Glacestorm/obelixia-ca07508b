/**
 * GaliaDocumentGeneratorPanel - IA Generativa Documental
 * Auto-generación de memorias, informes FEDER, resoluciones y notificaciones
 */

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  FileText, 
  Sparkles, 
  Download, 
  CheckCircle, 
  Clock,
  FileCheck,
  FileX,
  Bell,
  ScrollText,
  Loader2,
  Eye,
  History,
  Send
} from 'lucide-react';
import { useGaliaDocumentGenerator, DocumentType, GeneratedDocument } from '@/hooks/galia/useGaliaDocumentGenerator';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface GaliaDocumentGeneratorPanelProps {
  expedienteId?: string;
  galId?: string;
  className?: string;
}

const documentTypeConfig: Record<DocumentType, { icon: React.ReactNode; color: string; label: string }> = {
  memoria_anual: { icon: <ScrollText className="h-4 w-4" />, color: 'bg-blue-500', label: 'Memoria Anual' },
  informe_feder: { icon: <FileText className="h-4 w-4" />, color: 'bg-purple-500', label: 'Informe FEDER' },
  resolucion_concesion: { icon: <FileCheck className="h-4 w-4" />, color: 'bg-green-500', label: 'Resolución Concesión' },
  resolucion_denegacion: { icon: <FileX className="h-4 w-4" />, color: 'bg-red-500', label: 'Resolución Denegación' },
  notificacion_requerimiento: { icon: <Bell className="h-4 w-4" />, color: 'bg-amber-500', label: 'Requerimiento' },
  notificacion_subsanacion: { icon: <Bell className="h-4 w-4" />, color: 'bg-orange-500', label: 'Subsanación' },
  certificado_ayuda: { icon: <FileCheck className="h-4 w-4" />, color: 'bg-teal-500', label: 'Certificado' },
  acta_comision: { icon: <ScrollText className="h-4 w-4" />, color: 'bg-indigo-500', label: 'Acta Comisión' },
  informe_justificacion: { icon: <FileText className="h-4 w-4" />, color: 'bg-cyan-500', label: 'Informe Justificación' }
};

export function GaliaDocumentGeneratorPanel({ 
  expedienteId,
  galId,
  className 
}: GaliaDocumentGeneratorPanelProps) {
  const [activeTab, setActiveTab] = useState('generate');
  const [selectedType, setSelectedType] = useState<DocumentType>('resolucion_concesion');
  const [previewDocument, setPreviewDocument] = useState<GeneratedDocument | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    año: new Date().getFullYear(),
    trimestre: Math.ceil((new Date().getMonth() + 1) / 3),
    importeConcedido: 0,
    motivosDenegacion: '',
    documentosRequeridos: '',
    plazo: 10
  });

  const {
    isGenerating,
    templates,
    generatedDocuments,
    currentDocument,
    loadTemplates,
    generateDocument,
    generateResolucionConcesion,
    generateResolucionDenegacion,
    generateRequerimiento,
    generateMemoriaAnual,
    generateInformeFEDER,
    approveDocument,
    exportToPDF,
    loadHistory
  } = useGaliaDocumentGenerator();

  useEffect(() => {
    loadTemplates();
    loadHistory(galId);
  }, [loadTemplates, loadHistory, galId]);

  const handleGenerate = useCallback(async () => {
    switch (selectedType) {
      case 'resolucion_concesion':
        if (expedienteId) {
          await generateResolucionConcesion(expedienteId, formData.importeConcedido);
        }
        break;
      case 'resolucion_denegacion':
        if (expedienteId) {
          const motivos = formData.motivosDenegacion.split('\n').filter(m => m.trim());
          await generateResolucionDenegacion(expedienteId, motivos);
        }
        break;
      case 'notificacion_requerimiento':
        if (expedienteId) {
          const docs = formData.documentosRequeridos.split('\n').filter(d => d.trim());
          await generateRequerimiento(expedienteId, docs, formData.plazo);
        }
        break;
      case 'memoria_anual':
        if (galId) {
          await generateMemoriaAnual(formData.año, galId);
        }
        break;
      case 'informe_feder':
        if (galId) {
          await generateInformeFEDER(formData.trimestre, formData.año, galId);
        }
        break;
      default:
        await generateDocument(selectedType, {
          expedienteId,
          galId,
          customFields: formData
        });
    }
  }, [selectedType, expedienteId, galId, formData, generateDocument, generateResolucionConcesion, generateResolucionDenegacion, generateRequerimiento, generateMemoriaAnual, generateInformeFEDER]);

  const getStatusBadge = (status: GeneratedDocument['status']) => {
    const config = {
      draft: { label: 'Borrador', variant: 'secondary' as const },
      review: { label: 'En Revisión', variant: 'outline' as const },
      approved: { label: 'Aprobado', variant: 'default' as const },
      signed: { label: 'Firmado', variant: 'default' as const }
    };
    return config[status] || config.draft;
  };

  const renderForm = () => {
    switch (selectedType) {
      case 'resolucion_concesion':
        return (
          <div className="space-y-4">
            <div>
              <Label>Importe Concedido (€)</Label>
              <Input 
                type="number" 
                value={formData.importeConcedido}
                onChange={(e) => setFormData(prev => ({ ...prev, importeConcedido: parseFloat(e.target.value) || 0 }))}
                placeholder="15000.00"
              />
            </div>
          </div>
        );
      case 'resolucion_denegacion':
        return (
          <div className="space-y-4">
            <div>
              <Label>Motivos de Denegación (uno por línea)</Label>
              <Textarea 
                value={formData.motivosDenegacion}
                onChange={(e) => setFormData(prev => ({ ...prev, motivosDenegacion: e.target.value }))}
                placeholder="No cumple requisitos de elegibilidad&#10;Proyecto fuera del ámbito territorial"
                rows={4}
              />
            </div>
          </div>
        );
      case 'notificacion_requerimiento':
        return (
          <div className="space-y-4">
            <div>
              <Label>Documentos Requeridos (uno por línea)</Label>
              <Textarea 
                value={formData.documentosRequeridos}
                onChange={(e) => setFormData(prev => ({ ...prev, documentosRequeridos: e.target.value }))}
                placeholder="Certificado de estar al corriente con Hacienda&#10;Memoria descriptiva del proyecto"
                rows={4}
              />
            </div>
            <div>
              <Label>Plazo (días hábiles)</Label>
              <Input 
                type="number" 
                value={formData.plazo}
                onChange={(e) => setFormData(prev => ({ ...prev, plazo: parseInt(e.target.value) || 10 }))}
              />
            </div>
          </div>
        );
      case 'memoria_anual':
      case 'informe_feder':
        return (
          <div className="space-y-4">
            <div>
              <Label>Año</Label>
              <Input 
                type="number" 
                value={formData.año}
                onChange={(e) => setFormData(prev => ({ ...prev, año: parseInt(e.target.value) || new Date().getFullYear() }))}
              />
            </div>
            {selectedType === 'informe_feder' && (
              <div>
                <Label>Trimestre</Label>
                <Select 
                  value={formData.trimestre.toString()}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, trimestre: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">T1 (Ene-Mar)</SelectItem>
                    <SelectItem value="2">T2 (Abr-Jun)</SelectItem>
                    <SelectItem value="3">T3 (Jul-Sep)</SelectItem>
                    <SelectItem value="4">T4 (Oct-Dic)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Generador de Documentos IA</CardTitle>
              <p className="text-xs text-muted-foreground">
                Auto-generación de documentos oficiales LEADER
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <FileText className="h-3 w-3" />
            {templates.length} plantillas
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="generate" className="text-xs gap-1">
              <Sparkles className="h-3 w-3" />
              Generar
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs gap-1">
              <History className="h-3 w-3" />
              Historial
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-xs gap-1">
              <FileText className="h-3 w-3" />
              Plantillas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4">
            {/* Selector de tipo */}
            <div>
              <Label>Tipo de Documento</Label>
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as DocumentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(documentTypeConfig).map(([type, config]) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1 rounded", config.color, "text-white")}>
                          {config.icon}
                        </div>
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Formulario dinámico */}
            {renderForm()}

            {/* Botón generar */}
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || (!expedienteId && !galId)}
              className="w-full gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando documento...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generar con IA
                </>
              )}
            </Button>

            {/* Preview del documento actual */}
            {currentDocument && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {documentTypeConfig[currentDocument.type]?.icon}
                      <span className="font-medium text-sm">{currentDocument.title}</span>
                    </div>
                    <Badge {...getStatusBadge(currentDocument.status)}>
                      {getStatusBadge(currentDocument.status).label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="py-2">
                  <ScrollArea className="h-[200px]">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <pre className="whitespace-pre-wrap text-xs font-sans">
                        {currentDocument.content?.substring(0, 1000)}
                        {(currentDocument.content?.length || 0) > 1000 && '...'}
                      </pre>
                    </div>
                  </ScrollArea>
                  <div className="flex gap-2 mt-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1"
                      onClick={() => setPreviewDocument(currentDocument)}
                    >
                      <Eye className="h-3 w-3" />
                      Ver completo
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1"
                      onClick={() => approveDocument(currentDocument.id)}
                    >
                      <CheckCircle className="h-3 w-3" />
                      Aprobar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1"
                      onClick={() => exportToPDF(currentDocument.id)}
                    >
                      <Download className="h-3 w-3" />
                      PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history">
            <ScrollArea className="h-[400px]">
              {generatedDocuments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay documentos generados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {generatedDocuments.map((doc) => (
                    <div 
                      key={doc.id}
                      className="p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setPreviewDocument(doc)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn("p-1.5 rounded", documentTypeConfig[doc.type]?.color || 'bg-muted', "text-white")}>
                            {documentTypeConfig[doc.type]?.icon || <FileText className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(doc.generatedAt), { locale: es, addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <Badge {...getStatusBadge(doc.status)} className="text-xs">
                          {getStatusBadge(doc.status).label}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="templates">
            <ScrollArea className="h-[400px]">
              <div className="grid gap-2">
                {templates.map((template) => (
                  <div 
                    key={template.id}
                    className="p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedType(template.type);
                      setActiveTab('generate');
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg", documentTypeConfig[template.type]?.color || 'bg-muted', "text-white")}>
                        {documentTypeConfig[template.type]?.icon || <FileText className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{template.name}</p>
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                        {template.legalBasis && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {template.legalBasis}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Dialog de preview completo */}
        <Dialog open={!!previewDocument} onOpenChange={() => setPreviewDocument(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {previewDocument && documentTypeConfig[previewDocument.type]?.icon}
                {previewDocument?.title}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[70vh]">
              <div className="prose prose-sm max-w-none dark:prose-invert p-4">
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {previewDocument?.content}
                </pre>
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => previewDocument && approveDocument(previewDocument.id)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprobar
              </Button>
              <Button onClick={() => previewDocument && exportToPDF(previewDocument.id)}>
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default GaliaDocumentGeneratorPanel;
