/**
 * LegalChangeDetectorPanel - Detector de Cambios Normativos con IA
 * Fase 8: Análisis inteligente de impacto de cambios regulatorios
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  FileText,
  Zap,
  ArrowRight,
  Building,
  Users,
  Banknote,
  Shield,
  Scale,
  Lightbulb,
  Target,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImpactAnalysis {
  id: string;
  regulation: string;
  jurisdiction: string;
  changeType: 'new' | 'amendment' | 'repeal' | 'clarification';
  summary: string;
  impactScore: number;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  affectedAreas: {
    area: string;
    icon: string;
    impact: string;
    actions: string[];
  }[];
  affectedModules: string[];
  requiredActions: {
    action: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    deadline?: string;
    responsible?: string;
  }[];
  risks: {
    risk: string;
    probability: 'low' | 'medium' | 'high';
    impact: string;
    mitigation: string;
  }[];
  opportunities: string[];
  timeline: {
    date: string;
    event: string;
    status: 'past' | 'current' | 'future';
  }[];
  confidence: number;
  analyzedAt: string;
}

interface LegalChangeDetectorPanelProps {
  companyId?: string;
  className?: string;
}

const DEMO_ANALYSES: ImpactAnalysis[] = [
  {
    id: '1',
    regulation: 'Ley 28/2025 de Jornada Laboral',
    jurisdiction: 'ES',
    changeType: 'new',
    summary: 'Nueva regulación que reduce la jornada laboral máxima a 37.5 horas semanales y refuerza el derecho al teletrabajo.',
    impactScore: 85,
    impactLevel: 'high',
    affectedAreas: [
      {
        area: 'Recursos Humanos',
        icon: 'Users',
        impact: 'Alto impacto en gestión de horarios y contratos',
        actions: ['Revisar todos los contratos laborales', 'Actualizar políticas de jornada', 'Renegociar con representantes']
      },
      {
        area: 'Nóminas',
        icon: 'Banknote',
        impact: 'Recálculo de horas extra y complementos',
        actions: ['Actualizar fórmulas de cálculo', 'Revisar convenios colectivos']
      },
      {
        area: 'Operaciones',
        icon: 'Building',
        impact: 'Reorganización de turnos de trabajo',
        actions: ['Rediseñar turnos', 'Planificar contrataciones adicionales']
      }
    ],
    affectedModules: ['HR', 'Nóminas', 'Planificación', 'Contratos'],
    requiredActions: [
      { action: 'Auditoría de contratos laborales actuales', priority: 'urgent', deadline: '2025-02-28', responsible: 'RRHH' },
      { action: 'Actualización del sistema de control horario', priority: 'high', deadline: '2025-03-15' },
      { action: 'Comunicación a empleados', priority: 'high', deadline: '2025-02-15' },
      { action: 'Formación a managers sobre nuevas normas', priority: 'medium', deadline: '2025-03-30' }
    ],
    risks: [
      { risk: 'Sanciones por incumplimiento', probability: 'high', impact: 'Multas de hasta 225.000€', mitigation: 'Implementación inmediata de controles' },
      { risk: 'Conflictividad laboral', probability: 'medium', impact: 'Demandas y huelgas', mitigation: 'Negociación proactiva con sindicatos' }
    ],
    opportunities: [
      'Mejora del employer branding',
      'Aumento de productividad por satisfacción laboral',
      'Atracción de talento competitivo'
    ],
    timeline: [
      { date: '2025-01-28', event: 'Publicación en BOE', status: 'past' },
      { date: '2025-02-15', event: 'Entrada en vigor', status: 'current' },
      { date: '2025-08-15', event: 'Fin período transitorio', status: 'future' }
    ],
    confidence: 92,
    analyzedAt: '2025-01-29T10:30:00Z'
  },
  {
    id: '2',
    regulation: 'Reglamento (UE) 2025/456 - AI Act Desarrollo',
    jurisdiction: 'EU',
    changeType: 'new',
    summary: 'Desarrollo reglamentario del AI Act con requisitos técnicos específicos para sistemas de IA de alto riesgo.',
    impactScore: 95,
    impactLevel: 'critical',
    affectedAreas: [
      {
        area: 'Sistemas de IA',
        icon: 'Brain',
        impact: 'Requisitos de transparencia y documentación',
        actions: ['Inventario de sistemas IA', 'Clasificación de riesgo', 'Documentación técnica']
      },
      {
        area: 'Compliance',
        icon: 'Shield',
        impact: 'Nuevas obligaciones de reporte y auditoría',
        actions: ['Designar responsable AI', 'Establecer procesos de supervisión']
      },
      {
        area: 'Legal',
        icon: 'Scale',
        impact: 'Contratos con proveedores de IA',
        actions: ['Revisar acuerdos con vendors', 'Actualizar cláusulas de responsabilidad']
      }
    ],
    affectedModules: ['IA', 'Compliance', 'Riesgos', 'Contratos'],
    requiredActions: [
      { action: 'Inventario completo de sistemas IA', priority: 'urgent', deadline: '2025-04-01' },
      { action: 'Evaluación de conformidad', priority: 'high', deadline: '2025-06-01' },
      { action: 'Plan de adaptación técnica', priority: 'high', deadline: '2025-07-01' }
    ],
    risks: [
      { risk: 'Prohibición de uso de sistemas', probability: 'medium', impact: 'Paralización de operaciones', mitigation: 'Auditoría preventiva' },
      { risk: 'Multas por incumplimiento', probability: 'high', impact: 'Hasta 35M€ o 7% facturación', mitigation: 'Programa de compliance proactivo' }
    ],
    opportunities: [
      'Ventaja competitiva por certificación',
      'Confianza del cliente en uso ético de IA',
      'Acceso a contratos públicos'
    ],
    timeline: [
      { date: '2025-01-25', event: 'Publicación en DOUE', status: 'past' },
      { date: '2025-08-01', event: 'Entrada en vigor parcial', status: 'future' },
      { date: '2026-02-01', event: 'Aplicación completa', status: 'future' }
    ],
    confidence: 88,
    analyzedAt: '2025-01-26T14:20:00Z'
  }
];

const changeTypeLabels = {
  new: 'Nueva norma',
  amendment: 'Modificación',
  repeal: 'Derogación',
  clarification: 'Aclaración'
};

const changeTypeColors = {
  new: 'bg-blue-500/10 text-blue-500',
  amendment: 'bg-yellow-500/10 text-yellow-500',
  repeal: 'bg-red-500/10 text-red-500',
  clarification: 'bg-purple-500/10 text-purple-500'
};

const impactColors = {
  low: 'text-green-500',
  medium: 'text-yellow-500',
  high: 'text-orange-500',
  critical: 'text-red-500'
};

const priorityColors = {
  low: 'bg-gray-500/10 text-gray-500',
  medium: 'bg-blue-500/10 text-blue-500',
  high: 'bg-orange-500/10 text-orange-500',
  urgent: 'bg-red-500/10 text-red-500'
};

export function LegalChangeDetectorPanel({ companyId, className }: LegalChangeDetectorPanelProps) {
  const [analyses, setAnalyses] = useState<ImpactAnalysis[]>(DEMO_ANALYSES);
  const [selectedAnalysis, setSelectedAnalysis] = useState<ImpactAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [customText, setCustomText] = useState('');
  const [activeTab, setActiveTab] = useState('analyses');

  const handleAnalyzeChange = useCallback(async () => {
    if (!customText.trim()) {
      toast.error('Introduce el texto de la normativa a analizar');
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-ai-advisor', {
        body: {
          action: 'analyze_regulatory_change',
          context: { 
            companyId,
            regulationText: customText
          }
        }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        const newAnalysis: ImpactAnalysis = {
          id: crypto.randomUUID(),
          regulation: data.data.regulation || 'Normativa analizada',
          jurisdiction: data.data.jurisdiction || 'ES',
          changeType: data.data.changeType || 'new',
          summary: data.data.summary || customText.substring(0, 200),
          impactScore: data.data.impactScore || 70,
          impactLevel: data.data.impactLevel || 'medium',
          affectedAreas: data.data.affectedAreas || [],
          affectedModules: data.data.affectedModules || [],
          requiredActions: data.data.requiredActions || [],
          risks: data.data.risks || [],
          opportunities: data.data.opportunities || [],
          timeline: data.data.timeline || [],
          confidence: data.data.confidence || 75,
          analyzedAt: new Date().toISOString()
        };

        setAnalyses(prev => [newAnalysis, ...prev]);
        setSelectedAnalysis(newAnalysis);
        setCustomText('');
        toast.success('Análisis de impacto completado');
      }
    } catch (error) {
      console.error('Error analyzing change:', error);
      toast.error('Error al analizar el cambio normativo');
    } finally {
      setIsAnalyzing(false);
    }
  }, [customText, companyId]);

  const getAreaIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      Users: <Users className="h-5 w-5" />,
      Banknote: <Banknote className="h-5 w-5" />,
      Building: <Building className="h-5 w-5" />,
      Brain: <Brain className="h-5 w-5" />,
      Shield: <Shield className="h-5 w-5" />,
      Scale: <Scale className="h-5 w-5" />
    };
    return icons[iconName] || <FileText className="h-5 w-5" />;
  };

  return (
    <div className={cn("grid gap-4 lg:grid-cols-3", className)}>
      {/* Panel principal */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Detector de Cambios con IA</CardTitle>
              <CardDescription>
                Análisis inteligente de impacto normativo
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="analyses">Análisis recientes</TabsTrigger>
              <TabsTrigger value="custom">Analizar nuevo</TabsTrigger>
            </TabsList>

            <TabsContent value="analyses">
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {analyses.map((analysis) => (
                    <Card 
                      key={analysis.id} 
                      className={cn(
                        "p-4 cursor-pointer transition-all hover:shadow-md",
                        selectedAnalysis?.id === analysis.id && "ring-2 ring-primary"
                      )}
                      onClick={() => setSelectedAnalysis(analysis)}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={changeTypeColors[analysis.changeType]}>
                                {changeTypeLabels[analysis.changeType]}
                              </Badge>
                              <Badge variant="outline">{analysis.jurisdiction}</Badge>
                            </div>
                            <h4 className="font-medium">{analysis.regulation}</h4>
                          </div>
                          <div className="text-right">
                            <div className={cn(
                              "text-2xl font-bold",
                              impactColors[analysis.impactLevel]
                            )}>
                              {analysis.impactScore}%
                            </div>
                            <p className="text-xs text-muted-foreground">Impacto</p>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {analysis.summary}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {analysis.affectedModules.slice(0, 3).map((module, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {module}
                              </Badge>
                            ))}
                            {analysis.affectedModules.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{analysis.affectedModules.length - 3}
                              </Badge>
                            )}
                          </div>
                          <Button variant="ghost" size="sm">
                            Ver detalle <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="custom">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Texto de la normativa o cambio regulatorio
                  </label>
                  <Textarea
                    placeholder="Pega aquí el texto de la nueva normativa, modificación o cualquier cambio regulatorio que quieras analizar..."
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    className="min-h-[200px]"
                  />
                </div>
                <Button 
                  onClick={handleAnalyzeChange}
                  disabled={isAnalyzing || !customText.trim()}
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Analizando con IA...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Analizar impacto
                    </>
                  )}
                </Button>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h5 className="font-medium mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    ¿Qué analiza el detector?
                  </h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Áreas de la empresa afectadas</li>
                    <li>• Acciones requeridas y plazos</li>
                    <li>• Riesgos potenciales y mitigaciones</li>
                    <li>• Oportunidades derivadas</li>
                    <li>• Timeline de implementación</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Panel de detalle */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detalle del Análisis</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedAnalysis ? (
            <ScrollArea className="h-[520px]">
              <div className="space-y-6 pr-4">
                {/* Resumen */}
                <div>
                  <h5 className="font-medium mb-2">{selectedAnalysis.regulation}</h5>
                  <p className="text-sm text-muted-foreground">{selectedAnalysis.summary}</p>
                </div>

                {/* Score de impacto */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Nivel de impacto</span>
                    <span className={cn("font-bold", impactColors[selectedAnalysis.impactLevel])}>
                      {selectedAnalysis.impactScore}%
                    </span>
                  </div>
                  <Progress value={selectedAnalysis.impactScore} className="h-2" />
                </div>

                {/* Áreas afectadas */}
                <div>
                  <h5 className="text-sm font-medium mb-3">Áreas Afectadas</h5>
                  <div className="space-y-3">
                    {selectedAnalysis.affectedAreas.map((area, idx) => (
                      <div key={idx} className="bg-muted/50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          {getAreaIcon(area.icon)}
                          <span className="font-medium text-sm">{area.area}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{area.impact}</p>
                        <div className="space-y-1">
                          {area.actions.map((action, aidx) => (
                            <div key={aidx} className="flex items-center gap-2 text-xs">
                              <ArrowRight className="h-3 w-3 text-primary" />
                              {action}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Acciones requeridas */}
                <div>
                  <h5 className="text-sm font-medium mb-3">Acciones Requeridas</h5>
                  <div className="space-y-2">
                    {selectedAnalysis.requiredActions.map((action, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <Badge className={cn("text-xs shrink-0", priorityColors[action.priority])}>
                          {action.priority}
                        </Badge>
                        <div>
                          <p>{action.action}</p>
                          {action.deadline && (
                            <p className="text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {action.deadline}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Riesgos */}
                <div>
                  <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Riesgos Identificados
                  </h5>
                  <div className="space-y-2">
                    {selectedAnalysis.risks.map((risk, idx) => (
                      <div key={idx} className="bg-red-500/5 p-3 rounded-lg text-sm">
                        <p className="font-medium">{risk.risk}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Impacto: {risk.impact}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          ✓ {risk.mitigation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Oportunidades */}
                {selectedAnalysis.opportunities.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-500" />
                      Oportunidades
                    </h5>
                    <div className="space-y-1">
                      {selectedAnalysis.opportunities.map((opp, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          {opp}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div>
                  <h5 className="text-sm font-medium mb-3">Timeline</h5>
                  <div className="space-y-2">
                    {selectedAnalysis.timeline.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={cn(
                          "flex items-center gap-3 text-sm p-2 rounded",
                          item.status === 'current' && "bg-primary/10",
                          item.status === 'past' && "opacity-60"
                        )}
                      >
                        <div className={cn(
                          "h-2 w-2 rounded-full",
                          item.status === 'past' && "bg-gray-400",
                          item.status === 'current' && "bg-primary",
                          item.status === 'future' && "bg-muted-foreground"
                        )} />
                        <div>
                          <p className="font-medium">{item.event}</p>
                          <p className="text-xs text-muted-foreground">{item.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confianza */}
                <div className="text-center pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Confianza del análisis: {selectedAnalysis.confidence}%
                  </p>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="h-[520px] flex items-center justify-center text-center text-muted-foreground">
              <div>
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecciona un análisis para ver el detalle</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LegalChangeDetectorPanel;
