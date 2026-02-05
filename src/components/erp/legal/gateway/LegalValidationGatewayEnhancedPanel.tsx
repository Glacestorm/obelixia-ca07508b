/**
 * LegalValidationGatewayEnhancedPanel - Fase 10
 * Panel para el Gateway de Validación Legal Avanzado
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  FileText,
  Scale,
  Activity,
  Lock,
  Unlock,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { useLegalValidationGatewayEnhanced } from '@/hooks/admin/legal';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface LegalValidationGatewayEnhancedPanelProps {
  companyId: string;
  className?: string;
}

export function LegalValidationGatewayEnhancedPanel({
  companyId,
  className
}: LegalValidationGatewayEnhancedPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const {
    isLoading,
    auditTrail,
    blockingPolicies,
    riskAssessment,
    complianceMatrix,
    lastRefresh,
    fetchAuditTrail,
    fetchBlockingPolicies,
    fetchRiskAssessment,
    fetchComplianceMatrix
  } = useLegalValidationGatewayEnhanced();

  useEffect(() => {
    if (companyId) {
      fetchAuditTrail(companyId);
      fetchBlockingPolicies(companyId);
      fetchRiskAssessment({ companyId });
      fetchComplianceMatrix({ companyId });
    }
  }, [companyId, fetchAuditTrail, fetchBlockingPolicies, fetchRiskAssessment, fetchComplianceMatrix]);

  const handleRefresh = useCallback(() => {
    if (companyId) {
      fetchAuditTrail(companyId);
      fetchBlockingPolicies(companyId);
      fetchRiskAssessment({ companyId });
      fetchComplianceMatrix({ companyId });
    }
  }, [companyId, fetchAuditTrail, fetchBlockingPolicies, fetchRiskAssessment, fetchComplianceMatrix]);

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'blocked': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'escalated': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'pending_approval': return <Clock className="h-4 w-4 text-yellow-600" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className={cn("border-primary/20", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Gateway de Validación Legal</CardTitle>
              <CardDescription>
                {lastRefresh
                  ? `Actualizado ${formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}`
                  : 'Cargando...'}
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="overview" className="text-xs">General</TabsTrigger>
            <TabsTrigger value="audit" className="text-xs">Auditoría</TabsTrigger>
            <TabsTrigger value="policies" className="text-xs">Políticas</TabsTrigger>
            <TabsTrigger value="compliance" className="text-xs">Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Scale className="h-4 w-4" />
                  <span>Riesgo Global</span>
                </div>
                <div className="text-2xl font-bold">
                  {riskAssessment?.overallScore ?? '--'}%
                </div>
                {riskAssessment?.riskLevel && (
                  <Badge className={cn("mt-1", getRiskLevelColor(riskAssessment.riskLevel))}>
                    {riskAssessment.riskLevel}
                  </Badge>
                )}
              </Card>

              <Card className="p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <CheckCircle className="h-4 w-4" />
                  <span>Compliance</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {complianceMatrix?.overallScore ?? '--'}%
                </div>
              </Card>

              <Card className="p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Lock className="h-4 w-4" />
                  <span>Bloqueos</span>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {blockingPolicies.filter(p => p.isActive).length}
                </div>
              </Card>

              <Card className="p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <FileText className="h-4 w-4" />
                  <span>Auditorías</span>
                </div>
                <div className="text-2xl font-bold">
                  {auditTrail.length}
                </div>
              </Card>
            </div>

            {riskAssessment?.recommendations && riskAssessment.recommendations.length > 0 && (
              <Card className="p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Recomendaciones
                </h4>
                <div className="space-y-2">
                  {riskAssessment.recommendations.slice(0, 3).map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                      <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'outline' : 'secondary'} className="text-xs">
                        {rec.priority}
                      </Badge>
                      <span className="text-sm">{rec.action}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="audit">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Operación</TableHead>
                    <TableHead>Decisión</TableHead>
                    <TableHead>Riesgo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditTrail.slice(0, 20).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.timestamp), { locale: es, addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{entry.module}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{entry.operation}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(entry.decision)}
                          <span className="text-xs capitalize">{entry.decision}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", getRiskLevelColor(entry.riskLevel))}>
                          {entry.riskScore}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="policies">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {blockingPolicies.map((policy) => (
                  <Card key={policy.id} className={cn("p-4", !policy.isActive && "opacity-50")}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {policy.isActive ? (
                          <Lock className="h-5 w-5 text-red-500" />
                        ) : (
                          <Unlock className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <h4 className="font-medium">{policy.name}</h4>
                          <p className="text-sm text-muted-foreground">{policy.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={policy.blockLevel === 'hard' ? 'destructive' : 'outline'}>
                          {policy.blockLevel === 'hard' ? 'Bloqueo duro' : 'Bloqueo suave'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{policy.module}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="compliance">
            {complianceMatrix && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(complianceMatrix.byJurisdiction || {}).map(([jurisdiction, data]) => (
                    <Card key={jurisdiction} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{jurisdiction}</Badge>
                        <span className={cn(
                          "text-lg font-bold",
                          (data as any).score >= 80 ? "text-green-600" : (data as any).score >= 60 ? "text-yellow-600" : "text-red-600"
                        )}>
                          {(data as any).score}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {((data as any).regulations?.length || 0)} regulaciones
                      </div>
                    </Card>
                  ))}
                </div>

                {complianceMatrix.upcomingDeadlines && complianceMatrix.upcomingDeadlines.length > 0 && (
                  <Card className="p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Próximos Vencimientos
                    </h4>
                    <div className="space-y-2">
                      {complianceMatrix.upcomingDeadlines.slice(0, 5).map((deadline, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <div>
                            <span className="text-sm font-medium">{deadline.regulation}</span>
                            <p className="text-xs text-muted-foreground">{deadline.action}</p>
                          </div>
                          <Badge variant="outline">{deadline.deadline}</Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default LegalValidationGatewayEnhancedPanel;