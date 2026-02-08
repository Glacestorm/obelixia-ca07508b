/**
 * GaliaPortalPage - Página del Portal Ciudadano GALIA
 * Acceso público para ciudadanos
 */

import React from 'react';
import { PublicLayout } from '@/layouts';
import { GaliaPortalCiudadano } from '@/components/verticals/galia';

const GaliaPortalPage = () => {
  return (
    <PublicLayout navbarPadding={true}>
      <div className="container mx-auto py-8">
        <GaliaPortalCiudadano />
      </div>
    </PublicLayout>
  );
};

export default GaliaPortalPage;
