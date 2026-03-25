/**
 * AINavigationMenu — Mega-menu navigation for the AI Command Center
 * Follows the same Popover-based pattern as HRNavigationMenu
 * 5 groups: Operaciones, Agentes, Analítica, Economía, Gobernanza
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Zap, Bot, Sparkles, Mic, BookOpen, Trophy, GitBranch,
  LineChart, MessageSquare, DollarSign, ShieldCheck, Map, Bell,
  ChevronDown, Activity, Brain, Eye, Gauge, Shield, Layers, Network, Settings,
} from 'lucide-react';

// ─── Types ───

interface AINavigationMenuProps {
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

// ─── Component ───

export function AINavigationMenu({ activeTab, onTabChange, badges = {} }: AINavigationMenuProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const megaMenus: MegaMenuCategory[] = [
    // ━━━ OPERACIONES ━━━
    {
      id: 'ops',
      label: 'Operaciones',
      icon: Zap,
      badge: badges.live || 0,
      columns: 2,
      width: 'w-[520px]',
      headerTitle: 'Centro de Operaciones',
      headerDescription: 'Hub en vivo, agentes autónomos, copiloto predictivo y voz',
      headerAccent: 'from-violet-500/20 via-indigo-500/10 to-transparent',
      subGroups: [
        {
          title: 'Monitorización',
          icon: Activity,
          color: 'text-violet-500',
          items: [
            { id: 'live', label: 'Live Hub', icon: Zap, description: 'Panel de operaciones en tiempo real' },
            { id: 'autonomous', label: 'Autónomos', icon: Bot, description: 'Agentes con ejecución autónoma' },
          ],
        },
        {
          title: 'Asistentes IA',
          icon: Brain,
          color: 'text-indigo-500',
          items: [
            { id: 'copilot', label: 'Copilot Predictivo', icon: Sparkles, description: 'Predicciones y recomendaciones IA' },
            { id: 'voice', label: 'Interfaz de Voz', icon: Mic, description: 'Comandos e interacción por voz' },
          ],
        },
      ],
    },

    // ━━━ AGENTES ━━━
    {
      id: 'agents',
      label: 'Agentes',
      icon: Bot,
      badge: badges.catalog || 0,
      columns: 2,
      width: 'w-[520px]',
      headerTitle: 'Agentes IA',
      headerDescription: 'Catálogo, configuración avanzada, supervisores y módulos ERP',
      headerAccent: 'from-blue-500/20 via-cyan-500/10 to-transparent',
      subGroups: [
        {
          title: 'Registro',
          icon: BookOpen,
          color: 'text-blue-500',
          items: [
            { id: 'catalog', label: 'Catálogo', icon: BookOpen, description: 'Registro unificado de agentes' },
            { id: 'ranking', label: 'Ranking', icon: Trophy, description: 'Leaderboard de rendimiento' },
            { id: 'decisions', label: 'Decisiones', icon: GitBranch, description: 'Historial de decisiones autónomas' },
          ],
        },
        {
          title: 'Configuración',
          icon: Settings,
          color: 'text-cyan-500',
          items: [
            { id: 'advanced-config', label: 'Centro Control', icon: Layers, description: 'Dashboard avanzado de supervisores y dominios' },
            { id: 'erp-agents', label: 'Agentes ERP', icon: Network, description: 'Gestión completa por módulo ERP' },
          ],
        },
      ],
    },

    // ━━━ ANALÍTICA ━━━
    {
      id: 'analytics',
      label: 'Analítica',
      icon: LineChart,
      columns: 1,
      width: 'w-[320px]',
      headerTitle: 'Analítica & Observabilidad',
      headerDescription: 'Métricas, trazabilidad y conversaciones',
      headerAccent: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      subGroups: [
        {
          title: 'Datos',
          icon: Eye,
          color: 'text-emerald-500',
          items: [
            { id: 'observability', label: 'Observabilidad', icon: LineChart, description: 'KPIs, latencia y escalaciones' },
            { id: 'chat', label: 'Chat', icon: MessageSquare, description: 'Historial de conversaciones IA' },
          ],
        },
      ],
    },

    // ━━━ ECONOMÍA ━━━
    {
      id: 'economics',
      label: 'Economía',
      icon: DollarSign,
      columns: 1,
      width: 'w-[300px]',
      headerTitle: 'Economía IA',
      headerDescription: 'Costes, ROI y consumo de recursos',
      headerAccent: 'from-amber-500/20 via-orange-500/10 to-transparent',
      subGroups: [
        {
          title: 'Finanzas IA',
          icon: Gauge,
          color: 'text-amber-500',
          items: [
            { id: 'costs', label: 'Costes', icon: DollarSign, description: 'Análisis de costes y optimización' },
          ],
        },
      ],
    },

    // ━━━ GOBERNANZA ━━━
    {
      id: 'gov',
      label: 'Gobernanza',
      icon: ShieldCheck,
      badge: badges.notifications || 0,
      columns: 1,
      width: 'w-[340px]',
      headerTitle: 'Gobernanza & Compliance',
      headerDescription: 'Cumplimiento, orquestación y alertas',
      headerAccent: 'from-rose-500/20 via-pink-500/10 to-transparent',
      subGroups: [
        {
          title: 'Control',
          icon: Shield,
          color: 'text-rose-500',
          items: [
            { id: 'governance', label: 'Cumplimiento', icon: ShieldCheck, description: 'GDPR, EU AI Act y políticas' },
            { id: 'orchestration', label: 'Orquestación', icon: Map, description: 'Workflows y simulación' },
            { id: 'notifications', label: 'Alertas', icon: Bell, description: 'Alertas y notificaciones del sistema' },
          ],
        },
      ],
    },
  ];

  // Determine which group the activeTab belongs to
  const activeCategory = megaMenus.find(m =>
    m.subGroups.some(sg => sg.items.some(i => i.id === activeTab))
  )?.id || null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {megaMenus.map((menu) => {
        const MenuIcon = menu.icon;
        const isActive = activeCategory === menu.id;
        const isOpen = openCategory === menu.id;

        return (
          <Popover
            key={menu.id}
            open={isOpen}
            onOpenChange={(open) => setOpenCategory(open ? menu.id : null)}
          >
            <PopoverTrigger asChild>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  "h-9 px-3 text-sm gap-1.5 rounded-lg font-medium transition-all",
                  isOpen && "bg-accent text-accent-foreground shadow-sm",
                  isActive && "shadow-sm"
                )}
              >
                <MenuIcon className="h-4 w-4" />
                {menu.label}
                {typeof menu.badge === 'number' && menu.badge > 0 && (
                  <Badge variant="secondary" className="ml-0.5 text-[10px] h-5 min-w-5 justify-center font-semibold">
                    {menu.badge}
                  </Badge>
                )}
                <ChevronDown className={cn("ml-0.5 h-3 w-3 transition-transform duration-200", isOpen && "rotate-180")} />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              side="bottom"
              sideOffset={8}
              className={cn(
                menu.width,
                "p-0 shadow-2xl border-border/50 rounded-xl overflow-hidden backdrop-blur-sm"
              )}
            >
              {/* Header */}
              <div className={cn(
                "relative px-5 py-3.5 border-b border-border/40",
                "bg-gradient-to-r",
                menu.headerAccent
              )}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-background/80 shadow-sm border border-border/30">
                    <MenuIcon className="h-4.5 w-4.5 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground tracking-tight">{menu.headerTitle}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{menu.headerDescription}</p>
                  </div>
                </div>
              </div>

              {/* Grid */}
              <ScrollArea className="max-h-[400px]">
                <div className={cn(
                  "grid p-3 gap-px",
                  menu.columns === 2 ? "grid-cols-2" : "grid-cols-1"
                )}>
                  {menu.subGroups.map((group, gIdx) => {
                    const GroupIcon = group.icon;
                    return (
                      <div
                        key={group.title}
                        className={cn(
                          "p-2.5 rounded-xl",
                          gIdx % 2 === 0 ? "bg-transparent" : "bg-muted/20"
                        )}
                      >
                        <div className="flex items-center gap-1.5 px-2.5 mb-2">
                          <div className={cn("p-0.5 rounded", group.color.replace('text-', 'bg-').replace('500', '500/15'))}>
                            <GroupIcon className={cn("h-3 w-3", group.color)} />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
                            {group.title}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          {group.items.map((item) => {
                            const ItemIcon = item.icon;
                            const isItemActive = activeTab === item.id;
                            const itemBadge = badges[item.id] || 0;

                            return (
                              <button
                                key={item.id}
                                onClick={() => {
                                  onTabChange(item.id);
                                  setOpenCategory(null);
                                }}
                                className={cn(
                                  "w-full text-left px-2.5 py-2 rounded-lg transition-all duration-150",
                                  "flex items-start gap-2.5 group",
                                  isItemActive
                                    ? "bg-primary/10 border border-primary/20"
                                    : "hover:bg-muted/60 border border-transparent"
                                )}
                              >
                                <div className={cn(
                                  "p-1 rounded-md mt-0.5 transition-colors shrink-0",
                                  isItemActive ? "bg-primary/15" : "bg-muted/40 group-hover:bg-muted"
                                )}>
                                  <ItemIcon className={cn(
                                    "h-3.5 w-3.5",
                                    isItemActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                  )} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className={cn(
                                      "text-[13px] font-medium leading-snug",
                                      isItemActive ? "text-primary" : "text-foreground"
                                    )}>
                                      {item.label}
                                    </span>
                                    {itemBadge > 0 && (
                                      <Badge
                                        variant="destructive"
                                        className="h-4 min-w-[16px] px-1 text-[9px] font-bold animate-pulse"
                                      >
                                        {itemBadge}
                                      </Badge>
                                    )}
                                  </div>
                                  {item.description && (
                                    <p className="text-[11px] text-muted-foreground/80 leading-snug mt-0.5 truncate">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}

export default AINavigationMenu;
