/**
 * FiscalDocumentExportDialog - Diálogo para exportar/imprimir documentos fiscales
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  FileSpreadsheet,
  Code,
  Download,
  Printer,
  Save,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type ExportFormat = 'pdf' | 'xlsx' | 'xbrl';

interface FiscalDocumentExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: string;
  documentData?: unknown;
  companyId?: string;
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; icon: typeof FileText; description: string }[] = [
  { value: 'pdf', label: 'PDF', icon: FileText, description: 'Formato oficial para impresión' },
  { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet, description: 'Para revisión y análisis' },
  { value: 'xbrl', label: 'XBRL', icon: Code, description: 'Para envío electrónico AEAT' },
];

export function FiscalDocumentExportDialog({
  open,
  onOpenChange,
  documentType,
  documentData,
  companyId
}: FiscalDocumentExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [saveToDatabase, setSaveToDatabase] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const { user } = useAuth();

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const { data, error } = await supabase.functions.invoke('erp-fiscal-documents', {
        body: {
          action: 'export',
          document_type: documentType,
          document_data: documentData,
          format,
          company_id: companyId,
          save_to_db: saveToDatabase,
          user_id: user?.id
        }
      });

      if (error) throw error;

      if (data?.success) {
        // Descargar archivo
        if (data.file_content) {
          const blob = new Blob(
            [Uint8Array.from(atob(data.file_content), c => c.charCodeAt(0))],
            { type: getMimeType(format) }
          );
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${documentType}_${new Date().toISOString().split('T')[0]}.${format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }

        setExportSuccess(true);
        toast.success(`Documento exportado en formato ${format.toUpperCase()}`);

        if (saveToDatabase) {
          toast.success('Documento guardado en base de datos');
        }

        setTimeout(() => {
          onOpenChange(false);
          setExportSuccess(false);
        }, 1500);
      } else {
        throw new Error(data?.error || 'Error al exportar');
      }
    } catch (error) {
      console.error('[FiscalDocumentExportDialog] Export error:', error);
      toast.error('Error al exportar documento');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    toast.info('Abriendo vista de impresión...');
    window.print();
  };

  const getMimeType = (fmt: ExportFormat): string => {
    switch (fmt) {
      case 'pdf': return 'application/pdf';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'xbrl': return 'application/xml';
      default: return 'application/octet-stream';
    }
  };

  const getDocumentTitle = (type: string): string => {
    const titles: Record<string, string> = {
      modelo_303: 'Modelo 303 - IVA Trimestral',
      modelo_390: 'Modelo 390 - Resumen Anual IVA',
      modelo_111: 'Modelo 111 - Retenciones IRPF',
      modelo_115: 'Modelo 115 - Retenciones Alquileres',
      balance_pgc: 'Balance de Situación PGC',
      cuenta_pyg: 'Cuenta de Pérdidas y Ganancias'
    };
    return titles[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Exportar Documento
          </DialogTitle>
          <DialogDescription>
            {getDocumentTitle(documentType)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Formato de exportación */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Formato de exportación</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              {FORMAT_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <div 
                    key={option.value}
                    className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      format === option.value 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setFormat(option.value)}
                  >
                    <RadioGroupItem value={option.value} id={option.value} />
                    <div className="flex items-center gap-2 flex-1">
                      <Icon className="h-4 w-4" />
                      <div>
                        <Label htmlFor={option.value} className="cursor-pointer font-medium">
                          {option.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                    {option.value === 'xbrl' && (
                      <Badge variant="secondary" className="text-[10px]">AEAT</Badge>
                    )}
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Opciones adicionales */}
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox 
              id="save-db" 
              checked={saveToDatabase}
              onCheckedChange={(checked) => setSaveToDatabase(checked as boolean)}
            />
            <Label htmlFor="save-db" className="text-sm cursor-pointer">
              Guardar copia en base de datos
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handlePrint} disabled={isExporting}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : exportSuccess ? (
              <CheckCircle className="h-4 w-4 mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isExporting ? 'Exportando...' : exportSuccess ? 'Completado' : 'Descargar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FiscalDocumentExportDialog;
