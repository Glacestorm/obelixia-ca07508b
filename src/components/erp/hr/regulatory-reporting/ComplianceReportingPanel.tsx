/**
 * ComplianceReportingPanel — Regulatory Compliance Reporting Engine
 * Templates, generation, review workflow, history, export
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Shield, FileText, Download, Sparkles, RefreshCw, Database,
  CheckCircle, AlertTriangle, Loader2, History, Eye, Clock,
  Scale, Brain, Users, BarChart3, Gavel, FileCheck, Archive,
  XCircle, MessageSquare, ChevronRight,
} from 'lucide-react';
import { useHRRegulatoryReporting, type RegulatoryTemplate, type RegulatoryReport, type ReviewStatus } from '@/hooks/admin/hr/useHRRegulatoryReporting';
import { DataSourceBadge } from '@/components/erp/hr/shared/DataSourceBadge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ExportFormat } from '@/hooks/admin/hr/useHRReportingEngine';

interface Props {
  companyId: string;
}

const FRAMEWORK_ICONS: Record<string, React.ReactNode> = {
  equality_plan: <Scale className="h-4 w-4 text-violet-500" />,
  salary_audit: <BarChart3 className="h-4 w-4 text-emerald-500" />,
  pay_gap: <Users className="h-4 w-4 text-blue-500" />,
  gdpr_lopdgdd: <Shield className="h-4 w-4 text-red-500" />,
  dpia: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  eu_ai_act: <Brain className="h-4 w-4 text-purple-500" />,
  security_sod: <Shield className="h-4 w-4 text-orange-500" />,
  labor_compliance: <Gavel className="h-4 w-4 text-cyan-500" />,
  cnae_sector: <BarChart3 className="h-4 w-4 text-pink-500" />,
  internal_audit: <FileCheck className="h-4 w-4 text-indigo-500" />,
};

const REVIEW_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Borrador', color: 'bg-muted text-muted-foreground', icon: <FileText className="h-3 w-3" /> },
  generated: { label: 'Generado', color: 'bg-blue-500/15 text-blue-700', icon: <Sparkles className="h-3 w-3" /> },
  reviewed: { label: 'Revisado', color: 'bg-amber-500/15 text-amber-700', icon: <Eye className="h-3 w-3" /> },
  approved: { label: 'Aprobado', color: 'bg-emerald-500/15 text-emerald-700', icon: <CheckCircle className="h-3 w-3" /> },
  rejected: { label: 'Rechazado', color: 'bg-red-500/15 text-red-700', icon: <XCircle className="h-3 w-3" /> },
  archived: { label: 'Archivado', color: 'bg-gray-500/15 text-gray-700', icon: <Archive className="h-3 w-3" /> },
};

export function ComplianceReportingPanel({ companyId }: Props) {
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<RegulatoryTemplate | null>(null);
  const [reportName, setReportName] = useState('');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [period, setPeriod] = useState('');
  const [previewReport, setPreviewReport] = useState<RegulatoryReport | null>(null);
  const [reviewComment, setReviewComment] = useState('');

  const {
    templates, reports, reviewHistory,
    loading, generating,
    seedTemplates, generateReport, fetchReports,
    fetchReportDetail, updateReviewStatus, fetchReviewHistory,
    exportToPDF, exportToExcel, exportToCSV,
  } = useHRRegulatoryReporting(companyId);

  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate) return;
    const name = reportName || selectedTemplate.template_name;
    const result = await generateReport(selectedTemplate.id, name, exportFormat, {}, period || undefined);
    if (result) {
      setActiveTab('history');
      setSelectedTemplate(null);
      setReportName('');
      setPeriod('');
    }
  }, [selectedTemplate, reportName, exportFormat, period, generateReport]);

  const handlePreview = useCallback(async (report: RegulatoryReport) => {
    const detail = await fetchReportDetail(report.id);
    if (detail) {
      setPreviewReport(detail as RegulatoryReport);
      await fetchReviewHistory(report.id);
    }
  }, [fetchReportDetail, fetchReviewHistory]);

  const handleExport = useCallback((report: RegulatoryReport, format: ExportFormat) => {
    switch (format) {
      case 'pdf': exportToPDF(report); break;
      case 'excel': exportToExcel(report); break;
      case 'csv': exportToCSV(report); break;
    }
  }, [exportToPDF, exportToExcel, exportToCSV]);

  const handleStatusChange = useCallback(async (reportId: string, newStatus: ReviewStatus) => {
    await updateReviewStatus(reportId, newStatus, reviewComment || undefined);
    setReviewComment('');
    if (previewReport?.id === reportId) {
      setPreviewReport(prev => prev ? { ...prev, review_status: newStatus } : null);
      await fetchReviewHistory(reportId);
    }
  }, [updateReviewStatus, reviewComment, previewReport, fetchReviewHistory]);

  const stats = useMemo(() => ({
    total: reports.length,
    draft: reports.filter(r => r.review_status === 'draft').length,
    approved: reports.filter(r => r.review_status === 'approved').length,
    withDisclaimer: reports.filter(r => r.disclaimer).length,
  }), [reports]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2 bg-gradient-to-r from-red-500/10 via-amber-500/10 to-emerald-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-600 to-amber-600">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Compliance Reporting Regulatorio</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Informes regulatorios · Trazabilidad · Revisión y aprobación · Datos reales
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
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Card className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Plantillas</p>
              <p className="text-2xl font-bold">{templates.length}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Informes</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Aprobados</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Pendientes</p>
              <p className="text-2xl font-bold text-amber-600">{stats.draft}</p>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="templates" className="text-xs">Plantillas</TabsTrigger>
              <TabsTrigger value="generate" className="text-xs">Generar</TabsTrigger>
              <TabsTrigger value="history" className="text-xs">Historial</TabsTrigger>
              <TabsTrigger value="preview" className="text-xs">Vista Previa</TabsTrigger>
            </TabsList>

            {/* === TEMPLATES === */}
            <TabsContent value="templates" className="mt-3">
              <ScrollArea className="h-[480px]">
                {templates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Shield className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground mb-2">Sin plantillas regulatorias</p>
                    <Button size="sm" onClick={seedTemplates} disabled={loading}>
                      <Sparkles className="h-3.5 w-3.5 mr-1" /> Crear 10 Plantillas Regulatorias
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {templates.map(tpl => (
                      <Card
                        key={tpl.id}
                        className={cn(
                          "p-3 cursor-pointer hover:bg-muted/50 transition-colors border",
                          selectedTemplate?.id === tpl.id && "border-primary bg-primary/5"
                        )}
                        onClick={() => { setSelectedTemplate(tpl); setActiveTab('generate'); }}
                      >
                        <div className="flex items-start gap-3">
                          {FRAMEWORK_ICONS[tpl.regulatory_framework || ''] || <FileText className="h-4 w-4 text-muted-foreground" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{tpl.template_name}</p>
                              <Badge variant="outline" className="text-[10px] px-1 py-0">v{tpl.version}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {tpl.sections.length} secciones · {tpl.kpi_definitions.length} KPIs
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {tpl.legal_basis?.slice(0, 3).map(lb => (
                                <Badge key={lb} variant="secondary" className="text-[9px] px-1 py-0 font-normal">{lb}</Badge>
                              ))}
                              {(tpl.legal_basis?.length || 0) > 3 && (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0">+{tpl.legal_basis.length - 3}</Badge>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* === GENERATE === */}
            <TabsContent value="generate" className="mt-3">
              <div className="space-y-4">
                {!selectedTemplate ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Gavel className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Selecciona una plantilla regulatoria</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => setActiveTab('templates')}>
                      Ver Plantillas
                    </Button>
                  </div>
                ) : (
                  <>
                    <Card className="p-4 border-amber-500/30 bg-amber-500/5">
                      <div className="flex items-center gap-2 mb-3">
                        {FRAMEWORK_ICONS[selectedTemplate.regulatory_framework || '']}
                        <div>
                          <h3 className="font-semibold text-sm">{selectedTemplate.template_name}</h3>
                          <p className="text-xs text-muted-foreground">
                            Marco: {selectedTemplate.regulatory_framework} · Módulo: {selectedTemplate.target_module}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Base legal</label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedTemplate.legal_basis?.map(lb => (
                              <Badge key={lb} variant="outline" className="text-[10px]">{lb}</Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Nombre del informe</label>
                          <Input value={reportName} onChange={e => setReportName(e.target.value)} placeholder={selectedTemplate.template_name} className="mt-1" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Formato</label>
                            <Select value={exportFormat} onValueChange={v => setExportFormat(v as ExportFormat)}>
                              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pdf">PDF — Informe oficial</SelectItem>
                                <SelectItem value="excel">Excel — Datos detallados</SelectItem>
                                <SelectItem value="csv">CSV — Datos planos</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Periodo</label>
                            <Input value={period} onChange={e => setPeriod(e.target.value)} placeholder="Ej: 2025" className="mt-1" />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Secciones ({selectedTemplate.sections.length})</label>
                          <div className="flex flex-wrap gap-1">
                            {selectedTemplate.sections.map(s => (
                              <Badge key={s} variant="outline" className="text-[9px]">{s.replace(/_/g, ' ')}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Button onClick={handleGenerate} disabled={generating} className="w-full gap-2">
                      {generating ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Generando informe regulatorio...</>
                      ) : (
                        <><Sparkles className="h-4 w-4" /> Generar Informe Regulatorio con IA</>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </TabsContent>

            {/* === HISTORY === */}
            <TabsContent value="history" className="mt-3">
              <ScrollArea className="h-[480px]">
                {reports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <History className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Sin informes regulatorios generados</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reports.map(report => {
                      const reviewCfg = REVIEW_STATUS_CONFIG[report.review_status || 'draft'];
                      return (
                        <Card key={report.id} className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {FRAMEWORK_ICONS[report.regulatory_framework || '']}
                                <p className="text-sm font-medium truncate">{report.report_name}</p>
                                <Badge className={cn("text-[10px] gap-1", reviewCfg?.color)}>
                                  {reviewCfg?.icon}
                                  {reviewCfg?.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(report.created_at), { locale: es, addSuffix: true })}
                                </span>
                                {report.disclaimer && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 text-amber-600 border-amber-300">
                                    <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Disclaimer
                                  </Badge>
                                )}
                                {Object.entries(report.data_sources || {}).map(([mod, ds]) => (
                                  <DataSourceBadge key={mod} source={ds.source as any} compact className="scale-90" />
                                )).slice(0, 2)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { handlePreview(report); setActiveTab('preview'); }}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleExport(report, 'pdf')}>
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* === PREVIEW === */}
            <TabsContent value="preview" className="mt-3">
              {!previewReport ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Eye className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Selecciona un informe del historial para previsualizarlo</p>
                </div>
              ) : (
                <ScrollArea className="h-[480px]">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{previewReport.report_name}</h3>
                        {(() => {
                          const cfg = REVIEW_STATUS_CONFIG[previewReport.review_status || 'draft'];
                          return <Badge className={cn("gap-1", cfg?.color)}>{cfg?.icon}{cfg?.label}</Badge>;
                        })()}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <span>Marco: {previewReport.regulatory_framework}</span>
                        <span>Formato: {previewReport.format?.toUpperCase()}</span>
                        <span>Generado: {new Date(previewReport.created_at).toLocaleString('es-ES')}</span>
                        <span>Tiempo: {previewReport.generation_time_ms}ms</span>
                      </div>

                      {previewReport.disclaimer && (
                        <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 flex items-start gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          {previewReport.disclaimer}
                        </div>
                      )}
                    </div>

                    {/* Data Sources */}
                    <div className="p-3 rounded-lg border">
                      <h4 className="text-xs font-semibold mb-2">Origen de Datos</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(previewReport.data_sources || {}).map(([mod, ds]) => (
                          <div key={mod} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/50">
                            <span className="capitalize">{mod.replace(/_/g, ' ')}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">{ds.count}</span>
                              <DataSourceBadge source={ds.source as any} compact />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI Content Sections */}
                    {(() => {
                      const aiContent = (previewReport.content_snapshot as any)?.ai_content;
                      if (!aiContent) return null;
                      return (
                        <>
                          {aiContent.executive_summary && (
                            <div className="p-3 rounded-lg border bg-primary/5">
                              <h4 className="text-xs font-semibold mb-1">Resumen Ejecutivo</h4>
                              <p className="text-xs text-muted-foreground whitespace-pre-line">{aiContent.executive_summary}</p>
                            </div>
                          )}
                          {aiContent.compliance_score !== undefined && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">Compliance Score:</span>
                              <Badge variant={aiContent.compliance_score >= 70 ? 'default' : 'destructive'}>
                                {aiContent.compliance_score}/100
                              </Badge>
                              <Badge variant="outline">{aiContent.overall_risk_level?.toUpperCase()}</Badge>
                            </div>
                          )}
                          {Array.isArray(aiContent.findings) && aiContent.findings.length > 0 && (
                            <div className="p-3 rounded-lg border">
                              <h4 className="text-xs font-semibold mb-2">Hallazgos ({aiContent.findings.length})</h4>
                              <div className="space-y-1.5">
                                {aiContent.findings.slice(0, 5).map((f: any, i: number) => (
                                  <div key={i} className="text-xs p-2 rounded bg-muted/50 flex items-start gap-2">
                                    <Badge variant={f.severity === 'critical' ? 'destructive' : f.severity === 'high' ? 'destructive' : 'secondary'} className="text-[9px] shrink-0">
                                      {f.severity}
                                    </Badge>
                                    <div>
                                      <p>{f.description}</p>
                                      <p className="text-muted-foreground mt-0.5">→ {f.recommendation}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* Review Actions */}
                    <Separator />
                    <div className="p-3 rounded-lg border space-y-3">
                      <h4 className="text-xs font-semibold">Acciones de Revisión</h4>
                      <Textarea
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                        placeholder="Comentario de revisión (opcional)..."
                        className="text-xs h-16"
                      />
                      <div className="flex flex-wrap gap-2">
                        {previewReport.review_status === 'draft' && (
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(previewReport.id, 'reviewed')} className="gap-1 text-xs">
                            <Eye className="h-3 w-3" /> Marcar Revisado
                          </Button>
                        )}
                        {(previewReport.review_status === 'draft' || previewReport.review_status === 'reviewed') && (
                          <Button size="sm" onClick={() => handleStatusChange(previewReport.id, 'approved')} className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700">
                            <CheckCircle className="h-3 w-3" /> Aprobar
                          </Button>
                        )}
                        {previewReport.review_status !== 'rejected' && previewReport.review_status !== 'archived' && (
                          <Button size="sm" variant="destructive" onClick={() => handleStatusChange(previewReport.id, 'rejected')} className="gap-1 text-xs">
                            <XCircle className="h-3 w-3" /> Rechazar
                          </Button>
                        )}
                        {previewReport.review_status === 'approved' && (
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(previewReport.id, 'archived')} className="gap-1 text-xs">
                            <Archive className="h-3 w-3" /> Archivar
                          </Button>
                        )}
                      </div>

                      {/* Export */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button size="sm" variant="outline" onClick={() => handleExport(previewReport, 'pdf')} className="gap-1 text-xs">
                          <Download className="h-3 w-3" /> PDF
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleExport(previewReport, 'excel')} className="gap-1 text-xs">
                          <Download className="h-3 w-3" /> Excel
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleExport(previewReport, 'csv')} className="gap-1 text-xs">
                          <Download className="h-3 w-3" /> CSV
                        </Button>
                      </div>
                    </div>

                    {/* Review History */}
                    {reviewHistory.length > 0 && (
                      <div className="p-3 rounded-lg border">
                        <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> Historial de Revisión
                        </h4>
                        <div className="space-y-1.5">
                          {reviewHistory.map(r => (
                            <div key={r.id} className="text-xs p-2 rounded bg-muted/50 flex items-start gap-2">
                              <Clock className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                              <div>
                                <span className="font-medium">{r.action}</span>
                                {r.previous_status && r.new_status && (
                                  <span className="text-muted-foreground"> · {r.previous_status} → {r.new_status}</span>
                                )}
                                {r.comments && <p className="text-muted-foreground mt-0.5">{r.comments}</p>}
                                <p className="text-muted-foreground/70 mt-0.5">
                                  {formatDistanceToNow(new Date(r.created_at), { locale: es, addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default ComplianceReportingPanel;
