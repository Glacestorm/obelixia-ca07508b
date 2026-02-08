/**
 * ESG & Sustainability Page
 * Página de acceso al módulo ESG completo
 */

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const ESGDashboard = lazy(() => 
  import('@/components/admin/esg/ESGDashboard').then(m => ({ default: m.ESGDashboard }))
);

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export default function ESGSustainabilityPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ESGDashboard />
    </Suspense>
  );
}
