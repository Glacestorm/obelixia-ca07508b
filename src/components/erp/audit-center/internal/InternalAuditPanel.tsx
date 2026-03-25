/**
 * InternalAuditPanel — Timeline unificado de auditoría interna
 * Agrega erp_audit_events, erp_hr_audit_log, ai_audit_logs, compliance_audit_log
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Search, Download, Filter, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useUnifiedAudit } from '@/hooks/erp/audit';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function InternalAuditPanel() {
  const { events, isLoading, fetchUnifiedEvents } = useUnifiedAudit();
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  useEffect(() => { fetchUnifiedEvents(); }, []);

  const filteredEvents = events.filter(e => {
    if (searchTerm && !e.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (severityFilter !== 'all' && e.severity !== severityFilter) return false;
    if (sourceFilter !== 'all' && e.source !== sourceFilter) return false;
    return true;
  });

  const handleExport = useCallback(() => {
    const csv = [
      'ID,Fecha,Fuente,Módulo,Severidad,Descripción',
      ...filteredEvents.map(e => `${e.id},${e.created_at},${e.source},${e.module},${e.severity},"${e.description}"`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `auditoria_interna_${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [filteredEvents]);

  const severityIcon = (sev: string) => {
    switch (sev) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar eventos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[140px]"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Severidad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
                <SelectItem value="warning">Advertencia</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Fuente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="erp">ERP</SelectItem>
                <SelectItem value="hr">RRHH</SelectItem>
                <SelectItem value="ai">IA</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
                <SelectItem value="alerts">Alertas</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => fetchUnifiedEvents()} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} /> Actualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" /> Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Críticos', count: filteredEvents.filter(e => e.severity === 'critical').length, color: 'bg-destructive/10 text-destructive border-destructive/20' },
          { label: 'Advertencias', count: filteredEvents.filter(e => e.severity === 'warning').length, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
          { label: 'Informativos', count: filteredEvents.filter(e => e.severity === 'info').length, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
        ].map(s => (
          <Card key={s.label} className={cn("border", s.color)}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Timeline Unificado ({filteredEvents.length} eventos)</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-10 w-10 mx-auto text-emerald-500/50 mb-2" />
                <p className="text-sm text-muted-foreground">No hay eventos que coincidan con los filtros</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                {filteredEvents.map((event, i) => (
                  <div key={event.id} className="relative pl-10 pb-4">
                    <div className={cn(
                      "absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 bg-background z-10",
                      event.severity === 'critical' ? 'border-destructive' :
                      event.severity === 'warning' ? 'border-amber-500' : 'border-blue-500'
                    )} />
                    <div className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {severityIcon(event.severity)}
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{event.description}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {event.module} · {event.source} · {event.event_type}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <Badge variant={event.severity === 'critical' ? 'destructive' : 'outline'} className="text-[10px] h-5">
                            {event.severity}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(event.created_at), { locale: es, addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
