/**
 * HRSettlementComplianceWidget - Widget de Compliance para Finiquitos
 * Indicadores de salud del proceso de liquidaciones
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  UserX,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface HRSettlementComplianceWidgetProps {
  companyId: string;
  onViewDetails?: () => void;
}

interface SettlementMetrics {
  total_settlements: number;
  pending_validation: number;
  approved: number;
  rejected: number;
  paid: number;
  draft: number;
  total_gross: number;
  total_net: number;
  total_indemnization: number;
  avg_processing_days: number;
  by_termination_type: Record<string, number>;
}

export function HRSettlementComplianceWidget({ 
  companyId,
  onViewDetails 
}: HRSettlementComplianceWidgetProps) {
  const [metrics, setMetrics] = useState<SettlementMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    if (!companyId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc(
        'get_settlement_compliance_metrics',
        { p_company_id: companyId }
      );

      if (error) throw error;
      setMetrics(data as unknown as SettlementMetrics);
    } catch (err) {
      console.error('[HRSettlementComplianceWidget] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const calculateComplianceScore = (): number => {
    if (!metrics || metrics.total_settlements === 0) return 100;

    // Penalizar por finiquitos pendientes o rechazados
    const pendingRatio = metrics.pending_validation / metrics.total_settlements;
    const rejectedRatio = metrics.rejected / metrics.total_settlements;
    const draftRatio = metrics.draft / metrics.total_settlements;

    // Score base 100, penalizar por issues
    let score = 100;
    score -= pendingRatio * 20; // -20% max por pendientes
    score -= rejectedRatio * 30; // -30% max por rechazados
    score -= draftRatio * 10; // -10% max por borradores

    // Penalizar por tiempo de procesamiento alto (>7 días)
    if (metrics.avg_processing_days > 7) {
      score -= Math.min((metrics.avg_processing_days - 7) * 2, 20);
    }

    return Math.max(0, Math.round(score));
  };

  const score = calculateComplianceScore();

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-destructive';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excelente';
    if (score >= 80) return 'Bueno';
    if (score >= 60) return 'Mejorable';
    return 'Crítico';
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-destructive/10 via-amber-500/10 to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserX className="h-4 w-4 text-destructive" />
            Compliance Finiquitos
          </CardTitle>
          <Badge 
            variant="outline"
            className={cn(
              "font-bold",
              score >= 80 ? "border-green-500/50 bg-green-500/10 text-green-700" :
              score >= 60 ? "border-amber-500/50 bg-amber-500/10 text-amber-700" :
              "border-destructive/50 bg-destructive/10 text-destructive"
            )}
          >
            {score}% - {getScoreLabel(score)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Main Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Índice de cumplimiento</span>
            <span className={cn("font-bold", getScoreColor(score))}>{score}%</span>
          </div>
          <Progress 
            value={score} 
            className={cn(
              "h-2",
              score >= 80 ? "[&>div]:bg-green-500" :
              score >= 60 ? "[&>div]:bg-amber-500" :
              "[&>div]:bg-destructive"
            )}
          />
        </div>

        <Separator />

        {/* KPIs Grid */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-bold">{metrics.total_settlements}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div>
            <div className={cn(
              "text-lg font-bold",
              metrics.pending_validation > 0 ? "text-amber-600" : "text-green-600"
            )}>
              {metrics.pending_validation}
            </div>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">
              {metrics.approved + metrics.paid}
            </div>
            <p className="text-xs text-muted-foreground">Completados</p>
          </div>
        </div>

        <Separator />

        {/* Financial Summary */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Neto Pagado</span>
            <span className="font-medium text-green-600">
              {formatCurrency(metrics.total_net)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Indemnizaciones</span>
            <span className="font-medium">
              {formatCurrency(metrics.total_indemnization)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tiempo medio proceso</span>
            <span className={cn(
              "font-medium",
              metrics.avg_processing_days > 7 ? "text-amber-600" : "text-green-600"
            )}>
              {metrics.avg_processing_days.toFixed(1)} días
            </span>
          </div>
        </div>

        {/* Alerts */}
        {(metrics.pending_validation > 0 || metrics.rejected > 0) && (
          <>
            <Separator />
            <div className="space-y-2">
              {metrics.pending_validation > 0 && (
                <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-amber-500/10">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-700">
                    {metrics.pending_validation} finiquito(s) pendiente(s) de validación
                  </span>
                </div>
              )}
              {metrics.rejected > 0 && (
                <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">
                    {metrics.rejected} finiquito(s) rechazado(s)
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Action */}
        {onViewDetails && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full"
            onClick={onViewDetails}
          >
            Ver panel completo
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default HRSettlementComplianceWidget;
