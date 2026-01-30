/**
 * TrendsSelector - Selector de funcionalidades 2025-2026+
 * Permite navegar entre las diferentes tendencias implementadas
 */

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Radio, 
  GitBranch, 
  RotateCcw, 
  Users, 
  Gamepad2, 
  Handshake, 
  Route,
  Sparkles
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

interface TrendsSelectorProps {
  isExpanded?: boolean;
}

const TRENDS_OPTIONS = [
  {
    value: 'autonomous',
    label: 'Agente Autónomo',
    description: 'Nurturing automático, seguimientos y propuestas',
    icon: Bot,
    category: 'confirmed',
  },
  {
    value: 'multisignal',
    label: 'Scoring Multi-Señal',
    description: 'Probabilidades dinámicas en tiempo real',
    icon: Radio,
    category: 'confirmed',
  },
  {
    value: 'adaptive',
    label: 'Pipeline Adaptativo',
    description: 'Etapas que se ajustan automáticamente',
    icon: GitBranch,
    category: 'confirmed',
  },
  {
    value: 'inverse',
    label: 'Pipeline Inverso',
    description: 'Detecta clientes listos para comprar',
    icon: RotateCcw,
    category: 'disruptive',
  },
  {
    value: 'gamification',
    label: 'Gamificación IA',
    description: 'Puntos y rankings predictivos',
    icon: Gamepad2,
    category: 'disruptive',
  },
  {
    value: 'journey360',
    label: 'Customer Journey 360',
    description: 'Visión unificada del cliente',
    icon: Route,
    category: 'disruptive',
  },
  {
    value: 'dealrooms',
    label: 'Deal Rooms',
    description: 'Espacios colaborativos vendedor-cliente',
    icon: Handshake,
    category: 'disruptive',
  },
  {
    value: 'lostrecovery',
    label: 'Recuperación Perdidas',
    description: 'IA que reactiva oportunidades perdidas',
    icon: Users,
    category: 'disruptive',
  },
];

export function TrendsSelector({ isExpanded = false }: TrendsSelectorProps) {
  const [selectedTrend, setSelectedTrend] = useState('autonomous');

  const selectedOption = TRENDS_OPTIONS.find(t => t.value === selectedTrend);
  const SelectedIcon = selectedOption?.icon || Sparkles;

  const renderContent = () => {
    switch (selectedTrend) {
      case 'autonomous':
        return <AutonomousSalesAgent />;
      case 'multisignal':
        return <MultiSignalScoring />;
      case 'adaptive':
        return <AdaptivePipeline />;
      case 'inverse':
        return <InversePipeline />;
      case 'gamification':
        return <GamificationLeaderboard />;
      case 'journey360':
        return <CustomerJourney360 />;
      case 'dealrooms':
        return <DealRooms />;
      case 'lostrecovery':
        return <LostRecoveryAgent />;
      default:
        return <AutonomousSalesAgent />;
    }
  };

  return (
    <div className={cn("space-y-3", isExpanded ? "h-[calc(100vh-280px)]" : "")}>
      {/* Selector */}
      <div className="flex items-center gap-2">
        <Select value={selectedTrend} onValueChange={setSelectedTrend}>
          <SelectTrigger className="w-full">
            <div className="flex items-center gap-2">
              <SelectedIcon className="h-4 w-4 text-primary" />
              <SelectValue placeholder="Selecciona una tendencia" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Tendencias Confirmadas
            </div>
            {TRENDS_OPTIONS.filter(t => t.category === 'confirmed').map((trend) => {
              const Icon = trend.icon;
              return (
                <SelectItem key={trend.value} value={trend.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <div>
                      <span className="font-medium">{trend.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {trend.description}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">
              Ideas Disruptivas
            </div>
            {TRENDS_OPTIONS.filter(t => t.category === 'disruptive').map((trend) => {
              const Icon = trend.icon;
              return (
                <SelectItem key={trend.value} value={trend.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-accent-foreground" />
                    <div>
                      <span className="font-medium">{trend.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {trend.description}
                      </span>
                    </div>
                    <Badge variant="outline" className="ml-auto text-[9px]">
                      Disruptivo
                    </Badge>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Category Badge */}
      <div className="flex items-center gap-2">
        <Badge 
          variant={selectedOption?.category === 'confirmed' ? 'default' : 'secondary'}
          className="text-xs"
        >
          {selectedOption?.category === 'confirmed' ? '✓ Confirmada' : '💡 Disruptiva'}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {selectedOption?.description}
        </span>
      </div>

      {/* Content */}
      <ScrollArea className={isExpanded ? "h-[calc(100%-80px)]" : "h-[300px]"}>
        <div className="pr-2">
          {renderContent()}
        </div>
      </ScrollArea>
    </div>
  );
}

export default TrendsSelector;
