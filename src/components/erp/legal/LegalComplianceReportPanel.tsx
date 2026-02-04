/**
 * LegalComplianceReportPanel - Fase 9
 * Panel para generar reportes de estado de cumplimiento global
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  RefreshCw,
  Calendar,
  Globe,
  FileText,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Building2,
  Users,
  Database,
  Lock,
  CreditCard,
  Scale
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LegalComplianceReportPanelProps {
  companyId: string;
}

interface ComplianceCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  score: number;
  trend: 'up' | 'down' | 'stable';
  regulations: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  lastAudit: string;
}

interface GeneratedReport {
  id: string;
  title: string;
  period: string;
  generatedAt: string;
  status: 'draft' | 'final' | 'delivered';
  overallScore: number;
  format: 'pdf' | 'docx' | 'xlsx';
}

export function LegalComplianceReportPanel({ companyId }: LegalComplianceReportPanelProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState('q4-2025');
  const [isGenerating, setIsGenerating] = useState(false);

  const [categories] = useState<ComplianceCategory[]>([
    {
      id: 'data_protection',
      name: 'Protección de Datos',
      icon: Lock,
      score: 92,
      trend: 'up',
      regulations: 8,
      compliant: 7,
      partial: 1,
      nonCompliant: 0,
      lastAudit: '2025-01-15'
    },
    {
      id: 'labor',
      name: 'Laboral',
      icon: Users,
      score: 88,
      trend: 'stable',
      regulations: 12,
      compliant: 10,
      partial: 2,
      nonCompliant: 0,
      lastAudit: '2025-01-10'
    },
    {
      id: 'corporate',
      name: 'Mercantil',
      icon: Building2,
      score: 95,
      trend: 'up',
      regulations: 6,
      compliant: 6,
      partial: 0,
      nonCompliant: 0,
      lastAudit: '2025-01-20'
    },
    {
      id: 'tax',
      name: 'Fiscal',
      icon: CreditCard,
      score: 85,
      trend: 'down',
      regulations: 15,
      compliant: 12,
      partial: 2,
      nonCompliant: 1,
      lastAudit: '2025-01-05'
    },
    {
      id: 'banking',
      name: 'Bancario/Financiero',
      icon: Database,
      score: 82,
      trend: 'stable',
      regulations: 10,
      compliant: 7,
      partial: 3,
      nonCompliant: 0,
      lastAudit: '2025-01-18'
    },
    {
      id: 'aml',
      name: 'AML/KYC',
      icon: Shield,
      score: 90,
      trend: 'up',
      regulations: 5,
      compliant: 4,
      partial: 1,
      nonCompliant: 0,
      lastAudit: '2025-01-22'
    }
  ]);

  const [generatedReports] = useState<GeneratedReport[]>([
    {
      id: '1',
      title: 'Informe Compliance Global Q4 2025',
      period: 'Q4 2025',
      generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      status: 'final',
      overallScore: 88,
      format: 'pdf'
    },
    {
      id: '2',
      title: 'Informe GDPR Mensual - Enero 2026',
      period: 'Enero 2026',
      generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      status: 'delivered',
      overallScore: 92,
      format: 'pdf'
    },
    {
      id: '3',
      title: 'Auditoría MiFID II Anual 2025',
      period: 'Anual 2025',
      generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
      status: 'final',
      overallScore: 85,
      format: 'docx'
    }
  ]);

  const overallScore = Math.round(
    categories.reduce((acc, cat) => acc + cat.score, 0) / categories.length
  );

  const handleGenerateReport = useCallback(async (reportType: string) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-ai-advisor', {
        body: {
          action: 'generate_compliance_report',
          context: { companyId },
          params: {
            reportType,
            period: selectedPeriod,
            categories: categories.map(c => c.id)
          }
        }
      });

      if (error) throw error;

      toast.success('Reporte de compliance generado correctamente');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Error al generar reporte');
    } finally {
      setIsGenerating(false);
    }
  }, [companyId, selectedPeriod, categories]);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4 rounded-full bg-muted" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-amber-600';
    return 'text-red-600';
  };

  const getStatusBadge = (status: GeneratedReport['status']) => {
    const config = {
      draft: { label: 'Borrador', variant: 'secondary' as const },
      final: { label: 'Final', variant: 'default' as const },
      delivered: { label: 'Entregado', variant: 'outline' as const }
    };
    return <Badge variant={config[status].variant}>{config[status].label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Reportes de Compliance</h2>
            <p className="text-sm text-muted-foreground">
              Estado de cumplimiento normativo global
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="q1-2026">Q1 2026</SelectItem>
              <SelectItem value="q4-2025">Q4 2025</SelectItem>
              <SelectItem value="q3-2025">Q3 2025</SelectItem>
              <SelectItem value="annual-2025">Anual 2025</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => handleGenerateReport('full')}
            disabled={isGenerating}
            className="bg-gradient-to-r from-emerald-500 to-green-500 text-white"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generar Reporte
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Overall Score Card */}
      <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Puntuación Global de Compliance</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-bold ${getScoreColor(overallScore)}`}>
                  {overallScore}%
                </span>
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {categories.reduce((acc, c) => acc + c.regulations, 0)} regulaciones monitorizadas
              </p>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold text-green-600">
                    {categories.reduce((acc, c) => acc + c.compliant, 0)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Cumple</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span className="text-2xl font-bold text-amber-600">
                    {categories.reduce((acc, c) => acc + c.partial, 0)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Parcial</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-2xl font-bold text-red-600">
                    {categories.reduce((acc, c) => acc + c.nonCompliant, 0)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">No cumple</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-2">
            <Shield className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Scale className="h-4 w-4" />
            Por Categoría
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="h-4 w-4" />
            Reportes Generados
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Card key={category.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{category.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {category.regulations} regulaciones
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(category.trend)}
                        <span className={`font-bold ${getScoreColor(category.score)}`}>
                          {category.score}%
                        </span>
                      </div>
                    </div>
                    <Progress value={category.score} className="h-2 mb-3" />
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          {category.compliant}
                        </span>
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                          {category.partial}
                        </span>
                        <span className="flex items-center gap-1">
                          <XCircle className="h-3 w-3 text-red-500" />
                          {category.nonCompliant}
                        </span>
                      </div>
                      <span className="text-muted-foreground">
                        Última: {format(new Date(category.lastAudit), 'dd/MM', { locale: es })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="divide-y">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <div key={category.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-primary/10">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium text-lg">{category.name}</p>
                              <div className="flex items-center gap-2">
                                {getTrendIcon(category.trend)}
                                <span className={`text-2xl font-bold ${getScoreColor(category.score)}`}>
                                  {category.score}%
                                </span>
                              </div>
                            </div>
                            <Progress value={category.score} className="h-2 mb-3" />
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground text-xs">Regulaciones</p>
                                <p className="font-medium">{category.regulations}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Cumple</p>
                                <p className="font-medium text-green-600">{category.compliant}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Parcial</p>
                                <p className="font-medium text-amber-600">{category.partial}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">No cumple</p>
                                <p className="font-medium text-red-600">{category.nonCompliant}</p>
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            Ver Detalle
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generated Reports Tab */}
        <TabsContent value="reports" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reportes Generados</CardTitle>
              <CardDescription>Historial de reportes de compliance</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <div className="space-y-3">
                  {generatedReports.map((report) => (
                    <div
                      key={report.id}
                      className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-primary" />
                            <p className="font-medium">{report.title}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Período: {report.period} | Generado: {format(new Date(report.generatedAt), 'PPp', { locale: es })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${getScoreColor(report.overallScore)}`}>
                            {report.overallScore}%
                          </span>
                          {getStatusBadge(report.status)}
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-1" />
                            {report.format.toUpperCase()}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LegalComplianceReportPanel;
