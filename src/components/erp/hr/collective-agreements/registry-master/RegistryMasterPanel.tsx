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
 *
 * B12.4 — Row-level safe navigation actions added. All actions are pure
 * UI navigation (state change / external callback / clipboard copy).
 * NO writes, NO edge invokes, NO flag mutations, NO payroll imports.
 */
import { useEffect, useMemo, useState } from 'react';
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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  RefreshCw,
  BookOpen,
  ShieldAlert,
  Eye,
  ExternalLink,
  ClipboardCopy,
  ListChecks,
  CheckCircle2,
  Wrench,
} from 'lucide-react';
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

interface RegistryMasterPanelProps {
  /**
   * Optional safe navigation callback. When provided, the panel exposes an
   * "Abrir en Centro de Convenios" action that asks the parent to switch
   * to the Hub. The panel itself never writes to DB nor invokes edges.
   */
  onNavigateToHub?: (internalCode: string) => void;
}

type RowState =
  | 'metadata_only'
  | 'parsed_partial'
  | 'ready_for_payroll'
  | 'unknown';

function deriveRowState(r: RegistryRow): RowState {
  if (r.ready_for_payroll === true) return 'ready_for_payroll';
  if (r.salary_tables_loaded === true && r.ready_for_payroll !== true) {
    return 'parsed_partial';
  }
  if (r.data_completeness === 'metadata_only') return 'metadata_only';
  return 'unknown';
}

function nextStepMessage(state: RowState): { message: string; nextStep: string } {
  switch (state) {
    case 'metadata_only':
      return {
        message:
          'Este convenio existe solo como metadata. Para poder incorporarlo a empleados primero debes completar fuente oficial, tablas salariales y reglas.',
        nextStep: 'Completar fuente oficial / preparar parser B11.',
      };
    case 'parsed_partial':
      return {
        message:
          'Este convenio tiene datos cargados, pero requiere validación humana antes de poder activarse.',
        nextStep: 'Enviar a validación humana.',
      };
    case 'ready_for_payroll':
      return {
        message:
          'Este convenio está listo en Registry. Para usarlo con una empresa/contrato debes crear mapping y runtime apply.',
        nextStep: 'Preparar mapping.',
      };
    default:
      return {
        message:
          'Estado del convenio no clasificable. Revisa los campos en el Registro Maestro.',
        nextStep: 'Revisar metadata en el Registro Maestro.',
      };
  }
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

export function RegistryMasterPanel({ onNavigateToHub }: RegistryMasterPanelProps = {}) {
  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<RegistryRow | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const detailState = useMemo<RowState | null>(
    () => (detailRow ? deriveRowState(detailRow) : null),
    [detailRow],
  );
  const detailMessages = useMemo(
    () => (detailState ? nextStepMessage(detailState) : null),
    [detailState],
  );

  const handleCopyCode = async (code: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      }
    } catch {
      // ignore clipboard errors silently — purely UX.
    }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 1500);
  };

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
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-xs text-muted-foreground">
                      Sin convenios en el registry.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => {
                  const state = deriveRowState(r);
                  return (
                    <TableRow key={r.id} data-testid={`registry-row-${r.internal_code ?? r.id}`}>
                      <TableCell className="font-mono text-xs">{r.internal_code ?? '—'}</TableCell>
                      <TableCell className="text-xs">{r.official_name ?? '—'}</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="text-xs">{r.source_quality ?? '—'}</TableCell>
                      <TableCell className="text-xs">{r.data_completeness ?? '—'}</TableCell>
                      <TableCell>{boolBadge(r.salary_tables_loaded)}</TableCell>
                      <TableCell>{boolBadge(r.ready_for_payroll)}</TableCell>
                      <TableCell>{boolBadge(r.requires_human_review, 'sí', 'no')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => setDetailRow(r)}
                            data-testid={`row-action-detail-${r.internal_code ?? r.id}`}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Abrir detalle
                          </Button>
                          {onNavigateToHub && r.internal_code && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => onNavigateToHub(r.internal_code as string)}
                              data-testid={`row-action-hub-${r.internal_code}`}
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1" />
                              Abrir en Centro de Convenios
                            </Button>
                          )}
                          {state === 'metadata_only' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 px-2 text-xs"
                              onClick={() => setDetailRow(r)}
                              data-testid={`row-action-prepare-${r.internal_code ?? r.id}`}
                            >
                              <ListChecks className="h-3.5 w-3.5 mr-1" />
                              Preparar incorporación
                            </Button>
                          )}
                          {state === 'parsed_partial' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 px-2 text-xs"
                              onClick={() => setDetailRow(r)}
                              data-testid={`row-action-validation-${r.internal_code ?? r.id}`}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Enviar a validación
                            </Button>
                          )}
                          {state === 'ready_for_payroll' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 px-2 text-xs"
                              onClick={() => setDetailRow(r)}
                              data-testid={`row-action-mapping-${r.internal_code ?? r.id}`}
                            >
                              <Wrench className="h-3.5 w-3.5 mr-1" />
                              Preparar mapping
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Drawer open={detailRow !== null} onOpenChange={(o) => !o && setDetailRow(null)}>
        <DrawerContent data-testid="registry-row-detail-drawer">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {detailRow?.internal_code ?? '—'}
              <Badge variant="outline">read-only</Badge>
            </DrawerTitle>
            <DrawerDescription className="text-xs">
              {detailRow?.official_name ?? '—'}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-4 max-w-3xl mx-auto w-full">
            {detailRow && detailMessages && (
              <>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">status</div>
                    <div>{statusBadge(detailRow.status)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">data_completeness</div>
                    <div>{detailRow.data_completeness ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">salary_tables_loaded</div>
                    <div>{boolBadge(detailRow.salary_tables_loaded)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">ready_for_payroll</div>
                    <div>{boolBadge(detailRow.ready_for_payroll)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">requires_human_review</div>
                    <div>{boolBadge(detailRow.requires_human_review, 'sí', 'no')}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">source_quality</div>
                    <div>{detailRow.source_quality ?? '—'}</div>
                  </div>
                </div>

                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <p>{detailMessages.message}</p>
                  <p className="mt-2 text-xs">
                    <span className="font-medium">Siguiente paso seguro:</span>{' '}
                    {detailMessages.nextStep}
                  </p>
                </div>

                <div className="rounded-md border border-amber-300/40 bg-amber-50/40 dark:bg-amber-900/10 p-3 text-xs flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    Para incorporar el convenio a empleados utiliza el{' '}
                    <strong>Centro de Convenios</strong>. Esta vista no activa nómina ni
                    crea mappings.
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => detailRow.internal_code && handleCopyCode(detailRow.internal_code)}
                    disabled={!detailRow.internal_code}
                    data-testid="detail-copy-internal-code"
                  >
                    <ClipboardCopy className="h-4 w-4 mr-2" />
                    {copiedCode && copiedCode === detailRow.internal_code
                      ? 'Copiado'
                      : 'Copiar internal_code'}
                  </Button>
                  {onNavigateToHub && detailRow.internal_code && (
                    <Button
                      size="sm"
                      onClick={() => {
                        const code = detailRow.internal_code as string;
                        setDetailRow(null);
                        onNavigateToHub(code);
                      }}
                      data-testid="detail-open-in-hub"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir en Centro de Convenios
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export default RegistryMasterPanel;