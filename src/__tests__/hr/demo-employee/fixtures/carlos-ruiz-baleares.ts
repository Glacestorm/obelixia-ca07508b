/**
 * Variante del fixture DEMO Carlos Ruiz aplicando el convenio provincial
 * "Comercio en General de las Illes Balears" (código catálogo: COM-GEN-IB).
 *
 * NO sustituye al fixture original (`carlos-ruiz.ts`), que sigue siendo el
 * empleado de referencia para Validation Pack Fases C1-C4 (Oficinas y Despachos).
 *
 * Reglas duras:
 *  - Sólo metadatos del convenio (código, ámbito, vigencia). Sin tablas
 *    salariales cargadas: cualquier nómina basada en este fixture debe pasar
 *    por human review fiscal antes de uso.
 *  - No envíos oficiales. No PASS absoluto.
 *  - Centro de trabajo en Illes Balears (Palma) para coherencia con el ámbito
 *    territorial del convenio (ES-IB).
 */

import {
  companyDemo,
  employeeDemo,
  contractDemo,
  type CompanyDemo,
  type EmployeeDemo,
  type ContractDemo,
} from './carlos-ruiz';

export const COLLECTIVE_AGREEMENT_CODE_BALEARES = 'COM-GEN-IB';

export const companyDemoBaleares: CompanyDemo = {
  ...companyDemo,
  id: 'demo-company-001-ib',
  name: 'Obelixia DEMO Baleares S.L.',
  collectiveAgreement: COLLECTIVE_AGREEMENT_CODE_BALEARES,
};

export const employeeDemoBaleares: EmployeeDemo = {
  ...employeeDemo,
  id: 'demo-emp-carlos-ruiz-ib',
  // Grupo profesional típico del convenio de comercio (Grupo III — dependiente).
  // Ajustar tras validación humana con tablas oficiales BOIB.
  professionalGroup: 'Dependiente (Grupo III) — pendiente validación tablas BOIB',
  ssContributionGroup: 5,
};

export const contractDemoBaleares: ContractDemo = {
  ...contractDemo,
  id: 'demo-contract-001-ib',
  // Salario base placeholder. NO usar para nómina real sin tabla BOIB validada.
  baseSalaryAnnual: contractDemo.baseSalaryAnnual,
};

/**
 * Marca explícita: este fixture requiere revisión humana antes de cualquier
 * cálculo fiscal/laboral con efectos reales.
 */
export const balearesFixtureMeta = {
  collective_agreement_code: COLLECTIVE_AGREEMENT_CODE_BALEARES,
  jurisdiction_code: 'ES-IB',
  requires_human_review: true,
  fiscal_classification_status: 'pending_review' as const,
  official_submission_blocked: true,
  notes:
    'Convenio cargado sólo a nivel metadatos. Tablas salariales, antigüedad, ' +
    'jornada exacta y pluses pendientes de carga validada desde BOIB.',
};
