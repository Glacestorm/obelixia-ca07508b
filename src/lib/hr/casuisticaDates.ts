/**
 * CASUISTICA-FECHAS-01 — Fase C2
 * Helpers puros de fechas para la casuística entre fechas.
 *
 * - Sin Date.now(), sin acceso a red, sin Supabase.
 * - Determinista.
 * - Formato estricto YYYY-MM-DD (UTC) para evitar parseos ambiguos por TZ.
 *
 * NO modifica el motor de nómina. NO escribe en BD. Sólo aritmética de fechas.
 */

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

function parseISODateUTC(value: string): Date | null {
  if (!ISO_RE.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Calcula días naturales inclusivos entre dos fechas YYYY-MM-DD.
 * - Mismo día → 1.
 * - 2026-03-01 a 2026-03-31 → 31.
 * - Faltan fechas o formato inválido → null.
 * - Rango invertido (to < from) → null.
 */
export function calculateInclusiveDays(
  from?: string | null,
  to?: string | null,
): number | null {
  if (!from || !to) return null;
  const fromDate = parseISODateUTC(from);
  const toDate = parseISODateUTC(to);
  if (!fromDate || !toDate) return null;
  if (toDate.getTime() < fromDate.getTime()) return null;
  const diff = Math.round((toDate.getTime() - fromDate.getTime()) / MS_PER_DAY);
  return diff + 1;
}

/**
 * Devuelve true si ambas fechas están informadas, son válidas, y el rango
 * está invertido (to < from). Útil para warning visual sin romper UI.
 * Si falta una fecha o el formato no es estricto → false.
 */
export function isInvertedRange(
  from?: string | null,
  to?: string | null,
): boolean {
  if (!from || !to) return false;
  if (!ISO_RE.test(from) || !ISO_RE.test(to)) return false;
  return to < from;
}

/**
 * Devuelve los límites del periodo de nómina (mes natural completo).
 * year: 2026, month: 1..12.
 * Ejemplo: getPeriodBounds(2026, 3) → { start: '2026-03-01', end: '2026-03-31' }.
 */
export function getPeriodBounds(
  year: number,
  month: number,
): { start: string; end: string } {
  const m = String(month).padStart(2, '0');
  // Día 0 del mes siguiente = último día del mes actual (UTC).
  const lastDayDate = new Date(Date.UTC(year, month, 0));
  const lastDay = String(lastDayDate.getUTCDate()).padStart(2, '0');
  return { start: `${year}-${m}-01`, end: `${year}-${m}-${lastDay}` };
}

/**
 * Días naturales de la intersección entre [from..to] y [periodStart..periodEnd]
 * (todos inclusivos). Si no hay solape o las fechas son inválidas → 0.
 *
 * Si `to` es null/undefined se trata como "abierto" → se interpreta como
 * `periodEnd` para procesos en curso (ej. IT sin fecha de alta).
 */
export function getDateIntersectionDays(
  from: string | null | undefined,
  to: string | null | undefined,
  periodStart: string,
  periodEnd: string,
): number {
  if (!from) return 0;
  const fromDate = parseISODateUTC(from);
  const psDate = parseISODateUTC(periodStart);
  const peDate = parseISODateUTC(periodEnd);
  if (!fromDate || !psDate || !peDate) return 0;
  if (peDate.getTime() < psDate.getTime()) return 0;

  const toEffective = to && ISO_RE.test(to) ? to : periodEnd;
  const toDate = parseISODateUTC(toEffective);
  if (!toDate) return 0;
  if (toDate.getTime() < fromDate.getTime()) return 0;

  const startMs = Math.max(fromDate.getTime(), psDate.getTime());
  const endMs = Math.min(toDate.getTime(), peDate.getTime());
  if (endMs < startMs) return 0;

  const diff = Math.round((endMs - startMs) / MS_PER_DAY);
  return diff + 1;
}
