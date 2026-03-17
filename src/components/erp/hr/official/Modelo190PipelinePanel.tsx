/**
 * Modelo190PipelinePanel — V2-RRHH-PINST
 * UI for the Model 190 annual perceptor pipeline.
 * Allows aggregation, quality review, persistence, and generation.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  Database, Play, Info, FileText, BarChart3, Save,
} from 'lucide-react';
import { useModelo190Pipeline } from '@/hooks/erp/hr/useModelo190Pipeline';
import { useP4OfficialArtifacts } from '@/hooks/erp/hr/useP4OfficialArtifacts';
import { cn } from '@/lib/utils';

interface Props {
  companyId: string;
  className?: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function Modelo190PipelinePanel({ companyId, className }: Props) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const years = useMemo(() => [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1], []);

  const {
    perceptors,
    isLoading,
    isAggregating,
    lastResult,
    refetch,
    aggregatePerceptors,
    persistPerceptors,
    getPipelineReadiness,
  } = useModelo190Pipeline(companyId);

  const { generateModelo190 } = useP4OfficialArtifacts(companyId);

  const yearPerceptors = useMemo(() =>
    perceptors.filter(p => p.fiscal_year === selectedYear),
    [perceptors, selectedYear]
  );

  const readiness = useMemo(() => getPipelineReadiness(selectedYear), [getPipelineReadiness, selectedYear]);

  const handleAggregate = async () => {
    await aggregatePerceptors(selectedYear);
  };

  const handlePersist = async () => {
    if (!lastResult) return;
    await persistPerceptors(selectedYear, lastResult);
  };

  const handleGenerate190 = async () => {
    if (yearPerceptors.length === 0) return;

    // Convert to Modelo190LineItem format
    const lines = yearPerceptors.map(p => ({
      employee_id: p.employee_id,
      employee_name: p.employee_name,
      nif: p.nif,
      clave_percepcion: p.clave_percepcion,
      subclave: p.subclave,
      percepciones_integras: p.percepciones_integras,
      retenciones_practicadas: p.retenciones_practicadas,
      percepciones_en_especie: p.percepciones_en_especie,
      ingresos_a_cuenta: p.ingresos_a_cuenta,
    }));

    // Get company info
    const sb = (await import('@/integrations/supabase/client')).supabase as unknown as { from: (t: string) => any };
    const { data: companyInfo } = await sb
      .from('erp_hr_companies')
      .select('company_name, cif')
      .eq('id', companyId)
      .maybeSingle();

    await generateModelo190({
      companyCIF: companyInfo?.cif ?? '',
      companyName: companyInfo?.company_name ?? '',
      fiscalYear: selectedYear,
      perceptorLines: lines,
      totalRetencionesFrom111: lastResult?.crossCheckData.sumRetenciones111,
    });
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-purple-500/5 via-indigo-500/5 to-blue-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Users className="h-5 w-5 text-purple-700" />
            </div>
            <div>
              <CardTitle className="text-base">Pipeline Modelo 190</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Agregación anual de perceptores
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-4">
            {/* Pipeline actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={handleAggregate}
                disabled={isAggregating}
                className="gap-1.5"
              >
                {isAggregating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Agregar perceptores {selectedYear}
              </Button>

              {lastResult && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePersist}
                  disabled={isAggregating}
                  className="gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  Persistir ({lastResult.perceptorLines.length})
                </Button>
              )}

              {yearPerceptors.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleGenerate190}
                  disabled={isAggregating || !readiness.ready}
                  className="gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Generar Modelo 190
                </Button>
              )}
            </div>

            {/* Readiness */}
            <div className={cn(
              'p-2 rounded-md border text-xs space-y-1',
              readiness.ready ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'
            )}>
              <div className="flex items-center gap-1.5">
                {readiness.ready ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                <span className="font-medium">
                  {readiness.ready ? 'Pipeline listo' : `${readiness.blockers.length} bloqueo(s)`}
                </span>
              </div>
              {readiness.blockers.map((b, i) => (
                <div key={i} className="flex items-center gap-1 pl-5 text-destructive">
                  <XCircle className="h-3 w-3" /> {b}
                </div>
              ))}
              {readiness.warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-1 pl-5 text-amber-700">
                  <AlertTriangle className="h-3 w-3" /> {w}
                </div>
              ))}
            </div>

            {/* Aggregation result */}
            {lastResult && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Resultado de agregación
                  </h4>

                  {/* Quality score */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Calidad de datos:</span>
                    <Progress value={lastResult.qualityReport.dataQualityScore} className="flex-1 h-2" />
                    <span className={cn('text-xs font-medium',
                      lastResult.qualityReport.dataQualityScore >= 70 ? 'text-emerald-600' : 'text-amber-600'
                    )}>
                      {lastResult.qualityReport.dataQualityScore}%
                    </span>
                  </div>

                  {/* Summary stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground">Perceptores:</span>
                      <span className="ml-1 font-medium">{lastResult.qualityReport.totalPerceptors}</span>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground">Con NIF:</span>
                      <span className="ml-1 font-medium">{lastResult.qualityReport.perceptorsWithNIF}</span>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground">Datos completos:</span>
                      <span className="ml-1 font-medium">{lastResult.qualityReport.perceptorsWithFullData}</span>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <span className="text-muted-foreground">Con estimación:</span>
                      <span className="ml-1 font-medium">{lastResult.qualityReport.perceptorsWithEstimation}</span>
                    </div>
                  </div>

                  {/* Cross-check */}
                  <div className={cn(
                    'p-2 rounded-md border text-xs',
                    lastResult.crossCheckData.isConsistent
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700'
                      : 'bg-amber-500/5 border-amber-500/20 text-amber-700'
                  )}>
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5" />
                      <span>
                        Cross-check Σ111: {r2(lastResult.crossCheckData.sumRetenciones111)}€ vs 190: {r2(lastResult.crossCheckData.totalRetenciones190)}€
                        {lastResult.crossCheckData.isConsistent ? ' ✓' : ` (dif: ${r2(lastResult.crossCheckData.difference)}€)`}
                      </span>
                    </div>
                  </div>

                  {/* Edge cases */}
                  {(lastResult.regulatoryEdgeCases.familySituationChanges > 0 ||
                    lastResult.regulatoryEdgeCases.irregularIncomeEntries > 0 ||
                    lastResult.regulatoryEdgeCases.zeroRetentionCases > 0) && (
                    <div className="p-2 rounded-md bg-muted/30 text-xs space-y-0.5">
                      <span className="font-medium text-muted-foreground">Casuística normativa:</span>
                      {lastResult.regulatoryEdgeCases.familySituationChanges > 0 && (
                        <div className="pl-2">Cambios situación familiar: {lastResult.regulatoryEdgeCases.familySituationChanges}</div>
                      )}
                      {lastResult.regulatoryEdgeCases.irregularIncomeEntries > 0 && (
                        <div className="pl-2">Rentas irregulares: {lastResult.regulatoryEdgeCases.irregularIncomeEntries}</div>
                      )}
                      {lastResult.regulatoryEdgeCases.zeroRetentionCases > 0 && (
                        <div className="pl-2">Retención 0%: {lastResult.regulatoryEdgeCases.zeroRetentionCases} ({lastResult.qualityReport.zeroRetentionJustified} justificados)</div>
                      )}
                      {lastResult.regulatoryEdgeCases.undocumentedItems.length > 0 && (
                        <div className="pl-2 text-amber-700">
                          ⚠ Sin documentar: {lastResult.regulatoryEdgeCases.undocumentedItems.length} items
                        </div>
                      )}
                    </div>
                  )}

                  {/* Issues */}
                  {lastResult.qualityReport.issues.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Incidencias ({lastResult.qualityReport.issues.length}):
                      </span>
                      <div className="max-h-32 overflow-y-auto space-y-0.5">
                        {lastResult.qualityReport.issues.slice(0, 20).map((issue, i) => (
                          <div key={i} className={cn('flex items-start gap-1 text-[10px] pl-2',
                            issue.severity === 'error' ? 'text-destructive' : issue.severity === 'warning' ? 'text-amber-700' : 'text-muted-foreground'
                          )}>
                            {issue.severity === 'error' ? <XCircle className="h-3 w-3 shrink-0 mt-0.5" /> :
                              issue.severity === 'warning' ? <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" /> :
                                <Info className="h-3 w-3 shrink-0 mt-0.5" />}
                            <span>{issue.employeeName}: {issue.issue}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Persisted perceptors */}
            {yearPerceptors.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Perceptores persistidos ({yearPerceptors.length}) — {selectedYear}
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-0.5">
                    {yearPerceptors.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-[10px] p-1.5 rounded bg-muted/20">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-muted-foreground w-16 shrink-0">{p.nif || '—'}</span>
                          <span className="truncate">{p.employee_name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span>{r2(p.percepciones_integras)}€</span>
                          <span className="text-muted-foreground">ret: {r2(p.retenciones_practicadas)}€</span>
                          <Badge variant="outline" className="text-[8px] h-4">{p.data_quality}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Empty */}
            {yearPerceptors.length === 0 && !lastResult && !isLoading && (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Sin perceptores para {selectedYear}.</p>
                <p className="text-xs mt-1">
                  Ejecuta "Agregar perceptores" para procesar los datos de nómina del ejercicio.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default Modelo190PipelinePanel;
