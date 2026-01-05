/**
 * Panel de Contabilidad Logística
 * Gestión de reglas de asientos automáticos y generación manual
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calculator, 
  Settings, 
  FileText, 
  CheckCircle, 
  Clock,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useERPLogistics, AccountingRule } from '@/hooks/erp/useERPLogistics';
import { useERPContext } from '@/hooks/erp/useERPContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface PendingEntry {
  shipment_id: string;
  tracking_number: string;
  carrier_name: string;
  total_cost: number;
  created_at: string;
  status: string;
}

export function LogisticsAccountingPanel() {
  const { currentCompany } = useERPContext();
  const { accountingRules, fetchAccountingRules, isLoading } = useERPLogistics();
  
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingEntries, setPendingEntries] = useState<PendingEntry[]>([]);
  const [generatedEntries, setGeneratedEntries] = useState<any[]>([]);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AccountingRule | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Formulario para regla
  const [ruleForm, setRuleForm] = useState({
    rule_name: '',
    operation_type: 'shipment_cost',
    debit_account_code: '6240',
    credit_account_code: '4100',
    auto_post: false,
    is_active: true
  });

  useEffect(() => {
    if (currentCompany?.id) {
      fetchAccountingRules();
      fetchPendingEntries();
      fetchGeneratedEntries();
    }
  }, [currentCompany?.id]);

  const fetchPendingEntries = async () => {
    if (!currentCompany?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('erp_logistics_shipments')
        .select(`
          id,
          tracking_number,
          total_cost,
          created_at,
          status,
          erp_logistics_carriers(name)
        `)
        .eq('company_id', currentCompany.id)
        .is('accounting_entry_id', null)
        .in('status', ['delivered', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setPendingEntries((data || []).map((s: any) => ({
        shipment_id: s.id,
        tracking_number: s.tracking_number || 'Sin tracking',
        carrier_name: s.erp_logistics_carriers?.name || 'Desconocido',
        total_cost: s.total_cost || 0,
        created_at: s.created_at,
        status: s.status
      })));
    } catch (err) {
      console.error('Error fetching pending entries:', err);
    }
  };

  const fetchGeneratedEntries = async () => {
    if (!currentCompany?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('erp_journal_entries')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('source_type', 'logistics_shipment')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setGeneratedEntries(data || []);
    } catch (err) {
      console.error('Error fetching generated entries:', err);
    }
  };

  const handleGenerateEntry = async (shipmentId: string) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('logistics-accounting', {
        body: {
          action: 'generate_entry',
          shipment_id: shipmentId,
          company_id: currentCompany?.id
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Asiento generado correctamente');
        fetchPendingEntries();
        fetchGeneratedEntries();
      } else {
        throw new Error(data?.error || 'Error al generar asiento');
      }
    } catch (err) {
      console.error('Error generating entry:', err);
      toast.error('Error al generar asiento contable');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAll = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('logistics-accounting', {
        body: {
          action: 'generate_batch',
          company_id: currentCompany?.id,
          shipment_ids: pendingEntries.map(e => e.shipment_id)
        }
      });

      if (error) throw error;

      toast.success(`${data?.generated || 0} asientos generados`);
      fetchPendingEntries();
      fetchGeneratedEntries();
    } catch (err) {
      console.error('Error generating batch:', err);
      toast.error('Error al generar asientos');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveRule = async () => {
    if (!currentCompany?.id || !ruleForm.rule_name) {
      toast.error('Complete los campos requeridos');
      return;
    }

    try {
      if (editingRule) {
        const { error } = await supabase
          .from('erp_logistics_accounting_rules')
          .update({
            rule_name: ruleForm.rule_name,
            operation_type: ruleForm.operation_type,
            debit_account_code: ruleForm.debit_account_code,
            credit_account_code: ruleForm.credit_account_code,
            auto_post: ruleForm.auto_post,
            is_active: ruleForm.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingRule.id);

        if (error) throw error;
        toast.success('Regla actualizada');
      } else {
        const { error } = await supabase
          .from('erp_logistics_accounting_rules')
          .insert([{
            company_id: currentCompany.id,
            rule_name: ruleForm.rule_name,
            rule_type: ruleForm.operation_type,
            debit_account_code: ruleForm.debit_account_code,
            credit_account_code: ruleForm.credit_account_code,
            auto_post: ruleForm.auto_post,
            is_active: ruleForm.is_active
          }]);

        if (error) throw error;
        toast.success('Regla creada');
      }

      setIsRuleDialogOpen(false);
      setEditingRule(null);
      resetRuleForm();
      fetchAccountingRules();
    } catch (err) {
      console.error('Error saving rule:', err);
      toast.error('Error al guardar regla');
    }
  };

  const handleEditRule = (rule: AccountingRule) => {
    setEditingRule(rule);
    setRuleForm({
      rule_name: rule.rule_name,
      operation_type: rule.operation_type,
      debit_account_code: rule.debit_account_code,
      credit_account_code: rule.credit_account_code,
      auto_post: rule.auto_post,
      is_active: rule.is_active
    });
    setIsRuleDialogOpen(true);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('¿Eliminar esta regla?')) return;

    try {
      const { error } = await supabase
        .from('erp_logistics_accounting_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      toast.success('Regla eliminada');
      fetchAccountingRules();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const resetRuleForm = () => {
    setRuleForm({
      rule_name: '',
      operation_type: 'shipment_cost',
      debit_account_code: '6240',
      credit_account_code: '4100',
      auto_post: false,
      is_active: true
    });
  };

  const operationTypes = [
    { value: 'shipment_cost', label: 'Coste envío' },
    { value: 'carrier_invoice', label: 'Factura operadora' },
    { value: 'fuel_expense', label: 'Combustible' },
    { value: 'toll_expense', label: 'Peajes' },
    { value: 'vehicle_maintenance', label: 'Mantenimiento vehículos' },
    { value: 'vehicle_depreciation', label: 'Amortización vehículos' },
    { value: 'insurance_expense', label: 'Seguros' },
    { value: 'warehouse_rent', label: 'Alquiler almacén' }
  ];

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingEntries.length}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{generatedEntries.length}</p>
                <p className="text-xs text-muted-foreground">Generados (mes)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Settings className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{accountingRules.filter(r => r.is_active).length}</p>
                <p className="text-xs text-muted-foreground">Reglas activas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Calculator className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {pendingEntries.reduce((sum, e) => sum + e.total_cost, 0).toLocaleString('es-ES', { 
                    style: 'currency', 
                    currency: 'EUR',
                    maximumFractionDigits: 0
                  })}
                </p>
                <p className="text-xs text-muted-foreground">Por contabilizar</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pendientes
          </TabsTrigger>
          <TabsTrigger value="generated" className="gap-2">
            <FileText className="h-4 w-4" />
            Generados
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <Settings className="h-4 w-4" />
            Reglas
          </TabsTrigger>
        </TabsList>

        {/* Pending Entries */}
        <TabsContent value="pending">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Envíos Pendientes de Contabilizar</CardTitle>
                <CardDescription>
                  Envíos entregados sin asiento contable generado
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchPendingEntries}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
                {pendingEntries.length > 0 && (
                  <Button size="sm" onClick={handleGenerateAll} disabled={isGenerating}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generar Todos
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {pendingEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay envíos pendientes de contabilizar</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Operadora</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Coste</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingEntries.map((entry) => (
                      <TableRow key={entry.shipment_id}>
                        <TableCell className="font-mono text-sm">
                          {entry.tracking_number}
                        </TableCell>
                        <TableCell>{entry.carrier_name}</TableCell>
                        <TableCell>
                          {format(new Date(entry.created_at), 'dd/MM/yyyy', { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.status === 'delivered' ? 'default' : 'secondary'}>
                            {entry.status === 'delivered' ? 'Entregado' : 'Confirmado'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {entry.total_cost.toLocaleString('es-ES', { 
                            style: 'currency', 
                            currency: 'EUR' 
                          })}
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleGenerateEntry(entry.shipment_id)}
                            disabled={isGenerating}
                          >
                            <Calculator className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generated Entries */}
        <TabsContent value="generated">
          <Card>
            <CardHeader>
              <CardTitle>Asientos Generados</CardTitle>
              <CardDescription>
                Historial de asientos contables generados desde logística
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generatedEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay asientos generados</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº Asiento</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Debe</TableHead>
                      <TableHead className="text-right">Haber</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatedEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-mono">{entry.entry_number}</TableCell>
                        <TableCell>
                          {format(new Date(entry.entry_date), 'dd/MM/yyyy', { locale: es })}
                        </TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell className="text-right">
                          {entry.total_debit?.toLocaleString('es-ES', { 
                            style: 'currency', 
                            currency: 'EUR' 
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.total_credit?.toLocaleString('es-ES', { 
                            style: 'currency', 
                            currency: 'EUR' 
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.is_posted ? 'default' : 'outline'}>
                            {entry.is_posted ? 'Contabilizado' : 'Borrador'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounting Rules */}
        <TabsContent value="rules">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Reglas de Contabilización</CardTitle>
                <CardDescription>
                  Configure las cuentas contables para cada tipo de operación logística
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => {
                resetRuleForm();
                setEditingRule(null);
                setIsRuleDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Regla
              </Button>
            </CardHeader>
            <CardContent>
              {accountingRules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay reglas configuradas</p>
                  <p className="text-sm">Cree reglas para automatizar la contabilización</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Regla</TableHead>
                      <TableHead>Operación</TableHead>
                      <TableHead>Cuenta Debe</TableHead>
                      <TableHead>Cuenta Haber</TableHead>
                      <TableHead>Auto-contab.</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountingRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.rule_name}</TableCell>
                        <TableCell>
                          {operationTypes.find(o => o.value === rule.operation_type)?.label || rule.operation_type}
                        </TableCell>
                        <TableCell className="font-mono">{rule.debit_account_code}</TableCell>
                        <TableCell className="font-mono">{rule.credit_account_code}</TableCell>
                        <TableCell>
                          <Badge variant={rule.auto_post ? 'default' : 'outline'}>
                            {rule.auto_post ? 'Sí' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                            {rule.is_active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => handleEditRule(rule)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteRule(rule.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rule Dialog */}
      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Editar Regla' : 'Nueva Regla de Contabilización'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Nombre de la Regla</Label>
              <Input
                value={ruleForm.rule_name}
                onChange={(e) => setRuleForm(prev => ({ ...prev, rule_name: e.target.value }))}
                placeholder="Ej: Gasto envío nacional"
              />
            </div>

            <div>
              <Label>Tipo de Operación</Label>
              <Select 
                value={ruleForm.operation_type}
                onValueChange={(value) => setRuleForm(prev => ({ ...prev, operation_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operationTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cuenta Debe</Label>
                <Input
                  value={ruleForm.debit_account_code}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, debit_account_code: e.target.value }))}
                  placeholder="6240"
                />
                <p className="text-xs text-muted-foreground mt-1">Ej: 6240 - Portes</p>
              </div>
              <div>
                <Label>Cuenta Haber</Label>
                <Input
                  value={ruleForm.credit_account_code}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, credit_account_code: e.target.value }))}
                  placeholder="4100"
                />
                <p className="text-xs text-muted-foreground mt-1">Ej: 4100 - Proveedores</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Contabilización Automática</Label>
                <p className="text-xs text-muted-foreground">
                  Generar y contabilizar automáticamente al confirmar envío
                </p>
              </div>
              <Switch
                checked={ruleForm.auto_post}
                onCheckedChange={(checked) => setRuleForm(prev => ({ ...prev, auto_post: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Regla Activa</Label>
                <p className="text-xs text-muted-foreground">
                  Aplicar esta regla en operaciones logísticas
                </p>
              </div>
              <Switch
                checked={ruleForm.is_active}
                onCheckedChange={(checked) => setRuleForm(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRule}>
              {editingRule ? 'Guardar Cambios' : 'Crear Regla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LogisticsAccountingPanel;
