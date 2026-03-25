/**
 * AuditNavigationMenu — Mega-menu navigation for the Audit Center
 * Follows the same Popover-based pattern as AINavigationMenu / HRNavigationMenu
 * 4 groups: Auditoría, Compliance, Agentes IA, Gestión
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  ShieldCheck, Globe, Scale, Link2, TrendingUp,
  Bot, MessageSquare, Eye, Activity, Brain, Gauge,
  ChevronDown, FileText, Shield, AlertTriangle, Settings,
  LayoutDashboard, Network,
} from 'lucide-react';

interface AuditNavigationMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  badges?: Record<string, number>;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  description?: string;
}

interface SubGroup {
  title: string;
  icon: React.ElementType;
  color: string;
  items: MenuItem[];
}

interface MegaMenuCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  subGroups: SubGroup[];
  columns: number;
  width: string;
  headerTitle: string;
  headerDescription: string;
  headerAccent: string;
}

export function AuditNavigationMenu({ activeTab, onTabChange, badges = {} }: AuditNavigationMenuProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const megaMenus: MegaMenuCategory[] = [
    // ━━━ AUDITORÍA ━━━
    {
      id: 'audit',
      label: 'Auditoría',
      icon: ShieldCheck,
      badge: badges.critical || 0,
      columns: 2,
      width: 'w-[520px]',
      headerTitle: 'Centro de Auditoría',
      headerDescription: 'Dashboard unificado, auditoría interna y externa',
      headerAccent: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      subGroups: [
        {
          title: 'Vista General',
          icon: LayoutDashboard,
          color: 'text-emerald-500',
          items: [
            { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard, description: 'KPIs, mapa de riesgo y jerarquía de agentes' },
            { id: 'improvements', label: 'Plan de Mejoras', icon: TrendingUp, description: 'Hallazgos, acciones correctoras y seguimiento' },
          ],
        },
        {
          title: 'Dominios',
          icon: Activity,
          color: 'text-blue-500',
          items: [
            { id: 'internal', label: 'Interna', icon: ShieldCheck, description: 'Timeline unificado de 5 dominios con filtros' },
            { id: 'external', label: 'Externa', icon: Globe, description: 'Envíos regulatorios, evidencias y calendario' },
          ],
        },
      ],
    },
    // ━━━ COMPLIANCE ━━━
    {
      id: 'compliance',
      label: 'Compliance',
      icon: Scale,
      columns: 1,
      width: 'w-[320px]',
      headerTitle: 'Cumplimiento Normativo',
      headerDescription: 'Matriz regulatoria y blockchain trail',
      headerAccent: 'from-blue-500/20 via-indigo-500/10 to-transparent',
      subGroups: [
        {
          title: 'Verificación',
          icon: Shield,
          color: 'text-indigo-500',
          items: [
            { id: 'compliance', label: 'Matriz Compliance', icon: Scale, description: 'GDPR, DORA, PSD3, Basel, EU AI Act' },
            { id: 'blockchain', label: 'Blockchain Trail', icon: Link2, description: 'Verificación de integridad inmutable' },
          ],
        },
      ],
    },
    // ━━━ AGENTES IA ━━━
    {
      id: 'agents',
      label: 'Agentes IA',
      icon: Bot,
      badge: badges.agents || 0,
      columns: 2,
      width: 'w-[560px]',
      headerTitle: 'Inteligencia de Auditoría',
      headerDescription: '8 especialistas, 2 supervisores, 1 SuperSupervisor',
      headerAccent: 'from-amber-500/20 via-orange-500/10 to-transparent',
      subGroups: [
        {
          title: 'Agentes',
          icon: Bot,
          color: 'text-amber-500',
          items: [
            { id: 'agents', label: 'Panel de Agentes', icon: Bot, description: '8 agentes especializados con semáforos' },
            { id: 'activity', label: 'Feed de Actividad', icon: Activity, description: 'Invocaciones y resultados en tiempo real' },
          ],
        },
        {
          title: 'Supervisión',
          icon: Brain,
          color: 'text-violet-500',
          items: [
            { id: 'supersupervisor', label: 'SuperSupervisor', icon: Brain, description: 'Visión 360°, arbitraje y calibración' },
            { id: 'chat', label: 'Chat IA', icon: MessageSquare, description: 'Consulta en lenguaje natural a los agentes' },
          ],
        },
      ],
    },
  ];

  // Active tab label for display
  const allItems = megaMenus.flatMap(m => m.subGroups.flatMap(sg => sg.items));
  const activeItem = allItems.find(i => i.id === activeTab);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {megaMenus.map((menu) => {
        const isActive = menu.subGroups.some(sg => sg.items.some(i => i.id === activeTab));
        const Icon = menu.icon;

        return (
          <Popover
            key={menu.id}
            open={openCategory === menu.id}
            onOpenChange={(open) => setOpenCategory(open ? menu.id : null)}
          >
            <PopoverTrigger asChild>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'gap-1.5 text-xs h-8 transition-all',
                  isActive && 'bg-primary/10 text-primary border border-primary/20'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {menu.label}
                {menu.badge ? (
                  <Badge variant="destructive" className="h-4 px-1 text-[9px] ml-0.5">{menu.badge}</Badge>
                ) : null}
                <ChevronDown className={cn('h-3 w-3 transition-transform', openCategory === menu.id && 'rotate-180')} />
              </Button>
            </PopoverTrigger>

            <PopoverContent className={cn('p-0 border shadow-xl', menu.width)} align="start" sideOffset={4}>
              {/* Header */}
              <div className={cn('px-4 py-3 border-b bg-gradient-to-r', menu.headerAccent)}>
                <p className="font-semibold text-sm">{menu.headerTitle}</p>
                <p className="text-xs text-muted-foreground">{menu.headerDescription}</p>
              </div>

              {/* Content */}
              <div className={cn('grid gap-0 p-2', `grid-cols-${menu.columns}`)}>
                {menu.subGroups.map((group) => {
                  const GroupIcon = group.icon;
                  return (
                    <div key={group.title} className="space-y-0.5">
                      <div className="flex items-center gap-1.5 px-2 py-1">
                        <GroupIcon className={cn('h-3.5 w-3.5', group.color)} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {group.title}
                        </span>
                      </div>
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const itemActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            className={cn(
                              'w-full text-left px-2 py-2 rounded-md transition-colors flex items-start gap-2.5 group',
                              itemActive
                                ? 'bg-primary/10 text-primary'
                                : 'hover:bg-muted/80'
                            )}
                            onClick={() => {
                              onTabChange(item.id);
                              setOpenCategory(null);
                            }}
                          >
                            <ItemIcon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', itemActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                            <div>
                              <p className={cn('text-xs font-medium', itemActive ? 'text-primary' : '')}>{item.label}</p>
                              {item.description && (
                                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{item.description}</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        );
      })}

      {/* Active indicator */}
      {activeItem && (
        <Badge variant="outline" className="ml-2 text-[10px] h-6 gap-1">
          <activeItem.icon className="h-3 w-3" />
          {activeItem.label}
        </Badge>
      )}
    </div>
  );
}
