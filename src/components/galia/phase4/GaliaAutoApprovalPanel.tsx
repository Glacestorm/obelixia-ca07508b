/**
 * GaliaAutoApprovalPanel - Panel de aprobación semi-automática
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  FileCheck,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Timer,
  User,
  Sparkles
} from 'lucide-react';
import { useGaliaAutoApproval, PendingApproval } from '@/hooks/galia/useGaliaAutoApproval';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface GaliaAutoApprovalPanelProps {
  className?: string;
  expedienteId?: string;
  tecnicoId?: string;
}

export function GaliaAutoApprovalPanel({ className, expedienteId, tecnicoId }: GaliaAutoApprovalPanelProps) {
  const [activeTab, setActiveTab] = useState('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedExpediente, setSelectedExpediente] = useState<string | null>(expedienteId || null);

  const {
    isLoading,
    error,
    eligibility,
    preApproval,
    pendingApprovals,
    checkEligibility,
    preApprove,
    confirmApproval,
    reject,
    fetchPendingApprovals,
  } = useGaliaAutoApproval();

  useEffect(() => {
    fetchPendingApprovals();
  }, [fetchPendingApprovals]);

  const handleCheckEligibility = useCallback(async () => {
    if (selectedExpediente) {
      await checkEligibility(selectedExpediente);
      setActiveTab('eligibility');
    }
  }, [selectedExpediente, checkEligibility]);

  const handlePreApprove = useCallback(async () => {
    if (selectedExpediente) {
      await preApprove(selectedExpediente, tecnicoId);
    }
  }, [selectedExpediente, tecnicoId, preApprove]);

  const handleConfirm = useCallback(async () => {
    if (selectedExpediente && tecnicoId) {
      await confirmApproval(selectedExpediente, tecnicoId);
      fetchPendingApprovals();
    }
  }, [selectedExpediente, tecnicoId, confirmApproval, fetchPendingApprovals]);

  const handleReject = useCallback(async () => {
    if (selectedExpediente && tecnicoId && rejectionReason) {
      await reject(selectedExpediente, tecnicoId, rejectionReason);
      setRejectionReason('');
      fetchPendingApprovals();
    }
  }, [selectedExpediente, tecnicoId, rejectionReason, reject, fetchPendingApprovals]);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return <Badge className="bg-red-100 text-red-700">Urgente</Badge>;
      case 'normal': return <Badge variant="secondary">Normal</Badge>;
      case 'low': return <Badge variant="outline">Baja</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getHoursColor = (hours: number) => {
    if (hours <= 4) return 'text-red-600';
    if (hours <= 12) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-green-600 to-emerald-600">
            <FileCheck className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              Aprobación Semi-Automática
              <Sparkles className="h-4 w-4 text-amber-500" />
            </CardTitle>
            <p className="text-xs text-muted-foreground">Validación humana en 24h</p>
          </div>
          {pendingApprovals?.summary && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {pendingApprovals.summary.total} pendientes
              </Badge>
              {pendingApprovals.summary.expiringSoon > 0 && (
                <Badge className="bg-red-100 text-red-700">
                  {pendingApprovals.summary.expiringSoon} expirando
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="pending" className="text-xs">Pendientes</TabsTrigger>
            <TabsTrigger value="eligibility" className="text-xs">Elegibilidad</TabsTrigger>
            <TabsTrigger value="actions" className="text-xs">Acciones</TabsTrigger>
          </TabsList>

          {/* Pendientes */}
          <TabsContent value="pending">
            <div className="flex justify-end mb-3">
              <Button variant="outline" size="sm" onClick={() => fetchPendingApprovals()} disabled={isLoading}>
                <RefreshCw className={cn("h-3 w-3 mr-1", isLoading && "animate-spin")} />
                Actualizar
              </Button>
            </div>

            <ScrollArea className="h-[350px]">
              {pendingApprovals?.pendingApprovals && pendingApprovals.pendingApprovals.length > 0 ? (
                <div className="space-y-3">
                  {pendingApprovals.pendingApprovals.map((item: PendingApproval) => (
                    <div 
                      key={item.id} 
                      className={cn(
                        "p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer",
                        selectedExpediente === item.expedienteId && "ring-2 ring-primary"
                      )}
                      onClick={() => setSelectedExpediente(item.expedienteId)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{item.beneficiario}</p>
                          <p className="text-xs text-muted-foreground font-mono">{item.expedienteId}</p>
                        </div>
                        {getPriorityBadge(item.priority)}
                      </div>
                      
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {item.importeSolicitado.toLocaleString()}€
                        </span>
                        <div className="flex items-center gap-1">
                          <Timer className={cn("h-3 w-3", getHoursColor(item.hoursRemaining))} />
                          <span className={cn("text-xs font-medium", getHoursColor(item.hoursRemaining))}>
                            {item.hoursRemaining}h restantes
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Progress value={item.eligibilityScore} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground">{item.eligibilityScore}%</span>
                      </div>

                      {item.assignedTecnico && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          Asignado: {item.assignedTecnico}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay expedientes pendientes de validación</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Elegibilidad */}
          <TabsContent value="eligibility" className="space-y-4">
            {selectedExpediente ? (
              <>
                <div className="flex gap-2">
                  <Input 
                    value={selectedExpediente} 
                    onChange={(e) => setSelectedExpediente(e.target.value)}
                    placeholder="ID del expediente"
                  />
                  <Button onClick={handleCheckEligibility} disabled={isLoading}>
                    {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Verificar'}
                  </Button>
                </div>

                {eligibility && (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-4">
                      {/* Resultado */}
                      <div className={cn(
                        "p-4 rounded-lg border",
                        eligibility.eligible ? "bg-green-50 border-green-200 dark:bg-green-900/20" : "bg-red-50 border-red-200 dark:bg-red-900/20"
                      )}>
                        <div className="flex items-center gap-2 mb-2">
                          {eligibility.eligible ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <span className="font-medium">
                            {eligibility.eligible ? 'Expediente Elegible' : 'No Elegible'}
                          </span>
                        </div>
                        <Progress value={eligibility.score} className="h-3 mb-2" />
                        <p className="text-sm text-muted-foreground">Puntuación: {eligibility.score}/100</p>
                      </div>

                      {/* Criterios */}
                      <div className="space-y-2">
                        {eligibility.criteriaResults.map((criterion, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded border bg-card">
                            <div className="flex items-center gap-2">
                              {criterion.passed ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                              <span className="text-sm">{criterion.criterion}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">{criterion.weight}%</Badge>
                          </div>
                        ))}
                      </div>

                      {/* Documentos faltantes */}
                      {eligibility.missingDocuments.length > 0 && (
                        <div className="p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-900/20">
                          <h4 className="font-medium flex items-center gap-2 mb-2 text-yellow-700 dark:text-yellow-400">
                            <AlertTriangle className="h-4 w-4" />
                            Documentos faltantes
                          </h4>
                          <ul className="space-y-1">
                            {eligibility.missingDocuments.map((doc, i) => (
                              <li key={i} className="text-sm text-yellow-600 dark:text-yellow-300">• {doc}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Auto-aprobación */}
                      {eligibility.autoApprovalPossible && (
                        <Button onClick={handlePreApprove} disabled={isLoading} className="w-full">
                          <Sparkles className="h-4 w-4 mr-2" />
                          Pre-aprobar automáticamente
                        </Button>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Selecciona un expediente para verificar elegibilidad</p>
              </div>
            )}
          </TabsContent>

          {/* Acciones */}
          <TabsContent value="actions" className="space-y-4">
            {selectedExpediente && tecnicoId ? (
              <>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground mb-1">Expediente seleccionado:</p>
                  <p className="font-mono font-medium">{selectedExpediente}</p>
                </div>

                <div className="grid gap-3">
                  <Button 
                    onClick={handleConfirm} 
                    disabled={isLoading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Confirmar Aprobación
                  </Button>

                  <div className="space-y-2">
                    <Textarea
                      placeholder="Motivo del rechazo..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                    />
                    <Button 
                      variant="destructive"
                      onClick={handleReject} 
                      disabled={isLoading || !rejectionReason}
                      className="w-full"
                    >
                      <ThumbsDown className="h-4 w-4 mr-2" />
                      Rechazar Pre-aprobación
                    </Button>
                  </div>
                </div>

                {preApproval && (
                  <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20">
                    <h4 className="font-medium mb-2">Pre-aprobación activa</h4>
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-muted-foreground">Estado:</span>{' '}
                        <Badge variant="outline">{preApproval.status}</Badge>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Expira:</span>{' '}
                        {preApproval.expirationWarning}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {!selectedExpediente ? 'Selecciona un expediente' : 'Requiere ID de técnico'}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GaliaAutoApprovalPanel;
