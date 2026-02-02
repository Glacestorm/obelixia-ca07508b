/**
 * LegalNavigationMenu - Navegación agrupada del módulo jurídico
 * Categorías: Principal, Compliance, Documentos, Herramientas, Tendencias
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  defaultOpen?: boolean;
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
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    principal: true,
    compliance: true,
    documents: false,
    tools: false,
    trends: false
  });

  const categories: NavCategory[] = [
    {
      id: 'principal',
      label: 'Principal',
      icon: Scale,
      defaultOpen: true,
      items: [
        { id: 'dashboard', label: 'Dashboard Ejecutivo', icon: LayoutDashboard },
        { id: 'advisor', label: 'Asesor Jurídico IA', icon: MessageSquare },
      ]
    },
    {
      id: 'compliance',
      label: 'Compliance',
      icon: Shield,
      defaultOpen: true,
      items: [
        { id: 'compliance', label: 'Matriz de Cumplimiento', icon: Shield },
        { id: 'risk', label: 'Evaluación de Riesgos', icon: AlertTriangle, badge: stats.riskAlerts, badgeVariant: 'destructive' },
      ]
    },
    {
      id: 'documents',
      label: 'Documentos',
      icon: FileText,
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

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const renderBadge = (item: NavItem) => {
    if (!item.badge || item.badge <= 0) return null;
    
    return (
      <Badge 
        variant={item.badgeVariant === 'destructive' ? 'destructive' : 'secondary'}
        className={cn(
          "ml-auto h-5 min-w-5 px-1.5 text-xs",
          item.badgeVariant === 'warning' && "bg-amber-500 text-white hover:bg-amber-600"
        )}
      >
        {item.badge}
      </Badge>
    );
  };

  return (
    <div className="border rounded-lg bg-card">
      <ScrollArea className="w-full">
        <div className="flex flex-col lg:flex-row lg:items-start gap-1 p-2">
          {categories.map((category) => {
            const CategoryIcon = category.icon;
            const isOpen = openCategories[category.id] ?? category.defaultOpen ?? false;
            const hasActiveItem = category.items.some(item => item.id === activeModule);

            return (
              <Collapsible
                key={category.id}
                open={isOpen}
                onOpenChange={() => toggleCategory(category.id)}
                className="lg:min-w-[180px]"
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-between gap-2 text-sm font-medium",
                      hasActiveItem && "bg-accent text-accent-foreground"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <CategoryIcon className="h-4 w-4" />
                      {category.label}
                    </span>
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform",
                      isOpen && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-1 space-y-0.5">
                  {category.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive = activeModule === item.id;

                    return (
                      <Button
                        key={item.id}
                        variant={isActive ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => onModuleChange(item.id)}
                        className={cn(
                          "w-full justify-start gap-2 text-sm pl-6",
                          isActive && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        <ItemIcon className="h-4 w-4" />
                        <span className="truncate">{item.label}</span>
                        {renderBadge(item)}
                      </Button>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

export default LegalNavigationMenu;
