/**
 * Tabla de Pedidos de Compra con acciones de flujo
 */

import { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Search, Plus, RefreshCw, MoreHorizontal, Eye, Edit, 
  Truck, FileText, CheckCircle, XCircle, Loader2, Printer
} from 'lucide-react';
import { useERPPurchases, PurchaseOrder } from '@/hooks/erp/useERPPurchases';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500',
  confirmed: 'bg-green-500',
  partial: 'bg-yellow-500',
  received: 'bg-green-600',
  cancelled: 'bg-red-600',
};

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  confirmed: 'Confirmado',
  partial: 'Parcial',
  received: 'Recibido',
  cancelled: 'Cancelado',
};

interface PurchaseOrdersTableProps {
  onCreateNew: () => void;
  onViewOrder?: (order: PurchaseOrder) => void;
  onEditOrder?: (order: PurchaseOrder) => void;
  onCreateReceipt?: (order: PurchaseOrder) => void;
  onCreateInvoice?: (order: PurchaseOrder) => void;
}

export function PurchaseOrdersTable({ 
  onCreateNew, 
  onViewOrder, 
  onEditOrder, 
  onCreateReceipt,
  onCreateInvoice
}: PurchaseOrdersTableProps) {
  const { fetchPurchaseOrders, updatePurchaseOrderStatus, isLoading } = useERPPurchases();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [search, setSearch] = useState('');

  const loadOrders = useCallback(async () => {
    const data = await fetchPurchaseOrders();
    setOrders(data);
  }, [fetchPurchaseOrders]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleConfirm = async (order: PurchaseOrder) => {
    const success = await updatePurchaseOrderStatus(order.id, 'confirmed');
    if (success) {
      toast.success('Pedido confirmado');
      loadOrders();
    }
  };

  const handleCancel = async (order: PurchaseOrder) => {
    const success = await updatePurchaseOrderStatus(order.id, 'cancelled');
    if (success) {
      toast.success('Pedido cancelado');
      loadOrders();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: es });
  };

  const filtered = orders.filter(o => 
    !search || 
    o.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.document_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por proveedor o número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon" onClick={loadOrders} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
        <Button className="gap-2" onClick={onCreateNew}>
          <Plus className="h-4 w-4" /> Nuevo Pedido
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
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Entrega prevista</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay pedidos de compra
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((order) => (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono">{order.document_number || '-'}</TableCell>
                    <TableCell>{order.supplier_name || '-'}</TableCell>
                    <TableCell>{formatDate(order.order_date)}</TableCell>
                    <TableCell>{formatDate(order.expected_date || '')}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onViewOrder?.(order)}>
                            <Eye className="h-4 w-4 mr-2" /> Ver detalles
                          </DropdownMenuItem>
                          
                          {order.status === 'draft' && (
                            <>
                              <DropdownMenuItem onClick={() => onEditOrder?.(order)}>
                                <Edit className="h-4 w-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleConfirm(order)}>
                                <CheckCircle className="h-4 w-4 mr-2" /> Confirmar
                              </DropdownMenuItem>
                            </>
                          )}

                          {(order.status === 'confirmed' || order.status === 'partial') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => onCreateReceipt?.(order)}>
                                <Truck className="h-4 w-4 mr-2" /> Crear albarán
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onCreateInvoice?.(order)}>
                                <FileText className="h-4 w-4 mr-2" /> Crear factura
                              </DropdownMenuItem>
                            </>
                          )}

                          <DropdownMenuItem onClick={() => toast.info('Función de impresión próximamente')}>
                            <Printer className="h-4 w-4 mr-2" /> Imprimir
                          </DropdownMenuItem>

                          {order.status === 'draft' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleCancel(order)}
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

export default PurchaseOrdersTable;
