/**
 * LegalRegulationAlertsPanel - Sistema de Alertas Regulatorias
 * Fase 7: Notificación de cambios normativos y timeline de entrada en vigor
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Bell, 
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  Filter,
  Globe,
  Scale,
  Sparkles,
  TrendingUp,
  Settings,
  BellRing,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow, format, addDays, isBefore, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface LegalRegulationAlertsPanelProps {
  companyId: string;
}

interface RegulationAlert {
  id: string;
  title: string;
  description: string;
  regulation_code: string;
  jurisdiction: string;
  legal_area: string;
  alert_type: 'new_regulation' | 'amendment' | 'repeal' | 'enforcement' | 'deadline';
  severity: 'info' | 'warning' | 'critical';
  effective_date: string;
  deadline_date?: string;
  source_url?: string;
  source_name: string;
  impact_areas: string[];
  action_required: boolean;
  is_read: boolean;
  is_acknowledged: boolean;
  created_at: string;
}

interface UpcomingDeadline {
  id: string;
  title: string;
  regulation: string;
  deadline_date: string;
  days_remaining: number;
  status: 'upcoming' | 'imminent' | 'overdue';
  action_items: string[];
}

interface SubscriptionPreference {
  jurisdiction: string;
  enabled: boolean;
}

const JURISDICTIONS = [
  { value: 'AD', label: 'Andorra', flag: '🇦🇩' },
  { value: 'ES', label: 'España', flag: '🇪🇸' },
  { value: 'EU', label: 'Unión Europea', flag: '🇪🇺' },
  { value: 'UK', label: 'Reino Unido', flag: '🇬🇧' },
  { value: 'AE', label: 'Emiratos Árabes', flag: '🇦🇪' },
  { value: 'US', label: 'Estados Unidos', flag: '🇺🇸' },
];

const ALERT_TYPE_CONFIG = {
  new_regulation: { label: 'Nueva Normativa', color: 'bg-blue-600', icon: FileText },
  amendment: { label: 'Modificación', color: 'bg-amber-600', icon: TrendingUp },
  repeal: { label: 'Derogación', color: 'bg-red-600', icon: AlertTriangle },
  enforcement: { label: 'Entrada en Vigor', color: 'bg-green-600', icon: CheckCircle },
  deadline: { label: 'Plazo', color: 'bg-purple-600', icon: Clock },
};

export function LegalRegulationAlertsPanel({ companyId }: LegalRegulationAlertsPanelProps) {
  const [alerts, setAlerts] = useState<RegulationAlert[]>([]);
  const [deadlines, setDeadlines] = useState<UpcomingDeadline[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionPreference[]>(
    JURISDICTIONS.map(j => ({ jurisdiction: j.value, enabled: j.value === 'AD' || j.value === 'ES' || j.value === 'EU' }))
  );
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('alerts');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterJurisdiction, setFilterJurisdiction] = useState<string>('all');
  const [showSettings, setShowSettings] = useState(false);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-ai-advisor', {
        body: {
          action: 'get_regulation_alerts',
          context: {
            companyId,
            jurisdictions: subscriptions.filter(s => s.enabled).map(s => s.jurisdiction),
          }
        }
      });

      if (error) throw error;

      if (data?.success && data?.data?.alerts) {
        setAlerts(data.data.alerts);
        setDeadlines(data.data.deadlines || []);
      } else {
        // Demo data
        setAlerts([
          {
            id: '1',
            title: 'Reglamento de Inteligencia Artificial (AI Act)',
            description: 'Nuevo reglamento europeo que establece normas armonizadas sobre inteligencia artificial. Afecta a sistemas de IA de alto riesgo.',
            regulation_code: 'Reglamento (UE) 2024/1689',
            jurisdiction: 'EU',
            legal_area: 'data_protection',
            alert_type: 'new_regulation',
            severity: 'warning',
            effective_date: '2025-08-01',
            source_url: 'https://eur-lex.europa.eu',
            source_name: 'EUR-Lex',
            impact_areas: ['IA', 'Tecnología', 'Compliance'],
            action_required: true,
            is_read: false,
            is_acknowledged: false,
            created_at: new Date().toISOString(),
          },
          {
            id: '2',
            title: 'Modificación Estatuto de los Trabajadores',
            description: 'Actualización del régimen de trabajo a distancia y desconexión digital.',
            regulation_code: 'RDL 8/2024',
            jurisdiction: 'ES',
            legal_area: 'labor',
            alert_type: 'amendment',
            severity: 'info',
            effective_date: '2025-03-01',
            source_name: 'BOE',
            impact_areas: ['RRHH', 'Contratos', 'Teletrabajo'],
            action_required: false,
            is_read: true,
            is_acknowledged: false,
            created_at: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: '3',
            title: 'DORA - Fecha límite de cumplimiento',
            description: 'Plazo final para cumplimiento del Reglamento de Resiliencia Operativa Digital.',
            regulation_code: 'Reglamento (UE) 2022/2554',
            jurisdiction: 'EU',
            legal_area: 'banking',
            alert_type: 'deadline',
            severity: 'critical',
            effective_date: '2025-01-17',
            deadline_date: '2025-01-17',
            source_name: 'EIOPA',
            impact_areas: ['Finanzas', 'IT', 'Seguridad'],
            action_required: true,
            is_read: false,
            is_acknowledged: false,
            created_at: new Date(Date.now() - 172800000).toISOString(),
          },
        ]);
        
        setDeadlines([
          {
            id: '1',
            title: 'Cumplimiento DORA',
            regulation: 'Reglamento (UE) 2022/2554',
            deadline_date: '2025-01-17',
            days_remaining: -17,
            status: 'overdue',
            action_items: ['Evaluación de riesgos TIC', 'Plan de continuidad', 'Pruebas de resiliencia'],
          },
          {
            id: '2',
            title: 'Adaptación AI Act - Fase 1',
            regulation: 'Reglamento (UE) 2024/1689',
            deadline_date: '2025-08-01',
            days_remaining: 179,
            status: 'upcoming',
            action_items: ['Inventario de sistemas IA', 'Clasificación de riesgos', 'Documentación técnica'],
          },
          {
            id: '3',
            title: 'Declaración Modelo 347',
            regulation: 'LGT España',
            deadline_date: '2025-02-28',
            days_remaining: 25,
            status: 'imminent',
            action_items: ['Recopilar operaciones > 3.005,06€', 'Validar datos fiscales'],
          },
        ]);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, subscriptions]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Mark alert as read
  const markAsRead = async (alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true } : a));
  };

  // Acknowledge alert
  const acknowledgeAlert = async (alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_acknowledged: true } : a));
    toast.success('Alerta confirmada');
  };

  // Toggle subscription
  const toggleSubscription = (jurisdiction: string) => {
    setSubscriptions(prev => prev.map(s => 
      s.jurisdiction === jurisdiction ? { ...s, enabled: !s.enabled } : s
    ));
  };

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
    if (filterJurisdiction !== 'all' && alert.jurisdiction !== filterJurisdiction) return false;
    return true;
  });

  const unreadCount = alerts.filter(a => !a.is_read).length;
  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.is_acknowledged).length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'warning': return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
      default: return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
    }
  };

  const getDeadlineColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'text-red-500';
      case 'imminent': return 'text-amber-500';
      default: return 'text-green-500';
    }
  };

  const getJurisdictionFlag = (code: string) => 
    JURISDICTIONS.find(j => j.value === code)?.flag || '🏳️';

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-500/20">
            <Bell className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Alertas Regulatorias</h2>
            <p className="text-sm text-muted-foreground">
              Monitoreo de cambios normativos en tiempo real
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <BellRing className="h-3 w-3" />
              {unreadCount} sin leer
            </Badge>
          )}
          {criticalCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {criticalCount} críticas
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurar
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Suscripciones por Jurisdicción
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {JURISDICTIONS.map(j => (
                <div key={j.value} className="flex items-center justify-between space-x-2">
                  <Label htmlFor={`sub-${j.value}`} className="flex items-center gap-2 cursor-pointer">
                    <span>{j.flag}</span>
                    <span className="text-sm">{j.label}</span>
                  </Label>
                  <Switch
                    id={`sub-${j.value}`}
                    checked={subscriptions.find(s => s.jurisdiction === j.value)?.enabled}
                    onCheckedChange={() => toggleSubscription(j.value)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="h-4 w-4" />
              Alertas
              {unreadCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Calendar className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="deadlines" className="gap-2">
              <Clock className="h-4 w-4" />
              Plazos
            </TabsTrigger>
          </TabsList>

          {activeTab === 'alerts' && (
            <div className="flex items-center gap-2">
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="text-sm border rounded-md px-2 py-1 bg-background"
              >
                <option value="all">Todas las severidades</option>
                <option value="critical">Críticas</option>
                <option value="warning">Advertencias</option>
                <option value="info">Informativas</option>
              </select>
              <select
                value={filterJurisdiction}
                onChange={(e) => setFilterJurisdiction(e.target.value)}
                className="text-sm border rounded-md px-2 py-1 bg-background"
              >
                <option value="all">Todas las jurisdicciones</option>
                {JURISDICTIONS.map(j => (
                  <option key={j.value} value={j.value}>{j.flag} {j.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {filteredAlerts.map((alert) => {
                const TypeIcon = ALERT_TYPE_CONFIG[alert.alert_type].icon;
                return (
                  <Card 
                    key={alert.id}
                    className={cn(
                      "transition-all hover:shadow-md",
                      !alert.is_read && "border-l-4 border-l-primary",
                      getSeverityColor(alert.severity)
                    )}
                    onClick={() => markAsRead(alert.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={ALERT_TYPE_CONFIG[alert.alert_type].color}>
                              <TypeIcon className="h-3 w-3 mr-1" />
                              {ALERT_TYPE_CONFIG[alert.alert_type].label}
                            </Badge>
                            <Badge variant="outline">
                              {getJurisdictionFlag(alert.jurisdiction)} {alert.jurisdiction}
                            </Badge>
                            {!alert.is_read && (
                              <Badge variant="secondary" className="text-xs">Nuevo</Badge>
                            )}
                          </div>
                          
                          <h3 className="font-medium mb-1">{alert.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {alert.description}
                          </p>
                          
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Scale className="h-3 w-3" />
                              {alert.regulation_code}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Vigencia: {format(new Date(alert.effective_date), 'dd/MM/yyyy')}
                            </span>
                            <span>{alert.source_name}</span>
                          </div>

                          {alert.impact_areas.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {alert.impact_areas.map(area => (
                                <Badge key={area} variant="outline" className="text-xs">
                                  {area}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(alert.created_at), { 
                              addSuffix: true, 
                              locale: es 
                            })}
                          </span>
                          {alert.action_required && !alert.is_acknowledged && (
                            <Button 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                acknowledgeAlert(alert.id);
                              }}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Confirmar
                            </Button>
                          )}
                          {alert.source_url && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(alert.source_url, '_blank');
                              }}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {filteredAlerts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No hay alertas que coincidan con los filtros</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Calendario de Entrada en Vigor</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                  
                  <div className="space-y-6 pl-10">
                    {alerts
                      .sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime())
                      .map((alert) => {
                        const isPast = isBefore(new Date(alert.effective_date), new Date());
                        return (
                          <div key={alert.id} className="relative">
                            <div className={cn(
                              "absolute -left-6 w-3 h-3 rounded-full border-2 bg-background",
                              isPast ? "border-green-500" : "border-primary"
                            )} />
                            <div className="text-xs text-muted-foreground mb-1">
                              {format(new Date(alert.effective_date), 'dd MMMM yyyy', { locale: es })}
                            </div>
                            <div className={cn(
                              "p-3 rounded-lg border",
                              isPast ? "bg-muted/30" : "bg-card"
                            )}>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {getJurisdictionFlag(alert.jurisdiction)} {alert.jurisdiction}
                                </Badge>
                                <Badge className={ALERT_TYPE_CONFIG[alert.alert_type].color} variant="secondary">
                                  {ALERT_TYPE_CONFIG[alert.alert_type].label}
                                </Badge>
                              </div>
                              <p className="font-medium text-sm">{alert.title}</p>
                              <p className="text-xs text-muted-foreground">{alert.regulation_code}</p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deadlines Tab */}
        <TabsContent value="deadlines">
          <div className="space-y-3">
            {deadlines.map((deadline) => (
              <Card 
                key={deadline.id}
                className={cn(
                  "border-l-4",
                  deadline.status === 'overdue' && "border-l-red-500",
                  deadline.status === 'imminent' && "border-l-amber-500",
                  deadline.status === 'upcoming' && "border-l-green-500"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className={cn("h-4 w-4", getDeadlineColor(deadline.status))} />
                        <h3 className="font-medium">{deadline.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {deadline.regulation}
                      </p>
                      {deadline.action_items.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium">Acciones pendientes:</p>
                          <ul className="text-xs text-muted-foreground list-disc pl-4">
                            {deadline.action_items.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {format(new Date(deadline.deadline_date), 'dd/MM/yyyy')}
                      </div>
                      <div className={cn("text-xs font-medium", getDeadlineColor(deadline.status))}>
                        {deadline.status === 'overdue' && `${Math.abs(deadline.days_remaining)} días vencido`}
                        {deadline.status === 'imminent' && `${deadline.days_remaining} días restantes`}
                        {deadline.status === 'upcoming' && `${deadline.days_remaining} días restantes`}
                      </div>
                      {deadline.status !== 'overdue' && (
                        <Progress 
                          value={Math.max(0, 100 - (deadline.days_remaining / 365) * 100)} 
                          className="h-1 mt-2 w-24"
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LegalRegulationAlertsPanel;
