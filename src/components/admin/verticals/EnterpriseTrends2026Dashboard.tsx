/**
 * EnterpriseTrends2026Dashboard - Dashboard de Tendencias Disruptivas 2026
 * 
 * 8 Mejoras Enterprise identificadas:
 * 1. Agentes IA Autónomos por Vertical
 * 2. Digital Twins por Industria
 * 3. Self-Healing Workflows
 * 4. Marketplace de Agentes Verticales
 * 5. Vertical LLMs Fine-tuned
 * 6. Multi-Agent Orchestration
 * 7. Predictive Industry Analytics
 * 8. Compliance Autonomous Engine
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, 
  Cpu, 
  Wrench, 
  Store, 
  Brain, 
  Network, 
  BarChart3, 
  Shield,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Settings,
  Zap,
  Activity,
  Layers,
  Target,
  Globe,
  ArrowUpRight,
  Play,
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Tipos para los módulos de tendencias
type TrendStatus = 'implemented' | 'partial' | 'planned';

interface EnterpriseTrend {
  id: string;
  number: number;
  name: string;
  shortName: string;
  description: string;
  impact: 'Revolucionario' | 'Transformador' | 'Operacional' | 'Monetización' | 'Precisión' | 'Automatización' | 'Preventivo' | 'Regulatorio';
  trend2026: string;
  icon: React.ComponentType<{ className?: string }>;
  status: TrendStatus;
  progress: number;
  features: string[];
  integrations: string[];
}

const ENTERPRISE_TRENDS: EnterpriseTrend[] = [
  {
    id: 'autonomous-agents',
    number: 1,
    name: 'Agentes IA Autónomos por Vertical',
    shortName: 'Agentes Autónomos',
    description: 'Agentes de IA especializados por sector (Healthcare, Agriculture, Industrial, Services) que operan de forma autónoma o supervisada',
    impact: 'Revolucionario',
    trend2026: 'Agentic AI (Forbes #1)',
    icon: Bot,
    status: 'implemented',
    progress: 85,
    features: [
      'Modo supervisado y autónomo',
      'Chat conversacional por agente',
      'Historial de decisiones',
      'Métricas en tiempo real',
      'Registro unificado de agentes'
    ],
    integrations: ['Healthcare Agent', 'Agriculture Agent', 'Industrial Agent', 'Services Agent']
  },
  {
    id: 'digital-twins',
    number: 2,
    name: 'Digital Twins por Industria',
    shortName: 'Digital Twins',
    description: 'Gemelos digitales de activos físicos con datos en tiempo real, sensores IoT y simulación predictiva',
    impact: 'Transformador',
    trend2026: 'Digital Twins (Forbes #8)',
    icon: Cpu,
    status: 'implemented',
    progress: 78,
    features: [
      'Modelos 3D de activos',
      'Sensores en tiempo real',
      'Datos de temperatura, presión, RPM',
      'Twin de construcción (BIM)',
      'Sincronización automática'
    ],
    integrations: ['Industrial Pro', 'Manufacturing', 'Construction BIM']
  },
  {
    id: 'self-healing',
    number: 3,
    name: 'Self-Healing Workflows',
    shortName: 'Self-Healing',
    description: 'Flujos de trabajo que se auto-reparan: predicción de fallos, auto-remediación y análisis de causa raíz',
    impact: 'Operacional',
    trend2026: 'Zero-Trust Edge',
    icon: Wrench,
    status: 'implemented',
    progress: 92,
    features: [
      'Predicción de fallos con IA',
      'Auto-remediación (restart, cache, rollback)',
      'Circuit breaker automático',
      'Correlación de eventos',
      'Rollback de remediaciones'
    ],
    integrations: ['Module Orchestrator', 'System Monitor', 'Event Correlator']
  },
  {
    id: 'agent-marketplace',
    number: 4,
    name: 'Marketplace de Agentes Verticales',
    shortName: 'Marketplace',
    description: 'Tienda de agentes IA especializados por industria, con instalación one-click y métricas de rendimiento',
    impact: 'Monetización',
    trend2026: 'Industry Cloud',
    icon: Store,
    status: 'partial',
    progress: 65,
    features: [
      'Catálogo de agentes por sector',
      'Instalación y desinstalación',
      'Ratings y reviews',
      'Métricas de uso',
      'Licenciamiento flexible'
    ],
    integrations: ['Vertical Accounting Marketplace', 'Agent Registry']
  },
  {
    id: 'vertical-llms',
    number: 5,
    name: 'Vertical LLMs Fine-tuned',
    shortName: 'Vertical LLMs',
    description: 'Modelos de lenguaje especializados por vertical con conocimiento específico de dominio',
    impact: 'Precisión',
    trend2026: 'Vertical AI Agents',
    icon: Brain,
    status: 'partial',
    progress: 55,
    features: [
      'Fine-tuning por sector',
      'Conocimiento de normativas',
      'Jerga especializada',
      'Mejora continua con feedback',
      'Prompts específicos por vertical'
    ],
    integrations: ['Healthcare Copilot', 'Industrial Copilot', 'Accounting Copilot']
  },
  {
    id: 'multi-agent',
    number: 6,
    name: 'Multi-Agent Orchestration',
    shortName: 'Multi-Agent',
    description: 'Orquestación jerárquica de múltiples agentes: Supervisor → Dominios → Módulos con comunicación inter-agente',
    impact: 'Automatización',
    trend2026: 'Agentic Platforms',
    icon: Network,
    status: 'implemented',
    progress: 88,
    features: [
      'Jerarquía Supervisor-Dominio-Módulo',
      'Comunicación agent-to-agent',
      'Memoria compartida',
      'Registro dinámico de módulos',
      'Trazabilidad de decisiones'
    ],
    integrations: ['Vertical Agent Orchestrator', 'Advanced Agents Dashboard']
  },
  {
    id: 'predictive-analytics',
    number: 7,
    name: 'Predictive Industry Analytics',
    shortName: 'Predictive Analytics',
    description: 'Analítica predictiva específica por industria: mantenimiento, demanda, riesgos y optimización',
    impact: 'Preventivo',
    trend2026: 'AI-Driven Systems',
    icon: BarChart3,
    status: 'implemented',
    progress: 82,
    features: [
      'Mantenimiento predictivo (OEE)',
      'Predicción de demanda',
      'Detección de anomalías',
      'Forecasting financiero',
      'Optimización de rutas'
    ],
    integrations: ['Industrial Pro', 'Fleet Management', 'Supply Chain']
  },
  {
    id: 'compliance-engine',
    number: 8,
    name: 'Compliance Autonomous Engine',
    shortName: 'Compliance Engine',
    description: 'Motor de cumplimiento normativo autónomo con auditorías automáticas y generación de evidencias',
    impact: 'Regulatorio',
    trend2026: 'Embedded Governance',
    icon: Shield,
    status: 'implemented',
    progress: 75,
    features: [
      'Auditorías automáticas NIIF/NIIC',
      'Generación de evidencias',
      'Monitoreo 24/7 de controles',
      'Alertas de incumplimiento',
      'Documentación regulatoria'
    ],
    integrations: ['NIIF Compliance', 'Continuous Controls', 'Audit Engine']
  }
];

const IMPACT_COLORS: Record<string, string> = {
  'Revolucionario': 'bg-gradient-to-r from-red-500 to-orange-500 text-white',
  'Transformador': 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  'Operacional': 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
  'Monetización': 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
  'Precisión': 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white',
  'Automatización': 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white',
  'Preventivo': 'bg-gradient-to-r from-teal-500 to-green-500 text-white',
  'Regulatorio': 'bg-gradient-to-r from-slate-600 to-gray-700 text-white'
};

const STATUS_CONFIG: Record<TrendStatus, { label: string; color: string; bgColor: string }> = {
  implemented: { label: 'Implementado', color: 'text-green-600', bgColor: 'bg-green-500' },
  partial: { label: 'Parcial', color: 'text-amber-600', bgColor: 'bg-amber-500' },
  planned: { label: 'Planificado', color: 'text-blue-600', bgColor: 'bg-blue-500' }
};

export function EnterpriseTrends2026Dashboard() {
  const [selectedTrend, setSelectedTrend] = useState<EnterpriseTrend | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const handleOpenTrend = useCallback((trend: EnterpriseTrend) => {
    setSelectedTrend(trend);
    setIsDialogOpen(true);
  }, []);

  const handleActivate = useCallback(async (trend: EnterpriseTrend) => {
    setIsActivating(true);
    try {
      // Simulación de activación
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(`${trend.shortName} activado correctamente`);
    } catch (error) {
      toast.error('Error al activar el módulo');
    } finally {
      setIsActivating(false);
    }
  }, []);

  const implementedCount = ENTERPRISE_TRENDS.filter(t => t.status === 'implemented').length;
  const partialCount = ENTERPRISE_TRENDS.filter(t => t.status === 'partial').length;
  const avgProgress = Math.round(ENTERPRISE_TRENDS.reduce((acc, t) => acc + t.progress, 0) / ENTERPRISE_TRENDS.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 shadow-lg">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent">
              Tendencias Disruptivas 2026
            </h1>
            <p className="text-sm text-muted-foreground">
              Enterprise Vertical Packs - Investigación Forbes, Bain & Company
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="default" className="gap-1.5 px-3 py-1">
            <CheckCircle2 className="h-3 w-3" />
            {implementedCount} Implementados
          </Badge>
          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <Settings className="h-3 w-3" />
            {partialCount} Parciales
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-3 py-1">
            <TrendingUp className="h-3 w-3" />
            {avgProgress}% Progreso Medio
          </Badge>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard 
          icon={Bot} 
          label="Agentes Activos" 
          value="4" 
          subtext="Por vertical"
          gradient="from-blue-500 to-cyan-500"
        />
        <StatsCard 
          icon={Cpu} 
          label="Digital Twins" 
          value="12" 
          subtext="Activos monitorizados"
          gradient="from-purple-500 to-pink-500"
        />
        <StatsCard 
          icon={Shield} 
          label="Controles Compliance" 
          value="24" 
          subtext="Monitoreo 24/7"
          gradient="from-green-500 to-emerald-500"
        />
        <StatsCard 
          icon={Network} 
          label="Orquestaciones" 
          value="156" 
          subtext="Tareas/día"
          gradient="from-orange-500 to-red-500"
        />
      </div>

      {/* Trends Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ENTERPRISE_TRENDS.map((trend) => (
          <TrendCard 
            key={trend.id} 
            trend={trend} 
            onOpen={handleOpenTrend}
          />
        ))}
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {selectedTrend && (
                <>
                  <div className={cn(
                    "p-2.5 rounded-xl",
                    IMPACT_COLORS[selectedTrend.impact]
                  )}>
                    <selectedTrend.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{selectedTrend.number}
                      </Badge>
                      <DialogTitle>{selectedTrend.name}</DialogTitle>
                    </div>
                    <DialogDescription className="mt-1">
                      {selectedTrend.description}
                    </DialogDescription>
                  </div>
                </>
              )}
            </div>
          </DialogHeader>

          {selectedTrend && (
            <ScrollArea className="flex-1 mt-4">
              <div className="space-y-6 pr-4">
                {/* Impact & Status */}
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={cn("px-3 py-1", IMPACT_COLORS[selectedTrend.impact])}>
                    {selectedTrend.impact}
                  </Badge>
                  <Badge variant="outline" className="gap-1.5">
                    <Globe className="h-3 w-3" />
                    {selectedTrend.trend2026}
                  </Badge>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <div className={cn("w-2 h-2 rounded-full", STATUS_CONFIG[selectedTrend.status].bgColor)} />
                    <span className={cn("text-sm font-medium", STATUS_CONFIG[selectedTrend.status].color)}>
                      {STATUS_CONFIG[selectedTrend.status].label}
                    </span>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progreso de implementación</span>
                    <span className="font-bold">{selectedTrend.progress}%</span>
                  </div>
                  <Progress value={selectedTrend.progress} className="h-2" />
                </div>

                {/* Features */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Funcionalidades
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedTrend.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Integrations */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Integraciones
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTrend.integrations.map((integration, i) => (
                      <Badge key={i} variant="secondary" className="gap-1.5">
                        <Activity className="h-3 w-3" />
                        {integration}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    className="flex-1 gap-2"
                    onClick={() => handleActivate(selectedTrend)}
                    disabled={isActivating || selectedTrend.status === 'implemented'}
                  >
                    {isActivating ? (
                      <Activity className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {selectedTrend.status === 'implemented' ? 'Ya Activo' : 'Activar Módulo'}
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Target className="h-4 w-4" />
                    Ver Métricas
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Subcomponentes

interface StatsCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtext: string;
  gradient: string;
}

function StatsCard({ icon: Icon, label, value, subtext, gradient }: StatsCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 rounded-xl bg-gradient-to-br shadow-sm", gradient)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-[10px] text-muted-foreground/70">{subtext}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TrendCardProps {
  trend: EnterpriseTrend;
  onOpen: (trend: EnterpriseTrend) => void;
}

function TrendCard({ trend, onOpen }: TrendCardProps) {
  const Icon = trend.icon;
  const statusConfig = STATUS_CONFIG[trend.status];

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg group border-2",
        trend.status === 'implemented' 
          ? "border-green-500/20 hover:border-green-500/40" 
          : trend.status === 'partial'
          ? "border-amber-500/20 hover:border-amber-500/40"
          : "border-blue-500/20 hover:border-blue-500/40"
      )}
      onClick={() => onOpen(trend)}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className={cn(
            "p-2.5 rounded-xl shadow-sm text-white",
            IMPACT_COLORS[trend.impact]
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-full", statusConfig.bgColor)} />
            <span className={cn("text-xs font-medium", statusConfig.color)}>
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Number & Title */}
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            #{trend.number}
          </Badge>
          <h3 className="font-semibold text-sm line-clamp-1">{trend.shortName}</h3>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 min-h-[32px]">
          {trend.description}
        </p>

        {/* Progress */}
        <div className="space-y-1 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-medium">{trend.progress}%</span>
          </div>
          <Progress value={trend.progress} className="h-1.5" />
        </div>

        {/* Impact Badge & Action */}
        <div className="flex items-center justify-between">
          <Badge className={cn("text-[10px] px-2", IMPACT_COLORS[trend.impact])}>
            {trend.impact}
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Ver
            <Maximize2 className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default EnterpriseTrends2026Dashboard;
