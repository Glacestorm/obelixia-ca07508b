/**
 * HRPayrollComplianceWidget - Widget de cumplimiento de nóminas para dashboard
 * Muestra alertas de discrepancias detectadas automáticamente
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  Calculator,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePayrollRecalculation } from '@/hooks/admin/usePayrollRecalculation';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface HRPayrollComplianceWidgetProps {
  companyId: string;
  onNavigateToRecalculation?: () => void;
  className?: string;
}

export function HRPayrollComplianceWidget({
  companyId,
  onNavigateToRecalculation,
  className
}: HRPayrollComplianceWidgetProps) {
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  
  const {
    isLoading,
    stats,
    results,
    fetchRecalculations
  } = usePayrollRecalculation();

  // Fetch on mount
  useEffect(() => {
    if (companyId) {
      const currentDate = new Date();
      const period = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      fetchRecalculations(companyId, { period });
      setLastCheck(new Date());
    }
  }, [companyId, fetchRecalculations]);

  const handleRefresh = async () => {
    const currentDate = new Date();
    const period = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    await fetchRecalculations(companyId, { period });
    setLastCheck(new Date());
  };

  // Calculate compliance score
  const complianceScore = stats 
    ? Math.round(((stats.total - stats.issues_detected) / Math.max(stats.total, 1)) * 100)
    : 100;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-destructive';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excelente';
    if (score >= 70) return 'Aceptable';
    return 'Requiere atención';
  };

  // Get recent issues
  const recentIssues = results
    .filter(r => r.compliance_issues.length > 0)
    .slice(0, 3);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Calculator className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-sm">Cumplimiento Nóminas</CardTitle>
              <p className="text-xs text-muted-foreground">
                {lastCheck 
                  ? `Actualizado ${formatDistanceToNow(lastCheck, { locale: es, addSuffix: true })}`
                  : 'Sin verificar'
                }
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Compliance Score */}
        <div className="text-center">
          <div className={cn("text-3xl font-bold", getScoreColor(complianceScore))}>
            {complianceScore}%
          </div>
          <p className="text-xs text-muted-foreground">{getScoreLabel(complianceScore)}</p>
          <Progress 
            value={complianceScore} 
            className="h-2 mt-2"
          />
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-muted/50 text-center">
              <div className="text-lg font-semibold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 text-center">
              <div className="text-lg font-semibold text-warning">{stats.pending}</div>
              <div className="text-xs text-muted-foreground">Pendientes</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 text-center">
              <div className="text-lg font-semibold text-success">{stats.approved}</div>
              <div className="text-xs text-muted-foreground">Aprobados</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 text-center">
              <div className="text-lg font-semibold text-destructive">{stats.issues_detected}</div>
              <div className="text-xs text-muted-foreground">Incidencias</div>
            </div>
          </div>
        )}

        {/* Recent Issues */}
        {recentIssues.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">
              Incidencias recientes
            </h4>
            <ScrollArea className="h-[100px]">
              <div className="space-y-2">
                {recentIssues.map(item => (
                  <div 
                    key={item.id}
                    className="flex items-center gap-2 p-2 rounded-lg border bg-card text-xs"
                  >
                    <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.employee_name}</p>
                      <p className="text-muted-foreground truncate">
                        {item.compliance_issues[0]?.message || 'Discrepancia detectada'}
                      </p>
                    </div>
                    {item.total_difference !== 0 && (
                      <Badge 
                        variant={item.total_difference > 0 ? "default" : "destructive"}
                        className="text-xs shrink-0"
                      >
                        {item.total_difference > 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {Math.abs(item.total_difference).toFixed(0)}€
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Total Difference */}
        {stats && stats.total_difference !== 0 && (
          <div className={cn(
            "p-3 rounded-lg text-center",
            stats.total_difference > 0 ? "bg-success/10" : "bg-destructive/10"
          )}>
            <div className="flex items-center justify-center gap-1">
              {stats.total_difference > 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className={cn(
                "text-lg font-bold",
                stats.total_difference > 0 ? "text-success" : "text-destructive"
              )}>
                {stats.total_difference > 0 ? '+' : ''}{stats.total_difference.toFixed(2)}€
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Diferencia total detectada</p>
          </div>
        )}

        {/* Action Button */}
        {onNavigateToRecalculation && (
          <Button 
            variant="outline" 
            className="w-full" 
            size="sm"
            onClick={onNavigateToRecalculation}
          >
            Ver panel de recálculo
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default HRPayrollComplianceWidget;
