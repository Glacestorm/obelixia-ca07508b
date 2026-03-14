/**
 * EmployeePayslipsSection — "Mis nóminas" del Portal del Empleado
 * V2-ES.9.4: Centro de autoservicio salarial employee-facing
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Euro, FileText, Download, ChevronRight, Calendar,
  TrendingUp, TrendingDown, Minus, MessageSquare,
  ArrowUpRight, ArrowDownRight, Loader2, Info, Paperclip,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EmployeeProfile } from '@/hooks/erp/hr/useEmployeePortal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { type PortalSection } from './EmployeePortalNav';

interface Props {
  employee: EmployeeProfile;
  onNavigate: (section: PortalSection) => void;
}

interface PayslipRecord {
  id: string;
  gross_salary: number;
  net_salary: number;
  total_deductions: number;
  employer_cost: number;
  status: string;
  review_status: string;
  paid_at: string | null;
  created_at: string;
  calculation_details: any;
  diff_vs_previous: any;
  metadata: any;
  payroll_period_id: string;
  currency: string;
  period?: {
    id: string;
    period_name: string;
    period_number: number;
    fiscal_year: number;
    start_date: string;
    end_date: string;
    payment_date: string | null;
    status: string;
  };
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Borrador', variant: 'outline' },
  calculated: { label: 'Calculada', variant: 'secondary' },
  approved: { label: 'Aprobada', variant: 'default' },
  paid: { label: 'Pagada', variant: 'default' },
  cancelled: { label: 'Anulada', variant: 'destructive' },
};

const fmtCurrency = (v: number, currency = 'EUR') =>
  v.toLocaleString('es-ES', { style: 'currency', currency, minimumFractionDigits: 2 });

export function EmployeePayslipsSection({ employee, onNavigate }: Props) {
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipRecord | null>(null);

  // Fetch payslips with period info
  const fetchPayslips = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hr_payroll_records')
        .select(`
          id, gross_salary, net_salary, total_deductions, employer_cost,
          status, review_status, paid_at, created_at, calculation_details,
          diff_vs_previous, metadata, payroll_period_id, currency,
          period:hr_payroll_periods!hr_payroll_records_payroll_period_id_fkey(
            id, period_name, period_number, fiscal_year,
            start_date, end_date, payment_date, status
          )
        `)
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayslips((data || []) as unknown as PayslipRecord[]);
    } catch (err) {
      console.error('[EmployeePayslipsSection] fetch error:', err);
      toast.error('Error al cargar nóminas');
    } finally {
      setLoading(false);
    }
  }, [employee.id]);

  useEffect(() => { fetchPayslips(); }, [fetchPayslips]);

  // Available years
  const years = useMemo(() => {
    const yrs = new Set<number>();
    for (const p of payslips) {
      const yr = p.period?.fiscal_year || new Date(p.created_at).getFullYear();
      yrs.add(yr);
    }
    if (yrs.size === 0) yrs.add(new Date().getFullYear());
    return Array.from(yrs).sort((a, b) => b - a);
  }, [payslips]);

  // Filtered by year
  const filtered = useMemo(() => {
    const yr = Number(selectedYear);
    return payslips.filter(p => {
      const pyr = p.period?.fiscal_year || new Date(p.created_at).getFullYear();
      return pyr === yr;
    });
  }, [payslips, selectedYear]);

  // Year totals
  const yearTotals = useMemo(() => {
    let gross = 0, net = 0, deductions = 0;
    for (const p of filtered) {
      if (p.status === 'cancelled') continue;
      gross += p.gross_salary;
      net += p.net_salary;
      deductions += p.total_deductions;
    }
    return { gross, net, deductions, count: filtered.filter(p => p.status !== 'cancelled').length };
  }, [filtered]);

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Euro className="h-5 w-5 text-primary" /> Mis Nóminas
            </h2>
            <p className="text-sm text-muted-foreground">
              Consulta y descarga tus recibos de nómina
            </p>
          </div>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Year summary */}
        {!loading && yearTotals.count > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label="Nóminas" value={String(yearTotals.count)} sub={`Año ${selectedYear}`} />
            <SummaryCard label="Bruto acumulado" value={fmtCurrency(yearTotals.gross)} />
            <SummaryCard label="Neto acumulado" value={fmtCurrency(yearTotals.net)} />
            <SummaryCard label="Deducciones" value={fmtCurrency(yearTotals.deductions)} />
          </div>
        )}

        {/* Payslip list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Euro className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No hay nóminas en {selectedYear}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((p, idx) => {
              const st = STATUS_MAP[p.status] || { label: p.status, variant: 'outline' as const };
              const periodLabel = p.period?.period_name || format(new Date(p.created_at), 'MMMM yyyy', { locale: es });
              const diff = p.diff_vs_previous as any;
              const netDiff = diff?.net_salary_diff ?? null;

              return (
                <Card
                  key={p.id}
                  className="cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => setSelectedPayslip(p)}
                >
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold capitalize truncate">{periodLabel}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {p.period?.payment_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Pago: {format(new Date(p.period.payment_date), 'dd MMM', { locale: es })}
                              </span>
                            )}
                            <Badge variant={st.variant} className="text-[10px] h-4 px-1.5">{st.label}</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-base font-bold">{fmtCurrency(p.net_salary, p.currency)}</p>
                          <p className="text-xs text-muted-foreground">
                            Bruto: {fmtCurrency(p.gross_salary, p.currency)}
                          </p>
                        </div>
                        {netDiff !== null && netDiff !== 0 && (
                          <DiffIndicator value={netDiff} currency={p.currency} />
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Action: open payroll query */}
        <div className="pt-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => onNavigate('requests')}
          >
            <MessageSquare className="h-4 w-4" />
            ¿Tienes una duda sobre tu nómina?
          </Button>
        </div>
      </div>

      {/* Detail sheet */}
      <Sheet open={!!selectedPayslip} onOpenChange={open => !open && setSelectedPayslip(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedPayslip && (
            <PayslipDetail
              payslip={selectedPayslip}
              employee={employee}
              onOpenQuery={() => {
                setSelectedPayslip(null);
                onNavigate('requests');
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

// ─── Detail view ─────────────────────────────────────────────────────────

function PayslipDetail({ payslip, employee, onOpenQuery }: {
  payslip: PayslipRecord; employee: EmployeeProfile; onOpenQuery: () => void;
}) {
  const periodLabel = payslip.period?.period_name ||
    format(new Date(payslip.created_at), 'MMMM yyyy', { locale: es });
  const calc = payslip.calculation_details as any;
  const diff = payslip.diff_vs_previous as any;

  // Extract concepts from calculation_details if available
  const concepts = useMemo(() => {
    if (!calc) return null;
    const earnings: Array<{ label: string; amount: number }> = [];
    const deductions: Array<{ label: string; amount: number }> = [];
    const bases: Array<{ label: string; amount: number }> = [];

    // Parse calculation trace or structured concepts
    if (calc.earnings && Array.isArray(calc.earnings)) {
      for (const e of calc.earnings) {
        earnings.push({ label: e.concept || e.label || 'Concepto', amount: Number(e.amount || 0) });
      }
    }
    if (calc.deductions && Array.isArray(calc.deductions)) {
      for (const d of calc.deductions) {
        deductions.push({ label: d.concept || d.label || 'Deducción', amount: Number(d.amount || 0) });
      }
    }
    if (calc.bases && typeof calc.bases === 'object') {
      for (const [k, v] of Object.entries(calc.bases)) {
        bases.push({ label: formatBaseLabel(k), amount: Number(v || 0) });
      }
    }

    // Fallback: try to extract from trace
    if (earnings.length === 0 && calc.calculation_trace && Array.isArray(calc.calculation_trace)) {
      for (const t of calc.calculation_trace) {
        if (t.type === 'earning' || t.impact === 'earning') {
          earnings.push({ label: t.concept || t.name || 'Concepto', amount: Number(t.amount || 0) });
        } else if (t.type === 'deduction' || t.impact === 'deduction') {
          deductions.push({ label: t.concept || t.name || 'Deducción', amount: Number(t.amount || 0) });
        }
      }
    }

    if (earnings.length === 0 && deductions.length === 0 && bases.length === 0) return null;
    return { earnings, deductions, bases };
  }, [calc]);

  const c = payslip.currency;

  return (
    <div className="space-y-5 pt-4">
      <SheetHeader className="pb-0">
        <SheetTitle className="capitalize">{periodLabel}</SheetTitle>
        <p className="text-xs text-muted-foreground">
          {employee.first_name} {employee.last_name}
          {payslip.period?.start_date && payslip.period?.end_date && (
            <> · {format(new Date(payslip.period.start_date), 'dd/MM')} – {format(new Date(payslip.period.end_date), 'dd/MM/yyyy')}</>
          )}
        </p>
      </SheetHeader>

      {/* Main figures */}
      <div className="grid grid-cols-2 gap-3">
        <FigureCard label="Salario bruto" value={fmtCurrency(payslip.gross_salary, c)} />
        <FigureCard label="Salario neto" value={fmtCurrency(payslip.net_salary, c)} highlight />
        <FigureCard label="Deducciones" value={fmtCurrency(payslip.total_deductions, c)} />
        <FigureCard
          label="Fecha de pago"
          value={payslip.paid_at
            ? format(new Date(payslip.paid_at), 'dd MMM yyyy', { locale: es })
            : payslip.period?.payment_date
              ? format(new Date(payslip.period.payment_date), 'dd MMM yyyy', { locale: es })
              : 'Pendiente'}
        />
      </div>

      {/* Comparison with previous */}
      {diff && (diff.net_salary_diff !== 0 || diff.gross_salary_diff !== 0) && (
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Comparativa vs. mes anterior</p>
            <div className="grid grid-cols-2 gap-2">
              {diff.gross_salary_diff !== undefined && (
                <CompRow label="Bruto" value={diff.gross_salary_diff} currency={c} />
              )}
              {diff.net_salary_diff !== undefined && (
                <CompRow label="Neto" value={diff.net_salary_diff} currency={c} />
              )}
              {diff.total_deductions_diff !== undefined && (
                <CompRow label="Deducciones" value={diff.total_deductions_diff} currency={c} />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Concepts breakdown */}
      {concepts && (
        <>
          {concepts.earnings.length > 0 && (
            <ConceptGroup title="Devengos" items={concepts.earnings} currency={c} variant="earning" />
          )}
          {concepts.deductions.length > 0 && (
            <ConceptGroup title="Deducciones" items={concepts.deductions} currency={c} variant="deduction" />
          )}
          {concepts.bases.length > 0 && (
            <ConceptGroup title="Bases de cotización" items={concepts.bases} currency={c} variant="base" />
          )}
        </>
      )}

      {/* Actions */}
      <Separator />
      <div className="flex flex-col gap-2">
        <Button variant="outline" className="gap-2 justify-start" onClick={onOpenQuery}>
          <MessageSquare className="h-4 w-4" />
          Tengo una duda sobre esta nómina
        </Button>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-bold mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function FigureCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded-lg border ${highlight ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'}`}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold ${highlight ? 'text-primary' : ''}`}>{value}</p>
    </div>
  );
}

function DiffIndicator({ value, currency }: { value: number; currency: string }) {
  if (value === 0) return null;
  const positive = value > 0;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`text-xs font-medium flex items-center gap-0.5 ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {positive ? '+' : ''}{fmtCurrency(value, currency)}
          </span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">vs. mes anterior</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function CompRow({ label, value, currency }: { label: string; value: number; currency: string }) {
  const positive = value > 0;
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-medium ${value === 0 ? '' : positive ? 'text-emerald-600' : 'text-rose-600'}`}>
        {value === 0 ? '—' : `${positive ? '+' : ''}${fmtCurrency(value, currency)}`}
      </span>
    </div>
  );
}

function ConceptGroup({ title, items, currency, variant }: {
  title: string; items: Array<{ label: string; amount: number }>; currency: string;
  variant: 'earning' | 'deduction' | 'base';
}) {
  const colorClass = variant === 'earning' ? 'text-emerald-700' : variant === 'deduction' ? 'text-rose-700' : 'text-muted-foreground';
  return (
    <div>
      <p className="text-xs font-semibold mb-1.5">{title}</p>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/50">
            <span className="text-xs text-muted-foreground truncate mr-2">{item.label}</span>
            <span className={`text-xs font-medium ${colorClass} whitespace-nowrap`}>
              {fmtCurrency(item.amount, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatBaseLabel(key: string): string {
  const map: Record<string, string> = {
    base_contingencias_comunes: 'Base contingencias comunes',
    base_at_ep: 'Base AT/EP',
    base_irpf: 'Base IRPF',
    base_cotizacion_mensual: 'Base cotización mensual',
    base_horas_extra: 'Base horas extra',
  };
  return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
