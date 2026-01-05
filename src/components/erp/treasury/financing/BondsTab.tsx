/**
 * Tab especializado para Bonos
 * Bonos del Estado, Corporativos, Estructurados
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
  Building2, 
  RefreshCw,
  Euro,
  TrendingUp,
  TrendingDown,
  Eye,
  Calendar,
  Percent
} from 'lucide-react';
import { useERPInvestments, type Investment } from '@/hooks/erp/useERPInvestments';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

const bondTypeConfig = {
  government_bond: { label: 'Bono del Estado', color: 'bg-blue-500' },
  corporate_bond: { label: 'Bono Corporativo', color: 'bg-purple-500' },
  treasury_bill: { label: 'Letra del Tesoro', color: 'bg-green-500' },
  structured_bond: { label: 'Estructurado', color: 'bg-orange-500' },
};

const statusConfig = {
  active: { label: 'Activo', variant: 'default' as const },
  matured: { label: 'Vencido', variant: 'secondary' as const },
  sold: { label: 'Vendido', variant: 'outline' as const },
  cancelled: { label: 'Cancelado', variant: 'destructive' as const },
};

export function BondsTab() {
  const { 
    investments, 
    isLoading,
    createInvestment,
    refetch
  } = useERPInvestments();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedBond, setSelectedBond] = useState<Investment | null>(null);
  const [formData, setFormData] = useState({
    investment_type: 'government_bond' as const,
    investment_name: '',
    isin_code: '',
    financial_entity_name: '',
    nominal_amount: '',
    purchase_price: '',
    interest_rate: '',
    coupon_frequency: 'annual' as const,
    purchase_date: '',
    maturity_date: '',
    description: '',
  });

  const bonds = investments.filter(inv => 
    inv.investment_type === 'government_bond' || 
    inv.investment_type === 'corporate_bond' ||
    inv.investment_type === 'treasury_bill' ||
    inv.investment_type === 'structured_bond'
  );

  const handleCreate = async () => {
    if (!formData.investment_name || !formData.nominal_amount) return;
    
    await createInvestment({
      investment_type: formData.investment_type,
      investment_name: formData.investment_name,
      isin_code: formData.isin_code || undefined,
      financial_entity_name: formData.financial_entity_name || undefined,
      nominal_amount: parseFloat(formData.nominal_amount),
      purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : undefined,
      interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : undefined,
      coupon_frequency: formData.coupon_frequency,
      purchase_date: formData.purchase_date || new Date().toISOString().split('T')[0],
      maturity_date: formData.maturity_date || undefined,
      description: formData.description || undefined,
    });
    
    setIsCreateOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      investment_type: 'government_bond',
      investment_name: '',
      isin_code: '',
      financial_entity_name: '',
      nominal_amount: '',
      purchase_price: '',
      interest_rate: '',
      coupon_frequency: 'annual',
      purchase_date: '',
      maturity_date: '',
      description: '',
    });
  };

  // Calculate stats
  const totalNominal = bonds
    .filter(b => b.status === 'active')
    .reduce((sum, b) => sum + b.nominal_amount, 0);

  const totalCurrentValue = bonds
    .filter(b => b.status === 'active')
    .reduce((sum, b) => sum + b.current_value, 0);

  const unrealizedPnL = totalCurrentValue - totalNominal;

  const nextCoupons = bonds.filter(b => {
    if (!b.next_coupon_date || b.status !== 'active') return false;
    const days = differenceInDays(new Date(b.next_coupon_date), new Date());
    return days >= 0 && days <= 90;
  });

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Bonos Activos</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {bonds.filter(b => b.status === 'active').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Nominal Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {totalNominal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              {unrealizedPnL >= 0 
                ? <TrendingUp className="h-4 w-4 text-green-500" />
                : <TrendingDown className="h-4 w-4 text-red-500" />
              }
              <span className="text-sm text-muted-foreground">P&L No Realizado</span>
            </div>
            <p className={`text-2xl font-bold mt-1 ${unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {unrealizedPnL >= 0 ? '+' : ''}{unrealizedPnL.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Próx. Cupones</span>
            </div>
            <p className="text-2xl font-bold mt-1">{nextCoupons.length}</p>
            <p className="text-xs text-muted-foreground">en 90 días</p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution by Type */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(bondTypeConfig).map(([key, config]) => {
          const value = bonds
            .filter(b => b.investment_type === key && b.status === 'active')
            .reduce((sum, b) => sum + b.nominal_amount, 0);
          return (
            <Card key={key}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${config.color}`} />
                  <span className="text-xs text-muted-foreground">{config.label}</span>
                </div>
                <p className="font-bold mt-1">
                  {value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Cartera de Bonos
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
                  Nuevo Bono
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nuevo Bono</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Tipo de Bono *</Label>
                    <Select 
                      value={formData.investment_type} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, investment_type: v as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(bondTypeConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>ISIN</Label>
                    <Input 
                      value={formData.isin_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, isin_code: e.target.value.toUpperCase() }))}
                      placeholder="ES0000012345"
                      maxLength={12}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Nombre del Bono *</Label>
                    <Input 
                      value={formData.investment_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, investment_name: e.target.value }))}
                      placeholder="Bono del Estado 2.5% 2030"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Emisor / Entidad</Label>
                    <Input 
                      value={formData.financial_entity_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, financial_entity_name: e.target.value }))}
                      placeholder="Tesoro Público"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nominal (€) *</Label>
                    <Input 
                      type="number"
                      value={formData.nominal_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, nominal_amount: e.target.value }))}
                      placeholder="100000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Precio de Compra (%)</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={formData.purchase_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchase_price: e.target.value }))}
                      placeholder="99.50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cupón (%)</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={formData.interest_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, interest_rate: e.target.value }))}
                      placeholder="2.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Frecuencia Cupón</Label>
                    <Select 
                      value={formData.coupon_frequency} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, coupon_frequency: v as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensual</SelectItem>
                        <SelectItem value="quarterly">Trimestral</SelectItem>
                        <SelectItem value="semi_annual">Semestral</SelectItem>
                        <SelectItem value="annual">Anual</SelectItem>
                        <SelectItem value="zero_coupon">Cupón Cero</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha Compra</Label>
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
                  <div className="col-span-2 space-y-2">
                    <Label>Notas</Label>
                    <Textarea 
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Características especiales, calificación crediticia..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate}>
                    Crear Bono
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
            ) : bonds.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Building2 className="h-8 w-8 mb-2" />
                <p>No hay bonos registrados</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bono</TableHead>
                    <TableHead>ISIN</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                    <TableHead className="text-right">Cupón</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bonds.map((bond) => {
                    const status = statusConfig[bond.status as keyof typeof statusConfig];
                    const typeConfig = bondTypeConfig[bond.investment_type as keyof typeof bondTypeConfig];
                    
                    return (
                      <TableRow key={bond.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {bond.investment_name}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {bond.isin_code || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${typeConfig?.color || 'bg-gray-400'}`} />
                            <span className="text-xs">{typeConfig?.label || bond.investment_type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {bond.nominal_amount.toLocaleString('es-ES', { 
                            style: 'currency', 
                            currency: bond.currency 
                          })}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {bond.interest_rate ? `${bond.interest_rate}%` : '-'}
                        </TableCell>
                        <TableCell>
                          {bond.maturity_date 
                            ? format(new Date(bond.maturity_date), 'dd/MM/yyyy', { locale: es })
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
                            onClick={() => setSelectedBond(bond)}
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
      <Dialog open={!!selectedBond} onOpenChange={() => setSelectedBond(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedBond?.investment_name}</DialogTitle>
          </DialogHeader>
          {selectedBond && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">ISIN</Label>
                  <p className="font-mono">{selectedBond.isin_code || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tipo</Label>
                  <p className="font-medium">
                    {bondTypeConfig[selectedBond.investment_type as keyof typeof bondTypeConfig]?.label || selectedBond.investment_type}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Nominal</Label>
                  <p className="font-medium">
                    {selectedBond.nominal_amount.toLocaleString('es-ES', { 
                      style: 'currency', 
                      currency: selectedBond.currency 
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Valor Actual</Label>
                  <p className="font-medium">
                    {selectedBond.current_value.toLocaleString('es-ES', { 
                      style: 'currency', 
                      currency: selectedBond.currency 
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cupón</Label>
                  <p className="font-medium text-green-600">
                    {selectedBond.interest_rate ? `${selectedBond.interest_rate}%` : '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Frecuencia</Label>
                  <p className="font-medium capitalize">
                    {selectedBond.coupon_frequency?.replace('_', ' ') || '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Compra</Label>
                  <p className="font-medium">
                    {format(new Date(selectedBond.purchase_date), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Vencimiento</Label>
                  <p className="font-medium">
                    {selectedBond.maturity_date 
                      ? format(new Date(selectedBond.maturity_date), 'dd/MM/yyyy', { locale: es })
                      : '-'
                    }
                  </p>
                </div>
              </div>
              {selectedBond.description && (
                <div>
                  <Label className="text-muted-foreground">Notas</Label>
                  <p className="mt-1">{selectedBond.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BondsTab;
