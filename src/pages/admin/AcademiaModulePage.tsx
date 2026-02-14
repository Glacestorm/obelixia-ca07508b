/**
 * AcademiaModulePage - Página del módulo vertical Academia
 * Dashboard completo accesible desde /obelixia-admin/academia-dashboard
 */

import React from 'react';
import { DashboardLayout } from '@/layouts';
import { AcademiaModuleDashboard } from '@/components/academia/dashboard';

const AcademiaModulePage: React.FC = () => {
  return (
    <DashboardLayout title="Academia">
      <AcademiaModuleDashboard />
    </DashboardLayout>
  );
};

export default AcademiaModulePage;
