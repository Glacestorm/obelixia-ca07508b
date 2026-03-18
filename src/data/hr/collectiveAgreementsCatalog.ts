/**
 * Catálogo de Convenios Colectivos Españoles
 * Art. 8.5 del Estatuto de los Trabajadores - Obligatorio informar convenio aplicable
 */

export interface CollectiveAgreement {
  code: string;
  name: string;
  cnae_codes: string[];
  jurisdiction_code: string;
  effective_date: string;
  expiration_date?: string;
  extra_payments: number; // 12, 14, 15 pagas
  working_hours_week: number;
  vacation_days: number;
  source_url?: string;
  is_system: boolean;
}

/**
 * Convenios colectivos más comunes por sector CNAE en España
 * Esta lista se sincronizará con la base de datos y se ampliará automáticamente
 */
export const SPANISH_COLLECTIVE_AGREEMENTS: CollectiveAgreement[] = [
  // CONSTRUCCIÓN
  {
    code: 'CONST-GEN',
    name: 'Convenio General del Sector de la Construcción',
    cnae_codes: ['41', '42', '43'],
    jurisdiction_code: 'ES',
    effective_date: '2024-01-01',
    expiration_date: '2026-12-31',
    extra_payments: 14,
    working_hours_week: 40,
    vacation_days: 30,
    source_url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2022-21243',
    is_system: true
  },
  // METAL
  {
    code: 'METAL-NAC',
    name: 'Convenio Colectivo del Metal (Estatal)',
    cnae_codes: ['24', '25', '26', '27', '28', '29', '30', '33'],
    jurisdiction_code: 'ES',
    effective_date: '2024-01-01',
    expiration_date: '2026-12-31',
    extra_payments: 14,
    working_hours_week: 40,
    vacation_days: 30,
    source_url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2022-19530',
    is_system: true
  },
  // HOSTELERÍA
  {
    code: 'HOST-NAC',
    name: 'Acuerdo Laboral Estatal de Hostelería',
    cnae_codes: ['55', '56'],
    jurisdiction_code: 'ES',
    effective_date: '2023-01-01',
    expiration_date: '2026-12-31',
    extra_payments: 14,
    working_hours_week: 40,
    vacation_days: 30,
    source_url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2022-8809',
    is_system: true
  },
  // COMERCIO
  {
    code: 'COM-GRANDES',
    name: 'Convenio de Grandes Almacenes',
    cnae_codes: ['47'],
    jurisdiction_code: 'ES',
    effective_date: '2023-01-01',
    expiration_date: '2025-12-31',
    extra_payments: 14,
    working_hours_week: 40,
    vacation_days: 30,
    source_url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2022-17961',
    is_system: true
  },
  // TRANSPORTE
  {
    code: 'TRANS-MERCAN',
    name: 'Convenio de Transporte de Mercancías por Carretera',
    cnae_codes: ['49'],
    jurisdiction_code: 'ES',
    effective_date: '2024-01-01',
    expiration_date: '2026-12-31',
    extra_payments: 14,
    working_hours_week: 40,
    vacation_days: 30,
    is_system: true
  },
  // OFICINAS Y DESPACHOS
  {
    code: 'OFIC-NAC',
    name: 'Convenio de Oficinas y Despachos',
    cnae_codes: ['69', '70', '71', '73', '74', '78', '82'],
    jurisdiction_code: 'ES',
    effective_date: '2023-01-01',
    expiration_date: '2025-12-31',
    extra_payments: 14,
    working_hours_week: 39,
    vacation_days: 30,
    is_system: true
  },
  // LIMPIEZA
  {
    code: 'LIMP-NAC',
    name: 'Convenio Sectorial de Limpieza de Edificios y Locales',
    cnae_codes: ['81'],
    jurisdiction_code: 'ES',
    effective_date: '2023-01-01',
    expiration_date: '2025-12-31',
    extra_payments: 14,
    working_hours_week: 40,
    vacation_days: 30,
    is_system: true
  },
  // SEGURIDAD PRIVADA
  {
    code: 'SEG-PRIV',
    name: 'Convenio de Empresas de Seguridad',
    cnae_codes: ['80'],
    jurisdiction_code: 'ES',
    effective_date: '2023-01-01',
    expiration_date: '2026-12-31',
    extra_payments: 14,
    working_hours_week: 40,
    vacation_days: 30,
    is_system: true
  },
  // SANIDAD PRIVADA
  {
    code: 'SAN-PRIV',
    name: 'Convenio de Sanidad Privada',
    cnae_codes: ['86', '87', '88'],
    jurisdiction_code: 'ES',
    effective_date: '2023-01-01',
    expiration_date: '2025-12-31',
    extra_payments: 14,
    working_hours_week: 37.5,
    vacation_days: 30,
    is_system: true
  },
  // ENSEÑANZA PRIVADA
  {
    code: 'ENS-PRIV',
    name: 'Convenio de Enseñanza Privada',
    cnae_codes: ['85'],
    jurisdiction_code: 'ES',
    effective_date: '2023-01-01',
    expiration_date: '2025-12-31',
    extra_payments: 14,
    working_hours_week: 37.5,
    vacation_days: 30,
    is_system: true
  },
  // INDUSTRIA QUÍMICA
  {
    code: 'QUIM-NAC',
    name: 'Convenio General de la Industria Química',
    cnae_codes: ['20', '21'],
    jurisdiction_code: 'ES',
    effective_date: '2024-01-01',
    expiration_date: '2026-12-31',
    extra_payments: 14,
    working_hours_week: 40,
    vacation_days: 30,
    is_system: true
  },
  // ALIMENTACIÓN
  {
    code: 'ALIM-NAC',
    name: 'Convenio de la Industria Alimentaria',
    cnae_codes: ['10', '11', '12'],
    jurisdiction_code: 'ES',
    effective_date: '2023-01-01',
    expiration_date: '2025-12-31',
    extra_payments: 14,
    working_hours_week: 40,
    vacation_days: 30,
    is_system: true
  },
  // TEXTIL
  {
    code: 'TEXT-NAC',
    name: 'Convenio de la Industria Textil y de la Confección',
    cnae_codes: ['13', '14', '15'],
    jurisdiction_code: 'ES',
    effective_date: '2023-01-01',
    expiration_date: '2025-12-31',
    extra_payments: 14,
    working_hours_week: 40,
    vacation_days: 30,
    is_system: true
  },
  // MADERA
  {
    code: 'MADERA-NAC',
    name: 'Convenio de la Madera',
    cnae_codes: ['16', '31'],
    jurisdiction_code: 'ES',
    effective_date: '2023-01-01',
    expiration_date: '2025-12-31',
    extra_payments: 14,
    working_hours_week: 40,
    vacation_days: 30,
    is_system: true
  },
  // ARTES GRÁFICAS
  {
    code: 'GRAF-NAC',
    name: 'Convenio de Artes Gráficas',
    cnae_codes: ['17', '18'],
    jurisdiction_code: 'ES',
    effective_date: '2023-01-01',
    expiration_date: '2025-12-31',
    extra_payments: 14,
    working_hours_week: 40,
    vacation_days: 30,
    is_system: true
  },
  // BANCA
  {
    code: 'BANCA-NAC',
    name: 'Convenio Colectivo del Sector de la Banca',
    cnae_codes: ['64'],
    jurisdiction_code: 'ES',
    effective_date: '2023-01-01',
    expiration_date: '2026-12-31',
    extra_payments: 15,
    working_hours_week: 35,
    vacation_days: 30,
    is_system: true
  },
  // SEGUROS
  {
    code: 'SEG-NAC',
    name: 'Convenio del Sector de Seguros, Reaseguros y Mutuas',
    cnae_codes: ['65', '66'],
    jurisdiction_code: 'ES',
    effective_date: '2023-01-01',
    expiration_date: '2025-12-31',
    extra_payments: 14,
    working_hours_week: 36,
    vacation_days: 30,
    is_system: true
  },
  // CONSULTORÍA / TIC
  {
    code: 'TIC-NAC',
    name: 'Convenio de Empresas de Consultoría y TIC',
    cnae_codes: ['62', '63'],
    jurisdiction_code: 'ES',
    effective_date: '2024-01-01',
    expiration_date: '2026-12-31',
    extra_payments: 14,
    working_hours_week: 40,
    vacation_days: 30,
    is_system: true
  },
  // CONTACT CENTER
  {
    code: 'CONTACT-NAC',
    name: 'Convenio de Contact Center (Telemarketing)',
    cnae_codes: ['82'],
    jurisdiction_code: 'ES',
    effective_date: '2023-01-01',
    expiration_date: '2025-12-31',
    extra_payments: 14,
    working_hours_week: 39,
    vacation_days: 30,
    is_system: true
  },
  // AGENCIAS DE VIAJE
  {
    code: 'VIAJES-NAC',
    name: 'Convenio de Agencias de Viajes',
    cnae_codes: ['79'],
    jurisdiction_code: 'ES',
    effective_date: '2023-01-01',
    expiration_date: '2025-12-31',
    extra_payments: 14,
    working_hours_week: 40,
    vacation_days: 30,
    is_system: true
  },
  // AGRICULTURA
  {
    code: 'AGRO-NAC',
    name: 'Convenio del Sector Agrario',
    cnae_codes: ['01', '02', '03'],
    jurisdiction_code: 'ES',
    effective_date: '2023-01-01',
    expiration_date: '2025-12-31',
    extra_payments: 14,
    working_hours_week: 40,
    vacation_days: 30,
    is_system: true
  },
];

/**
 * Conceptos salariales comunes por convenio
 */
export interface SalaryConcept {
  code: string;
  name: string;
  type: 'earning' | 'deduction';
  is_mandatory: boolean;
  calculation_type: 'fixed' | 'percentage' | 'formula' | 'days' | 'hours';
  cotiza_ss: boolean;
  tributa_irpf: boolean;
  frequency: 'monthly' | 'annual' | 'per_day' | 'per_hour' | 'biannual' | 'quarterly';
  description?: string;
}

export const COMMON_SALARY_CONCEPTS: SalaryConcept[] = [
  // CONCEPTOS SALARIALES (DEVENGOS)
  {
    code: 'SALARIO_BASE',
    name: 'Salario Base',
    type: 'earning',
    is_mandatory: true,
    calculation_type: 'fixed',
    cotiza_ss: true,
    tributa_irpf: true,
    frequency: 'monthly',
    description: 'Salario base según tablas del convenio'
  },
  {
    code: 'PLUS_CONVENIO',
    name: 'Plus Convenio',
    type: 'earning',
    is_mandatory: true,
    calculation_type: 'fixed',
    cotiza_ss: true,
    tributa_irpf: true,
    frequency: 'monthly',
    description: 'Complemento establecido en convenio colectivo'
  },
  {
    code: 'PLUS_ANTIGUEDAD',
    name: 'Plus de Antigüedad',
    type: 'earning',
    is_mandatory: false,
    calculation_type: 'formula',
    cotiza_ss: true,
    tributa_irpf: true,
    frequency: 'monthly',
    description: 'Trienios/quinquenios según años de servicio'
  },
  {
    code: 'PLUS_TRANSPORTE',
    name: 'Plus de Transporte',
    type: 'earning',
    is_mandatory: false,
    calculation_type: 'fixed',
    cotiza_ss: false,
    tributa_irpf: false,
    frequency: 'monthly',
    description: 'Compensación gastos desplazamiento (hasta límite exento)'
  },
  {
    code: 'PLUS_NOCTURNIDAD',
    name: 'Plus de Nocturnidad',
    type: 'earning',
    is_mandatory: false,
    calculation_type: 'percentage',
    cotiza_ss: true,
    tributa_irpf: true,
    frequency: 'monthly',
    description: 'Incremento por trabajo entre 22:00 y 06:00'
  },
  {
    code: 'PLUS_PELIGROSIDAD',
    name: 'Plus de Peligrosidad/Toxicidad',
    type: 'earning',
    is_mandatory: false,
    calculation_type: 'percentage',
    cotiza_ss: true,
    tributa_irpf: true,
    frequency: 'monthly',
    description: 'Complemento por exposición a riesgos'
  },
  {
    code: 'PLUS_TURNICIDAD',
    name: 'Plus de Turnicidad',
    type: 'earning',
    is_mandatory: false,
    calculation_type: 'percentage',
    cotiza_ss: true,
    tributa_irpf: true,
    frequency: 'monthly',
    description: 'Compensación trabajo a turnos rotativos'
  },
  {
    code: 'PLUS_RESPONSABILIDAD',
    name: 'Plus de Responsabilidad',
    type: 'earning',
    is_mandatory: false,
    calculation_type: 'fixed',
    cotiza_ss: true,
    tributa_irpf: true,
    frequency: 'monthly',
    description: 'Complemento por funciones de mando'
  },
  {
    code: 'PLUS_IDIOMAS',
    name: 'Plus de Idiomas',
    type: 'earning',
    is_mandatory: false,
    calculation_type: 'fixed',
    cotiza_ss: true,
    tributa_irpf: true,
    frequency: 'monthly',
    description: 'Compensación por uso habitual de idiomas extranjeros'
  },
  {
    code: 'PLUS_TELETRABAJO',
    name: 'Compensación Teletrabajo',
    type: 'earning',
    is_mandatory: false,
    calculation_type: 'fixed',
    cotiza_ss: false,
    tributa_irpf: false,
    frequency: 'monthly',
    description: 'Gastos teletrabajo según Ley 10/2021'
  },
  {
    code: 'PAGA_EXTRA_VERANO',
    name: 'Paga Extra Verano',
    type: 'earning',
    is_mandatory: true,
    calculation_type: 'fixed',
    cotiza_ss: true,
    tributa_irpf: true,
    frequency: 'annual',
    description: 'Paga extraordinaria de verano (normalmente junio/julio)'
  },
  {
    code: 'PAGA_EXTRA_NAVIDAD',
    name: 'Paga Extra Navidad',
    type: 'earning',
    is_mandatory: true,
    calculation_type: 'fixed',
    cotiza_ss: true,
    tributa_irpf: true,
    frequency: 'annual',
    description: 'Paga extraordinaria de Navidad'
  },
  {
    code: 'PAGA_BENEFICIOS',
    name: 'Paga de Beneficios/Productividad',
    type: 'earning',
    is_mandatory: false,
    calculation_type: 'percentage',
    cotiza_ss: true,
    tributa_irpf: true,
    frequency: 'annual',
    description: 'Participación en beneficios de la empresa'
  },
  {
    code: 'HORAS_EXTRA',
    name: 'Horas Extraordinarias',
    type: 'earning',
    is_mandatory: false,
    calculation_type: 'hours',
    cotiza_ss: true,
    tributa_irpf: true,
    frequency: 'monthly',
    description: 'Compensación horas extra trabajadas'
  },
  {
    code: 'DIETAS',
    name: 'Dietas y Gastos de Viaje',
    type: 'earning',
    is_mandatory: false,
    calculation_type: 'days',
    cotiza_ss: false,
    tributa_irpf: false,
    frequency: 'monthly',
    description: 'Indemnización gastos manutención y estancia'
  },
  {
    code: 'KILOMETRAJE',
    name: 'Kilometraje',
    type: 'earning',
    is_mandatory: false,
    calculation_type: 'formula',
    cotiza_ss: false,
    tributa_irpf: false,
    frequency: 'monthly',
    description: 'Compensación uso vehículo propio (0.19€/km)'
  },
  {
    code: 'COMPL_IT',
    name: 'Complemento IT',
    type: 'earning',
    is_mandatory: false,
    calculation_type: 'percentage',
    cotiza_ss: false,
    tributa_irpf: true,
    frequency: 'monthly',
    description: 'Complemento hasta 100% durante baja IT'
  },
  {
    code: 'MEJORA_VOLUNTARIA',
    name: 'Mejora Voluntaria',
    type: 'earning',
    is_mandatory: false,
    calculation_type: 'fixed',
    cotiza_ss: true,
    tributa_irpf: true,
    frequency: 'monthly',
    description: 'Diferencia entre salario pactado y mínimo de convenio. Absorbible y compensable (ET Art. 26.5)'
  },

  // DEDUCCIONES
  {
    code: 'IRPF',
    name: 'Retención IRPF',
    type: 'deduction',
    is_mandatory: true,
    calculation_type: 'percentage',
    cotiza_ss: false,
    tributa_irpf: false,
    frequency: 'monthly',
    description: 'Retención a cuenta del IRPF'
  },
  {
    code: 'SS_CONTINGENCIAS',
    name: 'SS Contingencias Comunes',
    type: 'deduction',
    is_mandatory: true,
    calculation_type: 'percentage',
    cotiza_ss: false,
    tributa_irpf: false,
    frequency: 'monthly',
    description: 'Cuota trabajador contingencias comunes (4.70%)'
  },
  {
    code: 'SS_DESEMPLEO',
    name: 'SS Desempleo',
    type: 'deduction',
    is_mandatory: true,
    calculation_type: 'percentage',
    cotiza_ss: false,
    tributa_irpf: false,
    frequency: 'monthly',
    description: 'Cuota trabajador desempleo (1.55% / 1.60%)'
  },
  {
    code: 'SS_FP',
    name: 'SS Formación Profesional',
    type: 'deduction',
    is_mandatory: true,
    calculation_type: 'percentage',
    cotiza_ss: false,
    tributa_irpf: false,
    frequency: 'monthly',
    description: 'Cuota trabajador FP (0.10%)'
  },
  {
    code: 'SS_MEI',
    name: 'SS MEI',
    type: 'deduction',
    is_mandatory: true,
    calculation_type: 'percentage',
    cotiza_ss: false,
    tributa_irpf: false,
    frequency: 'monthly',
    description: 'Mecanismo Equidad Intergeneracional (0.13%)'
  },
  {
    code: 'CUOTA_SINDICAL',
    name: 'Cuota Sindical',
    type: 'deduction',
    is_mandatory: false,
    calculation_type: 'fixed',
    cotiza_ss: false,
    tributa_irpf: false,
    frequency: 'monthly',
    description: 'Cuota afiliación sindicato'
  },
  {
    code: 'ANTICIPO',
    name: 'Anticipo de Nómina',
    type: 'deduction',
    is_mandatory: false,
    calculation_type: 'fixed',
    cotiza_ss: false,
    tributa_irpf: false,
    frequency: 'monthly',
    description: 'Descuento por anticipo de salario'
  },
  {
    code: 'PLAN_PENSIONES',
    name: 'Plan de Pensiones Empresa',
    type: 'deduction',
    is_mandatory: false,
    calculation_type: 'percentage',
    cotiza_ss: false,
    tributa_irpf: false,
    frequency: 'monthly',
    description: 'Aportación empleado al plan de empresa'
  },
  {
    code: 'EMBARGO',
    name: 'Embargo Judicial',
    type: 'deduction',
    is_mandatory: false,
    calculation_type: 'fixed',
    cotiza_ss: false,
    tributa_irpf: false,
    frequency: 'monthly',
    description: 'Retención por embargo judicial'
  },
];

/**
 * Obtener convenios sugeridos por código CNAE
 */
export function getAgreementsByCNAE(cnaeCode: string): CollectiveAgreement[] {
  const mainCode = cnaeCode.substring(0, 2);
  return SPANISH_COLLECTIVE_AGREEMENTS.filter(agreement =>
    agreement.cnae_codes.some(code => 
      cnaeCode.startsWith(code) || mainCode === code
    )
  );
}

/**
 * Buscar convenios por texto
 */
export function searchAgreements(query: string): CollectiveAgreement[] {
  const lowerQuery = query.toLowerCase();
  return SPANISH_COLLECTIVE_AGREEMENTS.filter(agreement =>
    agreement.name.toLowerCase().includes(lowerQuery) ||
    agreement.code.toLowerCase().includes(lowerQuery)
  );
}
