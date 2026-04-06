import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, Brain, Shield, Bot, Workflow, Lock, Building2, Map, Scale, CheckCircle2 } from 'lucide-react';

const CATEGORY_ICONS: Record<string, any> = {
  security: Shield,
  performance: undefined,
  ai: Brain,
  compliance: Scale,
  ux: undefined,
  integrations: undefined,
  devops: undefined,
  analytics: undefined,
  automation: Workflow,
  nlp: Bot,
  documents: FileText,
  predictions: undefined,
  risk: undefined,
  personalization: undefined,
  fraud: Shield,
  'customer-service': Bot,
  optimization: undefined,
  vision: FileText,
};

const RISK_COLORS: Record<string, string> = {
  bajo: 'bg-green-500',
  medio: 'bg-yellow-500',
  alto: 'bg-red-500',
};

interface AIAnalysis {
  generationDate: string;
  executiveSummary: string;
  aiRecommendations: {
    category: string;
    title: string;
    description: string;
    riskLevel: string;
    complianceNotes?: string;
    securityConsiderations?: string[];
    regulatoryFramework?: string[];
    estimatedEffort?: string;
    tools?: string[];
    bestPractices?: string[];
    bankingExamples?: string[];
  }[];
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
  implementationRoadmap?: {
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
    setupGuide: { title: string; steps: string[] }[];
    workflowExamples: { name: string; description: string; triggers: string[]; actions: string[] }[];
    securityConfiguration: string[];
    maintenanceGuide: string[];
  }[];
  bankingTrends?: any[];
}

interface AIAnalysisTabProps {
  aiAnalysis: AIAnalysis | null;
  isSearchingAI: boolean;
  searchAIRecommendations: () => void;
}

export function AIAnalysisTab({ aiAnalysis, isSearchingAI, searchAIRecommendations }: AIAnalysisTabProps) {
  if (!aiAnalysis) {
    return (
      <Card className="border-dashed border-purple-500/30">
        <CardContent className="py-16 text-center">
          <Brain className="h-16 w-16 mx-auto text-purple-500/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">IA i Automatització Bancària</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Obté recomanacions intel·ligents sobre com implementar IA a l'aplicació complint amb totes les normatives bancàries (GDPR, AI Act, DORA, MiFID II).
          </p>
          <Button
            onClick={searchAIRecommendations}
            disabled={isSearchingAI}
            className="bg-gradient-to-r from-purple-600 to-blue-600"
          >
            {isSearchingAI ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Brain className="mr-2 h-4 w-4" />
            )}
            Generar Recomanacions IA
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[700px]">
      <div className="space-y-6 pr-4">
        {/* Resumen Ejecutivo */}
        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-blue-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <CardTitle>Resum Executiu - IA en Banca</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line">{aiAnalysis.executiveSummary}</p>
          </CardContent>
        </Card>

        {/* Recomendaciones IA */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-500" />
              <CardTitle>Recomanacions d'Implementació IA</CardTitle>
            </div>
            <CardDescription>Casos d'ús prioritzats per compliment normatiu i seguretat</CardDescription>
          </CardHeader>
          <CardContent>
            {(!aiAnalysis.aiRecommendations || aiAnalysis.aiRecommendations.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No s'han trobat recomanacions d'IA.</p>
                <p className="text-sm mt-1">Prova a executar "Recomanacions IA" de nou.</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {aiAnalysis.aiRecommendations.slice(0, 8).map((rec, idx) => {
                  const Icon = CATEGORY_ICONS[rec?.category] || Brain;
                  return (
                    <AccordionItem key={idx} value={`ai-${idx}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          {Icon ? <Icon className="h-5 w-5 text-primary flex-shrink-0" /> : <Brain className="h-5 w-5 text-primary flex-shrink-0" />}
                          <div className="flex-1">
                            <div className="font-medium">{rec?.title || 'Sense títol'}</div>
                            <div className="text-xs text-muted-foreground">{rec?.category || 'general'}</div>
                          </div>
                          <Badge className={RISK_COLORS[rec?.riskLevel] || 'bg-gray-500'}>
                            Risc: {rec?.riskLevel || 'desconegut'}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4">
                        <p className="text-sm">{rec?.description || 'Sense descripció'}</p>
                        
                        {rec?.complianceNotes && (
                          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                            <div className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400 mb-2">
                              <Lock className="h-4 w-4" />
                              Notes de Compliment
                            </div>
                            <p className="text-sm text-muted-foreground">{rec.complianceNotes}</p>
                          </div>
                        )}

                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <div className="font-medium text-sm mb-2 flex items-center gap-1">
                              <Shield className="h-3 w-3" /> Seguretat
                            </div>
                            <ul className="text-xs space-y-1">
                              {(rec?.securityConsiderations || []).map((s, i) => (
                                <li key={i} className="text-muted-foreground">• {typeof s === 'string' ? s : JSON.stringify(s)}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <div className="font-medium text-sm mb-2 flex items-center gap-1">
                              <Scale className="h-3 w-3" /> Normatives
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(rec?.regulatoryFramework || []).map((r, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{typeof r === 'string' ? r : JSON.stringify(r)}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        {rec?.estimatedEffort && (
                          <div className="text-sm">
                            <span className="font-medium">Esforç estimat:</span> {rec.estimatedEffort}
                          </div>
                        )}

                        {rec?.tools && rec.tools.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {rec.tools.map((t, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{typeof t === 'string' ? t : JSON.stringify(t)}</Badge>
                            ))}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* Plataformas de Automatización */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-orange-500" />
              <CardTitle>Plataformes d'Automatització - Guies Detallades</CardTitle>
            </div>
            <CardDescription>n8n, Make, Power Automate - Manuals d'implementació pas a pas</CardDescription>
          </CardHeader>
          <CardContent>
            {(!aiAnalysis.automationPlatforms || aiAnalysis.automationPlatforms.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground">
                <Workflow className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No s'han trobat plataformes d'automatització.</p>
                <p className="text-sm mt-1">Prova a executar "Recomanacions IA" de nou.</p>
              </div>
            ) : (
            <Accordion type="single" collapsible className="w-full">
              {aiAnalysis.automationPlatforms.map((platform, idx) => (
                <AccordionItem key={idx} value={`platform-${idx}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <Workflow className="h-5 w-5 text-orange-500 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium">{platform.platform}</div>
                        <div className="text-xs text-muted-foreground">{platform.integrationComplexity}</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <p className="text-sm">{platform.description}</p>
                    
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <div className="flex items-center gap-2 font-medium text-yellow-700 dark:text-yellow-400 mb-2">
                        <Shield className="h-4 w-4" />
                        Notes de Seguretat
                      </div>
                      <p className="text-sm text-muted-foreground">{platform.securityNotes}</p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="font-medium text-sm mb-2">Casos d'Ús Bancaris</div>
                        <ul className="text-xs space-y-1">
                          {platform.bankingApplications?.map((app, i) => (
                            <li key={i} className="text-muted-foreground">• {app}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium text-sm mb-2">Consideracions Compliance</div>
                        <ul className="text-xs space-y-1">
                          {platform.complianceConsiderations?.map((c, i) => (
                            <li key={i} className="text-muted-foreground">• {c}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {platform.implementationGuide && (
                      <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
                        <div className="font-medium text-sm mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          Guia d'Implementació
                        </div>
                        <div className="grid gap-2 md:grid-cols-2 mb-4 text-xs">
                          <div><strong>Temps estimat:</strong> {platform.implementationGuide.estimatedTime}</div>
                          <div><strong>Dificultat:</strong> {platform.implementationGuide.difficulty}</div>
                        </div>
                        
                        {platform.implementationGuide.prerequisites && platform.implementationGuide.prerequisites.length > 0 && (
                          <div className="mb-4">
                            <div className="text-xs font-medium mb-2">Prerequisits:</div>
                            <ul className="text-xs space-y-1">
                              {platform.implementationGuide.prerequisites.map((p, i) => (
                                <li key={i} className="text-muted-foreground">✓ {p}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {platform.implementationGuide.steps && platform.implementationGuide.steps.length > 0 && (
                          <div>
                            <div className="text-xs font-medium mb-2">Passos d'Implementació:</div>
                            <div className="space-y-3">
                              {platform.implementationGuide.steps.map((step, i) => (
                                <div key={i} className="p-3 rounded border bg-background">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="text-xs">{step.stepNumber}</Badge>
                                    <span className="font-medium text-sm">{step.title}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-2">{step.description}</p>
                                  {step.commands && step.commands.length > 0 && (
                                    <div className="bg-muted p-2 rounded font-mono text-xs mb-2">
                                      {step.commands.map((cmd, ci) => (
                                        <div key={ci}>{cmd}</div>
                                      ))}
                                    </div>
                                  )}
                                  {step.tips?.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {step.tips.map((tip, ti) => (
                                        <Badge key={ti} variant="secondary" className="text-xs">💡 {tip}</Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            )}
          </CardContent>
        </Card>

        {/* Análisis Competencia */}
        {aiAnalysis.competitorAnalysis && aiAnalysis.competitorAnalysis.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                <CardTitle>Anàlisi de Competència - Fases d'Implementació</CardTitle>
              </div>
              <CardDescription>Què fan els competidors i com replicar-ho pas a pas</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {aiAnalysis.competitorAnalysis.map((comp, idx) => (
                  <AccordionItem key={idx} value={`comp-${idx}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <Building2 className="h-5 w-5 text-blue-500 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium">{comp.competitor}</div>
                          <div className="text-xs text-muted-foreground">{comp.aiFeatures?.length || 0} funcionalitats IA</div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="font-medium text-sm mb-2">Funcionalitats IA</div>
                          <ul className="text-xs space-y-1">
                            {comp.aiFeatures?.map((f, i) => (
                              <li key={i} className="text-muted-foreground">• {f}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="font-medium text-sm mb-2">Oportunitat de Diferenciació</div>
                          <p className="text-xs text-primary">{comp.differentiationOpportunity}</p>
                          {comp.technicalRequirements && (
                            <div className="mt-3">
                              <div className="text-xs font-medium mb-1">Requisits Tècnics:</div>
                              <ul className="text-xs space-y-1">
                                {comp.technicalRequirements.map((r, i) => (
                                  <li key={i} className="text-muted-foreground">• {r}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {comp.estimatedInvestment && (
                            <div className="mt-2 text-xs">
                              <strong>Inversió estimada:</strong> {comp.estimatedInvestment}
                            </div>
                          )}
                        </div>
                      </div>

                      {comp.implementationPhases && Array.isArray(comp.implementationPhases) && comp.implementationPhases.length > 0 && (
                        <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
                          <div className="font-medium text-sm mb-3 flex items-center gap-2">
                            <Map className="h-4 w-4 text-green-500" />
                            Fases d'Implementació per Replicar
                          </div>
                          <div className="space-y-4">
                            {comp.implementationPhases.map((phase, pi) => (
                              <div key={pi} className="p-3 rounded border bg-background">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className="bg-blue-500">{phase.phase}</Badge>
                                  <span className="font-medium text-sm">{phase.name}</span>
                                  <span className="text-xs text-muted-foreground">({phase.duration})</span>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2 text-xs">
                                  <div>
                                    <div className="font-medium mb-1">Objectius:</div>
                                    <ul className="space-y-0.5">
                                      {phase.objectives?.map((o, oi) => (
                                        <li key={oi} className="text-muted-foreground">• {o}</li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <div className="font-medium mb-1">Entregables:</div>
                                    <ul className="space-y-0.5">
                                      {phase.deliverables?.map((d, di) => (
                                        <li key={di} className="text-muted-foreground">✓ {d}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                                {phase.resources && Array.isArray(phase.resources) && phase.resources.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {phase.resources.map((r, ri) => (
                                      <Badge key={ri} variant="outline" className="text-xs">{r}</Badge>
                                    ))}
                                  </div>
                                )}
                                {phase.successMetrics && Array.isArray(phase.successMetrics) && phase.successMetrics.length > 0 && (
                                  <div className="mt-2 text-xs">
                                    <strong>KPIs:</strong> {phase.successMetrics.join(', ')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Roadmap Detallado */}
        {aiAnalysis.implementationRoadmap && Array.isArray(aiAnalysis.implementationRoadmap) && aiAnalysis.implementationRoadmap.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Map className="h-5 w-5 text-green-500" />
                <CardTitle>Roadmap Detallat d'Implementació IA</CardTitle>
              </div>
              <CardDescription>Fases amb passos detallats, pressupost i KPIs</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {aiAnalysis.implementationRoadmap.map((phase, idx) => (
                  <AccordionItem key={idx} value={`roadmap-${idx}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left w-full">
                        <div className="h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{phase.phase}</div>
                          <div className="text-xs text-muted-foreground">{phase.duration}</div>
                        </div>
                        {phase.budget && (
                          <Badge variant="outline" className="text-xs">{phase.budget}</Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="font-medium text-sm mb-2">Objectius</div>
                          <ul className="text-xs space-y-1">
                            {phase.objectives?.map((o, i) => (
                              <li key={i} className="text-muted-foreground">• {o}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="font-medium text-sm mb-2">Entregables</div>
                          <ul className="text-xs space-y-1">
                            {phase.deliverables?.map((d, i) => (
                              <li key={i} className="text-muted-foreground">✓ {d}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {phase.kpis && Array.isArray(phase.kpis) && phase.kpis.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs font-medium mr-2">KPIs:</span>
                          {phase.kpis.map((kpi, i) => (
                            <Badge key={i} className="bg-green-500/20 text-green-700 dark:text-green-400 text-xs">{kpi}</Badge>
                          ))}
                        </div>
                      )}

                      {phase.detailedSteps && Array.isArray(phase.detailedSteps) && phase.detailedSteps.length > 0 && (
                        <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
                          <div className="font-medium text-sm mb-3">Passos Detallats</div>
                          <div className="space-y-3">
                            {phase.detailedSteps.map((step, si) => (
                              <div key={si} className="flex gap-3 p-3 rounded border bg-background">
                                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                                  {step.step}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{step.action}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    <strong>Responsable:</strong> {step.responsible}
                                  </div>
                                  {step.tools && step.tools.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {step.tools.map((t, ti) => (
                                        <Badge key={ti} variant="outline" className="text-xs">{t}</Badge>
                                      ))}
                                    </div>
                                  )}
                                  {step.documentation && (
                                    <div className="text-xs text-primary mt-1">📄 {step.documentation}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Manuales de Automatización */}
        {aiAnalysis.automationManuals && Array.isArray(aiAnalysis.automationManuals) && aiAnalysis.automationManuals.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-500" />
                <CardTitle>Manuals d'Automatització</CardTitle>
              </div>
              <CardDescription>Guies completes per configurar cada plataforma</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {aiAnalysis.automationManuals.map((manual, idx) => (
                  <AccordionItem key={idx} value={`manual-${idx}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <FileText className="h-5 w-5 text-purple-500 flex-shrink-0" />
                        <div className="font-medium">{manual.platform}</div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      {manual.setupGuide && Array.isArray(manual.setupGuide) && manual.setupGuide.length > 0 && (
                        <div>
                          <div className="font-medium text-sm mb-2">Guia de Configuració</div>
                          {manual.setupGuide.map((guide, gi) => (
                            <div key={gi} className="mb-3 p-3 rounded border">
                              <div className="font-medium text-sm mb-2">{guide.title}</div>
                              <ol className="text-xs space-y-1 list-decimal list-inside">
                                {guide.steps?.map((s, si) => (
                                  <li key={si} className="text-muted-foreground">{s}</li>
                                ))}
                              </ol>
                            </div>
                          ))}
                        </div>
                      )}

                      {manual.workflowExamples && Array.isArray(manual.workflowExamples) && manual.workflowExamples.length > 0 && (
                        <div>
                          <div className="font-medium text-sm mb-2">Exemples de Workflows</div>
                          <div className="grid gap-3 md:grid-cols-2">
                            {manual.workflowExamples.map((wf, wi) => (
                              <div key={wi} className="p-3 rounded border bg-muted/30">
                                <div className="font-medium text-sm mb-1">{wf.name}</div>
                                <p className="text-xs text-muted-foreground mb-2">{wf.description}</p>
                                <div className="text-xs">
                                  <strong>Triggers:</strong> {wf.triggers?.join(', ')}
                                </div>
                                <div className="text-xs mt-1">
                                  <strong>Accions:</strong> {wf.actions?.join(', ')}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {manual.securityConfiguration && Array.isArray(manual.securityConfiguration) && manual.securityConfiguration.length > 0 && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                          <div className="font-medium text-sm mb-2 flex items-center gap-2">
                            <Lock className="h-4 w-4 text-red-500" />
                            Configuració de Seguretat
                          </div>
                          <ul className="text-xs space-y-1">
                            {manual.securityConfiguration.map((sc, sci) => (
                              <li key={sci} className="text-muted-foreground">• {sc}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {manual.maintenanceGuide && Array.isArray(manual.maintenanceGuide) && manual.maintenanceGuide.length > 0 && (
                        <div>
                          <div className="font-medium text-sm mb-2">Guia de Manteniment</div>
                          <ul className="text-xs space-y-1">
                            {manual.maintenanceGuide.map((mg, mgi) => (
                              <li key={mgi} className="text-muted-foreground">• {mg}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Directrices de Seguridad */}
        {aiAnalysis.securityGuidelines && Array.isArray(aiAnalysis.securityGuidelines) && aiAnalysis.securityGuidelines.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-red-500" />
                <CardTitle>Directrius de Seguretat per IA Bancària</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2">
                {aiAnalysis.securityGuidelines.map((guideline, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{guideline}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
