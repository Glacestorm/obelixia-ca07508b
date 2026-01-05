/**
 * Tab especializado para Préstamos
 * Subtipos: Personal, Hipotecario, Monetario, Avalado
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Landmark, 
  RefreshCw,
  Euro,
  Building2,
  Shield,
  User,
  Coins,
  Eye,
  Calculator,
  Calendar
} from 'lucide-react';
import { useERPFinancingOperations, type FinancingOperation } from '@/hooks/erp/useERPFinancingOperations';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const loanSubtypeConfig = {
  personal: { label: 'Personal', icon: User, color: 'bg-blue-500' },
  mortgage: { label: 'Hipotecario', icon: Building2, color: 'bg-green-500' },
  monetary: { label: 'Monetario', icon: Coins, color: 'bg-purple-500' },
  guaranteed: { label: 'Avalado', icon: Shield, color: 'bg-orange-500' },
};

const statusConfig = {
  active: { label: 'Activo', variant: 'default' as const },
  pending: { label: 'Pendiente', variant: 'secondary' as const },
  completed: { label: 'Amortizado', variant: 'outline' as const },
  cancelled: { label: 'Cancelado', variant: 'destructive' as const },
};

export function LoansTab() {
  const { 
    operations, 
    isLoading,
    createOperation,
    generateAmortizationSchedule,
    refetch
  } = useERPFinancingOperations();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<FinancingOperation | null>(null);
  const [activeSubtype, setActiveSubtype] = useState('all');
  const [formData, setFormData] = useState({
    loan_subtype: 'personal' as string,
    contract_number: '',
    financial_entity_name: '',
    principal_amount: '',
    interest_rate: '',
    interest_type: 'fixed' as const,
    reference_rate: '',
    spread: '',
    start_date: '',
    end_date: '',
    term_months: '',
    payment_frequency: 'monthly' as const,
    guarantee_type: '',
    description: '',
  });

  const loans = operations.filter(op => op.operation_type === 'loan' || op.operation_type === 'mortgage');

  const filteredLoans = activeSubtype === 'all' 
    ? loans 
    : loans.filter(loan => loan.loan_subtype === activeSubtype);

  const handleCreate = async () => {
    if (!formData.contract_number || !formData.principal_amount || !formData.financial_entity_name) return;
    
    await createOperation({
      operation_type: formData.loan_subtype === 'mortgage' ? 'mortgage' : 'loan',
      loan_subtype: formData.loan_subtype,
      contract_number: formData.contract_number,
      financial_entity_name: formData.financial_entity_name,
      principal_amount: parseFloat(formData.principal_amount),
      interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : 0,
      interest_type: formData.interest_type,
      reference_rate: formData.reference_rate || undefined,
      spread: formData.spread ? parseFloat(formData.spread) : undefined,
      start_date: formData.start_date || new Date().toISOString().split('T')[0],
      end_date: formData.end_date || new Date().toISOString().split('T')[0],
      term_months: formData.term_months ? parseInt(formData.term_months) : 12,
      payment_frequency: formData.payment_frequency,
      guarantee_type: formData.guarantee_type || undefined,
      description: formData.description || undefined,
    });
    
    setIsCreateOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      loan_subtype: 'personal',
      contract_number: '',
      financial_entity_name: '',
      principal_amount: '',
      interest_rate: '',
      interest_type: 'fixed',
      reference_rate: '',
      spread: '',
      start_date: '',
      end_date: '',
      term_months: '',
      payment_frequency: 'monthly',
      guarantee_type: '',
      description: '',
    });
  };

  // Calculate stats
  const totalPrincipal = loans
    .filter(op => op.status === 'active')
    .reduce((sum, op) => sum + op.principal_amount, 0);
  
  const totalOutstanding = loans
    .filter(op => op.status === 'active')
    .reduce((sum, op) => sum + op.outstanding_balance, 0);

  const bySubtype = loans.reduce((acc, loan) => {
    const subtype = loan.loan_subtype || 'personal';
    acc[subtype] = (acc[subtype] || 0) + loan.outstanding_balance;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Préstamos Activos</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {loans.filter(op => op.status === 'active').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Principal Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {totalPrincipal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Pendiente Amortizar</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {totalOutstanding.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">% Amortizado</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {totalPrincipal > 0 
                ? ((1 - totalOutstanding / totalPrincipal) * 100).toFixed(1)
                : 0
              }%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution by Subtype */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(loanSubtypeConfig).map(([key, config]) => {
          const Icon = config.icon;
          const value = bySubtype[key] || 0;
          return (
            <Card key={key} className="cursor-pointer hover:bg-muted/50" onClick={() => setActiveSubtype(key)}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                    <p className="font-bold">
                      {value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Préstamos
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
                  Nuevo Préstamo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nuevo Préstamo</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Tipo de Préstamo *</Label>
                    <Select 
                      value={formData.loan_subtype} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, loan_subtype: v as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(loanSubtypeConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <config.icon className="h-4 w-4" />
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nº Contrato *</Label>
                    <Input 
                      value={formData.contract_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, contract_number: e.target.value }))}
                      placeholder="PREST-2024-001"
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
                    <Label>Principal (€) *</Label>
                    <Input 
                      type="number"
                      value={formData.principal_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, principal_amount: e.target.value }))}
                      placeholder="150000"
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
                        <SelectItem value="mixed">Mixto</SelectItem>
                      </SelectContent>
                    </Select>
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
                  {formData.interest_type !== 'fixed' && (
                    <>
                      <div className="space-y-2">
                        <Label>Referencia</Label>
                        <Select 
                          value={formData.reference_rate} 
                          onValueChange={(v) => setFormData(prev => ({ ...prev, reference_rate: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent>
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
                          placeholder="1.0"
                        />
                      </div>
                    </>
                  )}
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
                  <div className="space-y-2">
                    <Label>Plazo (meses)</Label>
                    <Input 
                      type="number"
                      value={formData.term_months}
                      onChange={(e) => setFormData(prev => ({ ...prev, term_months: e.target.value }))}
                      placeholder="120"
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
                        <SelectItem value="semi_annual">Semestral</SelectItem>
                        <SelectItem value="annual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.loan_subtype === 'guaranteed' && (
                    <div className="col-span-2 space-y-2">
                      <Label>Tipo de Garantía</Label>
                      <Input 
                        value={formData.guarantee_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, guarantee_type: e.target.value }))}
                        placeholder="Aval personal, hipoteca, pignoración..."
                      />
                    </div>
                  )}
                  <div className="col-span-2 space-y-2">
                    <Label>Notas</Label>
                    <Textarea 
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Condiciones especiales, comisiones, etc..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate}>
                    Crear Préstamo
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeSubtype} onValueChange={setActiveSubtype}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              {Object.entries(loanSubtypeConfig).map(([key, config]) => (
                <TabsTrigger key={key} value={key}>
                  <config.icon className="h-3 w-3 mr-1" />
                  {config.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={activeSubtype} className="mt-4">
              <ScrollArea className="h-[400px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredLoans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Landmark className="h-8 w-8 mb-2" />
                    <p>No hay préstamos registrados</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contrato</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Entidad</TableHead>
                        <TableHead className="text-right">Principal</TableHead>
                        <TableHead className="text-right">Pendiente</TableHead>
                        <TableHead>Interés</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLoans.map((loan) => {
                        const status = statusConfig[loan.status as keyof typeof statusConfig];
                        const subtypeConfig = loanSubtypeConfig[loan.loan_subtype as keyof typeof loanSubtypeConfig];
                        const SubtypeIcon = subtypeConfig?.icon || Landmark;
                        
                        return (
                          <TableRow key={loan.id}>
                            <TableCell className="font-medium">
                              {loan.contract_number}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <SubtypeIcon className="h-3 w-3" />
                                <span className="text-xs">{subtypeConfig?.label || 'Personal'}</span>
                              </div>
                            </TableCell>
                            <TableCell>{loan.financial_entity_name}</TableCell>
                            <TableCell className="text-right">
                              {loan.principal_amount.toLocaleString('es-ES', { 
                                style: 'currency', 
                                currency: loan.currency 
                              })}
                            </TableCell>
                            <TableCell className="text-right">
                              {loan.outstanding_balance.toLocaleString('es-ES', { 
                                style: 'currency', 
                                currency: loan.currency 
                              })}
                            </TableCell>
                            <TableCell>
                              {loan.interest_rate}% {loan.interest_type === 'fixed' ? 'Fijo' : 'Var.'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={status?.variant}>{status?.label}</Badge>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setSelectedLoan(loan)}
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLoan} onOpenChange={() => setSelectedLoan(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle Préstamo: {selectedLoan?.contract_number}</DialogTitle>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Tipo</Label>
                  <p className="font-medium">
                    {loanSubtypeConfig[selectedLoan.loan_subtype as keyof typeof loanSubtypeConfig]?.label || 'Personal'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Entidad Financiera</Label>
                  <p className="font-medium">{selectedLoan.financial_entity_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Principal</Label>
                  <p className="font-medium">
                    {selectedLoan.principal_amount.toLocaleString('es-ES', { 
                      style: 'currency', 
                      currency: selectedLoan.currency 
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Pendiente</Label>
                  <p className="font-medium text-red-600">
                    {selectedLoan.outstanding_balance.toLocaleString('es-ES', { 
                      style: 'currency', 
                      currency: selectedLoan.currency 
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tipo de Interés</Label>
                  <p className="font-medium">
                    {selectedLoan.interest_rate}% {selectedLoan.interest_type === 'fixed' ? 'Fijo' : 'Variable'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Plazo</Label>
                  <p className="font-medium">{selectedLoan.term_months} meses</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Inicio</Label>
                  <p className="font-medium">
                    {format(new Date(selectedLoan.start_date), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Vencimiento</Label>
                  <p className="font-medium">
                    {format(new Date(selectedLoan.end_date), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
                {selectedLoan.guarantee_type && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Garantía</Label>
                    <p className="font-medium">{selectedLoan.guarantee_type}</p>
                  </div>
                )}
              </div>
              {selectedLoan.description && (
                <div>
                  <Label className="text-muted-foreground">Notas</Label>
                  <p className="mt-1">{selectedLoan.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LoansTab;
