/**
 * ExpedientDocumentosTab — Expediente documental del empleado (datos reales)
 */
import { EmployeeDocumentExpedient } from '../../document-expedient/EmployeeDocumentExpedient';

interface Props {
  employeeId: string;
  companyId: string;
  onNavigate?: (module: string) => void;
}

export function ExpedientDocumentosTab({ employeeId, companyId }: Props) {
  return <EmployeeDocumentExpedient companyId={companyId} employeeId={employeeId} />;
}
