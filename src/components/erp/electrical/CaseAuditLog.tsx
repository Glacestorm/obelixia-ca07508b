import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History } from 'lucide-react';
import { useEnergyAuditLog, AUDIT_ACTIONS } from '@/hooks/erp/useEnergyAuditLog';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId: string;
  caseId?: string | null;
}

export function CaseAuditLog({ companyId, caseId }: Props) {
  const { entries, loading } = useEnergyAuditLog(companyId, caseId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-primary" /> Registro de auditoría
        </CardTitle>
        <CardDescription>{entries.length} acciones registradas</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin actividad registrada.</p>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {entries.map(entry => {
                const actionInfo = AUDIT_ACTIONS[entry.action] || { label: entry.action, icon: '📌' };
                return (
                  <div key={entry.id} className="flex items-start gap-3 p-2.5 rounded-lg border hover:bg-muted/30 transition-colors">
                    <span className="text-lg shrink-0">{actionInfo.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{actionInfo.label}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{entry.entity_type}</Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(entry.performed_at), 'dd MMM yyyy HH:mm', { locale: es })}
                          {' · '}
                          {formatDistanceToNow(new Date(entry.performed_at), { locale: es, addSuffix: true })}
                        </span>
                      </div>
                      {entry.details && Object.keys(entry.details).length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-1 truncate">
                          {JSON.stringify(entry.details).substring(0, 120)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export default CaseAuditLog;
