import React from 'react';
import { DashboardLayout } from '@/layouts';
import { ERPModularDashboard } from '@/components/erp';

/**
 * ERPPage - Página principal del módulo ERP
 * @version 2.1.1
 */
const ERPPage = () => {
  return (
    <DashboardLayout 
      title="ERP Modular" 
      subtitle="Sistema de gestión empresarial multi-tenant"
    >
      <ERPModularDashboard />
    </DashboardLayout>
  );
};

export default ERPPage;
