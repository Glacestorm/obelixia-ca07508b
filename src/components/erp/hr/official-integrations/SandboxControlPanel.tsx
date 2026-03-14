/**
 * SandboxControlPanel — Panel de control de entornos sandbox para conectores
 * V2-ES.8 T8+T9: Gates, ejecución, trazabilidad, persistencia, comparación y historial
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Shield, ShieldAlert, ShieldCheck, FlaskConical, TestTube, ServerCog,
  Ban, CheckCircle2, XCircle, Clock, Activity, AlertTriangle, Lock,
  ChevronRight, RefreshCw, Play, FileCheck, Zap, History, GitCompare,
  Database, Filter,
} from 'lucide-react';
import { useSandboxEnvironment } from '@/hooks/erp/hr/useSandboxEnvironment';
import {
  ConnectorEnvironment,
  SandboxDomain,
  ENVIRONMENT_DEFINITIONS,
  SANDBOX_DISCLAIMERS,
  SANDBOX_DOMAINS,
} from '@/components/erp/hr/shared/sandboxEnvironmentEngine';
import {
  ELIGIBILITY_LABELS,
  type SandboxEligibilityResult,
} from '@/components/erp/hr/shared/sandboxEligibilityEngine';
import type { SandboxExecutionRecord } from '@/components/erp/hr/shared/sandboxExecutionService';
import {
  compareSandboxVsDryRun,
  getComparisonDirectionLabel,
  getComparisonDirectionColor,
  type SandboxVsDryRunReport,
} from '@/components/erp/hr/shared/sandboxDryRunComparisonEngine';
import type { IntegrationAdapter } from '@/hooks/erp/hr/useOfficialIntegrationsHub';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId: string;
  adapters: IntegrationAdapter[];
}

const ENV_ICONS: Record<ConnectorEnvironment, React.ReactNode> = {
  sandbox: <FlaskConical className="h-4 w-4" />,
  test: <TestTube className="h-4 w-4" />,
  preprod: <ServerCog className="h-4 w-4" />,
  production: <Ban className="h-4 w-4" />,
};

const ENV_BADGE_VARIANTS: Record<ConnectorEnvironment, string> = {
  sandbox: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  test: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  preprod: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  production: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function SandboxControlPanel({ companyId, adapters }: Props) {
  const [subTab, setSubTab] = useState('overview');

  const sandbox = useSandboxEnvironment({ companyId, adapters });

  useEffect(() => {
    sandbox.loadEnvironmentConfigs();
  }, [adapters]);

  const envDef = ENVIRONMENT_DEFINITIONS[sandbox.activeEnvironment];

  return (
    <div className="space-y-4">
      {/* Production blocked banner */}
      <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
        <Lock className="h-4 w-4" />
        <AlertTitle className="text-sm font-semibold">Producción bloqueada</AlertTitle>
        <AlertDescription className="text-xs">
          {SANDBOX_DISCLAIMERS.production} — {SANDBOX_DISCLAIMERS.general}
        </AlertDescription>
      </Alert>

      {/* Disclaimers acceptance */}
      {!sandbox.disclaimersAccepted && (
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-sm font-semibold text-amber-700">Disclaimers de entorno</AlertTitle>
          <AlertDescription className="text-xs space-y-1">
            <p>{SANDBOX_DISCLAIMERS[sandbox.activeEnvironment]}</p>
            <p className="font-medium">{SANDBOX_DISCLAIMERS.general}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-7 text-xs border-amber-500/30"
              onClick={sandbox.acceptDisclaimers}
            >
              <CheckCircle2 className="h-3 w-3 mr-1.5" /> Acepto — entorno preparatorio
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Environment selector */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Entorno activo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {(['sandbox', 'test', 'preprod', 'production'] as ConnectorEnvironment[]).map(env => {
              const def = ENVIRONMENT_DEFINITIONS[env];
              const isActive = sandbox.activeEnvironment === env;
              const isBlocked = env === 'production';

              return (
                <button
                  key={env}
                  onClick={() => !isBlocked && sandbox.switchEnvironment(env)}
                  disabled={isBlocked}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    isActive
                      ? `${ENV_BADGE_VARIANTS[env]} border-current`
                      : isBlocked
                        ? 'border-dashed border-muted opacity-40 cursor-not-allowed'
                        : 'border-border hover:border-muted-foreground/30 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {ENV_ICONS[env]}
                    <span className="text-xs font-semibold">{def.label}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {isBlocked ? 'No disponible' : def.description.slice(0, 60)}
                  </p>
                  {isActive && (
                    <Badge variant="outline" className="mt-1.5 text-[9px]">Activo</Badge>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active env disclaimer */}
          <div className={`p-2.5 rounded-lg text-xs ${ENV_BADGE_VARIANTS[sandbox.activeEnvironment]}`}>
            <div className="flex items-start gap-2">
              {sandbox.activeEnvironment === 'sandbox' ? (
                <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <div>
                <p className="font-medium">{envDef.label} — Riesgo: {envDef.riskLevel}</p>
                {envDef.warnings.map((w, i) => (
                  <p key={i} className="mt-0.5 opacity-80">{w}</p>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub tabs */}
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="text-xs">Resumen</TabsTrigger>
          <TabsTrigger value="eligibility" className="text-xs">Elegibilidad</TabsTrigger>
          <TabsTrigger value="connectors" className="text-xs">Conectores</TabsTrigger>
          <TabsTrigger value="executions" className="text-xs">
            Ejecuciones
            {sandbox.executionRecords.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[9px] h-4 min-w-4 px-1">
                {sandbox.executionRecords.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            <History className="h-3 w-3 mr-1" />
            Historial
            {sandbox.persistedHistoryCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-[9px] h-4 min-w-4 px-1">
                {sandbox.persistedHistoryCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="comparison" className="text-xs">
            <GitCompare className="h-3 w-3 mr-1" />
            Comparar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <EnvironmentOverview summary={sandbox.summary} />
        </TabsContent>

        <TabsContent value="eligibility">
          <EligibilityPanel
            adapters={adapters}
            sandbox={sandbox}
          />
        </TabsContent>

        <TabsContent value="connectors">
          <ConnectorEnvironmentList
            configs={sandbox.currentEnvConfigs}
            activeEnv={sandbox.activeEnvironment}
            onEnable={sandbox.enableAdapterInEnvironment}
          />
        </TabsContent>

        <TabsContent value="executions">
          <ExecutionRecordsList
            records={sandbox.executionRecords}
            activeEnv={sandbox.activeEnvironment}
          />
        </TabsContent>

        <TabsContent value="history">
          <SandboxHistoryPanel
            sandbox={sandbox}
          />
        </TabsContent>

        <TabsContent value="comparison">
          <SandboxComparisonPanel
            sandbox={sandbox}
            companyId={companyId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ======================== ELIGIBILITY PANEL ========================

function EligibilityPanel({
  adapters,
  sandbox,
}: {
  adapters: IntegrationAdapter[];
  sandbox: ReturnType<typeof useSandboxEnvironment>;
}) {
  const [results, setResults] = useState<SandboxEligibilityResult[]>([]);

  const evaluateAll = useCallback(() => {
    const newResults: SandboxEligibilityResult[] = [];
    for (const adapter of adapters) {
      for (const domain of SANDBOX_DOMAINS) {
        const result = sandbox.evaluateEligibility(domain.id, adapter.id);
        newResults.push(result);
      }
    }
    setResults(newResults);
  }, [adapters, sandbox.evaluateEligibility]);

  useEffect(() => { evaluateAll(); }, [adapters.length, sandbox.activeEnvironment]);

  const handleExecute = useCallback(async (result: SandboxEligibilityResult, adapter: IntegrationAdapter) => {
    if (result.eligibility === 'not_eligible') return;
    await sandbox.executeSandboxAdvanced({
      adapterId: adapter.id,
      domain: result.domain,
      submissionType: `${result.domain}_sandbox_test`,
      payload: { domain: result.domain, test: true, timestamp: new Date().toISOString() },
    });
    evaluateAll(); // Re-evaluate after execution
  }, [sandbox.executeSandboxAdvanced, evaluateAll]);

  if (adapters.length === 0) {
    return (
      <Card className="p-6 text-center">
        <FileCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No hay conectores para evaluar elegibilidad</p>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-3">
        {adapters.map(adapter => {
          const adapterResults = results.filter(r =>
            r.domain && adapters.find(a => a.id === adapter.id)
          ).filter(r => {
            // Match results to this adapter by checking the eligibility cache
            const cached = sandbox.getEligibility(r.domain, adapter.id);
            return cached?.evaluatedAt === r.evaluatedAt;
          });

          // Fallback: evaluate inline if no cached results
          const domainResults = SANDBOX_DOMAINS.map(d => {
            const cached = sandbox.getEligibility(d.id, adapter.id);
            return cached || sandbox.evaluateEligibility(d.id, adapter.id);
          });

          return (
            <Card key={adapter.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  {adapter.adapter_name}
                  <Badge variant="outline" className="text-[9px] ml-auto">{adapter.adapter_type}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {domainResults.map(result => {
                  const meta = ELIGIBILITY_LABELS[result.eligibility];
                  const canExecute = result.eligibility === 'eligible_for_sandbox' ||
                    result.eligibility === 'sandbox_enabled' ||
                    result.eligibility === 'partially_eligible';

                  return (
                    <div key={result.domain} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{result.domain}</span>
                          <Badge variant="outline" className={`text-[9px] ${meta.color}`}>
                            {meta.icon} {meta.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            {result.passedCount}/{result.totalCount}
                          </span>
                          {canExecute && sandbox.disclaimersAccepted && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] px-2"
                              onClick={() => handleExecute(result, adapter)}
                              disabled={sandbox.isLoading}
                            >
                              {sandbox.isLoading ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <><Play className="h-3 w-3 mr-1" /> Ejecutar sandbox</>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <Progress value={result.percentage} className="h-1.5 mb-2" />

                      {/* Checklist */}
                      <div className="space-y-0.5">
                        {result.checks.map(check => (
                          <div key={check.id} className="flex items-start gap-1.5 text-[10px]">
                            {check.passed ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                            ) : check.blocking ? (
                              <XCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <span className={check.passed ? 'text-muted-foreground' : 'font-medium'}>
                                {check.label}
                              </span>
                              {!check.passed && (
                                <span className="text-muted-foreground ml-1">— {check.detail}</span>
                              )}
                              {check.blocking && !check.passed && (
                                <Badge variant="destructive" className="ml-1.5 text-[8px] h-3 px-1">bloqueante</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Summary */}
                      <p className="text-[10px] text-muted-foreground mt-2 pt-1.5 border-t italic">
                        {result.summary}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// ======================== EXECUTION RECORDS LIST ========================

function ExecutionRecordsList({
  records,
  activeEnv,
}: {
  records: SandboxExecutionRecord[];
  activeEnv: ConnectorEnvironment;
}) {
  const filtered = records.filter(r => r.environment === activeEnv);

  if (filtered.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Sin ejecuciones sandbox en {ENVIRONMENT_DEFINITIONS[activeEnv].label}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Las ejecuciones sandbox son diferentes de los dry-runs locales
        </p>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-2">
        {filtered.map(record => (
          <Card key={record.id} className="p-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge className={`text-[9px] ${ENV_BADGE_VARIANTS[record.environment]}`}>
                  {record.executionMode === 'advanced_simulation' ? 'Simulación avanzada' : 'Staged'}
                </Badge>
                <span className="text-xs font-medium">{record.domain}</span>
                <span className="text-[10px] text-muted-foreground">/ {record.submissionType}</span>
              </div>
              <Badge
                variant={record.status === 'completed' ? 'secondary' : record.status === 'executing' ? 'outline' : 'destructive'}
                className="text-[9px]"
              >
                {record.status === 'executing' && <RefreshCw className="h-2.5 w-2.5 mr-1 animate-spin" />}
                {record.status}
              </Badge>
            </div>

            {/* Conformance & Duration */}
            {record.result && (
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <span className="text-muted-foreground">Conformidad payload</span>
                    <span className="font-medium">{record.result.payloadConformance}%</span>
                  </div>
                  <Progress value={record.result.payloadConformance} className="h-1" />
                </div>
                {record.durationMs && (
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{record.durationMs}ms</span>
                )}
              </div>
            )}

            {/* Execution Stages */}
            {record.result?.executionStages && (
              <div className="space-y-0.5 mb-2">
                {record.result.executionStages.map((stage, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[9px]">
                    {stage.status === 'passed' ? (
                      <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                    ) : stage.status === 'failed' ? (
                      <XCircle className="h-2.5 w-2.5 text-destructive shrink-0" />
                    ) : (
                      <Clock className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                    )}
                    <span className={stage.status === 'passed' ? 'text-muted-foreground' : 'font-medium'}>
                      {stage.label}
                    </span>
                    <span className="text-muted-foreground/60 ml-auto">{stage.durationMs}ms</span>
                  </div>
                ))}
              </div>
            )}

            {/* Errors & Warnings */}
            {record.result && (record.result.structuralErrors.length > 0 || record.result.fieldWarnings.length > 0) && (
              <div className="space-y-0.5 mb-2 p-2 rounded bg-muted/30">
                {record.result.structuralErrors.map((err, i) => (
                  <div key={`e${i}`} className="flex items-center gap-1.5 text-[9px] text-destructive">
                    <XCircle className="h-2.5 w-2.5 shrink-0" />
                    <span>{err.field}: {err.message}</span>
                  </div>
                ))}
                {record.result.fieldWarnings.map((warn, i) => (
                  <div key={`w${i}`} className="flex items-center gap-1.5 text-[9px] text-amber-600">
                    <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                    <span>{warn.field}: {warn.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Simulated Response */}
            {record.result?.simulatedOrganismResponse && (
              <div className="text-[9px] p-2 rounded border bg-card mb-2">
                <span className="font-medium">Respuesta simulada: </span>
                <span className="text-muted-foreground">
                  [{record.result.simulatedOrganismResponse.code}] {record.result.simulatedOrganismResponse.message}
                </span>
              </div>
            )}

            {/* Metadata footer */}
            <div className="flex items-center gap-3 text-[9px] text-muted-foreground pt-1.5 border-t">
              <span>{new Date(record.executedAt).toLocaleString('es-ES')}</span>
              <span>Hash: {record.payloadHash}</span>
              {record.relatedDryRunId && <span>Dry-run: {record.relatedDryRunId.slice(0, 8)}</span>}
            </div>

            {/* Disclaimers */}
            <div className="mt-1.5 text-[8px] text-muted-foreground/60 italic">
              {record.disclaimers[0]}
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

// ======================== OVERVIEW ========================

function EnvironmentOverview({ summary }: { summary: ReturnType<typeof useSandboxEnvironment>['summary'] }) {
  const envStates = [
    { env: 'sandbox' as const, ready: summary.sandboxReady, label: 'Sandbox' },
    { env: 'test' as const, ready: summary.testReady, label: 'Test' },
    { env: 'preprod' as const, ready: summary.preprodReady, label: 'Pre-prod' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {envStates.map(({ env, ready, label }) => (
          <Card key={env} className="p-3">
            <div className="flex items-center gap-2 mb-2">
              {ENV_ICONS[env]}
              <span className="text-xs font-medium">{label}</span>
              {ready ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 ml-auto" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 ml-auto" />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {ready ? 'Gates cumplidos' : 'Gates pendientes'}
            </p>
          </Card>
        ))}
      </div>

      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">Ejecuciones totales</span>
          </div>
          <Badge variant="secondary" className="text-xs">{summary.totalSandboxExecutions}</Badge>
        </div>
        {summary.lastSandboxExecution && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Última: {formatDistanceToNow(new Date(summary.lastSandboxExecution), { locale: es, addSuffix: true })}
          </p>
        )}
      </Card>

      <Card className="p-3 border-destructive/20 bg-destructive/5">
        <div className="flex items-center gap-2">
          <Ban className="h-4 w-4 text-destructive" />
          <span className="text-xs font-medium text-destructive">
            Producción: {summary.productionBlocked ? 'BLOQUEADA' : 'ERROR'}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          isRealSubmissionBlocked() === true
        </p>
      </Card>

      {summary.pendingGates.length > 0 && (
        <Card className="p-3">
          <p className="text-xs font-medium mb-2">Gates pendientes</p>
          <div className="space-y-1">
            {summary.pendingGates.map((pg, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <XCircle className="h-3 w-3 text-amber-500 shrink-0" />
                <span className="font-medium">{ENVIRONMENT_DEFINITIONS[pg.environment].label}:</span>
                <span className="text-muted-foreground">{pg.gates.join(', ')}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ======================== CONNECTOR LIST ========================

function ConnectorEnvironmentList({
  configs,
  activeEnv,
  onEnable,
}: {
  configs: ReturnType<typeof useSandboxEnvironment>['currentEnvConfigs'];
  activeEnv: ConnectorEnvironment;
  onEnable: (id: string, env: ConnectorEnvironment) => Promise<boolean>;
}) {
  if (configs.length === 0) {
    return (
      <Card className="p-6 text-center">
        <FlaskConical className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          No hay conectores configurados para {ENVIRONMENT_DEFINITIONS[activeEnv].label}
        </p>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2">
        {configs.map(config => {
          const allPassed = config.gateResults.every(g => g.passed);

          return (
            <Card key={`${config.adapterId}-${config.environment}`} className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{config.adapterName}</span>
                  {config.isEnabled ? (
                    <Badge variant="secondary" className="text-[9px] bg-emerald-500/10 text-emerald-600">
                      Habilitado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px]">Deshabilitado</Badge>
                  )}
                </div>
                {!config.isEnabled && allPassed && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onEnable(config.adapterId, activeEnv)}
                  >
                    Habilitar <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>

              <div className="space-y-1">
                {config.gateResults.map(gate => (
                  <div key={gate.gateId} className="flex items-center gap-1.5 text-[10px]">
                    {gate.passed ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="h-3 w-3 text-amber-500 shrink-0" />
                    )}
                    <span className={gate.passed ? 'text-muted-foreground' : 'font-medium'}>
                      {gate.reason}
                    </span>
                  </div>
                ))}
              </div>

              {config.executionCount > 0 && (
                <div className="mt-2 pt-2 border-t flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>{config.executionCount} ejecuciones</span>
                  {config.lastExecutionAt && (
                    <span>Última: {formatDistanceToNow(new Date(config.lastExecutionAt), { locale: es, addSuffix: true })}</span>
                  )}
                  {config.lastExecutionStatus && (
                    <Badge variant={config.lastExecutionStatus === 'success' ? 'secondary' : 'destructive'} className="text-[8px]">
                      {config.lastExecutionStatus}
                    </Badge>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// ======================== HISTORY PANEL (T9) ========================

function SandboxHistoryPanel({
  sandbox,
}: {
  sandbox: ReturnType<typeof useSandboxEnvironment>;
}) {
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleRefresh = useCallback(() => {
    const filters: any = {};
    if (domainFilter !== 'all') filters.domain = domainFilter;
    if (statusFilter !== 'all') filters.status = statusFilter;
    sandbox.fetchPersistedHistory(filters);
  }, [domainFilter, statusFilter, sandbox.fetchPersistedHistory]);

  useEffect(() => { handleRefresh(); }, [domainFilter, statusFilter]);

  const records = sandbox.persistedHistory;

  return (
    <div className="space-y-3">
      {/* Filters */}
      <Card className="p-3">
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={domainFilter} onValueChange={setDomainFilter}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue placeholder="Dominio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los dominios</SelectItem>
              {SANDBOX_DOMAINS.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="completed">Completado</SelectItem>
              <SelectItem value="failed">Fallido</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 text-xs ml-auto" onClick={handleRefresh} disabled={sandbox.persistedHistoryLoading}>
            <RefreshCw className={`h-3 w-3 mr-1.5 ${sandbox.persistedHistoryLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Badge variant="secondary" className="text-[9px]">
            <Database className="h-3 w-3 mr-1" />
            {sandbox.persistedHistoryCount} registros
          </Badge>
        </div>
      </Card>

      {/* Disclaimer */}
      <Alert className="border-muted bg-muted/30">
        <Lock className="h-3.5 w-3.5" />
        <AlertDescription className="text-[10px]">
          Historial de ejecuciones sandbox persistidas. No constituyen envíos oficiales. Producción bloqueada.
        </AlertDescription>
      </Alert>

      {records.length === 0 ? (
        <Card className="p-6 text-center">
          <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Sin ejecuciones sandbox persistidas</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Las ejecuciones futuras se almacenarán automáticamente
          </p>
        </Card>
      ) : (
        <ScrollArea className="h-[450px]">
          <div className="space-y-2">
            {records.map(record => (
              <Card key={record.id} className="p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[9px] ${ENV_BADGE_VARIANTS[record.environment]}`}>
                      {record.domain}
                    </Badge>
                    <span className="text-xs font-medium">{record.adapterName}</span>
                    <Badge variant="outline" className="text-[9px]">{record.executionMode === 'advanced_simulation' ? 'Sim. avanzada' : 'Staged'}</Badge>
                  </div>
                  <Badge
                    variant={record.status === 'completed' ? 'secondary' : 'destructive'}
                    className="text-[9px]"
                  >
                    {record.status}
                  </Badge>
                </div>

                {record.result && (
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="flex-1">
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-muted-foreground">Conformidad</span>
                        <span className="font-medium">{record.result.payloadConformance}%</span>
                      </div>
                      <Progress value={record.result.payloadConformance} className="h-1" />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {record.result.executionStages.filter(s => s.status === 'passed').length}/{record.result.executionStages.length} etapas
                    </span>
                    {record.durationMs && (
                      <span className="text-[10px] text-muted-foreground">{record.durationMs}ms</span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 text-[9px] text-muted-foreground pt-1 border-t">
                  <span>{new Date(record.executedAt).toLocaleString('es-ES')}</span>
                  <span>Hash: {record.payloadHash}</span>
                  {record.relatedDryRunId && <span>Dry-run: {record.relatedDryRunId.slice(0, 8)}</span>}
                  <span className="text-[8px] italic ml-auto">Sandbox preparatorio — no oficial</span>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// ======================== COMPARISON PANEL (T9) ========================

function SandboxComparisonPanel({
  sandbox,
  companyId,
}: {
  sandbox: ReturnType<typeof useSandboxEnvironment>;
  companyId: string;
}) {
  const [report, setReport] = useState<SandboxVsDryRunReport | null>(null);
  const [selectedSandbox, setSelectedSandbox] = useState<string>('');

  const sandboxRecords = sandbox.persistedHistory.length > 0
    ? sandbox.persistedHistory
    : sandbox.executionRecords;

  // For now, comparison needs both sandbox and dry-run records.
  // Dry-run records would come from useDryRunPersistence which is external.
  // We show the comparison UI with sandbox records available.

  return (
    <div className="space-y-3">
      <Alert className="border-muted bg-muted/30">
        <GitCompare className="h-3.5 w-3.5" />
        <AlertDescription className="text-[10px]">
          Comparativa sandbox vs dry-run: muestra las diferencias semánticas entre validación local (dry-run) y simulación avanzada (sandbox).
          <strong> No constituye validación de organismo.</strong>
        </AlertDescription>
      </Alert>

      {sandboxRecords.length === 0 ? (
        <Card className="p-6 text-center">
          <GitCompare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Sin ejecuciones sandbox para comparar</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Ejecuta un sandbox desde la pestaña Elegibilidad y un dry-run para generar comparativas
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* List of sandbox records with comparison potential */}
          <Card className="p-3">
            <p className="text-xs font-medium mb-2">Ejecuciones sandbox disponibles para comparación</p>
            <ScrollArea className="h-[180px]">
              <div className="space-y-1.5">
                {sandboxRecords.slice(0, 20).map(record => (
                  <div
                    key={record.id}
                    className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                      selectedSandbox === record.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedSandbox(record.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px]">{record.domain}</Badge>
                      <span className="text-[10px]">{record.adapterName}</span>
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(record.executedAt).toLocaleString('es-ES')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium">
                        {record.result?.payloadConformance ?? 0}%
                      </span>
                      <Badge
                        variant={record.status === 'completed' ? 'secondary' : 'destructive'}
                        className="text-[8px]"
                      >
                        {record.status}
                      </Badge>
                      {record.relatedDryRunId && (
                        <Badge variant="outline" className="text-[8px]">
                          Con dry-run
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Selected sandbox detail */}
          {selectedSandbox && (() => {
            const record = sandboxRecords.find(r => r.id === selectedSandbox);
            if (!record) return null;

            return (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <GitCompare className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Detalle de ejecución sandbox</span>
                  <Badge variant="outline" className="text-[9px]">{record.domain}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-muted/30 text-[10px]">
                    <p className="font-medium mb-1">Sandbox</p>
                    <p>Conformidad: <strong>{record.result?.payloadConformance ?? 0}%</strong></p>
                    <p>Etapas: {record.result?.executionStages.filter(s => s.status === 'passed').length ?? 0}/{record.result?.executionStages.length ?? 0}</p>
                    <p>Errores: {record.result?.structuralErrors.length ?? 0}</p>
                    <p>Avisos: {record.result?.fieldWarnings.length ?? 0}</p>
                    {record.result?.simulatedOrganismResponse && (
                      <p className="mt-1">Respuesta: [{record.result.simulatedOrganismResponse.code}]</p>
                    )}
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30 text-[10px]">
                    <p className="font-medium mb-1">Metadata</p>
                    <p>Modo: {record.executionMode}</p>
                    <p>Entorno: {record.environment}</p>
                    <p>Hash: {record.payloadHash}</p>
                    <p>Duración: {record.durationMs ?? 0}ms</p>
                    {record.relatedDryRunId && (
                      <p>Dry-run vinculado: {record.relatedDryRunId.slice(0, 12)}...</p>
                    )}
                  </div>
                </div>

                {/* Execution stages detail */}
                {record.result?.executionStages && (
                  <div className="space-y-0.5 mb-3">
                    <p className="text-[10px] font-medium mb-1">Etapas de simulación</p>
                    {record.result.executionStages.map((stage, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[9px]">
                        {stage.status === 'passed' ? (
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="h-2.5 w-2.5 text-destructive shrink-0" />
                        )}
                        <span className={stage.status === 'passed' ? 'text-muted-foreground' : 'font-medium'}>
                          {stage.label}
                        </span>
                        <span className="ml-auto text-muted-foreground/60">{stage.durationMs}ms</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-[8px] text-muted-foreground/60 italic pt-2 border-t">
                  Ejecución sandbox preparatoria — no constituye envío oficial ni validación de organismo.
                  Producción bloqueada por invariante de seguridad.
                </div>
              </Card>
            );
          })()}
        </div>
      )}
    </div>
  );
}
