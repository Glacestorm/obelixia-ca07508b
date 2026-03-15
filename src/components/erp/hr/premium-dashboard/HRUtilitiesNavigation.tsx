/**
 * HRUtilitiesNavigation — In-module utility navigation for HRModule
 * Displays category grid when no utility is active, breadcrumbs when one is selected
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Activity, ArrowRightLeft, Bell, Clock, Settings, FileText,
  Brain, HeartPulse, Download, Database, HelpCircle,
  Wrench, ChevronLeft, Sparkles, Shield, BarChart3, ExternalLink,
  Briefcase, Zap, Gauge, Map
} from 'lucide-react';

export type UtilitySection =
  | 'util-premium-dash' | 'util-orchestration'
  | 'util-alerts' | 'util-feed'
  | 'util-settings'
  | 'util-audit' | 'util-ai-hybrid'
  | 'util-health' | 'util-export'
  | 'util-seed' | 'util-help'
  | 'util-compliance'
  | 'util-analytics-bi'
  | 'util-reporting'
  | 'util-regulatory'
  | 'util-api-webhooks'
  | 'util-integrations'
  | 'util-board-pack'
  | 'util-demo-journey'
  | 'util-pilot-checklist'
  | 'util-payroll-reconciliation';

interface UtilityItem {
  id: UtilitySection;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface UtilityCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  items: UtilityItem[];
}

const CATEGORIES: UtilityCategory[] = [
  {
    id: 'command',
    label: 'Centro de Mando',
    icon: <Sparkles className="h-5 w-5" />,
    color: 'from-primary/15 to-primary/5 border-primary/20',
    items: [
      { id: 'util-premium-dash', label: 'Dashboard Premium', description: 'Vista ejecutiva con KPIs de los 8 módulos', icon: <Activity className="h-4 w-4" /> },
      { id: 'util-orchestration', label: 'Orquestación', description: 'Reglas reactivas inter-módulo', icon: <ArrowRightLeft className="h-4 w-4" /> },
      { id: 'util-alerts', label: 'Alertas', description: 'Centro de alertas y notificaciones críticas', icon: <Bell className="h-4 w-4" /> },
      { id: 'util-feed', label: 'Actividad', description: 'Timeline de actividad en tiempo real', icon: <Clock className="h-4 w-4" /> },
    ],
  },
  {
    id: 'intelligence',
    label: 'Inteligencia & Análisis',
    icon: <Brain className="h-5 w-5" />,
    color: 'from-violet-500/15 to-violet-500/5 border-violet-500/20',
    items: [
      { id: 'util-analytics-bi', label: 'Analytics BI', description: 'Dashboard ejecutivo cross-module con IA predictiva', icon: <BarChart3 className="h-4 w-4" /> },
      { id: 'util-reporting', label: 'Reporting Engine', description: 'Reportes ejecutivos avanzados con datos reales', icon: <FileText className="h-4 w-4" /> },
      { id: 'util-regulatory', label: 'Compliance Regulatorio', description: 'Informes regulatorios: Igualdad, GDPR, EU AI Act, Auditoría', icon: <Shield className="h-4 w-4" /> },
      { id: 'util-board-pack', label: 'Board Pack / Comité', description: 'Packs ejecutivos consolidados para consejos y comités', icon: <Briefcase className="h-4 w-4" /> },
      { id: 'util-ai-hybrid', label: 'IA Híbrida', description: 'Dashboard unificado de inteligencia artificial', icon: <Brain className="h-4 w-4" /> },
      { id: 'util-compliance', label: 'Cumplimiento', description: 'Motor automatizado: GDPR, LOPDGDD, Igualdad, EU AI Act', icon: <Shield className="h-4 w-4" /> },
      { id: 'util-audit', label: 'Auditorías', description: 'Generador de informes de auditoría', icon: <FileText className="h-4 w-4" /> },
      { id: 'util-health', label: 'Health Check', description: 'Diagnóstico de salud del sistema', icon: <HeartPulse className="h-4 w-4" /> },
    ],
  },
  {
    id: 'admin',
    label: 'Administración',
    icon: <Settings className="h-5 w-5" />,
    color: 'from-amber-500/15 to-amber-500/5 border-amber-500/20',
    items: [
      { id: 'util-api-webhooks', label: 'API & Webhooks', description: 'Integración enterprise: API, webhooks y eventos', icon: <Zap className="h-4 w-4" /> },
      { id: 'util-integrations', label: 'Integraciones Enterprise', description: 'BI Export, DMS Documental, Firma Electrónica', icon: <ExternalLink className="h-4 w-4" /> },
      { id: 'util-settings', label: 'Configuración', description: 'Ajustes de módulos Premium', icon: <Settings className="h-4 w-4" /> },
      { id: 'util-export', label: 'Exportar', description: 'Exportación masiva de datos y reportes', icon: <Download className="h-4 w-4" /> },
      { id: 'util-seed', label: 'Seed Data', description: 'Regenerar datos demo Premium', icon: <Database className="h-4 w-4" /> },
      { id: 'util-demo-journey', label: 'Circuito Demo', description: 'Navegador del caso demo maestro (15 pasos)', icon: <Map className="h-4 w-4" /> },
      { id: 'util-help', label: 'Centro de Ayuda', description: 'Documentación y soporte', icon: <HelpCircle className="h-4 w-4" /> },
    ],
  },
];

interface Props {
  activeSection: UtilitySection | null;
  onSectionChange: (section: UtilitySection | null) => void;
  className?: string;
}

export function HRUtilitiesNavigation({ activeSection, onSectionChange, className }: Props) {
  if (activeSection) {
    const allItems = CATEGORIES.flatMap(c => c.items);
    const current = allItems.find(i => i.id === activeSection);
    const category = CATEGORIES.find(c => c.items.some(i => i.id === activeSection));

    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSectionChange(null)}
            className="gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Utilidades
          </Button>
          {category && (
            <>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-xs text-muted-foreground">{category.label}</span>
            </>
          )}
          <span className="text-muted-foreground/40">/</span>
          <div className="flex items-center gap-1.5">
            {current?.icon}
            <span className="text-sm font-medium">{current?.label}</span>
          </div>

          <div className="ml-auto flex items-center gap-1 overflow-x-auto">
            {category?.items.filter(i => i.id !== activeSection).map(item => (
              <Button
                key={item.id}
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs gap-1 shrink-0"
                onClick={() => onSectionChange(item.id)}
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex items-center gap-2">
        <Gauge className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Utilidades del Sistema</h2>
        <Badge variant="secondary" className="ml-2 text-[10px]">
          {CATEGORIES.reduce((a, c) => a + c.items.length, 0)} herramientas
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CATEGORIES.map(cat => (
          <Card
            key={cat.id}
            className={cn(
              "border bg-gradient-to-br transition-all duration-200 hover:shadow-md",
              cat.color
            )}
          >
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-background/80 shadow-sm">
                  {cat.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{cat.label}</h3>
                  <span className="text-[10px] text-muted-foreground">{cat.items.length} herramientas</span>
                </div>
              </div>

              <div className="space-y-1">
                {cat.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => onSectionChange(item.id)}
                    className={cn(
                      "w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-all",
                      "hover:bg-background/80 hover:shadow-sm group"
                    )}
                  >
                    <div className="mt-0.5 text-muted-foreground group-hover:text-primary transition-colors">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium block group-hover:text-primary transition-colors">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-tight block">
                        {item.description}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default HRUtilitiesNavigation;
