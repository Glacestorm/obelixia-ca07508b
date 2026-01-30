/**
 * Automatización de Recuperación de Perdidos - Tendencia 2025-2026
 * IA que detecta cuándo retomar oportunidades perdidas basándose en señales
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  RotateCcw,
  Sparkles,
  TrendingUp,
  Clock,
  Calendar,
  Mail,
  MessageSquare,
  Phone,
  Eye,
  AlertCircle,
  CheckCircle2,
  Zap,
  Target,
  ArrowRight,
  RefreshCw,
  Building2,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RecoverySignal {
  id: string;
  type: 'website_visit' | 'email_open' | 'competitor_issue' | 'budget_renewal' | 'contact_change' | 'market_trigger';
  strength: 'strong' | 'medium' | 'weak';
  timestamp: Date;
  details: string;
}

interface LostOpportunity {
  id: string;
  title: string;
  companyName: string;
  originalValue: number;
  lostDate: Date;
  lostReason: string;
  recoveryScore: number;
  recoveryTrend: 'rising' | 'falling' | 'stable';
  signals: RecoverySignal[];
  suggestedAction: string;
  bestTimeToContact: string;
  previousAttempts: number;
}

const SIGNAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  website_visit: Eye,
  email_open: Mail,
  competitor_issue: AlertCircle,
  budget_renewal: Calendar,
  contact_change: Building2,
  market_trigger: TrendingUp,
};

const SIGNAL_COLORS: Record<string, string> = {
  strong: 'text-green-600 bg-green-100 dark:bg-green-950',
  medium: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-950',
  weak: 'text-gray-600 bg-gray-100 dark:bg-gray-950',
};

export function LostRecoveryAgent() {
  const [autoRecoveryEnabled, setAutoRecoveryEnabled] = useState(true);
  const [recoveringId, setRecoveringId] = useState<string | null>(null);

  const [lostOpportunities] = useState<LostOpportunity[]>([
    {
      id: 'lost-1',
      title: 'Implementación CRM',
      companyName: 'Innovatech Solutions',
      originalValue: 75000,
      lostDate: new Date(Date.now() - 7776000000), // 90 días
      lostReason: 'Presupuesto insuficiente',
      recoveryScore: 87,
      recoveryTrend: 'rising',
      previousAttempts: 0,
      suggestedAction: 'Contactar - Nuevo ciclo presupuestario detectado',
      bestTimeToContact: 'Mañana 10:00-12:00',
      signals: [
        { id: 's1', type: 'budget_renewal', strength: 'strong', timestamp: new Date(Date.now() - 86400000), details: 'Inicio de Q1 fiscal detectado' },
        { id: 's2', type: 'website_visit', strength: 'strong', timestamp: new Date(Date.now() - 172800000), details: 'Visitó página de precios 4 veces esta semana' },
        { id: 's3', type: 'email_open', strength: 'medium', timestamp: new Date(Date.now() - 259200000), details: 'Abrió newsletter de producto' },
      ],
    },
    {
      id: 'lost-2',
      title: 'Licencias Enterprise',
      companyName: 'DataFlow Corp',
      originalValue: 120000,
      lostDate: new Date(Date.now() - 15552000000), // 180 días
      lostReason: 'Eligió competidor',
      recoveryScore: 72,
      recoveryTrend: 'rising',
      previousAttempts: 1,
      suggestedAction: 'Ofrecer migración - Problemas reportados con competidor',
      bestTimeToContact: 'Esta semana',
      signals: [
        { id: 's4', type: 'competitor_issue', strength: 'strong', timestamp: new Date(Date.now() - 604800000), details: 'Quejas en redes sobre competidor X' },
        { id: 's5', type: 'contact_change', strength: 'medium', timestamp: new Date(Date.now() - 1209600000), details: 'Nuevo CTO en la empresa' },
      ],
    },
    {
      id: 'lost-3',
      title: 'Consultoría Estratégica',
      companyName: 'Global Manufacturing',
      originalValue: 200000,
      lostDate: new Date(Date.now() - 23328000000), // 270 días
      lostReason: 'Proyecto pausado',
      recoveryScore: 58,
      recoveryTrend: 'stable',
      previousAttempts: 2,
      suggestedAction: 'Enviar caso de éxito de sector similar',
      bestTimeToContact: 'Próximo mes',
      signals: [
        { id: 's6', type: 'market_trigger', strength: 'medium', timestamp: new Date(Date.now() - 2592000000), details: 'Sector en recuperación según reportes' },
        { id: 's7', type: 'website_visit', strength: 'weak', timestamp: new Date(Date.now() - 5184000000), details: 'Visita esporádica a blog' },
      ],
    },
    {
      id: 'lost-4',
      title: 'Software de Gestión',
      companyName: 'Retail Plus',
      originalValue: 35000,
      lostDate: new Date(Date.now() - 31104000000), // 360 días
      lostReason: 'Sin respuesta',
      recoveryScore: 42,
      recoveryTrend: 'falling',
      previousAttempts: 3,
      suggestedAction: 'Esperar - Baja probabilidad actual',
      bestTimeToContact: 'Reevaluar en 60 días',
      signals: [
        { id: 's8', type: 'email_open', strength: 'weak', timestamp: new Date(Date.now() - 7776000000), details: 'Sin actividad reciente' },
      ],
    },
  ]);

  const [stats] = useState({
    totalLost: lostOpportunities.length,
    recoverable: lostOpportunities.filter(o => o.recoveryScore >= 60).length,
    recovered: 8,
    recoveredValue: 340000,
    avgRecoveryTime: 45,
  });

  const handleStartRecovery = useCallback((id: string) => {
    setRecoveringId(id);
    setTimeout(() => {
      setRecoveringId(null);
      toast.success('Secuencia de recuperación iniciada');
    }, 1500);
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: 'rising' | 'falling' | 'stable') => {
    switch (trend) {
      case 'rising': return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'falling': return <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />;
      default: return <ArrowRight className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-3 rounded-xl transition-all duration-300",
            autoRecoveryEnabled 
              ? "bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25" 
              : "bg-muted"
          )}>
            <RotateCcw className={cn("h-6 w-6", autoRecoveryEnabled ? "text-white" : "text-muted-foreground")} />
          </div>
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              Agente de Recuperación
              {autoRecoveryEnabled && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                  Monitoreando
                </Badge>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              {autoRecoveryEnabled 
                ? 'Analizando señales de oportunidades perdidas'
                : 'Activar para detectar oportunidades de recuperación'}
            </p>
          </div>
        </div>
        <Switch checked={autoRecoveryEnabled} onCheckedChange={setAutoRecoveryEnabled} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 rounded-lg border bg-card text-center">
          <History className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <div className="text-lg font-bold">{stats.totalLost}</div>
          <div className="text-xs text-muted-foreground">Perdidas</div>
        </div>
        <div className="p-3 rounded-lg border bg-card text-center">
          <Target className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
          <div className="text-lg font-bold text-yellow-600">{stats.recoverable}</div>
          <div className="text-xs text-muted-foreground">Recuperables</div>
        </div>
        <div className="p-3 rounded-lg border bg-card text-center">
          <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-green-500" />
          <div className="text-lg font-bold text-green-600">{stats.recovered}</div>
          <div className="text-xs text-muted-foreground">Recuperadas</div>
        </div>
        <div className="p-3 rounded-lg border bg-card text-center">
          <Sparkles className="h-4 w-4 mx-auto mb-1 text-primary" />
          <div className="text-lg font-bold">€{(stats.recoveredValue / 1000).toFixed(0)}k</div>
          <div className="text-xs text-muted-foreground">Valor Recuperado</div>
        </div>
      </div>

      {/* Lost Opportunities List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Oportunidades con Señales de Recuperación
          </CardTitle>
          <CardDescription className="text-xs">
            Ordenadas por probabilidad de éxito
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[340px]">
            <div className="space-y-3">
              {lostOpportunities
                .sort((a, b) => b.recoveryScore - a.recoveryScore)
                .map((opp) => (
                  <div 
                    key={opp.id}
                    className={cn(
                      "p-3 rounded-lg border transition-all",
                      opp.recoveryScore >= 70 && "border-green-500/30 bg-green-50/50 dark:bg-green-950/20",
                      recoveringId === opp.id && "ring-2 ring-primary"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2">
                        <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <div className="font-medium text-sm flex items-center gap-1">
                            {opp.title}
                            {getTrendIcon(opp.recoveryTrend)}
                          </div>
                          <div className="text-xs text-muted-foreground">{opp.companyName}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn("text-xl font-bold", getScoreColor(opp.recoveryScore))}>
                          {opp.recoveryScore}%
                        </div>
                        <div className="text-xs text-muted-foreground">recuperable</div>
                      </div>
                    </div>

                    {/* Lost Info */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      <span>€{(opp.originalValue / 1000).toFixed(0)}k original</span>
                      <span>•</span>
                      <span>Perdido hace {Math.floor((Date.now() - opp.lostDate.getTime()) / 86400000)} días</span>
                      <span>•</span>
                      <span>{opp.lostReason}</span>
                    </div>

                    {/* Signals */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {opp.signals.slice(0, 3).map((signal) => {
                        const SignalIcon = SIGNAL_ICONS[signal.type] || Sparkles;
                        return (
                          <Badge 
                            key={signal.id} 
                            className={cn("text-[10px] gap-1", SIGNAL_COLORS[signal.strength])}
                          >
                            <SignalIcon className="h-3 w-3" />
                            {signal.details.slice(0, 30)}...
                          </Badge>
                        );
                      })}
                    </div>

                    {/* Action */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs">
                        <span className="text-muted-foreground">Mejor momento: </span>
                        <span className="font-medium">{opp.bestTimeToContact}</span>
                      </div>
                      <Button 
                        size="sm" 
                        className="h-7 text-xs gap-1"
                        disabled={recoveringId === opp.id || opp.recoveryScore < 50}
                        onClick={() => handleStartRecovery(opp.id)}
                      >
                        {recoveringId === opp.id ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Iniciando...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="h-3 w-3" />
                            Recuperar
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Suggested Action */}
                    <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
                      <span className="font-medium">Acción sugerida:</span> {opp.suggestedAction}
                      {opp.previousAttempts > 0 && (
                        <span className="text-muted-foreground ml-2">
                          ({opp.previousAttempts} intentos previos)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* AI Insight */}
      <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/20">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-amber-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Insight del Agente de Recuperación</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.recoverable > 0 
                ? `Tienes ${stats.recoverable} oportunidades con alta probabilidad de recuperación. El mejor momento para contactar es inicio de semana, 10-12h.`
                : "No hay oportunidades con señales de recuperación fuertes ahora. Continuaré monitoreando."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LostRecoveryAgent;
