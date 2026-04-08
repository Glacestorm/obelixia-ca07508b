/**
 * HRContractExpiryWidget — Panel resumen de compliance contractual
 * Contratos agrupados por urgencia con acciones rápidas
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Clock, Shield, RefreshCw, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  computeContractExpiryAlert, getAlertSummary, isTemporaryContract,
  type ContractExpiryInput, type ContractExpiryAlert, type ExpiryAlertLevel,
} from '@/engines/erp/hr/contractExpiryAlertEngine';
import { cn } from '@/lib/utils';

interface HRContractExpiryWidgetProps {
  companyId: string;
  onNavigateToEmployee?: (employeeId: string) => void;
}

const LEVEL_ORDER: ExpiryAlertLevel[] = ['overdue', 'critical', 'urgent', 'warning', 'notice', 'info'];
const LEVEL_ICONS: Record<ExpiryAlertLevel, string> = {
  overdue: '🔴', critical: '🟥', urgent: '🟧', warning: '🟨', notice: '🟦', info: '⬜',
};

export function HRContractExpiryWidget({ companyId, onNavigateToEmployee }: HRContractExpiryWidgetProps) {
  const [alerts, setAlerts] = useState<Array<ContractExpiryAlert & { contractId: string; employeeId: string; employeeName: string }>>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const { data: contracts } = await supabase
        .from('erp_hr_contracts')
        .select('id, employee_id, contract_type, contract_code, start_date, end_date, extension_date, extension_count, status, is_active')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (!contracts?.length) { setAlerts([]); setLoading(false); return; }

      const employeeIds = [...new Set(contracts.map(c => c.employee_id).filter(Boolean))];
      const { data: employees } = await supabase
        .from('erp_hr_employees')
        .select('id, first_name, last_name')
        .in('id', employeeIds);

      const empMap = new Map((employees || []).map(e => [e.id, `${e.first_name} ${e.last_name}`]));

      const inputs: ContractExpiryInput[] = contracts
        .filter(c => c.contract_code && isTemporaryContract(c.contract_code))
        .map(c => ({
          contractId: c.id,
          employeeId: c.employee_id || '',
          employeeName: empMap.get(c.employee_id || '') || 'Desconocido',
          contractType: c.contract_type || '',
          contractTypeCode: c.contract_code || '',
          startDate: c.start_date,
          endDate: c.end_date,
          extensionDate: c.extension_date,
          extensionCount: c.extension_count || 0,
          status: c.status || 'active',
          isTemporary: true,
        }));

      const today = new Date();
      const computed = inputs
        .map(input => {
          const alert = computeContractExpiryAlert(input, today);
          return alert ? { ...alert, contractId: input.contractId, employeeId: input.employeeId, employeeName: input.employeeName } : null;
        })
        .filter((a): a is NonNullable<typeof a> => a !== null)
        .sort((a, b) => a.daysRemaining - b.daysRemaining);

      setAlerts(computed);
    } catch (err) {
      console.error('[ExpiryWidget] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, [companyId]);

  const summary = useMemo(() => getAlertSummary(alerts), [alerts]);
  const actionRequired = alerts.filter(a => a.requiresAction);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Compliance Contractual
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchAlerts} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary counters */}
        <div className="flex gap-1.5 flex-wrap">
          {LEVEL_ORDER.filter(l => summary[l] > 0).map(level => (
            <Badge key={level} variant="outline" className="text-xs gap-1">
              {LEVEL_ICONS[level]} {summary[level]}
            </Badge>
          ))}
          {alerts.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground">Sin contratos temporales activos</p>
          )}
        </div>

        {/* Action required list */}
        {actionRequired.length > 0 && (
          <ScrollArea className="h-[200px]">
            <div className="space-y-1.5">
              {actionRequired.map(alert => (
                <div
                  key={alert.contractId}
                  className={cn("p-2 rounded-md text-xs cursor-pointer hover:opacity-80 transition-opacity", alert.bgColor)}
                  onClick={() => onNavigateToEmployee?.(alert.employeeId)}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("font-medium", alert.color)}>{alert.employeeName}</span>
                    <div className="flex items-center gap-1">
                      {alert.conversionRequired ? (
                        <Badge variant="destructive" className="text-[10px] h-4">Conversión</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-4">
                          <Clock className="h-2.5 w-2.5 mr-0.5" />
                          {alert.daysRemaining}d
                        </Badge>
                      )}
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-muted-foreground mt-0.5">{alert.label}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export default HRContractExpiryWidget;
