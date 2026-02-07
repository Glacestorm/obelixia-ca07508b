/**
 * AIHybridPage - Página de gestión del Sistema IA Híbrida Universal
 * Permite configurar proveedores locales/externos, privacidad de datos,
 * créditos y enrutamiento inteligente
 */

import React from 'react';
import { DashboardLayout } from '@/layouts';
import { AIUnifiedDashboard } from '@/components/admin/ai-hybrid';

export default function AIHybridPage() {
  return (
    <DashboardLayout
      title="IA Híbrida Universal"
      subtitle="Sistema de gestión de IA Local + Externa"
      contentPadding="md"
    >
      <AIUnifiedDashboard />
    </DashboardLayout>
  );
}
