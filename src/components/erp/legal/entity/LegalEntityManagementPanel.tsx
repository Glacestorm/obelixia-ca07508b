/**
 * LegalEntityManagementPanel
 * Fase 8: Legal Entity & IP Management
 * Panel principal para gestión de entidades legales, gobierno corporativo y propiedad intelectual
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  RefreshCw, 
  Building2, 
  Users, 
  FileKey,
  Shield,
  Search,
  AlertTriangle,
  CheckCircle,
  Calendar,
  TrendingUp,
  Globe,
  Scale,
  Briefcase,
  Copyright,
  Landmark,
  FileSearch,
  Lock
} from 'lucide-react';
import { useLegalEntityManagement } from '@/hooks/admin/legal/useLegalEntityManagement';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface LegalEntityManagementPanelProps {
  className?: string;
}

export function LegalEntityManagementPanel({ className }: LegalEntityManagementPanelProps) {
  const [activeTab, setActiveTab] = useState('entities');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    isLoading,
    lastRefresh,
    entityStructure,
    governance,
    powers,
    ipPortfolio,
    trademarkMonitoring,
    eDiscovery,
    litigationHolds,
    corporateCalendar,
    riskAssessment,
    analyzeEntityStructure,
    assessGovernance,
    managePowers,
    analyzeIPPortfolio,
    monitorTrademarks,
    searchEDiscovery,
    manageLitigationHolds,
    getCorporateCalendar,
    assessEntityRisk,
  } = useLegalEntityManagement();

  // Initial load
  useEffect(() => {
    const mockContext = {
      company_name: 'Grupo Empresarial Demo',
      entities: ['Holding Principal', 'Filial España', 'Filial Portugal'],
      current_date: new Date().toISOString()
    };
    
    analyzeEntityStructure(mockContext);
    getCorporateCalendar(mockContext);
  }, []);

  const handleRefresh = useCallback(async () => {
    const mockContext = {
      company_name: 'Grupo Empresarial Demo',
      current_date: new Date().toISOString()
    };

    switch (activeTab) {
      case 'entities':
        await analyzeEntityStructure(mockContext);
        break;
      case 'governance':
        await assessGovernance(mockContext);
        break;
      case 'powers':
        await managePowers(mockContext);
        break;
      case 'ip':
        await analyzeIPPortfolio(mockContext);
        break;
      case 'trademarks':
        await monitorTrademarks(mockContext);
        break;
      case 'ediscovery':
        await searchEDiscovery({ query: searchQuery || 'all documents' });
        break;
      case 'litigation':
        await manageLitigationHolds(mockContext);
        break;
      case 'calendar':
        await getCorporateCalendar(mockContext);
        break;
      case 'risk':
        await assessEntityRisk(mockContext);
        break;
    }
    toast.success('Datos actualizados');
  }, [activeTab, searchQuery]);

  const getRiskBadge = (level: string) => {
    const config = {
      low: { variant: 'outline' as const, className: 'border-green-500 text-green-600' },
      medium: { variant: 'outline' as const, className: 'border-yellow-500 text-yellow-600' },
      high: { variant: 'outline' as const, className: 'border-orange-500 text-orange-600' },
      critical: { variant: 'destructive' as const, className: '' }
    };
    return config[level as keyof typeof config] || config.medium;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
      active: { variant: 'default', className: 'bg-green-500' },
      registered: { variant: 'default', className: 'bg-green-500' },
      compliant: { variant: 'default', className: 'bg-green-500' },
      pending: { variant: 'secondary', className: '' },
      expired: { variant: 'destructive', className: '' },
      overdue: { variant: 'destructive', className: '' },
      outdated: { variant: 'outline', className: 'border-orange-500 text-orange-600' },
      missing: { variant: 'destructive', className: '' }
    };
    return config[status] || { variant: 'secondary' as const, className: '' };
  };

  return (
    <Card className={cn("transition-all duration-300", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Legal Entity & IP Management
                <Badge variant="outline" className="text-xs">Fase 8</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {lastRefresh 
                  ? `Actualizado ${formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}`
                  : 'Sincronizando...'
                }
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-5 mb-3">
            <TabsTrigger value="entities" className="text-xs gap-1">
              <Building2 className="h-3 w-3" />
              Entidades
            </TabsTrigger>
            <TabsTrigger value="governance" className="text-xs gap-1">
              <Users className="h-3 w-3" />
              Gobierno
            </TabsTrigger>
            <TabsTrigger value="powers" className="text-xs gap-1">
              <FileKey className="h-3 w-3" />
              Poderes
            </TabsTrigger>
            <TabsTrigger value="ip" className="text-xs gap-1">
              <Copyright className="h-3 w-3" />
              IP/Marcas
            </TabsTrigger>
            <TabsTrigger value="litigation" className="text-xs gap-1">
              <Lock className="h-3 w-3" />
              Litigios
            </TabsTrigger>
          </TabsList>

          {/* Entity Structure Tab */}
          <TabsContent value="entities" className="flex-1 mt-0">
            <ScrollArea className="h-[400px]">
              {entityStructure ? (
                <div className="space-y-4">
                  {/* Structure Analysis */}
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="bg-muted/30">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <span className="text-xs font-medium">Complejidad</span>
                        </div>
                        <div className="text-2xl font-bold">
                          {entityStructure.structure_analysis?.complexity_score || 0}%
                        </div>
                        <Progress 
                          value={entityStructure.structure_analysis?.complexity_score || 0} 
                          className="h-1.5 mt-2" 
                        />
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/30">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Landmark className="h-4 w-4 text-green-500" />
                          <span className="text-xs font-medium">Eficiencia Fiscal</span>
                        </div>
                        <div className="text-2xl font-bold">
                          {entityStructure.structure_analysis?.tax_efficiency || 0}%
                        </div>
                        <Progress 
                          value={entityStructure.structure_analysis?.tax_efficiency || 0} 
                          className="h-1.5 mt-2" 
                        />
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/30">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-4 w-4 text-orange-500" />
                          <span className="text-xs font-medium">Riesgo Regulatorio</span>
                        </div>
                        <Badge {...getRiskBadge(entityStructure.structure_analysis?.regulatory_risk || 'medium')}>
                          {entityStructure.structure_analysis?.regulatory_risk || 'N/A'}
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Entities List */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Estructura del Grupo</h4>
                    {entityStructure.entities?.map((entity) => (
                      <Card key={entity.id} className="bg-card hover:bg-muted/50 transition-colors">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "p-2 rounded-lg",
                                entity.type === 'holding' ? 'bg-primary/20' : 'bg-secondary/20'
                              )}>
                                <Building2 className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="font-medium text-sm">{entity.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {entity.jurisdiction} • {entity.type}
                                  {entity.ownership_percentage && ` • ${entity.ownership_percentage}%`}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge {...getStatusBadge(entity.regulatory_status)}>
                                {entity.regulatory_status}
                              </Badge>
                              <Badge {...getRiskBadge(entity.risk_level)}>
                                {entity.risk_level}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Recommendations */}
                  {entityStructure.structure_analysis?.recommendations?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Recomendaciones</h4>
                      {entityStructure.structure_analysis.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg text-sm">
                          <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Building2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Cargando estructura de entidades...</p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Governance Tab */}
          <TabsContent value="governance" className="flex-1 mt-0">
            <ScrollArea className="h-[400px]">
              {governance ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <div className="text-sm font-medium">Puntuación de Gobierno</div>
                      <div className="text-xs text-muted-foreground">
                        Evaluación global del gobierno corporativo
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-primary">
                      {governance.governance_score}/100
                    </div>
                  </div>

                  {/* Board Composition */}
                  <Card>
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-sm">Composición del Consejo</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Miembros totales:</span>
                          <span className="ml-2 font-medium">{governance.board_composition?.total_members}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Independientes:</span>
                          <span className="ml-2 font-medium">{governance.board_composition?.independent_members}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Diversidad género:</span>
                          <span className="ml-2 font-medium">{governance.board_composition?.gender_diversity}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Compliance Status */}
                  <Card>
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-sm">Estado de Cumplimiento</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                      {Object.entries(governance.compliance_status || {}).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{key.replace(/_/g, ' ')}</span>
                          <Badge {...getStatusBadge(value)}>{value}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Pending Actions */}
                  {governance.pending_actions?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Acciones Pendientes</h4>
                      {governance.pending_actions.map((action, i) => (
                        <Card key={i} className="bg-orange-50 dark:bg-orange-950/20">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">{action.action}</div>
                                <div className="text-xs text-muted-foreground">
                                  Fecha límite: {action.deadline}
                                </div>
                              </div>
                              <Badge {...getRiskBadge(action.priority)}>{action.priority}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Users className="h-10 w-10 text-muted-foreground/50" />
                  <Button onClick={() => assessGovernance({ company: 'Demo' })} disabled={isLoading}>
                    Evaluar Gobierno Corporativo
                  </Button>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Powers of Attorney Tab */}
          <TabsContent value="powers" className="flex-1 mt-0">
            <ScrollArea className="h-[400px]">
              {powers ? (
                <div className="space-y-4">
                  {/* Compliance Check */}
                  <div className="grid grid-cols-3 gap-3">
                    <Card className={cn(
                      "bg-muted/30",
                      powers.compliance_check?.all_powers_registered ? 'border-green-500/50' : 'border-orange-500/50'
                    )}>
                      <CardContent className="p-3 text-center">
                        {powers.compliance_check?.all_powers_registered ? (
                          <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
                        ) : (
                          <AlertTriangle className="h-6 w-6 text-orange-500 mx-auto mb-1" />
                        )}
                        <div className="text-xs">Todos Registrados</div>
                      </CardContent>
                    </Card>
                    <Card className={cn(
                      "bg-muted/30",
                      powers.compliance_check?.no_expired_powers_in_use ? 'border-green-500/50' : 'border-red-500/50'
                    )}>
                      <CardContent className="p-3 text-center">
                        {powers.compliance_check?.no_expired_powers_in_use ? (
                          <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
                        ) : (
                          <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-1" />
                        )}
                        <div className="text-xs">Sin Caducados en Uso</div>
                      </CardContent>
                    </Card>
                    <Card className={cn(
                      "bg-muted/30",
                      powers.compliance_check?.proper_segregation ? 'border-green-500/50' : 'border-orange-500/50'
                    )}>
                      <CardContent className="p-3 text-center">
                        {powers.compliance_check?.proper_segregation ? (
                          <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
                        ) : (
                          <AlertTriangle className="h-6 w-6 text-orange-500 mx-auto mb-1" />
                        )}
                        <div className="text-xs">Segregación Correcta</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Powers List */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Poderes Activos</h4>
                    {powers.powers_analysis?.map((power) => (
                      <Card key={power.id} className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">{power.attorney}</div>
                              <div className="text-xs text-muted-foreground">
                                {power.type} • Otorgado: {power.granted_date}
                                {power.expiry_date && ` • Vence: ${power.expiry_date}`}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge {...getStatusBadge(power.status)}>{power.status}</Badge>
                              <Badge {...getRiskBadge(power.risk_assessment)}>{power.risk_assessment}</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Expiring Soon */}
                  {powers.expiring_soon?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Próximos a Vencer
                      </h4>
                      {powers.expiring_soon.map((exp, i) => (
                        <Card key={i} className="bg-orange-50 dark:bg-orange-950/20">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between text-sm">
                              <span>Poder ID: {exp.power_id}</span>
                              <span className="text-orange-600">Vence en {exp.expires_in_days} días</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <FileKey className="h-10 w-10 text-muted-foreground/50" />
                  <Button onClick={() => managePowers({ company: 'Demo' })} disabled={isLoading}>
                    Gestionar Poderes
                  </Button>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* IP Portfolio Tab */}
          <TabsContent value="ip" className="flex-1 mt-0">
            <ScrollArea className="h-[400px]">
              {ipPortfolio ? (
                <div className="space-y-4">
                  {/* Portfolio Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="bg-muted/30">
                      <CardContent className="p-3 text-center">
                        <div className="text-2xl font-bold">{ipPortfolio.portfolio_summary?.total_assets || 0}</div>
                        <div className="text-xs text-muted-foreground">Total Activos</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/30">
                      <CardContent className="p-3 text-center">
                        <div className="text-2xl font-bold">{ipPortfolio.portfolio_summary?.trademarks || 0}</div>
                        <div className="text-xs text-muted-foreground">Marcas</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/30">
                      <CardContent className="p-3 text-center">
                        <div className="text-2xl font-bold">{ipPortfolio.portfolio_summary?.patents || 0}</div>
                        <div className="text-xs text-muted-foreground">Patentes</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Estimated Value */}
                  <div className="p-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
                    <div className="text-sm text-muted-foreground">Valor Estimado del Portfolio</div>
                    <div className="text-2xl font-bold">
                      {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
                        .format(ipPortfolio.portfolio_summary?.estimated_value || 0)}
                    </div>
                  </div>

                  {/* Assets */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Activos IP</h4>
                    {ipPortfolio.assets?.slice(0, 5).map((asset) => (
                      <Card key={asset.id} className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Copyright className="h-4 w-4 text-primary" />
                              <div>
                                <div className="font-medium text-sm">{asset.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {asset.type} • {asset.registration_number} • {asset.jurisdictions?.join(', ')}
                                </div>
                              </div>
                            </div>
                            <Badge {...getStatusBadge(asset.status)}>{asset.status}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Risk Alerts */}
                  {ipPortfolio.risk_alerts?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Alertas de Riesgo
                      </h4>
                      {ipPortfolio.risk_alerts.map((alert, i) => (
                        <Card key={i} className="bg-orange-50 dark:bg-orange-950/20">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">{alert.description}</div>
                                <div className="text-xs text-muted-foreground">{alert.recommended_action}</div>
                              </div>
                              <Badge {...getRiskBadge(alert.severity)}>{alert.severity}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Copyright className="h-10 w-10 text-muted-foreground/50" />
                  <Button onClick={() => analyzeIPPortfolio({ company: 'Demo' })} disabled={isLoading}>
                    Analizar Portfolio IP
                  </Button>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Litigation Hold Tab */}
          <TabsContent value="litigation" className="flex-1 mt-0">
            <ScrollArea className="h-[400px]">
              {litigationHolds ? (
                <div className="space-y-4">
                  {/* Compliance Summary */}
                  <div className="grid grid-cols-4 gap-3">
                    <Card className="bg-muted/30">
                      <CardContent className="p-3 text-center">
                        <div className="text-2xl font-bold">{litigationHolds.compliance_summary?.total_custodians || 0}</div>
                        <div className="text-xs text-muted-foreground">Custodios</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50 dark:bg-green-950/20">
                      <CardContent className="p-3 text-center">
                        <div className="text-2xl font-bold text-green-600">{litigationHolds.compliance_summary?.acknowledged || 0}</div>
                        <div className="text-xs text-muted-foreground">Confirmados</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-yellow-50 dark:bg-yellow-950/20">
                      <CardContent className="p-3 text-center">
                        <div className="text-2xl font-bold text-yellow-600">{litigationHolds.compliance_summary?.pending_acknowledgment || 0}</div>
                        <div className="text-xs text-muted-foreground">Pendientes</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-red-50 dark:bg-red-950/20">
                      <CardContent className="p-3 text-center">
                        <div className="text-2xl font-bold text-red-600">{litigationHolds.compliance_summary?.non_compliant || 0}</div>
                        <div className="text-xs text-muted-foreground">No Cumplidos</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Active Holds */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Retenciones Activas</h4>
                    {litigationHolds.active_holds?.map((hold) => (
                      <Card key={hold.id} className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Lock className="h-4 w-4 text-primary" />
                              <span className="font-medium text-sm">{hold.matter_name}</span>
                            </div>
                            <Badge {...getStatusBadge(hold.status)}>{hold.status}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {hold.matter_type} • {hold.custodians?.length || 0} custodios • 
                            {hold.preserved_data?.total_items || 0} elementos preservados
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Risk Alerts */}
                  {litigationHolds.risk_alerts?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        Alertas Críticas
                      </h4>
                      {litigationHolds.risk_alerts.map((alert, i) => (
                        <Card key={i} className="bg-red-50 dark:bg-red-950/20">
                          <CardContent className="p-3">
                            <div className="font-medium text-sm">{alert.description}</div>
                            <div className="text-xs text-muted-foreground mt-1">{alert.recommended_action}</div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Lock className="h-10 w-10 text-muted-foreground/50" />
                  <Button onClick={() => manageLitigationHolds({ company: 'Demo' })} disabled={isLoading}>
                    Gestionar Litigation Holds
                  </Button>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default LegalEntityManagementPanel;
