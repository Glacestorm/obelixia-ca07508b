/**
 * employeeRequiredDocs — Canonical list of required employee documents
 * V2-RRHH-P3B: Single source of truth for document completeness checks
 *
 * Used by:
 *  - EmployeeDocumentsSection (completeness indicator)
 *  - EmployeeNotificationsSection (missing doc alerts)
 *  - Any future completeness checks
 */

export interface RequiredDocDef {
  /** Normalized document_type key (must match erp_hr_employee_documents.document_type) */
  type: string;
  /** Human-readable label */
  label: string;
}

/**
 * Canonical list of documents required for a complete employee expedient.
 * Order matters: most critical first.
 */
export const EMPLOYEE_REQUIRED_DOCS: readonly RequiredDocDef[] = [
  { type: 'dni_nie', label: 'DNI / NIE' },
  { type: 'contrato_trabajo', label: 'Contrato de trabajo' },
  { type: 'irpf_modelo_145', label: 'Modelo 145 IRPF' },
  { type: 'alta_ss', label: 'Alta Seguridad Social' },
  { type: 'cuenta_bancaria', label: 'Cuenta bancaria' },
] as const;

/**
 * Just the type keys for quick set-based lookups.
 */
export const EMPLOYEE_REQUIRED_DOC_TYPES: readonly string[] = EMPLOYEE_REQUIRED_DOCS.map(d => d.type);

/**
 * Compute completeness from a set of present document types.
 */
export function computeEmployeeDocCompleteness(presentTypes: Set<string>) {
  const have = EMPLOYEE_REQUIRED_DOCS.filter(d => presentTypes.has(d.type));
  const missing = EMPLOYEE_REQUIRED_DOCS.filter(d => !presentTypes.has(d.type));
  const total = EMPLOYEE_REQUIRED_DOCS.length;
  const percent = total > 0 ? Math.round((have.length / total) * 100) : 100;

  return { have, missing, total, completed: have.length, percent };
}
