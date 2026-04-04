export interface CrossValidationInput {
  employee: { id: string; cotization_group: number; cotization_base: number; irpf_rate: number };
  contract: { type: string; part_time_coeff: number; bonus_code?: string; time_record_mandatory?: boolean };
  ss: { group: number; regime: string };
  irpf: { current_rate: number; personal_situation: string; descendants: number };
  observations?: { ta2_reason?: string; substitute_naf?: string };
}

export interface CrossValidationResult {
  code: string; severity: 'error' | 'warning' | 'info';
  message: string; norm: string; suggestion: string;
}

export function validateEmployee(input: CrossValidationInput): CrossValidationResult[] {
  const results: CrossValidationResult[] = [];

  // Rule 1: Base cotización vs coeficiente parcialidad
  if (input.contract.part_time_coeff < 1) {
    const maxBase = 4909.50 * input.contract.part_time_coeff * 1.1;
    if (input.employee.cotization_base > maxBase) {
      results.push({ code: 'BASE_COT_EXCEEDS_PARTIAL', severity: 'error',
        message: `Base cotización (${input.employee.cotization_base}€) supera máximo jornada parcial ${(input.contract.part_time_coeff * 100).toFixed(0)}% (${maxBase.toFixed(2)}€)`,
        norm: 'LGSS Art. 147 / ET Art. 12', suggestion: 'Revisar base de cotización o coeficiente de parcialidad' });
    }
  }

  // Rule 2: Grupo SS mismatch
  if (input.ss.group !== input.employee.cotization_group) {
    results.push({ code: 'SS_GROUP_MISMATCH', severity: 'error',
      message: `Grupo SS empleado (${input.employee.cotization_group}) difiere del grupo SS (${input.ss.group})`,
      norm: 'RD 2064/1995 / LGSS', suggestion: 'Verificar clasificación profesional y grupo de cotización' });
  }

  // Rule 3: IRPF below minimum
  if (input.irpf.current_rate < 2) {
    results.push({ code: 'IRPF_BELOW_MINIMUM', severity: 'error',
      message: `Tipo IRPF (${input.irpf.current_rate}%) por debajo del mínimo legal del 2%`,
      norm: 'RIRPF Art. 86', suggestion: 'Aplicar tipo mínimo del 2%' });
  }

  // Rule 4: Substitute contract mismatch
  if (input.observations?.substitute_naf && input.contract.type !== 'interinidad') {
    results.push({ code: 'SUBSTITUTE_CONTRACT_MISMATCH', severity: 'warning',
      message: 'Contrato con sustituto registrado pero tipo contrato no es interinidad',
      norm: 'ET Art. 15.1.c', suggestion: 'Verificar tipo de contrato del sustituto' });
  }

  // Rule 5: Part-time without time record
  if (input.contract.part_time_coeff < 1 && !input.contract.time_record_mandatory) {
    results.push({ code: 'TIME_RECORD_MISSING', severity: 'error',
      message: 'Contrato a tiempo parcial sin registro horario obligatorio activado',
      norm: 'ET Art. 12.5 / RD-ley 8/2019', suggestion: 'Activar time_record_mandatory en el contrato' });
  }

  // Rule 6: Bonus code mismatch
  if (input.contract.bonus_code && input.contract.type === 'indefinido' && input.contract.bonus_code.startsWith('T')) {
    results.push({ code: 'BONUS_CONTRACT_MISMATCH', severity: 'warning',
      message: 'Código de bonificación parece ser de contrato temporal pero el contrato es indefinido',
      norm: 'SEPE — Catálogo bonificaciones', suggestion: 'Verificar código de bonificación con TGSS' });
  }

  return results;
}
