/**
 * OrganismReadinessPanel.tsx — LM3: Go-Live Readiness per Organism
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, CheckCircle, XCircle, ChevronDown, ShieldAlert, Lock, FileCheck, TestTube, Rocket } from 'lucide-react';
import { useCredentialOnboarding } from '@/hooks/erp/hr/useCredentialOnboarding';
import { READINESS_LABELS } from '@/engines/erp/hr/officialAdaptersEngine';
import type { OrganismId, CredentialOnboardingState, GoLiveBlockerSeverity } from '@/engines/erp/hr/credentialOnboardingEngine';

interface Props {
  companyId: string;
}

const STATUS_ICONS = {
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

function ConditionBadge({ met, label }: { met: boolean; label: string }) {
  return (
    <Badge variant={met ? 'default' : 'outline'} className={`text-[10px] ${met ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-muted text-muted-foreground'}`}>
      {met ? '✓' : '✗'} {label}
    </Badge>
  );
}

function OrganismCard({ state, onMarkCredential, onMarkScenario }: {
  state: CredentialOnboardingState;
  onMarkCredential: (org: OrganismId, type: string, status: string) => void;
  onMarkScenario: (id: string, status: string) => void;
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
                  <div key={cred.type} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/30">
                    <div className="flex items-center gap-2">
                      {STATUS_ICONS[cred.status] || STATUS_ICONS.not_configured}
                      <span>{cred.type.replace(/_/g, ' ')}</span>
                    </div>
                    <Badge variant="outline" className="text-[9px]">{cred.status}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Certificate */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Certificado</h4>
              <div className="flex items-center gap-2 text-xs px-2">
                {STATUS_ICONS[state.certificateStatus === 'valid' || state.certificateStatus === 'present' ? 'configured' : 'not_configured']}
                <span>{state.certificateStatus}</span>
              </div>
            </div>

            {/* Format */}
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
            </div>

            {/* Sandbox Scenarios */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><TestTube className="h-3 w-3" /> Sandbox ({state.sandboxScenarios.filter(s => s.status === 'passed').length}/{state.sandboxScenarios.length})</h4>
              <div className="space-y-1">
                {state.sandboxScenarios.map(s => (
                  <div key={s.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/30">
                    <span className="truncate max-w-[70%]">{s.description}</span>
                    <Badge variant="outline" className={`text-[9px] ${s.status === 'passed' ? 'bg-green-50 text-green-700' : s.status === 'failed' ? 'bg-red-50 text-red-700' : ''}`}>
                      {s.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* UAT Scenarios */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><Rocket className="h-3 w-3" /> UAT ({state.uatScenarios.filter(s => s.status === 'passed').length}/{state.uatScenarios.length})</h4>
              <div className="space-y-1">
                {state.uatScenarios.map(s => (
                  <div key={s.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/30">
                    <span className="truncate max-w-[70%]">{s.description}</span>
                    <Badge variant="outline" className={`text-[9px] ${s.status === 'passed' ? 'bg-green-50 text-green-700' : ''}`}>
                      {s.status}
                    </Badge>
                  </div>
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

            {/* Next Action */}
            <div className="bg-primary/5 rounded p-2 text-xs">
              <span className="font-semibold">Siguiente acción:</span> {state.nextRecommendedAction}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function OrganismReadinessPanel({ companyId }: Props) {
  const {
    allOrganismStates,
    updateCredentialStatus,
    markScenarioResult,
  } = useCredentialOnboarding(companyId);

  const summaryData = useMemo(() => allOrganismStates.map(s => ({
    organism: s.label,
    readiness: s.readiness,
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
          <strong>isRealSubmissionBlocked = true</strong> — Ningún organismo tiene credenciales reales configuradas.
          Esta vista evalúa la preparación real sin fingir producción.
        </p>
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
            onMarkCredential={(org, type, status) => updateCredentialStatus(org, type as any, status as any)}
            onMarkScenario={(id, status) => markScenarioResult(id, status as any)}
          />
        ))}
      </div>
    </div>
  );
}
