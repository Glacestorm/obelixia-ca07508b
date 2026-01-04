import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/layouts';
import { CRMModularDashboard } from '@/components/crm/CRMModularDashboard';

const CRMPage = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';

  return (
    <DashboardLayout 
      title="CRM" 
      subtitle="Gestión de clientes y pipeline de ventas"
    >
      <CRMModularDashboard initialTab={initialTab} />
    </DashboardLayout>
  );
};

export default CRMPage;