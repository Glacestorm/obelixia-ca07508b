/**
 * AdvisoryDashboardPanel — V2-RRHH-FASE-5
 * Multi-company advisory dashboard for labor consultancy firms.
 * Shows portfolio overview with closing status, tasks, readiness per client.
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  RefreshCw, Building2, Users, ClipboardList, AlertTriangle,
  CheckCircle2, Clock, Lock, ChevronDown, ChevronRight,
  Search, Briefcase, ShieldCheck, CalendarCheck, TrendingUp,
  ExternalLink,
} from 'lucide-react';
import {
  useAdvisoryPortfolio,
  type PortfolioCompany,
  type AdvisoryRole,
} from '@/hooks/erp/hr/useAdvisoryPortfolio';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  onSelectCompany?: (companyId: string) => void;
  className?: string;
}

const ROLE_LABELS: Record<AdvisoryRole, string> = {
  tecnico_laboral: 'Técnico Laboral',
  responsable_cartera: 'Responsable de Cartera',
  supervisor: 'Supervisor',
};

const CLOSING_STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  no_periods: { label: 'Sin períodos', color: 'bg-muted text-muted-foreground', icon: Clock },
  open: { label: 'Abierto', color: 'bg-amber-500/10 text-amber-700', icon: Clock },
  closing: { label: 'En cierre', color: 'bg-blue-500/10 text-blue-700', icon: CalendarCheck },
  closed: { label: 'Cerrado', color: 'bg-emerald-500/10 text-emerald-700', icon: CheckCircle2 },
  locked: { label: 'Bloqueado', color: 'bg-primary/10 text-primary', icon: Lock },
};

type FilterStatus = 'all' | 'open' | 'closing' | 'closed' | 'locked' | 'overdue';

export function AdvisoryDashboardPanel({ onSelectCompany, className }: Props) {
  const { companies, summary, isLoading, advisorRole, hasNoAssignments, refresh } = useAdvisoryPortfolio();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

  // Filter companies
  const filtered = companies.filter(c => {
    const matchesSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.taxId?.toLowerCase().includes(search.toLowerCase()));

    const matchesFilter =
      filterStatus === 'all' ? true :
      filterStatus === 'overdue' ? c.stats.overdueTasks > 0 :
      c.stats.closingStatus === filterStatus;

    return matchesSearch && matchesFilter;
  });

  // Sort: overdue first, then by closing status priority
  const sorted = [...filtered].sort((a, b) => {
    if (a.stats.overdueTasks > 0 && b.stats.overdueTasks === 0) return -1;
    if (b.stats.overdueTasks > 0 && a.stats.overdueTasks === 0) return 1;
    const statusPriority = { open: 0, closing: 1, no_periods: 2, closed: 3, locked: 4 };
    return (statusPriority[a.stats.closingStatus] ?? 5) - (statusPriority[b.stats.closingStatus] ?? 5);
  });

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/70">
              <Briefcase className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">Cartera de Asesoría</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {advisorRole ? ROLE_LABELS[advisorRole] : 'Cargando...'} ·{' '}
                {summary
                  ? `${summary.totalCompanies} empresas · ${summary.totalEmployees} empleados`
                  : 'Sin datos'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>

        {/* Portfolio KPIs */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
            <KpiChip
              icon={Building2}
              label="Empresas"
              value={summary.activeCompanies}
              total={summary.totalCompanies}
            />
            <KpiChip
              icon={Users}
              label="Empleados"
              value={summary.totalEmployees}
            />
            <KpiChip
              icon={ClipboardList}
              label="Tareas pend."
              value={summary.totalPendingTasks}
              variant={summary.totalPendingTasks > 0 ? 'warning' : 'default'}
            />
            <KpiChip
              icon={AlertTriangle}
              label="SLA vencidos"
              value={summary.totalOverdueTasks}
              variant={summary.totalOverdueTasks > 0 ? 'danger' : 'default'}
            />
            <KpiChip
              icon={CalendarCheck}
              label="Cierres abiertos"
              value={summary.companiesWithOpenClosing}
              variant={summary.companiesWithOpenClosing > 0 ? 'warning' : 'default'}
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-3">
        {/* Search and filters */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empresa o CIF..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Select value={filterStatus} onValueChange={v => setFilterStatus(v as FilterStatus)}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="Estado cierre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">Cierre abierto</SelectItem>
              <SelectItem value="closing">En cierre</SelectItem>
              <SelectItem value="closed">Cerrado</SelectItem>
              <SelectItem value="locked">Bloqueado</SelectItem>
              <SelectItem value="overdue">Con SLA vencido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Company list */}
        <ScrollArea className="h-[500px]">
          {hasNoAssignments ? (
            <div className="py-12 text-center text-muted-foreground">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Sin cartera asignada</p>
              <p className="text-xs mt-1 max-w-xs mx-auto">
                No tienes empresas asignadas. Contacta con un supervisor para que te asigne una cartera.
              </p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Sin resultados para los filtros aplicados</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {sorted.map(company => (
                <CompanyRow
                  key={company.id}
                  company={company}
                  isExpanded={expandedCompany === company.id}
                  onToggle={() => setExpandedCompany(expandedCompany === company.id ? null : company.id)}
                  onSelect={() => onSelectCompany?.(company.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {summary && (
          <>
            <Separator className="my-3" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Mostrando {sorted.length} de {companies.length} empresas
              </span>
              <span>
                Evaluado {formatDistanceToNow(new Date(summary.evaluatedAt), { locale: es, addSuffix: true })}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Company row ──

function CompanyRow({ company, isExpanded, onToggle, onSelect }: {
  company: PortfolioCompany;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const closingConfig = CLOSING_STATUS_CONFIG[company.stats.closingStatus] ?? CLOSING_STATUS_CONFIG.no_periods;
  const ClosingIcon = closingConfig.icon;
  const hasAlerts = company.stats.overdueTasks > 0;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="w-full">
        <div className={cn(
          'flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors text-left',
          hasAlerts && 'border-destructive/30',
        )}>
          <div className={cn(
            'h-9 w-9 rounded-full flex items-center justify-center shrink-0',
            hasAlerts ? 'bg-destructive/10' : 'bg-primary/10',
          )}>
            <Building2 className={cn('h-4 w-4', hasAlerts ? 'text-destructive' : 'text-primary')} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{company.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {company.taxId ?? 'Sin CIF'} · {company.stats.activeEmployees} empl.
            </p>
          </div>

          {/* Stats badges */}
          <div className="flex items-center gap-1.5 shrink-0">
            {company.stats.overdueTasks > 0 && (
              <Badge variant="destructive" className="text-[10px] gap-0.5">
                <AlertTriangle className="h-3 w-3" />
                {company.stats.overdueTasks}
              </Badge>
            )}
            {company.stats.pendingTasks > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {company.stats.pendingTasks} tareas
              </Badge>
            )}
            <Badge className={cn('text-[10px] gap-0.5', closingConfig.color)}>
              <ClosingIcon className="h-3 w-3" />
              {closingConfig.label}
            </Badge>
          </div>

          {isExpanded
            ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="ml-12 mr-3 mt-1 mb-2 p-3 rounded-lg border bg-muted/20 space-y-3 text-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatBox label="Empleados activos" value={company.stats.activeEmployees} icon={Users} />
            <StatBox
              label="Tareas pendientes"
              value={company.stats.pendingTasks}
              icon={ClipboardList}
              variant={company.stats.pendingTasks > 5 ? 'warning' : 'default'}
            />
            <StatBox
              label="SLA vencidos"
              value={company.stats.overdueTasks}
              icon={AlertTriangle}
              variant={company.stats.overdueTasks > 0 ? 'danger' : 'default'}
            />
            <StatBox
              label="Períodos abiertos"
              value={company.stats.openClosingPeriods}
              icon={CalendarCheck}
              variant={company.stats.openClosingPeriods > 1 ? 'warning' : 'default'}
            />
          </div>

          {company.stats.lastClosedPeriod && (
            <p className="text-muted-foreground">
              Último cierre: <span className="font-medium text-foreground">{company.stats.lastClosedPeriod}</span>
            </p>
          )}

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {ROLE_LABELS[company.advisoryRole]}
            </Badge>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onSelect}>
              <ExternalLink className="h-3 w-3" /> Abrir empresa
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Sub-components ──

function KpiChip({ icon: Icon, label, value, total, variant = 'default' }: {
  icon: typeof Building2;
  label: string;
  value: number;
  total?: number;
  variant?: 'default' | 'warning' | 'danger';
}) {
  return (
    <div className={cn(
      'p-2 rounded-lg border bg-card text-center',
      variant === 'danger' && value > 0 && 'border-destructive/30 bg-destructive/5',
      variant === 'warning' && value > 0 && 'border-amber-300 bg-amber-50/30',
    )}>
      <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
      <p className="text-lg font-bold">
        {value}
        {total !== undefined && <span className="text-xs text-muted-foreground font-normal">/{total}</span>}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function StatBox({ label, value, icon: Icon, variant = 'default' }: {
  label: string;
  value: number;
  icon: typeof Users;
  variant?: 'default' | 'warning' | 'danger';
}) {
  return (
    <div className={cn(
      'p-2 rounded-lg border bg-card text-center',
      variant === 'danger' && value > 0 && 'border-destructive/30',
      variant === 'warning' && value > 0 && 'border-amber-300',
    )}>
      <Icon className={cn(
        'h-3.5 w-3.5 mx-auto mb-0.5',
        variant === 'danger' && value > 0 ? 'text-destructive' :
        variant === 'warning' && value > 0 ? 'text-amber-600' : 'text-muted-foreground',
      )} />
      <p className="text-base font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

export default AdvisoryDashboardPanel;
