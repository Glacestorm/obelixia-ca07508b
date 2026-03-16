/**
 * VersionHistoryPanel — Version chain viewer with state badges
 * V2-RRHH-FASE-2
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GitBranch, ArrowRight, User } from 'lucide-react';
import { useHRVersionRegistry, type VersionRecord } from '@/hooks/erp/hr/useHRVersionRegistry';
import {
  VERSION_STATE_LABELS,
  VERSION_STATE_COLORS,
  getValidTransitions,
  type VersionState,
} from '@/engines/erp/hr/ledgerEngine';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  companyId: string;
  entityType: string;
  entityId: string;
  title?: string;
  onTransition?: (versionId: string, newState: VersionState) => void;
  allowTransitions?: boolean;
}

export function VersionHistoryPanel({
  companyId,
  entityType,
  entityId,
  title = 'Historial de Versiones',
  onTransition,
  allowTransitions = false,
}: Props) {
  const { useVersionHistory, transitionState } = useHRVersionRegistry(companyId);
  const { data: versions = [], isLoading } = useVersionHistory(entityType, entityId);

  const handleTransition = async (versionId: string, newState: VersionState) => {
    const reason = prompt('Motivo del cambio de estado:');
    if (!reason) return;

    const success = await transitionState(versionId, newState, reason, entityType, entityId);
    if (success && onTransition) {
      onTransition(versionId, newState);
    }
  };

  if (versions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          {title}
          <Badge variant="outline" className="text-[10px] ml-auto">{versions.length} versiones</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Cargando...</div>
          ) : (
            <div className="space-y-2">
              {versions.map((version, idx) => (
                <VersionRow
                  key={version.id}
                  version={version}
                  isCurrent={idx === 0}
                  allowTransitions={allowTransitions}
                  onTransition={handleTransition}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function VersionRow({
  version,
  isCurrent,
  allowTransitions,
  onTransition,
}: {
  version: VersionRecord;
  isCurrent: boolean;
  allowTransitions: boolean;
  onTransition: (id: string, state: VersionState) => void;
}) {
  const validTransitions = getValidTransitions(version.state);

  return (
    <div className={cn(
      "p-3 rounded-lg border",
      isCurrent ? "border-primary/30 bg-primary/5" : "bg-card"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-primary">v{version.version_number}</span>
          <Badge className={cn("text-[10px]", VERSION_STATE_COLORS[version.state])}>
            {VERSION_STATE_LABELS[version.state]}
          </Badge>
          {isCurrent && <Badge variant="default" className="text-[10px]">actual</Badge>}
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(version.created_at), { locale: es, addSuffix: true })}
        </span>
      </div>

      {version.previous_state && (
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">
            {VERSION_STATE_LABELS[version.previous_state]}
          </Badge>
          <ArrowRight className="h-3 w-3" />
          <Badge variant="outline" className="text-[10px]">
            {VERSION_STATE_LABELS[version.state]}
          </Badge>
          {version.state_change_reason && (
            <span className="ml-1 italic">— {version.state_change_reason}</span>
          )}
        </div>
      )}

      {version.content_hash && (
        <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">
          hash: {version.content_hash.slice(0, 24)}…
        </p>
      )}

      {allowTransitions && validTransitions.length > 0 && (
        <div className="flex gap-1 mt-2">
          {validTransitions.map(state => (
            <TooltipProvider key={state}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => onTransition(version.id, state)}
                  >
                    → {VERSION_STATE_LABELS[state]}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Transicionar a {VERSION_STATE_LABELS[state]}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      )}
    </div>
  );
}
