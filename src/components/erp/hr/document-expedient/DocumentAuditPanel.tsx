/**
 * DocumentAuditPanel — Log global de accesos y auditoría documental
 */
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Download, Printer, Share2, FileOutput, RefreshCw } from 'lucide-react';
import { useHRDocumentExpedient, type DocumentAccessLog } from '@/hooks/erp/hr/useHRDocumentExpedient';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId: string;
}

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Eye; color: string }> = {
  view: { label: 'Visualización', icon: Eye, color: 'text-blue-600' },
  download: { label: 'Descarga', icon: Download, color: 'text-emerald-600' },
  print: { label: 'Impresión', icon: Printer, color: 'text-amber-600' },
  share: { label: 'Compartido', icon: Share2, color: 'text-purple-600' },
  export: { label: 'Exportación', icon: FileOutput, color: 'text-indigo-600' },
};

export function DocumentAuditPanel({ companyId }: Props) {
  const { fetchAccessLog } = useHRDocumentExpedient(companyId);
  const [logs, setLogs] = useState<DocumentAccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAccessLog();
      setLogs(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadLogs(); }, []);

  const filtered = filterAction === 'all' ? logs : logs.filter(l => l.action === filterAction);

  // Summary stats
  const actionCounts: Record<string, number> = {};
  for (const l of logs) {
    actionCounts[l.action] = (actionCounts[l.action] ?? 0) + 1;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-500" />
            Auditoría Documental
          </h3>
          <p className="text-sm text-muted-foreground">Registro de todos los accesos a documentos del expediente</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={loadLogs}>
          <RefreshCw className="h-4 w-4" /> Actualizar
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(ACTION_CONFIG).map(([action, config]) => {
          const Icon = config.icon;
          return (
            <Card key={action} className="cursor-pointer hover:bg-muted/30" onClick={() => setFilterAction(action === filterAction ? 'all' : action)}>
              <CardContent className="p-3 text-center">
                <Icon className={`h-5 w-5 mx-auto mb-1 ${config.color}`} />
                <p className="text-xl font-bold">{actionCounts[action] ?? 0}</p>
                <p className="text-xs text-muted-foreground">{config.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filtrar por acción" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            {Object.entries(ACTION_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="flex items-center">{filtered.length} registros</Badge>
      </div>

      {/* Log list */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Cargando registros...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center">
          <Eye className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No hay registros de acceso</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.slice(0, 100).map(l => {
            const config = ACTION_CONFIG[l.action] ?? ACTION_CONFIG.view;
            const Icon = config.icon;
            return (
              <Card key={l.id}>
                <CardContent className="py-2.5 flex items-center gap-3">
                  <div className={`p-1.5 rounded ${config.color} bg-muted`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{config.label}</span>
                      <span className="text-muted-foreground"> · Documento: </span>
                      <code className="text-xs bg-muted px-1 rounded">{l.document_id.slice(0, 8)}</code>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(l.created_at), { locale: es, addSuffix: true })}
                      {l.user_agent && ` · ${l.user_agent.slice(0, 40)}...`}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{l.document_table.replace('erp_hr_', '')}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
