/**
 * HRComplianceEvidencePanel — Evidencias documentales de cumplimiento
 * V2-ES.8 T2: Integra evidencias vinculadas a dry-runs
 */
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield, Plus, FileCheck, FlaskConical, Info,
  History, Paperclip, CheckCircle2, Clock,
} from 'lucide-react';
import { HRStatusBadge } from '../shared/HRStatusBadge';
import { useDryRunPersistence, type DryRunEvidence } from '@/hooks/erp/hr/useDryRunPersistence';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props { companyId: string; }

const DEMO_EVIDENCE = [
  { id: '1', employee: 'Equipo Ventas (8)', requirement: 'Reconocimiento médico anual', expiry: '2026-06-30', status: 'valid' },
  { id: '2', employee: 'Pedro García', requirement: 'Formación PRL', expiry: '2026-04-15', status: 'expiring' },
  { id: '3', employee: 'Ana López', requirement: 'Consentimiento GDPR', expiry: '2025-12-31', status: 'expired' },
  { id: '4', employee: 'Nuevas incorporaciones (3)', requirement: 'Certificado antecedentes', expiry: null, status: 'pending' },
];

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  payload_snapshot: 'Payload',
  validation_report: 'Validación',
  simulation_log: 'Simulación',
  linked_document: 'Documento',
};

export function HRComplianceEvidencePanel({ companyId }: Props) {
  const [showDryRunEvidence, setShowDryRunEvidence] = useState(false);
  const { results, isLoading, fetchResults } = useDryRunPersistence(companyId);
  const [allEvidence, setAllEvidence] = useState<DryRunEvidence[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  useEffect(() => {
    fetchResults({ limit: 20 });
  }, [fetchResults]);

  // Load evidence from latest dry-runs when toggled
  useEffect(() => {
    if (!showDryRunEvidence || results.length === 0) return;
    
    const loadAll = async () => {
      setLoadingEvidence(true);
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const dryRunIds = results.slice(0, 10).map(r => r.id);
        const { data } = await supabase
          .from('erp_hr_dry_run_evidence' as any)
          .select('*')
          .in('dry_run_id', dryRunIds)
          .order('created_at', { ascending: false })
          .limit(30);
        setAllEvidence((data || []) as unknown as DryRunEvidence[]);
      } catch { /* graceful */ }
      setLoadingEvidence(false);
    };
    loadAll();
  }, [showDryRunEvidence, results]);

  const evidenceStats = useMemo(() => {
    const byType: Record<string, number> = {};
    allEvidence.forEach(e => {
      byType[e.evidence_type] = (byType[e.evidence_type] || 0) + 1;
    });
    return byType;
  }, [allEvidence]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-500" /> Evidencias de Cumplimiento
          </h3>
          <p className="text-sm text-muted-foreground">Certificados, reconocimientos médicos, consentimientos GDPR</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] gap-1"
            onClick={() => setShowDryRunEvidence(!showDryRunEvidence)}
          >
            <FlaskConical className="h-3 w-3" />
            {showDryRunEvidence ? 'Ocultar dry-run' : `Evidencias dry-run (${results.length})`}
          </Button>
          <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Registrar evidencia</Button>
        </div>
      </div>

      {/* V2-ES.8 T2: Dry-run evidence widget */}
      {showDryRunEvidence && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="py-3 space-y-2">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <FlaskConical className="h-4 w-4 text-blue-500" />
              Evidencias de simulaciones preparatorias
            </p>

            {/* Stats by type */}
            <div className="flex items-center gap-3 text-[11px]">
              {Object.entries(evidenceStats).map(([type, count]) => (
                <span key={type} className="flex items-center gap-1 text-muted-foreground">
                  <Paperclip className="h-2.5 w-2.5" />
                  {EVIDENCE_TYPE_LABELS[type] || type}: {count}
                </span>
              ))}
              {allEvidence.length === 0 && !loadingEvidence && (
                <span className="text-muted-foreground italic">Sin evidencias vinculadas</span>
              )}
            </div>

            {/* Evidence list */}
            <div className="space-y-1 max-h-[180px] overflow-y-auto">
              {allEvidence.map(ev => {
                const isReadiness = (ev.metadata as any)?.evidence_subtype === 'readiness_report';
                const hasDocLink = !!ev.document_id;
                const hasDryRunRef = !!ev.dry_run_id;
                return (
                  <div key={ev.id} className="flex items-center gap-2 py-1 px-1.5 rounded bg-background/60 text-[11px]">
                    <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="truncate block">{ev.label}</span>
                      <div className="flex items-center gap-1.5">
                        {isReadiness && <span className="text-[8px] text-blue-500">Readiness</span>}
                        {hasDocLink && (
                          <span className="text-[8px] text-primary flex items-center gap-0.5">
                            <Paperclip className="h-2 w-2" /> Expediente
                          </span>
                        )}
                        {hasDryRunRef && (
                          <span className="text-[8px] text-muted-foreground flex items-center gap-0.5">
                            <FlaskConical className="h-2 w-2" /> Dry-run
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] h-4 shrink-0">
                      {EVIDENCE_TYPE_LABELS[ev.evidence_type] || ev.evidence_type}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {format(new Date(ev.created_at), 'dd/MM HH:mm', { locale: es })}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-1.5 p-1.5 rounded bg-muted/40 text-[9px] text-muted-foreground">
              <Info className="h-2.5 w-2.5 mt-0.5 shrink-0 text-blue-400" />
              <span>
                Evidencias <strong>internas y preparatorias</strong> vinculadas a simulaciones dry-run.
                No equivalen a justificante oficial ni acuse de organismo.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {DEMO_EVIDENCE.map(ev => (
          <Card key={ev.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <FileCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{ev.requirement}</p>
                  <p className="text-xs text-muted-foreground">
                    {ev.employee}{ev.expiry ? ` · Vence: ${ev.expiry}` : ' · Sin vencimiento'}
                  </p>
                </div>
              </div>
              <HRStatusBadge entity="evidence" status={ev.status} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
