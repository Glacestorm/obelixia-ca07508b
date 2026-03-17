/**
 * EmployeeNotificationsSection — "Mis notificaciones y alertas"
 * V2-RRHH-P3: Consolidated view of pending actions, alerts, and notifications
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell, CheckCircle2, AlertTriangle, Clock, FileText,
  Send, Palmtree, FolderOpen, CalendarDays, Info,
  Loader2, ChevronRight, XCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EmployeeProfile } from '@/hooks/erp/hr/useEmployeePortal';
import { computeDocStatus } from '@/components/erp/hr/shared/documentStatusEngine';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { type PortalSection } from './EmployeePortalNav';

interface Props {
  employee: EmployeeProfile;
  onNavigate: (section: PortalSection) => void;
}

interface AlertItem {
  id: string;
  type: 'document' | 'request' | 'leave' | 'payslip' | 'contract' | 'info';
  severity: 'urgent' | 'warning' | 'info';
  title: string;
  description: string;
  date: string;
  action?: PortalSection;
  actionLabel?: string;
  resolved?: boolean;
}

type TabFilter = 'all' | 'urgent' | 'info';

const SEVERITY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  urgent: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  warning: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-500/10' },
};

export function EmployeeNotificationsSection({ employee, onNavigate }: Props) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabFilter, setTabFilter] = useState<TabFilter>('all');

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    const items: AlertItem[] = [];
    const now = new Date();

    try {
      // Fetch in parallel: docs, requests, leaves, contract info
      const [docsRes, reqsRes, leavesRes] = await Promise.all([
        supabase
          .from('erp_hr_employee_documents')
          .select('id, document_name, document_type, document_status, expiry_date, created_at')
          .eq('employee_id', employee.id),
        supabase
          .from('hr_admin_requests')
          .select('id, subject, request_type, status, priority, created_at, updated_at')
          .eq('employee_id', employee.id)
          .in('status', ['pending_info', 'rejected'])
          .order('updated_at', { ascending: false })
          .limit(20),
        supabase
          .from('erp_hr_leave_requests')
          .select('id, leave_type_code, start_date, end_date, status, workflow_status, rejection_reason, created_at')
          .eq('employee_id', employee.id)
          .in('status', ['rejected'])
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      // Document alerts
      if (docsRes.data) {
        for (const doc of docsRes.data as any[]) {
          const status = computeDocStatus(doc.document_type, doc.expiry_date, now);
          if (status.status === 'expired') {
            items.push({
              id: `doc-exp-${doc.id}`,
              type: 'document',
              severity: 'urgent',
              title: `Documento caducado: ${doc.document_name}`,
              description: 'Este documento ha expirado. Contacta con RRHH o aporta uno actualizado.',
              date: doc.expiry_date || doc.created_at,
              action: 'documents',
              actionLabel: 'Ver documentos',
            });
          } else if (status.status === 'expiring') {
            items.push({
              id: `doc-expiring-${doc.id}`,
              type: 'document',
              severity: 'warning',
              title: `Documento próximo a caducar: ${doc.document_name}`,
              description: 'Caduca en los próximos 30 días. Prepara la renovación.',
              date: doc.expiry_date || doc.created_at,
              action: 'documents',
              actionLabel: 'Ver documentos',
            });
          }
          if (doc.document_status === 'rejected') {
            items.push({
              id: `doc-rej-${doc.id}`,
              type: 'document',
              severity: 'urgent',
              title: `Documento rechazado: ${doc.document_name}`,
              description: 'Revisa y vuelve a aportar este documento.',
              date: doc.created_at,
              action: 'documents',
              actionLabel: 'Ver documentos',
            });
          }
        }

        // Completeness check
        const types = new Set((docsRes.data as any[]).map((d: any) => d.document_type));
        const required = ['dni_nie', 'contrato_trabajo', 'irpf_modelo_145'];
        const missing = required.filter(t => !types.has(t));
        if (missing.length > 0) {
          items.push({
            id: 'doc-completeness',
            type: 'document',
            severity: 'warning',
            title: 'Documentación básica incompleta',
            description: `Faltan: ${missing.map(t => t.replace(/_/g, ' ')).join(', ')}`,
            date: now.toISOString(),
            action: 'documents',
            actionLabel: 'Ver documentos',
          });
        }
      }

      // Request alerts: pending_info
      if (reqsRes.data) {
        for (const req of reqsRes.data as any[]) {
          if (req.status === 'pending_info') {
            items.push({
              id: `req-info-${req.id}`,
              type: 'request',
              severity: 'warning',
              title: `Se necesita información: ${req.subject}`,
              description: 'RRHH te ha pedido información adicional para esta solicitud.',
              date: req.updated_at,
              action: 'requests',
              actionLabel: 'Ver solicitud',
            });
          } else if (req.status === 'rejected') {
            items.push({
              id: `req-rej-${req.id}`,
              type: 'request',
              severity: 'info',
              title: `Solicitud rechazada: ${req.subject}`,
              description: 'Consulta los motivos en el detalle de la solicitud.',
              date: req.updated_at,
              action: 'requests',
              actionLabel: 'Ver solicitud',
            });
          }
        }
      }

      // Leave rejection alerts
      if (leavesRes.data) {
        for (const leave of leavesRes.data as any[]) {
          items.push({
            id: `leave-rej-${leave.id}`,
            type: 'leave',
            severity: 'info',
            title: `Ausencia rechazada (${leave.leave_type_code || 'vacaciones'})`,
            description: leave.rejection_reason || 'Consulta los motivos con tu responsable.',
            date: leave.created_at,
            action: 'leave',
            actionLabel: 'Ver permisos',
          });
        }
      }

      // Contract end date alert
      if (employee.contract_type && ['temporal', '402', '410', '501', '502'].some(c => 
        (employee.contract_type || '').toLowerCase().includes(c)
      )) {
        items.push({
          id: 'contract-temp',
          type: 'contract',
          severity: 'info',
          title: 'Contrato temporal',
          description: 'Tienes un contrato temporal. Consulta con RRHH sobre tu renovación.',
          date: now.toISOString(),
          action: 'profile',
          actionLabel: 'Ver perfil',
        });
      }

      // Sort by severity then date
      const severityOrder = { urgent: 0, warning: 1, info: 2 };
      items.sort((a, b) => {
        const sev = severityOrder[a.severity] - severityOrder[b.severity];
        if (sev !== 0) return sev;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      setAlerts(items);
    } catch (err) {
      console.error('[EmployeeNotificationsSection] error:', err);
    } finally {
      setLoading(false);
    }
  }, [employee]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const filtered = useMemo(() => {
    if (tabFilter === 'all') return alerts;
    if (tabFilter === 'urgent') return alerts.filter(a => a.severity === 'urgent' || a.severity === 'warning');
    return alerts.filter(a => a.severity === 'info');
  }, [alerts, tabFilter]);

  const counts = useMemo(() => ({
    all: alerts.length,
    urgent: alerts.filter(a => a.severity === 'urgent' || a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
  }), [alerts]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Alertas y pendientes
          {counts.urgent > 0 && (
            <Badge variant="destructive" className="text-[10px]">{counts.urgent}</Badge>
          )}
        </h2>
        <p className="text-sm text-muted-foreground">
          Documentos, solicitudes y acciones que requieren tu atención
        </p>
      </div>

      <Tabs value={tabFilter} onValueChange={v => setTabFilter(v as TabFilter)}>
        <TabsList className="h-auto">
          <TabsTrigger value="all" className="text-xs gap-1">
            Todas <Badge variant="secondary" className="text-[10px] h-4 px-1">{counts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="urgent" className="text-xs gap-1">
            Urgentes <Badge variant="secondary" className="text-[10px] h-4 px-1">{counts.urgent}</Badge>
          </TabsTrigger>
          <TabsTrigger value="info" className="text-xs gap-1">
            Informativas <Badge variant="secondary" className="text-[10px] h-4 px-1">{counts.info}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500/30" />
            <p className="text-sm text-muted-foreground">
              {tabFilter === 'all' ? '¡Todo al día! No tienes alertas pendientes.' : 'No hay alertas de este tipo.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(alert => {
            const cfg = SEVERITY_CONFIG[alert.severity];
            const Icon = cfg.icon;
            const typeIcon = alert.type === 'document' ? FolderOpen :
              alert.type === 'request' ? Send :
              alert.type === 'leave' ? Palmtree :
              alert.type === 'payslip' ? FileText :
              alert.type === 'contract' ? CalendarDays : Info;

            return (
              <Card
                key={alert.id}
                className={`cursor-pointer hover:border-primary/30 transition-colors ${alert.severity === 'urgent' ? 'border-destructive/30' : ''}`}
                onClick={() => alert.action && onNavigate(alert.action)}
              >
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-9 w-9 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <TypeIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                        <p className="text-sm font-medium truncate">{alert.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{alert.description}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(alert.date), { locale: es, addSuffix: true })}
                      </p>
                    </div>
                    {alert.action && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-2" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
