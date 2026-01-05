/**
 * Tab especializado para Pólizas de Crédito
 * Gestión de límites de crédito, disponible vs utilizado
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
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  CreditCard, 
  RefreshCw,
  Euro,
  AlertTriangle,
  TrendingUp,
  Eye,
  Clock
} from 'lucide-react';
import { useERPFinancingOperations, type FinancingOperation } from '@/hooks/erp/useERPFinancingOperations';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig = {
  active: { label: 'Activa', variant: 'default' as const },
  pending: { label: 'Pendiente', variant: 'secondary' as const },
  completed: { label: 'Vencida', variant: 'outline' as const },
  cancelled: { label: 'Cancelada', variant: 'destructive' as const },
};

export function CreditPoliciesTab() {
  const { 
    operations, 
    isLoading,
    createOperation,
    updateOperation,
    refetch
  } = useERPFinancingOperations();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<FinancingOperation | null>(null);
  const [formData, setFormData] = useState({
    contract_number: '',
    financial_entity_name: '',
    credit_limit: '',
    interest_rate: '',
    reference_rate: 'euribor_12m',
    spread: '',
    start_date: '',
    end_date: '',
    description: '',
  });

  const creditPolicies = operations.filter(op => 
    op.operation_type === 'credit_policy' || op.operation_type === 'credit_line'
  );

  const handleCreate = async () => {
    if (!formData.contract_number || !formData.credit_limit || !formData.financial_entity_name) return;
    
    await createOperation({
      operation_type: 'credit_policy',
      contract_number: formData.contract_number,
      financial_entity_name: formData.financial_entity_name,
      principal_amount: 0, // Initially no drawn amount
      credit_limit: parseFloat(formData.credit_limit),
      interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : 0,
      interest_type: 'variable',
      reference_rate: formData.reference_rate || undefined,
      spread: formData.spread ? parseFloat(formData.spread) : undefined,
      start_date: formData.start_date || new Date().toISOString().split('T')[0],
      end_date: formData.end_date || new Date().toISOString().split('T')[0],
      term_months: 12,
      payment_frequency: 'monthly',
      description: formData.description || undefined,
    });
    
    setIsCreateOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      contract_number: '',
      financial_entity_name: '',
      credit_limit: '',
      interest_rate: '',
      reference_rate: 'euribor_12m',
      spread: '',
      start_date: '',
      end_date: '',
      description: '',
    });
  };

  // Calculate stats
  const totalLimit = creditPolicies
    .filter(op => op.status === 'active')
    .reduce((sum, op) => sum + (op.credit_limit || 0), 0);
  
  const totalUsed = creditPolicies
    .filter(op => op.status === 'active')
    .reduce((sum, op) => sum + op.outstanding_balance, 0);

  const totalAvailable = totalLimit - totalUsed;
  const utilizationRate = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

  const expiringPolicies = creditPolicies.filter(op => {
    if (!op.end_date || op.status !== 'active') return false;
    const days = differenceInDays(new Date(op.end_date), new Date());
    return days >= 0 && days <= 60;
  });

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Límite Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {totalLimit.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Dispuesto</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">
              {totalUsed.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Disponible</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">
              {totalAvailable.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Próx. Renovación</span>
            </div>
            <p className="text-2xl font-bold mt-1">{expiringPolicies.length}</p>
            <p className="text-xs text-muted-foreground">en 60 días</p>
          </CardContent>
        </Card>
      </div>

      {/* Utilization Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Utilización Global</span>
            <span className={`text-sm font-bold ${utilizationRate > 80 ? 'text-red-600' : 'text-green-600'}`}>
              {utilizationRate.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={utilizationRate} 
            className={`h-3 ${utilizationRate > 80 ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}`}
          />
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>Dispuesto: {totalUsed.toLocaleString('es-ES')} €</span>
            <span>Límite: {totalLimit.toLocaleString('es-ES')} €</span>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pólizas de Crédito
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
                  Nueva Póliza
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nueva Póliza de Crédito</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nº Póliza *</Label>
                    <Input 
                      value={formData.contract_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, contract_number: e.target.value }))}
                      placeholder="POL-2024-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Entidad Financiera *</Label>
                    <Input 
                      value={formData.financial_entity_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, financial_entity_name: e.target.value }))}
                      placeholder="Banco Santander"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Límite de Crédito (€) *</Label>
                    <Input 
                      type="number"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData(prev => ({ ...prev, credit_limit: e.target.value }))}
                      placeholder="100000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Referencia</Label>
                    <Select 
                      value={formData.reference_rate} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, reference_rate: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="euribor_1m">Euribor 1M</SelectItem>
                        <SelectItem value="euribor_3m">Euribor 3M</SelectItem>
                        <SelectItem value="euribor_6m">Euribor 6M</SelectItem>
                        <SelectItem value="euribor_12m">Euribor 12M</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Diferencial (%)</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={formData.spread}
                      onChange={(e) => setFormData(prev => ({ ...prev, spread: e.target.value }))}
                      placeholder="1.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo Interés Actual (%)</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={formData.interest_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, interest_rate: e.target.value }))}
                      placeholder="4.5"
                    />
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
                    <Label>Fecha Vencimiento</Label>
                    <Input 
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Notas</Label>
                    <Textarea 
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Condiciones especiales, garantías, etc..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate}>
                    Crear Póliza
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : creditPolicies.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <CreditCard className="h-8 w-8 mb-2" />
                <p>No hay pólizas de crédito registradas</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Póliza</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead className="text-right">Límite</TableHead>
                    <TableHead className="text-right">Dispuesto</TableHead>
                    <TableHead>Utilización</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditPolicies.map((policy) => {
                    const status = statusConfig[policy.status as keyof typeof statusConfig];
                    const limit = policy.credit_limit || 0;
                    const used = policy.outstanding_balance;
                    const utilization = limit > 0 ? (used / limit) * 100 : 0;
                    const daysToExpiry = policy.end_date 
                      ? differenceInDays(new Date(policy.end_date), new Date())
                      : null;
                    
                    return (
                      <TableRow key={policy.id}>
                        <TableCell className="font-medium">
                          {policy.contract_number}
                        </TableCell>
                        <TableCell>{policy.financial_entity_name}</TableCell>
                        <TableCell className="text-right">
                          {limit.toLocaleString('es-ES', { style: 'currency', currency: policy.currency })}
                        </TableCell>
                        <TableCell className="text-right">
                          {used.toLocaleString('es-ES', { style: 'currency', currency: policy.currency })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={utilization} 
                              className={`h-2 w-16 ${utilization > 80 ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}`}
                            />
                            <span className="text-xs">{utilization.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {daysToExpiry !== null && daysToExpiry <= 30 && (
                              <AlertTriangle className="h-3 w-3 text-orange-500" />
                            )}
                            {policy.end_date 
                              ? format(new Date(policy.end_date), 'dd/MM/yyyy', { locale: es })
                              : '-'
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status?.variant}>{status?.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setSelectedPolicy(policy)}
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
      <Dialog open={!!selectedPolicy} onOpenChange={() => setSelectedPolicy(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle Póliza: {selectedPolicy?.contract_number}</DialogTitle>
          </DialogHeader>
          {selectedPolicy && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Entidad Financiera</Label>
                  <p className="font-medium">{selectedPolicy.financial_entity_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Límite de Crédito</Label>
                  <p className="font-medium">
                    {(selectedPolicy.credit_limit || 0).toLocaleString('es-ES', { 
                      style: 'currency', 
                      currency: selectedPolicy.currency 
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Dispuesto</Label>
                  <p className="font-medium text-red-600">
                    {selectedPolicy.outstanding_balance.toLocaleString('es-ES', { 
                      style: 'currency', 
                      currency: selectedPolicy.currency 
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Disponible</Label>
                  <p className="font-medium text-green-600">
                    {((selectedPolicy.credit_limit || 0) - selectedPolicy.outstanding_balance).toLocaleString('es-ES', { 
                      style: 'currency', 
                      currency: selectedPolicy.currency 
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Referencia + Diferencial</Label>
                  <p className="font-medium">
                    {selectedPolicy.reference_rate?.replace('_', ' ').toUpperCase() || '-'} 
                    {selectedPolicy.spread ? ` + ${selectedPolicy.spread}%` : ''}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tipo Aplicado</Label>
                  <p className="font-medium">{selectedPolicy.interest_rate}%</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Inicio</Label>
                  <p className="font-medium">
                    {format(new Date(selectedPolicy.start_date), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Vencimiento</Label>
                  <p className="font-medium">
                    {format(new Date(selectedPolicy.end_date), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
              </div>
              {selectedPolicy.description && (
                <div>
                  <Label className="text-muted-foreground">Notas</Label>
                  <p className="mt-1">{selectedPolicy.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CreditPoliciesTab;
