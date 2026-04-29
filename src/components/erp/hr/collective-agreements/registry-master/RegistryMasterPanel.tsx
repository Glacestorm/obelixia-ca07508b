/**
 * B12.1 — Read-only Registry Master panel.
 *
 * Hard rules (mirrored by static tests):
 *  - READ-ONLY. NO mutating CTAs.
 *  - Reads ONLY from the Registry table (registry suffix). Never the
 *    operative per-company table.
 *  - No imports from payroll bridge, payroll/payslip engines, salary
 *    normaliser, salary resolver, or safety gate modules.
 *  - No DB writes, no privileged keys, no flag mutations. Static tests
 *    enforce these invariants from the source text.
 *  - Permanent banner: "Vista read-only del Registro Maestro. No activa nómina."
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw, BookOpen, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RegistryRow {
  id: string;
  internal_code: string | null;
  official_name: string | null;
  status: string | null;
  source_quality: string | null;
  data_completeness: string | null;
  salary_tables_loaded: boolean | null;
  ready_for_payroll: boolean | null;
  requires_human_review: boolean | null;
}

function statusBadge(value: string | null) {
  if (!value) return <Badge variant="outline">—</Badge>;
  const variant: 'default' | 'secondary' | 'outline' | 'destructive' =
    value === 'vigente'
      ? 'default'
      : value === 'pendiente_validacion'
        ? 'secondary'
        : value === 'vencido' || value === 'sustituido'
          ? 'destructive'
          : 'outline';
  return <Badge variant={variant}>{value}</Badge>;
}

function boolBadge(value: boolean | null, trueLabel = 'sí', falseLabel = 'no') {
  if (value == null) return <Badge variant="outline">—</Badge>;
  return (
    <Badge variant={value ? 'default' : 'outline'}>
      {value ? trueLabel : falseLabel}
    </Badge>
  );
}

export function RegistryMasterPanel() {
  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // READ-ONLY select against the registry table only.
      const { data, error: err } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('erp_hr_collective_agreements_registry' as any)
        .select(
          'id, internal_code, official_name, status, source_quality, data_completeness, salary_tables_loaded, ready_for_payroll, requires_human_review',
        )
        .order('internal_code', { ascending: true });
      if (err) {
        setError(err.message);
        setRows([]);
      } else {
        setRows((data ?? []) as unknown as RegistryRow[]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown_error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const total = rows.length;
  const ready = rows.filter((r) => r.ready_for_payroll === true).length;
  const review = rows.filter((r) => r.requires_human_review === true).length;

  return (
    <div className="space-y-4" data-testid="registry-master-panel">
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Registro Maestro de Convenios — read-only
            <Badge variant="outline">read-only</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            Vista read-only del Registro Maestro. No activa nómina. La promoción a
            <code className="mx-1">ready_for_payroll</code>
            requiere validación humana B8A y activación B9 desde sus paneles
            específicos.
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">
            Convenios registry · {total} total · {ready} ready_for_payroll · {review} requieren revisión
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refrescar
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-xs text-destructive mb-2">Error: {error}</div>
          )}
          <ScrollArea className="h-[520px] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-xs">internal_code</TableHead>
                  <TableHead>official_name</TableHead>
                  <TableHead>status</TableHead>
                  <TableHead>source_quality</TableHead>
                  <TableHead>data_completeness</TableHead>
                  <TableHead>salary_tables_loaded</TableHead>
                  <TableHead>ready_for_payroll</TableHead>
                  <TableHead>requires_human_review</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-xs text-muted-foreground">
                      Sin convenios en el registry.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.internal_code ?? '—'}</TableCell>
                    <TableCell className="text-xs">{r.official_name ?? '—'}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-xs">{r.source_quality ?? '—'}</TableCell>
                    <TableCell className="text-xs">{r.data_completeness ?? '—'}</TableCell>
                    <TableCell>{boolBadge(r.salary_tables_loaded)}</TableCell>
                    <TableCell>{boolBadge(r.ready_for_payroll)}</TableCell>
                    <TableCell>{boolBadge(r.requires_human_review, 'sí', 'no')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default RegistryMasterPanel;