/**
 * HRNavigationMenu - Navegación agrupada del módulo RRHH
 * Enterprise usa mega-menu multi-columna con sub-grupos lógicos
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  TrendingUp, Users, UserPlus, UserMinus, Award, DollarSign, Landmark, Calendar,
  FileText, UserCog, FolderOpen, Building2, Gift, Shield, GraduationCap, BarChart3,
  Brain, Newspaper, BookOpen, HelpCircle, Rocket, ChevronDown,
  Calculator, Link2, Database, MapPin, Network, Lock, ClipboardList, GitBranch,
  Inbox, Timer, Coins, Heart, Leaf, Bot, Layers, ShieldAlert, Target, Scale, Gavel,
  Zap, LayoutGrid, Gauge, Fingerprint, Globe, Cpu
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
  description?: string;
}

interface MenuCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  items: MenuItem[];
  badge?: number;
}

interface EnterpriseSubGroup {
  title: string;
  icon: React.ElementType;
  color: string;
  items: MenuItem[];
}

export function HRNavigationMenu({ activeModule, onModuleChange, stats }: HRNavigationMenuProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  // Standard categories (non-enterprise)
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
        { id: 'payroll-recalc', label: 'Recálculo', icon: Calculator },
        { id: 'settlements', label: 'Finiquitos', icon: UserMinus },
        { id: 'time-clock', label: 'Control Fichaje', icon: Calendar },
        { id: 'ss', label: 'Seg. Social', icon: Landmark },
        { id: 'vacations', label: 'Vacaciones', icon: Calendar, badge: stats.pendingVacations, badgeVariant: 'secondary' },
        { id: 'contracts', label: 'Contratos', icon: FileText },
        { id: 'unions', label: 'Sindicatos', icon: UserCog },
        { id: 'documents', label: 'Documentos', icon: FolderOpen },
        { id: 'departments', label: 'Organización', icon: Building2 },
        { id: 'regulatory-watch', label: 'Vigilancia Normativa', icon: Shield },
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
        { id: 'skills-matrix', label: 'Competencias', icon: Brain },
        { id: 'marketplace', label: 'Marketplace', icon: Rocket },
        { id: 'succession', label: 'Sucesión', icon: Shield },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'analytics-intelligence', label: 'Analytics IA', icon: Brain },
        { id: 'benefits', label: 'Beneficios', icon: Gift },
        { id: 'safety', label: 'PRL', icon: Shield, badge: stats.safetyAlerts, badgeVariant: 'destructive' },
      ]
    },
  ];

  // Enterprise mega-menu sub-groups
  const enterpriseSubGroups: EnterpriseSubGroup[] = [
    {
      title: 'Centro de Mando',
      icon: Gauge,
      color: 'text-primary',
      items: [
        { id: 'enterprise-dashboard', label: 'Command Center', icon: TrendingUp, description: 'Panel ejecutivo centralizado' },
        { id: 'sla-dashboard', label: 'SLA Dashboard', icon: Timer, description: 'Acuerdos de nivel de servicio' },
        { id: 'approval-inbox', label: 'Aprobaciones', icon: Inbox, description: 'Bandeja de aprobaciones' },
      ]
    },
    {
      title: 'Estructura Organizativa',
      icon: Building2,
      color: 'text-blue-600',
      items: [
        { id: 'legal-entities', label: 'Entidades Legales', icon: Building2, description: 'Sociedades y filiales' },
        { id: 'work-centers', label: 'Centros de Trabajo', icon: MapPin, description: 'Ubicaciones físicas' },
        { id: 'org-structure', label: 'Organigrama', icon: Network, description: 'Estructura jerárquica' },
        { id: 'work-calendars', label: 'Calendarios', icon: Calendar, description: 'Festivos y jornadas' },
      ]
    },
    {
      title: 'Gobernanza & Procesos',
      icon: Lock,
      color: 'text-amber-600',
      items: [
        { id: 'enterprise-roles', label: 'Roles y Permisos', icon: Lock, description: 'Control de acceso' },
        { id: 'audit-trail', label: 'Auditoría', icon: ClipboardList, description: 'Trazabilidad completa' },
        { id: 'workflow-designer', label: 'Workflows', icon: GitBranch, description: 'Diseño de flujos' },
        { id: 'compliance-enterprise', label: 'Compliance', icon: Shield, description: 'Cumplimiento normativo' },
      ]
    },
    {
      title: 'Personas & Bienestar',
      icon: Heart,
      color: 'text-rose-500',
      items: [
        { id: 'compensation-suite', label: 'Compensación', icon: Coins, description: 'Retribución total' },
        { id: 'talent-intelligence', label: 'Talent Intelligence', icon: Brain, description: 'IA para talento' },
        { id: 'wellbeing-enterprise', label: 'Wellbeing', icon: Heart, description: 'Bienestar laboral' },
        { id: 'fairness-engine', label: 'Fairness & Justice', icon: Scale, description: 'Equidad organizativa' },
        { id: 'role-experience', label: 'Role Experience', icon: UserCog, description: 'UX por rol' },
      ]
    },
    {
      title: 'Legal & Sectorial',
      icon: Gavel,
      color: 'text-emerald-600',
      items: [
        { id: 'legal-engine', label: 'Legal Engine', icon: Gavel, description: 'Motor documental legal' },
        { id: 'cnae-intelligence', label: 'CNAE Intelligence', icon: Globe, description: 'Inteligencia sectorial' },
        { id: 'esg-selfservice', label: 'ESG & Self-Service', icon: Leaf, description: 'Sostenibilidad social' },
      ]
    },
    {
      title: 'Tecnología & IA',
      icon: Cpu,
      color: 'text-violet-600',
      items: [
        { id: 'ai-governance', label: 'AI Governance', icon: Brain, description: 'Gobernanza de IA' },
        { id: 'security-governance', label: 'Security & SoD', icon: ShieldAlert, description: 'Seguridad avanzada' },
        { id: 'digital-twin', label: 'Digital Twin', icon: Layers, description: 'Gemelo digital org.' },
        { id: 'copilot-twin', label: 'Copilot + Twin', icon: Bot, description: 'Asistente IA autónomo' },
        { id: 'workforce-planning', label: 'Workforce Planning', icon: Target, description: 'Planificación estratégica' },
      ]
    },
  ];

  // All enterprise item IDs for active detection
  const allEnterpriseIds = enterpriseSubGroups.flatMap(g => g.items.map(i => i.id));

  const getActiveCategory = () => {
    if (allEnterpriseIds.includes(activeModule)) return 'enterprise';
    for (const cat of categories) {
      if (cat.items.some(item => item.id === activeModule)) return cat.id;
    }
    return null;
  };

  const activeCategory = getActiveCategory();

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Dashboard */}
      <Button
        variant={activeModule === 'dashboard' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModuleChange('dashboard')}
        className="gap-1.5"
      >
        <TrendingUp className="h-4 w-4" />
        Dashboard
      </Button>

      {/* Standard categories */}
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
                <ChevronDown className={cn("ml-0.5 h-3 w-3 transition-transform", isOpen && "rotate-180")} />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" side="bottom" sideOffset={6} className="w-64 p-2">
              <div className="space-y-0.5">
                {category.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isItemActive = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { onModuleChange(item.id); setOpenCategory(null); }}
                      className={cn(
                        "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        isItemActive && "bg-primary/10 text-primary font-medium"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <ItemIcon className="h-4 w-4" />
                        {item.label}
                      </span>
                      {item.badge && Number(item.badge) > 0 && (
                        <Badge variant={item.badgeVariant || 'secondary'} className="text-xs h-5 min-w-5 justify-center">
                          {item.badge}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        );
      })}

      {/* Enterprise Mega-Menu */}
      <Popover
        open={openCategory === 'enterprise'}
        onOpenChange={(open) => setOpenCategory(open ? 'enterprise' : null)}
      >
        <PopoverTrigger asChild>
          <Button
            variant={activeCategory === 'enterprise' ? 'secondary' : 'ghost'}
            size="sm"
            className={cn(
              "h-9 px-3 text-sm gap-1.5",
              openCategory === 'enterprise' && "bg-accent text-accent-foreground"
            )}
          >
            <Building2 className="h-4 w-4" />
            Enterprise
            <ChevronDown className={cn("ml-0.5 h-3 w-3 transition-transform", openCategory === 'enterprise' && "rotate-180")} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          side="bottom"
          sideOffset={6}
          className="w-[780px] p-0 shadow-xl border-border/60"
        >
          {/* Header */}
          <div className="px-5 py-3 border-b bg-muted/30 rounded-t-md">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Suite Enterprise</p>
                <p className="text-xs text-muted-foreground">Módulos avanzados de gestión empresarial</p>
              </div>
            </div>
          </div>

          {/* Grid de sub-grupos */}
          <ScrollArea className="max-h-[480px]">
            <div className="grid grid-cols-3 gap-0 p-2">
              {enterpriseSubGroups.map((group) => {
                const GroupIcon = group.icon;
                return (
                  <div key={group.title} className="p-2">
                    {/* Group header */}
                    <div className="flex items-center gap-1.5 px-2 mb-1.5">
                      <GroupIcon className={cn("h-3.5 w-3.5", group.color)} />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {group.title}
                      </span>
                    </div>
                    {/* Items */}
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isItemActive = activeModule === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => { onModuleChange(item.id); setOpenCategory(null); }}
                            className={cn(
                              "flex items-start gap-2.5 w-full px-2 py-2 rounded-lg text-left transition-all duration-150",
                              "hover:bg-accent/80 group",
                              isItemActive && "bg-primary/10 ring-1 ring-primary/20"
                            )}
                          >
                            <div className={cn(
                              "mt-0.5 p-1 rounded-md transition-colors",
                              isItemActive ? "bg-primary/15" : "bg-muted group-hover:bg-primary/10"
                            )}>
                              <ItemIcon className={cn(
                                "h-3.5 w-3.5 transition-colors",
                                isItemActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                              )} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-[13px] leading-tight truncate",
                                isItemActive ? "font-semibold text-primary" : "font-medium text-foreground"
                              )}>
                                {item.label}
                              </p>
                              {item.description && (
                                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
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

      {/* Herramientas */}
      <Popover
        open={openCategory === 'tools'}
        onOpenChange={(open) => setOpenCategory(open ? 'tools' : null)}
      >
        <PopoverTrigger asChild>
          <Button
            variant={activeCategory === 'tools' ? 'secondary' : 'ghost'}
            size="sm"
            className={cn("h-9 px-3 text-sm gap-1.5", openCategory === 'tools' && "bg-accent text-accent-foreground")}
          >
            <Brain className="h-4 w-4" />
            Herramientas
            <ChevronDown className={cn("ml-0.5 h-3 w-3 transition-transform", openCategory === 'tools' && "rotate-180")} />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" side="bottom" sideOffset={6} className="w-64 p-2">
          <div className="space-y-0.5">
            {[
              { id: 'agent', label: 'Agente IA', icon: Brain },
              { id: 'news', label: 'Noticias', icon: Newspaper },
              { id: 'knowledge', label: 'Normativa', icon: BookOpen },
              { id: 'legal-compliance', label: 'Cumplimiento Legal', icon: Shield },
              { id: 'integration', label: 'Integración Módulos', icon: Link2 },
              { id: 'demo-seed', label: 'Datos Demo', icon: Database },
              { id: 'help', label: 'Ayuda', icon: HelpCircle },
            ].map((item) => {
              const ItemIcon = item.icon;
              const isItemActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { onModuleChange(item.id); setOpenCategory(null); }}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    isItemActive && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <ItemIcon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* 2026+ */}
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
