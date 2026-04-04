/**
 * HRMultiEmploymentPanel — Panel principal de pluriempleo/pluriactividad
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building2, RefreshCw, CheckCircle, Clock, Ban,
} from 'lucide-react';
import { useHRMultiEmployment, type HRMultiEmployment } from '@/hooks/hr/useHRMultiEmployment';
import { cn } from '@/lib/utils';

const statusCfg: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  active: { label: 'Activo', color: 'bg-primary/10 text-primary', icon: CheckCircle },
  suspended: { label: 'Suspendido', color: 'bg-amber-500/10 text-amber-600', icon: Clock },
  terminated: { label: 'Finalizado', color: 'bg-muted text-muted-foreground', icon: Ban },
};

function RecordRow({ r }: { r: HRMultiEmployment }) {
  const cfg = statusCfg[r.status] || statusCfg.active;
  const Icon = cfg.icon;

  return (
    <div className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="text-sm font-medium capitalize">{r.multi_type}</span>
          {r.authorization_number && (
            <Badge variant="outline" className="text-[9px]">
              Auth: {r.authorization_number}
            </Badge>
          )}
        </div>
        <Badge className={cn('text-[10px]', cfg.color)}>{cfg.label}</Badge>
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
        <div>
          <span className="block text-[10px] uppercase">Otro empleador</span>
          <span className="font-medium text-foreground">{r.other_employer_name ?? '—'}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase">CCC</span>
          <span className="font-medium text-foreground">{r.other_employer_ccc ?? '—'}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase">Horas propias</span>
          <span className="font-medium text-foreground">{r.own_weekly_hours ?? '—'}h/sem</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase">Horas otro</span>
          <span className="font-medium text-foreground">{r.other_weekly_hours ?? '—'}h/sem</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {r.base_distribution_own && (
          <Badge variant="secondary" className="text-[9px]">
            Distribución: {(r.base_distribution_own * 100).toFixed(1)}%
          </Badge>
        )}
        {r.solidarity_amount && r.solidarity_amount > 0 && (
          <Badge variant="secondary" className="text-[9px]">
            Solidaridad: {r.solidarity_amount.toFixed(2)} €
          </Badge>
        )}
        {r.reimbursement_right && (
          <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-600">
            Derecho reintegro
          </Badge>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Vigencia: {r.effective_from} → {r.effective_to ?? 'Indefinida'}
      </p>
    </div>
  );
}

export function HRMultiEmploymentPanel() {
  const [tab, setTab] = useState('records');
  const { records, isLoading, refetch } = useHRMultiEmployment();

  const active = records.filter(r => r.status === 'active');

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            Pluriempleo / Pluriactividad
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="p-2 rounded bg-primary/5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Activos</p>
            <p className="text-lg font-bold">{active.length}</p>
          </div>
          <div className="p-2 rounded bg-muted text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Total</p>
            <p className="text-lg font-bold">{records.length}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ScrollArea className="h-[400px]">
          {records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No hay registros de pluriempleo
            </div>
          ) : (
            <div className="space-y-2">
              {records.map(r => <RecordRow key={r.id} r={r} />)}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default HRMultiEmploymentPanel;
