/**
 * GaliaExportToolbar - Barra de herramientas de exportación e impresión
 * Fase 7: Sistema de Impresión y Exportación Universal
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Printer,
  FileDown,
  FileText,
  FileSpreadsheet,
  Mail,
  Link2,
  CheckCircle,
  Loader2,
  FileSignature,
  FileWarning,
  BookOpen,
  ClipboardCheck,
  Eye,
  Download,
  Share2,
  Send,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useGaliaExportPrint, ExportFormat, DocumentType } from '@/hooks/galia/useGaliaExportPrint';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface GaliaExportToolbarProps {
  expedienteId?: string;
  expedienteData?: Record<string, unknown>;
  className?: string;
}

const SECTIONS = [
  { id: 'datos_generales', label: 'Datos Generales', default: true },
  { id: 'beneficiario', label: 'Datos del Beneficiario', default: true },
  { id: 'proyecto', label: 'Descripción del Proyecto', default: true },
  { id: 'presupuesto', label: 'Presupuesto', default: true },
  { id: 'documentacion', label: 'Documentación', default: false },
  { id: 'evaluacion', label: 'Evaluación', default: true },
  { id: 'resolucion', label: 'Resolución', default: true },
  { id: 'justificacion', label: 'Justificación', default: false },
  { id: 'pagos', label: 'Pagos', default: false },
  { id: 'historial', label: 'Historial de Cambios', default: false },
];

const DOCUMENT_TYPES = [
  { id: 'resolucion_concesion', label: 'Resolución de Concesión', icon: FileSignature },
  { id: 'resolucion_denegacion', label: 'Resolución de Denegación', icon: FileWarning },
  { id: 'requerimiento', label: 'Requerimiento de Subsanación', icon: FileText },
  { id: 'acta_verificacion', label: 'Acta de Verificación', icon: ClipboardCheck },
  { id: 'memoria_anual', label: 'Memoria Anual', icon: BookOpen },
];

export function GaliaExportToolbar({ 
  expedienteId, 
  expedienteData,
  className 
}: GaliaExportToolbarProps) {
  const [activeTab, setActiveTab] = useState('print');
  const [selectedSections, setSelectedSections] = useState<string[]>(
    SECTIONS.filter(s => s.default).map(s => s.id)
  );
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [selectedDocType, setSelectedDocType] = useState<string>('resolucion_concesion');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const {
    isLoading,
    isGenerating,
    lastGenerated,
    generatePDF,
    openPrintPreview,
    generateResolution,
    generateRequerimiento,
    generateMemoria,
    generateActa,
    exportData,
    sendByEmail,
    shareTemporaryLink
  } = useGaliaExportPrint();

  // === HANDLERS ===
  const handleSectionToggle = useCallback((sectionId: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  }, []);

  const handlePrint = useCallback(async () => {
    if (!expedienteId) {
      toast.error('No hay expediente seleccionado');
      return;
    }

    const doc = await generatePDF({
      expedienteId,
      sections: selectedSections,
      includeHeader: true,
      includeFooter: true,
      includeSignature: true
    });

    if (doc) {
      openPrintPreview(doc);
    }
  }, [expedienteId, selectedSections, generatePDF, openPrintPreview]);

  const handleExport = useCallback(async () => {
    const result = await exportData(selectedFormat, {
      expedienteId,
      sections: selectedSections,
      ...expedienteData
    });

    if (result) {
      toast.success(`Exportado a ${selectedFormat.toUpperCase()}`);
    }
  }, [exportData, selectedFormat, expedienteId, selectedSections, expedienteData]);

  const handleGenerateDocument = useCallback(async () => {
    if (!expedienteId) {
      toast.error('Selecciona un expediente');
      return;
    }

    switch (selectedDocType) {
      case 'resolucion_concesion':
        await generateResolution(expedienteId, 'concesion', expedienteData);
        break;
      case 'resolucion_denegacion':
        await generateResolution(expedienteId, 'denegacion', expedienteData);
        break;
      case 'requerimiento':
        await generateRequerimiento(expedienteId, ['Documentación pendiente']);
        break;
      case 'acta_verificacion':
        await generateActa(expedienteId, 'verificacion_in_situ');
        break;
      case 'memoria_anual':
        await generateMemoria('anual', '2024');
        break;
    }
  }, [expedienteId, selectedDocType, expedienteData, generateResolution, generateRequerimiento, generateActa, generateMemoria]);

  const handleSendEmail = useCallback(async () => {
    if (!lastGenerated || !emailAddress) {
      toast.error('Genera un documento primero');
      return;
    }

    await sendByEmail(lastGenerated, emailAddress);
    setEmailDialogOpen(false);
    setEmailAddress('');
  }, [lastGenerated, emailAddress, sendByEmail]);

  const handleShareLink = useCallback(async () => {
    if (!lastGenerated) {
      toast.error('Genera un documento primero');
      return;
    }

    const link = await shareTemporaryLink(lastGenerated, 24);
    setGeneratedLink(link);
    setShareDialogOpen(true);
  }, [lastGenerated, shareTemporaryLink]);

  const copyToClipboard = useCallback(async () => {
    if (generatedLink) {
      await navigator.clipboard.writeText(generatedLink);
      toast.success('Enlace copiado');
    }
  }, [generatedLink]);

  // === RENDER ===
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Printer className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Exportar e Imprimir</CardTitle>
              <p className="text-xs text-muted-foreground">
                Genera documentos oficiales y exporta datos
              </p>
            </div>
          </div>
          {expedienteId && (
            <Badge variant="outline" className="text-xs">
              Exp: {expedienteId.slice(0, 8)}...
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="print" className="text-xs">
              <Printer className="h-3 w-3 mr-1" />
              Imprimir
            </TabsTrigger>
            <TabsTrigger value="export" className="text-xs">
              <FileDown className="h-3 w-3 mr-1" />
              Exportar
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs">
              <FileSignature className="h-3 w-3 mr-1" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="share" className="text-xs">
              <Share2 className="h-3 w-3 mr-1" />
              Compartir
            </TabsTrigger>
          </TabsList>

          {/* PRINT TAB */}
          <TabsContent value="print" className="mt-0">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Secciones a incluir
                </Label>
                <ScrollArea className="h-[200px] border rounded-lg p-3">
                  <div className="space-y-2">
                    {SECTIONS.map(section => (
                      <div key={section.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={section.id}
                          checked={selectedSections.includes(section.id)}
                          onCheckedChange={() => handleSectionToggle(section.id)}
                        />
                        <label
                          htmlFor={section.id}
                          className="text-sm cursor-pointer"
                        >
                          {section.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handlePrint}
                  disabled={isLoading || !expedienteId}
                  className="flex-1"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Vista Previa
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedSections(SECTIONS.map(s => s.id));
                  }}
                >
                  Seleccionar Todo
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* EXPORT TAB */}
          <TabsContent value="export" className="mt-0">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Formato de exportación
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'pdf', label: 'PDF', icon: FileText },
                    { id: 'excel', label: 'Excel', icon: FileSpreadsheet },
                    { id: 'word', label: 'Word', icon: FileText },
                    { id: 'csv', label: 'CSV', icon: FileDown },
                  ].map(format => (
                    <Button
                      key={format.id}
                      variant={selectedFormat === format.id ? 'default' : 'outline'}
                      className="flex flex-col h-16 gap-1"
                      onClick={() => setSelectedFormat(format.id as ExportFormat)}
                    >
                      <format.icon className="h-5 w-5" />
                      <span className="text-xs">{format.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Datos a exportar
                </Label>
                <ScrollArea className="h-[120px] border rounded-lg p-3">
                  <div className="space-y-2">
                    {SECTIONS.map(section => (
                      <div key={section.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`export-${section.id}`}
                          checked={selectedSections.includes(section.id)}
                          onCheckedChange={() => handleSectionToggle(section.id)}
                        />
                        <label
                          htmlFor={`export-${section.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {section.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <Button
                onClick={handleExport}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Exportar a {selectedFormat.toUpperCase()}
              </Button>
            </div>
          </TabsContent>

          {/* DOCUMENTS TAB */}
          <TabsContent value="documents" className="mt-0">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Tipo de documento oficial
                </Label>
                <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo de documento" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-3">
                  {(() => {
                    const DocIcon = DOCUMENT_TYPES.find(t => t.id === selectedDocType)?.icon || FileText;
                    return <DocIcon className="h-8 w-8 text-primary" />;
                  })()}
                  <div>
                    <h4 className="font-medium text-sm">
                      {DOCUMENT_TYPES.find(t => t.id === selectedDocType)?.label}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedDocType.includes('resolucion') && 
                        'Documento oficial según Ley 39/2015 con firma electrónica'}
                      {selectedDocType === 'requerimiento' && 
                        'Requerimiento con plazo de 10 días hábiles para subsanación'}
                      {selectedDocType === 'acta_verificacion' && 
                        'Acta de verificación in situ con lista de comprobación'}
                      {selectedDocType === 'memoria_anual' && 
                        'Memoria FEDER con indicadores de ejecución'}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGenerateDocument}
                disabled={isGenerating || !expedienteId}
                className="w-full"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileSignature className="h-4 w-4 mr-2" />
                )}
                Generar Documento
              </Button>

              {lastGenerated && (
                <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Documento generado: {lastGenerated.titulo}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* SHARE TAB */}
          <TabsContent value="share" className="mt-0">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Email Dialog */}
                <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-20 flex-col gap-2">
                      <Mail className="h-6 w-6" />
                      <span className="text-xs">Enviar por Email</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Enviar documento por email</DialogTitle>
                      <DialogDescription>
                        El documento se adjuntará automáticamente
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Dirección de email</Label>
                        <Input
                          type="email"
                          placeholder="destinatario@ejemplo.com"
                          value={emailAddress}
                          onChange={(e) => setEmailAddress(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleSendEmail} disabled={!emailAddress}>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Share Link Dialog */}
                <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col gap-2"
                      onClick={handleShareLink}
                    >
                      <Link2 className="h-6 w-6" />
                      <span className="text-xs">Enlace Temporal</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Enlace de acceso temporal</DialogTitle>
                      <DialogDescription>
                        Este enlace expirará en 24 horas
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {generatedLink && (
                        <div className="flex gap-2">
                          <Input
                            readOnly
                            value={generatedLink}
                            className="font-mono text-sm"
                          />
                          <Button variant="outline" size="icon" onClick={copyToClipboard}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
                        Cerrar
                      </Button>
                      <Button onClick={() => window.open(generatedLink || '', '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Separator />

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Opciones de compartir</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Email: Envío con acuse de recibo</li>
                  <li>• Enlace: Acceso público temporal (24h)</li>
                  <li>• Notific@: Próximamente disponible</li>
                </ul>
              </div>

              {!lastGenerated && (
                <div className="p-3 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Genera un documento primero en la pestaña "Documentos" para poder compartirlo.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default GaliaExportToolbar;
