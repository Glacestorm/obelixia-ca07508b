/**
 * GaliaReportGenerator - Generador de Informes Automatizados
 * Módulo GALIA - Gestión de Ayudas LEADER con IA
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  FileBarChart,
  Download,
  FileText,
  Printer,
  Clock,
  Loader2,
  Sparkles,
  TrendingUp,
  Users,
  Euro,
  AlertTriangle,
  Building2,
  FileCheck,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  sections: string[];
  estimatedTime: string;
}

const REPORT_TYPES: ReportType[] = [
  {
    id: 'seguimiento',
    name: 'Informe de Seguimiento',
    description: 'Estado actual de expedientes, convocatorias y presupuesto',
    icon: TrendingUp,
    sections: ['resumen_ejecutivo', 'expedientes_estado', 'presupuesto', 'kpis'],
    estimatedTime: '2-3 min',
  },
  {
    id: 'justificacion',
    name: 'Informe de Justificación',
    description: 'Documentación requerida para auditorías y certificación',
    icon: FileCheck,
    sections: ['gastos_detalle', 'verificaciones', 'desviaciones', 'conclusiones'],
    estimatedTime: '5-7 min',
  },
  {
    id: 'riesgos',
    name: 'Informe de Riesgos',
    description: 'Análisis de expedientes con scoring de riesgo elevado',
    icon: AlertTriangle,
    sections: ['expedientes_riesgo', 'factores_riesgo', 'recomendaciones'],
    estimatedTime: '3-4 min',
  },
  {
    id: 'presupuestario',
    name: 'Informe Presupuestario',
    description: 'Ejecución presupuestaria y proyecciones',
    icon: Euro,
    sections: ['dotacion_inicial', 'comprometido', 'pagado', 'disponible', 'proyeccion'],
    estimatedTime: '2-3 min',
  },
  {
    id: 'beneficiarios',
    name: 'Informe de Beneficiarios',
    description: 'Listado y análisis de beneficiarios de ayudas',
    icon: Users,
    sections: ['listado_beneficiarios', 'tipologia', 'distribucion_territorial'],
    estimatedTime: '3-4 min',
  },
  {
    id: 'gal',
    name: 'Memoria Anual GAL',
    description: 'Memoria completa de actividad del Grupo de Acción Local',
    icon: Building2,
    sections: ['presentacion', 'objetivos', 'actuaciones', 'resultados', 'conclusiones'],
    estimatedTime: '10-15 min',
  },
];

const PERIODS = [
  { value: 'mes_actual', label: 'Mes actual' },
  { value: 'trimestre', label: 'Trimestre actual' },
  { value: 'semestre', label: 'Semestre actual' },
  { value: 'anio', label: 'Año en curso' },
  { value: 'custom', label: 'Período personalizado' },
];

const FORMATS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'excel', label: 'Excel' },
  { value: 'word', label: 'Word' },
];

interface GeneratedReport {
  id: string;
  name: string;
  type: string;
  generatedAt: Date;
  format: string;
  data?: any;
}

export function GaliaReportGenerator() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [period, setPeriod] = useState('trimestre');
  const [format, setFormat] = useState('pdf');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [recentReports, setRecentReports] = useState<GeneratedReport[]>([]);

  const currentReport = REPORT_TYPES.find(r => r.id === selectedReport);

  const handleSelectReport = (reportId: string) => {
    setSelectedReport(reportId);
    const report = REPORT_TYPES.find(r => r.id === reportId);
    if (report) {
      setSelectedSections(report.sections);
    }
  };

  const toggleSection = (section: string) => {
    setSelectedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleGenerate = useCallback(async () => {
    if (!selectedReport || selectedSections.length === 0) {
      toast.error('Selecciona un tipo de informe y al menos una sección');
      return;
    }

    setIsGenerating(true);
    setProgress(10);

    try {
      // Call Edge Function
      const { data, error } = await supabase.functions.invoke('galia-report-generator', {
        body: {
          action: 'generate',
          reportType: selectedReport,
          sections: selectedSections,
          period,
          format,
        }
      });

      setProgress(80);

      if (error) throw error;

      if (data?.success && data?.data) {
        setProgress(100);
        
        const newReport: GeneratedReport = {
          id: crypto.randomUUID(),
          name: data.data.titulo || `${currentReport?.name} - ${new Date().toLocaleDateString('es-ES')}`,
          type: selectedReport,
          generatedAt: new Date(),
          format,
          data: data.data,
        };

        setRecentReports(prev => [newReport, ...prev].slice(0, 10));
        setPreviewData(data.data);
        setPreviewOpen(true);

        toast.success('Informe generado correctamente', {
          description: `Generado en ${data.tiempoGeneracion}ms`,
        });
      } else {
        throw new Error('No se pudo generar el informe');
      }
    } catch (err) {
      console.error('[GaliaReportGenerator] Error:', err);
      toast.error('Error al generar el informe');
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  }, [selectedReport, selectedSections, period, format, currentReport]);

  const handlePreview = (report: GeneratedReport) => {
    if (report.data) {
      setPreviewData(report.data);
      setPreviewOpen(true);
    }
  };

  const formatSectionName = (section: string) => {
    return section
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-primary" />
            Generador de Informes
          </h2>
          <p className="text-sm text-muted-foreground">
            Genera informes automatizados para la gestión de ayudas LEADER
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Sparkles className="h-3 w-3" />
          Potenciado por IA
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Types Selection */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tipo de Informe</CardTitle>
              <CardDescription>
                Selecciona el tipo de informe que deseas generar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {REPORT_TYPES.map((report) => {
                  const Icon = report.icon;
                  const isSelected = selectedReport === report.id;
                  return (
                    <button
                      key={report.id}
                      onClick={() => handleSelectReport(report.id)}
                      className={cn(
                        "p-4 rounded-lg border text-left transition-all hover:shadow-md",
                        isSelected 
                          ? "border-primary bg-primary/5 ring-1 ring-primary" 
                          : "hover:border-primary/50"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="font-medium text-sm">{report.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {report.description}
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {report.estimatedTime}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Configuration */}
          {currentReport && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Configuración del Informe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Período</Label>
                    <Select value={period} onValueChange={setPeriod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERIODS.map(p => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Formato</Label>
                    <Select value={format} onValueChange={setFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMATS.map(f => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Secciones a incluir</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {currentReport.sections.map(section => (
                      <div key={section} className="flex items-center space-x-2">
                        <Checkbox
                          id={section}
                          checked={selectedSections.includes(section)}
                          onCheckedChange={() => toggleSection(section)}
                        />
                        <label
                          htmlFor={section}
                          className="text-sm cursor-pointer"
                        >
                          {formatSectionName(section)}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {isGenerating && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Generando informe...</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button 
                    className="flex-1" 
                    onClick={handleGenerate}
                    disabled={isGenerating || selectedSections.length === 0}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generar Informe
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Reports */}
        <div>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Informes Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {recentReports.map((report) => {
                    const reportType = REPORT_TYPES.find(r => r.id === report.type);
                    const Icon = reportType?.icon || FileText;
                    return (
                      <div 
                        key={report.id}
                        className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{report.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {report.generatedAt.toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {report.data && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handlePreview(report)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {report.format.toUpperCase()}
                        </Badge>
                      </div>
                    );
                  })}

                  {recentReports.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileBarChart className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Genera tu primer informe</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Report Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileBarChart className="h-5 w-5 text-primary" />
              {previewData?.titulo || 'Vista Previa del Informe'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pb-4">
              {/* Report header */}
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Fecha: {previewData?.fecha_generacion || new Date().toLocaleDateString('es-ES')}
                </p>
                <p className="text-sm text-muted-foreground">
                  Período: {previewData?.periodo || period}
                </p>
              </div>

              {/* Sections */}
              {previewData?.secciones?.map((seccion: any, idx: number) => (
                <div key={idx} className="space-y-2">
                  <h3 className="text-lg font-semibold border-b pb-2">
                    {seccion.titulo}
                  </h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{seccion.contenido}</ReactMarkdown>
                  </div>
                </div>
              ))}

              {/* Conclusions */}
              {previewData?.conclusiones && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <h3 className="font-semibold mb-2">Conclusiones</h3>
                  <p className="text-sm">{previewData.conclusiones}</p>
                </div>
              )}

              {/* Raw content fallback */}
              {previewData?.rawContent && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{previewData.rawContent}</ReactMarkdown>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GaliaReportGenerator;
