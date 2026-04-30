import { AlertTriangle, ShieldAlert } from 'lucide-react';
import type { StagingRowSummary } from '@/hooks/erp/hr/useTicNacSalaryTableStaging';
import { checkPayslipLabelPreservesLiteral } from './stagingLiteralGuard';

export interface StagingBlockersWarningsPanelProps {
  row: StagingRowSummary;
}

export function StagingBlockersWarningsPanel({ row }: StagingBlockersWarningsPanelProps) {
  const literalCheck = checkPayslipLabelPreservesLiteral(
    row.concept_literal_from_agreement,
    row.payslip_label,
  );

  if (!literalCheck.hasBlocker) {
    return null;
  }

  return (
    <div
      role="alert"
      data-testid="staging-row-blocker-payslip-literal"
      className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div className="space-y-1">
        <p className="font-medium text-destructive">{literalCheck.message}</p>
        <p className="text-xs text-muted-foreground">
          Literal del convenio:{' '}
          <span className="font-mono">{row.concept_literal_from_agreement}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Etiqueta de nómina actual:{' '}
          <span className="font-mono">{row.payslip_label}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Palabras del convenio que faltan en la etiqueta:{' '}
          <span className="font-mono">{literalCheck.missingKeywords.join(', ')}</span>
        </p>
        <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          La aprobación quedará bloqueada por el servidor hasta corregirlo.
        </p>
      </div>
    </div>
  );
}

export default StagingBlockersWarningsPanel;