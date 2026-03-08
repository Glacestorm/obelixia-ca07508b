/**
 * HRReportingEnginePanel — Advanced Reporting Engine
 * Template browser, report generator, history, schedule manager, PDF/Excel export
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  FileText, Download, Clock, Calendar, Play, RefreshCw,
  Database, FileSpreadsheet, File, Sparkles, CheckCircle,
  AlertTriangle, Loader2, History, Settings, Eye, Layers,
  Shield, Brain, Users, Scale, BarChart3, UserCog
} from 'lucide-react';
import { useHRReportingEngine, type ReportTemplate, type GeneratedReport, type ExportFormat } from '@/hooks/admin/hr/useHRReportingEngine';
import { DataSourceBadge } from '@/components/erp/hr/shared/DataSourceBadge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId: string;
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  ceo: <UserCog className="h-4 w-4 text-amber-500" />,
  hr_director: <Users className="h-4 w-4 text-violet-500" />,
  admin: <Settings className="h-4 w-4 text-blue-500" />,
  cfo: <BarChart3 className="h-4 w-4 text-emerald-500" />,
  auditor: <Shield className="h-4 w-4 text-red-500" />,
  manager: <Layers className="h-4 w-4 text-indigo-500" />,
};

const MODULE_ICONS: Record<string, React.ReactNode> = {
  fairness: <Scale className="h-4 w-4 text-violet-500" />,
  workforce: <Users className="h-4 w-4 text-blue-500" />,
  legal: <FileText className="h-4 w-4 text-amber-500" />,
  compliance: <Shield className="h-4 w-4 text-emerald-500" />,
  security: <Shield className="h-4 w-4 text-red-500" />,
  ai_governance: <Brain className="h-4 w-4 text-purple-500" />,
  digital_twin: <Layers className="h-4 w-4 text-cyan-500" />,
  cnae: <BarChart3 className="h-4 w-4 text-orange-500" />,
  analytics: <BarChart3 className="h-4 w-4 text-pink-500" />,
};

export function HRReportingEnginePanel({ companyId }: Props) {
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [reportName, setReportName] = useState('');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [previewReport, setPreviewReport] = useState<GeneratedReport | null>(null);

  const {
    templates, reports, schedules,
    loading, generating,
    seedTemplates, generateReport,
    fetchReports, fetchReportDetail,
    createSchedule, toggleSchedule,
    exportToPDF, exportToExcel, exportToCSV,
  } = useHRReportingEngine(companyId);

  const roleTemplates = useMemo(() => templates.filter(t => t.category === 'role'), [templates]);
  const moduleTemplates = useMemo(() => templates.filter(t => t.category === 'module'), [templates]);

  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate) return;
    const name = reportName || selectedTemplate.template_name;
    const result = await generateReport(
      selectedTemplate.id,
      name,
      exportFormat,
      {},
      selectedTemplate.target_module ? [selectedTemplate.target_module] : []
    );
    if (result) {
      setActiveTab('history');
      setSelectedTemplate(null);
      setReportName('');
    }
  }, [selectedTemplate, reportName, exportFormat, generateReport]);

  const handlePreview = useCallback(async (report: GeneratedReport) => {
    const detail = await fetchReportDetail(report.id);
    if (detail) setPreviewReport(detail as GeneratedReport);
  }, [fetchReportDetail]);

  const handleExport = useCallback((report: GeneratedReport, format: ExportFormat) => {
    switch (format) {
      case 'pdf': exportToPDF(report); break;
      case 'excel': exportToExcel(report); break;
      case 'csv': exportToCSV(report); break;
    }
  }, [exportToPDF, exportToExcel, exportToCSV]);

  const handleSchedule = useCallback(async (template: ReportTemplate) => {
    await createSchedule({
      template_id: template.id,
      schedule_name: `${template.template_name} — Mensual`,
      frequency: 'monthly',
      format: 'pdf',
    });
  }, [createSchedule]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-accent">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Advanced Reporting Engine</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Reportes ejecutivos · PDF/Excel · Datos reales · Trazabilidad completa
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {templates.length === 0 && (
                <Button variant="outline" size="sm" onClick={seedTemplates} disabled={loading}>
                  <Database className="h-3.5 w-3.5 mr-1" /> Crear Plantillas
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={fetchReports} disabled={loading}>
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Card className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Plantillas</p>
              <p className="text-2xl font-bold">{templates.length}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Reportes Generados</p>
              <p className="text-2xl font-bold">{reports.length}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Programados</p>
              <p className="text-2xl font-bold text-primary">{schedules.filter(s => s.is_active).length}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Último Reporte</p>
              <p className="text-sm font-medium">
                {reports[0] ? formatDistanceToNow(new Date(reports[0].created_at), { locale: es, addSuffix: true }) : '—'}
              </p>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="templates" className="text-xs">Plantillas</TabsTrigger>
              <TabsTrigger value="generate" className="text-xs">Generar</TabsTrigger>
              <TabsTrigger value="history" className="text-xs">Historial</TabsTrigger>
              <TabsTrigger value="schedules" className="text-xs">Programados</TabsTrigger>
            </TabsList>

            {/* === TEMPLATES TAB === */}
            <TabsContent value="templates" className="mt-3">
              <ScrollArea className="h-[450px]">
                {templates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground mb-2">Sin plantillas de reporte</p>
                    <Button size="sm" onClick={seedTemplates} disabled={loading}>
                      <Sparkles className="h-3.5 w-3.5 mr-1" /> Crear Plantillas Predeterminadas
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Role Templates */}
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <UserCog className="h-4 w-4" /> Reportes por Rol ({roleTemplates.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {roleTemplates.map((tpl) => (
                          <Card key={tpl.id} className={cn(
                            "p-3 cursor-pointer hover:bg-muted/50 transition-colors border",
                            selectedTemplate?.id === tpl.id && "border-primary bg-primary/5"
                          )} onClick={() => { setSelectedTemplate(tpl); setActiveTab('generate'); }}>
                            <div className="flex items-start gap-2">
                              {ROLE_ICONS[tpl.target_role || ''] || <UserCog className="h-4 w-4 text-muted-foreground" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{tpl.template_name}</p>
                                <p className="text-xs text-muted-foreground">{tpl.sections.length} secciones · {tpl.kpi_definitions.length} KPIs</p>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {tpl.supported_formats.map(f => (
                                    <Badge key={f} variant="outline" className="text-[10px] px-1 py-0">{f.toUpperCase()}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Module Templates */}
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Layers className="h-4 w-4" /> Reportes por Módulo ({moduleTemplates.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {moduleTemplates.map((tpl) => (
                          <Card key={tpl.id} className={cn(
                            "p-3 cursor-pointer hover:bg-muted/50 transition-colors border",
                            selectedTemplate?.id === tpl.id && "border-primary bg-primary/5"
                          )} onClick={() => { setSelectedTemplate(tpl); setActiveTab('generate'); }}>
                            <div className="flex items-start gap-2">
                              {MODULE_ICONS[tpl.target_module || ''] || <BarChart3 className="h-4 w-4 text-muted-foreground" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{tpl.template_name}</p>
                                <p className="text-xs text-muted-foreground">{tpl.sections.length} secciones · v{tpl.version}</p>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {tpl.supported_formats.map(f => (
                                    <Badge key={f} variant="outline" className="text-[10px] px-1 py-0">{f.toUpperCase()}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* === GENERATE TAB === */}
            <TabsContent value="generate" className="mt-3">
              <div className="space-y-4">
                {!selectedTemplate ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Play className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Selecciona una plantilla en la pestaña Plantillas</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => setActiveTab('templates')}>
                      Ver Plantillas
                    </Button>
                  </div>
                ) : (
                  <>
                    <Card className="p-4 border-primary/30 bg-primary/5">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{selectedTemplate.template_name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {selectedTemplate.category === 'role' ? `Rol: ${selectedTemplate.target_role}` : `Módulo: ${selectedTemplate.target_module}`}
                            {' · '}{selectedTemplate.sections.length} secciones
                          </p>
                        </div>
                        <Badge variant="secondary">{selectedTemplate.category}</Badge>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Nombre del reporte</label>
                          <Input
                            value={reportName}
                            onChange={(e) => setReportName(e.target.value)}
                            placeholder={selectedTemplate.template_name}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Formato de exportación</label>
                          <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pdf">PDF — Reporte ejecutivo</SelectItem>
                              <SelectItem value="excel">Excel — Datos detallados</SelectItem>
                              <SelectItem value="csv">CSV — Datos planos</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Secciones incluidas</label>
                          <div className="flex flex-wrap gap-1">
                            {selectedTemplate.sections.map(s => (
                              <Badge key={s} variant="outline" className="text-[10px]">{s.replace(/_/g, ' ')}</Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">KPIs</label>
                          <div className="flex flex-wrap gap-1">
                            {selectedTemplate.kpi_definitions.map(k => (
                              <Badge key={k} variant="secondary" className="text-[10px]">{k.replace(/_/g, ' ')}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>

                    <div className="flex gap-2">
                      <Button onClick={handleGenerate} disabled={generating} className="flex-1 gap-2">
                        {generating ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Generando...</>
                        ) : (
                          <><Sparkles className="h-4 w-4" /> Generar Reporte con IA</>
                        )}
                      </Button>
                      <Button variant="outline" onClick={() => handleSchedule(selectedTemplate)} className="gap-1">
                        <Calendar className="h-4 w-4" /> Programar
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            {/* === HISTORY TAB === */}
            <TabsContent value="history" className="mt-3">
              <ScrollArea className="h-[450px]">
                {reports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <History className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Sin reportes generados aún</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reports.map((report) => (
                      <Card key={report.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{report.report_name}</p>
                              <Badge variant={report.status === 'completed' ? 'default' : report.status === 'generating' ? 'secondary' : 'destructive'} className="text-[10px]">
                                {report.status === 'completed' ? <CheckCircle className="h-3 w-3 mr-0.5" /> : report.status === 'generating' ? <Loader2 className="h-3 w-3 mr-0.5 animate-spin" /> : <AlertTriangle className="h-3 w-3 mr-0.5" />}
                                {report.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{formatDistanceToNow(new Date(report.created_at), { locale: es, addSuffix: true })}</span>
                              {report.generation_time_ms && <span>{report.generation_time_ms}ms</span>}
                              <span>{(report.modules_included || []).length || 'todos'} módulos</span>
                            </div>
                            {/* Data source badges */}
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {Object.entries(report.data_sources || {}).map(([mod, ds]) => (
                                <DataSourceBadge key={mod} source={ds.source as any} compact className="text-[9px]" />
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            {report.status === 'completed' && (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePreview(report)} title="Vista previa">
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleExport(report, 'pdf')} title="PDF">
                                  <File className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleExport(report, 'excel')} title="Excel">
                                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* === SCHEDULES TAB === */}
            <TabsContent value="schedules" className="mt-3">
              <ScrollArea className="h-[450px]">
                {schedules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Calendar className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Sin reportes programados</p>
                    <p className="text-xs text-muted-foreground mt-1">Selecciona una plantilla y usa "Programar"</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {schedules.map((sched) => (
                      <Card key={sched.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{sched.schedule_name}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-[10px]">{sched.frequency}</Badge>
                              <Badge variant="outline" className="text-[10px]">{sched.format.toUpperCase()}</Badge>
                              {sched.next_run_at && (
                                <span>Próximo: {new Date(sched.next_run_at).toLocaleDateString('es-ES')}</span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant={sched.is_active ? 'default' : 'outline'}
                            size="sm"
                            className="text-xs"
                            onClick={() => toggleSchedule(sched.id, !sched.is_active)}
                          >
                            {sched.is_active ? 'Activo' : 'Pausado'}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Report Preview Modal */}
      {previewReport && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" /> Vista Previa: {previewReport.report_name}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExport(previewReport, 'pdf')} className="gap-1">
                  <File className="h-3 w-3" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport(previewReport, 'excel')} className="gap-1">
                  <FileSpreadsheet className="h-3 w-3" /> Excel
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPreviewReport(null)}>✕</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {/* Metadata */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded bg-muted">
                    <p className="text-muted-foreground">Generado</p>
                    <p className="font-medium">{new Date(previewReport.created_at).toLocaleString('es-ES')}</p>
                  </div>
                  <div className="p-2 rounded bg-muted">
                    <p className="text-muted-foreground">Tiempo</p>
                    <p className="font-medium">{previewReport.generation_time_ms}ms</p>
                  </div>
                  <div className="p-2 rounded bg-muted">
                    <p className="text-muted-foreground">Módulos</p>
                    <p className="font-medium">{(previewReport.modules_included || []).join(', ') || 'Todos'}</p>
                  </div>
                  <div className="p-2 rounded bg-muted">
                    <p className="text-muted-foreground">Estado</p>
                    <p className="font-medium">{previewReport.status}</p>
                  </div>
                </div>

                {/* Data Sources */}
                <Card className="p-3">
                  <h4 className="text-xs font-semibold mb-2">Origen de Datos</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(previewReport.data_sources || {}).map(([mod, ds]) => (
                      <div key={mod} className="flex items-center justify-between p-2 rounded bg-muted/50 text-xs">
                        <span className="font-medium capitalize">{mod.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-1">
                          <DataSourceBadge source={ds.source as any} compact />
                          <span className="text-muted-foreground">{ds.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Executive Summary */}
                {(previewReport.content_snapshot as any)?.executive_summary && (
                  <Card className="p-3 border-primary/20 bg-primary/5">
                    <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-primary" /> Resumen Ejecutivo (IA)
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                      {(previewReport.content_snapshot as any).executive_summary}
                    </p>
                  </Card>
                )}

                {/* Data Preview */}
                {(previewReport.content_snapshot as any)?.real_headcount?.count > 0 && (
                  <Card className="p-3">
                    <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> Plantilla Real ({(previewReport.content_snapshot as any).real_headcount.count} empleados)
                      <DataSourceBadge source="real" compact />
                    </h4>
                    <div className="text-xs overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-1">Departamento</th>
                            <th className="text-left p-1">Puesto</th>
                            <th className="text-right p-1">Salario</th>
                            <th className="text-left p-1">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {((previewReport.content_snapshot as any).real_headcount.employees || []).slice(0, 10).map((e: any, i: number) => (
                            <tr key={i} className="border-b border-muted">
                              <td className="p-1">{e.department || '—'}</td>
                              <td className="p-1">{e.job_title || '—'}</td>
                              <td className="p-1 text-right">€{Number(e.base_salary || 0).toLocaleString()}</td>
                              <td className="p-1">{e.employment_status || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default HRReportingEnginePanel;
