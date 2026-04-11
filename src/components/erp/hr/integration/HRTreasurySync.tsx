/**
 * HRTreasurySync - Sincronización RRHH ↔ Tesorería
 * H1.2: Connected to real erp_hr_payrolls data
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowUpCircle, Building2, CheckCircle, Clock, RefreshCw,
  Landmark, Users, FileText, Link2, Info, Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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

// Demo fallback
const DEMO_PAYROLLS: PayrollForSync[] = [
  { id: 'demo-1', employee_name: 'María García López', period: '2026-01', net_amount: 1850.45, ss_employee: 127.30, ss_employer: 485.20, irpf_amount: 312.50, status: 'approved', calculated_at: '2026-01-28T10:00:00Z', treasury_synced: false },
  { id: 'demo-2', employee_name: 'Carlos Ruiz Martín', period: '2026-01', net_amount: 2150.80, ss_employee: 148.60, ss_employer: 567.40, irpf_amount: 425.00, status: 'approved', calculated_at: '2026-01-28T10:05:00Z', treasury_synced: false },
];

interface HRTreasurySyncProps {
  companyId?: string;
}

export function HRTreasurySync({ companyId }: HRTreasurySyncProps) {
  const { currentCompany } = useERPContext();
  const effectiveCompanyId = companyId || currentCompany?.id;
  const [activeTab, setActiveTab] = useState('pending');
  const [payrolls, setPayrolls] = useState<PayrollForSync[]>([]);
  const [selectedPayrolls, setSelectedPayrolls] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [hasRealData, setHasRealData] = useState(false);

  const {
    createPayrollPayment, createSSContributionPayment,
    createIRPFRetentionPayment, isLoading, integrations, fetchIntegrations
  } = useHRTreasuryIntegration();

  const { syncToTreasury: logToTreasury } = useHRIntegrationLog(effectiveCompanyId);

  // Load real payrolls
  const loadPayrolls = useCallback(async () => {
    if (!effectiveCompanyId) return;
    setIsLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_payrolls')
        .select('id, employee_id, period_month, period_year, net_salary, ss_worker, ss_company, irpf_amount, status, created_at')
        .eq('company_id', effectiveCompanyId)
        .in('status', ['approved', 'paid'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        const empIds = [...new Set(data.map(d => d.employee_id).filter(Boolean))];
        const { data: employees } = await supabase
          .from('erp_hr_employees')
          .select('id, first_name, last_name')
          .in('id', empIds);

        const empMap = new Map(
          (employees || []).map(e => [e.id, `${e.first_name} ${e.last_name}`])
        );

        // Check which are already synced via bridge logs
        const { data: bridgeLogs } = await supabase
          .from('erp_hr_bridge_logs')
          .select('source_record_id, status')
          .eq('company_id', effectiveCompanyId)
          .eq('bridge_type', 'payroll_to_treasury');

        const syncedSet = new Set(
          (bridgeLogs || []).filter(l => l.status === 'completed').map(l => l.source_record_id)
        );

        const mapped: PayrollForSync[] = data.map(d => ({
          id: d.id,
          employee_name: empMap.get(d.employee_id) || `Empleado ${d.employee_id?.slice(0, 8) || '?'}`,
          period: `${d.period_year}-${String(d.period_month).padStart(2, '0')}`,
          net_amount: d.net_salary || 0,
          ss_employee: d.ss_worker || 0,
          ss_employer: d.ss_company || 0,
          irpf_amount: d.irpf_amount || 0,
          status: d.status || 'approved',
          calculated_at: d.created_at || new Date().toISOString(),
          treasury_synced: syncedSet.has(d.id),
        }));

        setPayrolls(mapped);
        setHasRealData(true);
      } else {
        setPayrolls(DEMO_PAYROLLS);
        setHasRealData(false);
      }
    } catch (err) {
      console.error('[HRTreasurySync] Load error:', err);
      setPayrolls(DEMO_PAYROLLS);
      setHasRealData(false);
    } finally {
      setIsLoadingData(false);
    }
  }, [effectiveCompanyId]);

  useEffect(() => {
    loadPayrolls();
    if (currentCompany?.id) fetchIntegrations(currentCompany.id);
  }, [loadPayrolls, currentCompany?.id]);

  const pendingPayrolls = payrolls.filter(p => !p.treasury_synced && p.status === 'approved');
  const syncedPayrolls = payrolls.filter(p => p.treasury_synced);

  const totals = pendingPayrolls.reduce((acc, p) => ({
    net: acc.net + p.net_amount,
    ss: acc.ss + p.ss_employer,
    irpf: acc.irpf + p.irpf_amount
  }), { net: 0, ss: 0, irpf: 0 });

  const handleSelectAll = (checked: boolean) => {
    setSelectedPayrolls(checked ? pendingPayrolls.map(p => p.id) : []);
  };

  const handleSelectPayroll = (payrollId: string, checked: boolean) => {
    setSelectedPayrolls(prev => checked ? [...prev, payrollId] : prev.filter(id => id !== payrollId));
  };

  const handleSyncToTreasury = async () => {
    if (!effectiveCompanyId || selectedPayrolls.length === 0) return;

    setIsSyncing(true);
    try {
      const selectedData = pendingPayrolls.filter(p => selectedPayrolls.includes(p.id));
      let successCount = 0;

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

      const totalSS = selectedData.reduce((sum, p) => sum + p.ss_employer + p.ss_employee, 0);
      if (totalSS > 0) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + 1);
        dueDate.setDate(0);
        await createSSContributionPayment(effectiveCompanyId, {
          periodId: `ss-${format(new Date(), 'yyyy-MM')}`,
          periodReference: `SS-${format(new Date(), 'yyyy-MM')}`,
          totalAmount: totalSS,
          dueDate: format(dueDate, 'yyyy-MM-dd')
        });
      }

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

      setPayrolls(prev => prev.map(p => 
        selectedPayrolls.includes(p.id) ? { ...p, treasury_synced: true } : p
      ));
      setSelectedPayrolls([]);

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
        <Button variant="outline" size="sm" onClick={loadPayrolls} disabled={isLoadingData}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoadingData && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Demo data warning */}
      {!hasRealData && !isLoadingData && (
        <Alert className="bg-warning/5 border-warning/30">
          <Info className="h-4 w-4 text-warning" />
          <AlertDescription className="text-sm text-warning">
            Datos de ejemplo — No hay nóminas aprobadas disponibles
          </AlertDescription>
        </Alert>
      )}

      {/* Resumen */}
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
                {isLoadingData ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                <div className="divide-y">
                  {pendingPayrolls.map((payroll) => (
                    <div key={payroll.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={selectedPayrolls.includes(payroll.id)}
                          onCheckedChange={(checked) => handleSelectPayroll(payroll.id, checked as boolean)}
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
                )}
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
                    <div key={payroll.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-green-500/10">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">{payroll.employee_name}</p>
                            <p className="text-xs text-muted-foreground">Período: {payroll.period}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            € {payroll.net_amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </p>
                          <Badge variant="outline" className="text-green-600">Sincronizada</Badge>
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
                    <div key={integration.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            integration.source_type === 'payroll' && "bg-primary/10",
                            integration.source_type === 'ss_contribution' && "bg-orange-500/10",
                            integration.source_type === 'irpf_retention' && "bg-purple-500/10"
                          )}>
                            {integration.source_type === 'payroll' && <Users className="h-4 w-4 text-primary" />}
                            {integration.source_type === 'ss_contribution' && <Landmark className="h-4 w-4 text-orange-600" />}
                            {integration.source_type === 'irpf_retention' && <FileText className="h-4 w-4 text-purple-600" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{integration.source_reference}</p>
                            <p className="text-xs text-muted-foreground">
                              {integration.source_type === 'payroll' && 'Nómina empleado'}
                              {integration.source_type === 'ss_contribution' && 'Cotización SS'}
                              {integration.source_type === 'irpf_retention' && 'Retención IRPF'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            € {(integration.amount || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </p>
                          <Badge variant="outline" className={cn(
                          (integration.status as string) === 'synced' && "text-green-600",
                            integration.status === 'pending' && "text-amber-600"
                          )}>
                            {integration.status === 'synced' ? 'Sincronizado' : 'Pendiente'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  {integrations.length === 0 && (
                    <div className="p-8 text-center">
                      <ArrowUpCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No hay integraciones registradas</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRTreasurySync;
