import React, { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/layouts';

const CRMModularDashboard = lazy(() => import('@/components/crm/CRMModularDashboard').then(m => ({ default: m.CRMModularDashboard })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const CRMOmnicanalPage = () => {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  return (
    <DashboardLayout 
      title="CRM Omnicanal" 
      subtitle="Centro de atención multicanal y gestión de pipeline"
    >
      <Suspense fallback={<LoadingFallback />}>
        <CRMModularDashboard initialTab={activeTab} />
      </Suspense>
    </DashboardLayout>
  );
};

export default CRMOmnicanalPage;
