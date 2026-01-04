import React, { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/layouts';

const CRMModularDashboard = lazy(() => import('@/components/crm/CRMModularDashboard').then(m => ({ default: m.CRMModularDashboard })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const CRMModularPage = () => {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'customer360';

  return (
    <DashboardLayout 
      title="CRM Modular" 
      subtitle="Módulos avanzados de Customer Success y retención"
    >
      <Suspense fallback={<LoadingFallback />}>
        <CRMModularDashboard initialTab={activeTab} />
      </Suspense>
    </DashboardLayout>
  );
};

export default CRMModularPage;
