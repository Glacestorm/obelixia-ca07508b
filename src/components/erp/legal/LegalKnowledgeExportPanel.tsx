/**
 * LegalKnowledgeExportPanel - Exportación multi-formato de la base de conocimiento
 * Formatos: PDF profesional, Excel/CSV, Word/DOCX
 */

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Download,
  FileText,
  FileSpreadsheet,
  File,
  Printer,
  Loader2,
  CheckCircle,
  Scale,
  BookOpen,
  GraduationCap,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { openPrintDialogForJsPdf } from '@/lib/pdfPrint';

type ExportFormat = 'pdf' | 'xlsx' | 'csv' | 'docx';
type KnowledgeType = 'all' | 'law' | 'precedent' | 'doctrine' | 'regulation';

interface ExportFilters {
  types: KnowledgeType[];
  jurisdictions: string[];
  areas: string[];
}

interface LegalKnowledgeExportPanelProps {
  companyId?: string;
}

const FORMAT_OPTIONS = [
  { value: 'pdf' as ExportFormat, label: 'PDF Profesional', icon: FileText, description: 'Documento formateado para impresión' },
  { value: 'xlsx' as ExportFormat, label: 'Excel (XLSX)', icon: FileSpreadsheet, description: 'Para análisis y filtrado' },
  { value: 'csv' as ExportFormat, label: 'CSV', icon: FileSpreadsheet, description: 'Datos separados por comas' },
];

const TYPE_OPTIONS = [
  { value: 'law', label: 'Legislación', icon: Scale },
  { value: 'precedent', label: 'Jurisprudencia', icon: GraduationCap },
  { value: 'doctrine', label: 'Doctrina', icon: BookOpen },
  { value: 'regulation', label: 'Reglamentos', icon: FileText },
];

const JURISDICTION_OPTIONS = [
  { value: 'ES', label: '🇪🇸 España' },
  { value: 'AD', label: '🇦🇩 Andorra' },
  { value: 'EU', label: '🇪🇺 Unión Europea' },
  { value: 'INT', label: '🌍 Internacional' },
];

export function LegalKnowledgeExportPanel({ companyId }: LegalKnowledgeExportPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [filters, setFilters] = useState<ExportFilters>({
    types: ['law', 'precedent', 'doctrine', 'regulation'],
    jurisdictions: ['ES', 'AD', 'EU', 'INT'],
    areas: []
  });

  const toggleType = (type: string) => {
    setFilters(prev => ({
      ...prev,
      types: prev.types.includes(type as KnowledgeType)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type as KnowledgeType]
    }));
  };

  const toggleJurisdiction = (jurisdiction: string) => {
    setFilters(prev => ({
      ...prev,
      jurisdictions: prev.jurisdictions.includes(jurisdiction)
        ? prev.jurisdictions.filter(j => j !== jurisdiction)
        : [...prev.jurisdictions, jurisdiction]
    }));
  };

  const fetchKnowledgeData = async () => {
    let query = supabase
      .from('legal_knowledge_base')
      .select('*')
      .eq('is_active', true)
      .order('knowledge_type')
      .order('jurisdiction_code')
      .order('title');

    if (filters.types.length > 0 && !filters.types.includes('all')) {
      query = query.in('knowledge_type', filters.types);
    }

    if (filters.jurisdictions.length > 0) {
      query = query.in('jurisdiction_code', filters.jurisdictions);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  };

  const generatePDF = async (data: any[]) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(22, 163, 74); // Green primary
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('times', 'bold');
    doc.text('Base de Conocimiento Jurídico', 14, 18);
    
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    doc.text(`ObelixIA Legal • Generado: ${new Date().toLocaleDateString('es-ES')}`, 14, 28);
    doc.text(`Total: ${data.length} documentos`, pageWidth - 14, 28, { align: 'right' });

    // Reset text color
    doc.setTextColor(0, 0, 0);

    let yPos = 45;

    // Group by type
    const groupedByType: Record<string, any[]> = {};
    data.forEach(item => {
      if (!groupedByType[item.knowledge_type]) {
        groupedByType[item.knowledge_type] = [];
      }
      groupedByType[item.knowledge_type].push(item);
    });

    const typeLabels: Record<string, string> = {
      law: 'LEGISLACIÓN',
      precedent: 'JURISPRUDENCIA',
      doctrine: 'DOCTRINA ADMINISTRATIVA',
      regulation: 'REGLAMENTOS',
      circular: 'CIRCULARES',
      convention: 'CONVENIOS',
      treaty: 'TRATADOS',
      template: 'PLANTILLAS'
    };

    for (const [type, items] of Object.entries(groupedByType)) {
      // Type header
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFillColor(240, 240, 240);
      doc.rect(14, yPos - 5, pageWidth - 28, 10, 'F');
      doc.setFontSize(12);
      doc.setFont('times', 'bold');
      doc.text(`${typeLabels[type] || type.toUpperCase()} (${items.length})`, 18, yPos + 2);
      yPos += 15;

      // Table for this type
      const tableData = items.map(item => [
        item.title,
        item.jurisdiction_code,
        item.reference_code || '-',
        item.summary ? item.summary.substring(0, 80) + '...' : '-'
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Título', 'Jurisdicción', 'Referencia', 'Resumen']],
        body: tableData,
        styles: { 
          fontSize: 8, 
          font: 'times',
          cellPadding: 2
        },
        headStyles: { 
          fillColor: [22, 163, 74],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 30 },
          3: { cellWidth: 70 }
        },
        margin: { left: 14, right: 14 },
        didDrawPage: () => {
          // Footer
          doc.setFontSize(8);
          doc.setTextColor(128, 128, 128);
          doc.text(
            `Página ${doc.internal.pages.length - 1}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
          );
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    return doc;
  };

  const generateExcel = (data: any[]) => {
    const workbook = XLSX.utils.book_new();

    // Main sheet with all data
    const mainData = data.map(item => ({
      'Título': item.title,
      'Tipo': item.knowledge_type,
      'Jurisdicción': item.jurisdiction_code,
      'Área Legal': item.legal_area,
      'Subárea': item.sub_area || '',
      'Referencia': item.reference_code || '',
      'Fecha Efectiva': item.effective_date || '',
      'Fuente': item.source_name || '',
      'URL': item.source_url || '',
      'Resumen': item.summary || '',
      'Verificado': item.is_verified ? 'Sí' : 'No',
      'Vistas': item.view_count || 0,
      'Útil': item.helpful_count || 0,
      'Actualizado': item.updated_at
    }));

    const mainSheet = XLSX.utils.json_to_sheet(mainData);
    XLSX.utils.book_append_sheet(workbook, mainSheet, 'Base Conocimiento');

    // Separate sheets by type
    const types = [...new Set(data.map(d => d.knowledge_type))];
    types.forEach(type => {
      const typeData = data.filter(d => d.knowledge_type === type).map(item => ({
        'Título': item.title,
        'Jurisdicción': item.jurisdiction_code,
        'Referencia': item.reference_code || '',
        'Resumen': item.summary || '',
        'Contenido': item.content,
        'Tags': (item.tags || []).join(', ')
      }));

      const sheet = XLSX.utils.json_to_sheet(typeData);
      const sheetName = type.charAt(0).toUpperCase() + type.slice(1);
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName.substring(0, 31));
    });

    return workbook;
  };

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);

    try {
      setProgress(20);
      const data = await fetchKnowledgeData();
      
      if (data.length === 0) {
        toast.warning('No hay datos para exportar con los filtros seleccionados');
        return;
      }

      setProgress(50);

      const filename = `Base_Conocimiento_Legal_${new Date().toISOString().split('T')[0]}`;

      switch (format) {
        case 'pdf': {
          const doc = await generatePDF(data);
          setProgress(90);
          doc.save(`${filename}.pdf`);
          break;
        }
        case 'xlsx': {
          const workbook = generateExcel(data);
          setProgress(90);
          XLSX.writeFile(workbook, `${filename}.xlsx`);
          break;
        }
        case 'csv': {
          const workbook = generateExcel(data);
          setProgress(90);
          XLSX.writeFile(workbook, `${filename}.csv`, { bookType: 'csv' });
          break;
        }
      }

      setProgress(100);
      toast.success(`Exportado ${data.length} documentos en formato ${format.toUpperCase()}`);
      
      setTimeout(() => {
        setIsOpen(false);
        setProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error al exportar');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = async () => {
    setIsExporting(true);
    try {
      const data = await fetchKnowledgeData();
      if (data.length === 0) {
        toast.warning('No hay datos para imprimir');
        return;
      }
      const doc = await generatePDF(data);
      openPrintDialogForJsPdf(doc);
      toast.success('Abriendo vista de impresión...');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Error al preparar impresión');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Exportar Base de Conocimiento
          </DialogTitle>
          <DialogDescription>
            Descarga o imprime la información jurídica en el formato que necesites
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Formato */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <File className="h-4 w-4" />
              Formato de exportación
            </Label>
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
                    <Icon className="h-4 w-4" />
                    <div className="flex-1">
                      <Label htmlFor={option.value} className="cursor-pointer font-medium">
                        {option.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Filtros - Tipos */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Tipos de contenido
            </Label>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((type) => {
                const Icon = type.icon;
                return (
                  <Badge
                    key={type.value}
                    variant={filters.types.includes(type.value as KnowledgeType) ? 'default' : 'outline'}
                    className="cursor-pointer transition-colors flex items-center gap-1"
                    onClick={() => toggleType(type.value)}
                  >
                    <Icon className="h-3 w-3" />
                    {type.label}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Filtros - Jurisdicciones */}
          <div className="space-y-3">
            <Label>Jurisdicciones</Label>
            <div className="flex flex-wrap gap-2">
              {JURISDICTION_OPTIONS.map((jurisdiction) => (
                <Badge
                  key={jurisdiction.value}
                  variant={filters.jurisdictions.includes(jurisdiction.value) ? 'default' : 'outline'}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleJurisdiction(jurisdiction.value)}
                >
                  {jurisdiction.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Progress */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando archivo...
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={isExporting}
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || (filters.types.length === 0 && filters.jurisdictions.length === 0)}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isExporting ? 'Exportando...' : 'Descargar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LegalKnowledgeExportPanel;
