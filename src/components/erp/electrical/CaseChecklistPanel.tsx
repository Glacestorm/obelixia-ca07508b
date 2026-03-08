import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, ListChecks } from 'lucide-react';
import { useEnergyChecklist } from '@/hooks/erp/useEnergyChecklist';
import { PermissionGate } from './PermissionGate';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props { caseId: string; }

export function CaseChecklistPanel({ caseId }: Props) {
  const { items, loading, progress, initializeChecklist, toggleItem } = useEnergyChecklist(caseId);

  useEffect(() => {
    if (!loading && items.length === 0) {
      initializeChecklist();
    }
  }, [loading, items.length, initializeChecklist]);

  const checkedCount = items.filter(i => i.checked).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" /> Checklist operativo
            </CardTitle>
            <CardDescription>{checkedCount} de {items.length} completados</CardDescription>
          </div>
          <Badge variant={progress === 100 ? 'default' : 'secondary'}>{progress}%</Badge>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Cargando checklist...</p>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <PermissionGate key={item.id} action="edit_cases" fallback={
                <div className="flex items-center gap-3 p-2.5 rounded-lg border opacity-70">
                  <CheckSquare className={cn("h-4 w-4", item.checked ? "text-emerald-500" : "text-muted-foreground")} />
                  <span className={cn("text-sm", item.checked && "line-through text-muted-foreground")}>{item.label}</span>
                </div>
              }>
                <label className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer group">
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={(checked) => toggleItem(item.id, !!checked)}
                  />
                  <div className="flex-1">
                    <span className={cn("text-sm", item.checked && "line-through text-muted-foreground")}>{item.label}</span>
                    {item.checked && item.checked_at && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Completado {format(new Date(item.checked_at), "dd MMM yyyy HH:mm", { locale: es })}
                      </p>
                    )}
                  </div>
                </label>
              </PermissionGate>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CaseChecklistPanel;
