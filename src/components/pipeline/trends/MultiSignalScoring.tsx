/**
 * Puntuación Dinámica Multiseñal - Tendencia 2025-2026
 * Probabilidades en tiempo real basadas en múltiples fuentes (email, WhatsApp, web, etc.)
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  Mail,
  MessageCircle,
  Globe,
  Phone,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  MousePointer,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignalSource {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  weight: number;
  lastActivity?: Date;
  score: number;
  trend: 'up' | 'down' | 'stable';
  details: string[];
}

interface OpportunitySignals {
  opportunityId: string;
  opportunityTitle: string;
  companyName: string;
  baselineProbability: number;
  dynamicProbability: number;
  signals: SignalSource[];
  confidenceLevel: number;
  lastUpdate: Date;
}

const SIGNAL_SOURCES: Omit<SignalSource, 'lastActivity' | 'score' | 'trend' | 'details'>[] = [
  { id: 'email', name: 'Email', icon: Mail, color: 'text-blue-500', weight: 25 },
  { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: 'text-green-500', weight: 20 },
  { id: 'web', name: 'Visitas Web', icon: Globe, color: 'text-purple-500', weight: 15 },
  { id: 'calls', name: 'Llamadas', icon: Phone, color: 'text-orange-500', weight: 20 },
  { id: 'meetings', name: 'Reuniones', icon: Calendar, color: 'text-pink-500', weight: 20 },
];

export function MultiSignalScoring() {
  const [opportunities] = useState<OpportunitySignals[]>([
    {
      opportunityId: 'opp-1',
      opportunityTitle: 'Implementación ERP Enterprise',
      companyName: 'Acme Corporation',
      baselineProbability: 60,
      dynamicProbability: 78,
      confidenceLevel: 92,
      lastUpdate: new Date(),
      signals: [
        {
          id: 'email',
          name: 'Email',
          icon: Mail,
          color: 'text-blue-500',
          weight: 25,
          lastActivity: new Date(Date.now() - 3600000),
          score: 85,
          trend: 'up',
          details: ['Abrió 3 emails esta semana', 'Click en propuesta de precios', 'Respondió en < 2h'],
        },
        {
          id: 'whatsapp',
          name: 'WhatsApp',
          icon: MessageCircle,
          color: 'text-green-500',
          weight: 20,
          lastActivity: new Date(Date.now() - 7200000),
          score: 92,
          trend: 'up',
          details: ['Mensajes diarios', 'Compartió con equipo', 'Tono positivo detectado'],
        },
        {
          id: 'web',
          name: 'Visitas Web',
          icon: Globe,
          color: 'text-purple-500',
          weight: 15,
          lastActivity: new Date(Date.now() - 1800000),
          score: 75,
          trend: 'stable',
          details: ['5 visitas esta semana', 'Revisó página de precios 3x', 'Tiempo: 12 min promedio'],
        },
        {
          id: 'calls',
          name: 'Llamadas',
          icon: Phone,
          color: 'text-orange-500',
          weight: 20,
          lastActivity: new Date(Date.now() - 86400000),
          score: 70,
          trend: 'down',
          details: ['Última llamada hace 1 día', '2 llamadas esta semana', 'Duración: 25 min promedio'],
        },
        {
          id: 'meetings',
          name: 'Reuniones',
          icon: Calendar,
          color: 'text-pink-500',
          weight: 20,
          lastActivity: new Date(Date.now() - 172800000),
          score: 65,
          trend: 'stable',
          details: ['Demo completada', 'Próxima reunión agendada', '4 stakeholders involucrados'],
        },
      ],
    },
    {
      opportunityId: 'opp-2',
      opportunityTitle: 'Licencias SaaS Anual',
      companyName: 'TechStart Inc',
      baselineProbability: 40,
      dynamicProbability: 52,
      confidenceLevel: 78,
      lastUpdate: new Date(Date.now() - 300000),
      signals: [
        {
          id: 'email',
          name: 'Email',
          icon: Mail,
          color: 'text-blue-500',
          weight: 25,
          score: 55,
          trend: 'down',
          details: ['Bajo engagement de emails', 'Sin respuesta en 3 días'],
        },
        {
          id: 'whatsapp',
          name: 'WhatsApp',
          icon: MessageCircle,
          color: 'text-green-500',
          weight: 20,
          score: 80,
          trend: 'up',
          details: ['Respuestas rápidas', 'Consultas técnicas frecuentes'],
        },
        {
          id: 'web',
          name: 'Visitas Web',
          icon: Globe,
          color: 'text-purple-500',
          weight: 15,
          score: 45,
          trend: 'stable',
          details: ['Pocas visitas recientes', 'Solo página principal'],
        },
        {
          id: 'calls',
          name: 'Llamadas',
          icon: Phone,
          color: 'text-orange-500',
          weight: 20,
          score: 60,
          trend: 'stable',
          details: ['Llamada pendiente de agendar'],
        },
        {
          id: 'meetings',
          name: 'Reuniones',
          icon: Calendar,
          color: 'text-pink-500',
          weight: 20,
          score: 50,
          trend: 'down',
          details: ['Reunión cancelada 1x', 'Difícil de agendar'],
        },
      ],
    },
  ]);

  const [selectedOpp, setSelectedOpp] = useState<string>(opportunities[0].opportunityId);
  const currentOpp = opportunities.find(o => o.opportunityId === selectedOpp);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down': return <TrendingDown className="h-3 w-3 text-red-500" />;
      default: return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4">
      {/* Header with Live Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Puntuación Multiseñal</h3>
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
            En tiempo real
          </Badge>
        </div>
      </div>

      {/* Opportunity Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {opportunities.map((opp) => {
          const delta = opp.dynamicProbability - opp.baselineProbability;
          return (
            <button
              key={opp.opportunityId}
              onClick={() => setSelectedOpp(opp.opportunityId)}
              className={cn(
                "flex-shrink-0 p-3 rounded-lg border text-left transition-all",
                selectedOpp === opp.opportunityId 
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "hover:bg-muted/50"
              )}
            >
              <div className="text-sm font-medium truncate max-w-[150px]">{opp.opportunityTitle}</div>
              <div className="text-xs text-muted-foreground">{opp.companyName}</div>
              <div className="flex items-center gap-1 mt-1">
                <span className={cn("text-lg font-bold", getScoreColor(opp.dynamicProbability))}>
                  {opp.dynamicProbability}%
                </span>
                <span className={cn(
                  "text-xs flex items-center",
                  delta >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(delta)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {currentOpp && (
        <>
          {/* Main Score Display */}
          <Card className="border-2 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-muted-foreground">Probabilidad Dinámica</div>
                  <div className="flex items-baseline gap-2">
                    <span className={cn("text-4xl font-bold", getScoreColor(currentOpp.dynamicProbability))}>
                      {currentOpp.dynamicProbability}%
                    </span>
                    <span className="text-sm text-muted-foreground">
                      vs {currentOpp.baselineProbability}% base
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    <span>{currentOpp.confidenceLevel}% confianza</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Actualizado hace {Math.floor((Date.now() - currentOpp.lastUpdate.getTime()) / 60000)} min
                  </div>
                </div>
              </div>

              {/* Probability Comparison Bar */}
              <div className="relative h-8 rounded-full bg-muted overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full bg-muted-foreground/20 rounded-full"
                  style={{ width: `${currentOpp.baselineProbability}%` }}
                />
                <div 
                  className={cn(
                    "absolute left-0 top-0 h-full rounded-full transition-all duration-500",
                    getProgressColor(currentOpp.dynamicProbability)
                  )}
                  style={{ width: `${currentOpp.dynamicProbability}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-white drop-shadow-md">
                    +{currentOpp.dynamicProbability - currentOpp.baselineProbability} puntos por señales
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signal Sources Grid */}
          <div className="grid grid-cols-1 gap-2">
            {currentOpp.signals.map((signal) => {
              const SignalIcon = signal.icon;
              return (
                <Card key={signal.id} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg bg-muted", signal.color.replace('text-', 'text-'))}>
                        <SignalIcon className={cn("h-5 w-5", signal.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{signal.name}</span>
                            {getTrendIcon(signal.trend)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn("font-bold", getScoreColor(signal.score))}>
                              {signal.score}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {signal.weight}% peso
                            </Badge>
                          </div>
                        </div>
                        <Progress 
                          value={signal.score} 
                          className="h-1.5 mb-2"
                        />
                        <div className="flex flex-wrap gap-1">
                          {signal.details.slice(0, 2).map((detail, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[10px]">
                              {detail}
                            </Badge>
                          ))}
                          {signal.details.length > 2 && (
                            <Badge variant="outline" className="text-[10px]">
                              +{signal.details.length - 2} más
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* AI Recommendation */}
          <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border border-blue-500/20">
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Recomendación Basada en Señales</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {currentOpp.dynamicProbability > currentOpp.baselineProbability + 10
                    ? "El engagement está muy alto. Es momento ideal para avanzar a la siguiente etapa o cerrar."
                    : currentOpp.dynamicProbability < currentOpp.baselineProbability
                    ? "Las señales indican enfriamiento. Considera una llamada de reconexión o compartir valor adicional."
                    : "Mantén el momentum actual. La oportunidad avanza según lo esperado."}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default MultiSignalScoring;
