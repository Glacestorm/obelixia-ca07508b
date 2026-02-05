/**
 * ESGDashboardPanel - Complete ESG Reporting Dashboard
 * Fase 5: CSRD/ESRS Compliance
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  RefreshCw, 
  Leaf, 
  Factory,
  Users,
  Building2,
  FileText,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  Download,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { useESGReporting } from '@/hooks/erp/esg/useESGReporting';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from 'recharts';

interface ESGDashboardPanelProps {
  companyId: string;
  fiscalYear: string;
  className?: string;
}

const COLORS = {
  scope1: '#ef4444',
  scope2: '#f59e0b',
  scope3: '#3b82f6',
  environmental: '#22c55e',
  social: '#8b5cf6',
  governance: '#06b6d4'
};

export function ESGDashboardPanel({ 
  companyId, 
  fiscalYear,
  className 
}: ESGDashboardPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedReportType, setSelectedReportType] = useState<'CSRD' | 'GRI' | 'TCFD' | 'SASB'>('CSRD');
  const [analysisResult, setAnalysisResult] = useState<Record<string, unknown> | null>(null);
  const [taxonomyResult, setTaxonomyResult] = useState<Record<string, unknown> | null>(null);

  const {
    isLoading,
    emissions,
    targets,
    reports,
    error,
    fetchEmissions,
    fetchTargets,
    fetchReports,
    generateCSRDReport,
    analyzeEmissions,
    calculateTaxonomyAlignment,
    assessDoubleMateriality
  } = useESGReporting();

  const context = { companyId, fiscalYear };

  useEffect(() => {
    if (companyId && fiscalYear) {
      fetchEmissions(context);
      fetchTargets(companyId);
      fetchReports(context);
    }
  }, [companyId, fiscalYear]);

  const handleGenerateReport = useCallback(async () => {
    const result = await generateCSRDReport(context, selectedReportType);
    if (result) {
      toast.success(`Informe ${selectedReportType} generado`);
    }
  }, [context, selectedReportType, generateCSRDReport]);

  const handleAnalyzeEmissions = useCallback(async () => {
    const result = await analyzeEmissions(context);
    if (result) {
      setAnalysisResult(result);
      toast.success('Análisis de emisiones completado');
    }
  }, [context, analyzeEmissions]);

  const handleCalculateTaxonomy = useCallback(async () => {
    const result = await calculateTaxonomyAlignment(context);
    if (result) {
      setTaxonomyResult(result);
      toast.success('Análisis Taxonomía UE completado');
    }
  }, [context, calculateTaxonomyAlignment]);

  // Calculate totals
  const totalEmissions = emissions.reduce((sum, e) => sum + (e.total_emissions || 0), 0);
  const scope1Total = emissions.reduce((sum, e) => sum + (e.scope1_total || 0), 0);
  const scope2Total = emissions.reduce((sum, e) => sum + (e.scope2_market_based || e.scope2_location_based || 0), 0);
  const scope3Total = emissions.reduce((sum, e) => sum + (e.scope3_total || 0), 0);

  const emissionsPieData = [
    { name: 'Scope 1', value: scope1Total, color: COLORS.scope1 },
    { name: 'Scope 2', value: scope2Total, color: COLORS.scope2 },
    { name: 'Scope 3', value: scope3Total, color: COLORS.scope3 }
  ].filter(d => d.value > 0);

  const targetProgress = targets.map(t => ({
    name: t.target_name.substring(0, 20),
    progress: t.progress_percentage || 0,
    target: 100,
    onTrack: t.on_track
  }));

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">ESG Reporting Suite</CardTitle>
              <p className="text-xs text-muted-foreground">CSRD/ESRS Compliance • {fiscalYear}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              fetchEmissions(context);
              fetchTargets(companyId);
              fetchReports(context);
            }}
            disabled={isLoading}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="overview" className="text-xs">
              <BarChart3 className="h-3 w-3 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="emissions" className="text-xs">
              <Factory className="h-3 w-3 mr-1" />
              Emisiones
            </TabsTrigger>
            <TabsTrigger value="targets" className="text-xs">
              <Target className="h-3 w-3 mr-1" />
              Objetivos
            </TabsTrigger>
            <TabsTrigger value="taxonomy" className="text-xs">
              <Building2 className="h-3 w-3 mr-1" />
              Taxonomía
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Informes
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {/* KPI Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Factory className="h-4 w-4 text-red-600" />
                        <span className="text-xs font-medium">Scope 1</span>
                      </div>
                      <p className="text-lg font-bold text-red-700">{scope1Total.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">tCO2e directas</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Factory className="h-4 w-4 text-amber-600" />
                        <span className="text-xs font-medium">Scope 2</span>
                      </div>
                      <p className="text-lg font-bold text-amber-700">{scope2Total.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">tCO2e electricidad</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Factory className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-medium">Scope 3</span>
                      </div>
                      <p className="text-lg font-bold text-blue-700">{scope3Total.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">tCO2e cadena valor</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Emissions Pie Chart */}
                {emissionsPieData.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Distribución de Emisiones</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={emissionsPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={70}
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {emissionsPieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `${value.toLocaleString()} tCO2e`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="text-center mt-2">
                        <p className="text-2xl font-bold">{totalEmissions.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Total tCO2e</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAnalyzeEmissions}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Análisis IA
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCalculateTaxonomy}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    <Building2 className="h-3 w-3 mr-1" />
                    Taxonomía UE
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* EMISSIONS TAB */}
          <TabsContent value="emissions" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {emissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Factory className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay datos de emisiones registrados</p>
                    <Button variant="outline" size="sm" className="mt-3">
                      Registrar Emisiones
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Monthly trend chart */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Evolución Mensual</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={emissions}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="reporting_month" tickFormatter={(m) => `M${m}`} />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="scope1_total" stroke={COLORS.scope1} name="Scope 1" />
                              <Line type="monotone" dataKey="scope2_market_based" stroke={COLORS.scope2} name="Scope 2" />
                              <Line type="monotone" dataKey="scope3_total" stroke={COLORS.scope3} name="Scope 3" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Analysis Result */}
                    {analysisResult && (
                      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-green-600" />
                            Análisis IA de Emisiones
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-xs overflow-auto max-h-40 bg-background/50 p-2 rounded">
                            {JSON.stringify(analysisResult, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TARGETS TAB */}
          <TabsContent value="targets" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {targets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay objetivos de reducción definidos</p>
                    <Button variant="outline" size="sm" className="mt-3">
                      Crear Objetivo SBTi
                    </Button>
                  </div>
                ) : (
                  targets.map((target) => (
                    <Card key={target.id} className={cn(
                      "border-l-4",
                      target.on_track ? "border-l-green-500" : "border-l-amber-500"
                    )}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{target.target_name}</span>
                            {target.sbti_validated && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                SBTi
                              </Badge>
                            )}
                          </div>
                          {target.on_track ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progreso: {target.progress_percentage?.toFixed(1) || 0}%</span>
                            <span>Meta: {target.target_year}</span>
                          </div>
                          <Progress value={target.progress_percentage || 0} className="h-2" />
                        </div>
                        <div className="flex justify-between mt-2 text-xs">
                          <span>Base: {target.baseline_emissions?.toLocaleString()} tCO2e</span>
                          <span>Objetivo: -{target.reduction_percentage}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAXONOMY TAB */}
          <TabsContent value="taxonomy" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                <Card className="bg-blue-50/50 dark:bg-blue-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Taxonomía de la UE</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Evalúa la alineación de actividades económicas con los 6 objetivos ambientales de la UE.
                    </p>
                    <Button 
                      onClick={handleCalculateTaxonomy} 
                      disabled={isLoading}
                      className="w-full"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Calcular Alineación
                    </Button>
                  </CardContent>
                </Card>

                {taxonomyResult && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Resultado del Análisis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs overflow-auto max-h-60 bg-muted/50 p-2 rounded">
                        {JSON.stringify(taxonomyResult, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* REPORTS TAB */}
          <TabsContent value="reports" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {/* Generate Report */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="font-medium">Generar Informe ESG</span>
                    </div>
                    <div className="flex gap-2">
                      <Select value={selectedReportType} onValueChange={(v) => setSelectedReportType(v as typeof selectedReportType)}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CSRD">CSRD/ESRS</SelectItem>
                          <SelectItem value="GRI">GRI Standards</SelectItem>
                          <SelectItem value="TCFD">TCFD</SelectItem>
                          <SelectItem value="SASB">SASB</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={handleGenerateReport} disabled={isLoading}>
                        <Sparkles className="h-4 w-4 mr-1" />
                        Generar
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Reports List */}
                <div className="space-y-2">
                  {reports.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <p className="text-sm">No hay informes generados</p>
                    </div>
                  ) : (
                    reports.map((report) => (
                      <Card key={report.id}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{report.report_title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {report.report_type}
                                </Badge>
                                <Badge 
                                  variant={report.status === 'published' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {report.status}
                                </Badge>
                                {report.compliance_score && (
                                  <span className="text-xs text-muted-foreground">
                                    Compliance: {report.compliance_score}%
                                  </span>
                                )}
                              </div>
                            </div>
                            {report.pdf_url && (
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-3 p-2 bg-destructive/10 rounded text-xs text-destructive flex items-center gap-2">
            <AlertTriangle className="h-3 w-3" />
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ESGDashboardPanel;
