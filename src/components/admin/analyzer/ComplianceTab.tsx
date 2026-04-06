import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertTriangle, CheckCircle2, Scale, Map, Clock } from 'lucide-react';

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

interface ComplianceTabProps {
  complianceRegulations: ComplianceRegulation[] | undefined;
}

export function ComplianceTab({ complianceRegulations }: ComplianceTabProps) {
  if (!complianceRegulations || !Array.isArray(complianceRegulations) || complianceRegulations.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <Scale className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">Compliance Normatiu</h3>
          <p className="text-muted-foreground">
            Executa l'anàlisi de millores per veure l'estat de compliance.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Estadísticas de compliance */}
      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <Card className="border-green-500/50 bg-green-500/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {complianceRegulations.filter(r => r.status === 'compliant').length}
                </p>
                <p className="text-sm text-muted-foreground">Normatives Complertes</p>
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
                  {complianceRegulations.filter(r => r.status === 'partial').length}
                </p>
                <p className="text-sm text-muted-foreground">Parcial / En Progrés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {complianceRegulations.length}
                </p>
                <p className="text-sm text-muted-foreground">Total Normatives</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Normativas Cumplidas */}
      <Card className="border-green-500/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <CardTitle>Normatives Complertes ({complianceRegulations.filter(r => r.status === 'compliant').length})</CardTitle>
          </div>
          <CardDescription>Regulacions amb implementació completa</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {complianceRegulations.filter(r => r.status === 'compliant').map((reg, idx) => (
              <AccordionItem key={idx} value={`compliant-${idx}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left w-full">
                    <div className="flex flex-col items-center shrink-0">
                      <Badge className={`${reg.compliancePercentage === 100 ? 'bg-green-500' : reg.compliancePercentage && reg.compliancePercentage >= 90 ? 'bg-green-400' : 'bg-green-500'} text-white min-w-[60px] justify-center`}>
                        {reg.compliancePercentage || 100}%
                      </Badge>
                      {reg.totalRequirements && (
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {reg.implementedRequirements}/{reg.totalRequirements}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{reg.name}</div>
                      <div className="text-xs text-muted-foreground">{reg.jurisdiction && `[${reg.jurisdiction}] `}{reg.description}</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="font-medium text-sm mb-2 text-green-700 dark:text-green-400">
                        ✅ Funcionalitats implementades:
                      </div>
                      <ul className="text-sm space-y-1">
                        {reg.implementedFeatures.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="h-3 w-3 mt-1 text-green-500 flex-shrink-0" />
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {reg.implementationPhases && reg.implementationPhases.length > 0 && (
                      <div className="p-3 rounded-lg bg-muted/50 border">
                        <div className="font-medium text-sm mb-3 flex items-center gap-2">
                          <Map className="h-4 w-4 text-primary" />
                          Fases d'implementació realitzades:
                        </div>
                        <div className="space-y-3">
                          {reg.implementationPhases.map((phase, pi) => (
                            <div key={pi} className="p-3 rounded border bg-background">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className="bg-green-500">{phase.phase}</Badge>
                                <span className="font-medium text-sm">{phase.name}</span>
                                <span className="text-xs text-muted-foreground">({phase.duration})</span>
                              </div>
                              <div className="grid gap-3 md:grid-cols-2 text-xs">
                                <div>
                                  <div className="font-medium mb-1">Accions:</div>
                                  <ul className="space-y-0.5">
                                    {phase.actions.map((a, ai) => (
                                      <li key={ai} className="text-muted-foreground">• {a}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <div className="font-medium mb-1">Entregables:</div>
                                  <ul className="space-y-0.5">
                                    {phase.deliverables.map((d, di) => (
                                      <li key={di} className="text-muted-foreground">✓ {d}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                              <div className="mt-2 text-xs">
                                <strong>Responsable:</strong> {phase.responsible}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {reg.timeline && reg.timeline.length > 0 && (
                      <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <div className="font-medium text-sm mb-3 flex items-center gap-2 text-purple-700 dark:text-purple-400">
                          <Clock className="h-4 w-4" />
                          Cronograma d'aplicació normativa:
                        </div>
                        <div className="relative">
                          <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-purple-500/30" />
                          <div className="space-y-3 pl-6">
                            {reg.timeline.map((milestone, mi) => {
                              const milestoneDate = new Date(milestone.date);
                              const isPast = milestoneDate < new Date();
                              return (
                                <div key={mi} className="relative">
                                  <div className={`absolute -left-4 w-3 h-3 rounded-full border-2 ${isPast ? 'bg-green-500 border-green-500' : 'bg-background border-purple-500'}`} />
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                    <Badge className={`${isPast ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-purple-500/20 text-purple-700 dark:text-purple-400'} text-xs shrink-0`}>
                                      {milestone.date}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {isPast && '✓ '}{milestone.milestone}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Normativas Parciales */}
      {complianceRegulations.filter(r => r.status === 'partial').length > 0 && (
        <Card className="border-yellow-500/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <CardTitle>Normatives en Progrés ({complianceRegulations.filter(r => r.status === 'partial').length})</CardTitle>
            </div>
            <CardDescription>Regulacions amb implementació parcial - Accions requerides</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {complianceRegulations.filter(r => r.status === 'partial').map((reg, idx) => (
                <AccordionItem key={idx} value={`partial-${idx}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left w-full">
                      <div className="flex flex-col items-center shrink-0">
                        <Badge className={`${reg.compliancePercentage && reg.compliancePercentage >= 90 ? 'bg-yellow-400' : reg.compliancePercentage && reg.compliancePercentage >= 75 ? 'bg-yellow-500' : reg.compliancePercentage && reg.compliancePercentage >= 50 ? 'bg-orange-500' : 'bg-red-500'} text-white min-w-[60px] justify-center font-bold`}>
                          {reg.compliancePercentage || 0}%
                        </Badge>
                        {reg.totalRequirements && (
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            {reg.implementedRequirements}/{reg.totalRequirements}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{reg.name}</div>
                        <div className="text-xs text-muted-foreground">{reg.jurisdiction && `[${reg.jurisdiction}] `}{reg.description}</div>
                      </div>
                      <Progress value={reg.compliancePercentage || 0} className="w-24 h-2" />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="space-y-4">
                      {reg.implementedFeatures.length > 0 && (
                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                          <div className="font-medium text-sm mb-2 text-green-700 dark:text-green-400">
                            ✅ Ja implementat:
                          </div>
                          <ul className="text-sm space-y-1">
                            {reg.implementedFeatures.map((feature, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <CheckCircle2 className="h-3 w-3 mt-1 text-green-500 flex-shrink-0" />
                                <span className="text-muted-foreground">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {reg.pendingActions.length > 0 && (
                        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                          <div className="font-medium text-sm mb-2 text-yellow-700 dark:text-yellow-400">
                            ⏳ Accions pendents per complir:
                          </div>
                          <ul className="text-sm space-y-1">
                            {reg.pendingActions.map((action, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <AlertTriangle className="h-3 w-3 mt-1 text-yellow-500 flex-shrink-0" />
                                <span className="text-muted-foreground">{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {reg.implementationPhases && reg.implementationPhases.length > 0 && (
                        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <div className="font-medium text-sm mb-3 flex items-center gap-2 text-blue-700 dark:text-blue-400">
                            <Map className="h-4 w-4" />
                            Fases d'implementació per completar:
                          </div>
                          <div className="space-y-3">
                            {reg.implementationPhases.map((phase, pi) => (
                              <div key={pi} className="p-3 rounded border bg-background">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className="bg-blue-500">Fase {phase.phase}</Badge>
                                  <span className="font-medium text-sm">{phase.name}</span>
                                  <span className="text-xs text-muted-foreground">({phase.duration})</span>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2 text-xs">
                                  <div>
                                    <div className="font-medium mb-1">Accions:</div>
                                    <ol className="space-y-0.5 list-decimal list-inside">
                                      {phase.actions.map((a, ai) => (
                                        <li key={ai} className="text-muted-foreground">{a}</li>
                                      ))}
                                    </ol>
                                  </div>
                                  <div>
                                    <div className="font-medium mb-1">Entregables:</div>
                                    <ul className="space-y-0.5">
                                      {phase.deliverables.map((d, di) => (
                                        <li key={di} className="text-muted-foreground">✓ {d}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                                <div className="mt-2 text-xs">
                                  <strong>Responsable:</strong> {phase.responsible}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Normativas Pendientes */}
      {complianceRegulations.filter(r => r.status === 'pending').length > 0 && (
        <Card className="border-red-500/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-red-500" />
              <CardTitle>Normatives Pendents ({complianceRegulations.filter(r => r.status === 'pending').length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {complianceRegulations.filter(r => r.status === 'pending').map((reg, idx) => (
                <div key={idx} className="p-3 rounded-lg border bg-red-500/5">
                  <div className="font-medium">{reg.name}</div>
                  <div className="text-sm text-muted-foreground">{reg.description}</div>
                  {reg.pendingActions.length > 0 && (
                    <ul className="mt-2 text-sm space-y-1">
                      {reg.pendingActions.map((action, i) => (
                        <li key={i} className="text-muted-foreground">• {action}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
