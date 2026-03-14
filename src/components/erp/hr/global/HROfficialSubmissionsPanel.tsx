/**
 * HROfficialSubmissionsPanel — Envíos a organismos oficiales
 * V2-ES.8 T3: Certificate status, regulatory deadlines, and dry-run history
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Send, Plus, FlaskConical, Shield, Info, Lock,
  History, CheckCircle2, XCircle, Clock, Paperclip,
  Calculator, FileText, FileSpreadsheet, AlertTriangle, KeyRound,
  CalendarClock, Download,
} from 'lucide-react';
import { useOfficialExport } from '@/hooks/erp/hr/useOfficialExport';
import { HRStatusBadge } from '../shared/HRStatusBadge';
import { useDryRunPersistence, type DryRunResult } from '@/hooks/erp/hr/useDryRunPersistence';
import { getDomainMeta, getSubmissionDomains, type SubmissionDomain } from '@/components/erp/hr/shared/preparatorySubmissionEngine';
import { useHRDomainCertificates, DOMAIN_LABELS as CERT_DOMAIN_LABELS, STATUS_LABELS as CERT_STATUS_LABELS, isCertificateExpiringSoon } from '@/hooks/erp/hr/useHRDomainCertificates';
import { useRegulatoryCalendar } from '@/hooks/erp/hr/useRegulatoryCalendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props { companyId: string; }

const DEMO_SUBMISSIONS = [
  { id: '1', type: 'Milena PA', subtype: 'Alta', employee: 'Ana López', date: '2026-03-10', status: 'accepted', ref: 'MIL-2026-001' },
  { id: '2', type: 'Contrat@', subtype: 'Comunicación contrato', employee: 'Carlos Ruiz', date: '2026-03-09', status: 'sent', ref: 'CTR-2026-042' },
  { id: '3', type: 'AEAT Mod.111', subtype: 'Retenciones T1 2026', employee: '—', date: '2026-03-08', status: 'pending', ref: 'AEAT-111-T1' },
  { id: '4', type: 'Certifica2', subtype: 'Certificado empresa', employee: 'Pedro García', date: '2026-03-07', status: 'accepted', ref: 'CRT-2026-015' },
  { id: '5', type: 'SILTRA', subtype: 'Variación cotización', employee: 'Laura Díaz', date: '2026-03-05', status: 'rejected', ref: 'SIL-2026-008' },
];

const DOMAIN_ICONS: Record<string, typeof Shield> = {
  TGSS: Shield,
  CONTRATA: FileText,
  AEAT_111: Calculator,
  AEAT_190: Calculator,
  CERTIFICA2: FileText,
  DELTA: AlertTriangle,
};

export function HROfficialSubmissionsPanel({ companyId }: Props) {
  const [domainFilter, setDomainFilter] = useState('all');
  const [showHistory, setShowHistory] = useState(false);
  const { results, isLoading, fetchResults } = useDryRunPersistence(companyId);
  const { certificates, fetchCertificates } = useHRDomainCertificates(companyId);
  const { calendar, evaluate: evaluateCalendar } = useRegulatoryCalendar(companyId);
  const { isExporting, exportEvidencePack } = useOfficialExport(companyId);

  const handleQuickExport = useCallback((format: 'pdf' | 'excel') => {
    exportEvidencePack(format, {
      companyId,
      dryRuns: results,
      certificates: certificates.map(c => ({
        domain: c.domain,
        status: c.certificate_status,
        completeness: c.configuration_completeness,
        expirationDate: c.expiration_date,
      })),
      deadlines: calendar || undefined,
    });
  }, [companyId, results, certificates, calendar, exportEvidencePack]);

  useEffect(() => {
    fetchCertificates();
    evaluateCalendar();
  }, []);

  useEffect(() => {
    const filter = domainFilter !== 'all' ? { domain: domainFilter as SubmissionDomain, limit: 10 } : { limit: 10 };
    fetchResults(filter);
  }, [domainFilter, fetchResults]);

  const domains = getSubmissionDomains();

  // Stats by status
  const stats = useMemo(() => {
    const s = { success: 0, partial: 0, failed: 0, total: results.length };
    results.forEach(r => { if (r.status in s) (s as any)[r.status]++; });
    return s;
  }, [results]);

  // Cert summary
  const certSummary = useMemo(() => {
    const configured = certificates.filter(c =>
      c.certificate_status === 'cert_loaded_placeholder' || c.certificate_status === 'cert_ready_preparatory'
    ).length;
    const expiring = certificates.filter(c => isCertificateExpiringSoon(c)).length;
    return { configured, total: 3, expiring };
  }, [certificates]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Send className="h-5 w-5 text-indigo-500" /> Envíos Oficiales
          </h3>
          <p className="text-sm text-muted-foreground">SILTRA, Milena PA, Contrat@, AEAT, Certifica2</p>
        </div>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Nuevo envío</Button>
      </div>

      {/* V2-ES.8 T3: Preparatory banner + cert & deadline status */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="py-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FlaskConical className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium flex items-center gap-2">
                  Integración preparatoria activa
                  <Badge variant="outline" className="text-[9px] h-4 gap-0.5">
                    <FlaskConical className="h-2 w-2" /> Dry-run
                  </Badge>
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] gap-1"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <History className="h-3 w-3" />
                  {showHistory ? 'Ocultar historial' : `Ver historial (${stats.total})`}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Los conectores TGSS, Contrat@ y AEAT operan en modo preparatorio. Se generan y validan payloads
                sin envío oficial. Accede al <strong>Hub de Integraciones</strong> para ver readiness y ejecutar dry-runs.
              </p>
              <div className="flex items-center gap-3 mt-2 text-[10px] flex-wrap">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Lock className="h-2.5 w-2.5" /> Envío real bloqueado
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <KeyRound className="h-2.5 w-2.5" /> Certificados: {certSummary.configured}/{certSummary.total}
                  {certSummary.expiring > 0 && <span className="text-amber-600"> ({certSummary.expiring} expirando)</span>}
                </span>
                {calendar && calendar.hasRisk && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <CalendarClock className="h-2.5 w-2.5" /> {calendar.summaryLabel}
                  </span>
                )}
                {calendar && !calendar.hasRisk && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CalendarClock className="h-2.5 w-2.5" /> Plazos en regla
                  </span>
                )}
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Info className="h-2.5 w-2.5" /> Cero irreversibilidad
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* V2-ES.8 T2: Dry-run history widget */}
      {showHistory && (
        <Card>
          <CardContent className="py-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <History className="h-4 w-4 text-blue-500" />
                Historial de simulaciones
              </p>
              <Select value={domainFilter} onValueChange={setDomainFilter}>
                <SelectTrigger className="w-[140px] h-7 text-[11px]">
                  <SelectValue placeholder="Dominio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos</SelectItem>
                  {domains.map(d => (
                    <SelectItem key={d} value={d} className="text-xs">
                      {getDomainMeta(d).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick counters */}
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" /> {stats.success} éxito
              </span>
              <span className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-3 w-3" /> {stats.partial} parcial
              </span>
              <span className="flex items-center gap-1 text-destructive">
                <XCircle className="h-3 w-3" /> {stats.failed} fallido
              </span>
            </div>

            {/* Result list */}
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
              {results.map(r => (
                <DryRunHistoryRow key={r.id} result={r} />
              ))}
              {results.length === 0 && !isLoading && (
                <p className="text-[11px] text-muted-foreground text-center py-4 italic">
                  Sin simulaciones persistidas aún
                </p>
              )}
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-1.5 p-1.5 rounded bg-muted/50 text-[9px] text-muted-foreground">
              <Info className="h-2.5 w-2.5 mt-0.5 shrink-0 text-blue-400" />
              <span>Resultados de <strong>simulación interna</strong> — no constituyen envío oficial ni acuse de organismo</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {DEMO_SUBMISSIONS.map(sub => (
          <Card key={sub.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10">
                  <Send className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{sub.type} — {sub.subtype}</p>
                  <p className="text-xs text-muted-foreground">
                    {sub.employee !== '—' ? `${sub.employee} · ` : ''}{sub.ref} · {sub.date}
                  </p>
                </div>
              </div>
              <HRStatusBadge entity="submission" status={sub.status} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Compact row for dry-run history ────────────────────────────────────────

function DryRunHistoryRow({ result }: { result: DryRunResult }) {
  const Icon = DOMAIN_ICONS[result.submission_domain] || FileText;
  const statusColor = result.status === 'success'
    ? 'text-green-600'
    : result.status === 'partial'
    ? 'text-amber-600'
    : 'text-destructive';

  const statusLabel = result.status === 'success' ? 'Éxito'
    : result.status === 'partial' ? 'Parcial' : 'Fallido';

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/40 transition-colors text-[11px]">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-medium truncate block">
          {getDomainMeta(result.submission_domain as SubmissionDomain).label}
          <span className="font-normal text-muted-foreground"> · {result.submission_type}</span>
        </span>
      </div>
      <span className="flex items-center gap-1 text-muted-foreground shrink-0">
        <Clock className="h-2.5 w-2.5" />
        {format(new Date(result.created_at), 'dd/MM HH:mm', { locale: es })}
      </span>
      <Badge variant="outline" className={cn('text-[9px] h-4 shrink-0', statusColor)}>
        {statusLabel}
      </Badge>
      {result.readiness_score > 0 && (
        <span className="text-[9px] font-mono text-muted-foreground shrink-0">{result.readiness_score}%</span>
      )}
      <Badge variant="outline" className="text-[8px] h-3.5 shrink-0 gap-0.5">
        <FlaskConical className="h-2 w-2" /> #{result.execution_number}
      </Badge>
    </div>
  );
}
