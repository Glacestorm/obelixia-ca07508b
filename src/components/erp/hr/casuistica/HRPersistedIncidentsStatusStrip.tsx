/**
 * CASUISTICA-FECHAS-01 — UI hardening
 * Franja informativa NO interactiva que sustituye a los antiguos chips
 * "Read-only" y "Sin envíos oficiales" en `HRPersistedIncidentsPanel`.
 *
 * Objetivo:
 *  - Comunicar el estado operativo del panel sin parecer un botón, tab o
 *    filtro.
 *  - Dejar legalmente claro que la información es preview/solo lectura y
 *    que NO se generan comunicaciones oficiales a TGSS, SEPE, AEAT, INSS
 *    o DELT@.
 *
 * Invariantes:
 *  - 100% presentacional. Sin estado, sin handlers, sin escrituras.
 *  - No introduce roles interactivos (no role="button"/"tab").
 *  - Iconos decorativos (`aria-hidden`).
 */

import { Eye, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HRPersistedIncidentsStatusStripProps {
  className?: string;
}

export function HRPersistedIncidentsStatusStrip({
  className,
}: HRPersistedIncidentsStatusStripProps) {
  return (
    <div
      data-testid="hr-persisted-status-strip"
      className={cn(
        'mt-1 rounded-md border border-border/60 bg-muted/40 px-2.5 py-2',
        'text-[11px] leading-snug text-muted-foreground',
        'select-text cursor-default',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-medium text-foreground/80">
        <span className="inline-flex items-center gap-1">
          <Eye aria-hidden="true" className="h-3 w-3" />
          Estado operativo: Preview persistido
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-[10.5px]">
        <span className="inline-flex items-center gap-1">
          <Lock aria-hidden="true" className="h-2.5 w-2.5" />
          Solo lectura
        </span>
        <span aria-hidden="true" className="text-muted-foreground/60">·</span>
        <span>Cálculo oficial sin cambios</span>
        <span aria-hidden="true" className="text-muted-foreground/60">·</span>
        <span className="inline-flex items-center gap-1">
          <ShieldCheck aria-hidden="true" className="h-2.5 w-2.5" />
          Comunicaciones oficiales desactivadas
        </span>
      </div>
      <p className="mt-1 text-[10.5px] text-muted-foreground">
        Los procesos persistidos se muestran para revisión y trazabilidad.
        Hasta completar la validación legal/manual, no sustituyen la fuente
        oficial de cálculo ni generan comunicaciones a TGSS, SEPE, AEAT,
        INSS o DELT@.
      </p>
    </div>
  );
}

export default HRPersistedIncidentsStatusStrip;