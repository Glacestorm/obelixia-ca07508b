/**
 * CASUISTICA-FECHAS-01 — Fase C3B2
 * Diálogo de promoción de datos locales de la casuística (Fase B) a
 * incidencias persistentes en `erp_hr_payroll_incidents`.
 *
 * INVARIANTES:
 *  - Reutiliza `createPayrollIncident` (INSERT puro de C3B1). Sin update/upsert/delete/cancel.
 *  - No genera comunicaciones oficiales (FDI/AFI/DELT@); sólo flags pendientes.
 *  - No modifica el payload del motor de nómina ni los datos locales.
 *  - Confirmación explícita por checkbox + botón.
 *  - Creación secuencial (no Promise.all). Si una falla, continúa con las demás.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  ShieldOff,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  buildIncidentsFromLocalCasuistica,
  type PromotionCandidate,
  type PromotionResult,
} from '@/lib/hr/incidenciasPromotion';
import {
  usePayrollIncidentMutations,
  type NewPayrollIncidentInput,
} from '@/hooks/erp/hr/usePayrollIncidentMutations';
import type {
  CasuisticaState,
  CasuisticaDatesExtension,
} from '@/lib/hr/casuisticaTypes';
import type { PayrollIncidentRow } from '@/lib/hr/incidenciasTypes';

export interface HRPromoteLocalCasuisticaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  casuistica: CasuisticaState & Partial<CasuisticaDatesExtension>;
  existingIncidents: PayrollIncidentRow[];
  companyId: string;
  employeeId: string;
  periodYear: number;
  periodMonth: number;
  onPromoted?: (summary: {
    created: number;
    duplicated: number;
    skipped: number;
    failed: number;
  }) => void;
  /** Inyectable en tests para stubear la mutación. */
  mutationsHook?: typeof usePayrollIncidentMutations;
}

type FailedItem = {
  candidate: PromotionCandidate;
  message: string;
};

const SOURCE_LABEL: Record<PromotionCandidate['source'], string> = {
  pnr: 'PNR',
  reduccion: 'Reducción jornada',
  atrasos: 'Atrasos / regularización',
  it_at: 'IT / AT / EP',
  nacimiento: 'Nacimiento / cuidado del menor',
};

function candidateKey(c: PromotionCandidate, idx: number): string {
  const f = c.input?.applies_from ?? '';
  const t = c.input?.applies_to ?? '';
  return `${c.source}:${c.reason}:${f}:${t}:${idx}`;
}

export function HRPromoteLocalCasuisticaDialog({
  open,
  onOpenChange,
  casuistica,
  existingIncidents,
  companyId,
  employeeId,
  periodYear,
  periodMonth,
  onPromoted,
  mutationsHook,
}: HRPromoteLocalCasuisticaDialogProps) {
  const useMutations = mutationsHook ?? usePayrollIncidentMutations;
  const { createPayrollIncident, isCreating } = useMutations({
    companyId,
    employeeId,
    periodYear,
    periodMonth,
  });

  const result: PromotionResult = useMemo(
    () =>
      buildIncidentsFromLocalCasuistica({
        casuistica,
        context: { companyId, employeeId, periodYear, periodMonth },
        existingIncidents,
      }),
    [casuistica, companyId, employeeId, periodYear, periodMonth, existingIncidents],
  );

  // Selección por candidato (sólo aplica a `toCreate`).
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [failed, setFailed] = useState<FailedItem[]>([]);

  // Sembrar selección por defecto cada vez que cambian los candidatos
  // o el diálogo se vuelve a abrir.
  useEffect(() => {
    if (!open) return;
    const init: Record<string, boolean> = {};
    result.toCreate.forEach((c, i) => {
      init[candidateKey(c, i)] = true;
    });
    setSelected(init);
    setFailed([]);
    setProgress({ done: 0, total: 0 });
  }, [open, result]);

  const selectedCount = useMemo(
    () => result.toCreate.filter((c, i) => selected[candidateKey(c, i)]).length,
    [result.toCreate, selected],
  );

  const canSubmit = !running && !isCreating && selectedCount > 0;

  function toggle(key: string) {
    setSelected((s) => ({ ...s, [key]: !s[key] }));
  }

  async function handlePromote() {
    if (!canSubmit) return;
    const queue = result.toCreate.filter((c, i) => selected[candidateKey(c, i)]);
    setRunning(true);
    setProgress({ done: 0, total: queue.length });
    setFailed([]);

    let createdN = 0;
    const localFailed: FailedItem[] = [];

    for (let i = 0; i < queue.length; i++) {
      const c = queue[i];
      const input = c.input as NewPayrollIncidentInput;
      try {
        const res = await createPayrollIncident(input);
        if (res?.id) createdN += 1;
        else
          localFailed.push({
            candidate: c,
            message: 'No se pudo crear (ver detalles del backend).',
          });
      } catch (err) {
        localFailed.push({
          candidate: c,
          message: err instanceof Error ? err.message : 'Error desconocido',
        });
      }
      setProgress({ done: i + 1, total: queue.length });
    }

    setRunning(false);
    setFailed(localFailed);

    const summary = {
      created: createdN,
      duplicated: result.duplicates.length,
      skipped: result.skipped.length,
      failed: localFailed.length,
    };

    toast.success(
      `Promoción: ${summary.created} creada(s) · ${summary.duplicated} duplicada(s) · ${summary.skipped} omitida(s) · ${summary.failed} fallida(s).`,
    );

    if (localFailed.length === 0) {
      onPromoted?.(summary);
      onOpenChange(false);
    } else {
      // Mantener abierto para revisión.
      onPromoted?.(summary);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Promover datos locales a procesos persistidos</DialogTitle>
          <DialogDescription>
            Convierte los datos de la casuística local en incidencias
            persistidas. No modifica el cálculo de nómina ni envía
            comunicaciones oficiales.
          </DialogDescription>
        </DialogHeader>

        <div
          role="note"
          className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-warning-foreground"
        >
          <ShieldOff className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
          <p>
            Persistir estos procesos no recalcula la nómina, no envía
            comunicaciones oficiales y no sustituye los campos manuales
            actuales. Revisa los datos locales para evitar duplicidades.
          </p>
        </div>

        {!result.hasAny && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted/30 text-xs text-muted-foreground italic">
            <Info className="h-3.5 w-3.5" />
            Nada que promover desde la casuística local actual.
          </div>
        )}

        {/* Sección: a crear */}
        {result.toCreate.length > 0 && (
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground">
              Se crearán ({result.toCreate.length})
            </h4>
            <ul className="space-y-1.5">
              {result.toCreate.map((c, i) => {
                const k = candidateKey(c, i);
                return (
                  <li
                    key={k}
                    className="flex items-start gap-2 rounded-md border border-info/30 bg-info/5 p-2 text-xs"
                  >
                    <Checkbox
                      id={`prom-${k}`}
                      checked={selected[k] ?? false}
                      onCheckedChange={() => toggle(k)}
                      disabled={running}
                    />
                    <label htmlFor={`prom-${k}`} className="flex-1 cursor-pointer">
                      <span className="font-medium">{SOURCE_LABEL[c.source]}</span>
                      <span className="text-muted-foreground"> — {c.rationale}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Sección: duplicados */}
        {result.duplicates.length > 0 && (
          <section className="space-y-2">
            <Separator />
            <h4 className="text-xs font-semibold uppercase text-muted-foreground">
              Duplicados ({result.duplicates.length}) — no se crearán
            </h4>
            <ul className="space-y-1.5">
              {result.duplicates.map((c, i) => (
                <li
                  key={`dup-${i}`}
                  className="flex items-start gap-2 rounded-md border border-muted bg-muted/20 p-2 text-xs text-muted-foreground"
                >
                  <Info className="h-3.5 w-3.5 mt-0.5" />
                  <span>
                    <span className="font-medium text-foreground">
                      {SOURCE_LABEL[c.source]}
                    </span>{' '}
                    — {c.rationale}
                    {c.duplicateOfId && (
                      <span className="ml-1 text-[10px] opacity-70">
                        (id: {c.duplicateOfId})
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Sección: omitidos */}
        {result.skipped.length > 0 && (
          <section className="space-y-2">
            <Separator />
            <h4 className="text-xs font-semibold uppercase text-muted-foreground">
              Omitidos ({result.skipped.length})
            </h4>
            <ul className="space-y-1.5">
              {result.skipped.map((c, i) => (
                <li
                  key={`skip-${i}`}
                  className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-2 text-xs"
                >
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-warning" />
                  <span>
                    <span className="font-medium">{SOURCE_LABEL[c.source]}</span>{' '}
                    — {c.rationale}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Fallidos (post-ejecución) */}
        {failed.length > 0 && (
          <section className="space-y-2">
            <Separator />
            <h4 className="text-xs font-semibold uppercase text-destructive">
              Fallidos ({failed.length})
            </h4>
            <ul className="space-y-1.5">
              {failed.map((f, i) => (
                <li
                  key={`fail-${i}`}
                  className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive"
                >
                  <XCircle className="h-3.5 w-3.5 mt-0.5" />
                  <span>
                    <span className="font-medium">
                      {SOURCE_LABEL[f.candidate.source]}
                    </span>{' '}
                    — {f.message}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {running && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Creando {progress.done}/{progress.total}…
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={running}
          >
            Cerrar
          </Button>
          <Button
            type="button"
            onClick={handlePromote}
            disabled={!canSubmit}
            className="gap-1"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Promover seleccionados ({selectedCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HRPromoteLocalCasuisticaDialog;