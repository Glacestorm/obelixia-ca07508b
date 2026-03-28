/**
 * LegalProcedureCard - Tarjeta de trámite legal con seguimiento de pasos
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  ExternalLink, Clock, CheckCircle2, AlertTriangle, XCircle, 
  ChevronDown, ChevronUp, Gavel, ArrowRight, Ban
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { LegalProcedure } from '@/hooks/erp/legal/useLegalProcedures';

interface LegalProcedureCardProps {
  procedure: LegalProcedure;
  onCancel?: (id: string) => void;
  onNavigate?: (link: string) => void;
  compact?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  initiated: { label: 'Iniciado', color: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: Clock },
  pending_review: { label: 'Pendiente revisión', color: 'bg-amber-500/10 text-amber-600 border-amber-200', icon: AlertTriangle },
  in_progress: { label: 'En curso', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200', icon: ArrowRight },
  awaiting_approval: { label: 'Esperando aprobación', color: 'bg-purple-500/10 text-purple-600 border-purple-200', icon: Gavel },
  completed: { label: 'Completado', color: 'bg-green-500/10 text-green-600 border-green-200', icon: CheckCircle2 },
  rejected: { label: 'Rechazado', color: 'bg-red-500/10 text-red-600 border-red-200', icon: XCircle },
  cancelled: { label: 'Cancelado', color: 'bg-muted text-muted-foreground border-border', icon: Ban },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  normal: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  critical: 'bg-red-100 text-red-600',
};

export function LegalProcedureCard({ procedure, onCancel, onNavigate, compact = false }: LegalProcedureCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = STATUS_CONFIG[procedure.status] || STATUS_CONFIG.initiated;
  const StatusIcon = status.icon;
  const progress = procedure.total_steps > 0 
    ? (procedure.current_step / procedure.total_steps) * 100 
    : 0;
  const isTerminal = ['completed', 'rejected', 'cancelled'].includes(procedure.status);

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-sm border",
      isTerminal && "opacity-70"
    )}>
      <CardContent className={cn("p-3", compact && "p-2")}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <StatusIcon className="h-4 w-4 flex-shrink-0" />
            <div className="min-w-0">
              <p className={cn("font-medium truncate", compact ? "text-xs" : "text-sm")}>
                {procedure.title}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(procedure.created_at), { addSuffix: true, locale: es })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", status.color)}>
              {status.label}
            </Badge>
            <Badge className={cn("text-[10px] px-1.5 py-0", PRIORITY_COLORS[procedure.priority])}>
              {procedure.priority}
            </Badge>
          </div>
        </div>

        {/* Progress */}
        {procedure.total_steps > 0 && !isTerminal && (
          <div className="mt-2">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Paso {procedure.current_step} de {procedure.total_steps}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Actions row */}
        <div className="mt-2 flex items-center gap-1">
          {procedure.module_deep_link && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] gap-1"
              onClick={() => onNavigate?.(procedure.module_deep_link!)}
            >
              <ExternalLink className="h-3 w-3" />
              Ir al módulo
            </Button>
          )}
          {procedure.routed_to_agent && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              🤖 {procedure.routed_to_agent}
            </Badge>
          )}
          {procedure.routed_to_supervisor && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              👤 {procedure.routed_to_supervisor}
            </Badge>
          )}
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {procedure.description && (
              <p className="text-xs text-muted-foreground">{procedure.description}</p>
            )}

            {procedure.legal_basis && procedure.legal_basis.length > 0 && (
              <div>
                <p className="text-[10px] font-medium mb-1">Base legal:</p>
                <div className="flex flex-wrap gap-1">
                  {procedure.legal_basis.map((ref, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                      {ref}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Steps */}
            {procedure.steps && procedure.steps.length > 0 && (
              <div>
                <p className="text-[10px] font-medium mb-1">Pasos del trámite:</p>
                <div className="space-y-1">
                  {procedure.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      {step.status === 'completed' ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                      ) : i === procedure.current_step ? (
                        <ArrowRight className="h-3 w-3 text-primary flex-shrink-0" />
                      ) : (
                        <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={cn(
                        step.status === 'completed' && "line-through text-muted-foreground",
                        i === procedure.current_step && "font-medium text-primary"
                      )}>
                        {step.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {procedure.routing_reasoning && (
              <p className="text-[10px] text-muted-foreground italic">
                ⚠️ {procedure.routing_reasoning}
              </p>
            )}

            {!isTerminal && onCancel && (
              <Button
                variant="destructive"
                size="sm"
                className="h-6 text-[10px] w-full"
                onClick={() => onCancel(procedure.id)}
              >
                Cancelar trámite
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LegalProcedureCard;
