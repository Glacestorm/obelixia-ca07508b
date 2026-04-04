/**
 * HRGarnishmentPanel — Gestión de embargos judiciales
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Gavel, Plus, RefreshCw, AlertTriangle, CheckCircle, Clock, Ban,
} from 'lucide-react';
import { useHRGarnishments, type HRGarnishment } from '@/hooks/hr/useHRGarnishments';
import { GarnishmentSimulator } from './GarnishmentSimulator';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  active: { label: 'Activo', color: 'bg-destructive/10 text-destructive', icon: AlertTriangle },
  suspended: { label: 'Suspendido', color: 'bg-amber-500/10 text-amber-600', icon: Clock },
  completed: { label: 'Liquidado', color: 'bg-primary/10 text-primary', icon: CheckCircle },
  cancelled: { label: 'Anulado', color: 'bg-muted text-muted-foreground', icon: Ban },
};

function GarnishmentRow({ g }: { g: HRGarnishment }) {
  const cfg = statusConfig[g.status] || statusConfig.active;
  const Icon = cfg.icon;
  const pct = g.total_amount && g.accumulated_paid
    ? Math.round((g.accumulated_paid / g.total_amount) * 100)
    : 0;

  return (
    <div className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="text-sm font-medium">{g.procedure_number}</span>
          {g.art608_alimentos && (
            <Badge variant="outline" className="text-[9px] border-amber-500 text-amber-600">
              Art. 608
            </Badge>
          )}
        </div>
        <Badge className={cn('text-[10px]', cfg.color)}>{cfg.label}</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <div>
          <span className="block text-[10px] uppercase">Total</span>
          <span className="font-medium text-foreground">
            {g.total_amount?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) ?? '—'}
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase">Pagado</span>
          <span className="font-medium text-foreground">
            {g.accumulated_paid?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) ?? '0 €'}
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase">Prelación</span>
          <span className="font-medium text-foreground">#{g.priority_order}</span>
        </div>
      </div>
      {g.total_amount && g.total_amount > 0 && (
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all"
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      )}
      {g.court_name && (
        <p className="text-[10px] text-muted-foreground">
          {g.court_name} · {g.beneficiary_name ?? 'Beneficiario no especificado'}
        </p>
      )}
    </div>
  );
}

export function HRGarnishmentPanel() {
  const [tab, setTab] = useState('list');
  const { garnishments, isLoading, refetch } = useHRGarnishments();

  const active = garnishments.filter((g) => g.status === 'active');
  const completed = garnishments.filter((g) => g.status === 'completed');

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-destructive/10">
              <Gavel className="h-4 w-4 text-destructive" />
            </div>
            Embargos Judiciales
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div className="p-2 rounded bg-destructive/5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Activos</p>
            <p className="text-lg font-bold">{active.length}</p>
          </div>
          <div className="p-2 rounded bg-primary/5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Liquidados</p>
            <p className="text-lg font-bold">{completed.length}</p>
          </div>
          <div className="p-2 rounded bg-muted text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Total</p>
            <p className="text-lg font-bold">{garnishments.length}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="list" className="text-xs">Registro</TabsTrigger>
            <TabsTrigger value="simulator" className="text-xs">Simulador</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-0">
            <ScrollArea className="h-[400px]">
              {garnishments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No hay embargos registrados
                </div>
              ) : (
                <div className="space-y-2">
                  {garnishments.map((g) => (
                    <GarnishmentRow key={g.id} g={g} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="simulator" className="mt-0">
            <GarnishmentSimulator />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default HRGarnishmentPanel;
