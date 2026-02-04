/**
 * HRContractLifecyclePanel - Panel principal de Contract Lifecycle Management
 * Gestión completa del ciclo de vida de contratos con IA
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Sparkles, 
  Scale,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileSearch,
  GitCompare,
  Shield,
  PenTool,
  Loader2,
  ChevronRight,
  Users,
  Calendar,
  Target
} from 'lucide-react';
import { useHRContractLifecycle } from '@/hooks/admin/hr/useHRContractLifecycle';
import { cn } from '@/lib/utils';

export function HRContractLifecyclePanel() {
  const [activeTab, setActiveTab] = useState('analyze');
  const [contractText, setContractText] = useState('');
  const [contractType, setContractType] = useState('employment');
  const [jurisdiction, setJurisdiction] = useState('ES');
  const [version1, setVersion1] = useState('');
  const [version2, setVersion2] = useState('');

  const {
    isLoading,
    error,
    contractAnalysis,
    clauseSuggestions,
    negotiationStrategy,
    versionComparison,
    obligations,
    riskAssessment,
    analyzeContract,
    suggestClauses,
    negotiateTerms,
    compareVersions,
    extractObligations,
    assessRisks,
  } = useHRContractLifecycle();

  const handleAnalyze = useCallback(async () => {
    if (!contractText.trim()) return;
    await analyzeContract(contractText);
  }, [contractText, analyzeContract]);

  const handleSuggestClauses = useCallback(async () => {
    await suggestClauses(contractType, jurisdiction);
  }, [contractType, jurisdiction, suggestClauses]);

  const handleCompareVersions = useCallback(async () => {
    if (!version1.trim() || !version2.trim()) return;
    await compareVersions(version1, version2);
  }, [version1, version2, compareVersions]);

  const handleExtractObligations = useCallback(async () => {
    if (!contractText.trim()) return;
    await extractObligations(contractText);
  }, [contractText, extractObligations]);

  const handleAssessRisks = useCallback(async () => {
    if (!contractAnalysis) return;
    await assessRisks(contractAnalysis as unknown as Record<string, unknown>);
  }, [contractAnalysis, assessRisks]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'minor': return 'border-green-500';
      case 'moderate': return 'border-yellow-500';
      case 'significant': return 'border-red-500';
      default: return 'border-muted';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Contract Lifecycle Management</h2>
            <p className="text-sm text-muted-foreground">
              Gestión inteligente del ciclo de vida de contratos con IA
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1">
          <Sparkles className="h-3 w-3" />
          Powered by AI
        </Badge>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="analyze" className="gap-1">
            <FileSearch className="h-4 w-4" />
            Análisis
          </TabsTrigger>
          <TabsTrigger value="clauses" className="gap-1">
            <PenTool className="h-4 w-4" />
            Cláusulas
          </TabsTrigger>
          <TabsTrigger value="negotiate" className="gap-1">
            <Scale className="h-4 w-4" />
            Negociación
          </TabsTrigger>
          <TabsTrigger value="versions" className="gap-1">
            <GitCompare className="h-4 w-4" />
            Versiones
          </TabsTrigger>
          <TabsTrigger value="obligations" className="gap-1">
            <Calendar className="h-4 w-4" />
            Obligaciones
          </TabsTrigger>
          <TabsTrigger value="risks" className="gap-1">
            <Shield className="h-4 w-4" />
            Riesgos
          </TabsTrigger>
        </TabsList>

        {/* Analyze Tab */}
        <TabsContent value="analyze" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSearch className="h-5 w-5" />
                Análisis de Contrato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Pega aquí el texto del contrato para analizar..."
                value={contractText}
                onChange={(e) => setContractText(e.target.value)}
                className="min-h-[200px]"
              />
              <Button 
                onClick={handleAnalyze} 
                disabled={isLoading || !contractText.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analizar Contrato con IA
                  </>
                )}
              </Button>

              {contractAnalysis && (
                <div className="mt-6 space-y-4">
                  {/* Summary */}
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Tipo</p>
                          <Badge variant="secondary">{contractAnalysis.contractType}</Badge>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Jurisdicción</p>
                          <Badge variant="outline">{contractAnalysis.jurisdiction}</Badge>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Vigencia</p>
                          <p className="text-sm font-medium">{contractAnalysis.effectiveDate}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Renovación Auto</p>
                          <Badge variant={contractAnalysis.autoRenewal ? 'default' : 'secondary'}>
                            {contractAnalysis.autoRenewal ? 'Sí' : 'No'}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm">{contractAnalysis.summary}</p>
                    </CardContent>
                  </Card>

                  {/* Key Terms */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Términos Clave
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {contractAnalysis.keyTerms.slice(0, 6).map((term, idx) => (
                        <div key={idx} className="p-2 rounded border bg-card">
                          <p className="text-xs text-muted-foreground">{term.term}</p>
                          <p className="text-sm font-medium">{term.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Parties */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Partes del Contrato
                    </h4>
                    <div className="space-y-2">
                      {contractAnalysis.parties.map((party, idx) => (
                        <div key={idx} className="p-3 rounded border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{party.name}</span>
                            <Badge variant="outline">{party.role}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {party.obligations.slice(0, 3).map((obl, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {obl}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Risk Areas */}
                  {contractAnalysis.riskAreas.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Áreas de Riesgo
                      </h4>
                      <div className="space-y-2">
                        {contractAnalysis.riskAreas.map((risk, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 rounded border">
                            <Badge className={getRiskColor(risk.severity)}>
                              {risk.severity}
                            </Badge>
                            <div>
                              <p className="font-medium text-sm">{risk.area}</p>
                              <p className="text-xs text-muted-foreground">{risk.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Compliance Status */}
                  <div className="flex items-center gap-3 p-3 rounded border">
                    {contractAnalysis.complianceStatus.isCompliant ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                    )}
                    <div>
                      <p className="font-medium">
                        {contractAnalysis.complianceStatus.isCompliant 
                          ? 'Contrato Conforme' 
                          : 'Requiere Revisión'}
                      </p>
                      {contractAnalysis.complianceStatus.issues.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {contractAnalysis.complianceStatus.issues.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clauses Tab */}
        <TabsContent value="clauses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenTool className="h-5 w-5" />
                Sugerencia de Cláusulas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo de Contrato</label>
                  <Select value={contractType} onValueChange={setContractType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employment">Laboral</SelectItem>
                      <SelectItem value="commercial">Comercial</SelectItem>
                      <SelectItem value="service">Servicios</SelectItem>
                      <SelectItem value="nda">Confidencialidad</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Jurisdicción</label>
                  <Select value={jurisdiction} onValueChange={setJurisdiction}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ES">España</SelectItem>
                      <SelectItem value="EU">Unión Europea</SelectItem>
                      <SelectItem value="US">Estados Unidos</SelectItem>
                      <SelectItem value="UK">Reino Unido</SelectItem>
                      <SelectItem value="LATAM">Latinoamérica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                onClick={handleSuggestClauses} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Sugerir Cláusulas
                  </>
                )}
              </Button>

              {clauseSuggestions && (
                <ScrollArea className="h-[400px] mt-4">
                  <div className="space-y-4">
                    {/* Priority Groups */}
                    {['essential', 'recommended', 'optional'].map((priority) => {
                      const clauses = clauseSuggestions.suggestedClauses.filter(
                        c => clauseSuggestions.clausesByPriority[priority as keyof typeof clauseSuggestions.clausesByPriority]?.includes(c.id)
                      );
                      if (clauses.length === 0) return null;

                      return (
                        <div key={priority}>
                          <h4 className="font-medium mb-2 capitalize flex items-center gap-2">
                            {priority === 'essential' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                            {priority === 'recommended' && <CheckCircle className="h-4 w-4 text-yellow-500" />}
                            {priority === 'optional' && <Clock className="h-4 w-4 text-blue-500" />}
                            Cláusulas {priority === 'essential' ? 'Esenciales' : priority === 'recommended' ? 'Recomendadas' : 'Opcionales'}
                          </h4>
                          <div className="space-y-2">
                            {clauses.map((clause) => (
                              <Card key={clause.id} className="border-l-4 border-l-primary">
                                <CardContent className="pt-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-medium">{clause.title}</h5>
                                    <Badge variant="outline">{clause.type}</Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {clause.text.substring(0, 200)}...
                                  </p>
                                  <p className="text-xs text-muted-foreground italic">
                                    {clause.rationale}
                                  </p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {clauseSuggestions.jurisdictionNotes && (
                      <Card className="bg-blue-50 dark:bg-blue-950/20">
                        <CardContent className="pt-4">
                          <h5 className="font-medium mb-2 flex items-center gap-2">
                            <Scale className="h-4 w-4" />
                            Notas Jurisdiccionales
                          </h5>
                          <p className="text-sm">{clauseSuggestions.jurisdictionNotes}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Versions Tab */}
        <TabsContent value="versions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitCompare className="h-5 w-5" />
                Comparación de Versiones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Versión 1 (Original)</label>
                  <Textarea
                    placeholder="Texto de la versión original..."
                    value={version1}
                    onChange={(e) => setVersion1(e.target.value)}
                    className="min-h-[150px]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Versión 2 (Modificada)</label>
                  <Textarea
                    placeholder="Texto de la versión modificada..."
                    value={version2}
                    onChange={(e) => setVersion2(e.target.value)}
                    className="min-h-[150px]"
                  />
                </div>
              </div>
              <Button 
                onClick={handleCompareVersions} 
                disabled={isLoading || !version1.trim() || !version2.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Comparando...
                  </>
                ) : (
                  <>
                    <GitCompare className="h-4 w-4 mr-2" />
                    Comparar Versiones
                  </>
                )}
              </Button>

              {versionComparison && (
                <div className="mt-4 space-y-4">
                  {/* Summary */}
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">{versionComparison.summary.totalChanges}</p>
                          <p className="text-xs text-muted-foreground">Cambios Totales</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-600">
                            {versionComparison.summary.byImpact.minor}
                          </p>
                          <p className="text-xs text-muted-foreground">Menores</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-yellow-600">
                            {versionComparison.summary.byImpact.moderate}
                          </p>
                          <p className="text-xs text-muted-foreground">Moderados</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-red-600">
                            {versionComparison.summary.byImpact.significant}
                          </p>
                          <p className="text-xs text-muted-foreground">Significativos</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Changes List */}
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {versionComparison.changes.map((change) => (
                        <Card 
                          key={change.id} 
                          className={cn("border-l-4", getImpactColor(change.impact))}
                        >
                          <CardContent className="pt-3 pb-3">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant={
                                change.type === 'addition' ? 'default' :
                                change.type === 'deletion' ? 'destructive' : 'secondary'
                              }>
                                {change.type === 'addition' ? 'Adición' :
                                 change.type === 'deletion' ? 'Eliminación' : 'Modificación'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{change.section}</span>
                            </div>
                            {change.originalText && (
                              <p className="text-sm line-through text-red-600/70 mb-1">
                                {change.originalText}
                              </p>
                            )}
                            {change.newText && (
                              <p className="text-sm text-green-600">
                                {change.newText}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2 italic">
                              {change.legalImplication}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Recommendation */}
                  <div className={cn(
                    "p-4 rounded-lg flex items-center gap-3",
                    versionComparison.summary.recommendation === 'approve' 
                      ? "bg-green-100 dark:bg-green-950/30"
                      : versionComparison.summary.recommendation === 'review'
                      ? "bg-yellow-100 dark:bg-yellow-950/30"
                      : "bg-red-100 dark:bg-red-950/30"
                  )}>
                    {versionComparison.summary.recommendation === 'approve' && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {versionComparison.summary.recommendation === 'review' && (
                      <Clock className="h-5 w-5 text-yellow-600" />
                    )}
                    {versionComparison.summary.recommendation === 'reject' && (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">
                        Recomendación: {
                          versionComparison.summary.recommendation === 'approve' ? 'Aprobar' :
                          versionComparison.summary.recommendation === 'review' ? 'Revisar' : 'Rechazar'
                        }
                      </p>
                      {versionComparison.summary.criticalChanges.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Cambios críticos: {versionComparison.summary.criticalChanges.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Obligations Tab */}
        <TabsContent value="obligations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Extracción de Obligaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleExtractObligations} 
                disabled={isLoading || !contractText.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Extrayendo...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Extraer Obligaciones del Contrato
                  </>
                )}
              </Button>

              {obligations && (
                <ScrollArea className="h-[400px] mt-4">
                  <div className="space-y-4">
                    {/* Critical Deadlines */}
                    {obligations.criticalDeadlines.length > 0 && (
                      <Card className="bg-red-50 dark:bg-red-950/20">
                        <CardContent className="pt-4">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            Fechas Críticas
                          </h4>
                          <div className="space-y-2">
                            {obligations.criticalDeadlines.map((deadline, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 rounded bg-white dark:bg-card">
                                <div>
                                  <p className="font-medium text-sm">{deadline.obligation}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Penalización: {deadline.penalty}
                                  </p>
                                </div>
                                <Badge variant="destructive">{deadline.date}</Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Obligations by Party */}
                    {Object.entries(obligations.obligationsByParty).map(([party, oblIds]) => (
                      <div key={party}>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {party}
                        </h4>
                        <div className="space-y-2">
                          {obligations.obligations
                            .filter(o => oblIds.includes(o.id))
                            .map((obl) => (
                              <Card key={obl.id}>
                                <CardContent className="pt-3 pb-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline">{obl.type}</Badge>
                                        <Badge className={getRiskColor(obl.priority)}>
                                          {obl.priority}
                                        </Badge>
                                      </div>
                                      <p className="text-sm">{obl.description}</p>
                                      {obl.dueDate && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          <Clock className="h-3 w-3 inline mr-1" />
                                          {obl.dueDate}
                                          {obl.isRecurring && ` (${obl.frequency})`}
                                        </p>
                                      )}
                                    </div>
                                    <Badge variant={
                                      obl.status === 'completed' ? 'default' :
                                      obl.status === 'overdue' ? 'destructive' : 'secondary'
                                    }>
                                      {obl.status}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </div>
                    ))}

                    {/* Compliance Checklist */}
                    {obligations.complianceChecklist.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Checklist de Cumplimiento
                        </h4>
                        <div className="space-y-1">
                          {obligations.complianceChecklist.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded border">
                              <span className="text-sm">{item.item}</span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{item.responsible}</span>
                                <Badge variant="outline">{item.deadline}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risks Tab */}
        <TabsContent value="risks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Evaluación de Riesgos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleAssessRisks} 
                disabled={isLoading || !contractAnalysis}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Evaluando...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Evaluar Riesgos del Contrato
                  </>
                )}
              </Button>

              {!contractAnalysis && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Primero analiza un contrato en la pestaña "Análisis"
                </p>
              )}

              {riskAssessment && (
                <div className="mt-4 space-y-4">
                  {/* Overall Risk */}
                  <Card className={cn(
                    "border-2",
                    riskAssessment.overallRisk === 'low' ? "border-green-500" :
                    riskAssessment.overallRisk === 'medium' ? "border-yellow-500" :
                    riskAssessment.overallRisk === 'high' ? "border-orange-500" : "border-red-500"
                  )}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Riesgo Global</p>
                          <p className="text-2xl font-bold capitalize">{riskAssessment.overallRisk}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Puntuación</p>
                          <p className="text-2xl font-bold">{riskAssessment.riskScore}/100</p>
                        </div>
                      </div>
                      <Progress 
                        value={riskAssessment.riskScore} 
                        className={cn(
                          "h-3",
                          riskAssessment.riskScore <= 30 ? "[&>div]:bg-green-500" :
                          riskAssessment.riskScore <= 60 ? "[&>div]:bg-yellow-500" :
                          riskAssessment.riskScore <= 80 ? "[&>div]:bg-orange-500" : "[&>div]:bg-red-500"
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Risk Matrix Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-red-50 dark:bg-red-950/20">
                      <CardContent className="pt-4 text-center">
                        <p className="text-2xl font-bold text-red-600">
                          {riskAssessment.riskMatrix.highLikelihoodHighImpact.length}
                        </p>
                        <p className="text-xs text-muted-foreground">Alto Impacto + Alta Prob.</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-orange-50 dark:bg-orange-950/20">
                      <CardContent className="pt-4 text-center">
                        <p className="text-2xl font-bold text-orange-600">
                          {riskAssessment.riskMatrix.lowLikelihoodHighImpact.length}
                        </p>
                        <p className="text-xs text-muted-foreground">Alto Impacto + Baja Prob.</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Risk List */}
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-2">
                      {riskAssessment.risks.map((risk) => (
                        <Card key={risk.id}>
                          <CardContent className="pt-3 pb-3">
                            <div className="flex items-start justify-between mb-2">
                              <Badge variant="outline">{risk.category}</Badge>
                              <Badge className={getRiskColor(risk.riskLevel)}>
                                {risk.riskLevel}
                              </Badge>
                            </div>
                            <p className="text-sm mb-2">{risk.description}</p>
                            <div className="text-xs text-muted-foreground">
                              <p><strong>Mitigación:</strong> {risk.mitigationStrategy}</p>
                              <p><strong>Riesgo Residual:</strong> {risk.residualRisk}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Recommendation */}
                  <Card className={cn(
                    "border-2",
                    riskAssessment.approvalRecommendation === 'approve' ? "border-green-500 bg-green-50 dark:bg-green-950/20" :
                    riskAssessment.approvalRecommendation === 'conditionalApprove' ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" :
                    "border-red-500 bg-red-50 dark:bg-red-950/20"
                  )}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3 mb-3">
                        {riskAssessment.approvalRecommendation === 'approve' && (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        )}
                        {riskAssessment.approvalRecommendation === 'conditionalApprove' && (
                          <Clock className="h-6 w-6 text-yellow-600" />
                        )}
                        {riskAssessment.approvalRecommendation === 'reject' && (
                          <AlertTriangle className="h-6 w-6 text-red-600" />
                        )}
                        <p className="font-bold text-lg">
                          {riskAssessment.approvalRecommendation === 'approve' ? 'Aprobar' :
                           riskAssessment.approvalRecommendation === 'conditionalApprove' ? 'Aprobación Condicional' :
                           'Rechazar'}
                        </p>
                      </div>
                      {riskAssessment.conditions.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Condiciones:</p>
                          <ul className="text-sm space-y-1">
                            {riskAssessment.conditions.map((condition, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <ChevronRight className="h-4 w-4" />
                                {condition}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Negotiate Tab - Placeholder */}
        <TabsContent value="negotiate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Estrategia de Negociación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Analiza un contrato primero para generar estrategias de negociación personalizadas.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRContractLifecyclePanel;
