/**
 * HRNavigationMenu - Navegación agrupada del módulo RRHH
 * Mega-menu multi-columna con sub-grupos lógicos y diseño enterprise
 * 
 * Estructura validada pre-V2-ES.8:
 *   Dashboard | People | Payroll | Workforce | Global
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  TrendingUp, Users, UserPlus, UserMinus, Award, DollarSign, Landmark, Calendar,
  FileText, UserCog, Building2, Gift, Shield, GraduationCap, BarChart3,
  Brain, HelpCircle, Rocket, ChevronDown,
  Calculator, Link2, Database, MapPin, Network, Lock, ClipboardList, GitBranch,
  Inbox, Timer, Coins, Heart, Leaf, Bot, Layers, ShieldAlert, Target, Scale, Gavel,
  Zap, Gauge, Globe, Cpu, Briefcase, Clock, FileCheck, UserCheck, LineChart,
  Sparkles, Wrench, Search, Activity, Flag, Send, AlertTriangle, Plane, CreditCard,
  Wifi, Home
} from 'lucide-react';

// ─── Types ───

interface HRNavigationMenuProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
  mvpMode?: boolean;
  isAdmin?: boolean;
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
  headerAccent: string;
  footerHint?: string;
}

// ─── Component ───

export function HRNavigationMenu({ activeModule, onModuleChange, stats, mvpMode = true, isAdmin = false }: HRNavigationMenuProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  // ── 3-tier visibility: visible_mvp | visible_advanced | hidden ──
  // Admin users see ALL mega-menus (talent, enterprise, utilities unlocked)
  const mvpCategories = new Set(
    isAdmin
      ? ['core-hr', 'payroll', 'laboral', 'global', 'talent', 'enterprise', 'utilities']
      : ['core-hr', 'payroll', 'laboral', 'global']
  );

  // Tier 1: visible_mvp — shown to all users
  const mvpItems = new Set([
    // People
    'employees', 'contracts', 'document-expedient', 'bank-accounts',
    'departments', 'work-centers', 'legal-entities',
    'work-calendars',
    // Payroll
    'preflight', 'payroll', 'payroll-engine', 'irpf-motor', 'symbolic-values', 'garnishment-simulator',
    'ss', 'integration', 'compensation-suite',
    // Workforce
    'vacations', 'time-clock', 'leave-incidents',
    'admin-requests', 'hr-tasks', 'approval-inbox',
    // Global
    'country-registry', 'es-localization',
    'mobility-international', 'stock-options',
    'official-submissions', 'compliance-evidence',
    // S9 Compliance
    's9-lismi', 's9-salary-register', 's9-disconnection', 's9-remote-work',
  ]);

  // Tier 2: visible_advanced — shown only to admin/advanced profiles in MVP mode
  const advancedItems = new Set([
    // People > Organización & Configuración
    'org-structure',        // Organigrama — mature, enterprise value
    'enterprise-roles',     // Roles y Permisos — admin-only by nature
    'unions',               // Sindicatos — specialized, not mainstream
    // Payroll > Nómina Mensual
    'payroll-recalc',       // Recálculo — admin operation
    'settlements',          // Finiquitos — specialized HR operation
    'payroll-periods',      // Períodos — direct access for power users
    // Payroll > Compensación & ERP
    'benefits',             // Beneficios — retribución flexible
    // Workforce > Gestión Operativa
    'safety',               // PRL — regulatory, admin responsibility
    'regulatory-watch',     // Vigilancia Normativa — compliance, admin
  ]);

  // Tier 3: admin-unlocked categories — all items within these categories are visible to admin
  const adminUnlockedCategories = new Set(['talent', 'enterprise', 'utilities']);

  // Effective visible items based on role
  const effectiveItems = new Set([
    ...mvpItems,
    ...(isAdmin ? advancedItems : []),
  ]);

  // ── Menu definitions ──
  const megaMenus: MegaMenuCategory[] = [
    // ━━━ PEOPLE ━━━
    {
      id: 'core-hr',
      label: 'People',
      icon: Users,
      columns: 3,
      width: 'w-[740px]',
      headerTitle: 'People & Organization',
      headerDescription: 'Directorio, contratos, estructura y documentación',
      headerAccent: 'from-blue-500/20 via-sky-500/10 to-transparent',
      subGroups: [
        {
          title: 'Directorio & Relación Laboral',
          icon: Users,
          color: 'text-blue-500',
          items: [
            { id: 'employees', label: 'Empleados', icon: Users, description: 'Directorio y expedientes' },
            { id: 'contracts', label: 'Contratos', icon: FileText, description: 'Gestión contractual' },
            { id: 'document-expedient', label: 'Expediente Documental', icon: FileCheck, description: 'Documentos, evidencias y compliance' },
            { id: 'bank-accounts', label: 'Cuentas Bancarias', icon: CreditCard, description: 'Multi-IBAN y SWIFT/BIC' },
          ]
        },
        {
          title: 'Organización',
          icon: Building2,
          color: 'text-emerald-500',
          items: [
            { id: 'departments', label: 'Departamentos', icon: Building2, description: 'Estructura organizativa' },
            { id: 'work-centers', label: 'Centros de Trabajo', icon: MapPin, description: 'Ubicaciones físicas' },
            { id: 'legal-entities', label: 'Entidades Legales', icon: Building2, description: 'Sociedades y filiales' },
            { id: 'org-structure', label: 'Organigrama', icon: Network, description: 'Estructura jerárquica' },
          ]
        },
        {
          title: 'Configuración',
          icon: Calendar,
          color: 'text-amber-500',
          items: [
            { id: 'work-calendars', label: 'Calendarios Laborales', icon: Calendar, description: 'Festivos y jornadas' },
            { id: 'enterprise-roles', label: 'Roles y Permisos', icon: Lock, description: 'Control de acceso' },
            { id: 'unions', label: 'Sindicatos', icon: UserCog, description: 'Relaciones laborales' },
          ]
        },
      ]
    },

    // ━━━ PAYROLL ━━━
    {
      id: 'payroll',
      label: 'Payroll',
      icon: DollarSign,
      badge: stats.pendingPayrolls,
      columns: 2,
      width: 'w-[560px]',
      headerTitle: 'Payroll & Compensation',
      headerDescription: 'Nóminas, cotizaciones, fiscalidad y retribución',
      headerAccent: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      footerHint: 'Motor de Nómina centraliza períodos, runs, conceptos e incidencias',
      subGroups: [
        {
          title: 'Nómina Mensual',
          icon: DollarSign,
          color: 'text-emerald-500',
          items: [
            { id: 'preflight', label: 'Preflight Nómina', icon: Gauge, description: 'Cockpit operativo del ciclo completo' },
            { id: 'payroll', label: 'Nóminas', icon: DollarSign, description: 'Procesamiento mensual', badge: stats.pendingPayrolls, badgeVariant: 'secondary' },
            { id: 'payroll-engine', label: 'Motor de Nómina', icon: Calculator, description: 'Períodos · Runs · Conceptos' },
            { id: 'irpf-motor', label: 'Motor IRPF', icon: Calculator, description: 'Mod. 111/190 · Certificados' },
            { id: 'symbolic-values', label: 'Valores Simbólicos', icon: Database, description: 'Editor por empleado' },
            { id: 'ss', label: 'Seguridad Social', icon: Landmark, description: 'Cotizaciones y expediente SS' },
            { id: 'payroll-recalc', label: 'Recálculo', icon: Calculator, description: 'Ajustes retroactivos' },
            { id: 'settlements', label: 'Finiquitos', icon: FileCheck, description: 'Liquidaciones y ceses' },
            { id: 'garnishment-simulator', label: 'Embargos Art. 607', icon: Scale, description: 'Simulador Art. 607-608 LEC' },
            { id: 'payroll-periods', label: 'Períodos', icon: Calendar, description: 'Acceso directo al ciclo mensual' },
          ]
        },
        {
          title: 'Compensación & ERP',
          icon: Link2,
          color: 'text-blue-500',
          items: [
            { id: 'integration', label: 'Integración ERP', icon: Link2, description: 'Contabilidad, Tesorería, SS y Fiscal' },
            { id: 'compensation-suite', label: 'Compensación', icon: Coins, description: 'Retribución total' },
            { id: 'benefits', label: 'Beneficios', icon: Gift, description: 'Retribución flexible' },
          ]
        },
      ]
    },

    // ━━━ WORKFORCE ━━━
    {
      id: 'laboral',
      label: 'Workforce',
      icon: Briefcase,
      badge: stats.pendingVacations,
      columns: 2,
      width: 'w-[560px]',
      headerTitle: 'Workforce Management',
      headerDescription: 'Tiempo, ausencias, solicitudes y operativa diaria',
      headerAccent: 'from-amber-500/20 via-orange-500/10 to-transparent',
      subGroups: [
        {
          title: 'Tiempo & Ausencias',
          icon: Clock,
          color: 'text-amber-500',
          items: [
            { id: 'vacations', label: 'Vacaciones', icon: Calendar, description: 'Solicitudes y saldos', badge: stats.pendingVacations, badgeVariant: 'secondary' },
            { id: 'time-clock', label: 'Control Horario', icon: Clock, description: 'Registro de jornada' },
            { id: 'leave-incidents', label: 'Incidencias', icon: AlertTriangle, description: 'IT, maternidad, permisos' },
            { id: 's9-disconnection', label: 'Desconexión Digital', icon: Wifi, description: 'Protocolo Art. 88 LOPDGDD' },
            { id: 's9-remote-work', label: 'Teletrabajo', icon: Home, description: 'Acuerdos Ley 10/2021' },
          ]
        },
        {
          title: 'Gestión Operativa',
          icon: ClipboardList,
          color: 'text-violet-500',
          items: [
            { id: 'admin-requests', label: 'Solicitudes', icon: Briefcase, description: 'Certificados, cambios de datos' },
            { id: 'hr-tasks', label: 'Tareas RRHH', icon: ClipboardList, description: 'Tareas asignables' },
            { id: 'approval-inbox', label: 'Aprobaciones', icon: Inbox, description: 'Bandeja de aprobaciones' },
            { id: 'regulatory-watch', label: 'Vigilancia Normativa', icon: Shield, description: 'Alertas legales' },
            { id: 'safety', label: 'PRL', icon: Shield, description: 'Prevención de riesgos', badge: stats.safetyAlerts, badgeVariant: 'destructive' },
          ]
        },
      ]
    },

    // ━━━ GLOBAL ━━━
    {
      id: 'global',
      label: 'Global',
      icon: Globe,
      columns: 3,
      width: 'w-[740px]',
      headerTitle: 'Global HR Platform',
      headerDescription: 'Multi-país, movilidad internacional y compliance',
      headerAccent: 'from-indigo-500/20 via-violet-500/10 to-transparent',
      subGroups: [
        {
          title: 'Localización',
          icon: Flag,
          color: 'text-blue-500',
          items: [
            { id: 'country-registry', label: 'Country Registry', icon: Globe, description: 'Países y políticas' },
            { id: 'es-localization', label: '🇪🇸 España', icon: Flag, description: 'IRPF, SS, contratos y permisos' },
          ]
        },
        {
          title: 'Movilidad & Equity',
          icon: Plane,
          color: 'text-emerald-500',
          items: [
            { id: 'mobility-international', label: 'Movilidad Internacional', icon: Plane, description: 'Asignaciones y KPIs globales' },
            { id: 'stock-options', label: 'Stock Options / Equity', icon: TrendingUp, description: 'Planes de equity, vesting y simulador fiscal' },
          ]
        },
        {
          title: 'Oficial & Compliance',
          icon: Send,
          color: 'text-indigo-500',
          items: [
            { id: 'official-submissions', label: 'Envíos Oficiales', icon: Send, description: 'SILTRA, Contrat@, AEAT' },
            { id: 'compliance-evidence', label: 'Evidencias', icon: Shield, description: 'Cumplimiento documental' },
            { id: 's9-lismi', label: 'LISMI / LGD', icon: Users, description: 'Cuota discapacidad 2%' },
            { id: 's9-salary-register', label: 'Registro Retributivo', icon: Scale, description: 'RD 902/2020' },
          ]
        },
      ]
    },

    // ━━━ TALENT (admin/advanced only) ━━━
    {
      id: 'talent',
      label: 'Talent',
      icon: Award,
      columns: 3,
      width: 'w-[740px]',
      headerTitle: 'Talent Management',
      headerDescription: 'Ciclo de vida, formación, desempeño y analítica',
      headerAccent: 'from-amber-500/20 via-yellow-500/10 to-transparent',
      subGroups: [
        {
          title: 'Ciclo de Vida',
          icon: UserCheck,
          color: 'text-blue-500',
          items: [
            { id: 'recruitment', label: 'Reclutamiento', icon: UserPlus, description: 'Ofertas y candidatos' },
            { id: 'onboarding', label: 'Onboarding', icon: UserPlus, description: 'Plan de acogida' },
            { id: 'offboarding', label: 'Offboarding', icon: UserMinus, description: 'Proceso de salida' },
          ]
        },
        {
          title: 'Rendimiento',
          icon: Award,
          color: 'text-amber-500',
          items: [
            { id: 'performance', label: 'Desempeño', icon: Award, description: 'Evaluaciones y OKRs' },
            { id: 'skills-matrix', label: 'Competencias', icon: Brain, description: 'Matriz de skills' },
            { id: 'succession', label: 'Sucesión', icon: Shield, description: 'Planes de continuidad' },
            { id: 'talent-intelligence', label: 'Talent Intelligence', icon: Brain, description: 'IA para talento' },
          ]
        },
        {
          title: 'Formación & Crecimiento',
          icon: GraduationCap,
          color: 'text-violet-500',
          items: [
            { id: 'training', label: 'Formación', icon: GraduationCap, description: 'Planes formativos' },
            { id: 'marketplace', label: 'Marketplace', icon: Rocket, description: 'Movilidad interna' },
            { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Cuadros de mando' },
            { id: 'analytics-intelligence', label: 'Analytics IA', icon: Sparkles, description: 'Inteligencia predictiva' },
          ]
        },
      ]
    },

    // ━━━ ENTERPRISE (admin/advanced only) ━━━
    {
      id: 'enterprise',
      label: 'Enterprise',
      icon: Building2,
      columns: 3,
      width: 'w-[780px]',
      headerTitle: 'Suite Enterprise',
      headerDescription: 'Módulos avanzados de gestión empresarial',
      headerAccent: 'from-violet-500/20 via-purple-500/10 to-transparent',
      subGroups: [
        {
          title: 'Centro de Mando',
          icon: Gauge,
          color: 'text-primary',
          items: [
            { id: 'enterprise-dashboard', label: 'Command Center', icon: TrendingUp, description: 'Panel ejecutivo centralizado' },
            { id: 'control-tower', label: 'Control Tower', icon: Gauge, description: 'Torre de control laboral multiempresa' },
            { id: 'labor-copilot', label: 'Copiloto Laboral', icon: Bot, description: 'Asistente IA contextual operativo', badge: 'IA', badgeVariant: 'secondary' as const },
            { id: 'advisory-portfolio', label: 'Cartera Asesoría', icon: Briefcase, description: 'Gestión multiempresa y cartera de clientes' },
            { id: 'sla-dashboard', label: 'SLA Dashboard', icon: Timer, description: 'Acuerdos de nivel de servicio' },
            { id: 'approval-inbox', label: 'Aprobaciones', icon: Inbox, description: 'Bandeja de aprobaciones' },
          ]
        },
        {
          title: 'Gobernanza & Compliance',
          icon: Lock,
          color: 'text-amber-500',
          items: [
            { id: 'workflow-designer', label: 'Workflows', icon: GitBranch, description: 'Diseño de flujos' },
            { id: 'audit-trail', label: 'Auditoría', icon: ClipboardList, description: 'Trazabilidad completa' },
            { id: 'compliance-enterprise', label: 'Compliance', icon: Shield, description: 'Cumplimiento normativo' },
            { id: 'fairness-engine', label: 'Fairness & Justice', icon: Scale, description: 'Equidad organizativa' },
          ]
        },
        {
          title: 'Personas & Bienestar',
          icon: Heart,
          color: 'text-rose-500',
          items: [
            { id: 'wellbeing-enterprise', label: 'Wellbeing', icon: Heart, description: 'Bienestar laboral' },
            { id: 'role-experience', label: 'Role Experience', icon: UserCog, description: 'UX por rol' },
            { id: 'esg-selfservice', label: 'ESG & Self-Service', icon: Leaf, description: 'Sostenibilidad social' },
          ]
        },
        {
          title: 'Legal & Sectorial',
          icon: Gavel,
          color: 'text-emerald-500',
          items: [
            { id: 'legal-engine', label: 'Legal Engine', icon: Gavel, description: 'Motor documental legal' },
            { id: 'cnae-intelligence', label: 'CNAE Intelligence', icon: Globe, description: 'Inteligencia sectorial' },
          ]
        },
        {
          title: 'Tecnología & IA',
          icon: Cpu,
          color: 'text-violet-500',
          items: [
            { id: 'ai-governance', label: 'AI Governance', icon: Brain, description: 'Gobernanza de IA' },
            { id: 'governance-cockpit', label: 'Supervisor Nómina', icon: Shield, description: 'Gobernanza completa + HITL' },
            { id: 'predictive-audit', label: 'Auditoría Predictiva', icon: TrendingUp, description: 'IA predictiva + validación cruzada' },
            { id: 'security-governance', label: 'Security & SoD', icon: ShieldAlert, description: 'Seguridad avanzada' },
            { id: 'labor-digital-twin', label: 'Gemelo Digital Laboral', icon: Layers, description: 'Simulación what-if sobre datos reales', badge: 'NUEVO' as any, badgeVariant: 'secondary' as const },
            { id: 'digital-twin', label: 'Digital Twin (Legacy)', icon: Layers, description: 'Gemelo digital org.' },
            { id: 'copilot-twin', label: 'Copilot + Twin', icon: Bot, description: 'Asistente IA autónomo' },
            { id: 'workforce-planning', label: 'Workforce Planning', icon: Target, description: 'Planificación estratégica' },
          ]
        },
      ]
    },

    // ━━━ UTILITIES (admin/advanced only) ━━━
    {
      id: 'utilities',
      label: 'Utilidades',
      icon: Zap,
      columns: 3,
      width: 'w-[780px]',
      headerTitle: 'Utilidades del Sistema',
      headerDescription: 'Centro de mando, inteligencia, administración y operaciones',
      headerAccent: 'from-cyan-500/20 via-sky-500/10 to-transparent',
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
          color: 'text-violet-500',
          items: [
            { id: 'util-analytics-bi', label: 'Analytics BI', icon: LineChart, description: 'BI cross-module con IA' },
            { id: 'people-analytics', label: 'People Analytics', icon: BarChart3, description: 'Analytics unificado + Copiloto IA' },
            { id: 'util-reporting', label: 'Reporting Engine', icon: FileText, description: 'Reportes ejecutivos' },
            { id: 'util-regulatory', label: 'Compliance Regulatorio', icon: Shield, description: 'Igualdad, GDPR, EU AI Act' },
            { id: 'util-board-pack', label: 'Board Pack', icon: Briefcase, description: 'Packs para comités' },
            { id: 'util-compliance', label: 'Cumplimiento Auto', icon: Shield, description: 'GDPR, LOPDGDD, Igualdad' },
            { id: 'util-health', label: 'Health Check', icon: Activity, description: 'Diagnóstico del sistema' },
          ]
        },
        {
          title: 'Administración',
          icon: Wrench,
          color: 'text-amber-500',
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

  // ── Filter for MVP mode ──
  const filteredMenus = mvpMode
    ? megaMenus
        .filter(m => mvpCategories.has(m.id))
        .map(m => {
          // For admin-unlocked categories, show ALL items without filtering
          if (isAdmin && adminUnlockedCategories.has(m.id)) return m;
          return {
            ...m,
            subGroups: m.subGroups
              .map(sg => ({ ...sg, items: sg.items.filter(i => effectiveItems.has(i.id)) }))
              .filter(sg => sg.items.length > 0),
          };
        })
    : megaMenus;

  // Collect all IDs per category for active detection
  const allIds: Record<string, string[]> = {};
  filteredMenus.forEach(m => {
    allIds[m.id] = m.subGroups.flatMap(g => g.items.map(i => i.id));
  });

  const getActiveCategory = () => {
    if (activeModule === 'util-grid') return 'utilities';
    // Support legacy mobility IDs mapping to unified entry
    const effectiveModule = (activeModule === 'mobility-assignments' || activeModule === 'mobility-dashboard')
      ? 'mobility-international'
      : activeModule;
    for (const [catId, ids] of Object.entries(allIds)) {
      if (ids.includes(effectiveModule) || ids.includes(activeModule)) return catId;
    }
    return null;
  };

  const activeCategory = getActiveCategory();

  // ─── Render helpers ───

  const renderMegaMenuItem = (item: MenuItem, onSelect: () => void) => {
    const ItemIcon = item.icon;
    const isItemActive = activeModule === item.id
      || (item.id === 'mobility-international' && (activeModule === 'mobility-assignments' || activeModule === 'mobility-dashboard'));

    return (
      <button
        key={item.id}
        onClick={onSelect}
        className={cn(
          "flex items-start gap-2.5 w-full px-2.5 py-2 rounded-xl text-left transition-all duration-200",
          "hover:bg-accent/60 group",
          isItemActive && "bg-primary/8 shadow-sm shadow-primary/5 ring-1 ring-primary/15"
        )}
      >
        <div className={cn(
          "mt-0.5 p-1.5 rounded-lg transition-colors shrink-0",
          isItemActive
            ? "bg-primary/12 shadow-sm"
            : "bg-muted/80 group-hover:bg-primary/8"
        )}>
          <ItemIcon className={cn(
            "h-3.5 w-3.5 transition-colors",
            isItemActive ? "text-primary" : "text-muted-foreground group-hover:text-primary/80"
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
            {item.badge !== undefined && item.badge !== null && (typeof item.badge === 'string' ? item.badge.length > 0 : Number(item.badge) > 0) && (
              <Badge
                variant={item.badgeVariant || 'secondary'}
                className={cn(
                  "text-[9px] h-[18px] min-w-[18px] px-1.5 justify-center font-semibold tracking-wide",
                  item.badgeVariant === 'destructive' && "animate-pulse"
                )}
              >
                {item.badge}
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
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Dashboard */}
      <Button
        variant={activeModule === 'dashboard' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModuleChange('dashboard')}
        className={cn(
          "gap-1.5 h-9 rounded-lg font-medium",
          activeModule === 'dashboard' && "shadow-sm"
        )}
      >
        <TrendingUp className="h-4 w-4" />
        Dashboard
      </Button>

      {/* All mega-menus */}
      {filteredMenus.map((menu) => {
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
              {/* Header with domain-colored accent */}
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
                  {menu.id === 'utilities' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 gap-1 rounded-lg"
                      onClick={() => {
                        onModuleChange('util-grid');
                        setOpenCategory(null);
                      }}
                    >
                      Ver todas
                    </Button>
                  )}
                </div>
              </div>

              {/* Grid */}
              <ScrollArea className="max-h-[460px]">
                <div className={cn(
                  "grid p-3 gap-px",
                  menu.columns === 2 ? "grid-cols-2" : "grid-cols-3"
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

              {/* Optional footer hint */}
              {menu.footerHint && (
                <div className="px-5 py-2 border-t border-border/30 bg-muted/20">
                  <p className="text-[10px] text-muted-foreground/60 text-center italic">
                    {menu.footerHint}
                  </p>
                </div>
              )}
            </PopoverContent>
          </Popover>
        );
      })}

      {/* 2026+ — hidden in MVP mode */}
      {!mvpMode && (
        <Button
          variant={activeModule === 'trends' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onModuleChange('trends')}
          className="gap-1.5 h-9 rounded-lg"
        >
          <Rocket className="h-4 w-4" />
          2026+
        </Button>
      )}
    </div>
  );
}

export default HRNavigationMenu;
