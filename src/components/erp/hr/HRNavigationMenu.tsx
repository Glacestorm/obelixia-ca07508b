/**
 * HRNavigationMenu - Navegación agrupada del módulo RRHH
 * Organiza 22 pestañas en 5 categorías principales con submenús
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  Users,
  UserPlus,
  UserMinus,
  Award,
  DollarSign,
  Landmark,
  Calendar,
  FileText,
  UserCog,
  FolderOpen,
  Building2,
  Gift,
  Shield,
  GraduationCap,
  BarChart3,
  Brain,
  Newspaper,
  BookOpen,
  HelpCircle,
  Rocket,
  ChevronRight
} from 'lucide-react';

interface HRNavigationMenuProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
  stats: {
    pendingPayrolls: number;
    pendingVacations: number;
    safetyAlerts: number;
  };
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeVariant?: 'default' | 'secondary' | 'destructive';
}

interface MenuCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  items: MenuItem[];
  badge?: number;
}

export function HRNavigationMenu({ activeModule, onModuleChange, stats }: HRNavigationMenuProps) {
  const categories: MenuCategory[] = [
    {
      id: 'talent',
      label: 'Talento',
      icon: Users,
      items: [
        { id: 'employees', label: 'Empleados', icon: Users },
        { id: 'recruitment', label: 'Reclutamiento', icon: UserPlus },
        { id: 'onboarding', label: 'Onboarding', icon: UserPlus },
        { id: 'offboarding', label: 'Offboarding', icon: UserMinus },
      ]
    },
    {
      id: 'operations',
      label: 'Operaciones',
      icon: DollarSign,
      badge: stats.pendingPayrolls + stats.pendingVacations,
      items: [
        { id: 'payroll', label: 'Nóminas', icon: DollarSign, badge: stats.pendingPayrolls, badgeVariant: 'secondary' },
        { id: 'ss', label: 'Seg. Social', icon: Landmark },
        { id: 'vacations', label: 'Vacaciones', icon: Calendar, badge: stats.pendingVacations, badgeVariant: 'secondary' },
        { id: 'contracts', label: 'Contratos', icon: FileText },
        { id: 'unions', label: 'Sindicatos', icon: UserCog },
        { id: 'documents', label: 'Documentos', icon: FolderOpen },
        { id: 'departments', label: 'Organización', icon: Building2 },
      ]
    },
    {
      id: 'development',
      label: 'Desarrollo',
      icon: Award,
      badge: stats.safetyAlerts > 0 ? stats.safetyAlerts : undefined,
      items: [
        { id: 'performance', label: 'Desempeño', icon: Award },
        { id: 'training', label: 'Formación', icon: GraduationCap },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'benefits', label: 'Beneficios', icon: Gift },
        { id: 'safety', label: 'PRL', icon: Shield, badge: stats.safetyAlerts, badgeVariant: 'destructive' },
      ]
    },
    {
      id: 'tools',
      label: 'Herramientas',
      icon: Brain,
      items: [
        { id: 'agent', label: 'Agente IA', icon: Brain },
        { id: 'news', label: 'Noticias', icon: Newspaper },
        { id: 'knowledge', label: 'Normativa', icon: BookOpen },
        { id: 'help', label: 'Ayuda', icon: HelpCircle },
      ]
    },
  ];

  // Encontrar categoría activa
  const getActiveCategory = () => {
    for (const cat of categories) {
      if (cat.items.some(item => item.id === activeModule)) {
        return cat.id;
      }
    }
    return null;
  };

  const activeCategory = getActiveCategory();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Dashboard - Siempre visible */}
      <Button
        variant={activeModule === 'dashboard' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModuleChange('dashboard')}
        className="gap-1.5"
      >
        <TrendingUp className="h-4 w-4" />
        Dashboard
      </Button>

      {/* Categorías con submenús */}
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
                  <div className="w-64 p-2 bg-popover rounded-md">
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
                                variant={item.badgeVariant || 'secondary'} 
                                className="text-xs h-5 min-w-5 justify-center"
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

      {/* Tendencias - Siempre visible */}
      <Button
        variant={activeModule === 'trends' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModuleChange('trends')}
        className="gap-1.5"
      >
        <Rocket className="h-4 w-4" />
        2026+
      </Button>
    </div>
  );
}

export default HRNavigationMenu;
