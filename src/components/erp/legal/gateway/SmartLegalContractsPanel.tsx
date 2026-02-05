/**
 * SmartLegalContractsPanel - Fase 10
 * Panel para Smart Legal Contracts auto-ejecutables
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileCode,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Zap,
  Scale,
  FileText,
  DollarSign,
  Calendar,
  ShieldCheck,
  Gavel,
  ListChecks
} from 'lucide-react';
import { useSmartLegalContracts } from '@/hooks/admin/legal';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SmartLegalContractsPanelProps {
  contractId?: string;
  className?: string;
}

export function SmartLegalContractsPanel({
  contractId,
  className
}: SmartLegalContractsPanelProps) {
  const [activeTab, setActiveTab] = useState('clauses');

  const {
    isLoading,
    currentContract,
    executions,
    disputes,
    obligationsStatus,
    lastRefresh,
    fetchObligationsStatus,
    executeClause,
    simulateExecution
  } = useSmartLegalContracts();

  useEffect(() => {
    if (contractId) {
      fetchObligationsStatus(contractId);
    }
  }, [contractId, fetchObligationsStatus]);

  const getClauseTypeIcon = (type: string) => {
    switch (type) {
      case 'payment': return <DollarSign className="h-4 w-4" />;
      case 'penalty': return <AlertTriangle className="h-4 w-4" />;
      case 'renewal': return <RefreshCw className="h-4 w-4" />;
      case 'termination': return <Pause className="h-4 w-4" />;
      case 'notification': return <FileText className="h-4 w-4" />;
      default: return <FileCode className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'suspended': return 'bg-yellow-100 text-yellow-700';
      case 'terminated': return 'bg-red-100 text-red-700';
      case 'expired': return 'bg-orange-100 text-orange-700';
      default: return 'bg-muted';
    }
  };

  return (
    <Card className={cn("border-primary/20", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-green-500/10 via-primary/5 to-accent/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
              <FileCode className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Smart Legal Contracts</CardTitle>
              <CardDescription>
                Contratos auto-ejecutables con cláusulas programables
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
            <TabsTrigger value="clauses" className="text-xs">Cláusulas</TabsTrigger>
            <TabsTrigger value="executions" className="text-xs">Ejecuciones</TabsTrigger>
            <TabsTrigger value="obligations" className="text-xs">Obligaciones</TabsTrigger>
            <TabsTrigger value="disputes" className="text-xs">
              Disputas
              {disputes.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs px-1">
                  {disputes.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clauses" className="space-y-4">
            {currentContract ? (
              <>
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium">{currentContract.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        v{currentContract.version} • {currentContract.jurisdiction.join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentContract.legalValidity.isValid && (
                        <Badge className="bg-green-100 text-green-700">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          eIDAS
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {currentContract.programmableClauses.map((clause) => (
                      <div
                        key={clause.id}
                        className={cn(
                          "p-3 rounded-lg border transition-all",
                          clause.isActive ? "bg-card hover:border-primary/50" : "bg-muted/30 opacity-60"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getClauseTypeIcon(clause.type)}
                            <span className="font-medium">{clause.name}</span>
                            <Badge variant="outline" className="text-xs">{clause.type}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {clause.executionCount > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {clause.executionCount} ejecuciones
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={!clause.isActive}
                              onClick={() => executeClause(currentContract.id, clause.id)}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Ejecutar
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{clause.description}</p>
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            Trigger: {clause.trigger.type}
                          </span>
                          {clause.lastExecuted && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Última: {formatDistanceToNow(new Date(clause.lastExecuted), { locale: es, addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileCode className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay contrato seleccionado</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="executions">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cláusula</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Resultado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions.map((exec) => (
                    <TableRow key={exec.executionId}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(exec.executedAt), { locale: es, addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{exec.clauseId.slice(0, 8)}...</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {exec.triggerDetails.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          exec.actionExecuted.status === 'success' ? "bg-green-100 text-green-700" :
                          exec.actionExecuted.status === 'failed' ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        )}>
                          {exec.actionExecuted.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs">{exec.actionExecuted.type}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {executions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Sin ejecuciones registradas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="obligations" className="space-y-4">
            {obligationsStatus ? (
              <>
                <div className="grid grid-cols-4 gap-3">
                  <Card className="p-3 text-center">
                    <div className="text-2xl font-bold">{obligationsStatus.summary.total}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </Card>
                  <Card className="p-3 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{obligationsStatus.summary.pending}</div>
                    <div className="text-xs text-muted-foreground">Pendientes</div>
                  </Card>
                  <Card className="p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">{obligationsStatus.summary.completed}</div>
                    <div className="text-xs text-muted-foreground">Completadas</div>
                  </Card>
                  <Card className="p-3 text-center">
                    <div className="text-2xl font-bold text-red-600">{obligationsStatus.summary.overdue}</div>
                    <div className="text-xs text-muted-foreground">Vencidas</div>
                  </Card>
                </div>

                {obligationsStatus.upcomingDeadlines && obligationsStatus.upcomingDeadlines.length > 0 && (
                  <Card className="p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Próximos Vencimientos
                    </h4>
                    <div className="space-y-2">
                      {obligationsStatus.upcomingDeadlines.map((deadline) => (
                        <div key={deadline.obligationId} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              deadline.priority === 'high' ? 'destructive' :
                              deadline.priority === 'medium' ? 'outline' : 'secondary'
                            }>
                              {deadline.daysRemaining}d
                            </Badge>
                            <span className="text-sm">{deadline.description}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{deadline.deadline}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {obligationsStatus.overdueActions && obligationsStatus.overdueActions.length > 0 && (
                  <Card className="p-4 border-red-200 bg-red-50/50">
                    <h4 className="font-medium mb-3 flex items-center gap-2 text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      Acciones Vencidas
                    </h4>
                    <div className="space-y-2">
                      {obligationsStatus.overdueActions.map((action) => (
                        <div key={action.obligationId} className="flex items-center justify-between p-2 rounded-lg bg-white">
                          <div>
                            <span className="text-sm font-medium">{action.daysOverdue} días vencido</span>
                            {action.penaltyAccrued > 0 && (
                              <p className="text-xs text-red-600">
                                Penalización acumulada: €{action.penaltyAccrued.toLocaleString()}
                              </p>
                            )}
                          </div>
                          <Badge variant="destructive">{action.escalationStatus}</Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ListChecks className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Sin datos de obligaciones</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="disputes">
            <ScrollArea className="h-[400px]">
              {disputes.length > 0 ? (
                <div className="space-y-3">
                  {disputes.map((dispute) => (
                    <Card key={dispute.disputeId} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Gavel className="h-5 w-5 text-orange-500" />
                          <div>
                            <span className="font-medium">{dispute.disputeType}</span>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(dispute.initiatedAt), { locale: es, addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <Badge className={cn(
                          dispute.status === 'resolved' ? "bg-green-100 text-green-700" :
                          dispute.status === 'escalated' ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        )}>
                          {dispute.status}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">{dispute.description}</p>

                      {dispute.proposedResolution && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <h5 className="text-sm font-medium mb-2">Resolución Propuesta</h5>
                          <Badge variant="outline" className="mb-2">{dispute.proposedResolution.type}</Badge>
                          <p className="text-xs text-muted-foreground">{dispute.proposedResolution.recommendation}</p>
                        </div>
                      )}

                      <div className="mt-3 flex justify-end gap-2">
                        <Button size="sm" variant="outline">Ver Detalles</Button>
                        {dispute.status !== 'resolved' && (
                          <Button size="sm">Resolver</Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                  <p>Sin disputas activas</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default SmartLegalContractsPanel;