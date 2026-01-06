import React from 'react';
import { DashboardLayout } from '@/layouts';
import { CRMProvider } from '@/hooks/crm/useCRMContext';
import { CRMModularDashboard } from '@/components/crm/CRMModularDashboard';

const CRMPage = () => {
  return (
    <CRMProvider>
      <DashboardLayout 
        title="CRM Omnicanal" 
        subtitle="Gestión de clientes y pipeline de ventas"
      >
        <CRMModularDashboard />
      </DashboardLayout>
    </CRMProvider>
  );
};

export default CRMPage;
