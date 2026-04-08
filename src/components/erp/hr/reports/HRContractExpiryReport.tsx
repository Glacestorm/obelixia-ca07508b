/**
 * HRContractExpiryReport — Informe exportable de incidencias contractuales
 * Tabla de empleados afectados + exportación CSV + impresión
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Download, Printer, RefreshCw, Shield, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  computeContractExpiryAlert, getAlertSummary, isTemporaryContract,
  type ContractExpiryInput, type ContractExpiryAlert, type ExpiryAlertLevel,
} from '@/engines/erp/hr/contractExpiryAlertEngine';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props { companyId: string }

type AlertRow = ContractExpiryAlert & { contractId: string; employeeId: string; employeeName: string; contractType: string };

const LEVEL_COLORS: Record<ExpiryAlertLevel, string> = {
  overdue: 'bg-destructive text-destructive-foreground',
  critical: 'bg-red-500 text-white',
  urgent: 'bg-orange-500 text-white',
  warning: 'bg-amber-500 text-white',
  notice: 'bg-blue-500 text-white',
  info: 'bg-muted text-muted-foreground',
};

export function HRContractExpiryReport({ companyId }: Props) {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: contracts } = await supabase
        .from('erp_hr_contracts')
        .select('id, employee_id, contract_type, contract_code, start_date, end_date, extension_date, extension_count, status, is_active')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (!contracts?.length) { setRows([]); return; }

      const employeeIds = [...new Set(contracts.map(c => c.employee_id).filter(Boolean))];
      const { data: employees } = await supabase
        .from('erp_hr_employees').select('id, first_name, last_name').in('id', employeeIds);
      const empMap = new Map((employees || []).map(e => [e.id, `${e.first_name} ${e.last_name}`]));

      const today = new Date();
      const computed: AlertRow[] = [];
      for (const c of contracts) {
        if (!c.contract_code || !isTemporaryContract(c.contract_code)) continue;
        const input: ContractExpiryInput = {
          contractId: c.id, employeeId: c.employee_id || '', employeeName: empMap.get(c.employee_id || '') || '',
          contractType: c.contract_type || '', contractTypeCode: c.contract_code, startDate: c.start_date,
          endDate: c.end_date, status: c.status || 'active', isTemporary: true,
        };
        const alert = computeContractExpiryAlert(input, today);
        if (alert) computed.push({ ...alert, contractId: c.id, employeeId: c.employee_id || '', employeeName: input.employeeName, contractType: c.contract_type || '' });
      }
      setRows(computed.sort((a, b) => a.daysRemaining - b.daysRemaining));
    } catch { /* */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [companyId]);

  const summary = useMemo(() => getAlertSummary(rows), [rows]);

  const exportCSV = () => {
    const header = 'Empleado,Tipo Contrato,Fecha Fin,Días Restantes,Urgencia,Acción\n';
    const body = rows.map(r =>
      `"${r.employeeName}","${r.contractType}","${r.endDate}",${r.daysRemaining},"${r.label}","${r.obligations[0] || ''}"`
    ).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `incidencias_contractuales_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('CSV exportado');
  };

  return (
    <div className="space-y-4">
      {/* Executive summary */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {(['overdue', 'critical', 'urgent', 'warning', 'notice', 'info'] as ExpiryAlertLevel[]).map(level => (
          <Card key={level}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{summary[level]}</p>
              <Badge className={cn("text-[10px] mt-1", LEVEL_COLORS[level])}>{level}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Legal deadlines reminder */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-3">
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Plazos legales de comunicación a organismos
          </h4>
          <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
            <div><span className="font-medium text-foreground">TGSS (TA.2):</span> 3 días naturales</div>
            <div><span className="font-medium text-foreground">SEPE (Certific@2):</span> 10 días naturales</div>
            <div><span className="font-medium text-foreground">Delt@ (AT):</span> 5 días hábiles</div>
          </div>
        </CardContent>
      </Card>

      {/* Main table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Incidencias Contractuales ({rows.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1", loading && "animate-spin")} /> Actualizar
              </Button>
              <Button variant="outline" size="sm" onClick={exportCSV} disabled={rows.length === 0}>
                <Download className="h-3.5 w-3.5 mr-1" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()} disabled={rows.length === 0}>
                <Printer className="h-3.5 w-3.5 mr-1" /> Imprimir
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Tipo contrato</TableHead>
                  <TableHead>Fecha fin</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Urgencia</TableHead>
                  <TableHead>Acción requerida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.contractId}>
                    <TableCell className="font-medium">{r.employeeName}</TableCell>
                    <TableCell className="text-sm">{r.contractType}</TableCell>
                    <TableCell className="text-sm font-mono">{r.endDate}</TableCell>
                    <TableCell>
                      <Badge variant={r.daysRemaining <= 0 ? 'destructive' : 'outline'} className="text-xs">
                        {r.daysRemaining}d
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-[10px]", LEVEL_COLORS[r.level])}>{r.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {r.obligations[0] || '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Sin incidencias contractuales
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default HRContractExpiryReport;
