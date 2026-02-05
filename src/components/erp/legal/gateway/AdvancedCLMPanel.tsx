/**
 * AdvancedCLMPanel - Fase 10
 * Panel para Contract Lifecycle Management avanzado
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  FileSignature,
  Library,
  MessageSquare,
  GitCompare,
  RefreshCw,
  Search,
  BookOpen,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  PenTool,
  ArrowRight,
  Play,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Layers
} from 'lucide-react';
import { useAdvancedCLM } from '@/hooks/admin/legal';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AdvancedCLMPanelProps {
  contractId?: string;
  className?: string;
}

export function AdvancedCLMPanel({
  contractId,
  className
}: AdvancedCLMPanelProps) {
  const [activeTab, setActiveTab] = useState('library');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    isLoading,
    clauseLibrary,
    currentNegotiation,
    approvalWorkflow,
    signaturePreparation,
    lastRefresh,
    fetchClauseLibrary,
    startNegotiation,
    acceptNegotiationOption,
     trackApproval,
    prepareSignature
  } = useAdvancedCLM();

  useEffect(() => {
     fetchClauseLibrary({});
    if (contractId) {
       trackApproval(contractId);
    }
   }, [contractId, fetchClauseLibrary, trackApproval]);

  const getApprovalStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'high': return 'bg-red-100 text-red-700';
      default: return 'bg-muted';
    }
  };

  const filteredClauses = clauseLibrary?.clauses.filter(clause =>
    clause.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    clause.category.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <Card className={cn("border-primary/20", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/10 via-primary/5 to-accent/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <FileSignature className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">CLM Avanzado</CardTitle>
              <CardDescription>
                Contract Lifecycle Management con IA
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="library" className="text-xs">Biblioteca</TabsTrigger>
            <TabsTrigger value="negotiation" className="text-xs">Negociación</TabsTrigger>
            <TabsTrigger value="approval" className="text-xs">Aprobación</TabsTrigger>
            <TabsTrigger value="signature" className="text-xs">Firma</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cláusulas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {clauseLibrary && (
              <>
                <div className="flex gap-2 flex-wrap">
                  {clauseLibrary.categories.map((cat) => (
                    <Badge
                      key={cat.name}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => setSearchQuery(cat.name)}
                    >
                      {cat.name} ({cat.clauseCount})
                    </Badge>
                  ))}
                </div>

                <ScrollArea className="h-[350px]">
                  <div className="space-y-2">
                    {filteredClauses.map((clause) => (
                      <Card key={clause.id} className="p-3 hover:border-primary/50 transition-colors cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{clause.name}</span>
                              <Badge variant="outline" className="text-xs">{clause.category}</Badge>
                              <Badge className={cn("text-xs", getRiskLevelColor(clause.riskLevel))}>
                                {clause.riskLevel}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{clause.text.slice(0, 150)}...</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span>{clause.usageCount} usos</span>
                              <span>{clause.jurisdictions.join(', ')}</span>
                              {clause.isNegotiable && <Badge variant="secondary" className="text-xs">Negociable</Badge>}
                            </div>
                          </div>
                          <Button size="sm" variant="ghost">
                            <Play className="h-3 w-3" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </TabsContent>

          <TabsContent value="negotiation" className="space-y-4">
            {currentNegotiation ? (
              <>
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium">{currentNegotiation.clauseName}</h4>
                      <p className="text-sm text-muted-foreground">
                        Ronda {currentNegotiation.negotiationRound}
                      </p>
                    </div>
                    <Badge variant="outline">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Activo
                    </Badge>
                  </div>

                  <div className="space-y-3 mb-4">
                    {currentNegotiation.positions.map((pos, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{pos.party}</Badge>
                          <Badge className={cn(
                            pos.flexibility === 'high' ? 'bg-green-100 text-green-700' :
                            pos.flexibility === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          )}>
                            Flexibilidad: {pos.flexibility}
                          </Badge>
                        </div>
                        <p className="text-sm">{pos.proposedText}</p>
                        <p className="text-xs text-muted-foreground mt-2">{pos.rationale}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <h5 className="font-medium mb-3 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Opciones Recomendadas
                    </h5>
                    <div className="space-y-2">
                      {currentNegotiation.recommendations.map((rec) => (
                        <div key={rec.option} className="p-3 rounded-lg border hover:border-primary/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">Opción {rec.option}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs flex items-center gap-1">
                                <ThumbsUp className="h-3 w-3 text-green-500" />
                                {rec.acceptability.partyA}%
                              </span>
                              <span className="text-xs flex items-center gap-1">
                                <ThumbsUp className="h-3 w-3 text-blue-500" />
                                {rec.acceptability.partyB}%
                              </span>
                            </div>
                          </div>
                          <p className="text-sm">{rec.text}</p>
                          <div className="flex justify-end mt-2">
                            <Button size="sm" onClick={() => acceptNegotiationOption(rec.option)}>
                              Aceptar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Sin negociación activa</p>
                 <Button className="mt-4" onClick={() => startNegotiation(contractId || '', 'sample_clause')}>
                  Iniciar Negociación
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="approval" className="space-y-4">
            {approvalWorkflow ? (
              <>
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium">{approvalWorkflow.contractTitle}</h4>
                      <p className="text-sm text-muted-foreground">
                        Enviado {formatDistanceToNow(new Date(approvalWorkflow.submittedAt), { locale: es, addSuffix: true })}
                      </p>
                    </div>
                    <Badge className={cn(
                      approvalWorkflow.currentStatus === 'approved' ? 'bg-green-100 text-green-700' :
                      approvalWorkflow.currentStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    )}>
                      {approvalWorkflow.currentStatus}
                    </Badge>
                  </div>

                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-4">
                      {approvalWorkflow.approvalSteps.map((step, idx) => (
                        <div key={step.stepId} className="relative pl-10">
                          <div className={cn(
                            "absolute left-2 w-5 h-5 rounded-full flex items-center justify-center",
                            idx < approvalWorkflow.currentStep ? "bg-green-500" :
                            idx === approvalWorkflow.currentStep ? "bg-blue-500 animate-pulse" :
                            "bg-muted"
                          )}>
                            {idx < approvalWorkflow.currentStep && (
                              <CheckCircle className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{step.stepName}</span>
                              <Badge variant={
                                step.slaStatus === 'on_track' ? 'secondary' :
                                step.slaStatus === 'at_risk' ? 'outline' :
                                'destructive'
                              }>
                                {step.slaStatus}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {step.approvers.map((approver) => (
                                <div key={approver.userId} className="flex items-center gap-1 text-xs">
                                  {getApprovalStatusIcon(approver.status)}
                                  <span>{approver.userName}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                {approvalWorkflow.pendingApprovers.length > 0 && (
                  <Card className="p-4 border-yellow-200 bg-yellow-50/50">
                    <h4 className="font-medium mb-3 flex items-center gap-2 text-yellow-700">
                      <Clock className="h-4 w-4" />
                      Pendiente de Aprobación
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {approvalWorkflow.pendingApprovers.map((approver, idx) => (
                        <Badge key={idx} variant="outline">{approver}</Badge>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Sin workflow de aprobación activo</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="signature" className="space-y-4">
            {signaturePreparation ? (
              <>
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <PenTool className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">Firma Electrónica</h4>
                        <p className="text-sm text-muted-foreground">
                          {signaturePreparation.signatureType} - {signaturePreparation.eIDASLevel}
                        </p>
                      </div>
                    </div>
                    <Badge className={cn(
                      signaturePreparation.status === 'completed' ? 'bg-green-100 text-green-700' :
                      signaturePreparation.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    )}>
                      {signaturePreparation.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <div className="text-lg font-bold">{signaturePreparation.document.pages}</div>
                      <div className="text-xs text-muted-foreground">Páginas</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <div className="text-lg font-bold">{signaturePreparation.signatories.length}</div>
                      <div className="text-xs text-muted-foreground">Firmantes</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <div className="text-lg font-bold">
                        {signaturePreparation.signatories.filter(s => s.status === 'signed').length}
                      </div>
                      <div className="text-xs text-muted-foreground">Firmados</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {signaturePreparation.signatories.map((signatory) => (
                      <div key={signatory.signerEmail} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium",
                            signatory.status === 'signed' ? 'bg-green-500' :
                            signatory.status === 'viewed' ? 'bg-blue-500' :
                            'bg-muted-foreground'
                          )}>
                            {signatory.order}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{signatory.signerName}</div>
                            <div className="text-xs text-muted-foreground">{signatory.signerRole}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{signatory.party}</Badge>
                          <Badge className={cn(
                            signatory.status === 'signed' ? 'bg-green-100 text-green-700' :
                            signatory.status === 'viewed' ? 'bg-blue-100 text-blue-700' :
                            signatory.status === 'declined' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          )}>
                            {signatory.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  {signaturePreparation.legalRequirements.notarizationRequired && (
                    <div className="mt-4 p-3 rounded-lg bg-orange-50 border border-orange-200">
                      <div className="flex items-center gap-2 text-orange-700">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Requiere notarización</span>
                      </div>
                    </div>
                  )}
                </Card>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <PenTool className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Sin firma en preparación</p>
                 <Button className="mt-4" onClick={() => contractId && prepareSignature(contractId, 'qualified', [])}>
                  Preparar Firma
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default AdvancedCLMPanel;