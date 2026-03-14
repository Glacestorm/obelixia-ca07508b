/**
 * ContractSummaryWidget — Compact contract process status for employee expedient
 * V2-ES.6 Paso 1.1: Read-only summary (mirrors RegistrationSummaryWidget)
 */
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileSignature, AlertTriangle, CheckCircle2, Clock, Lock, AlertOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { computeContractDeadlines } from './contractDeadlineEngine';
import { useHRHolidayCalendar } from '@/hooks/erp/hr/useHRHolidayCalendar';
import {
  CONTRACT_PROCESS_STATUS_CONFIG,
  type ContractProcessData,
  type ContractProcessStatus,
} from '@/hooks/erp/hr/useHRContractProcess';

interface Props {
  companyId: string;
  employeeId: string;
  className?: string;
}

export function ContractSummaryWidget({ companyId, employeeId, className }: Props) {
  const [data, setData] = useState<ContractProcessData | null>(null);
  const [loading, setLoading] = useState(true);
  const { holidaySet } = useHRHolidayCalendar();

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const { data: row, error } = await supabase
          .from('erp_hr_contract_process_data')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!cancelled) {
          setData(error ? null : (row as ContractProcessData | null));
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, [employeeId, companyId]);

  const deadlineSummary = useMemo(() => computeContractDeadlines(data, holidaySet), [data, holidaySet]);

  if (loading || !data) return null;

  const status = data.contract_process_status as ContractProcessStatus;
  const config = CONTRACT_PROCESS_STATUS_CONFIG[status];
  const isComplete = status === 'confirmed';
  const isPending = status === 'pending_data' || status === 'pending_documents';
  const isClosed = data.closure_status === 'closed';

  return (
    <Card className={cn('border-l-2', isComplete ? 'border-l-emerald-500' : isPending ? 'border-l-amber-500' : 'border-l-blue-500', className)}>
      <CardContent className="py-3 px-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <FileSignature className="h-3.5 w-3.5 text-primary" />
            Contratación
          </div>
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', config?.color)}>
            {config?.labelES || status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
          {data.contract_start_date && (
            <div className="flex items-center gap-1">
              <Clock className="h-2.5 w-2.5 text-muted-foreground" />
              <span className="text-muted-foreground">Inicio:</span>
              <span className="font-medium">{new Date(data.contract_start_date).toLocaleDateString('es')}</span>
            </div>
          )}
          {data.contract_type_code && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Tipo:</span>
              <span className="font-medium">{data.contract_type_code}</span>
            </div>
          )}
          {data.contract_duration_type && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Duración:</span>
              <span className="font-medium capitalize">{data.contract_duration_type}</span>
            </div>
          )}
          {data.working_hours_type && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Jornada:</span>
              <span className="font-medium capitalize">{data.working_hours_type}</span>
            </div>
          )}
        </div>

        {isPending && (
          <div className="flex items-center gap-1 text-[10px] text-amber-600">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span>{status === 'pending_data' ? 'Datos obligatorios pendientes' : 'Documentación pendiente'}</span>
          </div>
        )}

        {isClosed && !isComplete && (
          <div className="flex items-center gap-1 text-[10px] text-primary">
            <Lock className="h-3 w-3 shrink-0" />
            <span>Cerrado internamente{data.closed_at ? `: ${new Date(data.closed_at).toLocaleDateString('es')}` : ''}</span>
          </div>
        )}

        {isComplete && data.confirmed_at && (
          <div className="flex items-center gap-1 text-[10px] text-emerald-600">
            <CheckCircle2 className="h-3 w-3 shrink-0" />
            <span>Confirmado: {new Date(data.confirmed_at).toLocaleDateString('es')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
