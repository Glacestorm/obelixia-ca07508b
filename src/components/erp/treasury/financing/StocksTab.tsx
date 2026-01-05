/**
 * Tab especializado para Acciones
 * Renta Variable con límite de 20 posiciones por ISIN
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
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Euro,
  BarChart3,
  Eye,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useERPInvestments, type Investment } from '@/hooks/erp/useERPInvestments';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig = {
  active: { label: 'En cartera', variant: 'default' as const },
  sold: { label: 'Vendida', variant: 'secondary' as const },
  cancelled: { label: 'Cancelada', variant: 'destructive' as const },
};

export function StocksTab() {
  const { 
    investments, 
    isLoading,
    createInvestment,
    refetch
  } = useERPInvestments();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Investment | null>(null);
  const [formData, setFormData] = useState({
    investment_name: '',
    isin_code: '',
    financial_entity_name: '',
    units_quantity: '',
    unit_price: '',
    purchase_date: '',
    description: '',
  });

  const stocks = investments.filter(inv => inv.investment_type === 'stock');

  // Check ISIN limit (max 20 unique ISINs)
  const uniqueIsins = new Set(stocks.filter(s => s.isin_code).map(s => s.isin_code));
  const isinLimitReached = uniqueIsins.size >= 20;

  const handleCreate = async () => {
    if (!formData.investment_name || !formData.units_quantity || !formData.unit_price) return;
    
    // Check ISIN limit
    if (formData.isin_code && !uniqueIsins.has(formData.isin_code) && isinLimitReached) {
      return;
    }

    await createInvestment({
      investment_type: 'stock',
      investment_name: formData.investment_name,
      isin_code: formData.isin_code || undefined,
      financial_entity_name: formData.financial_entity_name || undefined,
      nominal_amount: parseFloat(formData.units_quantity) * parseFloat(formData.unit_price),
      units_quantity: parseFloat(formData.units_quantity),
      unit_price: parseFloat(formData.unit_price),
      purchase_date: formData.purchase_date || new Date().toISOString().split('T')[0],
      description: formData.description || undefined,
    });
    
    setIsCreateOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      investment_name: '',
      isin_code: '',
      financial_entity_name: '',
      units_quantity: '',
      unit_price: '',
      purchase_date: '',
      description: '',
    });
  };

  // Calculate stats
  const activeStocks = stocks.filter(s => s.status === 'active');
  
  const totalCost = activeStocks.reduce((sum, s) => sum + s.nominal_amount, 0);
  const totalValue = activeStocks.reduce((sum, s) => sum + s.current_value, 0);
  const totalPnL = totalValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  // Group by stock for portfolio view
  const portfolio = activeStocks.reduce((acc, stock) => {
    const key = stock.isin_code || stock.investment_name;
    if (!acc[key]) {
      acc[key] = {
        name: stock.investment_name,
        isin: stock.isin_code,
        totalUnits: 0,
        totalCost: 0,
        totalValue: 0,
        positions: []
      };
    }
    acc[key].totalUnits += stock.units_quantity || 0;
    acc[key].totalCost += stock.nominal_amount;
    acc[key].totalValue += stock.current_value;
    acc[key].positions.push(stock);
    return acc;
  }, {} as Record<string, { name: string; isin: string | null; totalUnits: number; totalCost: number; totalValue: number; positions: Investment[] }>);

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Posiciones</span>
            </div>
            <p className="text-2xl font-bold mt-1">{activeStocks.length}</p>
            <p className="text-xs text-muted-foreground">
              {uniqueIsins.size}/20 ISINs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Coste Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {totalCost.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Valor Actual</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {totalValue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              {totalPnL >= 0 
                ? <ArrowUpRight className="h-4 w-4 text-green-500" />
                : <ArrowDownRight className="h-4 w-4 text-red-500" />
              }
              <span className="text-sm text-muted-foreground">P&L Total</span>
            </div>
            <p className={`text-2xl font-bold mt-1 ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalPnL >= 0 ? '+' : ''}{totalPnL.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </p>
            <p className={`text-xs ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ISIN Limit Warning */}
      {isinLimitReached && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <CardContent className="pt-4">
            <p className="text-sm text-orange-700 dark:text-orange-300">
              ⚠️ Has alcanzado el límite de 20 ISINs diferentes. Solo puedes añadir acciones de ISINs ya existentes.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Cartera de Acciones
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
                  Nueva Compra
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Nueva Compra de Acciones</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Nombre / Ticker *</Label>
                    <Input 
                      value={formData.investment_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, investment_name: e.target.value }))}
                      placeholder="Inditex (ITX)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ISIN</Label>
                    <Input 
                      value={formData.isin_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, isin_code: e.target.value.toUpperCase() }))}
                      placeholder="ES0148396007"
                      maxLength={12}
                    />
                    {formData.isin_code && !uniqueIsins.has(formData.isin_code) && isinLimitReached && (
                      <p className="text-xs text-red-500">Límite de ISINs alcanzado</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Broker / Custodio</Label>
                    <Input 
                      value={formData.financial_entity_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, financial_entity_name: e.target.value }))}
                      placeholder="Interactive Brokers"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nº Acciones *</Label>
                    <Input 
                      type="number"
                      value={formData.units_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, units_quantity: e.target.value }))}
                      placeholder="100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Precio por Acción (€) *</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={formData.unit_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                      placeholder="28.50"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Importe Total</Label>
                    <p className="text-lg font-bold">
                      {formData.units_quantity && formData.unit_price
                        ? (parseFloat(formData.units_quantity) * parseFloat(formData.unit_price)).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
                        : '0,00 €'
                      }
                    </p>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Fecha de Compra</Label>
                    <Input 
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Notas</Label>
                    <Textarea 
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Motivo de la compra, comisiones..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreate}
                    disabled={formData.isin_code && !uniqueIsins.has(formData.isin_code) && isinLimitReached}
                  >
                    Registrar Compra
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[450px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : Object.keys(portfolio).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <BarChart3 className="h-8 w-8 mb-2" />
                <p>No hay acciones en cartera</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Valor</TableHead>
                    <TableHead>ISIN</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                    <TableHead className="text-right">Precio Medio</TableHead>
                    <TableHead className="text-right">Coste</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(portfolio).map(([key, data]) => {
                    const pnl = data.totalValue - data.totalCost;
                    const pnlPercent = data.totalCost > 0 ? (pnl / data.totalCost) * 100 : 0;
                    const avgPrice = data.totalUnits > 0 ? data.totalCost / data.totalUnits : 0;
                    
                    return (
                      <TableRow key={key}>
                        <TableCell className="font-medium">
                          {data.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {data.isin || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {data.totalUnits.toLocaleString('es-ES')}
                        </TableCell>
                        <TableCell className="text-right">
                          {avgPrice.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                        </TableCell>
                        <TableCell className="text-right">
                          {data.totalCost.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                        </TableCell>
                        <TableCell className="text-right">
                          {data.totalValue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={`flex items-center justify-end gap-1 ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {pnl >= 0 
                              ? <TrendingUp className="h-3 w-3" />
                              : <TrendingDown className="h-3 w-3" />
                            }
                            <div>
                              <p className="text-sm font-medium">
                                {pnl >= 0 ? '+' : ''}{pnl.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                              </p>
                              <p className="text-xs">
                                {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setSelectedStock(data.positions[0])}
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
      <Dialog open={!!selectedStock} onOpenChange={() => setSelectedStock(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedStock?.investment_name}</DialogTitle>
          </DialogHeader>
          {selectedStock && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">ISIN</Label>
                  <p className="font-mono">{selectedStock.isin_code || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Broker</Label>
                  <p className="font-medium">{selectedStock.financial_entity_name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Acciones</Label>
                  <p className="font-medium">{selectedStock.units_quantity?.toLocaleString('es-ES') || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Precio Compra</Label>
                  <p className="font-medium">
                    {selectedStock.unit_price 
                      ? selectedStock.unit_price.toLocaleString('es-ES', { style: 'currency', currency: selectedStock.currency })
                      : '-'
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Coste Total</Label>
                  <p className="font-medium">
                    {selectedStock.nominal_amount.toLocaleString('es-ES', { 
                      style: 'currency', 
                      currency: selectedStock.currency 
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Valor Actual</Label>
                  <p className="font-medium">
                    {selectedStock.current_value.toLocaleString('es-ES', { 
                      style: 'currency', 
                      currency: selectedStock.currency 
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fecha Compra</Label>
                  <p className="font-medium">
                    {format(new Date(selectedStock.purchase_date), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">P&L</Label>
                  <p className={`font-medium ${(selectedStock.current_value - selectedStock.nominal_amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(selectedStock.current_value - selectedStock.nominal_amount).toLocaleString('es-ES', { 
                      style: 'currency', 
                      currency: selectedStock.currency 
                    })}
                  </p>
                </div>
              </div>
              {selectedStock.description && (
                <div>
                  <Label className="text-muted-foreground">Notas</Label>
                  <p className="mt-1">{selectedStock.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StocksTab;
