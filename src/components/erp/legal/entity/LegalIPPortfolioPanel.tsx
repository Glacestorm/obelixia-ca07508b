/**
 * LegalIPPortfolioPanel
 * Fase 8: IP Portfolio Management
 * Panel especializado para gestión de propiedad intelectual
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  Copyright,
  FileText,
  Globe,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Shield,
  Search,
  Eye
} from 'lucide-react';
import { useLegalEntityManagement } from '@/hooks/admin/legal/useLegalEntityManagement';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface LegalIPPortfolioPanelProps {
  className?: string;
}

export function LegalIPPortfolioPanel({ className }: LegalIPPortfolioPanelProps) {
  const [activeTab, setActiveTab] = useState('portfolio');

  const {
    isLoading,
    lastRefresh,
    ipPortfolio,
    trademarkMonitoring,
    analyzeIPPortfolio,
    monitorTrademarks,
  } = useLegalEntityManagement();

  useEffect(() => {
    analyzeIPPortfolio({ company: 'Demo IP Portfolio' });
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'trademark': return '™';
      case 'patent': return '⚙️';
      case 'design': return '🎨';
      case 'domain': return '🌐';
      case 'copyright': return '©';
      default: return '📄';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card className={cn("transition-all duration-300", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <Copyright className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Portfolio de Propiedad Intelectual</CardTitle>
              <p className="text-xs text-muted-foreground">
                {lastRefresh 
                  ? `Actualizado ${formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}`
                  : 'Cargando...'
                }
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => analyzeIPPortfolio({ company: 'Demo' })}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-3">
            <TabsTrigger value="portfolio" className="text-xs">Portfolio</TabsTrigger>
            <TabsTrigger value="renewals" className="text-xs">Renovaciones</TabsTrigger>
            <TabsTrigger value="monitoring" className="text-xs">Vigilancia</TabsTrigger>
            <TabsTrigger value="strategy" className="text-xs">Estrategia</TabsTrigger>
          </TabsList>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio">
            <ScrollArea className="h-[350px]">
              {ipPortfolio ? (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-2">
                    <Card className="bg-violet-50 dark:bg-violet-950/20">
                      <CardContent className="p-3 text-center">
                        <div className="text-xl font-bold text-violet-600">
                          {ipPortfolio.portfolio_summary?.trademarks || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Marcas</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-purple-50 dark:bg-purple-950/20">
                      <CardContent className="p-3 text-center">
                        <div className="text-xl font-bold text-purple-600">
                          {ipPortfolio.portfolio_summary?.patents || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Patentes</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-fuchsia-50 dark:bg-fuchsia-950/20">
                      <CardContent className="p-3 text-center">
                        <div className="text-xl font-bold text-fuchsia-600">
                          {ipPortfolio.portfolio_summary?.domains || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Dominios</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Value */}
                  <div className="p-4 bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">Valor Total Estimado</div>
                        <div className="text-2xl font-bold">
                          {new Intl.NumberFormat('es-ES', { 
                            style: 'currency', 
                            currency: ipPortfolio.portfolio_summary?.currency || 'EUR' 
                          }).format(ipPortfolio.portfolio_summary?.estimated_value || 0)}
                        </div>
                      </div>
                      <TrendingUp className="h-8 w-8 text-violet-500" />
                    </div>
                  </div>

                  {/* Assets List */}
                  <div className="space-y-2">
                    {ipPortfolio.assets?.map((asset) => (
                      <Card key={asset.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{getTypeIcon(asset.type)}</div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">{asset.name}</span>
                                <Badge variant={asset.status === 'registered' ? 'default' : 'secondary'}>
                                  {asset.status}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {asset.registration_number} • {asset.jurisdictions?.join(', ')}
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-xs">
                                <span>Vence: {asset.expiry_date}</span>
                                <span className={getRiskColor(asset.risk_level)}>
                                  Riesgo: {asset.risk_level}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <Copyright className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Cargando portfolio...</p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Renewals Tab */}
          <TabsContent value="renewals">
            <ScrollArea className="h-[350px]">
              {ipPortfolio?.renewal_calendar?.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <Calendar className="h-5 w-5 text-orange-500" />
                    <span className="text-sm font-medium">
                      {ipPortfolio.renewal_calendar.length} renovaciones próximas
                    </span>
                  </div>

                  {ipPortfolio.renewal_calendar.map((renewal, i) => (
                    <Card key={i} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{renewal.asset_name}</div>
                            <div className="text-xs text-muted-foreground">
                              Renovar antes de: {renewal.action_required_by}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-sm text-primary">
                              {new Intl.NumberFormat('es-ES', { 
                                style: 'currency', 
                                currency: 'EUR' 
                              }).format(renewal.renewal_cost)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Fecha: {renewal.renewal_date}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>No hay renovaciones pendientes</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring">
            <ScrollArea className="h-[350px]">
              {trademarkMonitoring ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-primary" />
                      <span className="font-medium">Marcas Monitorizadas</span>
                    </div>
                    <Badge>{trademarkMonitoring.monitored_trademarks}</Badge>
                  </div>

                  {/* Alerts */}
                  {trademarkMonitoring.alerts?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Alertas Detectadas
                      </h4>
                      {trademarkMonitoring.alerts.map((alert, i) => (
                        <Card key={i} className="bg-orange-50 dark:bg-orange-950/20">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline">{alert.type}</Badge>
                              <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                                {alert.severity}
                              </Badge>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">{alert.our_trademark}</span>
                              <span className="text-muted-foreground"> vs </span>
                              <span className="font-medium">{alert.conflicting_mark}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Similitud: {alert.similarity_score}% • {alert.jurisdiction}
                            </div>
                            <div className="mt-2 text-xs">
                              <span className="text-primary">Acción recomendada: </span>
                              {alert.recommended_action}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Search className="h-10 w-10 text-muted-foreground/50" />
                  <Button onClick={() => monitorTrademarks({ company: 'Demo' })} disabled={isLoading}>
                    Iniciar Vigilancia de Marcas
                  </Button>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Strategy Tab */}
          <TabsContent value="strategy">
            <ScrollArea className="h-[350px]">
              {ipPortfolio?.strategic_recommendations?.length > 0 ? (
                <div className="space-y-2">
                  {ipPortfolio.strategic_recommendations.map((rec, i) => (
                    <Card key={i} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{rec.category}</Badge>
                          <Badge variant={rec.priority === 'high' ? 'default' : 'secondary'}>
                            {rec.priority}
                          </Badge>
                        </div>
                        <p className="text-sm">{rec.recommendation}</p>
                        {rec.potential_value > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Valor potencial: {new Intl.NumberFormat('es-ES', { 
                              style: 'currency', 
                              currency: 'EUR' 
                            }).format(rec.potential_value)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Ejecuta un análisis para ver recomendaciones estratégicas</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default LegalIPPortfolioPanel;
