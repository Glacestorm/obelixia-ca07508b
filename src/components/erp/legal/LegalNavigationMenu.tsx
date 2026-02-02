/**
 * LegalNavigationMenu - Navegación agrupada del módulo jurídico
 * Categorías: Principal, Compliance, Documentos, Herramientas, Tendencias
 * Usa NavigationMenu para evitar desplazamiento de categorías
 */

import { Badge } from '@/components/ui/badge';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
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
      id: 'trends',
      label: 'Tendencias',
      icon: Sparkles,
      items: [
        { id: 'news', label: 'Noticias Legales', icon: Newspaper },
        { id: 'trends', label: 'Tendencias 2026', icon: Sparkles },
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
      <NavigationMenu>
        <NavigationMenuList className="gap-1">
          {categories.map((category) => {
            const CategoryIcon = category.icon;
            const isActive = activeCategory === category.id;
            
            return (
              <NavigationMenuItem key={category.id}>
                <NavigationMenuTrigger 
                  className={cn(
                    "h-9 px-3 text-sm gap-1.5",
                    isActive && "bg-accent text-accent-foreground"
                  )}
                >
                  <CategoryIcon className="h-4 w-4" />
                  {category.label}
                  {category.badge && category.badge > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs h-5 min-w-5 justify-center">
                      {category.badge}
                    </Badge>
                  )}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-64 p-2">
                    {category.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isItemActive = activeModule === item.id;
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => onModuleChange(item.id)}
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
                                  item.badgeVariant === 'warning' && "bg-amber-500 text-white hover:bg-amber-600"
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
                </NavigationMenuContent>
              </NavigationMenuItem>
            );
          })}
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}

export default LegalNavigationMenu;
