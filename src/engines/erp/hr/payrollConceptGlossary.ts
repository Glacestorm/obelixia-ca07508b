/**
 * Glosario estático de conceptos de nómina ES (S9.22).
 * Tooltip text breve y neutro para slip y portal del empleado.
 * No es asesoramiento jurídico.
 */
export const PAYROLL_CONCEPT_GLOSSARY: Record<string, string> = {
  // Devengos
  ES_SAL_BASE: "Salario base pactado en contrato o convenio (art. 26 ET).",
  ES_COMP_CONVENIO: "Plus o complemento previsto en el convenio colectivo aplicable.",
  ES_MEJORA_VOLUNTARIA: "Mejora salarial voluntaria de la empresa (art. 26.5 ET, absorbible y compensable).",
  ES_COMP_ANTIGUEDAD: "Complemento por permanencia en la empresa según convenio.",
  ES_COMP_PUESTO: "Complemento por características del puesto (responsabilidad, especialización).",
  ES_COMP_NOCTURNIDAD: "Plus por trabajo nocturno (art. 36 ET).",
  ES_COMP_TURNICIDAD: "Plus por trabajo a turnos rotativos.",
  ES_COMP_TOXICIDAD: "Plus por penosidad, toxicidad o peligrosidad del puesto.",
  ES_HORAS_EXTRA: "Horas trabajadas por encima de la jornada ordinaria (art. 35 ET).",
  ES_HORAS_EXTRA_FEST: "Horas extraordinarias en festivo.",
  ES_HORAS_EXTRA_NOCT: "Horas extraordinarias nocturnas.",
  ES_BONUS: "Gratificación o bonus variable.",
  ES_COMISION: "Comisiones por ventas u objetivos.",
  ES_DIETAS: "Dietas y gastos de viaje. Exentas IRPF dentro de los límites del art. 9 RIRPF.",
  ES_PLUS_TRANSPORTE: "Compensación por desplazamiento al centro de trabajo.",
  ES_PAGA_EXTRA: "Paga extraordinaria (art. 31 ET). Mínimo dos al año salvo prorrateo.",
  ES_VACACIONES: "Retribución de vacaciones disfrutadas.",
  ES_RETRIB_FLEX_SEGURO: "Seguro médico empresa. Exento IRPF dentro del límite (art. 42.3.c LIRPF).",
  ES_RETRIB_FLEX_SEGURO_EXCESO: "Exceso del seguro médico sobre el límite exento. Tributa.",
  ES_RETRIB_FLEX_GUARDERIA: "Cheque guardería: retribución en especie exenta dentro del límite legal.",
  ES_RETRIB_FLEX_FORMACION: "Formación financiada por la empresa relacionada con el puesto.",
  ES_RETRIB_FLEX_RESTAURANTE: "Tickets restaurante: exentos hasta el límite del art. 45.2 RIRPF.",
  ES_STOCK_OPTIONS: "Compensación en acciones u opciones sobre acciones.",
  ES_IT_CC_EMPRESA: "Complemento empresa por incapacidad temporal por contingencias comunes.",
  ES_IT_AT_EMPRESA: "Complemento empresa por incapacidad temporal por accidente de trabajo.",
  ES_NACIMIENTO: "Prestación de nacimiento y cuidado de menor (arts. 177-182 LGSS).",
  ES_NACIMIENTO_MATERNIDAD: "Tramo de prestación de maternidad por nacimiento.",
  ES_NACIMIENTO_PATERNIDAD: "Tramo de prestación de paternidad por nacimiento.",
  ES_NACIMIENTO_CORRESPONSABILIDAD: "Prestación de corresponsabilidad en el cuidado del lactante (art. 183 LGSS).",
  ES_REGULARIZACION: "Regularización o atrasos de períodos anteriores.",
  ES_ATRASOS_IT: "Atrasos por baja médica no reflejada en su momento.",
  ES_RED_JORNADA_INFO: "Reducción de jornada por guarda legal (art. 37.6 ET). Informativo.",
  // Deducciones
  ES_IRPF: "Retención a cuenta del IRPF (arts. 99-101 LIRPF).",
  ES_SS_CC_TRAB: "Cotización del trabajador a contingencias comunes de la Seguridad Social.",
  ES_SS_DESEMPLEO_TRAB: "Cotización del trabajador a la prestación de desempleo.",
  ES_SS_FP_TRAB: "Cotización del trabajador a Formación Profesional.",
  ES_MEI_TRAB: "Mecanismo de Equidad Intergeneracional (cuota del trabajador).",
  // Coste empresa SS
  ES_SS_CC_EMP: "Aportación de la empresa a contingencias comunes.",
  ES_SS_AT_EMP: "Aportación de la empresa por accidente de trabajo y enfermedad profesional.",
  ES_SS_DESEMPLEO_EMP: "Aportación de la empresa a desempleo.",
  ES_SS_FOGASA_EMP: "Aportación de la empresa al FOGASA.",
  ES_SS_FP_EMP: "Aportación de la empresa a Formación Profesional.",
  ES_MEI_EMP: "Aportación de la empresa al Mecanismo de Equidad Intergeneracional.",
  // Bases
  ES_BASE_CC: "Base de cotización por contingencias comunes (art. 147 LGSS).",
  ES_BASE_AT: "Base de cotización por accidentes de trabajo y enfermedades profesionales.",
  ES_BASE_IRPF: "Base de cálculo de la retención IRPF.",
};

export function getConceptDescription(code: string | undefined | null): string | null {
  if (!code) return null;
  return PAYROLL_CONCEPT_GLOSSARY[code] ?? null;
}