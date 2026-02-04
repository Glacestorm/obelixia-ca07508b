/**
 * HREqualityPanel
 * Panel de Igualdad y No Discriminación
 * Cumplimiento: Ley Orgánica 3/2007, RD 901/2020, Ley 15/2022
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Scale, 
  FileText, 
  Users, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Plus,
  RefreshCw,
  BarChart3,
  Shield
} from 'lucide-react';
import { useHREquality } from '@/hooks/admin/hr/useHREquality';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface HREqualityPanelProps {
  companyId?: string;
  className?: string;
}

export function HREqualityPanel({ companyId, className }: HREqualityPanelProps) {
  const [activeTab, setActiveTab] = useState('plans');
  
  const {
    plans,
    audits,
    protocols,
    stats,
    loading,
    fetchEqualityData
  } = useHREquality(companyId);

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: 'Borrador', variant: 'outline' },
    in_progress: { label: 'En progreso', variant: 'secondary' },
    approved: { label: 'Aprobado', variant: 'default' },
    expired: { label: 'Expirado', variant: 'destructive' },
    under_review: { label: 'En revisión', variant: 'secondary' }
  };

  if (!companyId) {
    return (
      <Card className={cn("border-dashed opacity-50", className)}>
        <CardContent className="py-12 text-center">
          <Scale className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Selecciona una empresa para gestionar planes de igualdad
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalPlans}</p>
                <p className="text-xs text-muted-foreground">Planes Totales</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activePlans}</p>
                <p className="text-xs text-muted-foreground">Planes Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expiringSoon}</p>
                <p className="text-xs text-muted-foreground">Próximos a Expirar</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingDown className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.avgGenderGap !== null ? `${stats.avgGenderGap.toFixed(1)}%` : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">Brecha Salarial</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Shield className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.protocolsActive}</p>
                <p className="text-xs text-muted-foreground">Protocolos Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Gestión de Igualdad y Diversidad
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchEqualityData()}>
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Actualizar
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Plan
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="plans" className="gap-2">
                <FileText className="h-4 w-4" />
                Planes de Igualdad
              </TabsTrigger>
              <TabsTrigger value="audits" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Auditorías Salariales
              </TabsTrigger>
              <TabsTrigger value="protocols" className="gap-2">
                <Shield className="h-4 w-4" />
                Protocolos Acoso
              </TabsTrigger>
              <TabsTrigger value="compliance" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Cumplimiento
              </TabsTrigger>
            </TabsList>

            <TabsContent value="plans">
              <ScrollArea className="h-[400px]">
                {plans.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay planes de igualdad registrados</p>
                    <p className="text-sm mt-2">
                      Obligatorio para empresas de +50 empleados (RD 901/2020)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {plans.map((plan) => (
                      <Card key={plan.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{plan.plan_name}</h4>
                              <Badge variant={statusConfig[plan.status || 'draft']?.variant || 'outline'}>
                                {statusConfig[plan.status || 'draft']?.label || plan.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Vigencia: {format(new Date(plan.start_date), 'dd/MM/yyyy')} - {format(new Date(plan.end_date), 'dd/MM/yyyy')}
                            </p>
                            {plan.registration_date && (
                              <p className="text-xs text-muted-foreground">
                                Registro: {format(new Date(plan.registration_date), 'dd/MM/yyyy')}
                              </p>
                            )}
                          </div>
                          <Button variant="ghost" size="sm">Ver Detalle</Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="audits">
              <ScrollArea className="h-[400px]">
                {audits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay auditorías salariales registradas</p>
                    <p className="text-sm mt-2">
                      Obligatorio para empresas de +50 empleados (RD 902/2020)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                      {audits.map((audit) => (
                      <Card key={audit.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">Auditoría {audit.audit_year}</h4>
                              {audit.overall_gap_percentage !== null && (
                                <Badge variant={audit.overall_gap_percentage > 25 ? 'destructive' : 'secondary'}>
                                  Brecha: {audit.overall_gap_percentage.toFixed(1)}%
                                </Badge>
                              )}
                            </div>
                            {audit.audit_period && (
                              <p className="text-sm text-muted-foreground">
                                Período: {audit.audit_period}
                              </p>
                            )}
                            {audit.legal_justification && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {audit.legal_justification}
                              </p>
                            )}
                          </div>
                          <Button variant="ghost" size="sm">Ver Informe</Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="protocols">
              <ScrollArea className="h-[400px]">
                {protocols.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay protocolos de acoso registrados</p>
                    <p className="text-sm mt-2">
                      Obligatorio para todas las empresas (LO 3/2007)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {protocols.map((protocol) => (
                      <Card key={protocol.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{protocol.protocol_name}</h4>
                              <Badge variant={protocol.is_active ? 'default' : 'outline'}>
                                {protocol.is_active ? 'Activo' : 'Inactivo'}
                              </Badge>
                              <Badge variant="secondary">v{protocol.version}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Vigente desde: {format(new Date(protocol.effective_date), 'dd/MM/yyyy')}
                            </p>
                            {protocol.contact_person && (
                              <p className="text-xs text-muted-foreground">
                                Contacto: {protocol.contact_person} ({protocol.contact_email})
                              </p>
                            )}
                          </div>
                          <Button variant="ghost" size="sm">Ver Protocolo</Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="compliance">
              <div className="space-y-4">
                <h4 className="font-medium">Checklist de Cumplimiento Normativo</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className={cn(
                        "h-5 w-5",
                        stats.activePlans > 0 ? "text-green-500" : "text-muted-foreground"
                      )} />
                      <div>
                        <p className="font-medium">Plan de Igualdad</p>
                        <p className="text-sm text-muted-foreground">RD 901/2020 - Obligatorio +50 empleados</p>
                      </div>
                    </div>
                    <Badge variant={stats.activePlans > 0 ? 'default' : 'destructive'}>
                      {stats.activePlans > 0 ? 'Cumple' : 'Pendiente'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className={cn(
                        "h-5 w-5",
                        audits.length > 0 ? "text-green-500" : "text-muted-foreground"
                      )} />
                      <div>
                        <p className="font-medium">Auditoría Retributiva</p>
                        <p className="text-sm text-muted-foreground">RD 902/2020 - Obligatorio +50 empleados</p>
                      </div>
                    </div>
                    <Badge variant={audits.length > 0 ? 'default' : 'destructive'}>
                      {audits.length > 0 ? 'Cumple' : 'Pendiente'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className={cn(
                        "h-5 w-5",
                        stats.protocolsActive > 0 ? "text-green-500" : "text-muted-foreground"
                      )} />
                      <div>
                        <p className="font-medium">Protocolo de Acoso</p>
                        <p className="text-sm text-muted-foreground">LO 3/2007 - Obligatorio todas las empresas</p>
                      </div>
                    </div>
                    <Badge variant={stats.protocolsActive > 0 ? 'default' : 'destructive'}>
                      {stats.protocolsActive > 0 ? 'Cumple' : 'Pendiente'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Registro Salarial</p>
                        <p className="text-sm text-muted-foreground">RD 902/2020 - Obligatorio todas las empresas</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Verificar</Badge>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default HREqualityPanel;
