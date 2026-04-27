/**
 * CASUISTICA-FECHAS-01 — Fase C3C
 * Test estático: garantiza que en el área de casuística no existe ningún
 * `.delete(` funcional. Soft-delete vía UPDATE es la única vía permitida.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Alcance estricto C3C: archivos de casuística + el hook de mutaciones
 * específico de incidencias persistidas. Otros hooks de RRHH (modelo190,
 * official integrations, ledger, payroll engine) están fuera de este alcance.
 */
const FILE_TARGETS = [
  'src/hooks/erp/hr/usePayrollIncidentMutations.ts',
  'src/hooks/erp/hr/useHRPayrollIncidencias.ts',
];
const DIR_TARGETS = [
  'src/components/erp/hr/casuistica',
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function stripCommentsAndStrings(src: string): string {
  // Quita strings y comentarios para evitar falsos positivos.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/`(?:\\.|[^`\\])*`/g, '``')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

describe('CASUISTICA C3C — no DELETE físico en casuística', () => {
  it('no existe `.delete(` funcional en hooks/components de casuística', () => {
    const files = [
      ...FILE_TARGETS,
      ...DIR_TARGETS.flatMap((r) => walk(r)),
    ];
    const offenders: Array<{ file: string; line: number; text: string }> = [];
    for (const f of files) {
      const raw = readFileSync(f, 'utf8');
      const cleaned = stripCommentsAndStrings(raw);
      const lines = cleaned.split('\n');
      lines.forEach((ln, i) => {
        if (/\.delete\s*\(/.test(ln)) {
          offenders.push({ file: f, line: i + 1, text: ln.trim() });
        }
      });
    }
    if (offenders.length > 0) {
      const msg = offenders
        .map((o) => `${o.file}:${o.line} → ${o.text}`)
        .join('\n');
      throw new Error(`Se encontraron usos de .delete( en casuística:\n${msg}`);
    }
    expect(offenders.length).toBe(0);
  });
});