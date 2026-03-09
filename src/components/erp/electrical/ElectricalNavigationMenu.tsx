/**
 * ElectricalNavigationMenu - Energy 360 Navigation
 * Supports electricity, gas, solar and unified energy views
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  LayoutDashboard, FolderOpen, Zap, FileText, FileSignature, Users,
  BarChart3, Gauge, Lightbulb, FileBarChart, Eye, Settings,
  ChevronDown, ChevronRight, BoltIcon, GitCompareArrows, Building2, Plug,
  Flame, Sun, Activity, TrendingUp, Layers, Shield, Bell, Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ElectricalNavigationMenuProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
  stats?: {
    informesPendientes?: number;
    expedientesActivos?: number;
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
  description?: string;
  badge?: number;
  badgeVariant?: 'default' | 'destructive' | 'warning';
}

export function ElectricalNavigationMenu({ 
  activeModule, 
  onModuleChange,
  stats = {}
}: ElectricalNavigationMenuProps) {

  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const categories: NavCategory[] = [
    {
      id: 'principal',
      label: 'Resumen',
      icon: BoltIcon,
      items: [
        { id: 'dashboard', label: 'Resumen General', icon: LayoutDashboard, description: 'Vista ejecutiva energética' },
        { id: 'operacional', label: 'Panel Operativo', icon: BarChart3, description: 'KPIs operativos y alertas' },
      ]
    },
    {
      id: 'gestion',
      label: 'Gestión',
      icon: FolderOpen,
      badge: stats.expedientesActivos,
      items: [
        { id: 'expedientes', label: 'Expedientes', icon: FolderOpen, description: 'Expedientes energéticos (elec/gas/solar)', badge: stats.expedientesActivos },
        { id: 'clientes', label: 'Clientes Energéticos', icon: Users, description: 'Particulares y empresas' },
        { id: 'suministros', label: 'Suministros & CUPS', icon: Zap, description: 'Puntos de suministro eléctricos y gas' },
      ]
    },
    {
      id: 'documentos',
      label: 'Documentos',
      icon: FileText,
      items: [
        { id: 'facturas', label: 'Facturas', icon: FileText, description: 'Facturas eléctricas y de gas' },
        { id: 'contratos', label: 'Contratos', icon: FileSignature, description: 'Contratos de suministro y autoconsumo' },
      ]
    },
    {
      id: 'mercado',
      label: 'Mercado',
      icon: Activity,
      items: [
        { id: 'mercado-energetico', label: 'Mercado Energético', icon: TrendingUp, description: 'Precios luz y gas en tiempo real' },
        { id: 'precios-indexados', label: 'Precios Indexados', icon: BarChart3, description: 'Precios horarios OMIE, Peajes y PVPC' },
        { id: 'catalogo', label: 'Catálogo Tarifas', icon: FileText, description: 'Catálogo de tarifas del mercado' },
      ]
    },
    {
      id: 'analisis',
      label: 'Análisis',
      icon: BarChart3,
      items: [
        { id: 'consumo', label: 'Análisis de Consumo', icon: BarChart3, description: 'Consumo por periodos tarifarios' },
        { id: 'comparador', label: 'Simulador', icon: GitCompareArrows, description: 'Simulador y comparador de tarifas' },
        { id: 'motor-recomendacion', label: 'Motor Multi-Vector', icon: Layers, description: 'Recomendación combinada elec+gas+solar' },
        { id: 'recomendaciones', label: 'Recomendaciones', icon: Lightbulb, description: 'Tarifa y potencia óptima multi-energía' },
        { id: 'analitica-avanzada', label: 'Analítica Avanzada', icon: Layers, description: 'Gráficos multi-energía y KPIs premium' },
      ]
    },
    {
      id: 'informes',
      label: 'Informes',
      icon: FileBarChart,
      badge: stats.informesPendientes,
      items: [
        { id: 'informes', label: 'Informes Finales', icon: FileBarChart, description: 'Informes de optimización energética', badge: stats.informesPendientes },
        { id: 'seguimiento', label: 'Seguimiento', icon: Eye, description: 'Seguimiento posterior al informe' },
        { id: 'ejecutivo', label: 'Dashboard Ejecutivo', icon: Building2, description: 'KPIs multiempresa y exportación' },
      ]
    },
    {
      id: 'noticias',
      label: 'Noticias',
      icon: Activity,
      items: [
        { id: 'noticias-energia', label: 'Noticias Energía', icon: Activity, description: 'Noticias del sector energético' },
        { id: 'normativa', label: 'Normativa', icon: FileBarChart, description: 'Regulación local, estatal y europea' },
      ]
    },
    {
      id: 'config',
      label: 'Ajustes',
      icon: Settings,
      items: [
        { id: 'integraciones', label: 'Integraciones', icon: Plug, description: 'Datadis, OMIE, MIBGAS, REE y más' },
        { id: 'ajustes', label: 'Configuración', icon: Settings, description: 'Parámetros del módulo energético' },
      ]
    },
  ];

  const getActiveCategory = () => {
    for (const cat of categories) {
      if (cat.items.some(item => item.id === activeModule)) {
        return cat.id;
      }
    }
    return 'principal';
  };

  const activeCategoryId = getActiveCategory();

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/50 rounded-lg border">
      {categories.map((category) => {
        const Icon = category.icon;
        const isActiveCategory = activeCategoryId === category.id;
        const hasOnlyOneItem = category.items.length === 1;

        if (hasOnlyOneItem) {
          const item = category.items[0];
          const ItemIcon = item.icon;
          return (
            <Button
              key={category.id}
              variant={activeModule === item.id ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "gap-1.5 text-xs h-8",
                activeModule === item.id && "shadow-sm"
              )}
              onClick={() => onModuleChange(item.id)}
            >
              <ItemIcon className="h-3.5 w-3.5" />
              {category.label}
            </Button>
          );
        }

        return (
          <Popover 
            key={category.id} 
            open={openCategory === category.id}
            onOpenChange={(open) => setOpenCategory(open ? category.id : null)}
          >
            <PopoverTrigger asChild>
              <Button
                variant={isActiveCategory ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  "gap-1.5 text-xs h-8",
                  isActiveCategory && "shadow-sm"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {category.label}
                {category.badge ? (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {category.badge}
                  </Badge>
                ) : null}
                {openCategory === category.id ? (
                  <ChevronDown className="h-3 w-3 ml-0.5" />
                ) : (
                  <ChevronRight className="h-3 w-3 ml-0.5" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              align="start" 
              className="w-72 p-2"
              sideOffset={4}
            >
              <div className="space-y-0.5">
                {category.items.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={item.id}
                      className={cn(
                        "w-full flex items-start gap-3 p-2.5 rounded-md text-left transition-colors",
                        activeModule === item.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                      onClick={() => {
                        onModuleChange(item.id);
                        setOpenCategory(null);
                      }}
                    >
                      <ItemIcon className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        activeModule === item.id ? "text-primary" : "text-muted-foreground"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{item.label}</span>
                          {item.badge ? (
                            <Badge 
                              variant={item.badgeVariant === 'destructive' ? 'destructive' : 'secondary'} 
                              className="h-4 px-1.5 text-[10px]"
                            >
                              {item.badge}
                            </Badge>
                          ) : null}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {item.description}
                          </p>
                        )}
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
  );
}

export default ElectricalNavigationMenu;
