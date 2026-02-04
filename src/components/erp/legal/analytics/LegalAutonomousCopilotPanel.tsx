/**
 * LegalAutonomousCopilotPanel
 * Phase 9: AI agent with proactive task execution and legal workflow automation
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Bot, 
  Brain, 
  Zap,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Send,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  ListTodo,
  MessageSquare
} from 'lucide-react';
import { useLegalAutonomousCopilot, type AutonomyLevel } from '@/hooks/admin/legal/useLegalAutonomousCopilot';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface LegalAutonomousCopilotPanelProps {
  className?: string;
}

export function LegalAutonomousCopilotPanel({ className }: LegalAutonomousCopilotPanelProps) {
  const [activeTab, setActiveTab] = useState('chat');
  const [inputText, setInputText] = useState('');

  const {
    isLoading,
    autonomyLevel,
    setAutonomyLevel,
    analysis,
    suggestedActions,
    complianceReview,
    deadlines,
    lastRefresh,
    analyzeSituation,
    suggestActions,
    draftDocument,
    reviewCompliance,
    monitorDeadlines,
    answerQuery,
  } = useLegalAutonomousCopilot();

  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);

  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim()) return;
    
    const userMessage = inputText;
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInputText('');

    const response = await answerQuery(userMessage);
    if (response) {
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.answer?.summary || response.answer?.detailedResponse || 'No se pudo procesar la consulta.'
      }]);
    }
  }, [inputText, answerQuery]);

  const handleAnalyze = useCallback(async () => {
    if (!inputText.trim()) return;
    await analyzeSituation({ description: inputText });
  }, [inputText, analyzeSituation]);

  const handleSuggestActions = useCallback(async () => {
    if (!inputText.trim()) return;
    await suggestActions({ description: inputText });
  }, [inputText, suggestActions]);

  const handleReviewCompliance = useCallback(async () => {
    await reviewCompliance({ scope: inputText || 'general' });
  }, [inputText, reviewCompliance]);

  const handleMonitorDeadlines = useCallback(async () => {
    await monitorDeadlines();
  }, [monitorDeadlines]);

  const getAutonomyIcon = (level: AutonomyLevel) => {
    switch (level) {
      case 'advisor': return <MessageSquare className="h-4 w-4" />;
      case 'semi_autonomous': return <Zap className="h-4 w-4" />;
      case 'fully_autonomous': return <Bot className="h-4 w-4" />;
    }
  };

  const getAutonomyColor = (level: AutonomyLevel) => {
    switch (level) {
      case 'advisor': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'semi_autonomous': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'fully_autonomous': return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': case 'immediate': return 'bg-red-500/20 text-red-400';
      case 'high': return 'bg-orange-500/20 text-orange-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-green-500/20 text-green-400';
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Copiloto Legal Autónomo
                <Badge variant="outline" className={getAutonomyColor(autonomyLevel)}>
                  {getAutonomyIcon(autonomyLevel)}
                  <span className="ml-1 capitalize">{autonomyLevel.replace('_', ' ')}</span>
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {lastRefresh 
                  ? `Última actividad ${formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}`
                  : 'Agente IA para operaciones legales'
                }
              </p>
            </div>
          </div>
          <Select value={autonomyLevel} onValueChange={(v) => setAutonomyLevel(v as AutonomyLevel)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="advisor">🔵 Asesor</SelectItem>
              <SelectItem value="semi_autonomous">🟡 Semi-autónomo</SelectItem>
              <SelectItem value="fully_autonomous">🟢 Autónomo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="chat" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="analysis" className="text-xs">
              <Brain className="h-3 w-3 mr-1" />
              Análisis
            </TabsTrigger>
            <TabsTrigger value="actions" className="text-xs">
              <ListTodo className="h-3 w-3 mr-1" />
              Acciones
            </TabsTrigger>
            <TabsTrigger value="compliance" className="text-xs">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Compliance
            </TabsTrigger>
            <TabsTrigger value="deadlines" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Plazos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-0">
            <div className="flex flex-col h-[400px]">
              <ScrollArea className="flex-1 p-2 border rounded-lg mb-2">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <Bot className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Pregúntame cualquier consulta legal
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Nivel: {autonomyLevel === 'advisor' ? 'Solo recomendaciones' : 
                             autonomyLevel === 'semi_autonomous' ? 'Ejecuto con confirmación' : 
                             'Ejecuto automáticamente'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={cn(
                        "p-3 rounded-lg max-w-[85%]",
                        msg.role === 'user' 
                          ? "ml-auto bg-primary text-primary-foreground" 
                          : "bg-muted"
                      )}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <div className="flex gap-2">
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Escribe tu consulta legal..."
                  className="min-h-[60px] flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputText.trim()}
                  size="icon"
                  className="h-[60px] w-[60px]"
                >
                  {isLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="mt-0">
            <div className="space-y-3 mb-3">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Describe la situación legal a analizar..."
                className="min-h-[80px]"
              />
              <Button onClick={handleAnalyze} disabled={isLoading || !inputText.trim()} className="w-full">
                {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
                Analizar Situación
              </Button>
            </div>
            <ScrollArea className="h-[280px]">
              {analysis ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border bg-card">
                    <h4 className="font-medium text-sm mb-2">Resumen</h4>
                    <p className="text-sm text-muted-foreground">{analysis.situationSummary}</p>
                  </div>

                  {analysis.keyIssues.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Issues Clave</h4>
                      {analysis.keyIssues.map((issue, idx) => (
                        <div key={idx} className="p-2 rounded border bg-muted/30 flex items-center justify-between">
                          <span className="text-sm">{issue.issue}</span>
                          <div className="flex gap-1">
                            <Badge className={getSeverityColor(issue.severity)} variant="outline">
                              {issue.severity}
                            </Badge>
                            <Badge className={getSeverityColor(issue.urgency)} variant="outline">
                              {issue.urgency}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-3 rounded-lg border bg-card">
                    <h4 className="font-medium text-sm mb-2">Evaluación de Riesgo</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Global:</span>
                        <Badge className={getSeverityColor(analysis.riskAssessment.overallRisk)}>
                          {analysis.riskAssessment.overallRisk}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Financiero:</span>
                        <span>€{analysis.riskAssessment.financialExposure.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {analysis.immediateActions.length > 0 && (
                    <div className="p-3 rounded-lg border border-orange-500/30 bg-orange-500/5">
                      <h4 className="font-medium text-sm mb-2 text-orange-400">⚡ Acciones Inmediatas</h4>
                      <ul className="space-y-1">
                        {analysis.immediateActions.map((action, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <Brain className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Describe una situación para obtener un análisis completo
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="actions" className="mt-0">
            <div className="space-y-3 mb-3">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Describe el contexto para sugerir acciones..."
                className="min-h-[60px]"
              />
              <Button onClick={handleSuggestActions} disabled={isLoading || !inputText.trim()} className="w-full">
                {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                Sugerir Acciones
              </Button>
            </div>
            <ScrollArea className="h-[300px]">
              {suggestedActions.length > 0 ? (
                <div className="space-y-2">
                  {suggestedActions.map((action, idx) => (
                    <div key={idx} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center">
                            {action.priority}
                          </Badge>
                          <span className="font-medium text-sm">{action.title}</span>
                        </div>
                        {action.canAutomate && (
                          <Badge className="bg-green-500/20 text-green-400">
                            <Bot className="h-3 w-3 mr-1" />
                            Automatizable
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{action.description}</p>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {action.estimatedEffort.hours}h | {action.estimatedEffort.complexity}
                        </span>
                        <Badge className={getSeverityColor(action.riskIfNotDone)} variant="outline">
                          Riesgo: {action.riskIfNotDone}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <ListTodo className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Describe el contexto para obtener sugerencias de acciones
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="compliance" className="mt-0">
            <Button onClick={handleReviewCompliance} disabled={isLoading} className="w-full mb-3">
              {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Revisar Cumplimiento
            </Button>
            <ScrollArea className="h-[320px]">
              {complianceReview ? (
                <div className="space-y-3">
                  <div className={cn("p-4 rounded-lg border",
                    complianceReview.complianceReview.overallStatus === 'compliant' && 'bg-green-500/10 border-green-500/30',
                    complianceReview.complianceReview.overallStatus === 'partially_compliant' && 'bg-yellow-500/10 border-yellow-500/30',
                    complianceReview.complianceReview.overallStatus === 'non_compliant' && 'bg-red-500/10 border-red-500/30'
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Estado General</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">{complianceReview.complianceReview.score}%</span>
                        <Badge className={
                          complianceReview.complianceReview.overallStatus === 'compliant' ? 'bg-green-500/20 text-green-400' :
                          complianceReview.complianceReview.overallStatus === 'partially_compliant' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }>
                          {complianceReview.complianceReview.overallStatus === 'compliant' && '✓ Cumple'}
                          {complianceReview.complianceReview.overallStatus === 'partially_compliant' && '⚠ Parcial'}
                          {complianceReview.complianceReview.overallStatus === 'non_compliant' && '✗ No Cumple'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {complianceReview.findings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Hallazgos</h4>
                      {complianceReview.findings.slice(0, 5).map((finding, idx) => (
                        <div key={idx} className={cn("p-2 rounded border", getSeverityColor(finding.severity))}>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">{finding.regulation}</span>
                            <Badge variant="outline">{finding.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{finding.requirement}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Ejecuta una revisión de cumplimiento
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="deadlines" className="mt-0">
            <Button onClick={handleMonitorDeadlines} disabled={isLoading} className="w-full mb-3">
              {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Clock className="h-4 w-4 mr-2" />}
              Actualizar Plazos
            </Button>
            <ScrollArea className="h-[320px]">
              {deadlines ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="p-2 rounded-lg bg-muted text-center">
                      <p className="text-lg font-bold">{deadlines.deadlineMonitor.totalActive}</p>
                      <p className="text-xs text-muted-foreground">Activos</p>
                    </div>
                    <div className="p-2 rounded-lg bg-red-500/10 text-center">
                      <p className="text-lg font-bold text-red-400">{deadlines.deadlineMonitor.overdue}</p>
                      <p className="text-xs text-muted-foreground">Vencidos</p>
                    </div>
                    <div className="p-2 rounded-lg bg-yellow-500/10 text-center">
                      <p className="text-lg font-bold text-yellow-400">{deadlines.deadlineMonitor.dueThisWeek}</p>
                      <p className="text-xs text-muted-foreground">Esta semana</p>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-500/10 text-center">
                      <p className="text-lg font-bold text-blue-400">{deadlines.deadlineMonitor.dueThisMonth}</p>
                      <p className="text-xs text-muted-foreground">Este mes</p>
                    </div>
                  </div>

                  {deadlines.criticalDeadlines.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Plazos Críticos</h4>
                      {deadlines.criticalDeadlines.map((deadline, idx) => (
                        <div key={idx} className={cn("p-3 rounded-lg border",
                          deadline.status === 'overdue' && 'bg-red-500/10 border-red-500/30',
                          deadline.status === 'at_risk' && 'bg-yellow-500/10 border-yellow-500/30',
                          deadline.status === 'on_track' && 'bg-green-500/10 border-green-500/30'
                        )}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{deadline.matter}</p>
                              <p className="text-xs text-muted-foreground">{deadline.deadline}</p>
                            </div>
                            <Badge className={
                              deadline.daysRemaining < 0 ? 'bg-red-500/20 text-red-400' :
                              deadline.daysRemaining <= 7 ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-green-500/20 text-green-400'
                            }>
                              {deadline.daysRemaining < 0 
                                ? `Vencido hace ${Math.abs(deadline.daysRemaining)}d`
                                : `${deadline.daysRemaining}d`}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">{deadline.consequence}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <Clock className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Monitorea plazos y vencimientos legales
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default LegalAutonomousCopilotPanel;
