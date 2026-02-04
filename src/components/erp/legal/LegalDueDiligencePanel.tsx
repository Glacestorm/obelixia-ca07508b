/**
 * LegalDueDiligencePanel - Fase 9
 * Panel para generar reportes de Due Diligence para M&A y operaciones corporativas
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  FileText,
  Building2,
  Users,
  Scale,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
  FileIcon,
  Briefcase,
  TrendingUp,
  Globe
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LegalDueDiligencePanelProps {
  companyId: string;
}

interface DueDiligenceArea {
  id: string;
  name: string;
  icon: React.ElementType;
  status: 'not_started' | 'in_progress' | 'completed' | 'issues_found';
  progress: number;
  findings: number;
  criticalIssues: number;
}

interface DueDiligenceReport {
  id: string;
  targetCompany: string;
  transactionType: string;
  status: 'draft' | 'in_progress' | 'completed' | 'delivered';
  progress: number;
  createdAt: string;
  areas: DueDiligenceArea[];
  riskScore: number;
  dealValue?: string;
}

export function LegalDueDiligencePanel({ companyId }: LegalDueDiligencePanelProps) {
  const [activeTab, setActiveTab] = useState('reports');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DueDiligenceReport | null>(null);
  
  // Form state for new DD
  const [newDD, setNewDD] = useState({
    targetCompany: '',
    transactionType: 'acquisition',
    dealValue: '',
    jurisdictions: [] as string[],
    scope: ''
  });

  const [reports] = useState<DueDiligenceReport[]>([
    {
      id: '1',
      targetCompany: 'TechCorp Solutions S.L.',
      transactionType: 'Adquisición',
      status: 'in_progress',
      progress: 65,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      riskScore: 72,
      dealValue: '€12.5M',
      areas: [
        { id: 'corporate', name: 'Estructura Societaria', icon: Building2, status: 'completed', progress: 100, findings: 3, criticalIssues: 0 },
        { id: 'labor', name: 'Laboral', icon: Users, status: 'completed', progress: 100, findings: 5, criticalIssues: 1 },
        { id: 'contracts', name: 'Contractual', icon: Scale, status: 'in_progress', progress: 60, findings: 2, criticalIssues: 0 },
        { id: 'compliance', name: 'Compliance', icon: Shield, status: 'in_progress', progress: 45, findings: 1, criticalIssues: 0 },
        { id: 'ip', name: 'Propiedad Intelectual', icon: FileText, status: 'not_started', progress: 0, findings: 0, criticalIssues: 0 },
        { id: 'tax', name: 'Fiscal', icon: Briefcase, status: 'not_started', progress: 0, findings: 0, criticalIssues: 0 }
      ]
    },
    {
      id: '2',
      targetCompany: 'DataFlow Analytics',
      transactionType: 'Fusión',
      status: 'completed',
      progress: 100,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
      riskScore: 85,
      dealValue: '€28M',
      areas: [
        { id: 'corporate', name: 'Estructura Societaria', icon: Building2, status: 'completed', progress: 100, findings: 2, criticalIssues: 0 },
        { id: 'labor', name: 'Laboral', icon: Users, status: 'completed', progress: 100, findings: 4, criticalIssues: 0 },
        { id: 'contracts', name: 'Contractual', icon: Scale, status: 'completed', progress: 100, findings: 6, criticalIssues: 1 },
        { id: 'compliance', name: 'Compliance', icon: Shield, status: 'completed', progress: 100, findings: 3, criticalIssues: 0 },
        { id: 'ip', name: 'Propiedad Intelectual', icon: FileText, status: 'completed', progress: 100, findings: 1, criticalIssues: 0 },
        { id: 'tax', name: 'Fiscal', icon: Briefcase, status: 'completed', progress: 100, findings: 5, criticalIssues: 1 }
      ]
    }
  ]);

  const handleGenerateDD = useCallback(async () => {
    if (!newDD.targetCompany) {
      toast.error('Indica el nombre de la empresa objetivo');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-ai-advisor', {
        body: {
          action: 'generate_due_diligence',
          context: { companyId },
          params: {
            targetCompany: newDD.targetCompany,
            transactionType: newDD.transactionType,
            dealValue: newDD.dealValue,
            jurisdictions: newDD.jurisdictions,
            scope: newDD.scope
          }
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Due Diligence iniciado correctamente');
        setNewDD({
          targetCompany: '',
          transactionType: 'acquisition',
          dealValue: '',
          jurisdictions: [],
          scope: ''
        });
        setActiveTab('reports');
      }
    } catch (error) {
      console.error('Error generating DD:', error);
      toast.error('Error al iniciar Due Diligence');
    } finally {
      setIsGenerating(false);
    }
  }, [companyId, newDD]);

  const handleExportReport = async (format: 'pdf' | 'docx' | 'xlsx') => {
    if (!selectedReport) return;
    
    toast.info(`Exportando reporte en formato ${format.toUpperCase()}...`);
    // Simulated export - in production would call edge function
    setTimeout(() => {
      toast.success(`Reporte exportado correctamente como ${format.toUpperCase()}`);
    }, 2000);
  };

  const getStatusBadge = (status: DueDiligenceReport['status']) => {
    const config = {
      draft: { label: 'Borrador', variant: 'secondary' as const },
      in_progress: { label: 'En Progreso', variant: 'default' as const },
      completed: { label: 'Completado', variant: 'default' as const },
      delivered: { label: 'Entregado', variant: 'outline' as const }
    };
    return <Badge variant={config[status].variant}>{config[status].label}</Badge>;
  };

  const getAreaStatusIcon = (status: DueDiligenceArea['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'issues_found':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <Search className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Due Diligence Legal</h2>
            <p className="text-sm text-muted-foreground">
              Reportes para M&A y operaciones corporativas
            </p>
          </div>
        </div>
        <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white">
          Fase 9
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="h-4 w-4" />
            Reportes
          </TabsTrigger>
          <TabsTrigger value="new" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Nuevo DD
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Plantillas
          </TabsTrigger>
        </TabsList>

        {/* Reports List */}
        <TabsContent value="reports" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reports List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reportes de Due Diligence</CardTitle>
                <CardDescription>Selecciona un reporte para ver detalles</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {reports.map((report) => (
                      <div
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedReport?.id === report.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{report.targetCompany}</p>
                            <p className="text-sm text-muted-foreground">
                              {report.transactionType} • {report.dealValue}
                            </p>
                          </div>
                          {getStatusBadge(report.status)}
                        </div>
                        <Progress value={report.progress} className="h-1.5 mb-2" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{report.progress}% completado</span>
                          <span>Risk Score: {report.riskScore}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Report Detail */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Detalle del Reporte</span>
                  {selectedReport && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleExportReport('pdf')}>
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleExportReport('docx')}>
                        <FileIcon className="h-4 w-4 mr-1" />
                        DOCX
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedReport ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-xs text-muted-foreground">Empresa Objetivo</p>
                        <p className="font-medium">{selectedReport.targetCompany}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Tipo Operación</p>
                        <p className="font-medium">{selectedReport.transactionType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Valor del Deal</p>
                        <p className="font-medium">{selectedReport.dealValue}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Risk Score</p>
                        <p className={`font-medium ${
                          selectedReport.riskScore >= 80 ? 'text-green-600' :
                          selectedReport.riskScore >= 60 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {selectedReport.riskScore}%
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Áreas de Análisis</p>
                      {selectedReport.areas.map((area) => {
                        const Icon = area.icon;
                        return (
                          <div key={area.id} className="flex items-center gap-3 p-3 rounded-lg border">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">{area.name}</span>
                                {getAreaStatusIcon(area.status)}
                              </div>
                              <Progress value={area.progress} className="h-1" />
                            </div>
                            <div className="text-right text-xs">
                              <p>{area.findings} hallazgos</p>
                              {area.criticalIssues > 0 && (
                                <p className="text-red-500">{area.criticalIssues} críticos</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Selecciona un reporte para ver detalles</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* New Due Diligence */}
        <TabsContent value="new" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                Iniciar Nuevo Due Diligence
              </CardTitle>
              <CardDescription>
                Configura los parámetros para el análisis legal de la operación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Empresa Objetivo *</Label>
                  <Input
                    placeholder="Nombre de la empresa a analizar"
                    value={newDD.targetCompany}
                    onChange={(e) => setNewDD(prev => ({ ...prev, targetCompany: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Operación</Label>
                  <Select
                    value={newDD.transactionType}
                    onValueChange={(value) => setNewDD(prev => ({ ...prev, transactionType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="acquisition">Adquisición</SelectItem>
                      <SelectItem value="merger">Fusión</SelectItem>
                      <SelectItem value="joint_venture">Joint Venture</SelectItem>
                      <SelectItem value="investment">Inversión</SelectItem>
                      <SelectItem value="asset_purchase">Compra de Activos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor Estimado de la Operación</Label>
                  <Input
                    placeholder="€0.00"
                    value={newDD.dealValue}
                    onChange={(e) => setNewDD(prev => ({ ...prev, dealValue: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Jurisdicciones</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar jurisdicciones" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ES">🇪🇸 España</SelectItem>
                      <SelectItem value="AD">🇦🇩 Andorra</SelectItem>
                      <SelectItem value="EU">🇪🇺 Unión Europea</SelectItem>
                      <SelectItem value="UK">🇬🇧 Reino Unido</SelectItem>
                      <SelectItem value="US">🇺🇸 Estados Unidos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Alcance del Análisis</Label>
                <Textarea
                  placeholder="Describe el alcance específico del due diligence, áreas de enfoque especial, exclusiones..."
                  value={newDD.scope}
                  onChange={(e) => setNewDD(prev => ({ ...prev, scope: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-violet-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-violet-700 dark:text-violet-300">
                      Análisis con IA
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      El sistema analizará automáticamente documentación societaria, contratos, 
                      compliance, situación laboral, propiedad intelectual y fiscalidad utilizando 
                      modelos de IA especializados en derecho mercantil multi-jurisdiccional.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setActiveTab('reports')}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleGenerateDD}
                  disabled={isGenerating || !newDD.targetCompany}
                  className="bg-gradient-to-r from-violet-500 to-purple-500 text-white"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Iniciar Due Diligence
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'DD Completo - M&A', areas: 6, icon: Building2, description: 'Análisis integral para fusiones y adquisiciones' },
              { name: 'DD Express - Inversión', areas: 4, icon: TrendingUp, description: 'Análisis acelerado para rondas de inversión' },
              { name: 'DD Laboral', areas: 2, icon: Users, description: 'Enfocado en relaciones laborales y contratos' },
              { name: 'DD Compliance', areas: 3, icon: Shield, description: 'Cumplimiento normativo y regulatorio' },
              { name: 'DD Internacional', areas: 5, icon: Globe, description: 'Operaciones transfronterizas multi-jurisdicción' },
              { name: 'DD Tecnológico', areas: 4, icon: FileText, description: 'IP, software, licencias y datos' }
            ].map((template, index) => {
              const Icon = template.icon;
              return (
                <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{template.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {template.description}
                        </p>
                        <Badge variant="outline" className="mt-2">
                          {template.areas} áreas de análisis
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LegalDueDiligencePanel;
