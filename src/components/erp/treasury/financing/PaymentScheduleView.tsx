/**
 * Vista de Calendario de Pagos
 * Muestra el cuadro de amortización de operaciones de financiación
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Calendar, 
  RefreshCw,
  Euro,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calculator,
  ArrowRight
} from 'lucide-react';
import { useERPFinancingOperations, type FinancingOperation, type FinancingPayment } from '@/hooks/erp/useERPFinancingOperations';
import { format, differenceInDays, isPast, isFuture } from 'date-fns';
import { es } from 'date-fns/locale';

const paymentStatusConfig = {
  pending: { label: 'Pendiente', variant: 'secondary' as const, icon: Clock },
  paid: { label: 'Pagado', variant: 'default' as const, icon: CheckCircle2 },
  overdue: { label: 'Vencido', variant: 'destructive' as const, icon: AlertTriangle },
};

interface PaymentScheduleViewProps {
  operationId?: string;
  operation?: FinancingOperation;
  onClose?: () => void;
}

export function PaymentScheduleView({ operationId, operation, onClose }: PaymentScheduleViewProps) {
  const { 
    fetchOperationWithPayments,
    generateAmortizationSchedule,
    createPayment,
    registerPayment,
    isLoading
  } = useERPFinancingOperations();

  const [operationData, setOperationData] = useState<FinancingOperation | null>(operation || null);
  const [payments, setPayments] = useState<FinancingPayment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<FinancingPayment | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (operationId) {
      loadData();
    }
  }, [operationId]);

  const loadData = async () => {
    if (!operationId) return;
    try {
      const data = await fetchOperationWithPayments(operationId);
      setOperationData(data.operation);
      setPayments(data.payments);
    } catch (error) {
      console.error('Error loading payment schedule:', error);
    }
  };

  const handleGenerateSchedule = async () => {
    if (!operationData) return;
    
    setIsGenerating(true);
    try {
      const schedule = generateAmortizationSchedule(
        operationData.id,
        operationData.company_id,
        operationData.principal_amount,
        operationData.interest_rate,
        operationData.term_months,
        operationData.payment_frequency,
        new Date(operationData.start_date)
      );

      // Create all payments
      for (const payment of schedule) {
        await createPayment(payment);
      }

      await loadData();
    } catch (error) {
      console.error('Error generating schedule:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegisterPayment = async () => {
    if (!selectedPayment) return;
    
    await registerPayment({
      paymentId: selectedPayment.id,
      paymentDate
    });

    setIsRegisterOpen(false);
    setSelectedPayment(null);
    await loadData();
  };

  const openRegisterDialog = (payment: FinancingPayment) => {
    setSelectedPayment(payment);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setIsRegisterOpen(true);
  };

  // Calculate totals
  const totalPrincipal = payments.reduce((sum, p) => sum + p.principal_amount, 0);
  const totalInterest = payments.reduce((sum, p) => sum + p.interest_amount, 0);
  const totalPayments = payments.reduce((sum, p) => sum + p.total_amount, 0);
  const paidPayments = payments.filter(p => p.status === 'paid');
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const overduePayments = payments.filter(p => p.status === 'pending' && isPast(new Date(p.due_date)));

  if (!operationData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <p>Selecciona una operación para ver el calendario de pagos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Operation Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Cuadro de Amortización: {operationData.contract_number}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label className="text-muted-foreground">Principal</Label>
              <p className="text-lg font-bold">
                {operationData.principal_amount.toLocaleString('es-ES', { 
                  style: 'currency', 
                  currency: operationData.currency 
                })}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Tipo de Interés</Label>
              <p className="text-lg font-bold">
                {operationData.interest_rate}% {operationData.interest_type === 'fixed' ? 'Fijo' : 'Variable'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Plazo</Label>
              <p className="text-lg font-bold">{operationData.term_months} meses</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Frecuencia</Label>
              <p className="text-lg font-bold capitalize">
                {operationData.payment_frequency?.replace('_', ' ') || 'Mensual'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total a Pagar</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {totalPayments.toLocaleString('es-ES', { style: 'currency', currency: operationData.currency })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Pagados</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{paidPayments.length}</p>
            <p className="text-xs text-muted-foreground">
              {paidPayments.reduce((sum, p) => sum + p.total_amount, 0).toLocaleString('es-ES', { 
                style: 'currency', 
                currency: operationData.currency 
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Pendientes</span>
            </div>
            <p className="text-2xl font-bold mt-1">{pendingPayments.length}</p>
            <p className="text-xs text-muted-foreground">
              {pendingPayments.reduce((sum, p) => sum + p.total_amount, 0).toLocaleString('es-ES', { 
                style: 'currency', 
                currency: operationData.currency 
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Vencidos</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{overduePayments.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Schedule Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendario de Pagos
          </CardTitle>
          <div className="flex gap-2">
            {payments.length === 0 && (
              <Button 
                onClick={handleGenerateSchedule}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Calculator className="h-4 w-4 mr-1" />
                )}
                Generar Cuadro
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Calendar className="h-8 w-8 mb-2" />
                <p>No hay calendario de pagos generado</p>
                <p className="text-xs">Haz clic en "Generar Cuadro" para crear el calendario</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right">Intereses</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Pendiente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment, index) => {
                    const isOverdue = payment.status === 'pending' && isPast(new Date(payment.due_date));
                    const status = isOverdue ? 'overdue' : payment.status;
                    const statusConfig = paymentStatusConfig[status as keyof typeof paymentStatusConfig];
                    const StatusIcon = statusConfig?.icon || Clock;
                    
                    // Calculate outstanding balance
                    const outstandingBefore = operationData.principal_amount - 
                      payments.slice(0, index)
                        .filter(p => p.status === 'paid')
                        .reduce((sum, p) => sum + p.principal_amount, 0);
                    const outstandingAfter = outstandingBefore - payment.principal_amount;
                    
                    return (
                      <TableRow key={payment.id} className={isOverdue ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                        <TableCell className="font-medium">{payment.payment_number}</TableCell>
                        <TableCell>
                          {format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: es })}
                          {payment.payment_date && (
                            <p className="text-xs text-muted-foreground">
                              Pagado: {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: es })}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {payment.principal_amount.toLocaleString('es-ES', { 
                            style: 'currency', 
                            currency: operationData.currency 
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          {payment.interest_amount.toLocaleString('es-ES', { 
                            style: 'currency', 
                            currency: operationData.currency 
                          })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {payment.total_amount.toLocaleString('es-ES', { 
                            style: 'currency', 
                            currency: operationData.currency 
                          })}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {Math.max(0, outstandingAfter).toLocaleString('es-ES', { 
                            style: 'currency', 
                            currency: operationData.currency 
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={statusConfig?.variant}
                            className="flex items-center gap-1 w-fit"
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payment.status === 'pending' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openRegisterDialog(payment)}
                            >
                              <ArrowRight className="h-4 w-4 mr-1" />
                              Pagar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Totals Summary */}
      {payments.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-8">
                <div>
                  <Label className="text-muted-foreground">Total Principal</Label>
                  <p className="font-bold">
                    {totalPrincipal.toLocaleString('es-ES', { 
                      style: 'currency', 
                      currency: operationData.currency 
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total Intereses</Label>
                  <p className="font-bold">
                    {totalInterest.toLocaleString('es-ES', { 
                      style: 'currency', 
                      currency: operationData.currency 
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Coste Total</Label>
                  <p className="font-bold text-lg">
                    {totalPayments.toLocaleString('es-ES', { 
                      style: 'currency', 
                      currency: operationData.currency 
                    })}
                  </p>
                </div>
              </div>
              {onClose && (
                <Button variant="outline" onClick={onClose}>
                  Cerrar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Register Payment Dialog */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago #{selectedPayment?.payment_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-muted-foreground">Importe</Label>
              <p className="text-xl font-bold">
                {selectedPayment?.total_amount.toLocaleString('es-ES', { 
                  style: 'currency', 
                  currency: operationData.currency 
                })}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Fecha de Pago</Label>
              <Input 
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsRegisterOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegisterPayment}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Confirmar Pago
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PaymentScheduleView;
