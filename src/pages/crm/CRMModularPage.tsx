import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/layouts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  HeartPulse, 
  BarChart3, 
  TrendingUp, 
  Target, 
  Activity, 
  Bot 
} from 'lucide-react';

// Lazy load CRM Modular Dashboard
import { lazy, Suspense } from 'react';
const CRMModularDashboard = lazy(() => import('@/components/crm/CRMModularDashboard').then(m => ({ default: m.CRMModularDashboard })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const tabs = [
  { id: 'customer360', label: 'Customer 360', icon: Users },
  { id: 'retention', label: 'Retención', icon: HeartPulse },
  { id: 'csmetrics', label: 'CS Metrics', icon: BarChart3 },
  { id: 'journey', label: 'Customer Journey', icon: TrendingUp },
  { id: 'winback', label: 'Winback', icon: Target },
  { id: 'renewals', label: 'Renovaciones', icon: Activity },
  { id: 'healthscore', label: 'Health Score', icon: HeartPulse },
  { id: 'ai-agents', label: 'Agentes IA', icon: Bot },
];

const CRMModularPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'customer360';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <DashboardLayout 
      title="CRM Modular" 
      subtitle="Módulos avanzados de Customer Success y retención"
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="flex flex-wrap gap-2 bg-muted/50 p-1 h-auto">
          {tabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <Suspense fallback={<LoadingFallback />}>
          <TabsContent value="customer360" className="m-0">
            <CRMModularDashboard initialTab="customer360" />
          </TabsContent>

          <TabsContent value="retention" className="m-0">
            <CRMModularDashboard initialTab="retention" />
          </TabsContent>

          <TabsContent value="csmetrics" className="m-0">
            <CRMModularDashboard initialTab="csmetrics" />
          </TabsContent>

          <TabsContent value="journey" className="m-0">
            <CRMModularDashboard initialTab="journey" />
          </TabsContent>

          <TabsContent value="winback" className="m-0">
            <CRMModularDashboard initialTab="winback" />
          </TabsContent>

          <TabsContent value="renewals" className="m-0">
            <CRMModularDashboard initialTab="renewals" />
          </TabsContent>

          <TabsContent value="healthscore" className="m-0">
            <CRMModularDashboard initialTab="healthscore" />
          </TabsContent>

          <TabsContent value="ai-agents" className="m-0">
            <CRMModularDashboard initialTab="ai-agents" />
          </TabsContent>
        </Suspense>
      </Tabs>
    </DashboardLayout>
  );
};

export default CRMModularPage;
