/**
 * Vista detallada de un Contrato de Factoring
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
  Percent,
  Calendar,
  Building2,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  BookOpen,
  Edit,
  FileText,
} from 'lucide-react';
import { FactoringContract, FactoringAssignment, useERPFactoring } from '@/hooks/erp/useERPFactoring';
import { OperationAccountingPanel } from '../OperationAccountingPanel';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface FactoringDetailViewProps {
  contract: FactoringContract;
  onBack: () => void;
  onUpdate?: () => void;
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  with_recourse: 'Con Recurso',
  without_recourse: 'Sin Recurso',
  reverse_factoring: 'Confirming',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  active: { label: 'Activo', variant: 'default', icon: CheckCircle },
  suspended: { label: 'Suspendido', variant: 'secondary', icon: Clock },
  terminated: { label: 'Terminado', variant: 'destructive', icon: AlertTriangle },
  expired: { label: 'Vencido', variant: 'outline', icon: Clock },
};

export function FactoringDetailView({ contract, onBack, onUpdate }: FactoringDetailViewProps) {
  const [activeTab, setActiveTab] = useState('details');
  const { assignments, fetchAssignments } = useERPFactoring();

  useEffect(() => {
    fetchAssignments(contract.id);
  }, [contract.id, fetchAssignments]);

  const contractAssignments = assignments.filter(a => a.contract_id === contract.id);
  const status = STATUS_CONFIG[contract.status] || STATUS_CONFIG.active;
  const StatusIcon = status.icon;

  const formatCurrency = (amount: number | string | null | undefined, currency = 'EUR') => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency
    }).format(Number(amount) || 0);
  };

  const utilizationPercentage = Number(contract.global_limit) > 0
    ? ((Number(contract.global_limit) - Number(contract.available_limit)) / Number(contract.global_limit)) * 100
    : 0;

  const totalAdvanced = contractAssignments.reduce((sum, a) => sum + Number(a.advance_amount || 0), 0);

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
                <Percent className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">{contract.contract_number}</CardTitle>
                <Badge variant={status.variant} className="gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {CONTRACT_TYPE_LABELS[contract.contract_type] || contract.contract_type}
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
              <p className="text-sm text-muted-foreground">Límite Global</p>
              <p className="text-2xl font-bold">
                {formatCurrency(contract.global_limit, contract.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Disponible</p>
              <p className="text-xl font-semibold text-green-600">
                {formatCurrency(contract.available_limit, contract.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">% Anticipo</p>
              <p className="text-xl font-semibold">
                {contract.advance_percentage}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Anticipado</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalAdvanced, contract.currency)}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Utilización del Límite</span>
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
              <TabsTrigger value="assignments">Cesiones ({contractAssignments.length})</TabsTrigger>
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
                    <p className="font-medium">{contract.financial_entity?.name || 'No asignada'}</p>
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
                        <span className="text-muted-foreground">Inicio: </span>
                        <span className="font-medium">
                          {contract.start_date 
                            ? format(new Date(contract.start_date), 'dd/MM/yyyy', { locale: es })
                            : '-'
                          }
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fin: </span>
                        <span className="font-medium">
                          {contract.end_date 
                            ? format(new Date(contract.end_date), 'dd/MM/yyyy', { locale: es })
                            : '-'
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {contract.notes && (
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground mb-2">Notas</p>
                    <p className="text-sm whitespace-pre-wrap">{contract.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="assignments" className="mt-4">
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Factura</TableHead>
                      <TableHead>Deudor</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                      <TableHead className="text-right">Anticipado</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contractAssignments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No hay cesiones registradas
                        </TableCell>
                      </TableRow>
                    ) : (
                      contractAssignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">{assignment.invoice_number}</TableCell>
                          <TableCell>{assignment.debtor?.legal_name || assignment.debtor_name}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(assignment.invoice_amount, assignment.currency)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-blue-600">
                            {formatCurrency(assignment.advance_amount, assignment.currency)}
                          </TableCell>
                          <TableCell>
                            {format(new Date(assignment.due_date), 'dd/MM/yyyy', { locale: es })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={assignment.status === 'collected' ? 'default' : 'secondary'}>
                              {assignment.status}
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
                    {contract.interest_rate ? `${(Number(contract.interest_rate) * 100).toFixed(2)}%` : '-'}
                  </p>
                </div>
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground">Comisión de Factoring</p>
                  <p className="text-xl font-bold">
                    {contract.commission_rate ? `${(Number(contract.commission_rate) * 100).toFixed(2)}%` : '-'}
                  </p>
                </div>
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground">% de Anticipo</p>
                  <p className="text-xl font-bold">
                    {contract.advance_percentage}%
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="accounting" className="mt-4">
              <OperationAccountingPanel
                sourceId={contract.id}
                sourceType="factoring"
                operationData={{
                  amount: Number(contract.global_limit) || 0,
                  currency: contract.currency,
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

export default FactoringDetailView;
