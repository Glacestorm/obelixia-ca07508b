/**
 * Pipeline Inverso (Intent-Based) - Tendencia Disruptiva 2025-2026
 * En lugar de empujar oportunidades hacia "Ganada", el sistema identifica 
 * qué clientes están listos para comprar basándose en señales de intención
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Target,
  Radar,
  Flame,
  Snowflake,
  TrendingUp,
  Clock,
  Eye,
  MousePointer,
  ShoppingCart,
  CreditCard,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Zap,
  Users,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IntentSignal {
  id: string;
  type: 'pricing_visit' | 'demo_request' | 'comparison' | 'case_study' | 'proposal_view' | 'contract_download';
  weight: number;
  timestamp: Date;
  details: string;
}

interface BuyerReadiness {
  id: string;
  companyName: string;
  contactName: string;
  readinessScore: number;
  trend: 'heating' | 'cooling' | 'stable';
  lastIntent: Date;
  intentSignals: IntentSignal[];
  estimatedValue: number;
  predictedCloseWindow: string;
  buyerStage: 'awareness' | 'consideration' | 'decision' | 'purchase';
  nextBestAction: string;
}

const INTENT_SIGNAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pricing_visit: CreditCard,
  demo_request: Eye,
  comparison: Radar,
  case_study: Users,
  proposal_view: MousePointer,
  contract_download: ShoppingCart,
};

const INTENT_SIGNAL_WEIGHTS: Record<string, number> = {
  pricing_visit: 15,
  demo_request: 25,
  comparison: 10,
  case_study: 8,
  proposal_view: 20,
  contract_download: 30,
};

export function InversePipeline() {
  const [readyToBuy] = useState<BuyerReadiness[]>([
    {
      id: 'buyer-1',
      companyName: 'Acme Corporation',
      contactName: 'María García',
      readinessScore: 94,
      trend: 'heating',
      lastIntent: new Date(Date.now() - 1800000),
      estimatedValue: 85000,
      predictedCloseWindow: '3-5 días',
      buyerStage: 'purchase',
      nextBestAction: 'Enviar contrato final',
      intentSignals: [
        { id: '1', type: 'contract_download', weight: 30, timestamp: new Date(Date.now() - 1800000), details: 'Descargó contrato tipo' },
        { id: '2', type: 'pricing_visit', weight: 15, timestamp: new Date(Date.now() - 3600000), details: '5 visitas a página de precios hoy' },
        { id: '3', type: 'proposal_view', weight: 20, timestamp: new Date(Date.now() - 7200000), details: 'Revisó propuesta 3 veces' },
      ],
    },
    {
      id: 'buyer-2',
      companyName: 'TechStart Inc',
      contactName: 'Carlos Ruiz',
      readinessScore: 82,
      trend: 'heating',
      lastIntent: new Date(Date.now() - 3600000),
      estimatedValue: 42000,
      predictedCloseWindow: '1-2 semanas',
      buyerStage: 'decision',
      nextBestAction: 'Llamar para resolver dudas',
      intentSignals: [
        { id: '1', type: 'demo_request', weight: 25, timestamp: new Date(Date.now() - 3600000), details: 'Solicitó demo adicional' },
        { id: '2', type: 'comparison', weight: 10, timestamp: new Date(Date.now() - 86400000), details: 'Visitó página de comparación' },
      ],
    },
    {
      id: 'buyer-3',
      companyName: 'Global Industries',
      contactName: 'Ana López',
      readinessScore: 67,
      trend: 'stable',
      lastIntent: new Date(Date.now() - 172800000),
      estimatedValue: 120000,
      predictedCloseWindow: '3-4 semanas',
      buyerStage: 'consideration',
      nextBestAction: 'Compartir caso de éxito',
      intentSignals: [
        { id: '1', type: 'case_study', weight: 8, timestamp: new Date(Date.now() - 172800000), details: 'Leyó 2 casos de éxito' },
        { id: '2', type: 'pricing_visit', weight: 15, timestamp: new Date(Date.now() - 259200000), details: 'Visitó página de precios' },
      ],
    },
    {
      id: 'buyer-4',
      companyName: 'StartupXYZ',
      contactName: 'Pedro Sánchez',
      readinessScore: 45,
      trend: 'cooling',
      lastIntent: new Date(Date.now() - 604800000),
      estimatedValue: 15000,
      predictedCloseWindow: '1-2 meses',
      buyerStage: 'awareness',
      nextBestAction: 'Reactivar con contenido de valor',
      intentSignals: [
        { id: '1', type: 'comparison', weight: 10, timestamp: new Date(Date.now() - 604800000), details: 'Comparó con competidores' },
      ],
    },
  ]);

  const getTrendIcon = (trend: 'heating' | 'cooling' | 'stable') => {
    switch (trend) {
      case 'heating': return <Flame className="h-4 w-4 text-orange-500" />;
      case 'cooling': return <Snowflake className="h-4 w-4 text-blue-500" />;
      default: return <TrendingUp className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getStageColor = (stage: BuyerReadiness['buyerStage']) => {
    switch (stage) {
      case 'purchase': return 'bg-green-500';
      case 'decision': return 'bg-blue-500';
      case 'consideration': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const hotLeads = readyToBuy.filter(b => b.readinessScore >= 80);
  const warmLeads = readyToBuy.filter(b => b.readinessScore >= 60 && b.readinessScore < 80);
  const coldLeads = readyToBuy.filter(b => b.readinessScore < 60);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Pipeline Inverso</h3>
          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
            Intent-Based
          </Badge>
        </div>
      </div>

      {/* Funnel Inverted View */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-lg border bg-green-50 dark:bg-green-950/30 text-center">
          <Flame className="h-5 w-5 mx-auto mb-1 text-green-600" />
          <div className="text-2xl font-bold text-green-600">{hotLeads.length}</div>
          <div className="text-xs text-green-700">Listos para Comprar</div>
          <div className="text-xs text-green-600 mt-1">
            €{(hotLeads.reduce((sum, l) => sum + l.estimatedValue, 0) / 1000).toFixed(0)}k
          </div>
        </div>
        <div className="p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950/30 text-center">
          <TrendingUp className="h-5 w-5 mx-auto mb-1 text-yellow-600" />
          <div className="text-2xl font-bold text-yellow-600">{warmLeads.length}</div>
          <div className="text-xs text-yellow-700">Calentándose</div>
          <div className="text-xs text-yellow-600 mt-1">
            €{(warmLeads.reduce((sum, l) => sum + l.estimatedValue, 0) / 1000).toFixed(0)}k
          </div>
        </div>
        <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/30 text-center">
          <Snowflake className="h-5 w-5 mx-auto mb-1 text-blue-600" />
          <div className="text-2xl font-bold text-blue-600">{coldLeads.length}</div>
          <div className="text-xs text-blue-700">Fríos / Nurturing</div>
          <div className="text-xs text-blue-600 mt-1">
            €{(coldLeads.reduce((sum, l) => sum + l.estimatedValue, 0) / 1000).toFixed(0)}k
          </div>
        </div>
      </div>

      {/* Buyer Readiness List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Radar className="h-4 w-4" />
            Detección de Intención en Tiempo Real
          </CardTitle>
          <CardDescription className="text-xs">
            Ordenado por probabilidad de compra inmediata
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[320px]">
            <div className="space-y-2">
              {readyToBuy.map((buyer) => (
                <div 
                  key={buyer.id}
                  className={cn(
                    "p-3 rounded-lg border transition-all hover:shadow-md cursor-pointer",
                    buyer.readinessScore >= 80 && "border-green-500/30 bg-green-50/50 dark:bg-green-950/20",
                    buyer.trend === 'heating' && "ring-1 ring-orange-500/30"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-1.5 rounded-lg", getStageColor(buyer.buyerStage))}>
                        <Building2 className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-sm flex items-center gap-1">
                          {buyer.companyName}
                          {getTrendIcon(buyer.trend)}
                        </div>
                        <div className="text-xs text-muted-foreground">{buyer.contactName}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn("text-xl font-bold", getScoreColor(buyer.readinessScore))}>
                        {buyer.readinessScore}%
                      </div>
                      <div className="text-xs text-muted-foreground">ready to buy</div>
                    </div>
                  </div>

                  {/* Intent Signals */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {buyer.intentSignals.slice(0, 3).map((signal) => {
                      const SignalIcon = INTENT_SIGNAL_ICONS[signal.type] || Eye;
                      return (
                        <Badge 
                          key={signal.id} 
                          variant="secondary" 
                          className="text-[10px] gap-1"
                        >
                          <SignalIcon className="h-3 w-3" />
                          {signal.details.slice(0, 25)}...
                        </Badge>
                      );
                    })}
                  </div>

                  {/* Footer Info */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Cierre: {buyer.predictedCloseWindow}
                      </span>
                      <span className="font-medium">
                        €{(buyer.estimatedValue / 1000).toFixed(0)}k
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-primary">
                      <Zap className="h-3 w-3" />
                      {buyer.nextBestAction}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* AI Insight */}
      <div className="p-3 rounded-lg bg-gradient-to-r from-orange-500/5 to-red-500/5 border border-orange-500/20">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-orange-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Insight del Pipeline Inverso</p>
            <p className="text-xs text-muted-foreground mt-1">
              {hotLeads.length > 0 
                ? `Tienes ${hotLeads.length} oportunidad(es) con alta intención de compra. Prioriza contactarlas hoy para maximizar conversión.`
                : "No hay leads con alta intención ahora. Considera campañas de nurturing para calentar el pipeline."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InversePipeline;
