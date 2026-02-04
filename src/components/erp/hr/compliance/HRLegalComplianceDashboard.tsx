/**
 * HRLegalComplianceDashboard
 * Panel principal de Cumplimiento Legal RRHH
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  AlertTriangle, 
  FileText, 
  Building2, 
  Shield, 
  CheckSquare,
  Clock,
  AlertCircle,
  Bell,
  TrendingUp,
  Calendar,
  Gavel,
  Euro,
  Plus,
  CalendarDays
} from 'lucide-react';
import { useHRLegalCompliance } from '@/hooks/admin/useHRLegalCompliance';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Sub-components
import { HRCommunicationsPanel } from './HRCommunicationsPanel';
import { HRObligationsPanel } from './HRObligationsPanel';
import { HRSanctionRisksPanel } from './HRSanctionRisksPanel';
import { HRComplianceChecklistPanel } from './HRComplianceChecklistPanel';
import { HRCommunicationGeneratorDialog } from './HRCommunicationGeneratorDialog';
import { HRComplianceCalendar } from './HRComplianceCalendar';

interface HRLegalComplianceDashboardProps {
  companyId: string;
}

export function HRLegalComplianceDashboard({ companyId }: HRLegalComplianceDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showGeneratorDialog, setShowGeneratorDialog] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const {
    communications,
    alerts,
    riskAssessment,
    upcomingDeadlines,
    isLoading,
    refreshAll,
    startAutoRefresh,
    stopAutoRefresh,
    getAlertLevelBadge,
    getAlertLevelColor,
    resolveAlert,
    notifyAgents
  } = useHRLegalCompliance(companyId);

  useEffect(() => {
    startAutoRefresh(120000); // 2 min
    return () => stopAutoRefresh();
  }, [startAutoRefresh, stopAutoRefresh]);

  const criticalAlerts = alerts.filter(a => a.alert_level === 'critical');
  const urgentAlerts = alerts.filter(a => a.alert_level === 'urgent');
  const pendingCommunications = communications.filter(c => c.delivery_status === 'draft' || c.delivery_status === 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Gavel className="h-6 w-6 text-primary" />
            Cumplimiento Legal RRHH
          </h2>
          <p className="text-muted-foreground">
            Gestión de comunicaciones obligatorias, obligaciones AAPP y alertas de sanción
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCalendar(true)} variant="outline" size="sm">
            <CalendarDays className="h-4 w-4 mr-2" />
            Calendario
          </Button>
          <Button onClick={() => setShowGeneratorDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Comunicación
          </Button>
          <Button onClick={refreshAll} disabled={isLoading} variant="outline" size="sm">
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className={cn(criticalAlerts.length > 0 && "border-red-500 bg-red-50 dark:bg-red-950/20")}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Alertas Críticas</p>
                <p className="text-2xl font-bold text-red-600">{criticalAlerts.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn(urgentAlerts.length > 0 && "border-orange-500 bg-orange-50 dark:bg-orange-950/20")}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Alertas Urgentes</p>
                <p className="text-2xl font-bold text-orange-600">{urgentAlerts.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Vencimientos (30d)</p>
                <p className="text-2xl font-bold">{upcomingDeadlines.length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Comunic. Pendientes</p>
                <p className="text-2xl font-bold">{pendingCommunications.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          riskAssessment && riskAssessment.potential_sanctions_max > 0 && 
          "border-purple-500 bg-purple-50 dark:bg-purple-950/20"
        )}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Riesgo Potencial</p>
                <p className="text-xl font-bold text-purple-600">
                  {riskAssessment 
                    ? `€${(riskAssessment.potential_sanctions_max / 1000).toFixed(0)}K`
                    : '€0'
                  }
                </p>
              </div>
              <Euro className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              ¡Alertas Críticas que Requieren Acción Inmediata!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalAlerts.slice(0, 3).map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-red-200">
                  <div className="flex-1">
                    <p className="font-medium text-red-700">{alert.title}</p>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                    {alert.days_remaining !== null && (
                      <Badge variant="destructive" className="mt-1">
                        {alert.days_remaining <= 0 ? 'VENCIDO' : `${alert.days_remaining} días`}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => notifyAgents(alert.id, 'hr')}>
                      <Bell className="h-4 w-4 mr-1" />
                      RRHH
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => notifyAgents(alert.id, 'legal')}>
                      <Gavel className="h-4 w-4 mr-1" />
                      Jurídico
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => resolveAlert(alert.id)}>
                      Resolver
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="communications" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            Comunicaciones
          </TabsTrigger>
          <TabsTrigger value="obligations" className="flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            Obligaciones
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="risks" className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            Riesgos
          </TabsTrigger>
          <TabsTrigger value="checklist" className="flex items-center gap-1">
            <CheckSquare className="h-4 w-4" />
            Checklist
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Deadlines */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-yellow-500" />
                  Próximos Vencimientos
                </CardTitle>
                <CardDescription>Obligaciones en los próximos 30 días</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {upcomingDeadlines.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No hay vencimientos próximos
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {upcomingDeadlines.map(deadline => (
                        <div key={deadline.deadline_id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div>
                            <p className="font-medium text-sm">{deadline.obligation_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{deadline.organism}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(deadline.deadline_date), 'dd/MM/yyyy')}
                              </span>
                            </div>
                          </div>
                          <Badge className={cn(
                            deadline.days_remaining <= 3 ? 'bg-red-500' :
                            deadline.days_remaining <= 7 ? 'bg-orange-500' :
                            deadline.days_remaining <= 15 ? 'bg-yellow-500' :
                            'bg-blue-500'
                          )}>
                            {deadline.days_remaining} días
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Active Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Alertas Activas
                </CardTitle>
                <CardDescription>Pre-alertas y riesgos de sanción</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {alerts.length === 0 ? (
                    <div className="text-center py-8">
                      <Shield className="h-12 w-12 mx-auto text-green-500 mb-2" />
                      <p className="text-muted-foreground">Sin alertas activas</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {alerts.map(alert => (
                        <div key={alert.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <Badge className={getAlertLevelBadge(alert.alert_level)}>
                              {alert.alert_level.toUpperCase()}
                            </Badge>
                            {alert.potential_sanction_max && (
                              <span className="text-sm font-medium text-red-600">
                                Hasta €{alert.potential_sanction_max.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-sm">{alert.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                          {alert.recommended_actions && alert.recommended_actions.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-green-600">Acciones recomendadas:</p>
                              <ul className="text-xs text-muted-foreground list-disc pl-4">
                                {alert.recommended_actions.slice(0, 2).map((action, i) => (
                                  <li key={i}>{action}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="communications" className="mt-4">
          <HRCommunicationsPanel companyId={companyId} />
        </TabsContent>

        <TabsContent value="obligations" className="mt-4">
          <HRObligationsPanel companyId={companyId} />
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <HRComplianceCalendar companyId={companyId} />
        </TabsContent>

        <TabsContent value="risks" className="mt-4">
          <HRSanctionRisksPanel companyId={companyId} />
        </TabsContent>

        <TabsContent value="checklist" className="mt-4">
          <HRComplianceChecklistPanel companyId={companyId} />
        </TabsContent>
      </Tabs>

      {/* Generator Dialog */}
      <HRCommunicationGeneratorDialog
        open={showGeneratorDialog}
        onOpenChange={setShowGeneratorDialog}
        companyId={companyId}
        onSuccess={refreshAll}
      />

      {/* Calendar Modal */}
      {showCalendar && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Calendario de Cumplimiento
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCalendar(false)}>
                ✕
              </Button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
              <HRComplianceCalendar companyId={companyId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HRLegalComplianceDashboard;
