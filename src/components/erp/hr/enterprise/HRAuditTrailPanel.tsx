/**
 * HRAuditTrailPanel - Visor de audit log con filtros
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Filter, AlertTriangle, CheckCircle, Search, RefreshCw } from 'lucide-react';
import { useHREnterprise } from '@/hooks/admin/hr/useHREnterprise';

interface Props { companyId: string; }

const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-blue-500/10 text-blue-700 border-blue-200',
  warning: 'bg-amber-500/10 text-amber-700 border-amber-200',
  critical: 'bg-red-500/10 text-red-700 border-red-200',
};

const ACTION_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  INSERT: 'default',
  UPDATE: 'secondary',
  DELETE: 'destructive',
  APPROVE: 'default',
  REJECT: 'destructive',
  EXPORT: 'outline',
  SEED: 'outline',
  RESOLVE: 'default',
};

export function HRAuditTrailPanel({ companyId }: Props) {
  const { auditLog, fetchAuditLog, criticalEvents, fetchCriticalEvents, resolveCriticalEvent, loading } = useHREnterprise();
  const [filters, setFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAuditLog(companyId, filters);
    fetchCriticalEvents(companyId);
  }, [companyId]);

  const handleFilter = () => fetchAuditLog(companyId, filters);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5" /> Auditoría y Trazabilidad</h3>
          <p className="text-sm text-muted-foreground">Registro inmutable de todas las acciones sensibles de RRHH</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchAuditLog(companyId, filters); fetchCriticalEvents(companyId); }} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </Button>
      </div>

      <Tabs defaultValue="audit">
        <TabsList>
          <TabsTrigger value="audit">Log de Auditoría ({auditLog.length})</TabsTrigger>
          <TabsTrigger value="critical">
            Eventos Críticos
            {criticalEvents.filter(e => !e.resolved_at).length > 0 && (
              <Badge variant="destructive" className="ml-2">{criticalEvents.filter(e => !e.resolved_at).length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit">
          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="py-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filters.category || ''} onValueChange={(v) => setFilters(f => ({ ...f, category: v === 'all' ? '' : v }))}>
                  <SelectTrigger className="w-[150px] h-8"><SelectValue placeholder="Categoría" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="employees">Empleados</SelectItem>
                    <SelectItem value="payroll">Nóminas</SelectItem>
                    <SelectItem value="contracts">Contratos</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="security">Seguridad</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.severity || ''} onValueChange={(v) => setFilters(f => ({ ...f, severity: v === 'all' ? '' : v }))}>
                  <SelectTrigger className="w-[130px] h-8"><SelectValue placeholder="Severidad" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.action || ''} onValueChange={(v) => setFilters(f => ({ ...f, action: v === 'all' ? '' : v }))}>
                  <SelectTrigger className="w-[120px] h-8"><SelectValue placeholder="Acción" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="INSERT">INSERT</SelectItem>
                    <SelectItem value="UPDATE">UPDATE</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                    <SelectItem value="APPROVE">APPROVE</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="secondary" onClick={handleFilter}><Search className="h-4 w-4 mr-1" /> Filtrar</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Tabla</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Severidad</TableHead>
                      <TableHead>Campos cambiados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLog.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs font-mono">{new Date(entry.created_at).toLocaleString('es-ES')}</TableCell>
                        <TableCell><Badge variant={ACTION_COLORS[entry.action] || 'outline'}>{entry.action}</Badge></TableCell>
                        <TableCell><code className="text-xs">{entry.table_name}</code></TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{entry.category}</Badge></TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded border ${SEVERITY_COLORS[entry.severity] || ''}`}>
                            {entry.severity}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {entry.changed_fields?.join(', ') || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {auditLog.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sin registros de auditoría</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="critical">
          <div className="space-y-3">
            {criticalEvents.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                  <p>No hay eventos críticos pendientes</p>
                </CardContent>
              </Card>
            ) : (
              criticalEvents.map((event) => (
                <Card key={event.id} className={event.resolved_at ? '' : 'border-destructive/30'}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {event.resolved_at ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{event.title}</span>
                            <Badge variant={event.severity === 'critical' ? 'destructive' : 'secondary'}>{event.severity}</Badge>
                            <Badge variant="outline">{event.event_type}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{event.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString('es-ES')}</span>
                        {!event.resolved_at && (
                          <Button size="sm" variant="outline" onClick={() => resolveCriticalEvent(event.id, 'Revisado y resuelto', companyId)}>
                            Resolver
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
