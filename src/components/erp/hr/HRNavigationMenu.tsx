/**
 * HRNavigationMenu - Navegación agrupada del módulo RRHH
 * Todos los menús usan mega-menu multi-columna con sub-grupos lógicos
 */

import { useState } from 'react';
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
  Zap, Gauge, Globe, Cpu, Briefcase, Clock, FileCheck, UserCheck, LineChart,
  Sparkles, Wrench, MessageSquare, Search
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
}

export function HRNavigationMenu({ activeModule, onModuleChange, stats }: HRNavigationMenuProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const megaMenus: MegaMenuCategory[] = [
    {
      id: 'talent',
      label: 'Talento',
      icon: Users,
      columns: 2,
      width: 'w-[520px]',
      headerTitle: 'Gestión del Talento',
      headerDescription: 'Ciclo de vida completo del empleado',
      subGroups: [
        {
          title: 'Ciclo de Vida',
          icon: UserCheck,
          color: 'text-blue-600',
          items: [
            { id: 'employees', label: 'Empleados', icon: Users, description: 'Directorio y fichas' },
            { id: 'recruitment', label: 'Reclutamiento', icon: UserPlus, description: 'Ofertas y candidatos' },
          ]
        },
        {
          title: 'Incorporación & Salida',
          icon: Briefcase,
          color: 'text-emerald-600',
          items: [
            { id: 'onboarding', label: 'Onboarding', icon: UserPlus, description: 'Plan de acogida' },
            { id: 'offboarding', label: 'Offboarding', icon: UserMinus, description: 'Proceso de salida' },
          ]
        },
      ]
    },
    {
      id: 'operations',
      label: 'Operaciones',
      icon: DollarSign,
      badge: stats.pendingPayrolls + stats.pendingVacations,
      columns: 3,
      width: 'w-[720px]',
      headerTitle: 'Operaciones RRHH',
      headerDescription: 'Nóminas, contratos, tiempo y administración',
      subGroups: [
        {
          title: 'Nóminas & Retribución',
          icon: DollarSign,
          color: 'text-emerald-600',
          items: [
            { id: 'payroll', label: 'Nóminas', icon: DollarSign, description: 'Procesamiento mensual', badge: stats.pendingPayrolls, badgeVariant: 'secondary' },
            { id: 'payroll-recalc', label: 'Recálculo', icon: Calculator, description: 'Ajustes retroactivos' },
            { id: 'settlements', label: 'Finiquitos', icon: FileCheck, description: 'Liquidaciones' },
            { id: 'ss', label: 'Seg. Social', icon: Landmark, description: 'Cotizaciones y RED' },
          ]
        },
        {
          title: 'Tiempo & Ausencias',
          icon: Clock,
          color: 'text-amber-600',
          items: [
            { id: 'time-clock', label: 'Control Fichaje', icon: Clock, description: 'Registro de jornada' },
            { id: 'vacations', label: 'Vacaciones', icon: Calendar, description: 'Solicitudes y saldos', badge: stats.pendingVacations, badgeVariant: 'secondary' },
          ]
        },
        {
          title: 'Administración',
          icon: FolderOpen,
          color: 'text-blue-600',
          items: [
            { id: 'contracts', label: 'Contratos', icon: FileText, description: 'Gestión contractual' },
            { id: 'unions', label: 'Sindicatos', icon: UserCog, description: 'Rel. laborales' },
            { id: 'documents', label: 'Documentos', icon: FolderOpen, description: 'Archivo digital' },
            { id: 'departments', label: 'Organización', icon: Building2, description: 'Departamentos' },
            { id: 'regulatory-watch', label: 'Vigilancia Normativa', icon: Shield, description: 'Alertas legales' },
          ]
        },
      ]
    },
    {
      id: 'development',
      label: 'Desarrollo',
      icon: Award,
      badge: stats.safetyAlerts > 0 ? stats.safetyAlerts : undefined,
      columns: 3,
      width: 'w-[720px]',
      headerTitle: 'Desarrollo & Rendimiento',
      headerDescription: 'Formación, desempeño y analítica de personas',
      subGroups: [
        {
          title: 'Rendimiento',
          icon: Award,
          color: 'text-amber-600',
          items: [
            { id: 'performance', label: 'Desempeño', icon: Award, description: 'Evaluaciones y OKRs' },
            { id: 'skills-matrix', label: 'Competencias', icon: Brain, description: 'Matriz de skills' },
            { id: 'succession', label: 'Sucesión', icon: Shield, description: 'Planes de continuidad' },
          ]
        },
        {
          title: 'Formación & Crecimiento',
          icon: GraduationCap,
          color: 'text-violet-600',
          items: [
            { id: 'training', label: 'Formación', icon: GraduationCap, description: 'Planes formativos' },
            { id: 'marketplace', label: 'Marketplace', icon: Rocket, description: 'Movilidad interna' },
            { id: 'benefits', label: 'Beneficios', icon: Gift, description: 'Retribución flexible' },
          ]
        },
        {
          title: 'Analítica & Seguridad',
          icon: LineChart,
          color: 'text-rose-600',
          items: [
            { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Cuadros de mando' },
            { id: 'analytics-intelligence', label: 'Analytics IA', icon: Sparkles, description: 'Inteligencia predictiva' },
            { id: 'safety', label: 'PRL', icon: Shield, description: 'Prevención de riesgos', badge: stats.safetyAlerts, badgeVariant: 'destructive' },
          ]
        },
      ]
    },
    {
      id: 'enterprise',
      label: 'Enterprise',
      icon: Building2,
      columns: 3,
      width: 'w-[780px]',
      headerTitle: 'Suite Enterprise',
      headerDescription: 'Módulos avanzados de gestión empresarial',
      subGroups: [
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
      ]
    },
    {
      id: 'tools',
      label: 'Herramientas',
      icon: Wrench,
      columns: 2,
      width: 'w-[520px]',
      headerTitle: 'Herramientas & Utilidades',
      headerDescription: 'IA, normativa, integraciones y soporte',
      subGroups: [
        {
          title: 'Inteligencia Artificial',
          icon: Sparkles,
          color: 'text-violet-600',
          items: [
            { id: 'agent', label: 'Agente IA', icon: Brain, description: 'Asistente conversacional' },
            { id: 'news', label: 'Noticias', icon: Newspaper, description: 'Alertas y novedades' },
          ]
        },
        {
          title: 'Normativa & Legal',
          icon: BookOpen,
          color: 'text-emerald-600',
          items: [
            { id: 'knowledge', label: 'Normativa', icon: BookOpen, description: 'Base de conocimiento' },
            { id: 'legal-compliance', label: 'Cumplimiento Legal', icon: Shield, description: 'Estado de cumplimiento' },
          ]
        },
        {
          title: 'Sistema',
          icon: Wrench,
          color: 'text-muted-foreground',
          items: [
            { id: 'integration', label: 'Integración Módulos', icon: Link2, description: 'Conectores y APIs' },
            { id: 'demo-seed', label: 'Datos Demo', icon: Database, description: 'Carga de datos de prueba' },
            { id: 'help', label: 'Ayuda', icon: HelpCircle, description: 'Guías y documentación' },
          ]
        },
      ]
    },
    {
      id: 'utilities',
      label: 'Utilidades',
      icon: Zap,
      columns: 3,
      width: 'w-[780px]',
      headerTitle: 'Utilidades del Sistema',
      headerDescription: 'Centro de mando, inteligencia, administración y operaciones',
      subGroups: [
        {
          title: 'Centro de Mando',
          icon: Gauge,
          color: 'text-primary',
          items: [
            { id: 'util-premium-dash', label: 'Dashboard Premium', icon: Gauge, description: 'KPIs ejecutivos 8 módulos' },
            { id: 'util-orchestration', label: 'Orquestación', icon: Zap, description: 'Reglas reactivas inter-módulo' },
            { id: 'util-alerts', label: 'Alertas', icon: Search, description: 'Notificaciones críticas' },
            { id: 'util-feed', label: 'Actividad', icon: Clock, description: 'Timeline en tiempo real' },
          ]
        },
        {
          title: 'Inteligencia & Análisis',
          icon: Sparkles,
          color: 'text-violet-600',
          items: [
            { id: 'util-analytics-bi', label: 'Analytics BI', icon: LineChart, description: 'BI cross-module con IA' },
            { id: 'util-reporting', label: 'Reporting Engine', icon: FileText, description: 'Reportes ejecutivos avanzados' },
            { id: 'util-regulatory', label: 'Compliance Regulatorio', icon: Shield, description: 'Igualdad, GDPR, EU AI Act' },
            { id: 'util-board-pack', label: 'Board Pack', icon: Briefcase, description: 'Packs para comités' },
            { id: 'util-compliance', label: 'Cumplimiento Auto', icon: Shield, description: 'GDPR, LOPDGDD, Igualdad' },
            { id: 'util-health', label: 'Health Check', icon: Activity, description: 'Diagnóstico del sistema' },
          ]
        },
        {
          title: 'Administración',
          icon: Wrench,
          color: 'text-amber-600',
          items: [
            { id: 'util-api-webhooks', label: 'API & Webhooks', icon: Zap, description: 'Integración enterprise' },
            { id: 'util-integrations', label: 'Integraciones', icon: Globe, description: 'BI, DMS, Firma electrónica' },
            { id: 'util-settings', label: 'Configuración', icon: Wrench, description: 'Ajustes Premium' },
            { id: 'util-export', label: 'Exportar', icon: FileText, description: 'Exportación masiva' },
            { id: 'util-seed', label: 'Seed Data', icon: Database, description: 'Regenerar datos demo' },
            { id: 'util-help', label: 'Centro de Ayuda', icon: HelpCircle, description: 'Documentación y soporte' },
          ]
        },
      ]
    },
  ];

  // Collect all IDs per category for active detection
  const allIds: Record<string, string[]> = {};
  megaMenus.forEach(m => {
    allIds[m.id] = m.subGroups.flatMap(g => g.items.map(i => i.id));
  });

  const getActiveCategory = () => {
    for (const [catId, ids] of Object.entries(allIds)) {
      if (ids.includes(activeModule)) return catId;
    }
    return null;
  };

  const activeCategory = getActiveCategory();

  const renderMegaMenuItem = (item: MenuItem, onSelect: () => void) => {
    const ItemIcon = item.icon;
    const isItemActive = activeModule === item.id;
    return (
      <button
        key={item.id}
        onClick={onSelect}
        className={cn(
          "flex items-start gap-2.5 w-full px-2 py-2 rounded-lg text-left transition-all duration-150",
          "hover:bg-accent/80 group",
          isItemActive && "bg-primary/10 ring-1 ring-primary/20"
        )}
      >
        <div className={cn(
          "mt-0.5 p-1 rounded-md transition-colors shrink-0",
          isItemActive ? "bg-primary/15" : "bg-muted group-hover:bg-primary/10"
        )}>
          <ItemIcon className={cn(
            "h-3.5 w-3.5 transition-colors",
            isItemActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={cn(
              "text-[13px] leading-tight truncate",
              isItemActive ? "font-semibold text-primary" : "font-medium text-foreground"
            )}>
              {item.label}
            </p>
            {item.badge && Number(item.badge) > 0 && (
              <Badge variant={item.badgeVariant || 'secondary'} className="text-[10px] h-4 min-w-4 px-1 justify-center">
                {item.badge}
              </Badge>
            )}
          </div>
          {item.description && (
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
              {item.description}
            </p>
          )}
        </div>
      </button>
    );
  };

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

      {/* All mega-menus */}
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
                className={cn("h-9 px-3 text-sm gap-1.5", isOpen && "bg-accent text-accent-foreground")}
              >
                <MenuIcon className="h-4 w-4" />
                {menu.label}
                {menu.badge && menu.badge > 0 && (
                  <Badge variant="secondary" className="ml-0.5 text-xs h-5 min-w-5 justify-center">
                    {menu.badge}
                  </Badge>
                )}
                <ChevronDown className={cn("ml-0.5 h-3 w-3 transition-transform", isOpen && "rotate-180")} />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="center"
              side="bottom"
              sideOffset={6}
              className={cn(menu.width, "p-0 shadow-xl border-border/60")}
            >
              {/* Header */}
              <div className="px-5 py-3 border-b bg-muted/30 rounded-t-md">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <MenuIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{menu.headerTitle}</p>
                    <p className="text-xs text-muted-foreground">{menu.headerDescription}</p>
                  </div>
                </div>
              </div>

              {/* Grid */}
              <ScrollArea className="max-h-[480px]">
                <div className={cn("grid gap-0 p-2", menu.columns === 2 ? "grid-cols-2" : "grid-cols-3")}>
                  {menu.subGroups.map((group) => {
                    const GroupIcon = group.icon;
                    return (
                      <div key={group.title} className="p-2">
                        <div className="flex items-center gap-1.5 px-2 mb-1.5">
                          <GroupIcon className={cn("h-3.5 w-3.5", group.color)} />
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {group.title}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          {group.items.map((item) =>
                            renderMegaMenuItem(item, () => {
                              onModuleChange(item.id);
                              setOpenCategory(null);
                            })
                          )}
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
