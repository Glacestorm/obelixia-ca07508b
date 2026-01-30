/**
 * FiscalActionsPanel - Panel de acciones fiscales (cierre, documentos, formularios)
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Calculator, 
  Download, 
  Send, 
  Loader2, 
  CheckCircle,
  Clock,
  AlertTriangle,
  Printer,
  Save,
  FileSpreadsheet,
  Scale
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { FiscalDocumentExportDialog } from './FiscalDocumentExportDialog';

interface FiscalActionsPanelProps {
  companyId?: string;
  className?: string;
  onOpenClosingWizard?: () => void;
}

type DocumentType = 'modelo_303' | 'modelo_390' | 'modelo_111' | 'modelo_115' | 'balance_pgc' | 'cuenta_pyg';

interface DocumentConfig {
  type: DocumentType;
  name: string;
  description: string;
  icon: typeof FileText;
  frequency: string;
}

const DOCUMENT_CONFIGS: DocumentConfig[] = [
  { type: 'modelo_303', name: 'Modelo 303', description: 'IVA Trimestral', icon: FileText, frequency: 'Trimestral' },
  { type: 'modelo_390', name: 'Modelo 390', description: 'Resumen Anual IVA', icon: FileText, frequency: 'Anual' },
  { type: 'modelo_111', name: 'Modelo 111', description: 'Retenciones IRPF', icon: Calculator, frequency: 'Trimestral' },
  { type: 'modelo_115', name: 'Modelo 115', description: 'Retenciones Alquileres', icon: Calculator, frequency: 'Trimestral' },
  { type: 'balance_pgc', name: 'Balance PGC', description: 'Balance de Situación', icon: Scale, frequency: 'Anual' },
  { type: 'cuenta_pyg', name: 'Cuenta PyG', description: 'Pérdidas y Ganancias', icon: FileSpreadsheet, frequency: 'Anual' },
];

export function FiscalActionsPanel({ companyId, className, onOpenClosingWizard }: FiscalActionsPanelProps) {
  const [generatingDoc, setGeneratingDoc] = useState<DocumentType | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{ type: DocumentType; data: unknown } | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);

  const handleGenerateDocument = async (docType: DocumentType) => {
    if (!companyId) {
      toast.error('Selecciona una empresa primero');
      return;
    }

    setGeneratingDoc(docType);
    setGenerationProgress(0);

    try {
      // Simular progreso
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { data, error } = await supabase.functions.invoke('erp-fiscal-documents', {
        body: {
          action: 'generate',
          document_type: docType,
          company_id: companyId,
          period: getCurrentPeriod(docType),
          format: 'pdf'
        }
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (error) throw error;

      if (data?.success) {
        setSelectedDocument({ type: docType, data: data.document });
        setExportDialogOpen(true);
        toast.success(`${getDocumentName(docType)} generado correctamente`);
      } else {
        throw new Error(data?.error || 'Error al generar documento');
      }
    } catch (error) {
      console.error('[FiscalActionsPanel] Generate error:', error);
      toast.error('Error al generar documento fiscal');
    } finally {
      setGeneratingDoc(null);
      setGenerationProgress(0);
    }
  };

  const getCurrentPeriod = (docType: DocumentType): string => {
    const now = new Date();
    const year = now.getFullYear();
    const quarter = Math.floor(now.getMonth() / 3) + 1;

    if (['modelo_390', 'balance_pgc', 'cuenta_pyg'].includes(docType)) {
      return `${year}`;
    }
    return `Q${quarter}-${year}`;
  };

  const getDocumentName = (type: DocumentType): string => {
    return DOCUMENT_CONFIGS.find(c => c.type === type)?.name || type;
  };

  return (
    <>
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Acciones Fiscales</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Cierre fiscal y documentación oficial
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Cierre Fiscal */}
          <div className="p-4 rounded-lg border bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">Cierre Fiscal</h4>
                  <p className="text-xs text-muted-foreground">
                    Ejecutar cierre del ejercicio
                  </p>
                </div>
              </div>
              <Button
                onClick={onOpenClosingWizard}
                className="gap-2"
                variant="outline"
              >
                <Calculator className="h-4 w-4" />
                Iniciar Cierre
              </Button>
            </div>
          </div>

          {/* Generación de documentos */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Generar Documentación Oficial
            </h4>

            <div className="grid grid-cols-2 gap-2">
              {DOCUMENT_CONFIGS.map((doc) => {
                const Icon = doc.icon;
                const isGenerating = generatingDoc === doc.type;

                return (
                  <Button
                    key={doc.type}
                    variant="outline"
                    className="h-auto py-3 px-3 flex flex-col items-start gap-1 relative overflow-hidden"
                    onClick={() => handleGenerateDocument(doc.type)}
                    disabled={!!generatingDoc}
                  >
                    {isGenerating && (
                      <Progress 
                        value={generationProgress} 
                        className="absolute bottom-0 left-0 right-0 h-1 rounded-none" 
                      />
                    )}
                    <div className="flex items-center gap-2 w-full">
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                      <span className="font-medium text-sm">{doc.name}</span>
                    </div>
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs text-muted-foreground">{doc.description}</span>
                      <Badge variant="secondary" className="text-[10px] h-4">
                        {doc.frequency}
                      </Badge>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="flex gap-2 pt-2 border-t">
            <Button variant="ghost" size="sm" className="flex-1 gap-2">
              <Download className="h-4 w-4" />
              Descargar todo
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 gap-2">
              <Send className="h-4 w-4" />
              Presentar AEAT
            </Button>
          </div>
        </CardContent>
      </Card>

      <FiscalDocumentExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        documentType={selectedDocument?.type || 'modelo_303'}
        documentData={selectedDocument?.data}
        companyId={companyId}
      />
    </>
  );
}

export default FiscalActionsPanel;
