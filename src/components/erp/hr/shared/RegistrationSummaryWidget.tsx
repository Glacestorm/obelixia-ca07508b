/**
 * RegistrationSummaryWidget — Compact registration status for employee expedient
 * V2-ES.5 Paso 1: Read-only summary without duplicating orchestration logic
 *
 * Shows: status, key missing items, dates — fetches from erp_hr_registration_data by employee
 */
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCheck, AlertTriangle, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  REGISTRATION_STATUS_CONFIG,
  type RegistrationData,
  type RegistrationStatus,
} from '@/hooks/erp/hr/useHRRegistrationProcess';
import { RegistrationStatusBadge } from './RegistrationStatusBadge';

interface Props {
  companyId: string;
  employeeId: string;
  className?: string;
}

export function RegistrationSummaryWidget({ companyId, employeeId, className }: Props) {
  const [data, setData] = useState<RegistrationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const { data: row, error } = await supabase
          .from('erp_hr_registration_data')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!cancelled) {
          setData(error ? null : (row as RegistrationData | null));
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

  // Don't render if no registration process exists
  if (loading || !data) return null;

  const status = data.registration_status as RegistrationStatus;
  const isComplete = status === 'confirmed';
  const isPending = status === 'pending_data' || status === 'pending_documents';

  return (
    <Card className={cn('border-l-2', isComplete ? 'border-l-emerald-500' : isPending ? 'border-l-amber-500' : 'border-l-blue-500', className)}>
      <CardContent className="py-3 px-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <UserCheck className="h-3.5 w-3.5 text-primary" />
            Alta / Afiliación
          </div>
          <RegistrationStatusBadge status={status} />
        </div>

        {/* Key info */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
          {data.registration_date && (
            <div className="flex items-center gap-1">
              <Clock className="h-2.5 w-2.5 text-muted-foreground" />
              <span className="text-muted-foreground">Alta:</span>
              <span className="font-medium">{new Date(data.registration_date).toLocaleDateString('es')}</span>
            </div>
          )}
          {data.contract_type_code && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Contrato:</span>
              <span className="font-medium">{data.contract_type_code}</span>
            </div>
          )}
          {data.naf && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">NAF:</span>
              <span className="font-medium">{data.naf}</span>
            </div>
          )}
          {data.contribution_group && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Grupo:</span>
              <span className="font-medium">{data.contribution_group}</span>
            </div>
          )}
        </div>

        {/* Missing fields warning */}
        {isPending && (
          <div className="flex items-center gap-1 text-[10px] text-amber-600">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span>
              {status === 'pending_data'
                ? 'Datos obligatorios pendientes'
                : 'Documentación obligatoria pendiente'
              }
            </span>
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
