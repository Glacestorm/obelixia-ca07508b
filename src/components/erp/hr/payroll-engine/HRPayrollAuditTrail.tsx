/**
 * HRPayrollAuditTrail — Timeline de auditoría de nómina
 */
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, FileText, Lock, Calculator, CheckCircle, XCircle, RefreshCw, Eye, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { PayrollAuditEntry } from '@/hooks/erp/hr/usePayrollEngine';

interface Props {
  companyId: string;
  auditLog: PayrollAuditEntry[];
  onFetch: (filters?: { periodId?: string; action?: string }) => void;
}

const ACTION_CONFIG: Record<string, { icon: typeof Shield; color: string; label: string }> = {
  created: { icon: FileText, color: 'text-emerald-500', label: 'Creado' },
  calculated: { icon: Calculator, color: 'text-blue-500', label: 'Calculado' },
  line_added: { icon: FileText, color: 'text-primary', label: 'Línea añadida' },
  line_modified: { icon: RefreshCw, color: 'text-amber-500', label: 'Línea modificada' },
  status_changed: { icon: RefreshCw, color: 'text-primary', label: 'Estado cambiado' },
  approved: { icon: CheckCircle, color: 'text-emerald-500', label: 'Aprobado' },
  rejected: { icon: XCircle, color: 'text-destructive', label: 'Rechazado' },
  closed: { icon: Lock, color: 'text-destructive', label: 'Cerrado' },
  locked: { icon: Lock, color: 'text-destructive', label: 'Bloqueado' },
  reopened: { icon: RefreshCw, color: 'text-amber-500', label: 'Reabierto' },
  recalculated: { icon: Calculator, color: 'text-blue-500', label: 'Recalculado' },
  exported: { icon: Eye, color: 'text-muted-foreground', label: 'Exportado' },
  simulated: { icon: Calculator, color: 'text-purple-500', label: 'Simulado' },
  // Run-specific events
  run_created: { icon: FileText, color: 'text-emerald-500', label: 'Run creado' },
  run_started: { icon: Clock, color: 'text-blue-500', label: 'Run iniciado' },
  run_calculated: { icon: Calculator, color: 'text-emerald-600', label: 'Run calculado' },
  run_reviewed: { icon: Eye, color: 'text-blue-500', label: 'Run revisado' },
  run_approved: { icon: CheckCircle, color: 'text-emerald-500', label: 'Run aprobado' },
  run_failed: { icon: XCircle, color: 'text-destructive', label: 'Run fallido' },
  run_superseded: { icon: RefreshCw, color: 'text-muted-foreground', label: 'Run sustituido' },
  // Period close events (V2-ES.7 Paso 3)
  period_closed: { icon: Lock, color: 'text-emerald-600', label: 'Período cerrado' },
  period_locked: { icon: Lock, color: 'text-destructive', label: 'Período bloqueado' },
  period_reopened: { icon: RefreshCw, color: 'text-amber-500', label: 'Período reabierto' },
};

export function HRPayrollAuditTrail({ companyId, auditLog, onFetch }: Props) {
  const [actionFilter, setActionFilter] = useState<string>('all');

  useEffect(() => {
    onFetch(actionFilter !== 'all' ? { action: actionFilter } : undefined);
  }, [actionFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> Auditoría de Nómina
        </h3>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            {Object.entries(ACTION_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {auditLog.map(entry => {
          const cfg = ACTION_CONFIG[entry.action] || ACTION_CONFIG.created;
          const Icon = cfg.icon;
          return (
            <Card key={entry.id}>
              <CardContent className="py-3 flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-muted mt-0.5`}>
                  <Icon className={`h-4 w-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{cfg.label}</Badge>
                    <span className="text-xs text-muted-foreground">{entry.entity_type}</span>
                    {entry.entity_type === 'payroll_run' && (
                      <Badge variant="secondary" className="text-[8px] px-1 py-0">Run</Badge>
                    )}
                  </div>
                  <p className="text-sm mt-1">
                    <span className="font-medium">{entry.actor_name || 'Sistema'}</span>
                    {entry.old_value && entry.new_value && (
                      <span className="text-muted-foreground">
                        {' '}cambió de <code className="text-xs bg-muted px-1 rounded">{JSON.stringify((entry.old_value as any)?.status || entry.old_value)}</code>
                        {' '}a <code className="text-xs bg-muted px-1 rounded">{JSON.stringify((entry.new_value as any)?.status || entry.new_value)}</code>
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(entry.created_at), { locale: es, addSuffix: true })}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {auditLog.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Shield className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Sin eventos de auditoría</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
