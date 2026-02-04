/**
 * HRSmartContractsPanel
 * Panel de gestión de Contratos Legales Inteligentes y Smart Contracts
 * Fase 6 del Plan Maestro RRHH Enterprise
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  FileCode2,
  Plus,
  Play,
  Pause,
  RefreshCw,
  Shield,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  GitBranch,
  History,
  BarChart3,
  Settings,
  Eye,
  Cpu,
  Link2,
  FileText,
  Timer,
  TrendingUp,
  Users,
  Calendar,
  Lock,
  Unlock
} from 'lucide-react';
import { useHRSmartContracts, ContractType, SmartContract } from '@/hooks/admin/hr/useHRSmartContracts';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface HRSmartContractsPanelProps {
  className?: string;
}

export function HRSmartContractsPanel({ className }: HRSmartContractsPanelProps) {
  const [activeTab, setActiveTab] = useState('contracts');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newContractName, setNewContractName] = useState('');
  const [newContractType, setNewContractType] = useState<ContractType>('employment');

  const {
    isLoading,
    contracts,
    selectedContract,
    triggers,
    simulation,
    compliance,
    auditTrail,
    monitoring,
    execution,
    error,
    lastRefresh,
    createSmartContract,
    simulateExecution,
    validateCompliance,
    generateAuditTrail,
    monitorContract,
    executeClause,
    setSelectedContract,
    setContractTriggers,
  } = useHRSmartContracts();

  // Demo: Crear contrato de ejemplo
  const handleCreateContract = useCallback(async () => {
    if (!newContractName) return;
    
    await createSmartContract({
      name: newContractName,
      type: newContractType,
      parties: [
        { role: 'employer', name: 'Empresa S.L.', identifier: 'B12345678', signatureRequired: true },
        { role: 'employee', name: 'Empleado Demo', identifier: '12345678A', signatureRequired: true }
      ],
      effectiveDate: new Date().toISOString(),
      jurisdiction: 'ES'
    });
    
    setShowCreateForm(false);
    setNewContractName('');
  }, [newContractName, newContractType, createSmartContract]);

  // Simular contrato seleccionado
  const handleSimulate = useCallback(async () => {
    if (!selectedContract) return;
    
    const today = new Date();
    const nextYear = new Date(today);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    
    await simulateExecution(
      selectedContract,
      { from: today.toISOString(), to: nextYear.toISOString() },
      'realistic'
    );
  }, [selectedContract, simulateExecution]);

  // Validar cumplimiento
  const handleValidateCompliance = useCallback(async () => {
    if (!selectedContract) return;
    await validateCompliance(selectedContract);
  }, [selectedContract, validateCompliance]);

  // Generar audit trail
  const handleGenerateAudit = useCallback(async () => {
    if (!selectedContract) return;
    
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    await generateAuditTrail(
      selectedContract.id,
      { from: lastMonth.toISOString(), to: today.toISOString() }
    );
  }, [selectedContract, generateAuditTrail]);

  // Monitorear contrato
  const handleMonitor = useCallback(async () => {
    if (!selectedContract) return;
    await monitorContract(selectedContract.id);
  }, [selectedContract, monitorContract]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      active: 'bg-green-500/20 text-green-700',
      suspended: 'bg-yellow-500/20 text-yellow-700',
      terminated: 'bg-red-500/20 text-red-700',
      expired: 'bg-gray-500/20 text-gray-700',
      healthy: 'bg-green-500/20 text-green-700',
      warning: 'bg-yellow-500/20 text-yellow-700',
      critical: 'bg-red-500/20 text-red-700',
      inactive: 'bg-muted text-muted-foreground',
    };
    return styles[status] || 'bg-muted';
  };

  const getContractTypeLabel = (type: ContractType) => {
    const labels: Record<ContractType, string> = {
      employment: 'Contrato Laboral',
      severance: 'Finiquito',
      bonus: 'Bonus/Incentivo',
      benefits: 'Beneficios',
      nda: 'Confidencialidad',
      non_compete: 'No Competencia',
    };
    return labels[type] || type;
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <FileCode2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Smart Contracts
                <Badge variant="outline" className="text-xs font-normal">Fase 6</Badge>
              </CardTitle>
              <CardDescription>
                Contratos auto-ejecutables con IA
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Nuevo
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleMonitor}
              disabled={isLoading || !selectedContract}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Formulario de creación */}
        {showCreateForm && (
          <Card className="mb-4 border-dashed">
            <CardContent className="pt-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre del Contrato</Label>
                    <Input 
                      placeholder="Ej: Contrato Indefinido - Juan Pérez"
                      value={newContractName}
                      onChange={(e) => setNewContractName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={newContractType} onValueChange={(v) => setNewContractType(v as ContractType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employment">Contrato Laboral</SelectItem>
                        <SelectItem value="severance">Finiquito</SelectItem>
                        <SelectItem value="bonus">Bonus/Incentivo</SelectItem>
                        <SelectItem value="benefits">Beneficios</SelectItem>
                        <SelectItem value="nda">Confidencialidad</SelectItem>
                        <SelectItem value="non_compete">No Competencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowCreateForm(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleCreateContract} disabled={!newContractName || isLoading}>
                    <Cpu className="h-4 w-4 mr-1" />
                    Generar Smart Contract
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-4">
            <TabsTrigger value="contracts" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Contratos
            </TabsTrigger>
            <TabsTrigger value="triggers" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              Triggers
            </TabsTrigger>
            <TabsTrigger value="simulation" className="text-xs">
              <Play className="h-3 w-3 mr-1" />
              Simulación
            </TabsTrigger>
            <TabsTrigger value="compliance" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Compliance
            </TabsTrigger>
            <TabsTrigger value="audit" className="text-xs">
              <History className="h-3 w-3 mr-1" />
              Auditoría
            </TabsTrigger>
            <TabsTrigger value="monitor" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              Monitor
            </TabsTrigger>
          </TabsList>

          {/* TAB: Contratos */}
          <TabsContent value="contracts" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {contracts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileCode2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay Smart Contracts creados</p>
                    <p className="text-sm">Crea tu primer contrato inteligente</p>
                  </div>
                ) : (
                  contracts.map((contract) => (
                    <Card 
                      key={contract.id}
                      className={cn(
                        "cursor-pointer transition-all hover:border-primary/50",
                        selectedContract?.id === contract.id && "border-primary"
                      )}
                      onClick={() => setSelectedContract(contract)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{contract.name}</h4>
                              <Badge className={getStatusBadge(contract.status)}>
                                {contract.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {getContractTypeLabel(contract.type)} • v{contract.version}
                            </p>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(contract.effectiveDate), 'dd/MM/yyyy')}
                            </div>
                            {contract.autoRenewal && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                Auto-renovable
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Partes */}
                        <div className="mt-3 flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <div className="flex gap-1">
                            {contract.parties.map((party, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {party.role}: {party.name}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Cláusulas */}
                        {contract.clauses && contract.clauses.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-muted-foreground mb-2">
                              {contract.clauses.length} cláusulas definidas
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {contract.clauses.slice(0, 3).map((clause) => (
                                <Badge 
                                  key={clause.id} 
                                  variant={clause.automatable ? "default" : "outline"}
                                  className="text-xs"
                                >
                                  {clause.automatable && <Cpu className="h-3 w-3 mr-1" />}
                                  {clause.name}
                                </Badge>
                              ))}
                              {contract.clauses.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{contract.clauses.length - 3} más
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB: Triggers */}
          <TabsContent value="triggers" className="mt-0">
            <ScrollArea className="h-[400px]">
              {!selectedContract ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Selecciona un contrato para ver sus triggers</p>
                </div>
              ) : triggers.length === 0 ? (
                <div className="space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay triggers configurados</p>
                  </div>
                  <Button 
                    className="w-full"
                    onClick={() => setContractTriggers(selectedContract, ['payment', 'renewal', 'termination'])}
                    disabled={isLoading}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar Triggers con IA
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {triggers.map((trigger) => (
                    <Card key={trigger.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Zap className={cn(
                                "h-4 w-4",
                                trigger.enabled ? "text-yellow-500" : "text-muted-foreground"
                              )} />
                              <h4 className="font-medium">{trigger.name}</h4>
                              <Badge className={getStatusBadge(trigger.priority)}>
                                {trigger.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {trigger.category} • {trigger.event}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {/* Toggle trigger */}}
                          >
                            {trigger.enabled ? (
                              <Unlock className="h-4 w-4 text-green-500" />
                            ) : (
                              <Lock className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>

                        {/* Acciones del trigger */}
                        <div className="mt-3 space-y-1">
                          {trigger.actions.map((action, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground">{action.sequence}.</span>
                              <Badge variant="outline">{action.type}</Badge>
                              <span className="text-muted-foreground">→</span>
                              <span>{action.target}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* TAB: Simulación */}
          <TabsContent value="simulation" className="mt-0">
            <ScrollArea className="h-[400px]">
              {!selectedContract ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Play className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Selecciona un contrato para simular</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button 
                    className="w-full"
                    onClick={handleSimulate}
                    disabled={isLoading}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Simular Ejecución del Contrato
                  </Button>

                  {simulation && (
                    <>
                      {/* Proyecciones */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Proyecciones Financieras</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Total Pagos</p>
                              <p className="text-lg font-bold text-green-600">
                                €{simulation.projections.totalPayments.toLocaleString()}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Total Obligaciones</p>
                              <p className="text-lg font-bold text-blue-600">
                                €{simulation.projections.totalObligations.toLocaleString()}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Posición Neta</p>
                              <p className={cn(
                                "text-lg font-bold",
                                simulation.projections.netPosition >= 0 ? "text-green-600" : "text-red-600"
                              )}>
                                €{simulation.projections.netPosition.toLocaleString()}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Exposición a Riesgo</p>
                              <p className="text-lg font-bold text-orange-600">
                                €{simulation.projections.riskExposure.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Timeline */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Timeline de Eventos</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {simulation.timeline.slice(0, 5).map((event, idx) => (
                              <div key={idx} className="flex items-center gap-3 text-sm">
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  event.outcome.status === 'success' && "bg-green-500",
                                  event.outcome.status === 'partial' && "bg-yellow-500",
                                  event.outcome.status === 'failed' && "bg-red-500"
                                )} />
                                <span className="text-muted-foreground text-xs">
                                  {format(new Date(event.date), 'dd/MM/yy')}
                                </span>
                                <span className="flex-1">{event.event}</span>
                                <Badge variant="outline" className="text-xs">
                                  {event.action}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Conflictos */}
                      {simulation.conflicts.length > 0 && (
                        <Card className="border-yellow-500/50">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              Conflictos Detectados
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {simulation.conflicts.map((conflict, idx) => (
                                <div key={idx} className="p-2 rounded bg-yellow-500/10">
                                  <div className="flex items-center gap-2">
                                    <Badge className={getStatusBadge(conflict.severity)}>
                                      {conflict.severity}
                                    </Badge>
                                    <span className="text-sm">{conflict.type}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {conflict.resolution}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* TAB: Compliance */}
          <TabsContent value="compliance" className="mt-0">
            <ScrollArea className="h-[400px]">
              {!selectedContract ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Selecciona un contrato para validar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button 
                    className="w-full"
                    onClick={handleValidateCompliance}
                    disabled={isLoading}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Validar Cumplimiento Normativo
                  </Button>

                  {compliance && (
                    <>
                      {/* Score general */}
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Score de Cumplimiento</p>
                              <p className="text-3xl font-bold">
                                {compliance.complianceReport.overallScore}%
                              </p>
                            </div>
                            <Badge className={getStatusBadge(compliance.complianceReport.status)}>
                              {compliance.complianceReport.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <Progress value={compliance.complianceReport.overallScore} className="h-2" />
                        </CardContent>
                      </Card>

                      {/* Matriz de riesgo */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Matriz de Riesgo</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(compliance.riskMatrix).map(([key, value]) => (
                              <div key={key} className="p-2 rounded bg-muted/50">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm capitalize">{key}</span>
                                  <Badge className={getStatusBadge(value.level)}>
                                    {value.level}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Checks */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Validaciones</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {compliance.checks.slice(0, 5).map((check) => (
                              <div key={check.id} className="flex items-start gap-2 p-2 rounded bg-muted/30">
                                {check.status === 'pass' && <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />}
                                {check.status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />}
                                {check.status === 'fail' && <XCircle className="h-4 w-4 text-red-500 mt-0.5" />}
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{check.regulation}</p>
                                  <p className="text-xs text-muted-foreground">{check.requirement}</p>
                                  {check.status !== 'pass' && (
                                    <p className="text-xs text-orange-600 mt-1">{check.remediation}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* TAB: Auditoría */}
          <TabsContent value="audit" className="mt-0">
            <ScrollArea className="h-[400px]">
              {!selectedContract ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Selecciona un contrato para ver auditoría</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button 
                    className="w-full"
                    onClick={handleGenerateAudit}
                    disabled={isLoading}
                  >
                    <History className="h-4 w-4 mr-2" />
                    Generar Audit Trail
                  </Button>

                  {auditTrail && (
                    <>
                      {/* Integridad */}
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {auditTrail.integrity.verified ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-500" />
                              )}
                              <span className="font-medium">
                                Integridad {auditTrail.integrity.verified ? 'Verificada' : 'No Verificada'}
                              </span>
                            </div>
                            <Badge variant="outline">{auditTrail.integrity.method}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Hash Chain: {auditTrail.auditTrail.hashChain.slice(0, 20)}...
                          </p>
                        </CardContent>
                      </Card>

                      {/* Estadísticas */}
                      <div className="grid grid-cols-3 gap-2">
                        <Card>
                          <CardContent className="p-3 text-center">
                            <p className="text-2xl font-bold">{auditTrail.statistics.totalEvents}</p>
                            <p className="text-xs text-muted-foreground">Total Eventos</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3 text-center">
                            <p className="text-2xl font-bold">
                              {Object.keys(auditTrail.statistics.byType).length}
                            </p>
                            <p className="text-xs text-muted-foreground">Tipos</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3 text-center">
                            <p className="text-2xl font-bold">
                              {Object.keys(auditTrail.statistics.byActor).length}
                            </p>
                            <p className="text-xs text-muted-foreground">Actores</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Eventos */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Eventos Recientes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {auditTrail.events.slice(0, 5).map((event) => (
                              <div key={event.id} className="p-2 rounded bg-muted/30">
                                <div className="flex items-center justify-between mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {event.type}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(event.timestamp), 'dd/MM HH:mm')}
                                  </span>
                                </div>
                                <p className="text-sm">{event.action}</p>
                                <p className="text-xs text-muted-foreground">
                                  Por: {event.actor.name} ({event.actor.role})
                                </p>
                                {event.signature && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Lock className="h-3 w-3 text-green-500" />
                                    <span className="text-xs text-green-600">Firmado</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* TAB: Monitor */}
          <TabsContent value="monitor" className="mt-0">
            <ScrollArea className="h-[400px]">
              {!selectedContract ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Selecciona un contrato para monitorear</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button 
                    className="w-full"
                    onClick={handleMonitor}
                    disabled={isLoading}
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Actualizar Monitoreo
                  </Button>

                  {monitoring && (
                    <>
                      {/* Estado de salud */}
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-3 h-3 rounded-full animate-pulse",
                                monitoring.monitoring.status === 'healthy' && "bg-green-500",
                                monitoring.monitoring.status === 'warning' && "bg-yellow-500",
                                monitoring.monitoring.status === 'critical' && "bg-red-500",
                                monitoring.monitoring.status === 'inactive' && "bg-gray-500"
                              )} />
                              <span className="font-medium capitalize">{monitoring.monitoring.status}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold">{monitoring.health.score}%</p>
                              <p className="text-xs text-muted-foreground">Health Score</p>
                            </div>
                          </div>
                          <Progress value={monitoring.health.score} className="h-2" />
                        </CardContent>
                      </Card>

                      {/* Métricas */}
                      <div className="grid grid-cols-2 gap-2">
                        <Card>
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-green-500" />
                              <span className="text-sm">Ejecución</span>
                            </div>
                            <p className="text-xl font-bold mt-1">{monitoring.metrics.executionRate}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <Timer className="h-4 w-4 text-blue-500" />
                              <span className="text-sm">Tiempo Medio</span>
                            </div>
                            <p className="text-xl font-bold mt-1">{monitoring.metrics.avgExecutionTime}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                              <span className="text-sm">Errores</span>
                            </div>
                            <p className="text-xl font-bold mt-1">{monitoring.metrics.errorRate}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-purple-500" />
                              <span className="text-sm">Compliance</span>
                            </div>
                            <p className="text-xl font-bold mt-1">{monitoring.metrics.complianceScore}%</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Alertas */}
                      {monitoring.alerts.length > 0 && (
                        <Card className="border-orange-500/50">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                              Alertas Activas ({monitoring.alerts.length})
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {monitoring.alerts.map((alert) => (
                                <div 
                                  key={alert.id} 
                                  className={cn(
                                    "p-2 rounded flex items-start gap-2",
                                    alert.severity === 'critical' && "bg-red-500/10",
                                    alert.severity === 'error' && "bg-orange-500/10",
                                    alert.severity === 'warning' && "bg-yellow-500/10",
                                    alert.severity === 'info' && "bg-blue-500/10"
                                  )}
                                >
                                  <Badge className={getStatusBadge(alert.severity)}>
                                    {alert.severity}
                                  </Badge>
                                  <div className="flex-1">
                                    <p className="text-sm">{alert.message}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(alert.timestamp), { locale: es, addSuffix: true })}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Próximos eventos */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Próximos Eventos</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {monitoring.upcomingEvents.slice(0, 3).map((event, idx) => (
                              <div key={idx} className="flex items-center gap-3 p-2 rounded bg-muted/30">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div className="flex-1">
                                  <p className="text-sm">{event.description}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(event.date), 'dd/MM/yyyy HH:mm')}
                                  </p>
                                </div>
                                <Badge className={getStatusBadge(event.priority)}>
                                  {event.priority}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer con última actualización */}
        {lastRefresh && (
          <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Última actualización: {formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}
            </span>
            <div className="flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              <span>Blockchain Ready</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default HRSmartContractsPanel;
