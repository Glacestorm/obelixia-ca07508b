export { calculatePayroll, resolveConcepts, calculateConceptAmount } from './payroll-calculation-engine';
export type {
  PayrollInput, PayrollResult, PayrollConcept, PayslipLine,
  ConceptNature, ConceptType, CalculationType,
  SSInput, SSResult, IRPFInput, IRPFResult, ValidationResult,
} from './payroll-calculation-engine';
export { calculateSSContributions } from './rules/ss-contributions';
export { calculateIRPFWithholding } from './rules/irpf-withholding';
export { validatePayslip } from './validators/payslip-validator';
