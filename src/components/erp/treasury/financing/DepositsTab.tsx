/**
 * Tab especializado para Depósitos a Plazo
 * Gestión de certificados de depósito
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
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  PiggyBank, 
  RefreshCw,
  Euro,
  Calendar,
  TrendingUp,
  Eye,
  Bell
} from 'lucide-react';
import { useERPInvestments, type Investment } from '@/hooks/erp/useERPInvestments';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig = {
  active: { label: 'Activo', variant: 'default' as const },
  matured: { label: 'Vencido', variant: 'secondary' as const },
  renewed: { label: 'Renovado', variant: 'outline' as const },
  cancelled: { label: 'Cancelado', variant: 'destructive' as const },
};

export function DepositsTab() {
  const { 
    investments, 
    isLoading,
    createInvestment,
    refetch
  } = useERPInvestments();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<Investment | null>(null);
  const [formData, setFormData] = useState({
    investment_name: '',
    financial_entity_name: '',
    nominal_amount: '',
    interest_rate: '',
    purchase_date: '',
    maturity_date: '',
    auto_renewal: false,
    description: '',
  });

  const deposits = investments.filter(inv => inv.investment_type === 'term_deposit');

  const handleCreate = async () => {
    if (!formData.investment_name || !formData.nominal_amount || !formData.financial_entity_name) return;
    
    await createInvestment({
      investment_type: 'term_deposit',
      investment_name: formData.investment_name,
      financial_entity_name: formData.financial_entity_name,
      nominal_amount: parseFloat(formData.nominal_amount),
      interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : undefined,
      purchase_date: formData.purchase_date || new Date().toISOString().split('T')[0],
      maturity_date: formData.maturity_date || undefined,
      description: formData.description || undefined,
    });
    
    setIsCreateOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      investment_name: '',
      financial_entity_name: '',
      nominal_amount: '',
      interest_rate: '',
      purchase_date: '',
      maturity_date: '',
      auto_renewal: false,
      description: '',
    });
  };

  // Calculate stats
  const totalDeposits = deposits
    .filter(d => d.status === 'active')
    .reduce((sum, d) => sum + d.nominal_amount, 0);

  const avgRate = deposits.length > 0
    ? deposits.reduce((sum, d) => sum + (d.interest_rate || 0), 0) / deposits.length
    : 0;

  const expectedInterest = deposits
    .filter(d => d.status === 'active')
    .reduce((sum, d) => {
      if (!d.interest_rate || !d.maturity_date) return sum;
      const days = differenceInDays(new Date(d.maturity_date), new Date(d.purchase_date));
      return sum + (d.nominal_amount * (d.interest_rate / 100) * (days / 365));
    }, 0);

  const upcomingMaturities = deposits.filter(d => {
    if (!d.maturity_date || d.status !== 'active') return false;
    const days = differenceInDays(new Date(d.maturity_date), new Date());
    return days >= 0 && days <= 30;
  });

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Depósitos Activos</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {deposits.filter(d => d.status === 'active').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Capital Depositado</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {totalDeposits.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Interés Esperado</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">
              {expectedInterest.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Próx. Vencimientos</span>
            </div>
            <p className="text-2xl font-bold mt-1">{upcomingMaturities.length}</p>
            <p className="text-xs text-muted-foreground">en 30 días</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            Depósitos a Plazo
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
                  Nuevo Depósito
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Nuevo Depósito a Plazo</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Nombre del Depósito *</Label>
                    <Input 
                      value={formData.investment_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, investment_name: e.target.value }))}
                      placeholder="Depósito 12 meses - 2024"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Entidad Financiera *</Label>
                    <Input 
                      value={formData.financial_entity_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, financial_entity_name: e.target.value }))}
                      placeholder="Banco Santander"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Importe (€) *</Label>
                    <Input 
                      type="number"
                      value={formData.nominal_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, nominal_amount: e.target.value }))}
                      placeholder="50000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>TAE (%)</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={formData.interest_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, interest_rate: e.target.value }))}
                      placeholder="3.25"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha Contratación</Label>
                    <Input 
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha Vencimiento</Label>
                    <Input 
                      type="date"
                      value={formData.maturity_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, maturity_date: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Switch 
                      checked={formData.auto_renewal}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_renewal: checked }))}
                    />
                    <Label>Renovación automática al vencimiento</Label>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Notas</Label>
                    <Textarea 
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Condiciones especiales, penalización por cancelación anticipada..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate}>
                    Crear Depósito
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
            ) : deposits.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <PiggyBank className="h-8 w-8 mb-2" />
                <p>No hay depósitos registrados</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Depósito</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead className="text-right">TAE</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Días Rest.</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deposits.map((deposit) => {
                    const status = statusConfig[deposit.status as keyof typeof statusConfig];
                    const daysToMaturity = deposit.maturity_date 
                      ? differenceInDays(new Date(deposit.maturity_date), new Date())
                      : null;
                    
                    return (
                      <TableRow key={deposit.id}>
                        <TableCell className="font-medium">
                          {deposit.investment_name}
                        </TableCell>
                        <TableCell>{deposit.financial_entity_name || '-'}</TableCell>
                        <TableCell className="text-right">
                          {deposit.nominal_amount.toLocaleString('es-ES', { 
                            style: 'currency', 
                            currency: deposit.currency 
                          })}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {deposit.interest_rate ? `${deposit.interest_rate}%` : '-'}
                        </TableCell>
                        <TableCell>
                          {deposit.maturity_date 
                            ? format(new Date(deposit.maturity_date), 'dd/MM/yyyy', { locale: es })
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {daysToMaturity !== null ? (
                            <Badge 
                              variant={daysToMaturity <= 30 ? 'destructive' : daysToMaturity <= 60 ? 'secondary' : 'outline'}
                            >
                              {daysToMaturity} días
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status?.variant}>{status?.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setSelectedDeposit(deposit)}
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
      <Dialog open={!!selectedDeposit} onOpenChange={() => setSelectedDeposit(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedDeposit?.investment_name}</DialogTitle>
          </DialogHeader>
          {selectedDeposit && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Entidad</Label>
                  <p className="font-medium">{selectedDeposit.financial_entity_name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Importe</Label>
                  <p className="font-medium">
                    {selectedDeposit.nominal_amount.toLocaleString('es-ES', { 
                      style: 'currency', 
                      currency: selectedDeposit.currency 
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">TAE</Label>
                  <p className="font-medium text-green-600">
                    {selectedDeposit.interest_rate ? `${selectedDeposit.interest_rate}%` : '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Interés Estimado</Label>
                  <p className="font-medium text-green-600">
                    {selectedDeposit.interest_rate && selectedDeposit.maturity_date
                      ? (selectedDeposit.nominal_amount * (selectedDeposit.interest_rate / 100) * 
                         (differenceInDays(new Date(selectedDeposit.maturity_date), new Date(selectedDeposit.purchase_date)) / 365)
                        ).toLocaleString('es-ES', { style: 'currency', currency: selectedDeposit.currency })
                      : '-'
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Contratación</Label>
                  <p className="font-medium">
                    {format(new Date(selectedDeposit.purchase_date), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Vencimiento</Label>
                  <p className="font-medium">
                    {selectedDeposit.maturity_date 
                      ? format(new Date(selectedDeposit.maturity_date), 'dd/MM/yyyy', { locale: es })
                      : '-'
                    }
                  </p>
                </div>
              </div>
              {selectedDeposit.description && (
                <div>
                  <Label className="text-muted-foreground">Notas</Label>
                  <p className="mt-1">{selectedDeposit.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DepositsTab;
