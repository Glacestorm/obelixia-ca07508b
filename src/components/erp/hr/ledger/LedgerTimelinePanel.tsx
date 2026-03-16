/**
 * LedgerTimelinePanel — Chronological timeline of HR ledger events
 * V2-RRHH-FASE-2: Minimal viable UI for auditable event history
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  History, Shield, RefreshCw, Search, ChevronDown, ChevronRight,
  AlertTriangle, RotateCcw, FileText, Lock, Unlock
} from 'lucide-react';
import { useHRLedger, type LedgerEntry } from '@/hooks/erp/hr/useHRLedger';
import { LEDGER_EVENT_LABELS, type LedgerEventType } from '@/engines/erp/hr/ledgerEngine';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  companyId: string;
  entityType?: string;
  entityId?: string;
  processId?: string;
  title?: string;
  maxHeight?: string;
}

const EVENT_ICON_MAP: Partial<Record<LedgerEventType, typeof History>> = {
  payroll_closed: Lock,
  payroll_reopened: Unlock,
  payroll_rectified: RotateCcw,
  document_generated: FileText,
  document_uploaded: FileText,
  rectification_issued: AlertTriangle,
  reversion_applied: RotateCcw,
};

const EVENT_COLOR_MAP: Partial<Record<LedgerEventType, string>> = {
  payroll_closed: 'border-l-emerald-500',
  payroll_reopened: 'border-l-orange-500',
  payroll_rectified: 'border-l-amber-500',
  rectification_issued: 'border-l-amber-500',
  reversion_applied: 'border-l-red-500',
  employee_created: 'border-l-blue-500',
  contract_created: 'border-l-indigo-500',
  salary_changed: 'border-l-purple-500',
  document_generated: 'border-l-sky-500',
  period_closed: 'border-l-emerald-500',
  period_reopened: 'border-l-orange-500',
};

export function LedgerTimelinePanel({
  companyId,
  entityType,
  entityId,
  processId,
  title = 'Registro de Eventos',
  maxHeight = '600px',
}: Props) {
  const { useTimeline } = useHRLedger(companyId);
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: events = [], isLoading, refetch } = useTimeline({
    entityType,
    entityId,
    processId,
    limit: 200,
  });

  const filtered = useMemo(() => {
    let result = events;
    if (filterType !== 'all') {
      result = result.filter(e => e.event_type === filterType);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(e =>
        e.event_label.toLowerCase().includes(s) ||
        e.entity_type.toLowerCase().includes(s) ||
        e.entity_id.toLowerCase().includes(s)
      );
    }
    return result;
  }, [events, filterType, search]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(events.map(e => e.event_type));
    return Array.from(types).sort();
  }, [events]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {events.length} eventos · Ledger inmutable
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3 w-3" /> Inmutable
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar eventos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="Tipo de evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {uniqueTypes.map(t => (
                <SelectItem key={t} value={t}>
                  {LEDGER_EVENT_LABELS[t as LedgerEventType] || t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <ScrollArea style={{ maxHeight }}>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Cargando eventos...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <History className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Sin eventos registrados</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map(event => (
                <EventRow
                  key={event.id}
                  event={event}
                  isExpanded={expandedId === event.id}
                  onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ─── Event Row Component ─────────────────────────────────────────────────────

function EventRow({
  event,
  isExpanded,
  onToggle,
}: {
  event: LedgerEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const Icon = EVENT_ICON_MAP[event.event_type] ?? History;
  const borderColor = EVENT_COLOR_MAP[event.event_type] ?? 'border-l-muted-foreground/30';
  const hasFlags = event.is_rectification || event.is_reopening || event.is_reversion || event.is_reemission;
  const hasSnapshots = event.before_snapshot || event.after_snapshot;

  return (
    <div className={cn(
      "border-l-4 rounded-r-lg bg-card hover:bg-muted/30 transition-colors",
      borderColor,
    )}>
      <button
        className="w-full text-left px-3 py-2.5 flex items-start gap-3"
        onClick={onToggle}
      >
        <div className="mt-0.5 shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{event.event_label}</span>
            {hasFlags && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    {event.is_rectification && <div>Rectificación</div>}
                    {event.is_reopening && <div>Reapertura</div>}
                    {event.is_reversion && <div>Reversión</div>}
                    {event.is_reemission && <div>Reemisión</div>}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
            <code className="bg-muted px-1 rounded">{event.entity_type}</code>
            <span>·</span>
            <span>{formatDistanceToNow(new Date(event.created_at), { locale: es, addSuffix: true })}</span>
            {event.source_module !== 'hr' && (
              <>
                <span>·</span>
                <span>{event.source_module}</span>
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 mt-1">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Entidad:</span>{' '}
              <code className="bg-muted px-1 rounded">{event.entity_id.slice(0, 12)}…</code>
            </div>
            {event.process_id && (
              <div>
                <span className="text-muted-foreground">Proceso:</span>{' '}
                <code className="bg-muted px-1 rounded">{event.process_id.slice(0, 12)}…</code>
              </div>
            )}
            {event.actor_role && (
              <div>
                <span className="text-muted-foreground">Rol:</span> {event.actor_role}
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Hash:</span>{' '}
              <code className="bg-muted px-1 rounded font-mono">{event.immutable_hash.slice(0, 16)}…</code>
            </div>
          </div>

          {event.changed_fields && event.changed_fields.length > 0 && (
            <div className="text-xs">
              <span className="text-muted-foreground">Campos modificados:</span>{' '}
              {event.changed_fields.map(f => (
                <Badge key={f} variant="outline" className="text-[10px] mr-1">{f}</Badge>
              ))}
            </div>
          )}

          {hasSnapshots && (
            <div className="text-xs">
              <span className="text-muted-foreground">Snapshots:</span>{' '}
              {event.before_snapshot && <Badge variant="outline" className="text-[10px] mr-1">before</Badge>}
              {event.after_snapshot && <Badge variant="outline" className="text-[10px] mr-1">after</Badge>}
            </div>
          )}

          {event.financial_impact && (
            <div className="text-xs">
              <span className="text-muted-foreground">Impacto financiero:</span>{' '}
              <code className="bg-muted px-1 rounded">{JSON.stringify(event.financial_impact)}</code>
            </div>
          )}

          <div className="text-[10px] text-muted-foreground/60 font-mono">
            {format(new Date(event.created_at), "yyyy-MM-dd HH:mm:ss.SSS", { locale: es })}
          </div>
        </div>
      )}
    </div>
  );
}
