/**
 * B12.3B — Read-only deterministic advisor for suggesting Registry
 * equivalences for an operative agreement that appears as
 * MISSING_FROM_REGISTRY in the Centro de Convenios.
 *
 * STRICTLY READ-ONLY pure function. NO database access, NO edge invokes,
 * NO bridge / payroll / resolver / safety-gate imports. NO mutation of
 * flags, allow-list or operative tables. NO automatic linking.
 *
 * Scoring is deterministic — same input always yields same output.
 */

export interface AgreementMatchSignal {
  key: string;
  matched: boolean;
  weight: number;
  detail?: string;
}

export interface AgreementMatchCandidate {
  registryAgreementId: string;
  internalCode: string;
  officialName: string;
  score: number;
  signals: AgreementMatchSignal[];
  warnings: string[];
}

export interface OperativeAgreementInput {
  agreementCode?: string;
  name?: string;
  cnaeCodes?: string[];
  sector?: string;
  jurisdiction?: string;
}

export interface RegistryCandidateInput {
  id: string;
  internal_code: string;
  official_name: string;
  cnae_codes?: string[];
  jurisdiction_code?: string;
  source_quality?: string;
  data_completeness?: string;
  ready_for_payroll?: boolean;
}

export interface SuggestRegistryMatchesInput {
  operative: OperativeAgreementInput;
  registryCandidates: RegistryCandidateInput[];
}

const STRONG_KEYWORDS = [
  'consultoria',
  'tecnologias',
  'informacion',
  'estudios',
  'mercado',
  'opinion publica',
  'opinion',
  'publica',
];

const STATE_SCOPE_TOKENS = ['estatal', 'nacional', 'general'];

const MIN_SCORE = 50;

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeText(s: string | undefined | null): string {
  if (!s) return '';
  return stripDiacritics(String(s).toLowerCase())
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(s: string): Set<string> {
  return new Set(normalizeText(s).split(' ').filter((t) => t.length > 2));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function countStrongKeywordMatches(opName: string, regName: string): { matched: string[]; score: number } {
  const op = normalizeText(opName);
  const reg = normalizeText(regName);
  const matched: string[] = [];
  for (const kw of STRONG_KEYWORDS) {
    if (op.includes(kw) && reg.includes(kw)) matched.push(kw);
  }
  // Up to 25 points scaled by ratio over a target of 6 keyword hits.
  const score = Math.min(25, Math.round((matched.length / 6) * 25));
  return { matched, score };
}

function nameSimilarityScore(opName: string, regName: string): number {
  const a = tokenSet(opName);
  const b = tokenSet(regName);
  const j = jaccard(a, b);
  return Math.round(j * 40);
}

function cnaeOverlapScore(opCnae: string[] | undefined, regCnae: string[] | undefined): { overlap: string[]; score: number } {
  if (!opCnae?.length || !regCnae?.length) return { overlap: [], score: 0 };
  const set = new Set(opCnae.map((c) => String(c).trim()));
  const overlap = regCnae.map((c) => String(c).trim()).filter((c) => set.has(c));
  if (overlap.length === 0) return { overlap, score: 0 };
  // Up to 20 points; full score with 2+ overlapping codes.
  const score = Math.min(20, overlap.length >= 2 ? 20 : 12);
  return { overlap, score };
}

function stateScopeScore(operative: OperativeAgreementInput, reg: RegistryCandidateInput): { matched: boolean; score: number } {
  const opStr = normalizeText(`${operative.agreementCode ?? ''} ${operative.name ?? ''} ${operative.jurisdiction ?? ''}`);
  const regStr = normalizeText(`${reg.internal_code ?? ''} ${reg.official_name ?? ''} ${reg.jurisdiction_code ?? ''}`);
  const opIsState = STATE_SCOPE_TOKENS.some((t) => opStr.includes(t)) || /es(_|-)?es/i.test(operative.jurisdiction ?? '');
  const regIsState = STATE_SCOPE_TOKENS.some((t) => regStr.includes(t)) || (reg.jurisdiction_code ?? '').toUpperCase() === 'ES';
  const matched = opIsState && regIsState;
  return { matched, score: matched ? 10 : 0 };
}

function exactCodeScore(operative: OperativeAgreementInput, reg: RegistryCandidateInput): { matched: boolean; score: number } {
  const opCode = normalizeText(operative.agreementCode);
  const regInternal = normalizeText(reg.internal_code);
  if (!opCode || !regInternal) return { matched: false, score: 0 };
  const matched = opCode === regInternal;
  return { matched, score: matched ? 30 : 0 };
}

function buildWarnings(reg: RegistryCandidateInput): string[] {
  const warnings: string[] = [];
  warnings.push('Sugerencia automática: NO crea vínculo. Requiere revisión humana.');
  if (reg.data_completeness === 'metadata_only') {
    warnings.push('Registry está en estado metadata_only. No usable para nómina.');
  }
  if (reg.ready_for_payroll === false) {
    warnings.push('Registry no está ready_for_payroll.');
  } else if (reg.ready_for_payroll == null) {
    warnings.push('Registry sin estado ready_for_payroll definido.');
  }
  if (reg.source_quality && ['low', 'unknown'].includes(String(reg.source_quality).toLowerCase())) {
    warnings.push(`Calidad de fuente: ${reg.source_quality}.`);
  }
  return warnings;
}

export function suggestRegistryMatches(input: SuggestRegistryMatchesInput): AgreementMatchCandidate[] {
  const { operative, registryCandidates } = input;
  const out: AgreementMatchCandidate[] = [];

  for (const reg of registryCandidates ?? []) {
    const nameScore = nameSimilarityScore(operative.name ?? '', reg.official_name ?? '');
    const kw = countStrongKeywordMatches(operative.name ?? '', reg.official_name ?? '');
    const cnae = cnaeOverlapScore(operative.cnaeCodes, reg.cnae_codes);
    const scope = stateScopeScore(operative, reg);
    const code = exactCodeScore(operative, reg);

    const signals: AgreementMatchSignal[] = [
      {
        key: 'name_similarity',
        matched: nameScore > 0,
        weight: nameScore,
        detail: `Similitud nombre normalizado: ${nameScore}/40`,
      },
      {
        key: 'strong_keywords',
        matched: kw.matched.length > 0,
        weight: kw.score,
        detail: kw.matched.length ? `Palabras clave: ${kw.matched.join(', ')}` : 'Sin palabras clave fuertes',
      },
      {
        key: 'cnae_overlap',
        matched: cnae.overlap.length > 0,
        weight: cnae.score,
        detail: cnae.overlap.length ? `CNAE comunes: ${cnae.overlap.join(', ')}` : 'Sin CNAE compatibles',
      },
      {
        key: 'state_scope',
        matched: scope.matched,
        weight: scope.score,
        detail: scope.matched ? 'Ámbito estatal compatible' : 'Ámbito no marcado como estatal',
      },
      {
        key: 'exact_code',
        matched: code.matched,
        weight: code.score,
        detail: code.matched ? 'Código exacto coincide' : 'Códigos distintos',
      },
    ];

    const score = signals.reduce((acc, s) => acc + s.weight, 0);

    if (score < MIN_SCORE) continue;

    out.push({
      registryAgreementId: reg.id,
      internalCode: reg.internal_code,
      officialName: reg.official_name,
      score,
      signals,
      warnings: buildWarnings(reg),
    });
  }

  // Deterministic sort: score desc, then internal_code asc, then id asc.
  out.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.internalCode !== b.internalCode) return a.internalCode < b.internalCode ? -1 : 1;
    return a.registryAgreementId < b.registryAgreementId ? -1 : 1;
  });

  return out;
}

export default suggestRegistryMatches;
