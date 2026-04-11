/**
 * OrganismReadinessPanel.tsx — LM4: Interactive Go-Live Readiness per Organism
 *
 * Operator controls: register credentials, mark scenarios, attach evidence,
 * recalculate go-live, view blockers.
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle, CheckCircle, XCircle, ChevronDown, ShieldAlert,
  Lock, FileCheck, TestTube, Rocket, RefreshCw, Paperclip, Calendar,
} from 'lucide-react';
import { useCredentialOnboarding } from '@/hooks/erp/hr/useCredentialOnboarding';
import { READINESS_LABELS } from '@/engines/erp/hr/officialAdaptersEngine';
import { validateFormatByOrganism } from '@/engines/erp/hr/officialFormatValidatorEngine';
import type {
  OrganismId,
  CredentialOnboardingState,
  GoLiveBlockerSeverity,
  CredentialStatus,
  CertificateBindingStatus,
  ScenarioStatus,
  SandboxScenario,
  CredentialEntry,
} from '@/engines/erp/hr/credentialOnboardingEngine';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId: string;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  configured: <CheckCircle className="h-3.5 w-3.5 text-green-600" />,
  validated: <CheckCircle className="h-3.5 w-3.5 text-green-600" />,
  not_configured: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  pending_request: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  expired: <AlertTriangle className="h-3.5 w-3.5 text-destructive" />,
  revoked: <XCircle className="h-3.5 w-3.5 text-destructive" />,
};

const SEVERITY_COLORS: Record<GoLiveBlockerSeverity, string> = {
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
  high: 'bg-amber-50 text-amber-800 border-amber-200',
  medium: 'bg-blue-50 text-blue-800 border-blue-200',
};

const CREDENTIAL_STATUSES: CredentialStatus[] = ['not_configured', 'pending_request', 'configured', 'validated', 'expired', 'revoked'];
const CERTIFICATE_STATUSES: CertificateBindingStatus[] = ['not_configured', 'present', 'valid', 'expired', 'incomplete', 'revoked'];

function ConditionBadge({ met, label }: { met: boolean; label: string }) {
  return (
    <Badge variant={met ? 'default' : 'outline'} className={`text-[10px] ${met ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-muted text-muted-foreground'}`}>
      {met ? '✓' : '✗'} {label}
    </Badge>
  );
}

// ── Credential Row with controls ────────────────────────────────────────────

function CredentialRow({ cred, organism, onUpdate }: {
  cred: CredentialEntry;
  organism: OrganismId;
  onUpdate: (type: string, status: CredentialStatus, opts?: { notes?: string; expirationDate?: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(cred.reviewNotes || '');
  const [expDate, setExpDate] = useState(cred.expirationDate || '');

  const handleStatusChange = (val: string) => {
    onUpdate(cred.type, val as CredentialStatus, { notes: notes || undefined, expirationDate: expDate || undefined });
    setEditing(false);
  };

  return (
    <div className="py-1.5 px-2 rounded bg-muted/30 space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {STATUS_ICONS[cred.status] || STATUS_ICONS.not_configured}
          <span>{cred.type.replace(/_/g, ' ')}</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[9px]">{cred.status}</Badge>
          <Button variant="ghost" size="sm" className="h-5 px-1 text-[9px]" onClick={() => setEditing(!editing)}>
            {editing ? 'Cerrar' : 'Editar'}
          </Button>
        </div>
      </div>
      {cred.validationDate && (
        <div className="text-[9px] text-muted-foreground pl-5">Validado: {cred.validationDate.substring(0, 10)}</div>
      )}
      {cred.expirationDate && (
        <div className="text-[9px] text-muted-foreground pl-5">Expira: {cred.expirationDate}</div>
      )}
      {(cred.evidenceDocuments || []).length > 0 && (
        <div className="text-[9px] text-muted-foreground pl-5 flex items-center gap-1">
          <Paperclip className="h-2.5 w-2.5" /> {cred.evidenceDocuments.length} evidencia(s)
        </div>
      )}
      {editing && (
        <div className="pl-5 space-y-1.5 pt-1 border-t border-muted">
          <div className="flex items-center gap-2">
            <Label className="text-[9px] w-14 shrink-0">Estado:</Label>
            <Select value={cred.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CREDENTIAL_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[9px] w-14 shrink-0">Expira:</Label>
            <Input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} className="h-6 text-[10px]" />
          </div>
          <Textarea placeholder="Notas de revisión..." value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[40px] text-[10px]" />
        </div>
      )}
    </div>
  );
}

// ── Scenario Row with controls ──────────────────────────────────────────────

function ScenarioRow({ scenario, onMark }: {
  scenario: SandboxScenario;
  onMark: (id: string, status: ScenarioStatus, notes?: string) => void;
}) {
  const [showControls, setShowControls] = useState(false);
  const [notes, setNotes] = useState(scenario.notes || '');

  return (
    <div className="py-1.5 px-2 rounded bg-muted/30 space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="truncate max-w-[55%]">{scenario.description}</span>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className={`text-[9px] ${scenario.status === 'passed' ? 'bg-green-50 text-green-700' : scenario.status === 'failed' ? 'bg-red-50 text-red-700' : ''}`}>
            {scenario.status}
          </Badge>
          <Button variant="ghost" size="sm" className="h-5 px-1 text-[9px]" onClick={() => setShowControls(!showControls)}>
            {showControls ? 'Cerrar' : 'Marcar'}
          </Button>
        </div>
      </div>
      {scenario.executedAt && (
        <div className="text-[9px] text-muted-foreground pl-2">
          Ejecutado: {formatDistanceToNow(new Date(scenario.executedAt), { locale: es, addSuffix: true })}
        </div>
      )}
      {(scenario.evidenceDocuments || []).length > 0 && (
        <div className="text-[9px] text-muted-foreground pl-2 flex items-center gap-1">
          <Paperclip className="h-2.5 w-2.5" /> {scenario.evidenceDocuments.length} evidencia(s)
        </div>
      )}
      {showControls && (
        <div className="pl-2 space-y-1.5 pt-1 border-t border-muted">
          <Textarea placeholder="Notas del resultado..." value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[36px] text-[10px]" />
          <div className="flex gap-1">
            <Button size="sm" variant="default" className="h-5 text-[9px] px-2 bg-green-600 hover:bg-green-700" onClick={() => { onMark(scenario.id, 'passed', notes); setShowControls(false); }}>
              ✓ Pasado
            </Button>
            <Button size="sm" variant="destructive" className="h-5 text-[9px] px-2" onClick={() => { onMark(scenario.id, 'failed', notes); setShowControls(false); }}>
              ✗ Fallido
            </Button>
            <Button size="sm" variant="outline" className="h-5 text-[9px] px-2" onClick={() => { onMark(scenario.id, 'skipped', notes); setShowControls(false); }}>
              Omitido
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Organism Card ───────────────────────────────────────────────────────────

function OrganismCard({ state, onUpdateCredential, onUpdateCertificate, onMarkScenario, onUpdateParser, onRunFormat }: {
  state: CredentialOnboardingState;
  onUpdateCredential: (org: OrganismId, type: string, status: CredentialStatus, opts?: Record<string, string | undefined>) => void;
  onUpdateCertificate: (org: OrganismId, status: CertificateBindingStatus) => void;
  onMarkScenario: (id: string, status: ScenarioStatus, notes?: string) => void;
  onUpdateParser: (org: OrganismId, verified: boolean) => void;
  onRunFormat: (org: OrganismId) => void;
}) {
  const [open, setOpen] = useState(false);
  const readinessInfo = READINESS_LABELS[state.readiness];
  const eval_ = state.goLiveEvaluation;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-sm font-medium">{state.label}</CardTitle>
                <Badge className={`text-[10px] ${readinessInfo.color}`}>{readinessInfo.label}</Badge>
                {eval_.canGoLive && (
                  <Badge className="text-[10px] bg-green-600 text-white">GO-LIVE ✓</Badge>
                )}
                {eval_.blockers.length > 0 && (
                  <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                    {eval_.blockers.length} blocker{eval_.blockers.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1 flex-wrap">
                  <ConditionBadge met={eval_.conditionsMet.hasRequiredCredentials} label="Cred" />
                  <ConditionBadge met={eval_.conditionsMet.hasValidCertificate} label="Cert" />
                  <ConditionBadge met={eval_.conditionsMet.hasFormatAligned} label="Fmt" />
                  <ConditionBadge met={eval_.conditionsMet.hasParserVerified} label="Parser" />
                  <ConditionBadge met={eval_.conditionsMet.hasSandboxPassed} label="Sandbox" />
                  <ConditionBadge met={eval_.conditionsMet.hasUATPassed} label="UAT" />
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 space-y-4">
            {/* Credentials */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Lock className="h-3 w-3" /> Credenciales</h4>
              <div className="space-y-1">
                {state.credentials.map(cred => (
                  <CredentialRow
                    key={cred.type}
                    cred={cred}
                    organism={state.organism}
                    onUpdate={(type, status, opts) => onUpdateCredential(state.organism, type, status, opts)}
                  />
                ))}
              </div>
            </div>

            {/* Certificate */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Certificado electrónico</h4>
              <div className="flex items-center gap-2 px-2">
                <Select value={state.certificateStatus} onValueChange={val => onUpdateCertificate(state.organism, val as CertificateBindingStatus)}>
                  <SelectTrigger className="h-6 text-[10px] w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CERTIFICATE_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Format + inline validator */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><FileCheck className="h-3 w-3" /> Formato</h4>
              {Object.keys(state.formatValidation).length > 0 ? (
                <div className="space-y-1">
                  {Object.entries(state.formatValidation).map(([artifact, status]) => (
                    <div key={artifact} className="flex items-center justify-between text-xs px-2">
                      <span>{artifact}</span>
                      <Badge variant="outline" className="text-[9px]">{status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground px-2">Sin validaciones de formato registradas</p>
              )}
              <Button variant="outline" size="sm" className="h-6 text-[9px] mt-1.5 ml-2" onClick={() => onRunFormat(state.organism)}>
                <FileCheck className="h-3 w-3 mr-1" /> Ejecutar validación de formato
              </Button>
            </div>

            {/* Parser toggle */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1">Parser de respuesta</h4>
              <div className="flex items-center gap-2 px-2">
                <Switch checked={state.parserVerified} onCheckedChange={v => onUpdateParser(state.organism, v)} />
                <Label className="text-[10px]">{state.parserVerified ? 'Verificado con muestra real' : 'No verificado'}</Label>
              </div>
            </div>

            {/* Sandbox Scenarios */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><TestTube className="h-3 w-3" /> Sandbox ({state.sandboxScenarios.filter(s => s.status === 'passed').length}/{state.sandboxScenarios.length})</h4>
              <div className="space-y-1">
                {state.sandboxScenarios.map(s => (
                  <ScenarioRow key={s.id} scenario={s} onMark={onMarkScenario} />
                ))}
              </div>
            </div>

            {/* UAT Scenarios */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><Rocket className="h-3 w-3" /> UAT ({state.uatScenarios.filter(s => s.status === 'passed').length}/{state.uatScenarios.length})</h4>
              <div className="space-y-1">
                {state.uatScenarios.map(s => (
                  <ScenarioRow key={s.id} scenario={s} onMark={onMarkScenario} />
                ))}
              </div>
            </div>

            {/* Blockers */}
            {eval_.blockers.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-destructive mb-1">Blockers Go-Live</h4>
                <div className="space-y-1">
                  {eval_.blockers.map((b, i) => (
                    <div key={i} className={`text-xs p-2 rounded border ${SEVERITY_COLORS[b.severity]}`}>
                      <div className="font-medium">[{b.dimension}] {b.description}</div>
                      <div className="text-[10px] mt-0.5 opacity-80">→ {b.unblockAction} ({b.estimatedEffort})</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Action + Review timestamp */}
            <div className="bg-primary/5 rounded p-2 text-xs space-y-1">
              <div><span className="font-semibold">Siguiente acción:</span> {state.nextRecommendedAction}</div>
              {state.lastReviewedAt && (
                <div className="text-[9px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5" />
                  Última revisión: {formatDistanceToNow(new Date(state.lastReviewedAt), { locale: es, addSuffix: true })}
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ── Main Panel ──────────────────────────────────────────────────────────────

export function OrganismReadinessPanel({ companyId }: Props) {
  const {
    allOrganismStates,
    updateCredentialStatus,
    updateCertificateStatus,
    updateParserStatus,
    updateFormatValidation,
    markScenarioResult,
    isLoaded,
    lastReviewedAt,
    goLiveReadyCount,
  } = useCredentialOnboarding(companyId);

  const handleRunFormat = useCallback((organism: OrganismId) => {
    // Run validator with a sample empty payload — in production the operator would provide real data
    const sampleResult = validateFormatByOrganism(organism, null);
    toast.info(`Validación ${organism}: ${sampleResult.status} (${sampleResult.fieldsPassed}/${sampleResult.fieldsChecked} campos)`);
    // Record the result
    updateFormatValidation(organism, 'primary_format', sampleResult.status);
  }, [updateFormatValidation]);

  const handleUpdateCredential = useCallback((org: OrganismId, type: string, status: CredentialStatus, opts?: Record<string, string | undefined>) => {
    updateCredentialStatus(org, type as any, status, opts);
    toast.success(`Credencial ${type} → ${status}`);
  }, [updateCredentialStatus]);

  const handleMarkScenario = useCallback((id: string, status: ScenarioStatus, notes?: string) => {
    markScenarioResult(id, status, { notes });
    toast.success(`Escenario ${id} → ${status}`);
  }, [markScenarioResult]);

  const summaryData = useMemo(() => allOrganismStates.map(s => ({
    organism: s.label,
    readiness: s.readiness,
    canGoLive: s.goLiveEvaluation.canGoLive,
    cred: s.goLiveEvaluation.conditionsMet.hasRequiredCredentials,
    cert: s.goLiveEvaluation.conditionsMet.hasValidCertificate,
    fmt: s.goLiveEvaluation.conditionsMet.hasFormatAligned,
    parser: s.goLiveEvaluation.conditionsMet.hasParserVerified,
    sandbox: s.goLiveEvaluation.conditionsMet.hasSandboxPassed,
    uat: s.goLiveEvaluation.conditionsMet.hasUATPassed,
    blockers: s.goLiveEvaluation.blockers.length,
  })), [allOrganismStates]);

  const tick = (v: boolean) => v ? '✓' : '✗';

  return (
    <div className="space-y-4">
      {/* Safety banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
        <p className="text-xs text-amber-800">
          <strong>isRealSubmissionBlocked = true</strong> — Esta vista evalúa la preparación real sin fingir producción.
          Go-live se calcula dinámicamente según las 6 condiciones duras.
          {!isLoaded && ' Cargando estado persistido...'}
          {isLoaded && lastReviewedAt && (
            <span className="ml-1 opacity-70">
              (última actualización: {formatDistanceToNow(new Date(lastReviewedAt), { locale: es, addSuffix: true })})
            </span>
          )}
        </p>
      </div>

      {/* Summary: go-live count */}
      <div className="flex items-center gap-2">
        <Badge variant={goLiveReadyCount > 0 ? 'default' : 'outline'} className={goLiveReadyCount > 0 ? 'bg-green-600' : ''}>
          {goLiveReadyCount}/5 organismos go-live ready
        </Badge>
      </div>

      {/* Summary Matrix */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Matriz de Readiness por Organismo</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Organismo</TableHead>
                <TableHead className="text-xs text-center">Readiness</TableHead>
                <TableHead className="text-xs text-center">Go-Live</TableHead>
                <TableHead className="text-xs text-center">Cred</TableHead>
                <TableHead className="text-xs text-center">Cert</TableHead>
                <TableHead className="text-xs text-center">Fmt</TableHead>
                <TableHead className="text-xs text-center">Parser</TableHead>
                <TableHead className="text-xs text-center">Sandbox</TableHead>
                <TableHead className="text-xs text-center">UAT</TableHead>
                <TableHead className="text-xs text-center">Blockers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryData.map(row => {
                const ri = READINESS_LABELS[row.readiness];
                return (
                  <TableRow key={row.organism}>
                    <TableCell className="text-xs font-medium">{row.organism}</TableCell>
                    <TableCell className="text-center"><Badge className={`text-[9px] ${ri.color}`}>{ri.label}</Badge></TableCell>
                    <TableCell className="text-center text-xs">{row.canGoLive ? '✅' : '❌'}</TableCell>
                    <TableCell className="text-center text-xs">{tick(row.cred)}</TableCell>
                    <TableCell className="text-center text-xs">{tick(row.cert)}</TableCell>
                    <TableCell className="text-center text-xs">{tick(row.fmt)}</TableCell>
                    <TableCell className="text-center text-xs">{tick(row.parser)}</TableCell>
                    <TableCell className="text-center text-xs">{tick(row.sandbox)}</TableCell>
                    <TableCell className="text-center text-xs">{tick(row.uat)}</TableCell>
                    <TableCell className="text-center"><Badge variant="outline" className="text-[9px]">{row.blockers}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Per-Organism Cards */}
      <div className="space-y-2">
        {allOrganismStates.map(state => (
          <OrganismCard
            key={state.organism}
            state={state}
            onUpdateCredential={handleUpdateCredential}
            onUpdateCertificate={updateCertificateStatus}
            onMarkScenario={handleMarkScenario}
            onUpdateParser={updateParserStatus}
            onRunFormat={handleRunFormat}
          />
        ))}
      </div>
    </div>
  );
}
