/**
 * LegalRiskReportPanel - Fase 9
 * Panel para reportes de evaluación de riesgos legales
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  Map,
  Target,
  Zap,
  Users,
  Building2,
  FileText,
  Scale,
  Lock,
  Globe,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LegalRiskReportPanelProps {
  companyId: string;
}

interface RiskItem {
  id: string;
  title: string;
  category: string;
  icon: React.ElementType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  impact: number;
  riskScore: number;
  trend: 'up' | 'down' | 'stable';
  jurisdiction: string;
  mitigation: string;
  status: 'identified' | 'mitigating' | 'monitored' | 'closed';
}

interface RiskCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  riskCount: number;
  avgScore: number;
  trend: 'up' | 'down' | 'stable';
}

export function LegalRiskReportPanel({ companyId }: LegalRiskReportPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isGenerating, setIsGenerating] = useState(false);

  const [risks] = useState<RiskItem[]>([
    {
      id: '1',
      title: 'Incumplimiento parcial AI Act',
      category: 'Regulatorio',
      icon: Shield,
      severity: 'high',
      probability: 65,
      impact: 85,
      riskScore: 75,
      trend: 'up',
      jurisdiction: 'EU',
      mitigation: 'Implementar evaluaciones de impacto algorítmico para sistemas de IA de alto riesgo',
      status: 'mitigating'
    },
    {
      id: '2',
      title: 'Exposición GDPR transferencias terceros países',
      category: 'Protección de Datos',
      icon: Lock,
      severity: 'medium',
      probability: 45,
      impact: 70,
      riskScore: 58,
      trend: 'stable',
      jurisdiction: 'EU',
      mitigation: 'Revisar cláusulas contractuales tipo y TIA para proveedores fuera del EEE',
      status: 'monitored'
    },
    {
      id: '3',
      title: 'Litigio laboral potencial - Clasificación freelancers',
      category: 'Laboral',
      icon: Users,
      severity: 'high',
      probability: 55,
      impact: 80,
      riskScore: 68,
      trend: 'up',
      jurisdiction: 'ES',
      mitigation: 'Auditar contratos de prestación de servicios y evaluar reclasificación',
      status: 'identified'
    },
    {
      id: '4',
      title: 'Riesgo fiscal retenciones internacionales',
      category: 'Fiscal',
      icon: Building2,
      severity: 'medium',
      probability: 40,
      impact: 60,
      riskScore: 50,
      trend: 'down',
      jurisdiction: 'INT',
      mitigation: 'Verificar convenios de doble imposición y procedimientos de retención',
      status: 'monitored'
    },
    {
      id: '5',
      title: 'Compliance MiFID II - Mejor ejecución',
      category: 'Bancario',
      icon: Scale,
      severity: 'medium',
      probability: 35,
      impact: 75,
      riskScore: 55,
      trend: 'stable',
      jurisdiction: 'EU',
      mitigation: 'Revisar políticas de mejor ejecución y documentación de órdenes',
      status: 'monitored'
    },
    {
      id: '6',
      title: 'Cláusulas abusivas en contratos consumidor',
      category: 'Contractual',
      icon: FileText,
      severity: 'low',
      probability: 25,
      impact: 45,
      riskScore: 35,
      trend: 'down',
      jurisdiction: 'ES',
      mitigation: 'Auditar términos y condiciones de servicios B2C',
      status: 'closed'
    }
  ]);

  const categories: RiskCategory[] = [
    { id: 'regulatory', name: 'Regulatorio', icon: Shield, riskCount: 3, avgScore: 65, trend: 'up' },
    { id: 'data', name: 'Protección de Datos', icon: Lock, riskCount: 2, avgScore: 58, trend: 'stable' },
    { id: 'labor', name: 'Laboral', icon: Users, riskCount: 2, avgScore: 68, trend: 'up' },
    { id: 'tax', name: 'Fiscal', icon: Building2, riskCount: 2, avgScore: 50, trend: 'down' },
    { id: 'banking', name: 'Bancario', icon: Scale, riskCount: 1, avgScore: 55, trend: 'stable' },
    { id: 'contract', name: 'Contractual', icon: FileText, riskCount: 1, avgScore: 35, trend: 'down' }
  ];

  const overallRiskScore = Math.round(
    risks.reduce((acc, r) => acc + r.riskScore, 0) / risks.length
  );

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-ai-advisor', {
        body: {
          action: 'generate_risk_report',
          context: { companyId },
          params: { risks: risks.map(r => r.id) }
        }
      });

      if (error) throw error;
      toast.success('Reporte de riesgos generado correctamente');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al generar reporte');
    } finally {
      setIsGenerating(false);
    }
  };

  const getSeverityBadge = (severity: RiskItem['severity']) => {
    const config = {
      low: { label: 'Bajo', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      medium: { label: 'Medio', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
      high: { label: 'Alto', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
      critical: { label: 'Crítico', className: 'bg-red-500/10 text-red-600 border-red-500/20' }
    };
    return (
      <Badge variant="outline" className={config[severity].className}>
        {config[severity].label}
      </Badge>
    );
  };

  const getStatusBadge = (status: RiskItem['status']) => {
    const config = {
      identified: { label: 'Identificado', className: 'bg-blue-500/10 text-blue-600' },
      mitigating: { label: 'En Mitigación', className: 'bg-amber-500/10 text-amber-600' },
      monitored: { label: 'Monitoreado', className: 'bg-green-500/10 text-green-600' },
      closed: { label: 'Cerrado', className: 'bg-muted text-muted-foreground' }
    };
    return <Badge className={config[status].className}>{config[status].label}</Badge>;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <div className="h-4 w-4 rounded-full bg-muted" />;
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-green-600';
  };

  const getJurisdictionFlag = (code: string) => {
    const flags: Record<string, string> = {
      'ES': '🇪🇸',
      'AD': '🇦🇩',
      'EU': '🇪🇺',
      'INT': '🌍',
      'UK': '🇬🇧',
      'US': '🇺🇸'
    };
    return flags[code] || '🏳️';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Evaluación de Riesgos Legales</h2>
            <p className="text-sm text-muted-foreground">
              Análisis y monitoreo de exposición legal
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="bg-gradient-to-r from-orange-500 to-red-500 text-white"
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

      {/* Risk Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/5 border-orange-500/20 md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Índice de Riesgo Global</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-5xl font-bold ${getRiskScoreColor(overallRiskScore)}`}>
                    {overallRiskScore}
                  </span>
                  <span className="text-xl text-muted-foreground">/ 100</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {risks.filter(r => r.severity === 'critical' || r.severity === 'high').length} riesgos 
                  de alta prioridad
                </p>
              </div>
              <div className="p-4 rounded-full bg-orange-500/20">
                <Target className="h-12 w-12 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Riesgos Identificados</p>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-3xl font-bold">{risks.length}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="destructive" className="text-xs">
                {risks.filter(r => r.severity === 'critical').length} críticos
              </Badge>
              <Badge className="bg-orange-500/10 text-orange-600 text-xs">
                {risks.filter(r => r.severity === 'high').length} altos
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">En Mitigación</p>
              <Zap className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-3xl font-bold">
              {risks.filter(r => r.status === 'mitigating').length}
            </p>
            <Progress 
              value={(risks.filter(r => r.status === 'mitigating' || r.status === 'monitored' || r.status === 'closed').length / risks.length) * 100} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Map className="h-4 w-4" />
            Vista General
          </TabsTrigger>
          <TabsTrigger value="risks" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Riesgos Detalle
          </TabsTrigger>
          <TabsTrigger value="matrix" className="gap-2">
            <Target className="h-4 w-4" />
            Matriz de Riesgo
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Card key={category.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{category.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {category.riskCount} riesgos
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(category.trend)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Puntuación Media</p>
                        <p className={`text-2xl font-bold ${getRiskScoreColor(category.avgScore)}`}>
                          {category.avgScore}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        Ver <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Risks Detail Tab */}
        <TabsContent value="risks" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="divide-y">
                  {risks.map((risk) => {
                    const Icon = risk.icon;
                    return (
                      <div key={risk.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium">{risk.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-lg">{getJurisdictionFlag(risk.jurisdiction)}</span>
                                  <span className="text-sm text-muted-foreground">{risk.category}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {getSeverityBadge(risk.severity)}
                                {getStatusBadge(risk.status)}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 p-3 rounded-lg bg-muted/50 mb-3">
                              <div>
                                <p className="text-xs text-muted-foreground">Probabilidad</p>
                                <div className="flex items-center gap-2">
                                  <Progress value={risk.probability} className="h-1.5 flex-1" />
                                  <span className="text-sm font-medium">{risk.probability}%</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Impacto</p>
                                <div className="flex items-center gap-2">
                                  <Progress value={risk.impact} className="h-1.5 flex-1" />
                                  <span className="text-sm font-medium">{risk.impact}%</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Puntuación</p>
                                <p className={`text-lg font-bold ${getRiskScoreColor(risk.riskScore)}`}>
                                  {risk.riskScore}
                                </p>
                              </div>
                            </div>

                            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                              <p className="text-xs font-medium text-primary mb-1">Mitigación Propuesta</p>
                              <p className="text-sm">{risk.mitigation}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Matrix Tab */}
        <TabsContent value="matrix" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Matriz de Riesgo</CardTitle>
              <CardDescription>Visualización probabilidad vs impacto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative h-[400px] border rounded-lg p-4">
                {/* Y Axis Label */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-muted-foreground font-medium">
                  IMPACTO →
                </div>
                
                {/* X Axis Label */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-muted-foreground font-medium">
                  PROBABILIDAD →
                </div>

                {/* Grid Zones */}
                <div className="absolute inset-8 grid grid-cols-2 grid-rows-2 gap-1">
                  <div className="bg-amber-500/20 rounded flex items-center justify-center text-xs text-amber-600 font-medium">
                    Medio-Alto
                  </div>
                  <div className="bg-red-500/20 rounded flex items-center justify-center text-xs text-red-600 font-medium">
                    Crítico
                  </div>
                  <div className="bg-green-500/20 rounded flex items-center justify-center text-xs text-green-600 font-medium">
                    Bajo
                  </div>
                  <div className="bg-amber-500/20 rounded flex items-center justify-center text-xs text-amber-600 font-medium">
                    Medio
                  </div>
                </div>

                {/* Risk Points */}
                {risks.map((risk) => (
                  <div
                    key={risk.id}
                    className={`absolute w-4 h-4 rounded-full border-2 border-white shadow-lg cursor-pointer transition-transform hover:scale-150 ${
                      risk.severity === 'critical' ? 'bg-red-500' :
                      risk.severity === 'high' ? 'bg-orange-500' :
                      risk.severity === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{
                      left: `${8 + (risk.probability / 100) * 84}%`,
                      bottom: `${8 + (risk.impact / 100) * 84}%`,
                    }}
                    title={`${risk.title}\nP: ${risk.probability}% | I: ${risk.impact}%`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LegalRiskReportPanel;
