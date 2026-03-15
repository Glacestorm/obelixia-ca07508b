/**
 * EmployeeRequestsSection — "Mis solicitudes" del Portal del Empleado
 * V2-ES.9.5: Autoservicio sobre el sistema de workflows existente
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Send, Plus, Search, Clock, CheckCircle2, XCircle,
  AlertTriangle, ChevronRight, MessageSquare, FileText,
  Calendar, Filter, Loader2, FolderOpen, ArrowRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EmployeeProfile } from '@/hooks/erp/hr/useEmployeePortal';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { type PortalSection } from './EmployeePortalNav';

interface Props {
  employee: EmployeeProfile;
  onNavigate: (section: PortalSection) => void;
}

interface EmployeeRequest {
  id: string;
  request_type: string;
  request_subtype: string | null;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  reference_number: string | null;
  attachments: any;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

type StatusFilter = 'all' | 'active' | 'resolved';

const REQUEST_TYPES = [
  { value: 'vacaciones', label: 'Vacaciones', icon: '🏖️' },
  { value: 'permiso', label: 'Permiso / Licencia', icon: '📋' },
  { value: 'cambio_datos', label: 'Actualización de datos', icon: '✏️' },
  { value: 'cambio_cuenta_bancaria', label: 'Cambio de cuenta bancaria', icon: '🏦' },
  { value: 'certificado', label: 'Solicitud de certificado', icon: '📄' },
  { value: 'consulta_nomina', label: 'Consulta de nómina', icon: '💶' },
  { value: 'justificante', label: 'Entrega de justificante', icon: '📎' },
  { value: 'incidencia', label: 'Incidencia personal', icon: '⚠️' },
];

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  submitted: { label: 'Enviada', icon: Send, color: 'text-blue-600', variant: 'secondary' },
  in_progress: { label: 'En curso', icon: Clock, color: 'text-amber-600', variant: 'secondary' },
  pending_info: { label: 'Info pendiente', icon: AlertTriangle, color: 'text-orange-600', variant: 'outline' },
  approved: { label: 'Aprobada', icon: CheckCircle2, color: 'text-emerald-600', variant: 'default' },
  rejected: { label: 'Rechazada', icon: XCircle, color: 'text-rose-600', variant: 'destructive' },
  completed: { label: 'Completada', icon: CheckCircle2, color: 'text-emerald-600', variant: 'default' },
  cancelled: { label: 'Cancelada', icon: XCircle, color: 'text-muted-foreground', variant: 'outline' },
};

const TYPE_LABELS: Record<string, string> = {};
for (const t of REQUEST_TYPES) TYPE_LABELS[t.value] = t.label;

export function EmployeeRequestsSection({ employee, onNavigate }: Props) {
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedRequest, setSelectedRequest] = useState<EmployeeRequest | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hr_admin_requests')
        .select('id, request_type, request_subtype, subject, description, status, priority, reference_number, attachments, resolution, resolved_at, created_at, updated_at')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as EmployeeRequest[]);
    } catch (err) {
      console.error('[EmployeeRequestsSection] fetch error:', err);
      toast.error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  }, [employee.id]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Filter
  const filtered = useMemo(() => {
    let base = requests;
    if (statusFilter === 'active') {
      base = base.filter(r => ['submitted', 'in_progress', 'pending_info', 'approved'].includes(r.status));
    } else if (statusFilter === 'resolved') {
      base = base.filter(r => ['completed', 'rejected', 'cancelled'].includes(r.status));
    }
    if (search) {
      const s = search.toLowerCase();
      base = base.filter(r =>
        r.subject.toLowerCase().includes(s) ||
        r.request_type.toLowerCase().includes(s) ||
        (r.reference_number || '').toLowerCase().includes(s)
      );
    }
    return base;
  }, [requests, statusFilter, search]);

  const counts = useMemo(() => ({
    all: requests.length,
    active: requests.filter(r => ['submitted', 'in_progress', 'pending_info', 'approved'].includes(r.status)).length,
    resolved: requests.filter(r => ['completed', 'rejected', 'cancelled'].includes(r.status)).length,
  }), [requests]);

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" /> Mis Solicitudes
            </h2>
            <p className="text-sm text-muted-foreground">
              Crea, consulta y sigue tus solicitudes administrativas
            </p>
          </div>
          <Button className="gap-2" onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4" /> Nueva solicitud
          </Button>
        </div>

        {/* Tabs + search */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <Tabs value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
            <TabsList className="h-auto">
              <TabsTrigger value="all" className="text-xs gap-1">
                Todas <Badge variant="secondary" className="text-[10px] h-4 px-1">{counts.all}</Badge>
              </TabsTrigger>
              <TabsTrigger value="active" className="text-xs gap-1">
                Activas <Badge variant="secondary" className="text-[10px] h-4 px-1">{counts.active}</Badge>
              </TabsTrigger>
              <TabsTrigger value="resolved" className="text-xs gap-1">
                Resueltas <Badge variant="secondary" className="text-[10px] h-4 px-1">{counts.resolved}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
        </div>

        {/* Request list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Send className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {requests.length === 0 ? 'No has creado solicitudes aún' : 'No hay resultados para este filtro'}
              </p>
              {requests.length === 0 && (
                <Button variant="outline" className="mt-3 gap-2" onClick={() => setShowNewDialog(true)}>
                  <Plus className="h-4 w-4" /> Crear primera solicitud
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => {
              const st = STATUS_CONFIG[r.status] || { label: r.status, icon: Clock, color: 'text-muted-foreground', variant: 'outline' as const };
              const StIcon = st.icon;
              const typeLabel = TYPE_LABELS[r.request_type] || r.request_type;

              return (
                <Card
                  key={r.id}
                  className="cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => setSelectedRequest(r)}
                >
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0`}>
                          <StIcon className={`h-4 w-4 ${st.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{r.subject}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{typeLabel}</span>
                            <span>·</span>
                            <span>{formatDistanceToNow(new Date(r.created_at), { locale: es, addSuffix: true })}</span>
                            {r.reference_number && (
                              <>
                                <span>·</span>
                                <span className="font-mono text-[10px]">{r.reference_number}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <Sheet open={!!selectedRequest} onOpenChange={open => !open && setSelectedRequest(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-4 sm:p-6">
          {selectedRequest && (
            <RequestDetail
              request={selectedRequest}
              onNavigateDocuments={() => { setSelectedRequest(null); onNavigate('documents'); }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* New request dialog */}
      <NewRequestDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        employee={employee}
        onCreated={() => { setShowNewDialog(false); fetchRequests(); }}
      />
    </>
  );
}

// ─── Request detail ─────────────────────────────────────────────────────

function RequestDetail({ request, onNavigateDocuments }: {
  request: EmployeeRequest;
  onNavigateDocuments: () => void;
}) {
  const st = STATUS_CONFIG[request.status] || { label: request.status, icon: Clock, color: 'text-muted-foreground', variant: 'outline' as const };
  const typeLabel = TYPE_LABELS[request.request_type] || request.request_type;

  // Build a simple timeline from available data
  const timeline = useMemo(() => {
    const events: Array<{ label: string; date: string; icon: React.ElementType; color: string }> = [];
    events.push({ label: 'Solicitud creada', date: request.created_at, icon: Send, color: 'text-blue-500' });

    if (request.status !== 'submitted' && request.updated_at !== request.created_at) {
      events.push({
        label: `Estado actualizado: ${st.label}`,
        date: request.updated_at,
        icon: st.icon,
        color: st.color,
      });
    }

    if (request.resolved_at) {
      events.push({
        label: request.status === 'rejected' ? 'Rechazada' : 'Resuelta',
        date: request.resolved_at,
        icon: request.status === 'rejected' ? XCircle : CheckCircle2,
        color: request.status === 'rejected' ? 'text-rose-500' : 'text-emerald-500',
      });
    }

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [request, st]);

  return (
    <div className="space-y-5 pt-4">
      <SheetHeader className="pb-0">
        <div className="flex items-start justify-between gap-2">
          <SheetTitle className="text-base">{request.subject}</SheetTitle>
          <Badge variant={st.variant} className="shrink-0">{st.label}</Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{typeLabel}</span>
          {request.reference_number && (
            <>
              <span>·</span>
              <span className="font-mono">{request.reference_number}</span>
            </>
          )}
        </div>
      </SheetHeader>

      {/* Description */}
      {request.description && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Descripción</p>
          <p className="text-sm whitespace-pre-wrap">{request.description}</p>
        </div>
      )}

      {/* Resolution */}
      {request.resolution && (
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Resolución</p>
            <p className="text-sm whitespace-pre-wrap">{request.resolution}</p>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <div>
        <p className="text-xs font-semibold mb-3">Historial</p>
        <div className="space-y-3 relative">
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
          {timeline.map((ev, i) => {
            const Icon = ev.icon;
            return (
              <div key={i} className="flex items-start gap-3 relative">
                <div className="h-6 w-6 rounded-full bg-background border flex items-center justify-center shrink-0 z-10">
                  <Icon className={`h-3 w-3 ${ev.color}`} />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-xs font-medium">{ev.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(ev.date), "dd MMM yyyy, HH:mm", { locale: es })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Attachments */}
      {request.attachments && Array.isArray(request.attachments) && request.attachments.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-2">Adjuntos</p>
          <div className="space-y-1">
            {request.attachments.map((att: any, i: number) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded border text-xs">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{att.name || att.file_name || `Archivo ${i + 1}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Actions */}
      <Button variant="outline" size="sm" className="gap-2 w-full justify-start" onClick={onNavigateDocuments}>
        <FolderOpen className="h-4 w-4" />
        Ver documentos relacionados
      </Button>
    </div>
  );
}

// ─── New request dialog ─────────────────────────────────────────────────

function NewRequestDialog({ open, onClose, employee, onCreated }: {
  open: boolean; onClose: () => void; employee: EmployeeProfile; onCreated: () => void;
}) {
  const [type, setType] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!type || !subject.trim()) {
      toast.error('Indica el tipo y asunto de la solicitud');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('hr_admin_requests')
        .insert({
          employee_id: employee.id,
          company_id: employee.company_id,
          request_type: type,
          subject: subject.trim(),
          description: description.trim() || null,
          status: 'submitted',
          priority: 'normal',
        });

      if (error) throw error;

      toast.success('Solicitud enviada correctamente');
      setType('');
      setSubject('');
      setDescription('');
      onCreated();
    } catch (err) {
      console.error('[NewRequestDialog] error:', err);
      toast.error('Error al enviar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva solicitud</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de solicitud</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue placeholder="Selecciona tipo..." /></SelectTrigger>
              <SelectContent>
                {REQUEST_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.icon} {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Asunto</Label>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Describe brevemente tu solicitud"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Descripción (opcional)</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalla tu solicitud..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
