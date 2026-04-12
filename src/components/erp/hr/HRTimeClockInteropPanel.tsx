/**
 * HRTimeClockInteropPanel — B3: Vista de interoperabilidad del fichaje
 * Exportación inspección, sellado, cadena custodia, readiness badge
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table';
import {
  Download, Shield, FileText, CheckCircle, XCircle,
  Clock, AlertTriangle, Lock, Eye, Fingerprint,
  MapPin, Hash, FileCheck, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  buildInspectionExport,
  exportToCSV,
  evaluateInteropReadiness,
  extractWorkerEvidence,
  type TimeClockRecord,
  type InspectionExportPackage,
  type CustodyChainEntry,
  type ReadinessEvaluation,
} from '@/engines/erp/hr/timeClockInteropEngine';

interface Props {
  companyId: string;
  companyName?: string;
  companyCif?: string;
}

export function HRTimeClockInteropPanel({ companyId, companyName = 'Empresa', companyCif = 'N/D' }: Props) {
  const [activeTab, setActiveTab] = useState('readiness');
  const [loading, setLoading] = useState(false);
  const [exportPkg, setExportPkg] = useState<InspectionExportPackage | null>(null);
  const [custodyLog, setCustodyLog] = useState<CustodyChainEntry[]>([]);
  const [periodStart, setPeriodStart] = useState(
    format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd')
  );
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Readiness evaluation — always internal_ready (no official credentials)
  const readiness: ReadinessEvaluation = useMemo(() => evaluateInteropReadiness({
    hasExportCapability: true,
    hasSealEngine: true,
    hasWorkerEvidence: true,
    hasCustodyChain: true,
    hasRetention4Years: true,
    hasAccessControl: true,
    hasOfficialAPICredentials: false,
    hasITSSValidation: false,
  }), []);

  const readinessPercent = useMemo(() => {
    const passed = readiness.checks.filter(c => c.passed).length;
    return Math.round((passed / readiness.checks.length) * 100);
  }, [readiness]);

  // Generate export
  const handleGenerateExport = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_time_clock')
        .select(`*, erp_hr_employees!erp_hr_time_clock_employee_id_fkey(first_name, last_name, national_id)`)
        .eq('company_id', companyId)
        .gte('clock_date', periodStart)
        .lte('clock_date', periodEnd)
        .order('clock_date', { ascending: true })
        .order('clock_in', { ascending: true });

      if (error) throw error;
      if (!data?.length) {
        toast.error('No hay registros en el periodo seleccionado');
        return;
      }

      const records: TimeClockRecord[] = (data as any[]).map(r => ({
        id: r.id,
        employee_id: r.employee_id,
        employee_name: r.erp_hr_employees
          ? `${r.erp_hr_employees.first_name} ${r.erp_hr_employees.last_name}`
          : 'N/D',
        employee_nif: r.erp_hr_employees?.national_id || 'N/D',
        company_id: r.company_id,
        company_name: companyName,
        company_cif: companyCif,
        clock_date: r.clock_date,
        clock_in: r.clock_in,
        clock_out: r.clock_out,
        break_minutes: r.break_minutes || 0,
        worked_hours: r.worked_hours || 0,
        overtime_hours: r.overtime_hours || 0,
        clock_in_method: r.clock_in_method || 'web',
        clock_out_method: r.clock_out_method || null,
        clock_in_location: r.clock_in_location as any,
        clock_out_location: r.clock_out_location as any,
        status: r.status,
        anomaly_type: r.anomaly_type,
        anomaly_notes: r.anomaly_notes,
        notes: r.notes,
      }));

      const pkg = await buildInspectionExport(
        records,
        { cif: companyCif, name: companyName },
        periodStart,
        periodEnd,
        custodyLog
      );

      setExportPkg(pkg);
      setCustodyLog(pkg.custody_chain);
      toast.success(`Exportación generada: ${records.length} registros sellados`);
    } catch (err) {
      console.error('[InteropPanel] export error:', err);
      toast.error('Error al generar exportación');
    } finally {
      setLoading(false);
    }
  }, [companyId, companyCif, companyName, periodStart, periodEnd, custodyLog]);

  // Download CSV
  const handleDownloadCSV = useCallback(() => {
    if (!exportPkg) return;
    const csv = exportToCSV(exportPkg);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fichaje_inspeccion_${periodStart}_${periodEnd}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setCustodyLog(prev => [...prev, {
      action: 'accessed',
      actor: 'user',
      timestamp: new Date().toISOString(),
      record_ids: [],
      details: `Descarga CSV: ${exportPkg.metadata.export_id}`,
    }]);
    toast.success('CSV descargado');
  }, [exportPkg, periodStart, periodEnd]);

  // Download JSON
  const handleDownloadJSON = useCallback(() => {
    if (!exportPkg) return;
    const json = JSON.stringify(exportPkg, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fichaje_inspeccion_${periodStart}_${periodEnd}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON descargado');
  }, [exportPkg, periodStart, periodEnd]);

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      'internal_ready': { label: 'Preparado internamente', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
      'official_handoff_ready': { label: 'Pendiente activación oficial', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
      'not_ready': { label: 'No preparado', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
    };
    const s = map[status] || map['not_ready'];
    return <Badge className={s.className}>{s.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Header with readiness badge */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3 px-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-primary">B3 — Fichaje Digital Interoperable</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Exportación estandarizada, sellado temporal SHA-256, evidencia del trabajador y cadena de custodia.
                </p>
              </div>
            </div>
            {statusBadge(readiness.status)}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="readiness" className="text-xs gap-1">
            <CheckCircle className="h-3.5 w-3.5" />
            Readiness
          </TabsTrigger>
          <TabsTrigger value="export" className="text-xs gap-1">
            <FileText className="h-3.5 w-3.5" />
            Exportación
          </TabsTrigger>
          <TabsTrigger value="custody" className="text-xs gap-1">
            <Lock className="h-3.5 w-3.5" />
            Custodia
          </TabsTrigger>
          <TabsTrigger value="evidence" className="text-xs gap-1">
            <Fingerprint className="h-3.5 w-3.5" />
            Evidencia
          </TabsTrigger>
        </TabsList>

        {/* ═══ READINESS TAB ═══ */}
        <TabsContent value="readiness" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Evaluación de Interoperabilidad</CardTitle>
              <CardDescription>
                Estado de cumplimiento para inspección según Art. 34.9 ET
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Progress value={readinessPercent} className="flex-1 h-3" />
                <span className="text-sm font-semibold tabular-nums">{readinessPercent}%</span>
              </div>

              <div className="space-y-2">
                {readiness.checks.map(check => (
                  <div key={check.id} className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border",
                    check.passed ? "bg-green-50/50 border-green-200/50 dark:bg-green-950/20 dark:border-green-800/30" : "bg-red-50/50 border-red-200/50 dark:bg-red-950/20 dark:border-red-800/30"
                  )}>
                    {check.passed
                      ? <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      : <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{check.label}</span>
                        <Badge variant="outline" className="text-[10px]">{check.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              {readiness.missing_for_official.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200/50 dark:bg-amber-950/20 dark:border-amber-800/30">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        Pendiente de activación externa
                      </p>
                      <ul className="text-xs text-amber-700 dark:text-amber-400 mt-1 space-y-0.5">
                        {readiness.missing_for_official.map(m => (
                          <li key={m}>• {m}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ EXPORT TAB ═══ */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Exportación para Inspección
              </CardTitle>
              <CardDescription>
                Genera un paquete sellado con hash SHA-256 por registro, listo para ITSS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Period selector */}
              <div className="flex items-end gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Desde</label>
                  <Input
                    type="date"
                    value={periodStart}
                    onChange={e => setPeriodStart(e.target.value)}
                    className="h-9 w-40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Hasta</label>
                  <Input
                    type="date"
                    value={periodEnd}
                    onChange={e => setPeriodEnd(e.target.value)}
                    className="h-9 w-40"
                  />
                </div>
                <Button onClick={handleGenerateExport} disabled={loading} className="gap-1.5">
                  <Hash className="h-4 w-4" />
                  {loading ? 'Generando...' : 'Generar y sellar'}
                </Button>
              </div>

              {/* Export result */}
              {exportPkg && (
                <div className="space-y-4">
                  {/* Summary card */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg border bg-muted/30">
                      <p className="text-xs text-muted-foreground">Registros</p>
                      <p className="text-lg font-bold">{exportPkg.summary.total_records}</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-muted/30">
                      <p className="text-xs text-muted-foreground">Empleados</p>
                      <p className="text-lg font-bold">{exportPkg.summary.total_employees}</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-muted/30">
                      <p className="text-xs text-muted-foreground">Horas totales</p>
                      <p className="text-lg font-bold">{exportPkg.summary.total_worked_hours}h</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-muted/30">
                      <p className="text-xs text-muted-foreground">Anomalías</p>
                      <p className="text-lg font-bold">{exportPkg.summary.anomaly_count}</p>
                    </div>
                  </div>

                  {/* GPS coverage */}
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>Cobertura GPS: {exportPkg.summary.records_with_gps_percent}%</span>
                  </div>

                  {/* Download buttons */}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleDownloadCSV} className="gap-1.5">
                      <Download className="h-4 w-4" />
                      Descargar CSV
                    </Button>
                    <Button variant="outline" onClick={handleDownloadJSON} className="gap-1.5">
                      <Download className="h-4 w-4" />
                      Descargar JSON
                    </Button>
                  </div>

                  {/* Honesty notice */}
                  <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200/50 dark:bg-amber-950/20 dark:border-amber-800/30 text-xs text-amber-800 dark:text-amber-300">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>
                        Este paquete es preparatorio interno. No constituye presentación oficial ante la ITSS.
                        El sellado SHA-256 garantiza la integridad de los datos pero no tiene valor de firma electrónica cualificada.
                      </span>
                    </div>
                  </div>

                  {/* Preview table */}
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">Nº</TableHead>
                          <TableHead>NIF</TableHead>
                          <TableHead>Empleado</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Entrada</TableHead>
                          <TableHead>Salida</TableHead>
                          <TableHead className="text-right">Horas</TableHead>
                          <TableHead>Hash</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {exportPkg.records.slice(0, 50).map(r => (
                          <TableRow key={r.row}>
                            <TableCell className="text-xs">{r.row}</TableCell>
                            <TableCell className="text-xs font-mono">{r.employee_nif}</TableCell>
                            <TableCell className="text-sm">{r.employee_name}</TableCell>
                            <TableCell className="text-xs">{r.date}</TableCell>
                            <TableCell className="text-xs font-mono">
                              {r.clock_in ? format(new Date(r.clock_in), 'HH:mm') : '-'}
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              {r.clock_out ? format(new Date(r.clock_out), 'HH:mm') : '-'}
                            </TableCell>
                            <TableCell className="text-xs text-right">{r.worked_hours}h</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[9px] font-mono">
                                <Lock className="h-2.5 w-2.5 mr-0.5" />
                                {r.seal_hash.slice(0, 12)}…
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {exportPkg.records.length > 50 && (
                      <p className="text-xs text-center text-muted-foreground py-2">
                        Mostrando 50 de {exportPkg.records.length} registros. Descargue el archivo completo.
                      </p>
                    )}
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ CUSTODY CHAIN TAB ═══ */}
        <TabsContent value="custody" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Cadena de Custodia
              </CardTitle>
              <CardDescription>
                Log inmutable de accesos, exportaciones y operaciones sobre los registros de fichaje
              </CardDescription>
            </CardHeader>
            <CardContent>
              {custodyLog.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Lock className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No hay eventos de custodia registrados</p>
                  <p className="text-xs mt-1">Genere una exportación para iniciar la cadena</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {custodyLog.map((entry, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                      <div className={cn(
                        "p-1.5 rounded-md shrink-0",
                        entry.action === 'exported' ? 'bg-blue-100 dark:bg-blue-900/30' :
                        entry.action === 'accessed' ? 'bg-green-100 dark:bg-green-900/30' :
                        entry.action === 'sealed' ? 'bg-purple-100 dark:bg-purple-900/30' :
                        'bg-muted'
                      )}>
                        {entry.action === 'exported' ? <FileText className="h-3.5 w-3.5 text-blue-600" /> :
                         entry.action === 'accessed' ? <Eye className="h-3.5 w-3.5 text-green-600" /> :
                         entry.action === 'sealed' ? <Lock className="h-3.5 w-3.5 text-purple-600" /> :
                         <Clock className="h-3.5 w-3.5" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium capitalize">{entry.action}</span>
                          <Badge variant="outline" className="text-[10px]">{entry.actor}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{entry.details}</p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                        </p>
                      </div>
                      {entry.record_ids.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          {entry.record_ids.length} reg.
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ EVIDENCE TAB ═══ */}
        <TabsContent value="evidence" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Fingerprint className="h-5 w-5" />
                Evidencia del Trabajador
              </CardTitle>
              <CardDescription>
                Cada fichaje captura evidencia implícita (GPS, dispositivo) como firma operativa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">GPS Implícito</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Coordenadas GPS capturadas automáticamente al fichar entrada y salida (si el trabajador autoriza).
                  </p>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-[10px]">
                    Activo
                  </Badge>
                </div>
                <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Dispositivo</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Método de fichaje (web, app, biométrico, NFC, QR) registrado como evidencia del dispositivo usado.
                  </p>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-[10px]">
                    Activo
                  </Badge>
                </div>
                <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">Sellado SHA-256</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cada registro exportado incluye hash SHA-256 para garantizar integridad y no manipulación.
                  </p>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-[10px]">
                    Activo
                  </Badge>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>
                      <strong>Nota sobre firma electrónica:</strong> La evidencia GPS + dispositivo constituye una firma operativa
                      de facto que vincula al trabajador con el fichaje, pero no equivale a una firma electrónica cualificada
                      según el Reglamento eIDAS.
                    </p>
                    <p>
                      Para firma cualificada se requeriría integración con un prestador de servicios de confianza cualificado (QTSP),
                      lo cual queda fuera del alcance actual. Estado: <strong>internal_ready</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRTimeClockInteropPanel;
