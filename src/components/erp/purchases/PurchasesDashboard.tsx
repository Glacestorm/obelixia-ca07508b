import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  ShoppingCart,
  Package,
  Receipt,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  DollarSign,
  BarChart3
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PurchasesDashboardProps {
  rfqs: any[];
  purchaseOrders: any[];
  goodsReceipts: any[];
  supplierInvoices: any[];
  suppliers: any[];
  onNavigate: (tab: string) => void;
}

export function PurchasesDashboard({
  rfqs,
  purchaseOrders,
  goodsReceipts,
  supplierInvoices,
  suppliers,
  onNavigate
}: PurchasesDashboardProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // RFQ stats
    const activeRFQs = rfqs.filter(r => ['draft', 'sent', 'evaluating'].includes(r.status));
    const awardedRFQs = rfqs.filter(r => r.status === 'awarded');
    const recentRFQs = rfqs.filter(r => new Date(r.created_at) >= thirtyDaysAgo);

    // PO stats
    const pendingPOs = purchaseOrders.filter(po => po.status === 'pending');
    const confirmedPOs = purchaseOrders.filter(po => po.status === 'confirmed');
    const totalPOValue = purchaseOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0);

    // Receipt stats
    const pendingReceipts = goodsReceipts.filter(gr => gr.status === 'pending');
    const completedReceipts = goodsReceipts.filter(gr => gr.status === 'received');

    // Invoice stats
    const pendingInvoices = supplierInvoices.filter(inv => inv.status === 'pending');
    const postedInvoices = supplierInvoices.filter(inv => inv.status === 'posted');
    const totalInvoiceValue = supplierInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const pendingPaymentValue = pendingInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    // Supplier stats
    const activeSuppliers = suppliers.filter(s => s.is_active);

    return {
      rfqs: { total: rfqs.length, active: activeRFQs.length, awarded: awardedRFQs.length, recent: recentRFQs.length },
      orders: { total: purchaseOrders.length, pending: pendingPOs.length, confirmed: confirmedPOs.length, value: totalPOValue },
      receipts: { total: goodsReceipts.length, pending: pendingReceipts.length, completed: completedReceipts.length },
      invoices: { total: supplierInvoices.length, pending: pendingInvoices.length, posted: postedInvoices.length, value: totalInvoiceValue, pendingValue: pendingPaymentValue },
      suppliers: { total: suppliers.length, active: activeSuppliers.length }
    };
  }, [rfqs, purchaseOrders, goodsReceipts, supplierInvoices, suppliers]);

  const recentActivity = useMemo(() => {
    const activities: Array<{
      type: string;
      title: string;
      description: string;
      date: Date;
      status: string;
      icon: any;
    }> = [];

    rfqs.slice(0, 3).forEach(rfq => {
      activities.push({
        type: 'rfq',
        title: `RFQ ${rfq.rfq_number}`,
        description: rfq.title || 'Solicitud de cotización',
        date: new Date(rfq.created_at),
        status: rfq.status,
        icon: FileText
      });
    });

    purchaseOrders.slice(0, 3).forEach(po => {
      activities.push({
        type: 'order',
        title: `OC ${po.order_number}`,
        description: po.supplier_name || 'Orden de compra',
        date: new Date(po.created_at),
        status: po.status,
        icon: ShoppingCart
      });
    });

    goodsReceipts.slice(0, 2).forEach(gr => {
      activities.push({
        type: 'receipt',
        title: `Albarán ${gr.receipt_number}`,
        description: gr.supplier_name || 'Recepción de mercancía',
        date: new Date(gr.created_at),
        status: gr.status,
        icon: Package
      });
    });

    return activities
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 6);
  }, [rfqs, purchaseOrders, goodsReceipts]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      draft: { variant: 'secondary', label: 'Borrador' },
      pending: { variant: 'outline', label: 'Pendiente' },
      sent: { variant: 'default', label: 'Enviada' },
      evaluating: { variant: 'default', label: 'Evaluando' },
      awarded: { variant: 'default', label: 'Adjudicada' },
      confirmed: { variant: 'default', label: 'Confirmada' },
      received: { variant: 'default', label: 'Recibido' },
      posted: { variant: 'default', label: 'Contabilizada' },
      cancelled: { variant: 'destructive', label: 'Cancelada' }
    };
    const config = variants[status] || { variant: 'secondary' as const, label: status };
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate('rfqs')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">RFQs Activas</p>
                <p className="text-2xl font-bold">{stats.rfqs.active}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.rfqs.awarded} adjudicadas
                </p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate('orders')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Órdenes Pendientes</p>
                <p className="text-2xl font-bold">{stats.orders.pending}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.orders.confirmed} confirmadas
                </p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <ShoppingCart className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate('receipts')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Recepciones Pend.</p>
                <p className="text-2xl font-bold">{stats.receipts.pending}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.receipts.completed} completadas
                </p>
              </div>
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Package className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate('invoices')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Facturas Pend.</p>
                <p className="text-2xl font-bold">{stats.invoices.pending}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  €{stats.invoices.pendingValue.toLocaleString()}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10">
                <Receipt className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate('suppliers')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Proveedores</p>
                <p className="text-2xl font-bold">{stats.suppliers.active}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.suppliers.total} total
                </p>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Value Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Resumen de Valores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Órdenes totales</span>
              <span className="font-medium">€{stats.orders.value.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Facturas totales</span>
              <span className="font-medium">€{stats.invoices.value.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pendiente de pago</span>
              <span className="font-medium text-orange-600">€{stats.invoices.pendingValue.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Estado del Flujo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">RFQs → Órdenes</span>
                <span>{stats.rfqs.awarded > 0 ? Math.round((stats.orders.total / stats.rfqs.awarded) * 100) : 0}%</span>
              </div>
              <Progress value={stats.rfqs.awarded > 0 ? (stats.orders.total / stats.rfqs.awarded) * 100 : 0} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Órdenes → Recepciones</span>
                <span>{stats.orders.confirmed > 0 ? Math.round((stats.receipts.completed / stats.orders.confirmed) * 100) : 0}%</span>
              </div>
              <Progress value={stats.orders.confirmed > 0 ? (stats.receipts.completed / stats.orders.confirmed) * 100 : 0} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Recepciones → Facturas</span>
                <span>{stats.receipts.completed > 0 ? Math.round((stats.invoices.posted / stats.receipts.completed) * 100) : 0}%</span>
              </div>
              <Progress value={stats.receipts.completed > 0 ? (stats.invoices.posted / stats.receipts.completed) * 100 : 0} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[140px]">
              <div className="space-y-2">
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sin actividad reciente
                  </p>
                ) : (
                  recentActivity.map((activity, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                      <activity.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {getStatusBadge(activity.status)}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(activity.date, { locale: es, addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {(stats.orders.pending > 5 || stats.invoices.pending > 10 || stats.receipts.pending > 3) && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-4 w-4" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.orders.pending > 5 && (
                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                  {stats.orders.pending} órdenes pendientes de confirmar
                </Badge>
              )}
              {stats.invoices.pending > 10 && (
                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                  {stats.invoices.pending} facturas pendientes de contabilizar
                </Badge>
              )}
              {stats.receipts.pending > 3 && (
                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                  {stats.receipts.pending} recepciones pendientes
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default PurchasesDashboard;
