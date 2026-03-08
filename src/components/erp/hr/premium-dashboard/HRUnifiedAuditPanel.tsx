/**
 * HRUnifiedAuditPanel — Consolidated audit trail across all HR modules
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Search, RefreshCw, Filter, Clock, User, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditEntry {
  id: string;
  source: string;
  action: string;
  user_id?: string;
  details?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

interface HRUnifiedAuditPanelProps {
  companyId: string;
}

const SOURCE_LABELS: Record<string, string> = {
  data_access: 'Acceso a Datos',
  api_access: 'API / Webhooks',
  integration: 'Integraciones',
  board_pack: 'Board Pack',
  orchestration: 'Orquestación',
  fairness: 'Fairness',
  legal: 'Legal Engine',
  cnae: 'CNAE Intelligence',
};

const SOURCE_COLORS: Record<string, string> = {
  data_access: 'bg-blue-500/10 text-blue-700',
  api_access: 'bg-purple-500/10 text-purple-700',
  integration: 'bg-green-500/10 text-green-700',
  board_pack: 'bg-amber-500/10 text-amber-700',
  orchestration: 'bg-cyan-500/10 text-cyan-700',
  fairness: 'bg-pink-500/10 text-pink-700',
  legal: 'bg-indigo-500/10 text-indigo-700',
  cnae: 'bg-orange-500/10 text-orange-700',
};

export function HRUnifiedAuditPanel({ companyId }: HRUnifiedAuditPanelProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const fetchAuditData = useCallback(async () => {
    setLoading(true);
    try {
      const queries = [
        supabase.from('erp_hr_data_access_log').select('id, action, user_id, details, created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(50),
        supabase.from('erp_hr_api_access_log').select('id, action, user_id, response_status, created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(50),
        supabase.from('erp_hr_board_pack_reviews').select('id, action, reviewer_name, comments, created_at').limit(50),
      ];

      const results = await Promise.allSettled(queries);
      const allEntries: AuditEntry[] = [];

      // Data access logs
      if (results[0].status === 'fulfilled') {
        const data = (results[0] as PromiseFulfilledResult<any>).value.data || [];
        data.forEach((r: any) => allEntries.push({ ...r, source: 'data_access', details: r.details || r.action }));
      }

      // API access logs
      if (results[1].status === 'fulfilled') {
        const data = (results[1] as PromiseFulfilledResult<any>).value.data || [];
        data.forEach((r: any) => allEntries.push({ ...r, source: 'api_access', details: `${r.action} → ${r.response_status}` }));
      }

      // Board pack reviews
      if (results[2].status === 'fulfilled') {
        const data = (results[2] as PromiseFulfilledResult<any>).value.data || [];
        data.forEach((r: any) => allEntries.push({ ...r, source: 'board_pack', details: `${r.action}: ${r.comments || ''}`, user_id: r.reviewer_name }));
      }

      allEntries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setEntries(allEntries.slice(0, 200));
    } catch (error) {
      console.error('[HRUnifiedAuditPanel] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchAuditData(); }, [fetchAuditData]);

  const filteredEntries = entries.filter(e => {
    if (sourceFilter !== 'all' && e.source !== sourceFilter) return false;
    if (searchTerm && !(e.details || '').toLowerCase().includes(searchTerm.toLowerCase()) && !(e.action || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Audit Trail Unificado RRHH</CardTitle>
            <Badge variant="secondary">{filteredEntries.length} registros</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchAuditData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="flex gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en audit trail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[180px] h-9">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las fuentes</SelectItem>
              {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[500px]">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Sin registros de auditoría</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredEntries.map((entry) => (
                <div key={`${entry.source}-${entry.id}`} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                  <div className="mt-0.5">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${SOURCE_COLORS[entry.source] || ''}`}>
                      {SOURCE_LABELS[entry.source] || entry.source}
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.action}</p>
                    {entry.details && <p className="text-xs text-muted-foreground truncate">{entry.details}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    {entry.user_id && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                        <User className="h-3 w-3" />
                        <span className="truncate max-w-[80px]">{entry.user_id.slice(0, 8)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(entry.created_at), { locale: es, addSuffix: true })}
                    </div>
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

export default HRUnifiedAuditPanel;
