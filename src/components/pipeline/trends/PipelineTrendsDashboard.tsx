/**
 * PipelineTrendsDashboard - Dashboard dedicado para Tendencias 2025-2026+
 * Muestra todas las tendencias de pipeline en una vista de pantalla completa
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, 
  Bot, 
  Radio, 
  GitBranch, 
  RotateCcw, 
  Users, 
  Gamepad2, 
  Handshake, 
  Route,
  Maximize2,
  ChevronRight,
  Zap,
  TrendingUp,
  Settings,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { AutonomousSalesAgent } from './AutonomousSalesAgent';
import { MultiSignalScoring } from './MultiSignalScoring';
import { AdaptivePipeline } from './AdaptivePipeline';
import { InversePipeline } from './InversePipeline';
import { GamificationLeaderboard } from './GamificationLeaderboard';
import { DealRooms } from './DealRooms';
import { LostRecoveryAgent } from './LostRecoveryAgent';
import { CustomerJourney360 } from './CustomerJourney360';

// Estado de cada módulo
type ModuleStatus = 'active' | 'configuring' | 'available';

interface TrendModule {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'confirmed' | 'disruptive';
  status: ModuleStatus;
  component: React.ComponentType;
}

const TREND_MODULES: TrendModule[] = [
  {
    id: 'autonomous',
    name: 'Agente Autónomo de Ventas',
    shortName: 'Agente Autónomo',
    description: 'Nurturing automático, seguimientos y generación de propuestas sin intervención',
    icon: Bot,
    category: 'confirmed',
    status: 'active',
    component: AutonomousSalesAgent,
  },
  {
    id: 'multisignal',
    name: 'Scoring Multi-Señal',
    shortName: 'Scoring Multi-Señal',
    description: 'Probabilidades dinámicas basadas en actividad real en tiempo real',
    icon: Radio,
    category: 'confirmed',
    status: 'active',
    component: MultiSignalScoring,
  },
  {
    id: 'adaptive',
    name: 'Pipeline Adaptativo',
    shortName: 'Pipeline Adaptativo',
    description: 'Etapas que se ajustan automáticamente según el tipo de producto y cliente',
    icon: GitBranch,
    category: 'confirmed',
    status: 'configuring',
    component: AdaptivePipeline,
  },
  {
    id: 'inverse',
    name: 'Pipeline Inverso',
    shortName: 'Pipeline Inverso',
    description: 'Detecta señales de intención de compra antes de que el cliente contacte',
    icon: RotateCcw,
    category: 'disruptive',
    status: 'active',
    component: InversePipeline,
  },
  {
    id: 'gamification',
    name: 'Gamificación con IA',
    shortName: 'Gamificación IA',
    description: 'Rankings predictivos, XP y desafíos personalizados para vendedores',
    icon: Gamepad2,
    category: 'disruptive',
    status: 'available',
    component: GamificationLeaderboard,
  },
  {
    id: 'journey360',
    name: 'Customer Journey 360',
    shortName: 'Journey 360',
    description: 'Visión unificada y centrada en el cliente de todo su recorrido',
    icon: Route,
    category: 'disruptive',
    status: 'active',
    component: CustomerJourney360,
  },
  {
    id: 'dealrooms',
    name: 'Deal Rooms Colaborativos',
    shortName: 'Deal Rooms',
    description: 'Espacios colaborativos para edición conjunta de documentos vendedor-cliente',
    icon: Handshake,
    category: 'disruptive',
    status: 'configuring',
    component: DealRooms,
  },
  {
    id: 'lostrecovery',
    name: 'Recuperación de Oportunidades Perdidas',
    shortName: 'Recovery Perdidas',
    description: 'IA que monitorea y reactiva oportunidades que parecían perdidas',
    icon: Users,
    category: 'disruptive',
    status: 'active',
    component: LostRecoveryAgent,
  },
];

const STATUS_CONFIG: Record<ModuleStatus, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  active: { 
    label: 'Activo', 
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-500',
    icon: CheckCircle2
  },
  configuring: { 
    label: 'Configurando', 
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500',
    icon: Settings
  },
  available: { 
    label: 'Disponible', 
    color: 'text-muted-foreground',
    bgColor: 'bg-muted-foreground',
    icon: Zap
  },
};

export function PipelineTrendsDashboard() {
  const [selectedModule, setSelectedModule] = useState<TrendModule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOpenModule = useCallback((module: TrendModule) => {
    setSelectedModule(module);
    setIsDialogOpen(true);
  }, []);

  const confirmedModules = TREND_MODULES.filter(m => m.category === 'confirmed');
  const disruptiveModules = TREND_MODULES.filter(m => m.category === 'disruptive');

  const activeCount = TREND_MODULES.filter(m => m.status === 'active').length;
  const configuringCount = TREND_MODULES.filter(m => m.status === 'configuring').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 shadow-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
              Tendencias Pipeline 2025-2026+
            </h1>
            <p className="text-sm text-muted-foreground">
              El futuro de las ventas, hoy
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="default" className="gap-1.5">
            <CheckCircle2 className="h-3 w-3" />
            {activeCount} Activos
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <Settings className="h-3 w-3" />
            {configuringCount} Configurando
          </Badge>
          <Badge variant="outline" className="gap-1.5">
            <TrendingUp className="h-3 w-3" />
            {TREND_MODULES.length} Total
          </Badge>
        </div>
      </div>

      {/* Confirmed Trends Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-primary">
          <CheckCircle2 className="h-5 w-5" />
          Tendencias Confirmadas
        </h2>
        <p className="text-sm text-muted-foreground">
          Funcionalidades validadas por el mercado y listas para implementar
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {confirmedModules.map((module) => (
            <TrendCard 
              key={module.id} 
              module={module} 
              onOpen={handleOpenModule}
            />
          ))}
        </div>
      </div>

      {/* Disruptive Ideas Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 to-pink-600 bg-clip-text text-transparent">
          <Zap className="h-5 w-5 text-fuchsia-500" />
          Ideas Disruptivas
        </h2>
        <p className="text-sm text-muted-foreground">
          Conceptos innovadores que pueden revolucionar tu proceso de ventas
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {disruptiveModules.map((module) => (
            <TrendCard 
              key={module.id} 
              module={module} 
              onOpen={handleOpenModule}
              isDisruptive
            />
          ))}
        </div>
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {selectedModule && (
                <>
                  <div className={cn(
                    "p-2 rounded-lg",
                    selectedModule.category === 'confirmed' 
                      ? "bg-primary/10" 
                      : "bg-gradient-to-br from-fuchsia-500/10 to-pink-500/10"
                  )}>
                    <selectedModule.icon className={cn(
                      "h-5 w-5",
                      selectedModule.category === 'confirmed' 
                        ? "text-primary" 
                        : "text-fuchsia-500"
                    )} />
                  </div>
                  <div>
                    <DialogTitle className="text-lg">{selectedModule.name}</DialogTitle>
                    <DialogDescription>{selectedModule.description}</DialogDescription>
                  </div>
                </>
              )}
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 mt-4">
            <div className="pr-4">
              {selectedModule && <selectedModule.component />}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TrendCardProps {
  module: TrendModule;
  onOpen: (module: TrendModule) => void;
  isDisruptive?: boolean;
}

function TrendCard({ module, onOpen, isDisruptive = false }: TrendCardProps) {
  const Icon = module.icon;
  const statusConfig = STATUS_CONFIG[module.status];
  const StatusIcon = statusConfig.icon;

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg group",
        isDisruptive 
          ? "border-2 border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/5 to-pink-500/5 hover:border-fuchsia-500/40"
          : "border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 hover:border-primary/40"
      )}
      onClick={() => onOpen(module)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={cn(
            "p-2.5 rounded-xl shadow-sm",
            isDisruptive 
              ? "bg-gradient-to-br from-fuchsia-500 to-pink-500" 
              : "bg-gradient-to-br from-primary to-primary/80"
          )}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-full", statusConfig.bgColor)} />
            <span className={cn("text-xs font-medium", statusConfig.color)}>
              {statusConfig.label}
            </span>
          </div>
        </div>
        <h3 className={cn(
          "font-semibold text-sm mb-1",
          isDisruptive ? "text-fuchsia-700 dark:text-fuchsia-400" : ""
        )}>
          {module.shortName}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {module.description}
        </p>
        <div className="flex items-center justify-between">
          <Badge 
            variant={isDisruptive ? "secondary" : "default"} 
            className="text-[10px]"
          >
            {isDisruptive ? '💡 Disruptivo' : '✓ Confirmado'}
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Abrir
            <Maximize2 className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default PipelineTrendsDashboard;
