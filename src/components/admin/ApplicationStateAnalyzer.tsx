import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Search, Download, RefreshCw, TrendingUp, Shield, Zap, Brain, Scale, Sparkles, AlertTriangle, CheckCircle2, Bot, Workflow, Lock, Building2, Map, Gauge, Settings, Code, FolderTree, Terminal, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { PerformanceMonitor } from '@/components/performance/PerformanceMonitor';
import { createEnhancedPDF } from '@/lib/pdfUtils';
import { generateComprehensiveAuditPDF } from '@/lib/generateAuditPDF';
import { SystemExportTab } from './analyzer/SystemExportTab';
import { ComplianceTab } from './analyzer/ComplianceTab';
import { AIAnalysisTab } from './analyzer/AIAnalysisTab';
import { ImprovementsTab, TrendsTab } from './analyzer/ImprovementsTab';
import { generateStatePDF, generateCommercialPDF } from './analyzer/pdfGenerators';
import { componentsList, hooksList, edgeFunctions, pagesList, securityFeatures } from './analyzer/projectInventory';

interface ModuleAnalysis {
  name: string;
  description: string;
  implementedFeatures: string[];
  pendingFeatures: string[];
  completionPercentage: number;
  businessValue: string;
  differentiators: string[];
}

interface ImprovementSuggestion {
  category: string;
  title: string;
  description: string;
  priority: 'alta' | 'media' | 'baja';
  effort: string;
  impact: string;
  source: string;
  relatedTechnologies: string[];
  implementationSteps: string[];
}

interface TechnologyTrend {
  name: string;
  relevance: string;
  adoptionRate: string;
  recommendation: string;
  integrationPotential: string;
  installed?: boolean;
}

interface CodebaseAnalysis {
  version: string;
  generationDate: string;
  modules: ModuleAnalysis[];
  pendingFeatures: string[];
  securityFindings: string[];
  codeStats: {
    totalFiles: number;
    totalComponents: number;
    totalHooks: number;
    totalEdgeFunctions: number;
    totalPages: number;
    linesOfCode: number;
  };
}

interface ComplianceRegulation {
  name: string;
  status: 'compliant' | 'partial' | 'pending';
  description: string;
  implementedFeatures: string[];
  pendingActions: string[];
  compliancePercentage?: number;
  totalRequirements?: number;
  implementedRequirements?: number;
  jurisdiction?: string;
  timeline?: { date: string; milestone: string }[];
  implementationPhases?: {
    phase: number;
    name: string;
    duration: string;
    actions: string[];
    deliverables: string[];
    responsible: string;
  }[];
}

interface DetailedTechnologyTrend {
  number: number;
  name: string;
  relevance: string;
  adoptionRate: string;
  recommendation: string;
  integrationPotential: string;
  installed: boolean;
  installedDetails?: string[];
  pendingDetails?: string[];
  version?: string;
  lastUpdated?: string;
}

interface ImprovementsAnalysis {
  generationDate: string;
  improvements: ImprovementSuggestion[];
  technologyTrends: TechnologyTrend[];
  securityUpdates: string[];
  performanceOptimizations: string[];
  uxEnhancements: string[];
  aiIntegrations: string[];
  complianceUpdates: string[];
  summary: string;
  complianceRegulations?: ComplianceRegulation[];
  detailedTrends?: DetailedTechnologyTrend[];
}

interface AIRecommendation {
  category: string;
  title: string;
  description: string;
  complianceNotes: string;
  securityConsiderations: string[];
  regulatoryFramework: string[];
  implementationApproach: string;
  estimatedEffort: string;
  riskLevel: 'bajo' | 'medio' | 'alto';
  benefits: string[];
  tools: string[];
  bestPractices: string[];
  bankingExamples: string[];
}

interface AIAnalysis {
  generationDate: string;
  executiveSummary: string;
  aiRecommendations: AIRecommendation[];
  automationPlatforms: {
    platform: string;
    description: string;
    useCases: string[];
    securityNotes: string;
    integrationComplexity: string;
    complianceConsiderations: string[];
    bankingApplications: string[];
    implementationGuide?: {
      prerequisites: string[];
      steps: {
        stepNumber: number;
        title: string;
        description: string;
        commands?: string[];
        configuration?: string;
        tips: string[];
      }[];
      estimatedTime: string;
      difficulty: string;
    };
  }[];
  securityGuidelines: string[];
  regulatoryCompliance: {
    regulation: string;
    aiImplications: string;
    requiredMeasures: string[];
  }[];
  competitorAnalysis: {
    competitor: string;
    aiFeatures: string[];
    differentiationOpportunity: string;
    implementationPhases?: {
      phase: number;
      name: string;
      duration: string;
      objectives: string[];
      deliverables: string[];
      resources: string[];
      risks: string[];
      successMetrics: string[];
    }[];
    technicalRequirements?: string[];
    estimatedInvestment?: string;
  }[];
  bankingTrends: {
    trend: string;
    description: string;
    adoptionStatus: string;
    recommendation: string;
  }[];
  implementationRoadmap: {
    phase: string;
    duration: string;
    objectives: string[];
    deliverables: string[];
    detailedSteps?: {
      step: number;
      action: string;
      responsible: string;
      tools: string[];
      documentation: string;
    }[];
    budget?: string;
    kpis?: string[];
  }[];
  automationManuals?: {
    platform: string;
    setupGuide: {
      title: string;
      steps: string[];
    }[];
    workflowExamples: {
      name: string;
      description: string;
      triggers: string[];
      actions: string[];
      integrations: string[];
    }[];
    securityConfiguration: string[];
    maintenanceGuide: string[];
  }[];
}

const STORAGE_KEYS = {
  codebase: 'app_analyzer_codebase',
  improvements: 'app_analyzer_improvements',
  ai: 'app_analyzer_ai'
};

export function ApplicationStateAnalyzer() {
  const [codebaseAnalysis, setCodebaseAnalysis] = useState<CodebaseAnalysis | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.codebase);
    return saved ? JSON.parse(saved) : null;
  });
  const [improvementsAnalysis, setImprovementsAnalysis] = useState<ImprovementsAnalysis | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.improvements);
    return saved ? JSON.parse(saved) : null;
  });
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ai);
    return saved ? JSON.parse(saved) : null;
  });
  const [isAnalyzingCodebase, setIsAnalyzingCodebase] = useState(false);
  const [isSearchingImprovements, setIsSearchingImprovements] = useState(false);
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingSalesPDF, setIsGeneratingSalesPDF] = useState(false);
  const [isGeneratingAuditPDF, setIsGeneratingAuditPDF] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);
  const [isExportingCode, setIsExportingCode] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isExportingFullCode, setIsExportingFullCode] = useState(false);
  const [fullCodeProgress, setFullCodeProgress] = useState(0);

  // Persist data to localStorage when it changes
  useEffect(() => {
    if (codebaseAnalysis) {
      localStorage.setItem(STORAGE_KEYS.codebase, JSON.stringify(codebaseAnalysis));
    }
  }, [codebaseAnalysis]);

  useEffect(() => {
    if (improvementsAnalysis) {
      localStorage.setItem(STORAGE_KEYS.improvements, JSON.stringify(improvementsAnalysis));
    }
  }, [improvementsAnalysis]);

  useEffect(() => {
    if (aiAnalysis) {
      localStorage.setItem(STORAGE_KEYS.ai, JSON.stringify(aiAnalysis));
    }
  }, [aiAnalysis]);

  const analyzeCodebase = async () => {
    setIsAnalyzingCodebase(true);
    setAnalysisProgress(0);
    
    try {
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => Math.min(prev + 5, 90));
      }, 300);

      const { data, error } = await supabase.functions.invoke('analyze-codebase', {
        body: {
          fileStructure: 'src/components (220+ componentes), src/hooks (54 hooks), src/pages (9 páginas), supabase/functions (72 edge functions)',
          componentsList,
          hooksList,
          edgeFunctions,
          pagesList,
          securityFeatures,
          totalComponents: componentsList.length,
          totalHooks: hooksList.length,
          totalEdgeFunctions: edgeFunctions.length,
          totalPages: pagesList.length
        }
      });

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      if (error) throw error;

      setCodebaseAnalysis(data);
      toast.success('Anàlisi exhaustiu del codi completat');
    } catch (error: any) {
      console.error('Error analyzing codebase:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsAnalyzingCodebase(false);
    }
  };

  const searchImprovements = async () => {
    setIsSearchingImprovements(true);
    
    try {
      const currentModules = codebaseAnalysis?.modules.map(m => m.name) || [
        'Dashboard Multi-Rol', 'Contabilidad PGC', 'GIS Bancario', 'Gestión Visitas', 'Objetivos y Metas'
      ];

      const { data, error } = await supabase.functions.invoke('search-improvements', {
        body: {
          currentModules,
          currentTechnologies: ['React 18', 'TypeScript', 'Supabase', 'Tailwind CSS', 'MapLibre GL', 'Recharts'],
          industryFocus: 'Banca comercial andorrana y española, gestión de cartera empresarial'
        }
      });

      if (error) throw error;

      setImprovementsAnalysis(data);
      toast.success('Búsqueda de mejoras completada');
    } catch (error: any) {
      console.error('Error searching improvements:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSearchingImprovements(false);
    }
  };

  const searchAIRecommendations = async () => {
    setIsSearchingAI(true);
    
    try {
      const currentModules = codebaseAnalysis?.modules.map(m => m.name) || [
        'Dashboard Multi-Rol', 'Contabilidad PGC', 'GIS Bancario', 'Gestión Visitas', 'Objetivos y Metas'
      ];

      const { data, error } = await supabase.functions.invoke('search-ai-recommendations', {
        body: {
          currentModules,
          currentTechnologies: ['React 18', 'TypeScript', 'Supabase', 'Tailwind CSS', 'MapLibre GL', 'Recharts'],
          industryFocus: 'Banca comercial andorrana y española, gestión de cartera empresarial',
          complianceRequirements: ['GDPR', 'LOPD-GDD', 'PSD2', 'MiFID II', 'DORA', 'AI Act EU', 'Basel III/IV']
        }
      });

      if (error) throw error;

      setAiAnalysis(data);
      toast.success('Análisis de IA y automatización completado');
    } catch (error: any) {
      console.error('Error searching AI recommendations:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSearchingAI(false);
    }
  };

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await generateStatePDF(codebaseAnalysis, improvementsAnalysis, overallCompletion);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleGenerateSalesPDF = async () => {
    setIsGeneratingSalesPDF(true);
    try {
      await generateCommercialPDF(codebaseAnalysis);
    } finally {
      setIsGeneratingSalesPDF(false);
    }
  };

  const generateWebAuditPDF = async () => {
    setIsGeneratingAuditPDF(true);
    setAuditProgress(0);
    
    try {
      toast.info('Iniciant autodiagnòstic exhaustiu del codi...', { duration: 5000 });
      setAuditProgress(5);
      
      toast.info('Fase 1/4: Analitzant exhaustivament tot el codi font...');
      const { data: freshCodebaseData, error: codebaseError } = await supabase.functions.invoke('analyze-codebase', {
        body: { forceRefresh: true }
      });
      
      if (codebaseError) {
        console.warn('Codebase analysis warning:', codebaseError);
      }
      setAuditProgress(20);
      
      toast.info('Fase 2/4: Cercant millores i actualitzacions recents...');
      const { data: improvementsData, error: improvementsError } = await supabase.functions.invoke('search-improvements', {
        body: { forceRefresh: true }
      });
      
      if (improvementsError) {
        console.warn('Improvements search warning:', improvementsError);
      }
      setAuditProgress(40);
      
      toast.info('Fase 3/4: Executant auditoria profunda de rendiment i UX...');
      const { data: auditData, error: auditError } = await supabase.functions.invoke('audit-web-performance', {
        body: { 
          includeCodeAnalysis: true,
          includeVisualAudit: true,
          includeSecurityAudit: true,
          includeAccessibilityAudit: true,
          includeSEOAudit: true,
          codebaseAnalysis: freshCodebaseData || codebaseAnalysis,
          improvementsAnalysis: improvementsData || improvementsAnalysis,
          forceRefresh: true
        }
      });
      
      if (auditError) throw auditError;
      setAuditProgress(60);
      
      toast.info('Fase 4/4: Generant PDF exhaustiu de 35-50 pàgines...');
      
      await generateComprehensiveAuditPDF(
        auditData,
        freshCodebaseData || codebaseAnalysis,
        improvementsData || improvementsAnalysis,
        (progress) => setAuditProgress(60 + Math.round(progress * 0.4))
      );
      
      if (freshCodebaseData) {
        setCodebaseAnalysis(freshCodebaseData);
      }
      if (improvementsData) {
        setImprovementsAnalysis(improvementsData);
      }
      
      setAuditProgress(100);
      toast.success('Auditoria Total Exhaustiva generada amb èxit! (35-50 pàgines)', { duration: 5000 });
      
    } catch (error: any) {
      console.error('Error generating comprehensive audit PDF:', error);
      toast.error(`Error en l'auditoria: ${error.message}`);
    } finally {
      setIsGeneratingAuditPDF(false);
      setAuditProgress(0);
    }
  };

  const overallCompletion = codebaseAnalysis?.modules && Array.isArray(codebaseAnalysis.modules) && codebaseAnalysis.modules.length > 0
    ? Math.round(codebaseAnalysis.modules.reduce((sum, m) => sum + (m.completionPercentage || 0), 0) / codebaseAnalysis.modules.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Generador de Documentació Comercial Exhaustiva amb IA</h2>
            <p className="text-muted-foreground">
              Anàlisi complet del codi, millores i documentació professional per a vendes
            </p>
          </div>
        </div>
        
        {/* Buttons Section */}
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                onClick={analyzeCodebase}
                disabled={isAnalyzingCodebase}
                variant="outline"
                size="lg"
                className="min-w-[180px]"
              >
                {isAnalyzingCodebase ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                1. Analitzar Codi
              </Button>
              <Button
                onClick={searchImprovements}
                disabled={isSearchingImprovements}
                variant="outline"
                size="lg"
                className="min-w-[180px]"
              >
                {isSearchingImprovements ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                2. Buscar Millores
              </Button>
              <Button
                onClick={searchAIRecommendations}
                disabled={isSearchingAI}
                size="lg"
                className="min-w-[180px] bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isSearchingAI ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="mr-2 h-4 w-4" />
                )}
                3. IA i Automatització
              </Button>
              <Button
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF || (!codebaseAnalysis && !improvementsAnalysis)}
                size="lg"
                className="min-w-[180px]"
              >
                {isGeneratingPDF ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                4. Generar PDF Tècnic
              </Button>
              <Button
                onClick={handleGenerateSalesPDF}
                disabled={isGeneratingSalesPDF || !codebaseAnalysis}
                size="lg"
                className="min-w-[200px] bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold shadow-lg"
              >
                {isGeneratingSalesPDF ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-5 w-5" />
                )}
                5. PROPOSTA COMERCIAL
              </Button>
              <Button
                onClick={generateWebAuditPDF}
                disabled={isGeneratingAuditPDF}
                size="lg"
                className="min-w-[220px] bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-bold shadow-lg"
              >
                {isGeneratingAuditPDF ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {auditProgress > 0 && `${auditProgress}%`}
                  </>
                ) : (
                  <Gauge className="mr-2 h-5 w-5" />
                )}
                6. AUDITORIA TOTAL (Auto-diagnòstic)
              </Button>
            </div>
            
            {!codebaseAnalysis && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                👆 Primer fes clic a "1. Analitzar Codi" per activar totes les opcions
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress bar durante análisis */}
      {isAnalyzingCodebase && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Analitzant codi...</span>
                <span>{analysisProgress}%</span>
              </div>
              <Progress value={analysisProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-8 w-full">
          <TabsTrigger value="overview">Visió General</TabsTrigger>
          <TabsTrigger value="modules">Mòduls</TabsTrigger>
          <TabsTrigger value="improvements">Millores</TabsTrigger>
          <TabsTrigger value="trends">Tendències</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-1">
            <Brain className="h-3 w-3" />
            IA
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-1">
            <Gauge className="h-3 w-3" />
            Rendiment
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-1">
            <Settings className="h-3 w-3" />
            Sistema
          </TabsTrigger>
        </TabsList>

        {/* Visión General */}
        <TabsContent value="overview" className="space-y-4">
          {codebaseAnalysis ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Completitud Global</CardDescription>
                    <CardTitle className="text-3xl">{overallCompletion}%</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={overallCompletion} className="h-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Mòduls</CardDescription>
                    <CardTitle className="text-3xl">{Array.isArray(codebaseAnalysis.modules) ? codebaseAnalysis.modules.length : 0}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Edge Functions</CardDescription>
                    <CardTitle className="text-3xl">{codebaseAnalysis.codeStats?.totalEdgeFunctions || 0}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Funcionalitats Pendents</CardDescription>
                    <CardTitle className="text-3xl">{codebaseAnalysis.pendingFeatures?.length || 0}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {improvementsAnalysis?.summary && (
                <Card>
                  <CardHeader>
                    <CardTitle>Resum Executiu</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {improvementsAnalysis.summary}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Hallazgos de seguridad */}
              {codebaseAnalysis.securityFindings && codebaseAnalysis.securityFindings.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-green-500" />
                      <CardTitle>Seguretat Implementada</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 md:grid-cols-2">
                      {codebaseAnalysis.securityFindings.map((finding, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>{finding}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Fes clic a "Analitzar Codi" per obtenir l'estat complet de l'aplicació
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Módulos */}
        <TabsContent value="modules" className="space-y-4">
          {codebaseAnalysis?.modules && Array.isArray(codebaseAnalysis.modules) && codebaseAnalysis.modules.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {codebaseAnalysis.modules.map((module, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{module.name}</CardTitle>
                      <Badge className={module.completionPercentage >= 90 ? 'bg-green-500' : module.completionPercentage >= 70 ? 'bg-yellow-500' : 'bg-red-500'}>
                        {module.completionPercentage}%
                      </Badge>
                    </div>
                    <CardDescription>{module.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Progress value={module.completionPercentage} className="h-2 mb-4" />
                    
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="implemented">
                        <AccordionTrigger className="text-sm">
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            Funcionalitats ({module.implementedFeatures?.length || 0})
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="text-sm space-y-1">
                            {module.implementedFeatures?.map((f, i) => (
                              <li key={i} className="text-muted-foreground">• {f}</li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                      {module.pendingFeatures && module.pendingFeatures.length > 0 && (
                        <AccordionItem value="pending">
                          <AccordionTrigger className="text-sm">
                            <span className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              Pendents ({module.pendingFeatures?.length || 0})
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="text-sm space-y-1">
                              {module.pendingFeatures.map((f, i) => (
                                <li key={i} className="text-muted-foreground">• {f}</li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </Accordion>

                    {module.businessValue && (
                      <p className="text-xs text-muted-foreground mt-4 border-t pt-2">
                        <strong>Valor:</strong> {module.businessValue}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">Analitza el codi primer</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Mejoras */}
        <TabsContent value="improvements" className="space-y-4">
          <ImprovementsTab improvementsAnalysis={improvementsAnalysis} />
        </TabsContent>

        {/* Tendencias */}
        <TabsContent value="trends" className="space-y-4">
          <TrendsTab improvementsAnalysis={improvementsAnalysis} />
        </TabsContent>

        {/* Compliance */}
        <TabsContent value="compliance" className="space-y-4">
          <ComplianceTab complianceRegulations={improvementsAnalysis?.complianceRegulations} />
        </TabsContent>

        {/* IA i Automatització */}
        <TabsContent value="ai" className="space-y-4">
          <AIAnalysisTab
            aiAnalysis={aiAnalysis}
            isSearchingAI={isSearchingAI}
            searchAIRecommendations={searchAIRecommendations}
          />
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <PerformanceMonitor />
        </TabsContent>

        {/* System Tab - Code Export */}
        <TabsContent value="system" className="space-y-4">
          <SystemExportTab
            isExportingCode={isExportingCode}
            setIsExportingCode={setIsExportingCode}
            exportProgress={exportProgress}
            setExportProgress={setExportProgress}
            isExportingFullCode={isExportingFullCode}
            setIsExportingFullCode={setIsExportingFullCode}
            fullCodeProgress={fullCodeProgress}
            setFullCodeProgress={setFullCodeProgress}
            codebaseAnalysis={codebaseAnalysis}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
