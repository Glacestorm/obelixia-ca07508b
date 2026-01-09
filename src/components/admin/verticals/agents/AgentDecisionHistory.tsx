import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Brain,
  ThumbsUp,
  ThumbsDown,
  HelpCircle
} from 'lucide-react';
import { AgentDecision } from '@/hooks/admin/verticals/agents/useVerticalAgent';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AgentDecisionHistoryProps {
  decisions: AgentDecision[];
  onProvideFeedback?: (decisionId: string, feedback: 'correct' | 'incorrect') => void;
}

export function AgentDecisionHistory({ decisions, onProvideFeedback }: AgentDecisionHistoryProps) {
  const getOutcomeConfig = (outcome?: string) => {
    switch (outcome) {
      case 'success':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' };
      case 'failure':
        return { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' };
      default:
        return { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' };
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-orange-500';
  };

  if (decisions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <Brain className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">
          No hay decisiones registradas
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Las decisiones del agente aparecerán aquí
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {decisions.map((decision, index) => {
              const outcomeConfig = getOutcomeConfig(decision.outcome);
              const OutcomeIcon = outcomeConfig.icon;

              return (
                <div key={decision.id} className="relative pl-10">
                  {/* Timeline dot */}
                  <div className={cn(
                    "absolute left-2 w-4 h-4 rounded-full border-2 border-background",
                    outcomeConfig.bg,
                    "flex items-center justify-center"
                  )}>
                    <div className={cn("w-2 h-2 rounded-full", outcomeConfig.color.replace('text-', 'bg-'))} />
                  </div>

                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">{decision.action}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-xs font-medium",
                          getConfidenceColor(decision.confidence)
                        )}>
                          {Math.round(decision.confidence * 100)}% confianza
                        </span>
                        <OutcomeIcon className={cn("h-4 w-4", outcomeConfig.color)} />
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {decision.reasoning}
                    </p>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(decision.timestamp), { addSuffix: true, locale: es })}
                      </p>

                      {/* Feedback buttons */}
                      {onProvideFeedback && !decision.feedback && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground mr-2">¿Fue correcta?</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => onProvideFeedback(decision.id, 'correct')}
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => onProvideFeedback(decision.id, 'incorrect')}
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      {decision.feedback && (
                        <Badge 
                          variant={decision.feedback === 'correct' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {decision.feedback === 'correct' ? (
                            <>
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              Correcta
                            </>
                          ) : (
                            <>
                              <ThumbsDown className="h-3 w-3 mr-1" />
                              Incorrecta
                            </>
                          )}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

export default AgentDecisionHistory;
