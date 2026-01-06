/**
 * Tabla de Albaranes de Entrada con acciones de flujo
 */

import { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Search, Plus, RefreshCw, MoreHorizontal, Eye, Edit, 
  FileText, CheckCircle, XCircle, Loader2, Printer, Undo
} from 'lucide-react';
import { useERPPurchases, GoodsReceipt } from '@/hooks/erp/useERPPurchases';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500',
  confirmed: 'bg-green-500',
  cancelled: 'bg-red-600',
};

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
};

interface GoodsReceiptsTableProps {
  onCreateNew: () => void;
  onViewReceipt?: (receipt: GoodsReceipt) => void;
  onEditReceipt?: (receipt: GoodsReceipt) => void;
  onCreateInvoice?: (receipt: GoodsReceipt) => void;
}

export function GoodsReceiptsTable({ 
  onCreateNew, 
  onViewReceipt, 
  onEditReceipt, 
  onCreateInvoice
}: GoodsReceiptsTableProps) {
  const { fetchGoodsReceipts, confirmGoodsReceipt, cancelGoodsReceipt, isLoading } = useERPPurchases();
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [search, setSearch] = useState('');

  const loadReceipts = useCallback(async () => {
    const data = await fetchGoodsReceipts();
    setReceipts(data);
  }, [fetchGoodsReceipts]);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  const handleConfirm = async (receipt: GoodsReceipt) => {
    const success = await confirmGoodsReceipt(receipt.id);
    if (success) {
      toast.success('Albarán confirmado - Stock actualizado');
      loadReceipts();
    }
  };

  const handleCancel = async (receipt: GoodsReceipt) => {
    const success = await cancelGoodsReceipt(receipt.id);
    if (success) {
      toast.success('Albarán cancelado');
      loadReceipts();
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: es });
  };

  const filtered = receipts.filter(r => 
    !search || 
    r.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.document_number?.toLowerCase().includes(search.toLowerCase())
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
        <Button variant="outline" size="icon" onClick={loadReceipts} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
        <Button className="gap-2" onClick={onCreateNew}>
          <Plus className="h-4 w-4" /> Nuevo Albarán
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
                <TableHead>Pedido</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Almacén</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay albaranes de entrada
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((receipt) => (
                  <TableRow key={receipt.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono">{receipt.document_number || '-'}</TableCell>
                    <TableCell>{receipt.supplier_name || '-'}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {receipt.purchase_order_id ? 'Vinculado' : '-'}
                    </TableCell>
                    <TableCell>{formatDate(receipt.receipt_date)}</TableCell>
                    <TableCell>{receipt.warehouse_name || '-'}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[receipt.status]}>{statusLabels[receipt.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onViewReceipt?.(receipt)}>
                            <Eye className="h-4 w-4 mr-2" /> Ver detalles
                          </DropdownMenuItem>
                          
                          {receipt.status === 'draft' && (
                            <>
                              <DropdownMenuItem onClick={() => onEditReceipt?.(receipt)}>
                                <Edit className="h-4 w-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleConfirm(receipt)}>
                                <CheckCircle className="h-4 w-4 mr-2" /> Confirmar
                              </DropdownMenuItem>
                            </>
                          )}

                          {receipt.status === 'confirmed' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => onCreateInvoice?.(receipt)}>
                                <FileText className="h-4 w-4 mr-2" /> Crear factura
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCancel(receipt)}>
                                <Undo className="h-4 w-4 mr-2" /> Revertir (anular)
                              </DropdownMenuItem>
                            </>
                          )}

                          <DropdownMenuItem onClick={() => toast.info('Función de impresión próximamente')}>
                            <Printer className="h-4 w-4 mr-2" /> Imprimir
                          </DropdownMenuItem>

                          {receipt.status === 'draft' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleCancel(receipt)}
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

export default GoodsReceiptsTable;
