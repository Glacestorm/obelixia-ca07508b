/**
 * HRAdminRequestsList — Table with filters
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Search, Filter } from 'lucide-react';
import { HRStatusBadge } from '../shared/HRStatusBadge';
import { getRequestTypeLabel, type AdminRequest, type AdminPortalFilters } from '@/hooks/admin/hr/useAdminPortal';

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-blue-500/10 text-blue-700',
  high: 'bg-amber-500/10 text-amber-700',
  urgent: 'bg-red-500/10 text-red-700',
};

interface Props {
  requests: AdminRequest[];
  loading: boolean;
  onSelect: (request: AdminRequest) => void;
  onFiltersChange: (filters: AdminPortalFilters) => void;
}

export function HRAdminRequestsList({ requests, loading, onSelect, onFiltersChange }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const handleFilterChange = (key: string, value: string) => {
    const newFilters: AdminPortalFilters = {};
    const newSearch = key === 'search' ? value : search;
    const newStatus = key === 'status' ? value : statusFilter;
    const newType = key === 'type' ? value : typeFilter;

    if (key === 'search') setSearch(value);
    if (key === 'status') setStatusFilter(value);
    if (key === 'type') setTypeFilter(value);

    if (newSearch) newFilters.search = newSearch;
    if (newStatus !== 'all') newFilters.status = newStatus;
    if (newType !== 'all') newFilters.request_type = newType;

    onFiltersChange(newFilters);
  };

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por referencia o asunto..."
            className="pl-9"
            value={search}
            onChange={e => handleFilterChange('search', e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={v => handleFilterChange('status', v)}>
          <SelectTrigger className="w-[160px]"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="submitted">Enviada</SelectItem>
            <SelectItem value="reviewing">En revisión</SelectItem>
            <SelectItem value="pending_approval">Pend. aprobación</SelectItem>
            <SelectItem value="approved">Aprobada</SelectItem>
            <SelectItem value="in_progress">En gestión</SelectItem>
            <SelectItem value="completed">Completada</SelectItem>
            <SelectItem value="rejected">Rechazada</SelectItem>
            <SelectItem value="returned">Devuelta</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={v => handleFilterChange('type', v)}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="employee_registration">Alta empleado</SelectItem>
            <SelectItem value="contract_modification">Mod. contractual</SelectItem>
            <SelectItem value="salary_change">Cambio salarial</SelectItem>
            <SelectItem value="vacation">Vacaciones</SelectItem>
            <SelectItem value="sick_leave">IT / Baja</SelectItem>
            <SelectItem value="termination">Baja trabajador</SelectItem>
            <SelectItem value="settlement">Finiquito</SelectItem>
            <SelectItem value="company_certificate">Certificado</SelectItem>
            <SelectItem value="document_submission">Documentación</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Cargando solicitudes...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay solicitudes</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {requests.map(req => (
            <Card
              key={req.id}
              className="hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => onSelect(req)}
            >
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Briefcase className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{req.reference_number || '—'}</span>
                      <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[req.priority] || ''}`}>
                        {req.priority}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium truncate">{req.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {getRequestTypeLabel(req.request_type)} · {new Date(req.created_at).toLocaleDateString('es')}
                    </p>
                  </div>
                </div>
                <HRStatusBadge entity="request" status={req.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
