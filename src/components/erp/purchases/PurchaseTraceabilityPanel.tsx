/**
 * Panel de Trazabilidad de Compra
 * Muestra el flujo completo: Pedido → Albaranes → Facturas → Movimientos Stock
 */

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ShoppingCart, Package, FileText, Boxes, ArrowRight, 
  CheckCircle, Clock, XCircle, Loader2, TrendingUp, Warehouse
} from 'lucide-react';
import { useERPPurchases, PurchaseOrder } from '@/hooks/erp/useERPPurchases';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PurchaseTraceabilityPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: PurchaseOrder | null;
  embedded?: boolean;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500',
  confirmed: 'bg-blue-500',
  partial: 'bg-yellow-500',
  received: 'bg-green-600',
  cancelled: 'bg-red-600',
  posted: 'bg-green-500',
  paid: 'bg-emerald-600',
};

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  confirmed: 'Confirmado',
  partial: 'Parcial',
  received: 'Recibido',
  cancelled: 'Cancelado',
  posted: 'Contabilizada',
  paid: 'Pagada',
};

export function PurchaseTraceabilityPanel({ open, onOpenChange, order, embedded = false }: PurchaseTraceabilityPanelProps) {
  const { fetchPurchaseTraceability } = useERPPurchases();
  const [loading, setLoading] = useState(false);
  const [traceability, setTraceability] = useState<{
    order: any;
    receipts: any[];
    invoices: any[];
    movements: any[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (open && order?.id) {
      loadTraceability();
    } else {
      setTraceability(null);
    }
  }, [open, order?.id]);

  const loadTraceability = async () => {
    if (!order?.id) return;
    setLoading(true);
    try {
      const data = await fetchPurchaseTraceability(order.id);
      setTraceability(data);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: es });
  };

  const formatDateTime = (date: string) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: es });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received':
      case 'posted':
      case 'paid':
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'partial':
      case 'draft':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Calcular estadísticas
  const stats = traceability ? {
    totalOrdered: traceability.order?.lines?.reduce((sum: number, l: any) => sum + l.quantity, 0) || 0,
    totalReceived: traceability.order?.lines?.reduce((sum: number, l: any) => sum + (l.received_qty || 0), 0) || 0,
    totalReceipts: traceability.receipts?.length || 0,
    totalInvoices: traceability.invoices?.length || 0,
    totalMovements: traceability.movements?.length || 0,
    invoicedAmount: traceability.invoices?.reduce((sum: number, i: any) => sum + (i.total || 0), 0) || 0,
  } : null;

  const completionPercentage = stats && stats.totalOrdered > 0
    ? Math.round((stats.totalReceived / stats.totalOrdered) * 100)
    : 0;

  const content = (
    <>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5" />
        <h3 className="font-semibold">Trazabilidad de Compra</h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !order ? (
        <div className="text-center py-8 text-muted-foreground">
          Selecciona un pedido desde la pestaña Pedidos para ver su trazabilidad
        </div>
      ) : !traceability ? (
        <div className="text-center py-8 text-muted-foreground">
          No hay datos de trazabilidad
        </div>
      ) : (
        <ScrollArea className={embedded ? "h-[500px]" : "h-[calc(100vh-150px)]"}>
          <div className="space-y-6 pb-6">
            {/* Header del pedido */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    {traceability.order?.document_number || 'Sin número'}
                  </CardTitle>
                  <Badge className={statusColors[traceability.order?.status]}>
                    {statusLabels[traceability.order?.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Proveedor:</span>
                    <p className="font-medium">{traceability.order?.supplier_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha:</span>
                    <p className="font-medium">{formatDate(traceability.order?.order_date)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total:</span>
                    <p className="font-medium">{formatCurrency(traceability.order?.total)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Recepción:</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${completionPercentage}%` }}
                        />
                      </div>
                      <span className="font-medium text-xs">{completionPercentage}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Flujo visual */}
            <div className="flex items-center justify-between gap-2 px-4">
              <div className="flex flex-col items-center gap-1">
                <div className={`p-2 rounded-full ${traceability.order ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <span className="text-xs">Pedido</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col items-center gap-1">
                <div className={`p-2 rounded-full ${stats?.totalReceipts ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <Package className="h-5 w-5" />
                </div>
                <span className="text-xs">{stats?.totalReceipts} Albaranes</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col items-center gap-1">
                <div className={`p-2 rounded-full ${stats?.totalMovements ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <Boxes className="h-5 w-5" />
                </div>
                <span className="text-xs">{stats?.totalMovements} Mov.</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col items-center gap-1">
                <div className={`p-2 rounded-full ${stats?.totalInvoices ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-xs">{stats?.totalInvoices} Facturas</span>
              </div>
            </div>

            <Separator />

            {/* Tabs de detalle */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Resumen</TabsTrigger>
                <TabsTrigger value="receipts">Albaranes</TabsTrigger>
                <TabsTrigger value="stock">Stock</TabsTrigger>
                <TabsTrigger value="invoices">Facturas</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Líneas del Pedido</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Artículo</TableHead>
                          <TableHead className="text-right">Pedido</TableHead>
                          <TableHead className="text-right">Recibido</TableHead>
                          <TableHead className="text-right">Pte.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {traceability.order?.lines?.map((line: any) => {
                          const pending = line.quantity - (line.received_qty || 0);
                          return (
                            <TableRow key={line.id}>
                              <TableCell>
                                <div>
                                  <span className="font-mono text-xs text-muted-foreground">{line.item_code}</span>
                                  <p className="text-sm truncate max-w-[150px]">{line.description}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{line.quantity}</TableCell>
                              <TableCell className="text-right text-green-600">{line.received_qty || 0}</TableCell>
                              <TableCell className={`text-right ${pending > 0 ? 'text-orange-600' : ''}`}>
                                {pending}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="receipts" className="mt-4 space-y-3">
                {traceability.receipts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay albaranes de entrada
                  </div>
                ) : (
                  traceability.receipts.map((receipt) => (
                    <Card key={receipt.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Package className="h-8 w-8 text-primary" />
                            <div>
                              <p className="font-medium">{receipt.document_number || 'Sin número'}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(receipt.receipt_date)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(receipt.status)}
                            <Badge className={statusColors[receipt.status]}>
                              {statusLabels[receipt.status]}
                            </Badge>
                          </div>
                        </div>
                        {receipt.lines?.length > 0 && (
                          <div className="mt-3 text-sm text-muted-foreground">
                            {receipt.lines.length} línea(s) • 
                            {receipt.lines.reduce((sum: number, l: any) => sum + l.quantity, 0)} unidades
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="stock" className="mt-4 space-y-3">
                {traceability.movements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay movimientos de stock
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Almacén</TableHead>
                            <TableHead>Artículo</TableHead>
                            <TableHead className="text-right">Cantidad</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {traceability.movements.map((mov) => (
                            <TableRow key={mov.id}>
                              <TableCell className="text-sm">
                                {formatDateTime(mov.movement_date)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Warehouse className="h-3 w-3" />
                                  {mov.warehouse_name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-xs">{mov.item_code}</span>
                              </TableCell>
                              <TableCell className="text-right font-medium text-green-600">
                                +{mov.quantity}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="invoices" className="mt-4 space-y-3">
                {traceability.invoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay facturas vinculadas
                  </div>
                ) : (
                  traceability.invoices.map((invoice) => (
                    <Card key={invoice.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-primary" />
                            <div>
                              <p className="font-medium">{invoice.document_number || 'Sin número'}</p>
                              <p className="text-sm text-muted-foreground">
                                {invoice.supplier_invoice_number && `Ref: ${invoice.supplier_invoice_number}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={statusColors[invoice.status]}>
                              {statusLabels[invoice.status]}
                            </Badge>
                            <p className="font-medium mt-1">{formatCurrency(invoice.total)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
                {stats && stats.invoicedAmount > 0 && (
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">Total Facturado</span>
                    <span className="font-bold text-lg">{formatCurrency(stats.invoicedAmount)}</span>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      )}
    </>
  );

  if (embedded) {
    return <div className="p-4">{content}</div>;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trazabilidad de Compra
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 mt-4">{content}</div>
      </SheetContent>
    </Sheet>
  );
}

export default PurchaseTraceabilityPanel;
