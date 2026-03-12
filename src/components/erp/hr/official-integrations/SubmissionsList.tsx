/**
 * SubmissionsList — Listado de envíos oficiales con filtros
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, RotateCcw, XCircle, RefreshCw, Send } from 'lucide-react';
import { HRStatusBadge } from '../shared/HRStatusBadge';
import type { OfficialSubmission, IntegrationAdapter } from '@/hooks/erp/hr/useOfficialIntegrationsHub';

interface Props {
  submissions: OfficialSubmission[];
  adapters: IntegrationAdapter[];
  isLoading: boolean;
  onView: (id: string) => void;
  onNewSubmission: () => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  onRefresh: () => void;
}

export function SubmissionsList({ submissions, adapters, isLoading, onView, onNewSubmission, onRetry, onCancel, onRefresh }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [adapterFilter, setAdapterFilter] = useState<string>('all');

  const filtered = submissions.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (adapterFilter !== 'all' && s.adapter_id !== adapterFilter) return false;
    return true;
  });

  const getAdapterName = (adapterId: string | null) => {
    if (!adapterId) return '—';
    return adapters.find(a => a.id === adapterId)?.adapter_name || adapterId.slice(0, 8);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="ready">Listo</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="accepted">Aceptado</SelectItem>
              <SelectItem value="rejected">Rechazado</SelectItem>
              <SelectItem value="correction_required">Corrección</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={adapterFilter} onValueChange={setAdapterFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Conector" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {adapters.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.adapter_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <Button size="sm" onClick={onNewSubmission} className="gap-1.5"><Plus className="h-4 w-4" /> Nuevo envío</Button>
      </div>

      <div className="grid gap-2">
        {filtered.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Sin envíos</CardContent></Card>
        ) : filtered.map(sub => (
          <Card key={sub.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onView(sub.id)}>
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Send className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {sub.submission_type}{sub.submission_subtype ? ` — ${sub.submission_subtype}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getAdapterName(sub.adapter_id)} · {sub.external_reference || sub.id.slice(0, 8)} · {new Date(sub.created_at).toLocaleDateString('es-ES')}
                    {sub.attempts > 0 && ` · ${sub.attempts} intento(s)`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {sub.priority === 'urgent' && <Badge variant="destructive" className="text-[10px]">URGENTE</Badge>}
                {sub.priority === 'high' && <Badge variant="secondary" className="text-[10px]">ALTA</Badge>}
                <HRStatusBadge entity="submission" status={sub.status} />
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(sub.id)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  {['rejected', 'correction_required'].includes(sub.status) && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRetry(sub.id)}>
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {!['accepted', 'cancelled'].includes(sub.status) && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onCancel(sub.id)}>
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
