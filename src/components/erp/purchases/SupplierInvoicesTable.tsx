/**
 * Tabla de Facturas de Proveedor con acciones de flujo
 */

import { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Search, Plus, RefreshCw, MoreHorizontal, Eye, Edit, 
  CheckCircle, XCircle, Loader2, Printer, CreditCard, BookOpen
} from 'lucide-react';
import { useERPPurchases, SupplierInvoice } from '@/hooks/erp/useERPPurchases';
import { format, isPast, isWithinInterval, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500',
  posted: 'bg-blue-500',
  partial_paid: 'bg-yellow-500',
  paid: 'bg-green-600',
  cancelled: 'bg-red-600',
};

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  posted: 'Contabilizada',
  partial_paid: 'Pago parcial',
  paid: 'Pagada',
  cancelled: 'Cancelada',
};

interface SupplierInvoicesTableProps {
  onCreateNew: () => void;
  onViewInvoice?: (invoice: SupplierInvoice) => void;
  onEditInvoice?: (invoice: SupplierInvoice) => void;
  onRegisterPayment?: (invoice: SupplierInvoice) => void;
}

export function SupplierInvoicesTable({ 
  onCreateNew, 
  onViewInvoice, 
  onEditInvoice, 
  onRegisterPayment
}: SupplierInvoicesTableProps) {
  const { fetchSupplierInvoices, postSupplierInvoice, cancelSupplierInvoice, isLoading } = useERPPurchases();
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [search, setSearch] = useState('');

  const loadInvoices = useCallback(async () => {
    const data = await fetchSupplierInvoices();
    setInvoices(data);
  }, [fetchSupplierInvoices]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handlePost = async (invoice: SupplierInvoice) => {
    const success = await postSupplierInvoice(invoice.id);
    if (success) {
      toast.success('Factura contabilizada');
      loadInvoices();
    }
  };

  const handleCancel = async (invoice: SupplierInvoice) => {
    const success = await cancelSupplierInvoice(invoice.id);
    if (success) {
      toast.success('Factura cancelada');
      loadInvoices();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: es });
  };

  const getDueDateClass = (dueDate: string, status: string) => {
    if (status === 'paid' || status === 'cancelled') return '';
    if (!dueDate) return '';
    
    const due = new Date(dueDate);
    const today = new Date();
    
    if (isPast(due) && due.toDateString() !== today.toDateString()) {
      return 'text-destructive font-medium';
    }
    if (isWithinInterval(due, { start: today, end: addDays(today, 7) })) {
      return 'text-yellow-600 font-medium';
    }
    return '';
  };

  const filtered = invoices.filter(i => 
    !search || 
    i.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.document_number?.toLowerCase().includes(search.toLowerCase()) ||
    i.supplier_invoice_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por proveedor, número o referencia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon" onClick={loadInvoices} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
        <Button className="gap-2" onClick={onCreateNew}>
          <Plus className="h-4 w-4" /> Nueva Factura
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Nº Proveedor</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hay facturas de proveedor
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((invoice) => (
                  <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono">{invoice.document_number || '-'}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {invoice.supplier_invoice_number || '-'}
                    </TableCell>
                    <TableCell>{invoice.supplier_name || '-'}</TableCell>
                    <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                    <TableCell className={getDueDateClass(invoice.due_date, invoice.status)}>
                      {formatDate(invoice.due_date)}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(invoice.total)}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[invoice.status]}>{statusLabels[invoice.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onViewInvoice?.(invoice)}>
                            <Eye className="h-4 w-4 mr-2" /> Ver detalles
                          </DropdownMenuItem>
                          
                          {invoice.status === 'draft' && (
                            <>
                              <DropdownMenuItem onClick={() => onEditInvoice?.(invoice)}>
                                <Edit className="h-4 w-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePost(invoice)}>
                                <BookOpen className="h-4 w-4 mr-2" /> Contabilizar
                              </DropdownMenuItem>
                            </>
                          )}

                          {invoice.status === 'posted' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => onRegisterPayment?.(invoice)}>
                                <CreditCard className="h-4 w-4 mr-2" /> Registrar pago
                              </DropdownMenuItem>
                            </>
                          )}

                          <DropdownMenuItem onClick={() => toast.info('Función de impresión próximamente')}>
                            <Printer className="h-4 w-4 mr-2" /> Imprimir
                          </DropdownMenuItem>

                          {invoice.status === 'draft' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleCancel(invoice)}
                                className="text-destructive focus:text-destructive"
                              >
                                <XCircle className="h-4 w-4 mr-2" /> Cancelar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default SupplierInvoicesTable;
