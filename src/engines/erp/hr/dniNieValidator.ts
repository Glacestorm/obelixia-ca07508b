/**
 * dniNieValidator — Shared DNI/NIE MOD 23 validation helper
 * V2-RRHH-P1.2: Extracted from afiArtifactEngine for cross-module reuse
 *
 * NO Supabase, NO React — pure function only.
 */

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

export interface DNINIEValidationResult {
  valid: boolean;
  type: 'DNI' | 'NIE';
  error: string | null;
}

/**
 * Validate a Spanish DNI or NIE using the MOD 23 algorithm.
 * - DNI: 8 digits + check letter
 * - NIE: X/Y/Z + 7 digits + check letter (X=0, Y=1, Z=2)
 */
export function validateDNINIE(value: string): DNINIEValidationResult {
  const c = value.trim().toUpperCase();

  // DNI: 8 digits + letter
  if (/^\d{8}[A-Z]$/.test(c)) {
    const num = parseInt(c.slice(0, 8), 10);
    const expectedLetter = DNI_LETTERS[num % 23];
    const actualLetter = c[8];
    if (actualLetter !== expectedLetter) {
      return { valid: false, type: 'DNI', error: `Letra incorrecta: esperada ${expectedLetter}, recibida ${actualLetter}` };
    }
    return { valid: true, type: 'DNI', error: null };
  }

  // NIE: X/Y/Z + 7 digits + letter
  if (/^[XYZ]\d{7}[A-Z]$/.test(c)) {
    const niePrefix: Record<string, string> = { X: '0', Y: '1', Z: '2' };
    const num = parseInt(niePrefix[c[0]] + c.slice(1, 8), 10);
    const expectedLetter = DNI_LETTERS[num % 23];
    const actualLetter = c[8];
    if (actualLetter !== expectedLetter) {
      return { valid: false, type: 'NIE', error: `Letra incorrecta: esperada ${expectedLetter}, recibida ${actualLetter}` };
    }
    return { valid: true, type: 'NIE', error: null };
  }

  return { valid: false, type: /^[XYZ]/.test(c) ? 'NIE' : 'DNI', error: 'Formato inválido: no coincide con DNI (8+1) ni NIE (X/Y/Z+7+1)' };
}
