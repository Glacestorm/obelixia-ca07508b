import React from 'react';
import { DashboardLayout } from '@/layouts';
import { ERPModularDashboard } from '@/components/erp';
import { DemoModeToggle } from '@/components/demo/DemoModeToggle';

/**
 * ERPPage - Página principal del módulo ERP
 * @version 2.1.1
 */
const ERPPage = () => {
  return (
    <DashboardLayout 
      title="ERP Modular" 
      subtitle="Sistema de gestión empresarial multi-tenant"
      rightSlot={<DemoModeToggle inline />}
      hideFloatingDemoToggle
    >
      <ERPModularDashboard />
    </DashboardLayout>
  );
};

export default ERPPage;
