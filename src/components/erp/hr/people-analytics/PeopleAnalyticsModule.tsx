/**
 * PeopleAnalyticsModule — Panel principal unificado
 * Filtros globales + vistas por rol + tabs por dominio
 */

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, BarChart3, DollarSign, CalendarOff, Scale, Shield, Bot, Bell } from 'lucide-react';
import { usePeopleAnalytics, type PARoleView, type PAFilters } from '@/hooks/erp/hr/usePeopleAnalytics';
import { PAOverviewDashboard } from './PAOverviewDashboard';
import { PAPayrollDashboard } from './PAPayrollDashboard';
import { PAAbsenteeismDashboard } from './PAAbsenteeismDashboard';
import { PAEquityDashboard } from './PAEquityDashboard';
import { PAComplianceDashboard } from './PAComplianceDashboard';
import { PACopilotChat } from './PACopilotChat';
import { PAAlertsFeed } from './PAAlertsFeed';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface PeopleAnalyticsModuleProps {
  companyId: string;
}

const roleLabels: Record<PARoleView, string> = {
  director: 'Director',
  hr_manager: 'HR Manager',
  payroll: 'Payroll',
  compliance: 'Compliance',
};

export function PeopleAnalyticsModule({ companyId }: PeopleAnalyticsModuleProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [roleView, setRoleView] = useState<PARoleView>('hr_manager');
  const [filters, setFilters] = useState<PAFilters>({});

  const analytics = usePeopleAnalytics();

  useEffect(() => {
    analytics.startAutoRefresh(companyId, filters, 180000);
    return () => analytics.stopAutoRefresh();
  }, [companyId, filters]);

  const handleRefresh = () => analytics.fetchAll(companyId, filters);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            People Analytics & IA
          </h2>
          <p className="text-sm text-muted-foreground">
            {analytics.lastRefresh
              ? `Actualizado ${formatDistanceToNow(analytics.lastRefresh, { locale: es, addSuffix: true })}`
              : 'Cargando datos...'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Role view selector */}
          <Select value={roleView} onValueChange={(v) => setRoleView(v as PARoleView)}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(roleLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Alerts badge */}
          {analytics.alerts.length > 0 && (
            <Button variant="outline" size="sm" className="gap-1 h-8" onClick={() => setActiveTab('alerts')}>
              <Bell className="h-3.5 w-3.5" />
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                {analytics.alerts.length}
              </Badge>
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={analytics.isLoading} className="h-8 gap-1">
            <RefreshCw className={cn("h-3.5 w-3.5", analytics.isLoading && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 h-auto">
          <TabsTrigger value="overview" className="text-xs gap-1 py-2">
            <BarChart3 className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="payroll" className="text-xs gap-1 py-2">
            <DollarSign className="h-3.5 w-3.5" /> Payroll
          </TabsTrigger>
          <TabsTrigger value="absenteeism" className="text-xs gap-1 py-2">
            <CalendarOff className="h-3.5 w-3.5" /> Absentismo
          </TabsTrigger>
          <TabsTrigger value="equity" className="text-xs gap-1 py-2">
            <Scale className="h-3.5 w-3.5" /> Equidad
          </TabsTrigger>
          <TabsTrigger value="compliance" className="text-xs gap-1 py-2">
            <Shield className="h-3.5 w-3.5" /> Compliance
          </TabsTrigger>
          <TabsTrigger value="copilot" className="text-xs gap-1 py-2">
            <Bot className="h-3.5 w-3.5" /> Copiloto IA
          </TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs gap-1 py-2">
            <Bell className="h-3.5 w-3.5" /> Alertas
            {analytics.alerts.length > 0 && (
              <Badge variant="destructive" className="text-[9px] px-1 py-0 ml-1">{analytics.alerts.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <PAOverviewDashboard
            overview={analytics.hrOverview}
            alerts={analytics.alerts}
            insights={analytics.aiInsights}
            isLoading={analytics.isLoading}
            companyId={companyId}
            onRequestInsights={() => analytics.getAIInsights(companyId, 'hr', { overview: analytics.hrOverview })}
          />
        </TabsContent>

        <TabsContent value="payroll" className="mt-4">
          <PAPayrollDashboard
            data={analytics.payrollAnalytics}
            isLoading={analytics.isLoading}
            companyId={companyId}
            onExplainAnomaly={analytics.explainAnomaly}
          />
        </TabsContent>

        <TabsContent value="absenteeism" className="mt-4">
          <PAAbsenteeismDashboard
            data={analytics.absenteeism}
            isLoading={analytics.isLoading}
          />
        </TabsContent>

        <TabsContent value="equity" className="mt-4">
          <PAEquityDashboard
            data={analytics.equityMetrics}
            isLoading={analytics.isLoading}
            vptContext={analytics.vptContext}
          />
        </TabsContent>

        <TabsContent value="compliance" className="mt-4">
          <PAComplianceDashboard
            data={analytics.complianceRisks}
            isLoading={analytics.isLoading}
          />
        </TabsContent>

        <TabsContent value="copilot" className="mt-4">
          <PACopilotChat
            companyId={companyId}
            metricsContext={{
              overview: analytics.hrOverview,
              payroll: analytics.payrollAnalytics,
              absenteeism: analytics.absenteeism,
              compliance: analytics.complianceRisks,
              equity: analytics.equityMetrics,
            }}
          />
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <PAAlertsFeed alerts={analytics.alerts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
