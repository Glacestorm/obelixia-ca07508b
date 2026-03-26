/**
 * HRDemoJourneyPanel — Navegador del circuito demo maestro
 * Lista los 15 pasos del caso demo con enlaces, perfiles y estado.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  UserPlus, FileText, Send, Receipt, Heart, Plane,
  Calculator, Clock, BarChart3, Shield, Scale, UserMinus,
  CheckCircle, AlertTriangle, Play, ExternalLink, Map,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DemoJourneyStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  profile: string;
  moduleId: string;
  status: 'ready' | 'simulation' | 'partial' | 'needs-work';
  tables: string[];
  notes?: string;
}

const JOURNEY_STEPS: DemoJourneyStep[] = [
  {
    id: 1, title: 'Registro del empleado DEMO',
    description: 'Alta de Carlos Ruiz Martín en el sistema con ficha completa',
    icon: UserPlus, profile: 'Carlos Ruiz Martín',
    moduleId: 'employees', status: 'ready',
    tables: ['erp_hr_employees', 'erp_hr_employee_details'],
  },
  {
    id: 2, title: 'Contrato y expediente documental',
    description: 'Contrato indefinido con expediente documental vinculado',
    icon: FileText, profile: 'Carlos Ruiz Martín',
    moduleId: 'contracts', status: 'ready',
    tables: ['erp_hr_contracts', 'erp_hr_employee_documents'],
  },
  {
    id: 3, title: 'Comunicación incorporación a administraciones',
    description: 'Preparación TGSS/RED para alta y afiliación española',
    icon: Send, profile: 'Carlos Ruiz Martín',
    moduleId: 'es-official-submissions', status: 'simulation',
    tables: ['erp_hr_registration_data', 'erp_hr_dry_run_results'],
    notes: 'Dry-run preparatorio — envío real bloqueado por diseño',
  },
  {
    id: 4, title: 'Nómina con incidencias complejas',
    description: 'Horas extra + seguro médico + stock options + permiso no retribuido + IT accidente',
    icon: Receipt, profile: 'Carlos Ruiz / David Moreno / Elena Vidal / Javier López',
    moduleId: 'payroll', status: 'ready',
    tables: ['erp_hr_payroll_records', 'erp_hr_payroll_incidents', 'erp_hr_payroll_concepts'],
    notes: 'Múltiples perfiles cubren cada casuística',
  },
  {
    id: 5, title: 'Permiso por nacimiento',
    description: 'Solicitud y gestión de permiso paternal/maternal',
    icon: Heart, profile: 'Ana Belén Torres',
    moduleId: 'es-localization', status: 'ready',
    tables: ['erp_hr_leave_requests', 'erp_hr_leave_balances', 'erp_hr_payroll_incidents'],
    notes: 'Panel ESNacimientoINSSPanel — comunicación preparatoria INSS',
  },
  {
    id: 6, title: 'Desplazamiento temporal internacional',
    description: 'Asignación 6 meses a México — Sofía Martínez',
    icon: Plane, profile: 'Sofía Martínez Díaz',
    moduleId: 'global-mobility', status: 'ready',
    tables: ['erp_hr_mobility_assignments'],
  },
  {
    id: 7, title: 'Nómina de atrasos / correction run',
    description: 'Regularización IT no introducida en nómina mensual',
    icon: Calculator, profile: 'David Moreno Ortiz',
    moduleId: 'payroll-engine', status: 'simulation',
    tables: ['erp_hr_payroll_runs'],
    notes: 'El motor de payroll run soporta tipo "correction" con snapshot',
  },
  {
    id: 8, title: 'Reducción de jornada por guarda legal',
    description: 'Modificación contractual con impacto en nómina',
    icon: Clock, profile: 'Carmen Alonso Vega',
    moduleId: 'es-localization', status: 'ready',
    tables: ['erp_hr_contracts', 'erp_hr_payroll_incidents', 'erp_hr_employee_es_labor_data'],
    notes: 'Nuevo panel ESGuardaLegalPanel — Art. 37.6 ET',
  },
  {
    id: 9, title: 'Informe de costes y nómina',
    description: 'Reporting ejecutivo mensual con KPIs y tendencias',
    icon: BarChart3, profile: '(global)',
    moduleId: 'util-reporting', status: 'ready',
    tables: ['erp_hr_payroll_records'],
  },
  {
    id: 10, title: 'Envío de seguros sociales',
    description: 'Preparación interna FAN/TC2 — dry-run SILTRA',
    icon: Shield, profile: '(global)',
    moduleId: 'es-official-submissions', status: 'simulation',
    tables: ['erp_hr_dry_run_results', 'erp_hr_ss_contribution_records'],
    notes: 'Simulación preparatoria con evidence pack',
  },
  {
    id: 11, title: 'Registro horario del trabajador',
    description: 'Control de fichaje con datos de 20+ días por empleado',
    icon: Clock, profile: '(todos)',
    moduleId: 'time-clock', status: 'ready',
    tables: ['erp_hr_time_entries'],
  },
  {
    id: 12, title: 'Modelos 111 y 190',
    description: 'Generación preparatoria de modelos fiscales AEAT',
    icon: Scale, profile: '(global)',
    moduleId: 'es-official-submissions', status: 'simulation',
    tables: ['erp_hr_dry_run_results'],
    notes: 'Dry-run fiscal con validación estructural',
  },
  {
    id: 13, title: 'Liquidación por despido disciplinario',
    description: 'Cálculo de finiquito con indemnización = 0',
    icon: UserMinus, profile: 'Roberto Díaz Campos',
    moduleId: 'settlements', status: 'ready',
    tables: ['erp_hr_settlements'],
  },
  {
    id: 14, title: 'Liquidación por despido objetivo',
    description: 'Cálculo con 20 días/año de indemnización',
    icon: UserMinus, profile: 'Isabel Muñoz Pérez',
    moduleId: 'settlements', status: 'ready',
    tables: ['erp_hr_settlements'],
  },
  {
    id: 15, title: 'Comunicación de salida a la administración',
    description: 'Preparación de baja TGSS + comunicación SEPE',
    icon: Send, profile: 'Roberto Díaz / Isabel Muñoz',
    moduleId: 'es-official-submissions', status: 'simulation',
    tables: ['erp_hr_registration_data', 'erp_hr_dry_run_results'],
    notes: 'Flujo preparatorio de baja — envío real bloqueado',
  },
];

const STATUS_CONFIG = {
  ready: { label: 'Listo', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10', icon: CheckCircle },
  simulation: { label: 'Simulación', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', icon: Play },
  partial: { label: 'Parcial', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', icon: AlertTriangle },
  'needs-work': { label: 'Pendiente', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', icon: AlertTriangle },
};

interface HRDemoJourneyPanelProps {
  companyId?: string;
  onNavigate?: (moduleId: string) => void;
}

export function HRDemoJourneyPanel({ onNavigate }: HRDemoJourneyPanelProps) {
  const readyCount = JOURNEY_STEPS.filter(s => s.status === 'ready').length;
  const simCount = JOURNEY_STEPS.filter(s => s.status === 'simulation').length;
  const coverage = Math.round(((readyCount + simCount) / JOURNEY_STEPS.length) * 100);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Map className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Circuito Demo Maestro</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  15 pasos · 12 perfiles · Caso comercial completo
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{coverage}%</p>
              <p className="text-[10px] text-muted-foreground">cobertura</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Progress value={coverage} className="h-2" />
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              {readyCount} listos
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              {simCount} simulación
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              {JOURNEY_STEPS.length - readyCount - simCount} pendientes
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <ScrollArea className="h-[calc(100vh-380px)]">
        <div className="space-y-2 pr-2">
          {JOURNEY_STEPS.map((step) => {
            const statusCfg = STATUS_CONFIG[step.status];
            const StatusIcon = statusCfg.icon;

            return (
              <Card
                key={step.id}
                className={cn(
                  'transition-all hover:shadow-md cursor-pointer group',
                  'border-l-4',
                  step.status === 'ready' && 'border-l-green-500',
                  step.status === 'simulation' && 'border-l-blue-500',
                  step.status === 'partial' && 'border-l-amber-500',
                  step.status === 'needs-work' && 'border-l-red-500',
                )}
                onClick={() => onNavigate?.(step.moduleId)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Number */}
                    <div className={cn(
                      'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0',
                      statusCfg.bg, statusCfg.color,
                    )}>
                      {step.id}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <step.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <h4 className="text-sm font-semibold truncate">{step.title}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {step.profile}
                        </Badge>
                        <Badge className={cn('text-[10px] px-1.5 py-0', statusCfg.bg, statusCfg.color)}>
                          <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                          {statusCfg.label}
                        </Badge>
                      </div>
                      {step.notes && (
                        <p className="text-[10px] text-muted-foreground/70 mt-1 italic">{step.notes}</p>
                      )}
                    </div>

                    {/* Action */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); onNavigate?.(step.moduleId); }}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export default HRDemoJourneyPanel;
