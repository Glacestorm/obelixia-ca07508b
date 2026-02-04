/**
 * HRSanctionRisksPanel
 * Panel de Riesgos de Sanción y Alertas
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Search, 
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Bell,
  Gavel,
  Euro,
  BookOpen,
  ShieldCheck,
  ShieldAlert,
  TrendingUp
} from 'lucide-react';
import { useHRLegalCompliance } from '@/hooks/admin/useHRLegalCompliance';
import { cn } from '@/lib/utils';

interface HRSanctionRisksPanelProps {
  companyId: string;
}

const CLASSIFICATION_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  leve: { label: 'Leve', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  grave: { label: 'Grave', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  muy_grave: { label: 'Muy Grave', color: 'text-red-600', bgColor: 'bg-red-100' },
};

const ALERT_LEVEL_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof AlertCircle }> = {
  prealert: { label: 'Pre-Alerta', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Bell },
  alert: { label: 'Alerta', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: AlertTriangle },
  urgent: { label: 'Urgente', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: AlertCircle },
  critical: { label: 'Crítico', color: 'text-red-600', bgColor: 'bg-red-100', icon: ShieldAlert },
};

export function HRSanctionRisksPanel({ companyId }: HRSanctionRisksPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [classificationFilter, setClassificationFilter] = useState<string>('all');

  const {
    sanctionRisks,
    alerts,
    riskAssessment,
    isLoading,
    resolveAlert,
    notifyAgents,
    getAlertLevelBadge,
    getClassificationBadge
  } = useHRLegalCompliance(companyId);

  const filteredRisks = sanctionRisks.filter(risk => {
    const matchesSearch = risk.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         risk.infraction_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClassification = classificationFilter === 'all' || risk.classification === classificationFilter;
    return matchesSearch && matchesClassification;
  });

  const risksByClassification = {
    leve: sanctionRisks.filter(r => r.classification === 'leve').length,
    grave: sanctionRisks.filter(r => r.classification === 'grave').length,
    muy_grave: sanctionRisks.filter(r => r.classification === 'muy_grave').length,
  };

  return (
    <div className="space-y-4">
      {/* Risk Assessment Summary */}
      {riskAssessment && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className={cn(riskAssessment.critical_alerts > 0 && "border-red-500")}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Alertas Totales</p>
                  <p className="text-2xl font-bold">{riskAssessment.total_alerts}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Obligaciones Vencidas</p>
                  <p className="text-2xl font-bold text-red-600">{riskAssessment.overdue_obligations}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Riesgo Mínimo</p>
                  <p className="text-xl font-bold text-orange-600">
                    €{(riskAssessment.potential_sanctions_min || 0).toLocaleString()}
                  </p>
                </div>
                <Euro className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className={cn(riskAssessment.potential_sanctions_max > 10000 && "border-red-500")}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Riesgo Máximo</p>
                  <p className="text-xl font-bold text-red-600">
                    €{(riskAssessment.potential_sanctions_max || 0).toLocaleString()}
                  </p>
                </div>
                <Euro className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="alerts">
        <TabsList>
          <TabsTrigger value="alerts" className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            Alertas Activas ({alerts.length})
          </TabsTrigger>
          <TabsTrigger value="catalog" className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            Catálogo LISOS
          </TabsTrigger>
        </TabsList>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-orange-500" />
                Alertas de Riesgo de Sanción
              </CardTitle>
              <CardDescription>
                Pre-alertas y alertas activas que requieren atención
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {alerts.length === 0 ? (
                  <div className="text-center py-12">
                    <ShieldCheck className="h-16 w-16 mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-medium text-green-600">Sin Alertas Activas</h3>
                    <p className="text-muted-foreground">
                      No hay riesgos de sanción detectados actualmente
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alerts.map(alert => {
                      const levelConfig = ALERT_LEVEL_CONFIG[alert.alert_level] || ALERT_LEVEL_CONFIG.prealert;
                      const LevelIcon = levelConfig.icon;

                      return (
                        <div 
                          key={alert.id} 
                          className={cn(
                            "p-4 border rounded-lg transition-colors",
                            alert.alert_level === 'critical' && "border-red-400 bg-red-50 dark:bg-red-950/20",
                            alert.alert_level === 'urgent' && "border-orange-400 bg-orange-50 dark:bg-orange-950/20"
                          )}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <LevelIcon className={cn("h-5 w-5", levelConfig.color)} />
                              <Badge className={cn(levelConfig.bgColor, levelConfig.color)}>
                                {levelConfig.label}
                              </Badge>
                              {alert.days_remaining !== null && (
                                <Badge variant={alert.days_remaining <= 0 ? 'destructive' : 'secondary'}>
                                  {alert.days_remaining <= 0 ? 'VENCIDO' : `${alert.days_remaining} días`}
                                </Badge>
                              )}
                            </div>
                            <div className="text-right">
                              {alert.potential_sanction_max && (
                                <p className="text-lg font-bold text-red-600">
                                  €{alert.potential_sanction_max.toLocaleString()}
                                </p>
                              )}
                              {alert.potential_sanction_min && (
                                <p className="text-xs text-muted-foreground">
                                  Mín: €{alert.potential_sanction_min.toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>

                          <h4 className="font-medium mb-1">{alert.title}</h4>
                          <p className="text-sm text-muted-foreground mb-3">{alert.description}</p>

                          {/* Recommended Actions */}
                          {alert.recommended_actions && alert.recommended_actions.length > 0 && (
                            <div className="mb-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                              <p className="text-xs font-medium text-green-700 mb-1">
                                Acciones Recomendadas:
                              </p>
                              <ul className="text-sm text-green-600 list-disc pl-4 space-y-1">
                                {alert.recommended_actions.map((action, i) => (
                                  <li key={i}>{action}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Risk Details */}
                          {alert.risk && (
                            <div className="mb-3 p-3 bg-muted/50 rounded-lg">
                              <p className="text-xs font-medium mb-1">Infracción Relacionada:</p>
                              <p className="text-sm">{alert.risk.description}</p>
                              <Badge variant="outline" className="mt-2">
                                {alert.risk.legal_reference}
                              </Badge>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between pt-3 border-t">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {alert.hr_agent_notified && (
                                <Badge variant="outline" className="text-xs">
                                  ✓ RRHH notificado
                                </Badge>
                              )}
                              {alert.legal_agent_notified && (
                                <Badge variant="outline" className="text-xs">
                                  ✓ Jurídico notificado
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {!alert.hr_agent_notified && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => notifyAgents(alert.id, 'hr')}
                                >
                                  <Bell className="h-4 w-4 mr-1" />
                                  Notificar RRHH
                                </Button>
                              )}
                              {!alert.legal_agent_notified && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => notifyAgents(alert.id, 'legal')}
                                >
                                  <Gavel className="h-4 w-4 mr-1" />
                                  Escalar Jurídico
                                </Button>
                              )}
                              <Button 
                                size="sm"
                                onClick={() => resolveAlert(alert.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Resolver
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LISOS Catalog Tab */}
        <TabsContent value="catalog" className="mt-4">
          <div className="space-y-4">
            {/* Classification Summary */}
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(CLASSIFICATION_CONFIG).map(([key, config]) => (
                <Card 
                  key={key} 
                  className={cn(
                    "cursor-pointer hover:border-primary transition-colors",
                    classificationFilter === key && "border-primary"
                  )}
                  onClick={() => setClassificationFilter(classificationFilter === key ? 'all' : key)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Infracciones {config.label}s</p>
                        <p className={cn("text-2xl font-bold", config.color)}>
                          {risksByClassification[key as keyof typeof risksByClassification]}
                        </p>
                      </div>
                      <div className={cn("p-2 rounded-full", config.bgColor)}>
                        <Shield className={cn("h-6 w-6", config.color)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar en catálogo LISOS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Risks List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Catálogo de Infracciones LISOS
                </CardTitle>
                <CardDescription>
                  Ley sobre Infracciones y Sanciones en el Orden Social
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {filteredRisks.map(risk => {
                      const classConfig = CLASSIFICATION_CONFIG[risk.classification] || CLASSIFICATION_CONFIG.leve;
                      
                      return (
                        <div key={risk.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge className={cn(classConfig.bgColor, classConfig.color)}>
                                {classConfig.label}
                              </Badge>
                              <Badge variant="outline">{risk.legal_reference}</Badge>
                              <Badge variant="secondary">{risk.jurisdiction}</Badge>
                            </div>
                          </div>
                          
                          <p className="font-medium mb-1">{risk.infraction_type}</p>
                          <p className="text-sm text-muted-foreground mb-3">{risk.description}</p>

                          {/* Sanctions by Grade */}
                          <div className="grid grid-cols-3 gap-4 mb-3 p-3 bg-muted/50 rounded-lg">
                            <div>
                              <p className="text-xs text-muted-foreground">Grado Mínimo</p>
                              <p className="text-sm font-medium">
                                €{risk.sanction_min_minor?.toLocaleString()} - €{risk.sanction_max_minor?.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Grado Medio</p>
                              <p className="text-sm font-medium">
                                €{risk.sanction_min_medium?.toLocaleString()} - €{risk.sanction_max_medium?.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Grado Máximo</p>
                              <p className="text-sm font-medium text-red-600">
                                €{risk.sanction_min_major?.toLocaleString()} - €{risk.sanction_max_major?.toLocaleString()}
                              </p>
                            </div>
                          </div>

                          {/* Preventive Measures */}
                          {risk.preventive_measures && risk.preventive_measures.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-green-700 mb-1">Medidas Preventivas:</p>
                              <div className="flex flex-wrap gap-1">
                                {risk.preventive_measures.map((measure, i) => (
                                  <Badge key={i} variant="outline" className="text-xs bg-green-50">
                                    {measure}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRSanctionRisksPanel;
