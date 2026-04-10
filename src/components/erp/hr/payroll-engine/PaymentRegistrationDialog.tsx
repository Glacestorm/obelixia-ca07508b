/**
 * PaymentRegistrationDialog — P1.3
 * Dialog for registering payroll payment with ledger + evidence.
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Euro, Loader2, Info } from 'lucide-react';
import { usePaymentTracking, type PaymentMethod, type PaymentRegistration } from '@/hooks/erp/hr/usePaymentTracking';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodId: string;
  periodName: string;
  companyId: string;
  onSuccess?: () => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'transferencia', label: 'Transferencia bancaria' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'otro', label: 'Otro' },
];

export function PaymentRegistrationDialog({
  open,
  onOpenChange,
  periodId,
  periodName,
  companyId,
  onSuccess,
}: Props) {
  const { markPeriodAsPaid } = usePaymentTracking(companyId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transferencia');
  const [notes, setNotes] = useState('');

  const canSubmit = paymentDate && paymentReference.trim().length >= 3;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    const reg: PaymentRegistration = {
      paymentDate,
      paymentReference: paymentReference.trim(),
      paymentMethod,
      notes: notes.trim() || undefined,
    };

    const success = await markPeriodAsPaid(periodId, reg);
    setIsSubmitting(false);

    if (success) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Euro className="h-5 w-5 text-primary" />
            Registrar pago — {periodName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Fecha de pago *</label>
            <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium">Referencia de pago *</label>
            <Input
              placeholder="Nº transferencia, lote, etc."
              value={paymentReference}
              onChange={e => setPaymentReference(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Método de pago</label>
            <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Notas</label>
            <Textarea
              placeholder="Observaciones sobre el pago (opcional)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-lg bg-muted/50 border">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>
              Esta acción marcará todas las nóminas del período como pagadas y creará un registro de auditoría.
              La generación de fichero SEPA CT aún no está implementada.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting} className="gap-1.5">
            {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Euro className="h-3 w-3" />}
            Registrar pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
