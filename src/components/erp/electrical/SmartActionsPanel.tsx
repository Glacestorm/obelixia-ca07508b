/**
 * SmartActionsPanel - Energy 360 Next-Best-Action suggestions
 * Supports electricity, gas, solar and combined scenarios
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw,
  Loader2, Lightbulb, Clock, TrendingUp, Shield, Flame, Sun,
  Zap, Battery, GitCompareArrows, Target
} from 'lucide-react';
import { useEnergySmartActions, SmartAction } from '@/hooks/erp/useEnergySmartActions';
import { cn } from '@/lib/utils';

interface Props {
  companyId: string;
  onNavigateToCase?: (caseId: string) => void;
}

const URGENCY_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; }> = {
  critical: { label: 'Crítica', variant: 'destructive' },
  high: { label: 'Alta', variant: 'destructive' },
  medium: { label: 'Media', variant: 'secondary' },
  low: { label: 'Baja', variant: 'outline' },
};

const ACTION_ICONS: Record<string, typeof Sparkles> = {
  send_proposal: Lightbulb,
  renew_contract: Clock,
  renew_gas_contract: Flame,
  unblock_case: AlertTriangle,
  collect_docs: Shield,
  review_invoice: CheckCircle2,
  validate_savings: TrendingUp,
  validate_solar_savings: Sun,
  review_solar_compensation: Battery,
  review_solar_performance: Sun,
  consolidated_proposal: GitCompareArrows,
  priority_client: Target,
  follow_up: ArrowRight,
};

const ACTION_ENERGY_ICON: Record<string, typeof Zap> = {
  renew_gas_contract: Flame,
  review_solar_compensation: Sun,
  validate_solar_savings: Sun,
  review_solar_performance: Sun,
};

export function SmartActionsPanel({ companyId, onNavigateToCase }: Props) {
  const { actions, loading, computeActions, completeAction } = useEnergySmartActions(companyId);
  const [completing, setCompleting] = useState<string | null>(null);

  const handleComplete = async (id: string) => {
    setCompleting(id);
    await completeAction(id);
    setCompleting(null);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Acciones sugeridas
            {actions.length > 0 && <Badge variant="secondary" className="text-[10px]">{actions.length}</Badge>}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={computeActions} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && actions.length === 0 ? (
          <div className="py-6 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" /></div>
        ) : actions.length === 0 ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
            <p className="text-sm text-muted-foreground">Sin acciones pendientes. ¡Todo al día!</p>
          </div>
        ) : (
          <ScrollArea className="h-[350px]">
            <div className="space-y-2">
              {actions.slice(0, 12).map((action) => {
                const urgencyInfo = URGENCY_CONFIG[action.urgency] || URGENCY_CONFIG.medium;
                const ActionIcon = ACTION_ICONS[action.action_type] || Sparkles;
                const EnergyIcon = ACTION_ENERGY_ICON[action.action_type];
                return (
                  <div key={action.id} className={cn(
                    "p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors",
                    action.urgency === 'critical' && "border-destructive/30 bg-destructive/5"
                  )}>
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-1.5 rounded-md mt-0.5 relative",
                        action.urgency === 'critical' ? 'bg-destructive/10' : 'bg-primary/10'
                      )}>
                        <ActionIcon className={cn("h-4 w-4", action.urgency === 'critical' ? 'text-destructive' : 'text-primary')} />
                        {EnergyIcon && (
                          <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-background">
                            <EnergyIcon className="h-2.5 w-2.5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate">{action.title}</span>
                          <Badge variant={urgencyInfo.variant} className="text-[9px] shrink-0">{urgencyInfo.label}</Badge>
                        </div>
                        {action.description && <p className="text-xs text-muted-foreground mb-1.5">{action.description}</p>}
                        {action.estimated_savings != null && action.estimated_savings > 0 && (
                          <span className="text-xs text-emerald-600 font-medium">
                            Ahorro potencial: {action.estimated_savings.toLocaleString('es-ES')} €
                          </span>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {onNavigateToCase && (
                            <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => onNavigateToCase(action.case_id)}>
                              <ArrowRight className="h-3 w-3 mr-1" /> Ver expediente
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="h-6 text-xs px-2" disabled={completing === action.id} onClick={() => handleComplete(action.id)}>
                            {completing === action.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle2 className="h-3 w-3 mr-1" /> Hecho</>}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export default SmartActionsPanel;
