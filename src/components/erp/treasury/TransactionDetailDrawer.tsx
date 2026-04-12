import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  CreditCard,
  FileText,
  Hash,
  Landmark,
  Tag,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface TransactionDetail {
  id: string;
  description: string | null;
  counterparty_name: string | null;
  counterparty_account: string | null;
  counterparty_bank: string | null;
  amount: number;
  transaction_date: string;
  value_date: string | null;
  category_name: string | null;
  category_code: string | null;
  status: string | null;
  currency: string | null;
  reference: string | null;
  external_id: string;
  balance_after: number | null;
  reconciled_at: string | null;
}

interface TransactionDetailDrawerProps {
  transaction: TransactionDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatCurrency(amount: number, currency?: string | null): string {
  const cur = currency || 'EUR';
  try {
    return Math.abs(amount).toLocaleString('es-ES', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
    });
  } catch {
    return `${Math.abs(amount).toFixed(2)} ${cur}`;
  }
}

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'muted' }> = {
  pending: { label: 'Pendiente', variant: 'warning' },
  processed: { label: 'Procesado', variant: 'success' },
  reconciled: { label: 'Conciliado', variant: 'success' },
  matched: { label: 'Emparejado', variant: 'default' },
  unmatched: { label: 'Sin emparejar', variant: 'muted' },
  duplicate: { label: 'Duplicado', variant: 'warning' },
};

function DetailRow({ icon: Icon, label, value, mono }: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-sm mt-0.5", mono && "font-mono text-xs")}>{value}</p>
      </div>
    </div>
  );
}

export function TransactionDetailDrawer({ transaction, open, onOpenChange }: TransactionDetailDrawerProps) {
  if (!transaction) return null;

  const isPositive = transaction.amount >= 0;
  const st = statusMap[transaction.status || ''] || { label: transaction.status || '—', variant: 'outline' as const };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetDescription className="sr-only">Detalle del movimiento bancario</SheetDescription>
          {/* Amount hero */}
          <div className="flex items-center gap-3 mb-1">
            <div className={cn(
              "p-2.5 rounded-xl",
              isPositive ? "bg-green-500/10" : "bg-red-500/10"
            )}>
              {isPositive
                ? <ArrowDownCircle className="h-6 w-6 text-green-600" />
                : <ArrowUpCircle className="h-6 w-6 text-red-600" />
              }
            </div>
            <div>
              <p className={cn(
                "text-2xl font-bold tabular-nums",
                isPositive ? "text-green-600" : "text-red-600"
              )}>
                {isPositive ? '+' : '−'} {formatCurrency(transaction.amount, transaction.currency)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isPositive ? 'Ingreso' : 'Cargo'}
              </p>
            </div>
          </div>

          <SheetTitle className="text-base font-medium">
            {transaction.counterparty_name || transaction.description || 'Movimiento'}
          </SheetTitle>
        </SheetHeader>

        <Separator />

        {/* Status + category badges */}
        <div className="flex items-center gap-2 flex-wrap py-3">
          <Badge variant={st.variant}>{st.label}</Badge>
          {transaction.category_name && (
            <Badge variant="outline" className="gap-1">
              <Tag className="h-3 w-3" />
              {transaction.category_name}
            </Badge>
          )}
        </div>

        <Separator />

        {/* Detail fields */}
        <div className="py-1 divide-y divide-border/50">
          <DetailRow
            icon={FileText}
            label="Descripción"
            value={transaction.description}
          />
          <DetailRow
            icon={User}
            label="Contraparte"
            value={transaction.counterparty_name}
          />
          {transaction.counterparty_account && (
            <DetailRow
              icon={CreditCard}
              label="Cuenta contraparte"
              value={transaction.counterparty_account}
              mono
            />
          )}
          {transaction.counterparty_bank && (
            <DetailRow
              icon={Landmark}
              label="Banco contraparte"
              value={transaction.counterparty_bank}
            />
          )}
          <DetailRow
            icon={Calendar}
            label="Fecha operación"
            value={format(new Date(transaction.transaction_date), "dd 'de' MMMM yyyy", { locale: es })}
          />
          {transaction.value_date && (
            <DetailRow
              icon={Calendar}
              label="Fecha valor"
              value={format(new Date(transaction.value_date), "dd 'de' MMMM yyyy", { locale: es })}
            />
          )}
          {transaction.reference && (
            <DetailRow
              icon={Hash}
              label="Referencia"
              value={transaction.reference}
              mono
            />
          )}
          <DetailRow
            icon={Hash}
            label="ID externo"
            value={transaction.external_id}
            mono
          />
          {transaction.balance_after != null && (
            <DetailRow
              icon={Landmark}
              label="Saldo posterior"
              value={formatCurrency(transaction.balance_after, transaction.currency)}
            />
          )}
          {transaction.reconciled_at && (
            <DetailRow
              icon={Calendar}
              label="Conciliado"
              value={format(new Date(transaction.reconciled_at), "dd MMM yyyy HH:mm", { locale: es })}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default TransactionDetailDrawer;
