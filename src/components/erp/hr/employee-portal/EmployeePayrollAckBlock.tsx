/**
 * EmployeePayrollAckBlock — Acuse de recepción del recibo de nómina (S9.22).
 * Texto canónico desde legalNotices.ts. NO implica conformidad.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { usePayrollAcknowledgments } from '@/hooks/erp/hr/usePayrollAcknowledgments';
import { PAYROLL_LEGAL_NOTICES } from '@/lib/hr/payroll/legalNotices';

interface Props {
  payrollRecordId: string;
  employeeId: string;
  companyId: string;
}

export function EmployeePayrollAckBlock({ payrollRecordId, employeeId, companyId }: Props) {
  const { ack, loading, submitting, confirmReceipt } = usePayrollAcknowledgments({
    payrollRecordId,
    employeeId,
    companyId,
  });

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Comprobando acuse de recepción…
        </CardContent>
      </Card>
    );
  }

  if (ack) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
        <CardContent className="p-3 space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
              Recepción confirmada
            </p>
            <Badge variant="outline" className="text-[10px] ml-auto">
              {format(new Date(ack.acknowledged_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">{PAYROLL_LEGAL_NOTICES.ACK_MEANING}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Confirmar recepción del recibo</p>
            <p className="text-[11px] text-muted-foreground">
              {PAYROLL_LEGAL_NOTICES.ACK_MEANING}
            </p>
            <p className="text-[11px] text-muted-foreground italic">
              {PAYROLL_LEGAL_NOTICES.CLAIM_TERM}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="w-full gap-2"
          disabled={submitting}
          onClick={() => confirmReceipt()}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Confirmar recepción del recibo
        </Button>
      </CardContent>
    </Card>
  );
}