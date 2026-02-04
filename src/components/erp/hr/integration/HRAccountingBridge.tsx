/**
 * HRAccountingBridge - Panel de integración contable de nóminas
 * Permite generar asientos contables desde el módulo de RRHH
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table';
import {
  Calculator, CheckCircle, AlertTriangle, BookOpen,
  FileSpreadsheet, RefreshCw, Eye, Undo2, Loader2,
  ArrowRight, Banknote, Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import { useHRAccountingIntegration } from '@/hooks/admin/useHRAccountingIntegration';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface HRAccountingBridgeProps {
  companyId: string;
  period: string;
}

interface PayrollForAccounting {
  id: string;
  employee_name: string;
  department: string;
  gross_salary: number;
  net_salary: number;
  irpf_amount: number;
  ss_employee: number;
  ss_company: number;
  status: 'pending' | 'calculated' | 'paid';
  is_accounted: boolean;
  journal_entry_id?: string;
}

// Demo data para nóminas pendientes de contabilizar
const demoPayrolls: PayrollForAccounting[] = [
  {
    id: 'pay-001',
    employee_name: 'María García López',
    department: 'Administración',
    gross_salary: 2800,
    net_salary: 2156.80,
    irpf_amount: 425.60,
    ss_employee: 177.80,
    ss_company: 840.00,
    status: 'calculated',
    is_accounted: false
  },
  {
    id: 'pay-002',
    employee_name: 'Juan Martínez Ruiz',
    department: 'Producción',
    gross_salary: 2400,
    net_salary: 1891.20,
    irpf_amount: 300.00,
    ss_employee: 152.40,
    ss_company: 720.00,
    status: 'calculated',
    is_accounted: false
  },
  {
    id: 'pay-003',
    employee_name: 'Ana Fernández Castro',
    department: 'Comercial',
    gross_salary: 3200,
    net_salary: 2432.00,
    irpf_amount: 576.00,
    ss_employee: 203.20,
    ss_company: 960.00,
    status: 'paid',
    is_accounted: true,
    journal_entry_id: 'je-456'
  },
  {
    id: 'pay-004',
    employee_name: 'Carlos Rodríguez Pérez',
    department: 'IT',
    gross_salary: 3500,
    net_salary: 2625.00,
    irpf_amount: 700.00,
    ss_employee: 222.25,
    ss_company: 1050.00,
    status: 'calculated',
    is_accounted: false
  },
];

export function HRAccountingBridge({ companyId, period }: HRAccountingBridgeProps) {
  const [payrolls, setPayrolls] = useState<PayrollForAccounting[]>(demoPayrolls);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const {
    generateBatchPayrollEntries,
    isLoading
  } = useHRAccountingIntegration();

  const pendingPayrolls = payrolls.filter(p => !p.is_accounted && p.status === 'calculated');
  const accountedPayrolls = payrolls.filter(p => p.is_accounted);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.length === pendingPayrolls.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingPayrolls.map(p => p.id));
    }
  }, [pendingPayrolls, selectedIds]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  }, []);

  // Calcular totales de nóminas seleccionadas
  const selectedPayrolls = payrolls.filter(p => selectedIds.includes(p.id));
  const totals = selectedPayrolls.reduce((acc, p) => ({
    gross: acc.gross + p.gross_salary,
    net: acc.net + p.net_salary,
    irpf: acc.irpf + p.irpf_amount,
    ss_employee: acc.ss_employee + p.ss_employee,
    ss_company: acc.ss_company + p.ss_company
  }), { gross: 0, net: 0, irpf: 0, ss_employee: 0, ss_company: 0 });

  const handleGenerateEntries = async (consolidate: boolean = true) => {
    if (selectedIds.length === 0) {
      toast.error('Selecciona al menos una nómina');
      return;
    }

    setIsGenerating(true);
    try {
      const payrollsToProcess = selectedPayrolls.map(p => ({
        id: p.id,
        employee_id: p.id,
        employee_name: p.employee_name,
        period,
        gross_salary: p.gross_salary,
        net_salary: p.net_salary,
        irpf_amount: p.irpf_amount,
        irpf_percentage: (p.irpf_amount / p.gross_salary) * 100,
        ss_employee: p.ss_employee,
        ss_company: p.ss_company,
        extras: 0,
        deductions: 0
      }));

      const result = await generateBatchPayrollEntries(
        companyId,
        period,
        payrollsToProcess,
        new Date().toISOString().split('T')[0],
        undefined,
        consolidate
      );

      if (result) {
        // Marcar como contabilizadas
        setPayrolls(prev => prev.map(p => 
          selectedIds.includes(p.id) 
            ? { ...p, is_accounted: true, journal_entry_id: result.journal_entry_id }
            : p
        ));
        setSelectedIds([]);
        toast.success(
          consolidate
            ? `Asiento consolidado creado para ${selectedIds.length} nóminas`
            : `${selectedIds.length} asientos individuales creados`
        );
      }
    } catch (error) {
      console.error('Error generating entries:', error);
      toast.error('Error al generar asientos');
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusBadge = (payroll: PayrollForAccounting) => {
    if (payroll.is_accounted) {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
          <CheckCircle className="h-3 w-3 mr-1" />
          Contabilizada
        </Badge>
      );
    }
    if (payroll.status === 'calculated') {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Pendiente
        </Badge>
      );
    }
    return <Badge variant="outline">{payroll.status}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Resumen de integración */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <FileSpreadsheet className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold">{pendingPayrolls.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <BookOpen className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contabilizadas</p>
                <p className="text-2xl font-bold">{accountedPayrolls.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Receipt className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">IRPF Período</p>
                <p className="text-2xl font-bold">€{totals.irpf.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Banknote className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">SS Empresa</p>
                <p className="text-2xl font-bold">€{totals.ss_company.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel principal */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Integración Contable - {period}
              </CardTitle>
              <CardDescription>
                Genera asientos PGC desde nóminas calculadas
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                disabled={selectedIds.length === 0}
              >
                <Eye className="h-4 w-4 mr-1" />
                Vista Previa
              </Button>
              <Button
                size="sm"
                onClick={() => handleGenerateEntries(true)}
                disabled={selectedIds.length === 0 || isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <BookOpen className="h-4 w-4 mr-1" />
                )}
                Contabilizar ({selectedIds.length})
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Vista previa del asiento */}
          {showPreview && selectedIds.length > 0 && (
            <Alert className="mb-4 bg-muted/50">
              <Calculator className="h-4 w-4" />
              <AlertDescription>
                <div className="mt-2">
                  <p className="font-medium mb-2">Vista previa asiento consolidado:</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">DEBE</p>
                      <p>640 Sueldos: <strong>€{totals.gross.toLocaleString()}</strong></p>
                      <p>642 SS Empresa: <strong>€{totals.ss_company.toLocaleString()}</strong></p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">HABER</p>
                      <p>4751 IRPF: <strong>€{totals.irpf.toLocaleString()}</strong></p>
                      <p>476 SS Acreedora: <strong>€{(totals.ss_employee + totals.ss_company).toLocaleString()}</strong></p>
                      <p>465 Neto a pagar: <strong>€{totals.net.toLocaleString()}</strong></p>
                    </div>
                  </div>
                  <Separator className="my-2" />
                  <p className="text-xs text-muted-foreground">
                    Total Debe: €{(totals.gross + totals.ss_company).toLocaleString()} = 
                    Total Haber: €{(totals.irpf + totals.ss_employee + totals.ss_company + totals.net).toLocaleString()}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Tabla de nóminas */}
          <ScrollArea className="h-[350px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedIds.length === pendingPayrolls.length && pendingPayrolls.length > 0}
                      onCheckedChange={handleSelectAll}
                      disabled={pendingPayrolls.length === 0}
                    />
                  </TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">IRPF</TableHead>
                  <TableHead className="text-right">SS Emp.</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrolls.map((payroll) => (
                  <TableRow 
                    key={payroll.id}
                    className={payroll.is_accounted ? 'opacity-60' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(payroll.id)}
                        onCheckedChange={() => handleToggleSelect(payroll.id)}
                        disabled={payroll.is_accounted || payroll.status !== 'calculated'}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{payroll.employee_name}</TableCell>
                    <TableCell>{payroll.department}</TableCell>
                    <TableCell className="text-right">€{payroll.gross_salary.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-purple-600">
                      €{payroll.irpf_amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-amber-600">
                      €{payroll.ss_company.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      €{payroll.net_salary.toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(payroll)}</TableCell>
                    <TableCell>
                      {payroll.is_accounted && payroll.journal_entry_id && (
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Acciones adicionales */}
          <Separator className="my-4" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowRight className="h-4 w-4" />
              <span>Los asientos se crean en estado borrador para revisión</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateEntries(false)}
                disabled={selectedIds.length === 0 || isGenerating}
              >
                Asientos Individuales
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flujo de cuentas PGC */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Mapeo Cuentas PGC 2007</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            <div className="p-2 rounded border bg-red-50 dark:bg-red-950/20">
              <p className="font-semibold text-red-700 dark:text-red-400">640</p>
              <p className="text-muted-foreground">Sueldos y salarios</p>
            </div>
            <div className="p-2 rounded border bg-red-50 dark:bg-red-950/20">
              <p className="font-semibold text-red-700 dark:text-red-400">642</p>
              <p className="text-muted-foreground">SS a cargo empresa</p>
            </div>
            <div className="p-2 rounded border bg-blue-50 dark:bg-blue-950/20">
              <p className="font-semibold text-blue-700 dark:text-blue-400">4751</p>
              <p className="text-muted-foreground">HP retenciones IRPF</p>
            </div>
            <div className="p-2 rounded border bg-blue-50 dark:bg-blue-950/20">
              <p className="font-semibold text-blue-700 dark:text-blue-400">476</p>
              <p className="text-muted-foreground">Organismos SS</p>
            </div>
            <div className="p-2 rounded border bg-green-50 dark:bg-green-950/20">
              <p className="font-semibold text-green-700 dark:text-green-400">465</p>
              <p className="text-muted-foreground">Remuneraciones ptes.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default HRAccountingBridge;
