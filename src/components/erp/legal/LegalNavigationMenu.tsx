/**
 * LegalNavigationMenu - Navegación agrupada del módulo jurídico
 * Categorías: Principal, Compliance, Documentos, Herramientas, Tendencias
 * Usa Popover anclado al trigger para que el submenú se abra justo debajo
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  LayoutDashboard,
  MessageSquare,
  Shield,
  FileText,
  FileSearch,
  BookOpen,
  AlertTriangle,
  Activity,
  Newspaper,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Scale
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LegalNavigationMenuProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
  stats?: {
    pendingReviews?: number;
    riskAlerts?: number;
  };
}

interface NavCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
  badge?: number;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  badgeVariant?: 'default' | 'destructive' | 'warning';
}

export function LegalNavigationMenu({ 
  activeModule, 
  onModuleChange,
  stats = {}
}: LegalNavigationMenuProps) {

  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const categories: NavCategory[] = [
    {
      id: 'principal',
      label: 'Principal',
      icon: Scale,
      items: [
        { id: 'dashboard', label: 'Dashboard Ejecutivo', icon: LayoutDashboard },
        { id: 'advisor', label: 'Asesor Jurídico IA', icon: MessageSquare },
      ]
    },
    {
      id: 'compliance',
      label: 'Compliance',
      icon: Shield,
      badge: stats.riskAlerts,
      items: [
        { id: 'compliance', label: 'Matriz de Cumplimiento', icon: Shield },
        { id: 'risk', label: 'Evaluación de Riesgos', icon: AlertTriangle, badge: stats.riskAlerts, badgeVariant: 'destructive' },
      ]
    },
    {
      id: 'documents',
      label: 'Documentos',
      icon: FileText,
      badge: stats.pendingReviews,
      items: [
        { id: 'documents', label: 'Generador Documentos', icon: FileText, badge: stats.pendingReviews, badgeVariant: 'warning' },
        { id: 'contracts', label: 'Análisis Contratos', icon: FileSearch },
      ]
    },
    {
      id: 'tools',
      label: 'Herramientas',
      icon: BookOpen,
      items: [
        { id: 'knowledge', label: 'Base de Conocimiento', icon: BookOpen },
        { id: 'activity', label: 'Actividad Agentes', icon: Activity },
      ]
    },
    {
      id: 'reports',
      label: 'Reportes',
      icon: FileText,
      items: [
        { id: 'due-diligence', label: 'Due Diligence', icon: FileSearch },
        { id: 'compliance-report', label: 'Reporte Compliance', icon: Shield },
        { id: 'risk-report', label: 'Reporte Riesgos', icon: AlertTriangle },
        { id: 'audit-trail', label: 'Audit Trail', icon: Activity },
        { id: 'regulation-impact', label: 'Impacto Regulatorio', icon: Scale },
      ]
    },
    {
      id: 'trends',
      label: 'Tendencias',
      icon: Sparkles,
      items: [
        { id: 'news', label: 'Noticias Legales', icon: Newspaper },
        { id: 'trends', label: 'Tendencias 2026', icon: Sparkles },
      ]
    },
    {
      id: 'gateway',
      label: 'Gateway Legal',
      icon: Shield,
      items: [
        { id: 'validation-gateway', label: 'Gateway Validación', icon: Shield },
        { id: 'agent-supervisor', label: 'Supervisor Agentes', icon: Activity },
        { id: 'compliance-api', label: 'API Compliance', icon: FileText },
      ]
    }
  ];

  // Determinar categoría activa basada en el módulo seleccionado
  const getActiveCategory = () => {
    for (const category of categories) {
      if (category.items.some(item => item.id === activeModule)) {
        return category.id;
      }
    }
    return null;
  };

  const activeCategory = getActiveCategory();

  return (
    <div className="border rounded-lg bg-card p-2">
      <div className="flex items-center gap-1 flex-wrap">
        {categories.map((category) => {
          const CategoryIcon = category.icon;
          const isActive = activeCategory === category.id;
          const isOpen = openCategory === category.id;

          return (
            <Popover
              key={category.id}
              open={isOpen}
              onOpenChange={(open) => setOpenCategory(open ? category.id : null)}
            >
              <PopoverTrigger asChild>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn("h-9 px-3 text-sm gap-1.5", isOpen && "bg-accent text-accent-foreground")}
                >
                  <CategoryIcon className="h-4 w-4" />
                  {category.label}
                  {category.badge && category.badge > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs h-5 min-w-5 justify-center">
                      {category.badge}
                    </Badge>
                  )}
                  <ChevronDown className={cn("ml-1 h-3 w-3 transition-transform", isOpen && "rotate-180")} />
                </Button>
              </PopoverTrigger>

              <PopoverContent align="start" side="bottom" sideOffset={6} className="w-64 p-2">
                <div className="space-y-1">
                  {category.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isItemActive = activeModule === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onModuleChange(item.id);
                          setOpenCategory(null);
                        }}
                        className={cn(
                          "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          isItemActive && "bg-accent text-accent-foreground font-medium"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <ItemIcon className="h-4 w-4" />
                          {item.label}
                        </span>
                        <div className="flex items-center gap-1">
                          {item.badge && Number(item.badge) > 0 && (
                            <Badge
                              variant={item.badgeVariant === 'destructive' ? 'destructive' : 'secondary'}
                              className={cn(
                                "text-xs h-5 min-w-5 justify-center",
                                item.badgeVariant === 'warning' && "bg-warning text-warning-foreground"
                              )}
                            >
                              {item.badge}
                            </Badge>
                          )}
                          {isItemActive && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </div>
  );
}

export default LegalNavigationMenu;
