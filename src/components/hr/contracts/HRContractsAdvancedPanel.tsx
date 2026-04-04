/**
 * HRContractsAdvancedPanel — Panel avanzado de contratos
 * Bounded context HR — no toca HRContractsPanel del ERP legacy
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText, RefreshCw, CheckCircle, Clock, AlertTriangle, Ban,
  ArrowRightLeft, ShieldCheck, CalendarClock,
} from 'lucide-react';
import { useHRContracts, type HRContractAdvanced } from '@/hooks/hr/useHRContracts';
import { canExtendContract, SS_BONUS_CATALOG } from '@/lib/hr/contractEngine';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  draft: { label: 'Borrador', color: 'bg-muted text-muted-foreground', icon: Clock },
  active: { label: 'Activo', color: 'bg-primary/10 text-primary', icon: CheckCircle },
  extended: { label: 'Prorrogado', color: 'bg-amber-500/10 text-amber-600', icon: CalendarClock },
  suspended: { label: 'Suspendido', color: 'bg-orange-500/10 text-orange-600', icon: AlertTriangle },
  terminated: { label: 'Finalizado', color: 'bg-muted text-muted-foreground', icon: Ban },
};

function ContractRow({ c }: { c: HRContractAdvanced }) {
  const status = c.status || (c.is_active ? 'active' : 'terminated');
  const cfg = statusConfig[status] || statusConfig.active;
  const Icon = cfg.icon;
  const extCheck = canExtendContract(c.contract_type, c.extension_count ?? 0, c.start_date, c.end_date ?? null);
  const bonus = c.ss_bonus_code ? SS_BONUS_CATALOG.find(b => b.code === c.ss_bonus_code) : null;

  return (
    <div className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="text-sm font-medium">
            {c.contract_code || c.contract_type}
          </span>
          {c.ta2_movement_code && (
            <Badge variant="outline" className="text-[9px]">
              TA.2: {c.ta2_movement_code}
            </Badge>
          )}
        </div>
        <Badge className={cn('text-[10px]', cfg.color)}>{cfg.label}</Badge>
      </div>

      <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
        <div>
          <span className="block text-[10px] uppercase">Inicio</span>
          <span className="font-medium text-foreground">{c.start_date}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase">Fin</span>
          <span className="font-medium text-foreground">{c.end_date ?? '—'}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase">Salario base</span>
          <span className="font-medium text-foreground">
            {c.base_salary?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) ?? '—'}
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase">Jornada</span>
          <span className="font-medium text-foreground">
            {c.part_time_coefficient
              ? `${(c.part_time_coefficient * 100).toFixed(1)}%`
              : c.workday_type ?? 'Completa'}
          </span>
        </div>
      </div>

      {/* Advanced info */}
      <div className="flex flex-wrap gap-1.5">
        {(c.extension_count ?? 0) > 0 && (
          <Badge variant="secondary" className="text-[9px]">
            <CalendarClock className="h-3 w-3 mr-1" />
            {c.extension_count} prórroga(s)
          </Badge>
        )}
        {bonus && (
          <Badge variant="secondary" className="text-[9px]">
            <ShieldCheck className="h-3 w-3 mr-1" />
            {bonus.label} ({bonus.percentage}%)
          </Badge>
        )}
        {c.conversion_from_contract_id && (
          <Badge variant="secondary" className="text-[9px]">
            <ArrowRightLeft className="h-3 w-3 mr-1" />
            Conversión
          </Badge>
        )}
        {c.maternity_reserve_until && (
          <Badge variant="secondary" className="text-[9px]">
            Reserva hasta {c.maternity_reserve_until}
          </Badge>
        )}
        {extCheck.allowed && status === 'active' && (
          <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
            Prorrogable
          </Badge>
        )}
      </div>
    </div>
  );
}

export function HRContractsAdvancedPanel() {
  const [tab, setTab] = useState('all');
  const { contracts, isLoading, refetch } = useHRContracts();

  const active = contracts.filter(c => c.is_active || c.status === 'active');
  const withBonus = contracts.filter(c => c.ss_bonus_code);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            Contratos Avanzados
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div className="p-2 rounded bg-primary/5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Activos</p>
            <p className="text-lg font-bold">{active.length}</p>
          </div>
          <div className="p-2 rounded bg-amber-500/5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Con bonificación</p>
            <p className="text-lg font-bold">{withBonus.length}</p>
          </div>
          <div className="p-2 rounded bg-muted text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Total</p>
            <p className="text-lg font-bold">{contracts.length}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3 mb-3">
            <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
            <TabsTrigger value="active" className="text-xs">Activos</TabsTrigger>
            <TabsTrigger value="bonus" className="text-xs">Bonificados</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <ContractsList contracts={contracts} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="active" className="mt-0">
            <ContractsList contracts={active} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="bonus" className="mt-0">
            <ContractsList contracts={withBonus} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ContractsList({ contracts, isLoading }: { contracts: HRContractAdvanced[]; isLoading: boolean }) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Cargando contratos...</div>;
  }
  if (contracts.length === 0) {
    return <div className="text-center py-8 text-muted-foreground text-sm">No hay contratos</div>;
  }
  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2">
        {contracts.map(c => <ContractRow key={c.id} c={c} />)}
      </div>
    </ScrollArea>
  );
}

export default HRContractsAdvancedPanel;
