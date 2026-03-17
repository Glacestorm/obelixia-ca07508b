/**
 * P4ArtifactsPanel — V2-RRHH-P4F
 * UI consumer for useP4OfficialArtifacts: allows generating and viewing
 * RLC, RNT, CRA, Modelo 111, Modelo 190 artifacts from runtime.
 * P4D: + generation triggers + persisted artifacts from DB + cleanup
 * P4E: + real FAN/payroll data feeding for RLC/RNT/CRA + period selector + honest messaging
 * P4F: + pre-validations wired + generation blocking + IRPF fix in 111 + IRPF per worker
 */

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  FileText, CheckCircle, XCircle, AlertTriangle, Clock,
  ChevronDown, ChevronRight, Shield, RefreshCw, Download,
  GitBranch, Hash, AlertCircle, Package, Play, Database, Info,
  Ban,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useP4OfficialArtifacts, type P4ArtifactRecord } from '@/hooks/erp/hr/useP4OfficialArtifacts';
import type { OfficialArtifactDBRow } from '@/hooks/erp/hr/useOfficialArtifacts';
import type { FANEmployeeRecord, FANCotizacionTotals } from '@/engines/erp/hr/fanCotizacionArtifactEngine';
import type { ArtifactPreValidation } from '@/engines/erp/hr/officialArtifactValidationEngine';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  companyId: string;
  className?: string;
}

const ARTIFACT_LABELS: Record<string, string> = {
  rlc: 'RLC — Recibo de Liquidación',
  rnt: 'RNT — Relación Nominal',
  cra: 'CRA — Cuadro Resumen',
  modelo_111: 'Modelo 111 — Retenciones IRPF',
  modelo_190: 'Modelo 190 — Resumen Anual',
};

const ARTIFACT_SHORT: Record<string, string> = {
  rlc: 'RLC',
  rnt: 'RNT',
  cra: 'CRA',
  modelo_111: 'Mod. 111',
  modelo_190: 'Mod. 190',
};

const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const r2 = (n: number) => Math.round(n * 100) / 100;

// ── Build FANEmployeeRecord from payroll record calculation_details ──
// P4F: now extracts real IRPF per worker from deducciones array

interface PayrollRecordRow {
  id: string;
  employee_id: string;
  payroll_period_id: string;
  gross_salary: number;
  net_salary: number;
  total_deductions: number;
  employer_cost: number;
  calculation_details: Record<string, unknown> | null;
}

function extractIRPFFromRecord(d: Record<string, unknown> | null): { tipoIRPF: number; retencionIRPF: number; irpfAvailable: boolean } {
  if (!d || typeof d !== 'object') return { tipoIRPF: 0, retencionIRPF: 0, irpfAvailable: false };

  // Try deducciones array first (most reliable)
  const deducciones = d.deducciones as Array<{ concepto?: string; importe?: number; porcentaje?: number }> | undefined;
  if (deducciones && Array.isArray(deducciones)) {
    const irpfLine = deducciones.find(dd => dd.concepto?.startsWith('IRPF') || dd.concepto?.includes('IRPF'));
    if (irpfLine) {
      return {
        tipoIRPF: Number(irpfLine.porcentaje ?? 0),
        retencionIRPF: Number(irpfLine.importe ?? 0),
        irpfAvailable: true,
      };
    }
  }

  // Fallback: check bases.retencionIRPF or bases.irpf
  const bases = d.bases as Record<string, number> | undefined;
  if (bases) {
    const ret = Number(bases.retencionIRPF ?? bases.irpf ?? 0);
    const tipo = Number(bases.tipoIRPF ?? bases.porcentajeIRPF ?? 0);
    if (ret > 0) return { tipoIRPF: tipo, retencionIRPF: ret, irpfAvailable: true };
  }

  return { tipoIRPF: 0, retencionIRPF: 0, irpfAvailable: false };
}

function buildFANRecordFromPayroll(rec: PayrollRecordRow): FANEmployeeRecord {
  const d = rec.calculation_details;
  const bases = ((d?.bases ?? {}) as Record<string, number>);
  const header = ((d?.header ?? {}) as Record<string, string>);
  const irpf = extractIRPFFromRecord(d);

  return {
    employeeId: rec.employee_id,
    employeeName: header.trabajadorNombre ?? header.empleadoNombre ?? rec.employee_id,
    naf: header.trabajadorNAF ?? header.naf ?? '',
    dniNie: header.trabajadorNIF ?? header.dniNie ?? '',
    grupoCotizacion: Number(header.grupoCotizacion ?? 1),
    contractTypeCode: header.codigoContrato ?? '100',
    isTemporary: false,
    coeficienteParcialidad: 1,
    diasCotizados: 30,

    baseCCMensual: bases.baseCotizacionCC ?? 0,
    baseATMensual: bases.baseCotizacionAT ?? 0,
    baseHorasExtra: bases.baseHorasExtra ?? 0,
    prorrateoMensual: 0,

    ccTrabajador: bases.ccTrabajador ?? 0,
    desempleoTrabajador: bases.desempleoTrabajador ?? 0,
    fpTrabajador: bases.fpTrabajador ?? 0,
    meiTrabajador: bases.meiTrabajador ?? 0,
    totalTrabajador: bases.totalCotizacionesTrabajador ?? 0,

    ccEmpresa: bases.ccEmpresa ?? 0,
    desempleoEmpresa: bases.desempleoEmpresa ?? 0,
    fogasa: bases.fogasa ?? 0,
    fpEmpresa: bases.fpEmpresa ?? 0,
    meiEmpresa: bases.meiEmpresa ?? 0,
    atEmpresa: bases.atEmpresa ?? 0,
    totalEmpresa: bases.totalCotizacionesEmpresa ?? 0,

    baseIRPFCorregida: bases.baseIRPF ?? rec.gross_salary ?? 0,
    tipoIRPF: irpf.tipoIRPF,
    retencionIRPF: irpf.retencionIRPF,

    topeMinAplicado: false,
    topeMaxAplicado: false,
    prorrateoSource: 'none',
    ssDataFromDB: true,
    validationIssues: irpf.irpfAvailable ? [] : ['irpf_not_available'],
  };
}

function aggregateTotals(records: FANEmployeeRecord[]): FANCotizacionTotals {
  const totalBasesCC = r2(records.reduce((s, r) => s + r.baseCCMensual, 0));
  const totalBasesAT = r2(records.reduce((s, r) => s + r.baseATMensual, 0));
  const totalHorasExtra = r2(records.reduce((s, r) => s + r.baseHorasExtra, 0));
  const totalCotizacionTrabajador = r2(records.reduce((s, r) => s + r.totalTrabajador, 0));
  const totalCotizacionEmpresa = r2(records.reduce((s, r) => s + r.totalEmpresa, 0));
  const totalRetencionIRPF = r2(records.reduce((s, r) => s + r.retencionIRPF, 0));
  return {
    totalBasesCC,
    totalBasesAT,
    totalHorasExtra,
    totalCotizacionTrabajador,
    totalCotizacionEmpresa,
    totalCotizacionGeneral: r2(totalCotizacionTrabajador + totalCotizacionEmpresa),
    totalRetencionIRPF,
    totalLiquidoEstimado: r2(totalBasesCC - totalCotizacionTrabajador - totalRetencionIRPF),
    liquidoEsEstimado: true,
  };
}

type DataSourceKind = 'fan_artifact' | 'payroll_records' | 'none';

interface CotizacionData {
  source: DataSourceKind;
  records: FANEmployeeRecord[];
  totals: FANCotizacionTotals;
  sourceLabel: string;
  irpfAvailableCount: number;
}

// ── Persisted artifact card (from DB) ──

function PersistedArtifactCard({ row }: { row: OfficialArtifactDBRow }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Card className="border overflow-hidden">
      <CardHeader className="pb-2 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn('p-1.5 rounded-md', row.is_valid ? 'bg-emerald-500/10' : 'bg-destructive/10')}>
              {row.is_valid ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm truncate">
                {ARTIFACT_LABELS[row.artifact_type] ?? row.artifact_type}
              </CardTitle>
              <p className="text-xs text-muted-foreground truncate">
                {row.period_label ?? `${row.period_year}/${row.period_month ?? '—'}`} · v{row.version_number}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="outline" className="text-xs">{row.status}</Badge>
            <Badge variant={row.is_valid ? 'default' : 'destructive'} className="text-[10px]">
              {row.readiness_percent}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Generado:</span>
          <span>{new Date(row.created_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-7 text-xs">
              <span className="flex items-center gap-1.5"><GitBranch className="h-3 w-3" /> Trazabilidad</span>
              {showDetails ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-1 pt-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Hash className="h-3 w-3" /> DB ID:</span>
                <span className="font-mono text-primary">{row.id.slice(0, 12)}…</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Artifact ID:</span>
                <span className="font-mono">{row.artifact_id.slice(0, 16)}…</span>
              </div>
              {row.employee_ids && row.employee_ids.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Empleados:</span>
                  <span className="font-mono">{row.employee_ids.length}</span>
                </div>
              )}
              <div className="flex items-center gap-1 pt-1 border-t border-border/30 mt-1">
                <Database className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground italic text-[10px]">Persistido en BD</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// ── Session artifact card (from local state) ──

function ArtifactRecordCard({ record }: { record: P4ArtifactRecord }) {
  const [showDetails, setShowDetails] = useState(false);
  const artifact = record.artifact;

  const handleDownload = () => {
    const json = JSON.stringify(artifact, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.id}_v${record.versionNumber}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border overflow-hidden border-primary/20">
      <CardHeader className="pb-2 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn('p-1.5 rounded-md', artifact.isValid ? 'bg-emerald-500/10' : 'bg-destructive/10')}>
              {artifact.isValid ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm truncate">
                {ARTIFACT_LABELS[record.type] ?? record.type}
              </CardTitle>
              <p className="text-xs text-muted-foreground truncate">
                {artifact.id} · v{artifact.version}
                <span className="ml-1 font-semibold text-primary">(versión #{record.versionNumber})</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">Sesión</Badge>
            <Badge variant="outline" className="text-xs">{artifact.statusLabel}</Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex items-start gap-1.5 p-2 rounded-md bg-amber-500/5 border border-amber-500/20">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[10px] text-amber-700 leading-tight">{artifact.statusDisclaimer}</p>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Readiness</span>
            <span className={cn('font-medium', artifact.readinessPercent === 100 ? 'text-emerald-600' : 'text-amber-600')}>
              {artifact.readinessPercent}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all',
                artifact.readinessPercent === 100 ? 'bg-emerald-500' :
                artifact.readinessPercent >= 70 ? 'bg-amber-500' : 'bg-destructive'
              )}
              style={{ width: `${artifact.readinessPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Generado:</span>
          <span>{new Date(record.generatedAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-7 text-xs">
              <span className="flex items-center gap-1.5"><GitBranch className="h-3 w-3" /> Trazabilidad</span>
              {showDetails ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-1 pt-1 text-[11px]">
              {record.dbRowId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1"><Hash className="h-3 w-3" /> DB ID:</span>
                  <span className="font-mono text-primary">{record.dbRowId.slice(0, 12)}…</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ledger event:</span>
                <span className="font-mono">{record.ledgerEventId ? record.ledgerEventId.slice(0, 12) + '…' : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Evidence:</span>
                <span className="font-mono">{record.evidenceId ? record.evidenceId.slice(0, 12) + '…' : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version Registry:</span>
                <span className="font-mono">{record.versionRegistryId ? record.versionRegistryId.slice(0, 12) + '…' : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1 pt-1 border-t border-border/30 mt-1">
                <Shield className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground italic text-[10px]">
                  Envío real: <strong>bloqueado</strong> (isRealSubmissionBlocked)
                </span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// ── Pre-validation display ──

function PreValidationBanner({ validation, onDismiss }: { validation: ArtifactPreValidation; onDismiss: () => void }) {
  if (validation.isReady && validation.warnings === 0) return null;

  const failedChecks = validation.checks.filter(c => !c.passed);
  if (failedChecks.length === 0) return null;

  return (
    <div className={cn(
      'p-2.5 rounded-lg border text-xs space-y-1.5',
      validation.blockingErrors > 0
        ? 'bg-destructive/5 border-destructive/30'
        : 'bg-amber-500/5 border-amber-500/20'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {validation.blockingErrors > 0 ? (
            <Ban className="h-3.5 w-3.5 text-destructive shrink-0" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          )}
          <span className="font-medium">
            {validation.blockingErrors > 0
              ? `Generación bloqueada — ${validation.blockingErrors} error(es) crítico(s)`
              : `${validation.warnings} advertencia(s)`}
          </span>
        </div>
        <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={onDismiss}>✕</Button>
      </div>
      <div className="space-y-0.5">
        {failedChecks.map(c => (
          <div key={c.id} className="flex items-start gap-1.5 pl-5">
            {c.severity === 'blocking' ? (
              <XCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
            )}
            <span className={cn(c.severity === 'blocking' ? 'text-destructive' : 'text-amber-700')}>
              {c.label}: {c.detail}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Generation action row (P4F: with blocking support) ──

interface GenerateActionProps {
  label: string;
  shortLabel: string;
  artifactType: string;
  onGenerate: () => void;
  isGenerating: boolean;
  existingCount: number;
  dataAvailable: boolean;
  blocked: boolean;
  blockReason?: string;
  dataSourceLabel?: string;
}

function GenerateActionRow({ label, shortLabel, onGenerate, isGenerating, existingCount, dataAvailable, blocked, blockReason, dataSourceLabel }: GenerateActionProps) {
  const isDisabled = isGenerating || blocked;

  return (
    <div className={cn(
      "flex items-center justify-between p-2.5 rounded-lg border bg-card transition-colors",
      blocked ? 'opacity-60' : 'hover:bg-muted/30'
    )}>
      <div className="flex items-center gap-2 min-w-0">
        <FileText className={cn("h-4 w-4 shrink-0", blocked ? 'text-destructive/50' : 'text-muted-foreground')} />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{label}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {existingCount > 0 && (
              <span className="text-[10px] text-muted-foreground">{existingCount} versión(es)</span>
            )}
            {blocked && blockReason && (
              <Badge variant="outline" className="text-[9px] h-4 border-destructive/30 text-destructive">
                {blockReason}
              </Badge>
            )}
            {!blocked && dataSourceLabel && (
              <Badge variant="outline" className={cn("text-[9px] h-4", dataAvailable ? 'border-emerald-500/30 text-emerald-700' : 'border-amber-500/30 text-amber-700')}>
                {dataSourceLabel}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <Button
        size="sm"
        variant={blocked ? 'ghost' : dataAvailable ? 'outline' : 'ghost'}
        onClick={onGenerate}
        disabled={isDisabled}
        className="shrink-0 gap-1.5"
        title={blocked ? blockReason : undefined}
      >
        {isGenerating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : blocked ? <Ban className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        {blocked ? 'Bloqueado' : `Generar ${shortLabel}`}
      </Button>
    </div>
  );
}

// ── Main panel ──

export function P4ArtifactsPanel({ companyId, className }: Props) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed
  const [lastValidation, setLastValidation] = useState<ArtifactPreValidation | null>(null);

  const periodYear = selectedYear;
  const periodMonth = selectedMonth + 1; // 1-indexed

  const years = useMemo(() => {
    const c = now.getFullYear();
    return [c - 1, c, c + 1];
  }, []);

  const {
    isGenerating,
    artifacts: sessionArtifacts,
    generateRLC, generateRNT, generateCRA,
    generateModelo111, generateModelo190,
    validateRLC, validateRNT, validateCRA,
    validate111, validate190,
  } = useP4OfficialArtifacts(companyId);

  // ── Fetch persisted artifacts from DB ──
  const { data: persistedArtifacts = [], isLoading: isLoadingPersisted, refetch: refetchPersisted } = useQuery({
    queryKey: ['hr-p4-persisted-artifacts', companyId],
    queryFn: async (): Promise<OfficialArtifactDBRow[]> => {
      const sb = supabase as unknown as { from: (t: string) => any };
      const { data, error } = await sb
        .from('erp_hr_official_artifacts')
        .select('*')
        .eq('company_id', companyId)
        .in('artifact_type', ['rlc', 'rnt', 'cra', 'modelo_111', 'modelo_190'])
        .is('superseded_by_id', null)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        console.error('[P4ArtifactsPanel] fetch persisted error:', error);
        return [];
      }
      return (data ?? []) as OfficialArtifactDBRow[];
    },
    enabled: !!companyId,
  });

  const persistedCountByType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of persistedArtifacts) {
      counts[row.artifact_type] = (counts[row.artifact_type] ?? 0) + 1;
    }
    return counts;
  }, [persistedArtifacts]);

  useEffect(() => {
    if (sessionArtifacts.length > 0) refetchPersisted();
  }, [sessionArtifacts.length, refetchPersisted]);

  // Clear validation when period changes
  useEffect(() => {
    setLastValidation(null);
  }, [selectedYear, selectedMonth]);

  // ── Fetch company info ──
  const { data: companyInfo } = useQuery({
    queryKey: ['hr-company-info', companyId],
    queryFn: async () => {
      const sb = supabase as unknown as { from: (t: string) => any };
      const { data } = await sb
        .from('erp_hr_companies')
        .select('company_name, cif, ccc')
        .eq('id', companyId)
        .maybeSingle();
      return data as { company_name: string; cif: string; ccc: string } | null;
    },
    enabled: !!companyId,
  });

  // ── PRIMARY SOURCE: Persisted FAN artifact for the selected period ──
  const { data: fanArtifactData } = useQuery({
    queryKey: ['hr-fan-artifact-for-p4', companyId, periodYear, periodMonth],
    queryFn: async () => {
      const sb = supabase as unknown as { from: (t: string) => any };
      const { data } = await sb
        .from('erp_hr_official_artifacts')
        .select('artifact_payload, totals, employee_ids')
        .eq('company_id', companyId)
        .eq('artifact_type', 'fan_cotizacion')
        .eq('period_year', periodYear)
        .eq('period_month', periodMonth)
        .is('superseded_by_id', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as { artifact_payload: Record<string, unknown>; totals: Record<string, number>; employee_ids: string[] } | null;
    },
    enabled: !!companyId,
  });

  // ── SECONDARY SOURCE: Payroll records for the selected period ──
  const { data: payrollData } = useQuery({
    queryKey: ['hr-payroll-records-for-p4e', companyId, periodYear, periodMonth],
    queryFn: async () => {
      const sb = supabase as unknown as { from: (t: string) => any };
      const { data: periods } = await sb
        .from('hr_payroll_periods')
        .select('id, status')
        .eq('company_id', companyId)
        .eq('fiscal_year', periodYear)
        .eq('period_number', periodMonth)
        .limit(1);

      const period = periods?.[0] as { id: string; status: string } | undefined;
      if (!period) return null;

      const { data: records } = await sb
        .from('hr_payroll_records')
        .select('id, employee_id, payroll_period_id, gross_salary, net_salary, total_deductions, employer_cost, calculation_details')
        .eq('payroll_period_id', period.id)
        .limit(500);

      return {
        periodId: period.id,
        periodStatus: period.status,
        records: (records ?? []) as PayrollRecordRow[],
      };
    },
    enabled: !!companyId,
  });

  // ── Resolve best cotización data source ──
  const cotizacionData = useMemo((): CotizacionData => {
    // Priority 1: FAN artifact payload
    if (fanArtifactData?.artifact_payload) {
      const payload = fanArtifactData.artifact_payload;
      const fanRecords = (payload.records ?? []) as FANEmployeeRecord[];
      const fanTotals = (payload.totals ?? {}) as FANCotizacionTotals;

      if (fanRecords.length > 0) {
        const irpfCount = fanRecords.filter(r => r.retencionIRPF > 0 || r.tipoIRPF > 0).length;
        return {
          source: 'fan_artifact',
          records: fanRecords,
          totals: fanTotals,
          sourceLabel: `FAN persistido (${fanRecords.length} trabajadores)`,
          irpfAvailableCount: irpfCount,
        };
      }
    }

    // Priority 2: Payroll records with calculation_details.bases
    if (payrollData?.records && payrollData.records.length > 0) {
      const withBases = payrollData.records.filter(r => {
        const d = r.calculation_details;
        return d && typeof d === 'object' && 'bases' in d;
      });

      if (withBases.length > 0) {
        const records = withBases.map(buildFANRecordFromPayroll);
        const totals = aggregateTotals(records);
        const irpfCount = records.filter(r => r.retencionIRPF > 0).length;
        return {
          source: 'payroll_records',
          records,
          totals,
          sourceLabel: `Nómina calculada (${records.length} empleados)`,
          irpfAvailableCount: irpfCount,
        };
      }

      // Payroll exists but without SS detail
      if (payrollData.records.length > 0) {
        const records = payrollData.records.map(buildFANRecordFromPayroll);
        const totals = aggregateTotals(records);
        const irpfCount = records.filter(r => r.retencionIRPF > 0).length;
        return {
          source: 'payroll_records',
          records,
          totals,
          sourceLabel: `Nómina sin desglose SS (${records.length} empleados)`,
          irpfAvailableCount: irpfCount,
        };
      }
    }

    return {
      source: 'none',
      records: [],
      totals: {
        totalBasesCC: 0, totalBasesAT: 0, totalHorasExtra: 0,
        totalCotizacionTrabajador: 0, totalCotizacionEmpresa: 0,
        totalCotizacionGeneral: 0, totalRetencionIRPF: 0,
        totalLiquidoEstimado: 0, liquidoEsEstimado: true,
      },
      sourceLabel: 'Sin datos disponibles',
      irpfAvailableCount: 0,
    };
  }, [fanArtifactData, payrollData]);

  const hasSSData = cotizacionData.source !== 'none';
  const payrollClosed = payrollData?.periodStatus === 'closed' || payrollData?.periodStatus === 'locked';
  const fanGenerated = cotizacionData.source === 'fan_artifact';

  // ── Pre-validation results (computed reactively) ──
  const ssPreValidation = useMemo((): ArtifactPreValidation | null => {
    if (!companyInfo) return null;
    return validateRLC({
      companyCCC: companyInfo.ccc ?? '',
      companyCIF: companyInfo.cif ?? '',
      employeeCount: cotizacionData.records.length,
      allHaveNAF: cotizacionData.records.every(r => r.naf && r.naf.length > 0),
      periodYear,
      periodMonth,
      payrollClosed,
      fanGenerated,
    });
  }, [companyInfo, cotizacionData, periodYear, periodMonth, payrollClosed, fanGenerated, validateRLC]);

  // ── Fetch trimester payroll availability for real 111 pre-validation (P4G M2 fix) ──
  const trimesterForMonth = Math.ceil(periodMonth / 3);
  const trimesterStartMonth = (trimesterForMonth - 1) * 3 + 1;
  const trimesterMonths = [trimesterStartMonth, trimesterStartMonth + 1, trimesterStartMonth + 2];

  const { data: trimesterAvailability } = useQuery({
    queryKey: ['hr-trimester-availability', companyId, periodYear, trimesterForMonth],
    queryFn: async () => {
      const sb = supabase as unknown as { from: (t: string) => any };
      const { data: periods } = await sb
        .from('hr_payroll_periods')
        .select('id, period_number, status')
        .eq('company_id', companyId)
        .eq('fiscal_year', periodYear)
        .in('period_number', trimesterMonths)
        .limit(3);

      const found = (periods ?? []) as Array<{ id: string; period_number: number; status: string }>;
      const monthsWithData: number[] = [];
      let allClosed = true;
      for (const m of trimesterMonths) {
        const p = found.find(f => f.period_number === m);
        if (p) {
          monthsWithData.push(m);
          if (p.status !== 'closed' && p.status !== 'locked') allClosed = false;
        }
      }
      return { monthsWithData, monthsAvailable: monthsWithData.length, allClosed: monthsWithData.length > 0 && allClosed };
    },
    enabled: !!companyId,
  });

  const m111PreValidation = useMemo((): ArtifactPreValidation | null => {
    if (!companyInfo) return null;
    return validate111({
      companyCIF: companyInfo.cif ?? '',
      fiscalYear: periodYear,
      trimester: trimesterForMonth,
      monthsAvailable: trimesterAvailability?.monthsAvailable ?? 0,
      allMonthsClosed: trimesterAvailability?.allClosed ?? false,
    });
  }, [companyInfo, periodYear, trimesterForMonth, trimesterAvailability, validate111]);

  const m190PreValidation = useMemo((): ArtifactPreValidation | null => {
    if (!companyInfo) return null;
    return validate190({
      companyCIF: companyInfo.cif ?? '',
      fiscalYear: periodYear,
      perceptorCount: 0, // 190 requires perceptor lines which we don't have yet
      allHaveNIF: false,
      quarterly111Count: persistedCountByType['modelo_111'] ?? 0,
    });
  }, [companyInfo, periodYear, persistedCountByType, validate190]);

  // Determine blocking state for each artifact type
  const ssBlocked = !hasSSData || (ssPreValidation?.blockingErrors ?? 0) > 0;
  const ssBlockReason = !hasSSData ? 'Sin datos de cotización' :
    (ssPreValidation?.blockingErrors ?? 0) > 0 ? `${ssPreValidation!.blockingErrors} pre-check(s) bloqueante(s)` : undefined;

  const m111Blocked = (m111PreValidation?.blockingErrors ?? 0) > 0;
  const m111BlockReason = m111Blocked ? `${m111PreValidation!.blockingErrors} pre-check(s) bloqueante(s)` : undefined;

  const m190Blocked = (m190PreValidation?.blockingErrors ?? 0) > 0;
  const m190BlockReason = m190Blocked ? `${m190PreValidation!.blockingErrors} pre-check(s) bloqueante(s)` : undefined;

  // ── Generation handlers ──

  const handleGenerateSSArtifact = async (type: 'rlc' | 'rnt' | 'cra') => {
    if (!companyInfo) {
      toast.error('Información de empresa no disponible');
      return;
    }

    // Run pre-validation and block
    const preVal = type === 'rlc' ? validateRLC({
      companyCCC: companyInfo.ccc ?? '', companyCIF: companyInfo.cif ?? '',
      employeeCount: cotizacionData.records.length,
      allHaveNAF: cotizacionData.records.every(r => r.naf && r.naf.length > 0),
      periodYear, periodMonth, payrollClosed, fanGenerated,
    }) : type === 'rnt' ? validateRNT({
      companyCCC: companyInfo.ccc ?? '', companyCIF: companyInfo.cif ?? '',
      employeeCount: cotizacionData.records.length,
      allHaveNAF: cotizacionData.records.every(r => r.naf && r.naf.length > 0),
      periodYear, periodMonth, payrollClosed, fanGenerated,
    }) : validateCRA({
      companyCCC: companyInfo.ccc ?? '', companyCIF: companyInfo.cif ?? '',
      employeeCount: cotizacionData.records.length,
      allHaveNAF: cotizacionData.records.every(r => r.naf && r.naf.length > 0),
      periodYear, periodMonth, payrollClosed, fanGenerated,
    });

    setLastValidation(preVal);

    if (preVal.blockingErrors > 0) {
      toast.error(`Generación bloqueada: ${preVal.blockingErrors} error(es) en pre-validación`, { duration: 5000 });
      return;
    }

    if (!hasSSData) {
      toast.error('No hay datos de cotización disponibles para este período. Genera primero un FAN o calcula nóminas.', { duration: 5000 });
      return;
    }

    if (preVal.warnings > 0) {
      toast.warning(`Generando con ${preVal.warnings} advertencia(s). Revisa el resultado.`, { duration: 4000 });
    }

    const params = {
      companyCIF: companyInfo.cif ?? '',
      companyCCC: companyInfo.ccc ?? '',
      companyName: companyInfo.company_name ?? '',
      periodYear,
      periodMonth,
      records: cotizacionData.records,
      totals: cotizacionData.totals,
    };

    if (type === 'rlc') await generateRLC(params);
    else if (type === 'rnt') await generateRNT(params);
    else await generateCRA({ ...params, records: params.records });
  };

  const handleGenerateModelo111 = async () => {
    if (!companyInfo) {
      toast.error('Información de empresa no disponible');
      return;
    }
    const trimester = Math.ceil(periodMonth / 3);
    const startMonth = (trimester - 1) * 3 + 1;

    // Build monthInputs: for each month of the trimester, extract IRPF-only data
    const monthInputs = await Promise.all([0, 1, 2].map(async (offset) => {
      const m = startMonth + offset;

      const sb = supabase as unknown as { from: (t: string) => any };
      const { data: periods } = await sb
        .from('hr_payroll_periods')
        .select('id, status')
        .eq('company_id', companyId)
        .eq('fiscal_year', periodYear)
        .eq('period_number', m)
        .limit(1);

      const period = periods?.[0] as { id: string; status: string } | undefined;
      if (!period) {
        return {
          periodYear,
          periodMonth: m,
          perceptoresCount: 0,
          perceptorIds: undefined,
          baseImponible: 0,
          retencionPracticada: 0,
          irpfIsEstimated: true,
          payrollClosed: false,
        };
      }

      const { data: records } = await sb
        .from('hr_payroll_records')
        .select('employee_id, gross_salary, total_deductions, calculation_details')
        .eq('payroll_period_id', period.id)
        .limit(500);

      const recs = (records ?? []) as Array<{
        employee_id: string;
        gross_salary: number;
        total_deductions: number;
        calculation_details: Record<string, unknown> | null;
      }>;

      const perceptorIds = [...new Set(recs.map(r => r.employee_id).filter(Boolean))];

      // P4F FIX: Extract IRPF-only, NOT total_deductions
      let totalIRPF = 0;
      let totalBaseIRPF = 0;
      let irpfExtractedCount = 0;

      for (const rec of recs) {
        const irpf = extractIRPFFromRecord(rec.calculation_details);
        if (irpf.irpfAvailable) {
          totalIRPF += irpf.retencionIRPF;
          irpfExtractedCount++;
        }
        // Base imponible from calculation_details or gross_salary
        const bases = (rec.calculation_details?.bases ?? {}) as Record<string, number>;
        totalBaseIRPF += Number(bases.baseIRPF ?? rec.gross_salary ?? 0);
      }

      return {
        periodYear,
        periodMonth: m,
        perceptoresCount: perceptorIds.length,
        perceptorIds: perceptorIds.length > 0 ? perceptorIds : undefined,
        baseImponible: r2(totalBaseIRPF),
        retencionPracticada: r2(totalIRPF),
        irpfIsEstimated: irpfExtractedCount < recs.length,
        payrollClosed: period.status === 'closed' || period.status === 'locked',
      };
    }));

    // Run pre-validation
    const monthsWithData = monthInputs.filter(m => m.perceptoresCount > 0).length;
    const allClosed = monthInputs.every(m => m.payrollClosed || m.perceptoresCount === 0);

    const preVal = validate111({
      companyCIF: companyInfo.cif ?? '',
      fiscalYear: periodYear,
      trimester,
      monthsAvailable: monthsWithData,
      allMonthsClosed: allClosed,
    });

    setLastValidation(preVal);

    if (preVal.blockingErrors > 0) {
      toast.error(`Generación Mod. 111 bloqueada: ${preVal.blockingErrors} error(es) en pre-validación`, { duration: 5000 });
      return;
    }

    // Warn about estimated IRPF
    const estimatedMonths = monthInputs.filter(m => m.irpfIsEstimated && m.perceptoresCount > 0);
    if (estimatedMonths.length > 0) {
      toast.warning(
        `IRPF estimado en ${estimatedMonths.length} mes(es): se usó gross_salary como base porque no se encontró desglose IRPF detallado.`,
        { duration: 6000 },
      );
    }

    if (preVal.warnings > 0) {
      toast.warning(`Generando Mod. 111 con ${preVal.warnings} advertencia(s).`, { duration: 4000 });
    }

    await generateModelo111({
      companyCIF: companyInfo.cif ?? '',
      companyName: companyInfo.company_name ?? '',
      fiscalYear: periodYear,
      trimester,
      monthInputs,
    });
  };

  const handleGenerateModelo190 = async () => {
    if (!companyInfo) {
      toast.error('Información de empresa no disponible');
      return;
    }

    const preVal = validate190({
      companyCIF: companyInfo.cif ?? '',
      fiscalYear: periodYear,
      perceptorCount: 0,
      allHaveNIF: false,
      quarterly111Count: persistedCountByType['modelo_111'] ?? 0,
    });

    setLastValidation(preVal);

    if (preVal.blockingErrors > 0) {
      toast.error(`Generación Mod. 190 bloqueada: ${preVal.blockingErrors} error(es). Se necesitan perceptores con NIF y Modelos 111 previos.`, { duration: 6000 });
      return;
    }

    await generateModelo190({
      companyCIF: companyInfo.cif ?? '',
      companyName: companyInfo.company_name ?? '',
      fiscalYear: periodYear,
      perceptorLines: [],
    });
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Artefactos Oficiales P4</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                RLC · RNT · CRA · Modelo 111 · Modelo 190
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isGenerating && (
              <Badge variant="outline" className="text-xs animate-pulse">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Generando…
              </Badge>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetchPersisted()} disabled={isLoadingPersisted}>
              <RefreshCw className={cn('h-4 w-4', isLoadingPersisted && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        <ScrollArea className="max-h-[700px]">
          <div className="space-y-4">
            {/* Period selector */}
            <div className="flex items-center gap-3">
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_LABELS.map((label, i) => (
                    <SelectItem key={i} value={String(i)}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data source indicator */}
            <div className={cn(
              'flex items-center gap-2 p-2 rounded-md border text-xs',
              cotizacionData.source === 'fan_artifact'
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700'
                : cotizacionData.source === 'payroll_records'
                  ? 'bg-amber-500/5 border-amber-500/20 text-amber-700'
                  : 'bg-destructive/5 border-destructive/20 text-destructive'
            )}>
              {cotizacionData.source === 'none' ? (
                <Ban className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Info className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>
                <strong>Fuente de datos SS:</strong> {cotizacionData.sourceLabel}
                {cotizacionData.source === 'fan_artifact' && ' — datos completos de cotización'}
                {cotizacionData.source === 'payroll_records' && ` — IRPF disponible en ${cotizacionData.irpfAvailableCount}/${cotizacionData.records.length} trabajadores`}
                {cotizacionData.source === 'none' && ` para ${MONTH_LABELS[selectedMonth]} ${selectedYear}. Generación de SS bloqueada.`}
              </span>
            </div>

            {/* Pre-validation banner */}
            {lastValidation && (
              <PreValidationBanner validation={lastValidation} onDismiss={() => setLastValidation(null)} />
            )}

            {/* Generation triggers */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Generar artefactos — {MONTH_LABELS[selectedMonth]} {selectedYear}
              </h4>
              <div className="space-y-1.5">
                <GenerateActionRow
                  label={ARTIFACT_LABELS.rlc}
                  shortLabel={ARTIFACT_SHORT.rlc}
                  artifactType="rlc"
                  onGenerate={() => handleGenerateSSArtifact('rlc')}
                  isGenerating={isGenerating}
                  existingCount={persistedCountByType['rlc'] ?? 0}
                  dataAvailable={hasSSData}
                  blocked={ssBlocked}
                  blockReason={ssBlockReason}
                  dataSourceLabel={hasSSData ? cotizacionData.source === 'fan_artifact' ? 'FAN' : 'Nómina' : undefined}
                />
                <GenerateActionRow
                  label={ARTIFACT_LABELS.rnt}
                  shortLabel={ARTIFACT_SHORT.rnt}
                  artifactType="rnt"
                  onGenerate={() => handleGenerateSSArtifact('rnt')}
                  isGenerating={isGenerating}
                  existingCount={persistedCountByType['rnt'] ?? 0}
                  dataAvailable={hasSSData}
                  blocked={ssBlocked}
                  blockReason={ssBlockReason}
                  dataSourceLabel={hasSSData ? cotizacionData.source === 'fan_artifact' ? 'FAN' : 'Nómina' : undefined}
                />
                <GenerateActionRow
                  label={ARTIFACT_LABELS.cra}
                  shortLabel={ARTIFACT_SHORT.cra}
                  artifactType="cra"
                  onGenerate={() => handleGenerateSSArtifact('cra')}
                  isGenerating={isGenerating}
                  existingCount={persistedCountByType['cra'] ?? 0}
                  dataAvailable={hasSSData}
                  blocked={ssBlocked}
                  blockReason={ssBlockReason}
                  dataSourceLabel={hasSSData ? cotizacionData.source === 'fan_artifact' ? 'FAN' : 'Nómina' : undefined}
                />
                <GenerateActionRow
                  label={ARTIFACT_LABELS.modelo_111}
                  shortLabel={ARTIFACT_SHORT.modelo_111}
                  artifactType="modelo_111"
                  onGenerate={handleGenerateModelo111}
                  isGenerating={isGenerating}
                  existingCount={persistedCountByType['modelo_111'] ?? 0}
                  dataAvailable={!m111Blocked}
                  blocked={m111Blocked}
                  blockReason={m111BlockReason}
                  dataSourceLabel={!m111Blocked ? 'Nómina (IRPF)' : undefined}
                />
                <GenerateActionRow
                  label={ARTIFACT_LABELS.modelo_190}
                  shortLabel={ARTIFACT_SHORT.modelo_190}
                  artifactType="modelo_190"
                  onGenerate={handleGenerateModelo190}
                  isGenerating={isGenerating}
                  existingCount={persistedCountByType['modelo_190'] ?? 0}
                  dataAvailable={!m190Blocked}
                  blocked={m190Blocked}
                  blockReason={m190BlockReason}
                />
              </div>
            </div>

            <Separator />

            {/* Disclaimer */}
            <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[10px] text-amber-700 leading-relaxed">
                  Todos los artefactos son internos preparatorios — NO constituyen presentación oficial.
                  El envío real a TGSS/AEAT está bloqueado.
                </p>
              </div>
            </div>

            {/* Session artifacts (recently generated) */}
            {sessionArtifacts.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Generados en esta sesión ({sessionArtifacts.length})
                </h4>
                <div className="space-y-2">
                  {sessionArtifacts.map((record, i) => (
                    <ArtifactRecordCard key={record.artifact.id + '-' + i} record={record} />
                  ))}
                </div>
              </div>
            )}

            {/* Persisted artifacts from DB */}
            {persistedArtifacts.length > 0 && (
              <>
                {sessionArtifacts.length > 0 && <Separator />}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Artefactos persistidos ({persistedArtifacts.length})
                  </h4>
                  <div className="space-y-2">
                    {persistedArtifacts.map(row => (
                      <PersistedArtifactCard key={row.id} row={row} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Empty state */}
            {sessionArtifacts.length === 0 && persistedArtifacts.length === 0 && !isLoadingPersisted && (
              <div className="text-center py-6 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay artefactos P4 generados.</p>
                <p className="text-xs mt-1">
                  Usa los botones de arriba para generar artefactos oficiales.
                </p>
              </div>
            )}

            {isLoadingPersisted && (
              <div className="text-center py-4 text-muted-foreground text-xs">
                <RefreshCw className="h-4 w-4 mx-auto mb-1 animate-spin" />
                Cargando artefactos persistidos…
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default P4ArtifactsPanel;
