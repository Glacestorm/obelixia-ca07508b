import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Bot, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface InvocationItem {
  id: string;
  agent_code: string;
  outcome_status: string;
  confidence_score: number | null;
  execution_time_ms: number | null;
  input_summary: string | null;
  response_summary: string | null;
  escalated_to: string | null;
  created_at: string;
}

const outcomeColors: Record<string, string> = {
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  error: 'bg-red-500/10 text-red-700 dark:text-red-300',
  escalated: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  pending: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
};

export function AgentActivityFeed() {
  const [feed, setFeed] = useState<InvocationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      const { data } = await supabase
        .from('erp_ai_agent_invocations')
        .select('id, agent_code, outcome_status, confidence_score, execution_time_ms, input_summary, response_summary, escalated_to, created_at')
        .order('created_at', { ascending: false })
        .limit(30);

      setFeed((data || []) as InvocationItem[]);
      setLoading(false);
    };

    fetchRecent();

    // Realtime for new invocations
    const channel = supabase
      .channel('ai-invocations-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'erp_ai_agent_invocations' },
        (payload) => {
          const newItem = payload.new as InvocationItem;
          setFeed(prev => [newItem, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Feed de Actividad
          {feed.length > 0 && (
            <Badge variant="outline" className="ml-auto text-[10px]">
              {feed.length} recientes
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[420px]">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Cargando actividad...</div>
          ) : feed.length === 0 ? (
            <div className="p-6 text-center">
              <Bot className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Sin actividad reciente</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {feed.map((item) => (
                <div key={item.id} className="px-4 py-2.5 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <Bot className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{item.agent_code}</span>
                    <Badge variant="secondary" className={`text-[10px] h-5 ${outcomeColors[item.outcome_status] || ''}`}>
                      {item.outcome_status}
                    </Badge>
                    {item.escalated_to && (
                      <Badge variant="outline" className="text-[10px] h-5 text-yellow-600">
                        → {item.escalated_to}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {item.response_summary || item.input_summary || '—'}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDistanceToNow(new Date(item.created_at), { locale: es, addSuffix: true })}
                    </span>
                    {item.execution_time_ms != null && (
                      <span>{item.execution_time_ms}ms</span>
                    )}
                    {item.confidence_score != null && (
                      <span>{item.confidence_score}%</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default AgentActivityFeed;
