/**
 * ERPConnectorLogo - Componente para mostrar logos de conectores ERP
 * Con fallback a iconos de Lucide cuando la imagen no está disponible
 */

import React, { useState } from 'react';
import {
  Building2,
  Database,
  Boxes,
  Calculator,
  Landmark,
  Factory,
  BarChart3,
  Briefcase,
  Store,
  FileSpreadsheet,
  Globe,
  Cloud
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ERPConnectorLogoProps {
  logoUrl?: string | null;
  label: string;
  vendor?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Mapeo de vendors/sistemas a iconos
const VENDOR_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  // Global ERPs
  'sap': Database,
  'sap se': Database,
  'oracle': Globe,
  'microsoft': Boxes,
  'infor': Cloud,
  'sage': Calculator,
  
  // Spanish specific
  'wolters kluwer': Landmark,
  'cegid': BarChart3,
  'aplifisa': FileSpreadsheet,
  'datev': Calculator,
  'exact': Briefcase,
  'odoo': Store,
  'holded': Cloud,
  
  // Default
  'default': Building2
};

// Colores por vendor para el fondo del fallback
const VENDOR_COLOR_MAP: Record<string, string> = {
  'sap': 'bg-blue-100 text-blue-600',
  'sap se': 'bg-blue-100 text-blue-600',
  'oracle': 'bg-red-100 text-red-600',
  'microsoft': 'bg-sky-100 text-sky-600',
  'sage': 'bg-green-100 text-green-600',
  'infor': 'bg-orange-100 text-orange-600',
  'wolters kluwer': 'bg-purple-100 text-purple-600',
  'cegid': 'bg-indigo-100 text-indigo-600',
  'odoo': 'bg-violet-100 text-violet-600',
  'holded': 'bg-teal-100 text-teal-600',
  'default': 'bg-muted text-muted-foreground'
};

const SIZE_MAP = {
  sm: { container: 'h-6 w-6', icon: 'h-4 w-4' },
  md: { container: 'h-8 w-8', icon: 'h-5 w-5' },
  lg: { container: 'h-10 w-10', icon: 'h-6 w-6' }
};

export function ERPConnectorLogo({ 
  logoUrl, 
  label, 
  vendor,
  size = 'md',
  className 
}: ERPConnectorLogoProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const vendorKey = vendor?.toLowerCase() || 'default';
  const IconComponent = VENDOR_ICON_MAP[vendorKey] || VENDOR_ICON_MAP['default'];
  const colorClasses = VENDOR_COLOR_MAP[vendorKey] || VENDOR_COLOR_MAP['default'];
  const sizes = SIZE_MAP[size];

  // Si no hay URL o hubo error, mostrar fallback
  if (!logoUrl || imageError) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center rounded-lg",
          colorClasses,
          sizes.container,
          className
        )}
        title={label}
      >
        <IconComponent className={sizes.icon} />
      </div>
    );
  }

  return (
    <div className={cn("relative", sizes.container, className)}>
      {/* Placeholder mientras carga */}
      {!imageLoaded && (
        <div 
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-lg",
            colorClasses
          )}
        >
          <IconComponent className={cn(sizes.icon, "opacity-50")} />
        </div>
      )}
      
      {/* Imagen real */}
      <img 
        src={logoUrl} 
        alt={label}
        className={cn(
          "object-contain transition-opacity duration-200",
          sizes.container,
          imageLoaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
      />
    </div>
  );
}

export default ERPConnectorLogo;
