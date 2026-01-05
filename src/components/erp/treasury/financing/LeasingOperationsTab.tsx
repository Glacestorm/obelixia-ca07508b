/**
 * Tab especializado para operaciones de Leasing
 * Gestión de contratos de leasing con valor residual
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Car, 
  Calendar,
  RefreshCw,
  Euro,
  FileText,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { useERPFinancingOperations, type FinancingOperation } from '@/hooks/erp/useERPFinancingOperations';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig = {
  active: { label: 'Activo', variant: 'default' as const },
  pending: { label: 'Pendiente', variant: 'secondary' as const },
  completed: { label: 'Finalizado', variant: 'outline' as const },
  cancelled: { label: 'Cancelado', variant: 'destructive' as const },
};

export function LeasingOperationsTab() {
  const { 
    operations, 
    isLoading,
    createOperation,
    refetch
  } = useERPFinancingOperations();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<FinancingOperation | null>(null);
  const [formData, setFormData] = useState({
    contract_number: '',
    financial_entity_name: '',
    principal_amount: '',
    interest_rate: '',
    interest_type: 'fixed' as const,
    start_date: '',
    end_date: '',
    term_months: '',
    payment_frequency: 'monthly' as const,
    asset_description: '',
    residual_value: '',
    description: '',
  });

  const leasingOperations = operations.filter(op => 
    op.operation_type === 'leasing' || op.operation_type === 'renting'
  );

  const handleCreate = async () => {
    if (!formData.contract_number || !formData.principal_amount || !formData.financial_entity_name) return;
    
    await createOperation({
      operation_type: 'leasing',
      contract_number: formData.contract_number,
      financial_entity_name: formData.financial_entity_name,
      principal_amount: parseFloat(formData.principal_amount),
      interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : 0,
      interest_type: formData.interest_type,
      start_date: formData.start_date || new Date().toISOString().split('T')[0],
      end_date: formData.end_date || new Date().toISOString().split('T')[0],
      term_months: formData.term_months ? parseInt(formData.term_months) : 12,
      payment_frequency: formData.payment_frequency,
      asset_description: formData.asset_description || undefined,
      residual_value: formData.residual_value ? parseFloat(formData.residual_value) : undefined,
      description: formData.description || undefined,
    });
    
    setIsCreateOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      contract_number: '',
      financial_entity_name: '',
      principal_amount: '',
      interest_rate: '',
      interest_type: 'fixed',
      start_date: '',
      end_date: '',
      term_months: '',
      payment_frequency: 'monthly',
      asset_description: '',
      residual_value: '',
      description: '',
    });
  };

  // Calculate stats
  const totalValue = leasingOperations
    .filter(op => op.status === 'active')
    .reduce((sum, op) => sum + op.principal_amount, 0);
  
  const totalOutstanding = leasingOperations
    .filter(op => op.status === 'active')
    .reduce((sum, op) => sum + op.outstanding_balance, 0);

  const upcomingPayments = leasingOperations.filter(op => {
    if (!op.next_payment_date || op.status !== 'active') return false;
    const days = differenceInDays(new Date(op.next_payment_date), new Date());
    return days >= 0 && days <= 30;
  });

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Contratos Activos</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {leasingOperations.filter(op => op.status === 'active').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Valor Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {totalValue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Pendiente Pago</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {totalOutstanding.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Próx. 30 días</span>
            </div>
            <p className="text-2xl font-bold mt-1">{upcomingPayments.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Contratos de Leasing
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Actualizar
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Nuevo Leasing
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nuevo Contrato de Leasing</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nº Contrato *</Label>
                    <Input 
                      value={formData.contract_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, contract_number: e.target.value }))}
                      placeholder="LEAS-2024-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Entidad Financiera *</Label>
                    <Input 
                      value={formData.financial_entity_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, financial_entity_name: e.target.value }))}
                      placeholder="Arval, ALD, etc."
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Descripción del Activo *</Label>
                    <Input 
                      value={formData.asset_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, asset_description: e.target.value }))}
                      placeholder="Vehículo Audi A4 2.0 TDI, Matrícula 1234-ABC"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Importe Financiado (€) *</Label>
                    <Input 
                      type="number"
                      value={formData.principal_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, principal_amount: e.target.value }))}
                      placeholder="35000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Residual (€)</Label>
                    <Input 
                      type="number"
                      value={formData.residual_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, residual_value: e.target.value }))}
                      placeholder="5000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Interés (%)</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={formData.interest_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, interest_rate: e.target.value }))}
                      placeholder="3.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo Interés</Label>
                    <Select 
                      value={formData.interest_type} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, interest_type: v as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fijo</SelectItem>
                        <SelectItem value="variable">Variable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha Inicio</Label>
                    <Input 
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha Fin</Label>
                    <Input 
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Plazo (meses)</Label>
                    <Input 
                      type="number"
                      value={formData.term_months}
                      onChange={(e) => setFormData(prev => ({ ...prev, term_months: e.target.value }))}
                      placeholder="48"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Frecuencia de Pago</Label>
                    <Select 
                      value={formData.payment_frequency} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, payment_frequency: v as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensual</SelectItem>
                        <SelectItem value="quarterly">Trimestral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Notas</Label>
                    <Textarea 
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Observaciones del contrato..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate}>
                    Crear Contrato
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : leasingOperations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Car className="h-8 w-8 mb-2" />
                <p>No hay contratos de leasing registrados</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead className="text-right">Pendiente</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leasingOperations.map((operation) => {
                    const status = statusConfig[operation.status as keyof typeof statusConfig];
                    
                    return (
                      <TableRow key={operation.id}>
                        <TableCell className="font-medium">
                          {operation.contract_number}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {operation.asset_description || '-'}
                        </TableCell>
                        <TableCell>{operation.financial_entity_name}</TableCell>
                        <TableCell className="text-right">
                          {operation.principal_amount.toLocaleString('es-ES', { 
                            style: 'currency', 
                            currency: operation.currency 
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          {operation.outstanding_balance.toLocaleString('es-ES', { 
                            style: 'currency', 
                            currency: operation.currency 
                          })}
                        </TableCell>
                        <TableCell>
                          {operation.end_date 
                            ? format(new Date(operation.end_date), 'dd/MM/yyyy', { locale: es })
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={status?.variant}>{status?.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setSelectedOperation(operation)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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

      {/* Detail Dialog */}
      <Dialog open={!!selectedOperation} onOpenChange={() => setSelectedOperation(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle del Contrato: {selectedOperation?.contract_number}</DialogTitle>
          </DialogHeader>
          {selectedOperation && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Activo</Label>
                  <p className="font-medium">{selectedOperation.asset_description || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Entidad Financiera</Label>
                  <p className="font-medium">{selectedOperation.financial_entity_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Importe Financiado</Label>
                  <p className="font-medium">
                    {selectedOperation.principal_amount.toLocaleString('es-ES', { 
                      style: 'currency', 
                      currency: selectedOperation.currency 
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Valor Residual</Label>
                  <p className="font-medium">
                    {selectedOperation.residual_value 
                      ? selectedOperation.residual_value.toLocaleString('es-ES', { 
                          style: 'currency', 
                          currency: selectedOperation.currency 
                        })
                      : '-'
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tipo de Interés</Label>
                  <p className="font-medium">
                    {selectedOperation.interest_rate}% {selectedOperation.interest_type === 'fixed' ? 'Fijo' : 'Variable'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Plazo</Label>
                  <p className="font-medium">{selectedOperation.term_months} meses</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Inicio</Label>
                  <p className="font-medium">
                    {format(new Date(selectedOperation.start_date), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fin</Label>
                  <p className="font-medium">
                    {format(new Date(selectedOperation.end_date), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
              </div>
              {selectedOperation.description && (
                <div>
                  <Label className="text-muted-foreground">Notas</Label>
                  <p className="mt-1">{selectedOperation.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LeasingOperationsTab;
