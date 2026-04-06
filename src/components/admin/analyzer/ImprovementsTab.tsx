import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, TrendingUp, Shield, Zap, Brain, Scale, Sparkles, 
  AlertTriangle, CheckCircle2, Bot, Workflow, FileText, RefreshCw
} from 'lucide-react';

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
  improvements: ImprovementSuggestion[];
  detailedTrends?: DetailedTechnologyTrend[];
  performanceOptimizations?: string[];
  aiIntegrations?: string[];
}

const CATEGORY_ICONS: Record<string, any> = {
  security: Shield,
  performance: Zap,
  ai: Brain,
  compliance: Scale,
  ux: Sparkles,
  integrations: TrendingUp,
  devops: RefreshCw,
  analytics: TrendingUp,
  automation: Workflow,
  nlp: Bot,
  documents: FileText,
  predictions: TrendingUp,
  risk: AlertTriangle,
  personalization: Sparkles,
  fraud: Shield,
  'customer-service': Bot,
  optimization: Zap,
  vision: FileText,
};

const PRIORITY_COLORS: Record<string, string> = {
  alta: 'bg-red-500',
  media: 'bg-yellow-500',
  baja: 'bg-green-500',
};

interface ImprovementsTabProps {
  improvementsAnalysis: ImprovementsAnalysis | null;
}

export function ImprovementsTab({ improvementsAnalysis }: ImprovementsTabProps) {
  return (
    <>
      {/* Improvements Section */}
      <div className="space-y-4">
        {improvementsAnalysis?.improvements && Array.isArray(improvementsAnalysis.improvements) && improvementsAnalysis.improvements.length > 0 ? (
          <ScrollArea className="h-[600px]">
            <div className="space-y-4 pr-4">
              {improvementsAnalysis.improvements.map((imp, idx) => {
                const Icon = CATEGORY_ICONS[imp.category] || TrendingUp;
                return (
                  <Card key={idx}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">{imp.title}</CardTitle>
                        </div>
                        <Badge className={PRIORITY_COLORS[imp.priority]}>
                          {imp.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <CardDescription>{imp.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2 text-sm mb-4">
                        <div>
                          <span className="font-medium">Esforç:</span> {imp.effort}
                        </div>
                        <div>
                          <span className="font-medium">Impacte:</span> {imp.impact}
                        </div>
                        <div className="md:col-span-2">
                          <span className="font-medium">Font:</span> {imp.source}
                        </div>
                      </div>

                      {imp.relatedTechnologies && imp.relatedTechnologies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {imp.relatedTechnologies.map((tech, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {imp.implementationSteps && imp.implementationSteps.length > 0 && (
                        <Accordion type="single" collapsible>
                          <AccordionItem value="steps">
                            <AccordionTrigger className="text-sm">
                              Passos d'implementació
                            </AccordionTrigger>
                            <AccordionContent>
                              <ol className="text-sm space-y-1 list-decimal list-inside">
                                {imp.implementationSteps.map((step, i) => (
                                  <li key={i} className="text-muted-foreground">{step}</li>
                                ))}
                              </ol>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <Card>
            <CardContent className="py-10 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Fes clic a "Buscar Millores" per obtenir suggeriments actualitzats
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

interface TrendsTabProps {
  improvementsAnalysis: ImprovementsAnalysis | null;
}

export function TrendsTab({ improvementsAnalysis }: TrendsTabProps) {
  return (
    <>
      {improvementsAnalysis?.detailedTrends && Array.isArray(improvementsAnalysis.detailedTrends) && improvementsAnalysis.detailedTrends.length > 0 ? (
        <>
          {/* Estadísticas de instalación */}
          <div className="grid gap-4 md:grid-cols-3 mb-4">
            <Card className="border-green-500/50 bg-green-500/10">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {improvementsAnalysis.detailedTrends.filter(t => t.installed).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Tecnologies Instal·lades</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-yellow-500/50 bg-yellow-500/10">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">
                      {improvementsAnalysis.detailedTrends.filter(t => !t.installed).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Tecnologies Pendents</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-500/50 bg-blue-500/10">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {improvementsAnalysis.detailedTrends.length}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Tendències</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sección Instaladas */}
          <Card className="border-green-500/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <CardTitle>Tecnologies Instal·lades ({improvementsAnalysis.detailedTrends.filter(t => t.installed).length})</CardTitle>
              </div>
              <CardDescription>Tecnologies completament implementades i operatives</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {improvementsAnalysis.detailedTrends.filter(t => t.installed).map((trend, idx) => (
                  <AccordionItem key={idx} value={`installed-${idx}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left w-full">
                        <Badge className="bg-green-500 text-white shrink-0">
                          #{trend.number}
                        </Badge>
                        <div className="flex-1">
                          <div className="font-medium">{trend.name}</div>
                          <div className="text-xs text-muted-foreground">{trend.relevance}</div>
                        </div>
                        {trend.version && (
                          <Badge variant="outline" className="shrink-0">v{trend.version}</Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                      <div className="space-y-4">
                        <div className="grid gap-2 md:grid-cols-2 text-sm">
                          <div><strong>Adopció:</strong> {trend.adoptionRate}</div>
                          <div><strong>Actualització:</strong> {trend.lastUpdated || 'N/A'}</div>
                        </div>
                        
                        {trend.installedDetails && trend.installedDetails.length > 0 && (
                          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                            <div className="font-medium text-sm mb-2 text-green-700 dark:text-green-400">
                              ✅ Detall de la implementació:
                            </div>
                            <ul className="text-sm space-y-1">
                              {trend.installedDetails.map((detail, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <CheckCircle2 className="h-3 w-3 mt-1 text-green-500 flex-shrink-0" />
                                  <span className="text-muted-foreground">{detail}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* Sección Pendientes */}
          <Card className="border-yellow-500/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <CardTitle>Tecnologies Pendents ({improvementsAnalysis.detailedTrends.filter(t => !t.installed).length})</CardTitle>
              </div>
              <CardDescription>Tecnologies a avaluar o implementar properament</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {improvementsAnalysis.detailedTrends.filter(t => !t.installed).map((trend, idx) => (
                  <AccordionItem key={idx} value={`pending-${idx}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left w-full">
                        <Badge variant="outline" className="border-yellow-500 text-yellow-600 shrink-0">
                          #{trend.number}
                        </Badge>
                        <div className="flex-1">
                          <div className="font-medium">{trend.name}</div>
                          <div className="text-xs text-muted-foreground">{trend.relevance}</div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                      <div className="space-y-4">
                        <div className="grid gap-2 md:grid-cols-2 text-sm">
                          <div><strong>Adopció:</strong> {trend.adoptionRate}</div>
                          <div><strong>Potencial integració:</strong> {trend.integrationPotential}</div>
                        </div>
                        
                        {trend.pendingDetails && trend.pendingDetails.length > 0 && (
                          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                            <div className="font-medium text-sm mb-2 text-yellow-700 dark:text-yellow-400">
                              ⏳ Passos per implementar:
                            </div>
                            <ol className="text-sm space-y-1 list-decimal list-inside">
                              {trend.pendingDetails.map((detail, i) => (
                                <li key={i} className="text-muted-foreground">{detail}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">Busca millores primer</p>
          </CardContent>
        </Card>
      )}

      {/* Otras listas - Rendiment i IA */}
      {improvementsAnalysis && (
        <div className="grid gap-4 md:grid-cols-2">
          {improvementsAnalysis.performanceOptimizations && improvementsAnalysis.performanceOptimizations.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    <CardTitle className="text-lg">Optimitzacions de Rendiment</CardTitle>
                  </div>
                  <Badge variant="outline">
                    {improvementsAnalysis.performanceOptimizations.filter(o => String(o).includes('✅')).length}/{improvementsAnalysis.performanceOptimizations.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {improvementsAnalysis.performanceOptimizations.map((opt, i) => {
                    const text = String(opt);
                    const isInstalled = text.includes('✅ INSTAL·LAT');
                    const isPending = text.includes('PENDENT');
                    
                    return (
                      <div 
                        key={i} 
                        className={`flex items-start gap-2 p-2 rounded text-sm ${
                          isInstalled ? 'bg-green-500/10' : isPending ? 'bg-yellow-500/10' : ''
                        }`}
                      >
                        {isInstalled ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : isPending ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Zap className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        )}
                        <span className={
                          isInstalled ? 'text-green-700 dark:text-green-400' : 
                          isPending ? 'text-yellow-700 dark:text-yellow-400' : 'text-muted-foreground'
                        }>
                          {text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {improvementsAnalysis.aiIntegrations && improvementsAnalysis.aiIntegrations.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    <CardTitle className="text-lg">Integracions IA</CardTitle>
                  </div>
                  <Badge variant="outline">
                    {improvementsAnalysis.aiIntegrations.filter(a => String(a).includes('✅')).length}/{improvementsAnalysis.aiIntegrations.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {improvementsAnalysis.aiIntegrations.map((ai, i) => {
                    const text = String(ai);
                    const isInstalled = text.includes('✅ INSTAL·LAT');
                    const isPending = text.includes('PENDENT');
                    
                    return (
                      <div 
                        key={i} 
                        className={`flex items-start gap-2 p-2 rounded text-sm ${
                          isInstalled ? 'bg-purple-500/10' : isPending ? 'bg-yellow-500/10' : ''
                        }`}
                      >
                        {isInstalled ? (
                          <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                        ) : isPending ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Brain className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        )}
                        <span className={
                          isInstalled ? 'text-purple-700 dark:text-purple-400' : 
                          isPending ? 'text-yellow-700 dark:text-yellow-400' : 'text-muted-foreground'
                        }>
                          {text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
