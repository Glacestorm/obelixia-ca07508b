/**
 * GALIA Navigation - Modern Grouped Menu System
 * Menú moderno con categorías colapsables
 */

import { useState, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BarChart3,
  FolderOpen,
  FileText,
  Globe,
  Calculator,
  FileBarChart,
  FileSearch,
  LayoutDashboard,
  AlertTriangle,
  Shield,
  Sparkles,
  MapPin,
  Workflow,
  Building,
  User,
  BookOpen,
  ChevronDown,
  Brain,
  Network,
  Cpu,
  Eye,
  FileOutput,
  CheckCircle,
  Layers,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: React.ReactNode;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export interface NavCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
  defaultOpen?: boolean;
}

// Categorías de navegación agrupadas
export const galiaNavCategories: NavCategory[] = [
  {
    id: 'panel',
    label: 'Panel Principal',
    icon: <LayoutDashboard className="h-4 w-4" />,
    defaultOpen: true,
    items: [
      { id: 'resumen', label: 'Resumen Ejecutivo', shortLabel: 'Resumen', icon: <BarChart3 className="h-4 w-4" /> },
      { id: 'gestion', label: 'Gestión Técnica', shortLabel: 'Gestión', icon: <LayoutDashboard className="h-4 w-4" /> },
      { id: 'alertas', label: 'Alertas y Riesgos', shortLabel: 'Alertas', icon: <AlertTriangle className="h-4 w-4" />, badge: 'Live', badgeVariant: 'destructive' },
    ]
  },
  {
    id: 'expedientes',
    label: 'Expedientes',
    icon: <FolderOpen className="h-4 w-4" />,
    items: [
      { id: 'expedientes', label: 'Listado de Expedientes', shortLabel: 'Expedientes', icon: <FolderOpen className="h-4 w-4" /> },
      { id: 'convocatorias', label: 'Convocatorias', shortLabel: 'Convocatorias', icon: <FileText className="h-4 w-4" /> },
      { id: 'beneficiario360', label: 'Beneficiario 360°', shortLabel: '360°', icon: <User className="h-4 w-4" />, badge: 'Pro' },
    ]
  },
  {
    id: 'ia',
    label: 'Inteligencia Artificial',
    icon: <Brain className="h-4 w-4" />,
    items: [
      { id: 'costes', label: 'Moderador de Costes IA', shortLabel: 'Costes IA', icon: <Calculator className="h-4 w-4" />, badge: 'IA' },
      { id: 'documentos', label: 'Análisis OCR', shortLabel: 'OCR IA', icon: <FileSearch className="h-4 w-4" />, badge: 'IA' },
      { id: 'docgen', label: 'Generador Documentos', shortLabel: 'Doc IA', icon: <Sparkles className="h-4 w-4" />, badge: 'IA' },
      { id: 'hybrid-ai', label: 'IA Híbrida', shortLabel: 'Híbrida', icon: <Cpu className="h-4 w-4" />, badge: 'v2.0', badgeVariant: 'default' },
    ]
  },
  {
    id: 'herramientas',
    label: 'Herramientas',
    icon: <Layers className="h-4 w-4" />,
    items: [
      { id: 'knowledge', label: 'Base Normativa', shortLabel: 'Normativa', icon: <BookOpen className="h-4 w-4" /> },
      { id: 'simulator', label: 'Simulador Convocatorias', shortLabel: 'Simulador', icon: <Calculator className="h-4 w-4" /> },
      { id: 'geo', label: 'Inteligencia Geográfica', shortLabel: 'Geo', icon: <MapPin className="h-4 w-4" /> },
      { id: 'informes', label: 'Generador de Informes', shortLabel: 'Informes', icon: <FileBarChart className="h-4 w-4" /> },
      { id: 'export', label: 'Exportación Universal', shortLabel: 'Exportar', icon: <FileOutput className="h-4 w-4" /> },
    ]
  },
  {
    id: 'automatizacion',
    label: 'Automatización',
    icon: <Workflow className="h-4 w-4" />,
    items: [
      { id: 'bpmn', label: 'Flujos de Trabajo', shortLabel: 'Flujos', icon: <Workflow className="h-4 w-4" /> },
      { id: 'integraciones', label: 'Integraciones AAPP', shortLabel: 'AAPP', icon: <Building className="h-4 w-4" /> },
    ]
  },
  {
    id: 'transparencia',
    label: 'Transparencia y Cumplimiento',
    icon: <Shield className="h-4 w-4" />,
    items: [
      { id: 'portal', label: 'Portal Ciudadano', shortLabel: 'Portal', icon: <Globe className="h-4 w-4" /> },
      { id: 'transparencia', label: 'Portal de Transparencia', shortLabel: 'Transparencia', icon: <Shield className="h-4 w-4" /> },
      { id: 'compliance', label: 'Auditoría de Cumplimiento', shortLabel: 'Auditoría', icon: <CheckCircle className="h-4 w-4" />, badge: 'v2.0' },
      { id: 'project-status', label: 'Estado del Proyecto', shortLabel: 'Estado', icon: <Eye className="h-4 w-4" /> },
    ]
  },
  {
    id: 'federacion',
    label: 'Federación Nacional',
    icon: <Network className="h-4 w-4" />,
    items: [
      { id: 'federation', label: 'Dashboard Nacional', shortLabel: 'Federación', icon: <Network className="h-4 w-4" />, badge: 'v2.0', badgeVariant: 'default' },
    ]
  },
];

// Get all tab IDs for flat iteration
export const getAllTabIds = (): string[] => {
  return galiaNavCategories.flatMap(cat => cat.items.map(item => item.id));
};

// Find category and item by tab ID
export const findNavItem = (tabId: string): { category: NavCategory; item: NavItem } | null => {
  for (const category of galiaNavCategories) {
    const item = category.items.find(i => i.id === tabId);
    if (item) return { category, item };
  }
  return null;
};

interface GaliaNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

// Desktop Navigation - Compact horizontal with dropdowns
export const GaliaNavigationDesktop = memo(function GaliaNavigationDesktop({ 
  activeTab, 
  onTabChange 
}: GaliaNavigationProps) {
  const activeNavItem = findNavItem(activeTab);

  return (
    <div className="hidden md:flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border/50 backdrop-blur-sm">
      {galiaNavCategories.map((category) => {
        const isActiveCategory = category.items.some(item => item.id === activeTab);
        
        return (
          <DropdownMenu key={category.id}>
            <DropdownMenuTrigger asChild>
              <Button
                variant={isActiveCategory ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-9 gap-1.5 text-xs font-medium transition-all",
                  isActiveCategory && "shadow-sm"
                )}
              >
                {category.icon}
                <span className="hidden lg:inline">{category.label}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="start" 
              className="w-56 bg-popover/95 backdrop-blur-md border-border/50"
            >
              <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
                {category.icon}
                {category.label}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {category.items.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "flex items-center justify-between cursor-pointer",
                    activeTab === item.id && "bg-accent text-accent-foreground font-medium"
                  )}
                >
                  <span className="flex items-center gap-2">
                    {item.icon}
                    {item.label}
                  </span>
                  {item.badge && (
                    <Badge 
                      variant={item.badgeVariant || 'secondary'} 
                      className="text-[10px] h-5 px-1.5"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </div>
  );
});

// Mobile Navigation - Full dropdown menu
export const GaliaNavigationMobile = memo(function GaliaNavigationMobile({ 
  activeTab, 
  onTabChange 
}: GaliaNavigationProps) {
  const [openCategories, setOpenCategories] = useState<string[]>(['panel']);
  const activeNavItem = findNavItem(activeTab);

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <div className="md:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between h-12 bg-card border-border"
          >
            <div className="flex items-center gap-2">
              {activeNavItem?.item.icon}
              <span className="font-medium">{activeNavItem?.item.label || 'Seleccionar'}</span>
            </div>
            <div className="flex items-center gap-2">
              {activeNavItem?.item.badge && (
                <Badge variant={activeNavItem.item.badgeVariant || 'secondary'} className="text-[10px]">
                  {activeNavItem.item.badge}
                </Badge>
              )}
              <Menu className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto bg-popover/95 backdrop-blur-md"
          align="center"
        >
          {galiaNavCategories.map((category, idx) => (
            <div key={category.id}>
              {idx > 0 && <DropdownMenuSeparator />}
              <Collapsible
                open={openCategories.includes(category.id)}
                onOpenChange={() => toggleCategory(category.id)}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent/50 rounded-md mx-1">
                    <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      {category.icon}
                      {category.label}
                    </span>
                    <ChevronDown className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      openCategories.includes(category.id) && "rotate-180"
                    )} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pl-2">
                    {category.items.map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => onTabChange(item.id)}
                        className={cn(
                          "flex items-center justify-between cursor-pointer py-2.5",
                          activeTab === item.id && "bg-accent text-accent-foreground font-medium"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {item.icon}
                          {item.label}
                        </span>
                        {item.badge && (
                          <Badge 
                            variant={item.badgeVariant || 'secondary'} 
                            className="text-[10px] h-5"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

// Combined Navigation Component
export function GaliaNavigation(props: GaliaNavigationProps) {
  return (
    <>
      <GaliaNavigationDesktop {...props} />
      <GaliaNavigationMobile {...props} />
    </>
  );
}

export default GaliaNavigation;
