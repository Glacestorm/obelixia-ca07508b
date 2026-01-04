import React from 'react';
import { DashboardLayout } from '@/layouts';
import { CRMModularDashboard } from '@/components/crm/CRMModularDashboard';

const CRMPage = () => {
  return (
    <DashboardLayout 
      title="CRM Omnicanal" 
      subtitle="Gestión de clientes y pipeline de ventas"
    >
      <CRMModularDashboard />
    </DashboardLayout>
  );
};

export default CRMPage;
