/**
 * P4ArtifactsPanel — V2-RRHH-P4D
 * UI consumer for useP4OfficialArtifacts: allows generating and viewing
 * RLC, RNT, CRA, Modelo 111, Modelo 190 artifacts from runtime.
 * P4D: + generation triggers + persisted artifacts from DB + cleanup
 */

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  FileText, CheckCircle, XCircle, AlertTriangle, Clock,
  ChevronDown, ChevronRight, Shield, RefreshCw, Download,
  GitBranch, Hash, AlertCircle, Package, Play, Database,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useP4OfficialArtifacts, type P4ArtifactRecord } from '@/hooks/erp/hr/useP4OfficialArtifacts';
import type { OfficialArtifactDBRow } from '@/hooks/erp/hr/useOfficialArtifacts';
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

// ── Generation action row ──

interface GenerateActionProps {
  label: string;
  shortLabel: string;
  artifactType: string;
  onGenerate: () => void;
  isGenerating: boolean;
  existingCount: number;
}

function GenerateActionRow({ label, shortLabel, artifactType, onGenerate, isGenerating, existingCount }: GenerateActionProps) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{label}</p>
          {existingCount > 0 && (
            <p className="text-[10px] text-muted-foreground">{existingCount} versión(es) existente(s)</p>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onGenerate}
        disabled={isGenerating}
        className="shrink-0 gap-1.5"
      >
        {isGenerating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
        Generar {shortLabel}
      </Button>
    </div>
  );
}

// ── Main panel ──

export function P4ArtifactsPanel({ companyId, className }: Props) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const {
    isGenerating,
    artifacts: sessionArtifacts,
    generateRLC, generateRNT, generateCRA,
    generateModelo111, generateModelo190,
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

  // Count persisted per type
  const persistedCountByType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of persistedArtifacts) {
      counts[row.artifact_type] = (counts[row.artifact_type] ?? 0) + 1;
    }
    return counts;
  }, [persistedArtifacts]);

  // Refetch persisted when session artifacts change (new generation)
  useEffect(() => {
    if (sessionArtifacts.length > 0) {
      refetchPersisted();
    }
  }, [sessionArtifacts.length, refetchPersisted]);

  // ── Fetch company info for generation params ──
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

  // ── Fetch payroll records for perceptorIds (Modelo 111) ──
  const { data: payrollRecords = [] } = useQuery({
    queryKey: ['hr-payroll-records-for-p4', companyId, currentYear],
    queryFn: async () => {
      const sb = supabase as unknown as { from: (t: string) => any };
      const { data } = await sb
        .from('hr_payroll_records')
        .select('id, employee_id, payroll_period_id, gross_salary, net_salary, total_deductions, employer_cost, calculation_details')
        .eq('company_id', companyId)
        .limit(500);
      return (data ?? []) as Array<{
        id: string;
        employee_id: string;
        payroll_period_id: string;
        gross_salary: number;
        net_salary: number;
        total_deductions: number;
        employer_cost: number;
        calculation_details: Record<string, unknown> | null;
      }>;
    },
    enabled: !!companyId,
  });

  // ── Generation handlers ──

  const handleGenerateSSArtifact = async (type: 'rlc' | 'rnt' | 'cra') => {
    if (!companyInfo) {
      toast.error('Información de empresa no disponible');
      return;
    }
    const params = {
      companyCIF: companyInfo.cif ?? '',
      companyCCC: companyInfo.ccc ?? '',
      companyName: companyInfo.company_name ?? '',
      periodYear: currentYear,
      periodMonth: currentMonth,
      records: [] as import('@/engines/erp/hr/fanCotizacionArtifactEngine').FANEmployeeRecord[],
      totals: {
        totalBasesCC: 0,
        totalBasesAT: 0,
        totalHorasExtra: 0,
        totalCotizacionEmpresa: 0,
        totalCotizacionTrabajador: 0,
        totalCotizacionGeneral: 0,
        totalRetencionIRPF: 0,
        totalLiquidoEstimado: 0,
        liquidoEsEstimado: true,
        totalBonificaciones: 0,
        totalLiquidacion: 0,
      },
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
    const trimester = Math.ceil(currentMonth / 3);
    const startMonth = (trimester - 1) * 3 + 1;

    // Build monthInputs with real perceptorIds from payroll records
    const monthInputs = [0, 1, 2].map(offset => {
      const m = startMonth + offset;
      // Gather unique employee IDs for this month from payroll records
      const monthRecords = payrollRecords.filter(r => {
        const details = r.calculation_details as Record<string, unknown> | null;
        const periodMonth = details?.periodMonth ?? details?.period_month;
        return periodMonth === m;
      });
      const perceptorIds = [...new Set(monthRecords.map(r => r.employee_id).filter(Boolean))];
      
      return {
        periodYear: currentYear,
        periodMonth: m,
        perceptoresCount: perceptorIds.length || monthRecords.length,
        perceptorIds: perceptorIds.length > 0 ? perceptorIds : undefined,
        baseImponible: monthRecords.reduce((s, r) => s + (r.gross_salary ?? 0), 0),
        retencionPracticada: monthRecords.reduce((s, r) => s + (r.total_deductions ?? 0), 0),
        payrollClosed: true,
      } satisfies import('@/engines/erp/hr/aeatArtifactEngine').Modelo111MonthInput;
    });

    await generateModelo111({
      companyCIF: companyInfo.cif ?? '',
      companyName: companyInfo.company_name ?? '',
      fiscalYear: currentYear,
      trimester,
      monthInputs,
    });
  };

  const handleGenerateModelo190 = async () => {
    if (!companyInfo) {
      toast.error('Información de empresa no disponible');
      return;
    }
    await generateModelo190({
      companyCIF: companyInfo.cif ?? '',
      companyName: companyInfo.company_name ?? '',
      fiscalYear: currentYear,
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
            {/* Generation triggers */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Generar artefactos
              </h4>
              <div className="space-y-1.5">
                <GenerateActionRow
                  label={ARTIFACT_LABELS.rlc}
                  shortLabel={ARTIFACT_SHORT.rlc}
                  artifactType="rlc"
                  onGenerate={() => handleGenerateSSArtifact('rlc')}
                  isGenerating={isGenerating}
                  existingCount={persistedCountByType['rlc'] ?? 0}
                />
                <GenerateActionRow
                  label={ARTIFACT_LABELS.rnt}
                  shortLabel={ARTIFACT_SHORT.rnt}
                  artifactType="rnt"
                  onGenerate={() => handleGenerateSSArtifact('rnt')}
                  isGenerating={isGenerating}
                  existingCount={persistedCountByType['rnt'] ?? 0}
                />
                <GenerateActionRow
                  label={ARTIFACT_LABELS.cra}
                  shortLabel={ARTIFACT_SHORT.cra}
                  artifactType="cra"
                  onGenerate={() => handleGenerateSSArtifact('cra')}
                  isGenerating={isGenerating}
                  existingCount={persistedCountByType['cra'] ?? 0}
                />
                <GenerateActionRow
                  label={ARTIFACT_LABELS.modelo_111}
                  shortLabel={ARTIFACT_SHORT.modelo_111}
                  artifactType="modelo_111"
                  onGenerate={handleGenerateModelo111}
                  isGenerating={isGenerating}
                  existingCount={persistedCountByType['modelo_111'] ?? 0}
                />
                <GenerateActionRow
                  label={ARTIFACT_LABELS.modelo_190}
                  shortLabel={ARTIFACT_SHORT.modelo_190}
                  artifactType="modelo_190"
                  onGenerate={handleGenerateModelo190}
                  isGenerating={isGenerating}
                  existingCount={persistedCountByType['modelo_190'] ?? 0}
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
