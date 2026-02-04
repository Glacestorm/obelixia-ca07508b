/**
 * HRTreasurySync - Sincronización RRHH ↔ Tesorería
 * Gestiona la creación de vencimientos de pago desde nóminas y finiquitos
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowUpCircle,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  RefreshCw,
  Landmark,
  Users,
  AlertTriangle,
  TrendingUp,
  FileText,
  Link2,
  Banknote
} from 'lucide-react';
import { useHRTreasuryIntegration } from '@/hooks/admin/useHRTreasuryIntegration';
import { useHRIntegrationLog } from '@/hooks/admin/hr';
import { useERPContext } from '@/hooks/erp/useERPContext';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface PayrollForSync {
  id: string;
  employee_name: string;
  period: string;
  net_amount: number;
  ss_employee: number;
  ss_employer: number;
  irpf_amount: number;
  status: string;
  calculated_at: string;
  treasury_synced: boolean;
}

// Demo data para ilustrar funcionalidad
const demoPayrolls: PayrollForSync[] = [
  {
    id: 'payroll-001',
    employee_name: 'María García López',
    period: '2026-01',
    net_amount: 1850.45,
    ss_employee: 127.30,
    ss_employer: 485.20,
    irpf_amount: 312.50,
    status: 'approved',
    calculated_at: '2026-01-28T10:00:00Z',
    treasury_synced: false
  },
  {
    id: 'payroll-002',
    employee_name: 'Carlos Ruiz Martín',
    period: '2026-01',
    net_amount: 2150.80,
    ss_employee: 148.60,
    ss_employer: 567.40,
    irpf_amount: 425.00,
    status: 'approved',
    calculated_at: '2026-01-28T10:05:00Z',
    treasury_synced: true
  },
  {
    id: 'payroll-003',
    employee_name: 'Ana Fernández Díaz',
    period: '2026-01',
    net_amount: 1625.30,
    ss_employee: 112.20,
    ss_employer: 428.50,
    irpf_amount: 275.00,
    status: 'approved',
    calculated_at: '2026-01-28T10:10:00Z',
    treasury_synced: false
  }
];

interface HRTreasurySyncProps {
  companyId?: string;
}

export function HRTreasurySync({ companyId }: HRTreasurySyncProps) {
  const { currentCompany } = useERPContext();
  const effectiveCompanyId = companyId || currentCompany?.id;
  const [activeTab, setActiveTab] = useState('pending');
  const [payrolls, setPayrolls] = useState<PayrollForSync[]>(demoPayrolls);
  const [selectedPayrolls, setSelectedPayrolls] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const {
    createPayrollPayment,
    createSSContributionPayment,
    createIRPFRetentionPayment,
    isLoading,
    integrations,
    fetchIntegrations
  } = useHRTreasuryIntegration();

  // Hook de logging para registrar sincronizaciones
  const { syncToTreasury: logToTreasury } = useHRIntegrationLog(effectiveCompanyId);

  // Cargar integraciones existentes
  useEffect(() => {
    if (currentCompany?.id) {
      fetchIntegrations(currentCompany.id);
    }
  }, [currentCompany?.id]);

  const pendingPayrolls = payrolls.filter(p => !p.treasury_synced && p.status === 'approved');
  const syncedPayrolls = payrolls.filter(p => p.treasury_synced);

  // Totales
  const totals = pendingPayrolls.reduce((acc, p) => ({
    net: acc.net + p.net_amount,
    ss: acc.ss + p.ss_employer,
    irpf: acc.irpf + p.irpf_amount
  }), { net: 0, ss: 0, irpf: 0 });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPayrolls(pendingPayrolls.map(p => p.id));
    } else {
      setSelectedPayrolls([]);
    }
  };

  const handleSelectPayroll = (payrollId: string, checked: boolean) => {
    if (checked) {
      setSelectedPayrolls(prev => [...prev, payrollId]);
    } else {
      setSelectedPayrolls(prev => prev.filter(id => id !== payrollId));
    }
  };

  const handleSyncToTreasury = async () => {
    if (!effectiveCompanyId || selectedPayrolls.length === 0) return;

    setIsSyncing(true);
    try {
      const selectedData = pendingPayrolls.filter(p => selectedPayrolls.includes(p.id));
      
      let successCount = 0;

      // 1. Crear vencimientos de netos a empleados
      for (const payroll of selectedData) {
        const result = await createPayrollPayment(effectiveCompanyId, {
          payrollId: payroll.id,
          payrollReference: `NOM-${payroll.period}-${payroll.employee_name.split(' ')[0]}`,
          employeeId: payroll.id,
          employeeName: payroll.employee_name,
          netAmount: payroll.net_amount,
          dueDate: format(addDays(new Date(), 5), 'yyyy-MM-dd'),
          bankAccountIban: undefined
        });
        if (result) successCount++;
      }

      // 2. Crear vencimiento consolidado SS (TGSS)
      const totalSS = selectedData.reduce((sum, p) => sum + p.ss_employer + p.ss_employee, 0);
      if (totalSS > 0) {
        // Calcular fecha de vencimiento (último día del mes siguiente)
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + 1);
        dueDate.setDate(0); // Último día del mes
        
        await createSSContributionPayment(effectiveCompanyId, {
          periodId: `ss-${format(new Date(), 'yyyy-MM')}`,
          periodReference: `SS-${format(new Date(), 'yyyy-MM')}`,
          totalAmount: totalSS,
          dueDate: format(dueDate, 'yyyy-MM-dd')
        });
      }

      // 3. Crear vencimiento IRPF (trimestral)
      const totalIRPF = selectedData.reduce((sum, p) => sum + p.irpf_amount, 0);
      if (totalIRPF > 0) {
        const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + 1);
        dueDate.setDate(20);
        
        await createIRPFRetentionPayment(effectiveCompanyId, {
          periodId: `irpf-${new Date().getFullYear()}-Q${quarter}`,
          periodReference: `IRPF-Q${quarter}-${new Date().getFullYear()}`,
          totalAmount: totalIRPF,
          dueDate: format(dueDate, 'yyyy-MM-dd')
        });
      }

      // Marcar como sincronizadas
      setPayrolls(prev => prev.map(p => 
        selectedPayrolls.includes(p.id) ? { ...p, treasury_synced: true } : p
      ));
      setSelectedPayrolls([]);

      // Registrar en el log de integración
      await logToTreasury({
        payrollId: `batch-${selectedPayrolls.length}`,
        payrollRef: `BATCH-${format(new Date(), 'yyyy-MM')}`,
        period: format(new Date(), 'yyyy-MM'),
        netAmount: totals.net,
        dueDate: format(addDays(new Date(), 5), 'yyyy-MM-dd')
      });

      toast.success(`${successCount} nóminas sincronizadas con tesorería`);
    } catch (error) {
      console.error('[HRTreasurySync] Error:', error);
      toast.error('Error al sincronizar con tesorería');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!currentCompany) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">Selecciona una empresa</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Sincronización RRHH → Tesorería
          </h3>
          <p className="text-sm text-muted-foreground">
            Genera vencimientos de pago automáticos desde nóminas
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchIntegrations(currentCompany.id)}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Resumen de Vencimientos */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Netos Empleados</p>
                <p className="text-lg font-bold">
                  € {totals.net.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Landmark className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">TGSS (Seg. Social)</p>
                <p className="text-lg font-bold">
                  € {totals.ss.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">AEAT (IRPF)</p>
                <p className="text-lg font-bold">
                  € {totals.irpf.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            <Clock className="h-4 w-4" />
            Pendientes ({pendingPayrolls.length})
          </TabsTrigger>
          <TabsTrigger value="synced" className="gap-1.5">
            <CheckCircle className="h-4 w-4" />
            Sincronizadas ({syncedPayrolls.length})
          </TabsTrigger>
          <TabsTrigger value="treasury" className="gap-1.5">
            <ArrowUpCircle className="h-4 w-4" />
            En Tesorería ({integrations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedPayrolls.length === pendingPayrolls.length && pendingPayrolls.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedPayrolls.length > 0 
                      ? `${selectedPayrolls.length} seleccionadas`
                      : 'Seleccionar todas'}
                  </span>
                </div>
                <Button
                  onClick={handleSyncToTreasury}
                  disabled={selectedPayrolls.length === 0 || isSyncing}
                  className="gap-2"
                >
                  {isSyncing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUpCircle className="h-4 w-4" />
                  )}
                  Generar Vencimientos
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="divide-y">
                  {pendingPayrolls.map((payroll) => (
                    <div 
                      key={payroll.id} 
                      className="p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={selectedPayrolls.includes(payroll.id)}
                          onCheckedChange={(checked) => 
                            handleSelectPayroll(payroll.id, checked as boolean)
                          }
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{payroll.employee_name}</p>
                              <p className="text-xs text-muted-foreground">
                                Período: {payroll.period} • Calculada: {format(new Date(payroll.calculated_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">
                                € {payroll.net_amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                              </p>
                              <div className="flex gap-2 text-xs text-muted-foreground">
                                <span>SS: €{payroll.ss_employer.toFixed(2)}</span>
                                <span>IRPF: €{payroll.irpf_amount.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {pendingPayrolls.length === 0 && (
                    <div className="p-8 text-center">
                      <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500/50" />
                      <p className="text-muted-foreground">Todas las nóminas están sincronizadas</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="synced" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="divide-y">
                  {syncedPayrolls.map((payroll) => (
                    <div 
                      key={payroll.id} 
                      className="p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-green-500/10">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">{payroll.employee_name}</p>
                            <p className="text-xs text-muted-foreground">
                              Período: {payroll.period}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            € {payroll.net_amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </p>
                          <Badge variant="outline" className="text-green-600">
                            Sincronizada
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  {syncedPayrolls.length === 0 && (
                    <div className="p-8 text-center">
                      <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No hay nóminas sincronizadas</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="treasury" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="divide-y">
                  {integrations.map((integration) => (
                    <div 
                      key={integration.id} 
                      className="p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                      <div className={cn(
                            "p-2 rounded-lg",
                            integration.source_type === 'payroll' && "bg-primary/10",
                            integration.source_type === 'ss_contribution' && "bg-orange-500/10",
                            integration.source_type === 'irpf_retention' && "bg-purple-500/10",
                            integration.source_type === 'settlement' && "bg-blue-500/10"
                          )}>
                            {integration.source_type === 'payroll' && <Users className="h-4 w-4 text-primary" />}
                            {integration.source_type === 'ss_contribution' && <Landmark className="h-4 w-4 text-orange-600" />}
                            {integration.source_type === 'irpf_retention' && <FileText className="h-4 w-4 text-purple-600" />}
                            {integration.source_type === 'settlement' && <Users className="h-4 w-4 text-blue-600" />}
                          </div>
                          <div>
                            <p className="font-medium capitalize">
                              {integration.source_type === 'payroll' && 'Nómina Empleado'}
                              {integration.source_type === 'ss_contribution' && 'Cotización TGSS'}
                              {integration.source_type === 'irpf_retention' && 'Retención IRPF'}
                              {integration.source_type === 'settlement' && 'Finiquito'}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Vence: {format(new Date(integration.due_date), 'dd MMM yyyy', { locale: es })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            € {integration.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </p>
                          <Badge variant={integration.status === 'paid' ? 'default' : 'outline'}>
                            {integration.status === 'paid' ? 'Pagado' : 'Pendiente'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  {integrations.length === 0 && (
                    <div className="p-8 text-center">
                      <Banknote className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No hay vencimientos en tesorería</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Flujo de Sincronización</p>
              <p className="text-muted-foreground mt-1">
                Al sincronizar, se crean automáticamente:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                <li><strong>Vencimientos individuales</strong> por cada neto de empleado (pago en 5 días)</li>
                <li><strong>Vencimiento consolidado TGSS</strong> por cotizaciones SS (último día del mes)</li>
                <li><strong>Vencimiento trimestral AEAT</strong> por retenciones IRPF (20 días post-trimestre)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default HRTreasurySync;
