import React, { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/layouts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutGrid, 
  Workflow, 
  Briefcase, 
  Zap, 
  Headphones, 
  Shield, 
  Users
} from 'lucide-react';

const CRMModularDashboard = lazy(() => import('@/components/crm/CRMModularDashboard').then(m => ({ default: m.CRMModularDashboard })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const tabs = [
  { id: 'overview', label: 'Resumen', icon: LayoutGrid },
  { id: 'pipeline', label: 'Pipeline', icon: Workflow },
  { id: 'workspaces', label: 'Workspaces', icon: Briefcase },
  { id: 'automation', label: 'Automatización', icon: Zap },
  { id: 'omnichannel', label: 'Centro Omnicanal', icon: Headphones },
  { id: 'sla', label: 'SLA Manager', icon: Shield },
  { id: 'leads', label: 'Distribución Leads', icon: Users },
];

const CRMOmnicanalPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <DashboardLayout 
      title="CRM Omnicanal" 
      subtitle="Centro de atención multicanal y gestión de pipeline"
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
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="m-0">
              <CRMModularDashboard initialTab={tab.id} />
            </TabsContent>
          ))}
        </Suspense>
      </Tabs>
    </DashboardLayout>
  );
};

export default CRMOmnicanalPage;
