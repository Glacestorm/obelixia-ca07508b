/**
 * CASUISTICA-FECHAS-01 — Fase C3B3A
 * Panel de visualización de conflictos local vs persistido.
 *
 * INVARIANTES:
 *  - Render-only. Sin botones que muten datos.
 *  - No bloquea el cierre.
 *  - No altera el payload del motor de nómina.
 *  - No genera comunicaciones oficiales.
 */

import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  EffectiveResult,
  EffectiveMode,
  CasuisticaConflict,
} from '@/lib/hr/effectiveCasuistica';

export interface HRCasuisticaConflictsPanelProps {
  result: EffectiveResult;
  mode: EffectiveMode;
  className?: string;
}

const PROCESS_LABEL: Record<CasuisticaConflict['process'], string> = {
  pnr: 'PNR',
  reduccion: 'Reducción jornada',
  atrasos: 'Atrasos / regularización',
  it_at: 'IT / AT / EP',
  nacimiento: 'Nacimiento / cuidado menor',
};

function formatValue(v: number | string): string {
  if (typeof v === 'number') {
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
  }
  return v || '—';
}

function SourceBadge({ src }: { src: CasuisticaConflict['resolvedSource'] }) {
  if (src === 'persisted') {
    return (
      <Badge variant="info" className="text-[10px] gap-1">
        Persistido prioridad
      </Badge>
    );
  }
  if (src === 'manual_override') {
    return (
      <Badge variant="warning" className="text-[10px] gap-1">
        Manual override
      </Badge>
    );
  }
  return (
    <Badge variant="muted" className="text-[10px] gap-1">
      Local
    </Badge>
  );
}

export function HRCasuisticaConflictsPanel({
  result,
  mode,
  className,
}: HRCasuisticaConflictsPanelProps) {
  const { conflicts, unmappedInformative, ignoredLocal, blockingForClose } = result;
  const hasConflicts = conflicts.length > 0;
  const hasUnmapped = unmappedInformative.length > 0;

  if (!hasConflicts && !hasUnmapped && !blockingForClose) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-md border border-warning/40 bg-warning/5 p-3 space-y-2',
        className,
      )}
      data-testid="hr-casuistica-conflicts-panel"
    >
      {/* Banner */}
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
        <div className="text-[11px] space-y-1">
          <p className="font-medium text-warning">
            Existen datos locales y procesos persistidos para los mismos conceptos.
          </p>
          <p className="text-muted-foreground">
            Para evitar doble conteo, el cálculo debe usar una única fuente por
            campo. Modo activo:{' '}
            <span className="font-mono font-medium">{mode}</span>.
          </p>
          <p className="text-muted-foreground italic">
            <Info className="h-2.5 w-2.5 inline mr-0.5" />
            Vista informativa. El cálculo actual sigue usando datos locales hasta
            C3B3B.
          </p>
        </div>
      </div>

      {/* Tabla de conflictos */}
      {hasConflicts && (
        <div className="rounded-md border bg-card overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-2 py-1.5">Tipo</th>
                <th className="text-left font-medium px-2 py-1.5">Local</th>
                <th className="text-left font-medium px-2 py-1.5">Persistido</th>
                <th className="text-left font-medium px-2 py-1.5">Fuente propuesta</th>
                <th className="text-left font-medium px-2 py-1.5">Revisión legal</th>
                <th className="text-left font-medium px-2 py-1.5">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {conflicts.map((c, i) => (
                <tr key={`${c.field}-${i}`} className="border-t border-border/60">
                  <td className="px-2 py-1.5 font-medium">
                    {PROCESS_LABEL[c.process] ?? c.process}
                  </td>
                  <td className="px-2 py-1.5 tabular-nums">
                    {formatValue(c.localValue)}
                  </td>
                  <td className="px-2 py-1.5 tabular-nums">
                    {formatValue(c.persistedValue)}
                  </td>
                  <td className="px-2 py-1.5">
                    <SourceBadge src={c.resolvedSource} />
                  </td>
                  <td className="px-2 py-1.5">
                    {c.legalReviewRequired ? (
                      <Badge variant="warning" className="text-[10px] gap-1">
                        <ShieldAlert className="h-2.5 w-2.5" />
                        Requiere revisión legal
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground">{c.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Local ignorado en cálculo (informativo) */}
      {ignoredLocal.length > 0 && (
        <div className="text-[10px] text-muted-foreground">
          <span className="font-medium uppercase">Local ignorado en cálculo: </span>
          {ignoredLocal.map((i) => i.field).join(', ')}
        </div>
      )}

      {/* Unmapped informativos */}
      {hasUnmapped && (
        <div className="rounded-md border bg-card p-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">
            No aplicado al cálculo
          </p>
          <ul className="space-y-1">
            {unmappedInformative.map((u) => (
              <li
                key={`${u.source}-${u.recordId}`}
                className="flex items-center gap-2 text-[11px]"
              >
                <Badge variant="muted" className="text-[10px]">
                  No aplicado al motor
                </Badge>
                <span className="text-muted-foreground">
                  {u.incidentType ?? '—'} ({u.source})
                </span>
                {u.legalReviewRequired && (
                  <Badge variant="warning" className="text-[10px] gap-1">
                    <ShieldAlert className="h-2.5 w-2.5" />
                    Revisión legal
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default HRCasuisticaConflictsPanel;