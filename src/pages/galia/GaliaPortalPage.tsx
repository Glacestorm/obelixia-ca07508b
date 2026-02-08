/**
 * GaliaPortalPage - Página del Portal Ciudadano GALIA
 * Acceso público para ciudadanos
 */

import React, { lazy, Suspense } from 'react';
import { PublicLayout } from '@/layouts';
import { Loader2 } from 'lucide-react';

// Import dinámico para evitar conflictos de chunking
const GaliaPortalCiudadano = lazy(() => 
  import('@/components/verticals/galia/GaliaPortalCiudadano').then(m => ({ default: m.GaliaPortalCiudadano }))
);

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const GaliaPortalPage = () => {
  return (
    <PublicLayout navbarPadding={true}>
      <div className="container mx-auto py-8">
        <Suspense fallback={<LoadingFallback />}>
          <GaliaPortalCiudadano />
        </Suspense>
      </div>
    </PublicLayout>
  );
};

export default GaliaPortalPage;
