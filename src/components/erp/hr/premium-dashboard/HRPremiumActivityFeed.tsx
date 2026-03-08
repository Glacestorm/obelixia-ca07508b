/**
 * HRPremiumActivityFeed — P9.9
 * Unified activity timeline for all 8 Premium HR modules.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  RefreshCw, Clock, Shield, Brain, Users, Scale,
  Layers, FileText, BarChart3, UserCog, Inbox
} from 'lucide-react';
import { useHRPremiumActivityFeed, type ActivityModule } from '@/hooks/admin/hr/useHRPremiumActivityFeed';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useMemo } from 'react';

interface Props {
  companyId?: string;
  className?: string;
}

const MODULE_ICONS: Record<ActivityModule, React.ReactNode> = {
  security: <Shield className="h-3.5 w-3.5" />,
  ai_governance: <Brain className="h-3.5 w-3.5" />,
  workforce: <Users className="h-3.5 w-3.5" />,
  fairness: <Scale className="h-3.5 w-3.5" />,
  twin: <Layers className="h-3.5 w-3.5" />,
  legal: <FileText className="h-3.5 w-3.5" />,
  cnae: <BarChart3 className="h-3.5 w-3.5" />,
  role_experience: <UserCog className="h-3.5 w-3.5" />,
};

const MODULE_COLORS: Record<ActivityModule, string> = {
  security: 'bg-destructive/10 text-destructive border-destructive/20',
  ai_governance: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  workforce: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  fairness: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  twin: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
  legal: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  cnae: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  role_experience: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20',
};

export function HRPremiumActivityFeed({ companyId, className }: Props) {
  const { entries, isLoading, lastFetch, fetchFeed, moduleLabels } = useHRPremiumActivityFeed(companyId);
  const [filterModule, setFilterModule] = useState<ActivityModule | 'all'>('all');

  const filteredEntries = useMemo(() => {
    if (filterModule === 'all') return entries;
    return entries.filter(e => e.module === filterModule);
  }, [entries, filterModule]);

  const activeModules = useMemo(() => {
    const set = new Set(entries.map(e => e.module));
    return Array.from(set) as ActivityModule[];
  }, [entries]);

  if (!companyId) {
    return (
      <Card className={cn("border-dashed opacity-60", className)}>
        <CardContent className="py-12 text-center">
          <Inbox className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Selecciona una empresa para ver la actividad</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Activity Feed Premium
          </h2>
          <p className="text-sm text-muted-foreground">
            {lastFetch
              ? `Actualizado ${formatDistanceToNow(lastFetch, { locale: es, addSuffix: true })}`
              : 'Cargando...'}
            {' · '}{entries.length} eventos recientes
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchFeed} disabled={isLoading} className="gap-2">
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Module Filters */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={filterModule === 'all' ? 'default' : 'outline'}
          className="cursor-pointer text-xs"
          onClick={() => setFilterModule('all')}
        >
          Todos ({entries.length})
        </Badge>
        {activeModules.map(mod => (
          <Badge
            key={mod}
            variant={filterModule === mod ? 'default' : 'outline'}
            className={cn("cursor-pointer text-xs gap-1", filterModule !== mod && MODULE_COLORS[mod])}
            onClick={() => setFilterModule(mod)}
          >
            {MODULE_ICONS[mod]}
            {moduleLabels[mod]} ({entries.filter(e => e.module === mod).length})
          </Badge>
        ))}
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[450px]">
            {filteredEntries.length === 0 ? (
              <div className="py-12 text-center">
                <Inbox className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Sin actividad reciente en los módulos Premium</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

                <div className="space-y-1">
                  {filteredEntries.map((entry) => (
                    <div key={entry.id} className="relative flex items-start gap-3 pl-10 py-2 group">
                      {/* Dot */}
                      <div className={cn(
                        "absolute left-[11px] top-3 h-2.5 w-2.5 rounded-full border-2 border-background",
                        MODULE_COLORS[entry.module].includes('destructive') ? 'bg-destructive' :
                        MODULE_COLORS[entry.module].includes('violet') ? 'bg-violet-500' :
                        MODULE_COLORS[entry.module].includes('blue') ? 'bg-blue-500' :
                        MODULE_COLORS[entry.module].includes('emerald') ? 'bg-emerald-500' :
                        MODULE_COLORS[entry.module].includes('cyan') ? 'bg-cyan-500' :
                        MODULE_COLORS[entry.module].includes('amber') ? 'bg-amber-500' :
                        MODULE_COLORS[entry.module].includes('orange') ? 'bg-orange-500' :
                        'bg-pink-500'
                      )} />

                      <div className="flex-1 min-w-0 rounded-lg p-2.5 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={cn("text-[10px] gap-1 px-1.5", MODULE_COLORS[entry.module])}>
                            {MODULE_ICONS[entry.module]}
                            {entry.action}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(entry.timestamp), { locale: es, addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/80 mt-1 truncate">
                          {entry.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default HRPremiumActivityFeed;
