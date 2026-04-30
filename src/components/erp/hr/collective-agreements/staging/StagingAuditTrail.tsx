import { ScrollArea } from '@/components/ui/scroll-area';
import type { StagingAuditEntry } from '@/hooks/erp/hr/useTicNacSalaryTableStaging';

export interface StagingAuditTrailProps {
  entries: StagingAuditEntry[];
  rowId?: string;
}

export function StagingAuditTrail({ entries, rowId }: StagingAuditTrailProps) {
  const filtered = rowId ? entries.filter((e) => e.staging_row_id === rowId) : entries;
  if (filtered.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Sin registros de auditoría todavía.</p>
    );
  }
  return (
    <ScrollArea className="h-[260px] rounded-md border">
      <ul className="divide-y">
        {filtered.map((e) => (
          <li key={e.id} className="flex items-center justify-between px-3 py-2 text-xs">
            <div className="space-y-0.5">
              <p className="font-medium">{e.action}</p>
              <p className="text-muted-foreground">
                {e.actor_id ? `actor: ${e.actor_id}` : 'actor: sistema'}
              </p>
            </div>
            <span className="text-muted-foreground">
              {new Date(e.created_at).toLocaleString('es-ES')}
            </span>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}

export default StagingAuditTrail;