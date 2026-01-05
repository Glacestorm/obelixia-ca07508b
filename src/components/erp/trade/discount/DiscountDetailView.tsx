/**
 * Vista detallada de una Operación de Descuento Comercial
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Building2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Send,
  TrendingUp,
  BookOpen,
  Edit,
} from 'lucide-react';
import { CommercialDiscount, DiscountEffect, useERPDiscountOperations } from '@/hooks/erp/useERPDiscountOperations';
import { OperationAccountingPanel } from '../OperationAccountingPanel';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DiscountDetailViewProps {
  discount: CommercialDiscount;
  onBack: () => void;
  onUpdate?: () => void;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  draft: { label: 'Borrador', variant: 'outline', icon: FileText },
  pending: { label: 'Pendiente', variant: 'secondary', icon: Clock },
  sent: { label: 'Enviado', variant: 'default', icon: Send },
  discounted: { label: 'Descontado', variant: 'default', icon: CheckCircle },
  partial_paid: { label: 'Cobro parcial', variant: 'secondary', icon: TrendingUp },
  paid: { label: 'Cobrado', variant: 'default', icon: CheckCircle },
  returned: { label: 'Devuelto', variant: 'destructive', icon: AlertTriangle },
  cancelled: { label: 'Cancelado', variant: 'outline', icon: AlertTriangle }
};

export function DiscountDetailView({ discount, onBack, onUpdate }: DiscountDetailViewProps) {
  const [activeTab, setActiveTab] = useState('details');
  const { effects, fetchEffects } = useERPDiscountOperations();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEffects(discount.id);
  }, [discount.id, fetchEffects]);

  const discountEffects = effects.filter(e => e.discount_id === discount.id);
  const status = statusConfig[discount.status] || statusConfig.draft;
  const StatusIcon = status.icon;

  const formatCurrency = (amount: number | null | undefined, currency = 'EUR') => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency
    }).format(amount || 0);
  };

  const utilizationPercentage = discount.total_nominal && discount.total_nominal > 0
    ? ((discount.net_amount || 0) / discount.total_nominal) * 100
    : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">{discount.discount_number}</CardTitle>
                <Badge variant={status.variant} className="gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {discount.operation_type === 'national' ? 'Descuento Nacional' : 'Descuento Internacional'}
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nominal Total</p>
              <p className="text-2xl font-bold">
                {formatCurrency(discount.total_nominal, discount.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Intereses</p>
              <p className="text-xl font-semibold text-amber-600">
                {formatCurrency(discount.interest_amount, discount.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Comisiones</p>
              <p className="text-xl font-semibold text-amber-600">
                {formatCurrency(discount.commission_amount, discount.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Líquido</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(discount.net_amount, discount.currency)}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Efectividad</span>
              <span>{utilizationPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={utilizationPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Details Tabs */}
      <Card>
        <CardContent className="pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="details">Detalles</TabsTrigger>
              <TabsTrigger value="effects">Efectos ({discountEffects.length})</TabsTrigger>
              <TabsTrigger value="costs">Costes</TabsTrigger>
              <TabsTrigger value="accounting" className="gap-1">
                <BookOpen className="h-4 w-4" />
                Contabilidad
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Entidad Financiera</p>
                    </div>
                    <p className="font-medium">{discount.entity?.entity_name || 'No asignada'}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Fechas</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Descuento: </span>
                        <span className="font-medium">
                          {discount.discount_date 
                            ? format(new Date(discount.discount_date), 'dd/MM/yyyy', { locale: es })
                            : '-'
                          }
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor: </span>
                        <span className="font-medium">
                          {discount.value_date 
                            ? format(new Date(discount.value_date), 'dd/MM/yyyy', { locale: es })
                            : '-'
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {discount.internal_notes && (
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground mb-2">Notas</p>
                    <p className="text-sm whitespace-pre-wrap">{discount.internal_notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="effects" className="mt-4">
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº Efecto</TableHead>
                      <TableHead>Librado</TableHead>
                      <TableHead className="text-right">Nominal</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discountEffects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No hay efectos registrados
                        </TableCell>
                      </TableRow>
                    ) : (
                      discountEffects.map((effect) => (
                        <TableRow key={effect.id}>
                          <TableCell className="font-medium">{effect.effect_number}</TableCell>
                          <TableCell>{effect.drawer_name || '-'}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(effect.amount, effect.currency)}
                          </TableCell>
                          <TableCell>
                            {format(new Date(effect.maturity_date), 'dd/MM/yyyy', { locale: es })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={effect.status === 'paid' ? 'default' : 'secondary'}>
                              {effect.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="costs" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground">Tipo de Interés</p>
                  <p className="text-xl font-bold">
                    {discount.interest_rate ? `${(discount.interest_rate * 100).toFixed(2)}%` : '-'}
                  </p>
                </div>
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground">Importe Intereses</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(discount.interest_amount, discount.currency)}
                  </p>
                </div>
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground">Comisiones</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(discount.commission_amount, discount.currency)}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="accounting" className="mt-4">
              <OperationAccountingPanel
                sourceId={discount.id}
                sourceType="commercial_discount"
                operationData={{
                  amount: discount.total_nominal || 0,
                  interestAmount: discount.interest_amount || 0,
                  commissionAmount: discount.commission_amount || 0,
                  netAmount: discount.net_amount || 0,
                  currency: discount.currency,
                }}
                onAccountingChange={onUpdate}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default DiscountDetailView;
