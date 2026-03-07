/**
 * HRPayrollPanel - Gestión de nóminas (datos reales desde Supabase)
 * Flujo: draft → calculated → approved → paid
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table';
import {
  DollarSign, Calculator, FileDown, Search, Filter,
  CheckCircle, Clock, AlertTriangle, Users,
  TrendingUp, Euro, Plus, Eye, RefreshCw, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { HRPayrollEntryDialog } from './HRPayrollEntryDialog';

interface PayrollRow {
  id: string;
  employee_id: string;
  period_month: number;
  period_year: number;
  payroll_type: string;
  base_salary: number;
  gross_salary: number;
  ss_worker: number;
  irpf_amount: number;
  irpf_percentage: number;
  total_deductions: number;
  net_salary: number;
  ss_company: number;
  total_cost: number;
  status: string;
  paid_at: string | null;
  complements: any;
  other_deductions: any;
  notes: string | null;
  employee_first_name?: string;
  employee_last_name?: string;
  department_name?: string;
}

interface HRPayrollPanelProps {
  companyId: string;
}

export function HRPayrollPanel({ companyId }: HRPayrollPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(null);
  const [payrolls, setPayrolls] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [year, month] = selectedMonth.split('-').map(Number);

  // Fetch payrolls from DB
  const fetchPayrolls = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_payrolls')
        .select(`
          *,
          erp_hr_employees!erp_hr_payrolls_employee_id_fkey(first_name, last_name, department_id, erp_hr_departments!erp_hr_employees_department_id_fkey(name))
        `)
        .eq('company_id', companyId)
        .eq('period_month', month)
        .eq('period_year', year)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: PayrollRow[] = (data || []).map((row: any) => ({
        ...row,
        employee_first_name: row.erp_hr_employees?.first_name || '',
        employee_last_name: row.erp_hr_employees?.last_name || '',
        department_name: row.erp_hr_employees?.erp_hr_departments?.name || 'Sin dpto.',
      }));

      setPayrolls(mapped);
    } catch (err) {
      console.error('Error fetching payrolls:', err);
      toast.error('Error al cargar nóminas');
    } finally {
      setLoading(false);
    }
  }, [companyId, month, year]);

  useEffect(() => { fetchPayrolls(); }, [fetchPayrolls]);

  // Summary from real data
  const summary = {
    totalGross: payrolls.reduce((s, p) => s + (p.gross_salary || 0), 0),
    totalNet: payrolls.reduce((s, p) => s + (p.net_salary || 0), 0),
    totalIRPF: payrolls.reduce((s, p) => s + (p.irpf_amount || 0), 0),
    totalSS: payrolls.reduce((s, p) => s + (p.ss_worker || 0), 0),
    employeesCount: payrolls.length,
    pendingCount: payrolls.filter(p => p.status === 'draft' || p.status === 'calculated').length,
  };

  // Approve a payroll
  const handleApprove = useCallback(async (payrollId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('erp_hr_payrolls')
      .update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() } as any)
      .eq('id', payrollId);

    if (error) {
      toast.error('Error al aprobar nómina');
    } else {
      toast.success('Nómina aprobada');
      fetchPayrolls();
    }
  }, [fetchPayrolls]);

  // Mark as paid
  const handleMarkPaid = useCallback(async (payrollId: string) => {
    const ref = `PAY-${year}${String(month).padStart(2, '0')}-${payrollId.slice(0, 6).toUpperCase()}`;
    const { error } = await supabase
      .from('erp_hr_payrolls')
      .update({ status: 'paid', paid_at: new Date().toISOString(), payment_reference: ref } as any)
      .eq('id', payrollId);

    if (error) {
      toast.error('Error al marcar como pagada');
    } else {
      toast.success(`Nómina pagada (ref: ${ref})`);
      fetchPayrolls();
    }
  }, [fetchPayrolls, year, month]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Pagada</Badge>;
      case 'approved':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Aprobada</Badge>;
      case 'calculated':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Calculada</Badge>;
      case 'draft':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">Borrador</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredPayrolls = payrolls.filter(p => {
    const name = `${p.employee_first_name} ${p.employee_last_name}`.toLowerCase();
    const dept = (p.department_name || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    return name.includes(term) || dept.includes(term);
  });

  return (
    <div className="space-y-4">
      {/* Resumen mensual */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Bruto Total</p>
                <p className="text-lg font-bold">€{summary.totalGross.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Neto Total</p>
                <p className="text-lg font-bold">€{summary.totalNet.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">IRPF</p>
                <p className="text-lg font-bold">€{summary.totalIRPF.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">SS Trabajador</p>
                <p className="text-lg font-bold">€{summary.totalSS.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-500" />
              <div>
                <p className="text-xs text-muted-foreground">Nóminas</p>
                <p className="text-lg font-bold">{summary.employeesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-lg font-bold">{summary.pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Herramientas y filtros */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Nóminas - {new Date(year, month - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</CardTitle>
              <CardDescription>Gestión y cálculo de nóminas mensuales</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-[180px]"
              />
              <Button size="sm" variant="ghost" onClick={fetchPayrolls} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button size="sm" onClick={() => { setSelectedPayrollId(null); setShowPayrollDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" />
                Nueva Nómina
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Búsqueda */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empleado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Tabla de nóminas */}
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                Cargando nóminas...
              </div>
            ) : filteredPayrolls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <DollarSign className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">No hay nóminas para este período</p>
                <p className="text-xs mt-1">Pulsa "Nueva Nómina" para crear una</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Bruto</TableHead>
                    <TableHead className="text-right">IRPF</TableHead>
                    <TableHead className="text-right">SS Trab.</TableHead>
                    <TableHead className="text-right">Neto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayrolls.map((payroll) => (
                    <TableRow key={payroll.id}>
                      <TableCell className="font-medium">
                        {payroll.employee_first_name} {payroll.employee_last_name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{payroll.department_name}</TableCell>
                      <TableCell className="text-right">€{(payroll.base_salary || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">€{(payroll.gross_salary || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{payroll.irpf_percentage}%</TableCell>
                      <TableCell className="text-right text-muted-foreground">€{(payroll.ss_worker || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right font-semibold">€{(payroll.net_salary || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{getStatusBadge(payroll.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPayrollId(payroll.id);
                              setShowPayrollDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {payroll.status === 'calculated' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-emerald-600"
                              onClick={() => handleApprove(payroll.id)}
                              title="Aprobar"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {payroll.status === 'approved' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600"
                              onClick={() => handleMarkPaid(payroll.id)}
                              title="Marcar pagada"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialog de entrada de nómina */}
      <HRPayrollEntryDialog
        open={showPayrollDialog}
        onOpenChange={(open) => {
          setShowPayrollDialog(open);
          if (!open) setSelectedPayrollId(null);
        }}
        companyId={companyId}
        month={selectedMonth}
        payrollId={selectedPayrollId}
        onSave={() => {
          fetchPayrolls();
        }}
      />
    </div>
  );
}

export default HRPayrollPanel;
