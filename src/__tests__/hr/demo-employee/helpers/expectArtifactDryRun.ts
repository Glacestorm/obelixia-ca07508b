import { expect } from 'vitest';

export interface ArtifactLike {
  // Cualquier shape razonable de artefacto oficial preparatorio.
  mode?: string;
  status?: string;
  submitted?: boolean;
  accepted?: boolean;
  isRealSubmissionBlocked?: boolean | (() => boolean);
  hash?: string;
  sha256?: string;
  generatedAt?: string;
  timestamp?: string;
  organismo?: string;
  organism?: string;
  fileName?: string;
  filename?: string;
  artifactType?: string;
  type?: string;
  [key: string]: unknown;
}

export interface ExpectArtifactDryRunOptions {
  label?: string;
  /** Si se especifica, se exige que `artifact.organismo` (o equivalente) lo iguale. */
  expectedOrganism?: string;
  /** Si se especifica, se exige que el tipo de artefacto coincida (case-insensitive substring). */
  expectedType?: string;
}

/**
 * Validador defensivo de artefactos oficiales en modo DRYRUN/preview.
 *
 * Reglas mínimas:
 *  - el artefacto NO debe estar `submitted` ni `accepted` salvo que `isRealSubmissionBlocked`
 *    esté presente y devuelva true (modo evidencia interna preparatoria).
 *  - si existe `mode`, debe ser uno de los valores DRYRUN aceptados.
 *  - si existe `status`, no debe ser un estado oficial firme.
 *  - si existe `hash` o `sha256`, debe ser una cadena no vacía.
 *  - si existe `generatedAt` o `timestamp`, debe parsear como fecha.
 *  - si existe `organismo` / `organism` / `fileName` / `filename`, deben ser cadenas no vacías.
 */
export function expectArtifactDryRun(
  artifact: ArtifactLike,
  options: ExpectArtifactDryRunOptions = {},
): void {
  const label = options.label ? `[${options.label}] ` : '';

  expect(artifact, `${label}artifact requerido`).toBeTruthy();

  // 1. Modo
  const dryRunModes = new Set([
    'dry_run',
    'dryrun',
    'preview',
    'internal_ready',
    'preparatory',
    'sandbox',
  ]);
  if (artifact.mode !== undefined) {
    expect(
      dryRunModes.has(String(artifact.mode).toLowerCase()),
      `${label}mode inesperado: ${artifact.mode}`,
    ).toBe(true);
  }

  // 2. Estados oficiales firmes prohibidos
  const forbiddenStatuses = new Set([
    'submitted',
    'accepted',
    'official_ready',
    'sent',
    'confirmed_official',
  ]);
  if (artifact.status !== undefined) {
    expect(
      !forbiddenStatuses.has(String(artifact.status).toLowerCase()),
      `${label}status oficial prohibido: ${artifact.status}`,
    ).toBe(true);
  }

  // 3. Bandera explícita de envío real
  const submitted = artifact.submitted === true;
  const accepted = artifact.accepted === true;
  const blocked =
    typeof artifact.isRealSubmissionBlocked === 'function'
      ? artifact.isRealSubmissionBlocked()
      : artifact.isRealSubmissionBlocked === true;

  if (submitted || accepted) {
    expect(
      blocked,
      `${label}artefacto marcado como submitted/accepted sin isRealSubmissionBlocked === true`,
    ).toBe(true);
  }

  // 4. Hash / sha256 si existen
  for (const key of ['hash', 'sha256'] as const) {
    const v = artifact[key];
    if (v !== undefined) {
      expect(typeof v === 'string' && v.length > 0, `${label}${key} vacío`).toBe(true);
    }
  }

  // 5. Timestamp si existe
  for (const key of ['generatedAt', 'timestamp'] as const) {
    const v = artifact[key];
    if (v !== undefined) {
      const t = Date.parse(String(v));
      expect(!Number.isNaN(t), `${label}${key} no es fecha válida: ${v}`).toBe(true);
    }
  }

  // 6. Organismo / fichero
  for (const key of ['organismo', 'organism', 'fileName', 'filename'] as const) {
    const v = artifact[key];
    if (v !== undefined) {
      expect(typeof v === 'string' && v.length > 0, `${label}${key} vacío`).toBe(true);
    }
  }

  // 7. Asserts opcionales solicitados por el caller
  if (options.expectedOrganism) {
    const got = String(artifact.organismo ?? artifact.organism ?? '').toLowerCase();
    expect(
      got.includes(options.expectedOrganism.toLowerCase()),
      `${label}organismo esperado "${options.expectedOrganism}", encontrado "${got}"`,
    ).toBe(true);
  }
  if (options.expectedType) {
    const got = String(artifact.artifactType ?? artifact.type ?? '').toLowerCase();
    expect(
      got.includes(options.expectedType.toLowerCase()),
      `${label}tipo esperado "${options.expectedType}", encontrado "${got}"`,
    ).toBe(true);
  }
}