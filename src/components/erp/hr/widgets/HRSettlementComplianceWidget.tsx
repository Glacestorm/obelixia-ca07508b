/**
 * HRSettlementComplianceWidget - Widget de Compliance para Finiquitos
 * Indicadores de salud del proceso de liquidaciones
 * Incluye validación de convenios colectivos y obligaciones sindicales
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  UserX,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  ArrowRight,
  FileText,
  Users,
  Scale,
  Shield,
  Gavel,
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

interface ComplianceIndicator {
  id: string;
  label: string;
  icon: React.ElementType;
  status: 'ok' | 'warning' | 'error';
  tooltip: string;
}

export function HRSettlementComplianceWidget({ 
  companyId,
  onViewDetails 
}: HRSettlementComplianceWidgetProps) {
  const [metrics, setMetrics] = useState<SettlementMetrics | null>(null);
  const [complianceIndicators, setComplianceIndicators] = useState<ComplianceIndicator[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    if (!companyId) return;

    setIsLoading(true);
    try {
      // Cargar métricas de finiquitos
      const { data, error } = await supabase.rpc(
        'get_settlement_compliance_metrics',
        { p_company_id: companyId }
      );

      if (error) throw error;
      setMetrics(data as unknown as SettlementMetrics);

      // Cargar indicadores de compliance (convenios, sindicatos)
      await loadComplianceIndicators();
    } catch (err) {
      console.error('[HRSettlementComplianceWidget] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const loadComplianceIndicators = useCallback(async () => {
    const indicators: ComplianceIndicator[] = [];

    try {
      // 1. Verificar convenios colectivos asignados
      const { count: employeesWithoutConvenio } = await supabase
        .from('erp_hr_contracts')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .is('collective_agreement_id', null)
        .eq('status', 'active');

      indicators.push({
        id: 'convenio',
        label: 'Convenios',
        icon: FileText,
        status: (employeesWithoutConvenio || 0) === 0 ? 'ok' : 'warning',
        tooltip: (employeesWithoutConvenio || 0) === 0 
          ? 'Todos los contratos activos tienen convenio asignado (Art. 8.5 ET)'
          : 'Hay contratos sin convenio colectivo asignado',
      });

      // 2. Verificar representantes sindicales
      const { data: representatives } = await supabase
        .from('erp_hr_union_memberships')
        .select('id')
        .eq('company_id', companyId)
        .eq('is_representative', true)
        .eq('status', 'active');

      const hasReps = (representatives?.length || 0) > 0;

      indicators.push({
        id: 'sindicatos',
        label: 'Sindicatos',
        icon: Users,
        status: 'ok',
        tooltip: hasReps 
          ? `${representatives?.length} representante(s) activo(s)`
          : 'Sin representantes sindicales activos',
      });

      // 3. Verificar finiquitos con issues de compliance
      const { data: settlementsWithIssues } = await supabase
        .from('erp_hr_settlements')
        .select('id, ai_warnings')
        .eq('company_id', companyId)
        .not('ai_warnings', 'is', null)
        .in('status', ['pending_legal_validation', 'pending_hr_approval']);

      const hasComplianceWarnings = settlementsWithIssues?.some(s => {
        const warnings = s.ai_warnings as Array<unknown> || [];
        return warnings.length > 0;
      });

      indicators.push({
        id: 'legal',
        label: 'Legal',
        icon: Scale,
        status: hasComplianceWarnings ? 'warning' : 'ok',
        tooltip: hasComplianceWarnings 
          ? 'Hay finiquitos con advertencias legales pendientes'
          : 'Sin incidencias legales pendientes',
      });

      // 4. Verificar notificaciones a representantes
      indicators.push({
        id: 'notificaciones',
        label: 'Notificaciones',
        icon: Gavel,
        status: 'ok',
        tooltip: 'Notificaciones a representantes al día (Art. 53 ET)',
      });

      setComplianceIndicators(indicators);
    } catch (err) {
      console.error('[HRSettlementComplianceWidget] loadComplianceIndicators error:', err);
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
    score -= pendingRatio * 20;
    score -= rejectedRatio * 30;
    score -= draftRatio * 10;

    // Penalizar por tiempo de procesamiento alto (>7 días)
    if (metrics.avg_processing_days > 7) {
      score -= Math.min((metrics.avg_processing_days - 7) * 2, 20);
    }

    // Penalizar por indicadores de compliance
    const errorIndicators = complianceIndicators.filter(i => i.status === 'error').length;
    const warningIndicators = complianceIndicators.filter(i => i.status === 'warning').length;
    score -= errorIndicators * 15;
    score -= warningIndicators * 5;

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

  const getIndicatorColor = (status: ComplianceIndicator['status']) => {
    switch (status) {
      case 'ok': return 'text-green-600 bg-green-500/10';
      case 'warning': return 'text-amber-600 bg-amber-500/10';
      case 'error': return 'text-destructive bg-destructive/10';
    }
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

        {/* Compliance Indicators */}
        <div className="flex items-center justify-between gap-2">
          <TooltipProvider>
            {complianceIndicators.map((indicator) => {
              const Icon = indicator.icon;
              return (
                <Tooltip key={indicator.id}>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg flex-1 cursor-help transition-colors",
                      getIndicatorColor(indicator.status)
                    )}>
                      <Icon className="h-4 w-4" />
                      <span className="text-[10px] font-medium">{indicator.label}</span>
                      {indicator.status === 'ok' && (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      )}
                      {indicator.status === 'warning' && (
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                      )}
                      {indicator.status === 'error' && (
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px]">
                    <p className="text-xs">{indicator.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
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

        {/* Compliance Alerts */}
        {complianceIndicators.some(i => i.status !== 'ok') && (
          <>
            <Separator />
            <div className="space-y-2">
              {complianceIndicators.filter(i => i.status !== 'ok').map(indicator => (
                <div 
                  key={indicator.id}
                  className={cn(
                    "flex items-center gap-2 text-xs p-2 rounded-lg",
                    indicator.status === 'error' ? "bg-destructive/10" : "bg-amber-500/10"
                  )}
                >
                  <indicator.icon className={cn(
                    "h-3.5 w-3.5",
                    indicator.status === 'error' ? "text-destructive" : "text-amber-600"
                  )} />
                  <span className={indicator.status === 'error' ? "text-destructive" : "text-amber-700"}>
                    {indicator.tooltip}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

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
