/**
 * AIHybridPage - Página de gestión del Sistema IA Híbrida Universal
 * Permite configurar proveedores locales/externos, privacidad de datos,
 * créditos y enrutamiento inteligente
 */

import React from 'react';
import { DashboardLayout } from '@/layouts';
import { AIUnifiedDashboard } from '@/components/admin/ai-hybrid';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AIHybridPage() {
  const { t } = useLanguage();
  
  return (
    <DashboardLayout
      title={t('aiHybrid.title')}
      subtitle={t('aiHybrid.subtitle')}
      contentPadding="md"
    >
      <AIUnifiedDashboard />
    </DashboardLayout>
  );
}
