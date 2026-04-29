/**
 * B7A — Collective Agreement Rules Parser (pure).
 *
 * Conservative regex-based extractor. Does NOT interpret complex
 * formulas. Anything ambiguous goes to `unresolvedFields` or
 * `warnings`.
 */

import type { ParsedAgreementRules } from './collectiveAgreementParserTypes';

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function snippet(text: string, idx: number, len = 120): string {
  const start = Math.max(0, idx - 20);
  return text.slice(start, start + len).trim();
}

function parseSpanishInt(s: string): number | null {
  const cleaned = s.replace(/[.\s]/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : null;
}

const NUMBER_WORDS_ES: Record<string, number> = {
  cero: 0, una: 1, uno: 1, un: 1, dos: 2, tres: 3, cuatro: 4,
  cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
};

function parseNumberOrWord(s: string): number | null {
  const trimmed = s.trim().toLowerCase();
  if (NUMBER_WORDS_ES[trimmed] != null) return NUMBER_WORDS_ES[trimmed];
  return parseSpanishInt(trimmed);
}

export function parseAgreementRulesFromText(rawText: string): ParsedAgreementRules {
  const text = normalize(rawText || '');
  const rules: ParsedAgreementRules = {
    unresolvedFields: [],
    warnings: [],
  };
  if (!text) {
    rules.warnings.push('EMPTY_TEXT');
    return rules;
  }

  // ---- Jornada anual ----
  const jornadaRe = /jornada\s+anual[^.;\n]*?(\d{1,2}[.,]?\d{0,3})\s*(?:horas|h\b)/i;
  const jm = text.match(jornadaRe);
  if (jm) {
    const n = parseSpanishInt(jm[1]);
    if (n != null && n >= 800 && n <= 2400) rules.jornadaAnualHours = n;
    else rules.unresolvedFields.push('jornadaAnualHours');
  }

  // ---- Vacaciones ----
  const vacRe = /(\d{1,3})\s*d[ií]as?\s*(naturales|laborables|h[aá]biles)?[^.;\n]*?vacacion/i;
  const vacRe2 = /vacacion[a-z]*[^.;\n]*?(\d{1,3})\s*d[ií]as?/i;
  const vm = text.match(vacRe) || text.match(vacRe2);
  if (vm) {
    const n = parseSpanishInt(vm[1]);
    if (n != null && n >= 1 && n <= 60) rules.vacacionesDays = n;
    else rules.unresolvedFields.push('vacacionesDays');
  }

  // ---- Pagas extra ----
  const pagasRe = /(\d{1,2}|dos|tres|cuatro)\s+pagas?\s+(extraordinarias?|extras?)/i;
  const pm = text.match(pagasRe);
  if (pm) {
    const n = parseNumberOrWord(pm[1]);
    if (n != null && n >= 0 && n <= 4) rules.extraPaymentsCount = n;
    else rules.unresolvedFields.push('extraPaymentsCount');
  } else if (/14\s+pagas/i.test(text)) {
    rules.extraPaymentsCount = 2;
  }
  if (/prorrate/i.test(text) && /paga/i.test(text)) {
    rules.extraPaymentsProrrateadas = true;
  }

  // ---- Antigüedad ----
  const antigIdx = text.toLowerCase().search(/antig[üu]edad/);
  if (antigIdx >= 0) {
    rules.antiguedadFormula = snippet(text, antigIdx, 160);
  }

  // ---- Horas extra ----
  const heIdx = text.toLowerCase().search(/horas?\s+extraordinarias?/);
  if (heIdx >= 0) {
    rules.horasExtraRule = snippet(text, heIdx, 160);
  }

  // ---- Nocturnidad ----
  const noctRe = /nocturnidad[^.;\n]*?(\d{1,3})\s*%/i;
  const nm = text.match(noctRe);
  if (nm) {
    const n = parseSpanishInt(nm[1]);
    if (n != null && n > 0 && n <= 100) rules.nocturnidadPercent = n;
    else rules.unresolvedFields.push('nocturnidadPercent');
  }

  // ---- Festivos ----
  const festIdx = text.toLowerCase().search(/festivos?/);
  if (festIdx >= 0) rules.festivosRule = snippet(text, festIdx, 160);

  // ---- IT complement ----
  const itIdx = text.toLowerCase().search(/incapacidad\s+temporal|complemento\s+it\b/);
  if (itIdx >= 0) rules.itComplementRule = snippet(text, itIdx, 180);

  // ---- Permisos ----
  const permisos: ParsedAgreementRules['permisosRules'] = [];
  const permisoRe = /(matrimonio|fallecimiento|nacimiento|mudanza|hospitalizaci[oó]n|lactancia|deber\s+inexcusable)[^.;\n]*?(\d{1,2})\s*d[ií]as?/gi;
  let pmatch: RegExpExecArray | null;
  while ((pmatch = permisoRe.exec(text)) !== null) {
    const days = parseSpanishInt(pmatch[2]);
    if (days != null) {
      permisos.push({
        kind: pmatch[1].toLowerCase(),
        days,
        sourceExcerpt: snippet(text, pmatch.index, 120),
      });
    }
  }
  if (permisos.length > 0) rules.permisosRules = permisos;

  // ---- Preaviso ----
  const preRe = /preaviso[^.;\n]*?(\d{1,3})\s*d[ií]as?/i;
  const prm = text.match(preRe);
  if (prm) {
    const n = parseSpanishInt(prm[1]);
    if (n != null && n >= 1 && n <= 180) rules.preavisoDays = n;
    else rules.unresolvedFields.push('preavisoDays');
  }

  // ---- Periodo de prueba ----
  const periodoRe = /periodo\s+de\s+prueba[^.;\n]*?(\d{1,3})\s*(d[ií]as?|meses?)/gi;
  const periodoMap: Record<string, number> = {};
  let prMatch: RegExpExecArray | null;
  let prCount = 0;
  while ((prMatch = periodoRe.exec(text)) !== null) {
    const n = parseSpanishInt(prMatch[1]);
    if (n == null) continue;
    const unit = /mes/i.test(prMatch[2]) ? 'meses' : 'dias';
    periodoMap[`generic_${++prCount}_${unit}`] = n;
  }
  if (Object.keys(periodoMap).length > 0) {
    rules.periodoPruebaDays = periodoMap;
  }

  return rules;
}