/**
 * GaliaMapBreadcrumb - Navigation breadcrumb for territorial map
 * Shows drill-down path and allows navigation back to any level
 */

import { memo } from 'react';
import { 
  Breadcrumb, 
  BreadcrumbList, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { MapPin, ChevronLeft, Home } from 'lucide-react';
import { MapLevel } from '@/hooks/galia/useGaliaTerritorialMap';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  level: MapLevel;
  id: string | null;
  label: string;
}

interface GaliaMapBreadcrumbProps {
  breadcrumb: BreadcrumbItem[];
  onNavigate: (index: number) => void;
  onBack: () => void;
  className?: string;
}

const levelIcons: Record<MapLevel, React.ReactNode> = {
  national: <Home className="h-3.5 w-3.5" />,
  regional: <MapPin className="h-3.5 w-3.5" />,
  provincial: <MapPin className="h-3.5 w-3.5" />,
  municipal: <MapPin className="h-3.5 w-3.5" />,
  expediente: <MapPin className="h-3.5 w-3.5" />
};

export const GaliaMapBreadcrumb = memo(function GaliaMapBreadcrumb({
  breadcrumb,
  onNavigate,
  onBack,
  className
}: GaliaMapBreadcrumbProps) {
  const canGoBack = breadcrumb.length > 1;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        disabled={!canGoBack}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className={cn(
          "h-4 w-4 transition-opacity",
          !canGoBack && "opacity-30"
        )} />
      </Button>

      {/* Breadcrumb trail - using nav with custom structure to avoid li nesting issues */}
      <nav aria-label="Navegación territorial" className="flex items-center">
        <ol className="flex items-center gap-1.5 text-sm">
          {breadcrumb.map((item, index) => {
            const isLast = index === breadcrumb.length - 1;
            
            return (
              <li key={`${item.level}-${item.id || 'root'}`} className="flex items-center gap-1.5">
                {index > 0 && (
                  <span className="text-muted-foreground">/</span>
                )}
                {!isLast ? (
                  <button
                    onClick={() => onNavigate(index)}
                    className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {levelIcons[item.level]}
                    <span className="max-w-[100px] truncate">{item.label}</span>
                  </button>
                ) : (
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    {levelIcons[item.level]}
                    <span className="max-w-[150px] truncate">{item.label}</span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Keyboard hint */}
      {canGoBack && (
        <span className="hidden sm:inline-flex text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          ESC para volver
        </span>
      )}
    </div>
  );
});

export default GaliaMapBreadcrumb;
