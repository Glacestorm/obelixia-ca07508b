/**
 * SandboxControlPanel — Panel de control de entornos sandbox para conectores
 * V2-ES.8 T8: Gestión de entornos, gates, ejecuciones y barreras de producción
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Shield, ShieldAlert, ShieldCheck, FlaskConical, TestTube, ServerCog,
  Ban, CheckCircle2, XCircle, Clock, Activity, AlertTriangle, Lock,
  ChevronRight, RefreshCw,
} from 'lucide-react';
import { useSandboxEnvironment } from '@/hooks/erp/hr/useSandboxEnvironment';
import {
  ConnectorEnvironment,
  ENVIRONMENT_DEFINITIONS,
  SANDBOX_DISCLAIMERS,
} from '@/components/erp/hr/shared/sandboxEnvironmentEngine';
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="text-xs">Resumen</TabsTrigger>
          <TabsTrigger value="connectors" className="text-xs">Conectores</TabsTrigger>
          <TabsTrigger value="executions" className="text-xs">
            Ejecuciones
            {sandbox.executions.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[9px] h-4 min-w-4 px-1">
                {sandbox.executions.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <EnvironmentOverview summary={sandbox.summary} />
        </TabsContent>

        <TabsContent value="connectors">
          <ConnectorEnvironmentList
            configs={sandbox.currentEnvConfigs}
            activeEnv={sandbox.activeEnvironment}
            onEnable={sandbox.enableAdapterInEnvironment}
          />
        </TabsContent>

        <TabsContent value="executions">
          <ExecutionHistory
            executions={sandbox.executions}
            activeEnv={sandbox.activeEnvironment}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ======================== SUB-COMPONENTS ========================

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

      {/* Production blocked indicator */}
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

              {/* Gates */}
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

              {/* Execution stats */}
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

function ExecutionHistory({
  executions,
  activeEnv,
}: {
  executions: ReturnType<typeof useSandboxEnvironment>['executions'];
  activeEnv: ConnectorEnvironment;
}) {
  const filtered = executions.filter(e => e.environment === activeEnv);

  if (filtered.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Sin ejecuciones en {ENVIRONMENT_DEFINITIONS[activeEnv].label}
        </p>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2">
        {filtered.map(exec => (
          <Card key={exec.id} className="p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Badge className={`text-[9px] ${ENV_BADGE_VARIANTS[exec.environment]}`}>
                  {exec.executionType}
                </Badge>
                <span className="text-xs">{exec.request.domain} / {exec.request.submissionType}</span>
              </div>
              <Badge
                variant={exec.status === 'completed' ? 'secondary' : exec.status === 'running' ? 'outline' : 'destructive'}
                className="text-[9px]"
              >
                {exec.status === 'running' && <RefreshCw className="h-2.5 w-2.5 mr-1 animate-spin" />}
                {exec.status}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>{new Date(exec.startedAt).toLocaleString('es-ES')}</span>
              {exec.durationMs && <span>{exec.durationMs}ms</span>}
              {exec.response?.errors && exec.response.errors.length > 0 && (
                <span className="text-destructive">{exec.response.errors.length} error(es)</span>
              )}
              {exec.response?.warnings && exec.response.warnings.length > 0 && (
                <span className="text-amber-600">{exec.response.warnings.length} aviso(s)</span>
              )}
            </div>

            {exec.auditTrail.length > 0 && (
              <div className="mt-2 pt-1.5 border-t space-y-0.5">
                {exec.auditTrail.map((entry, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                    <span className="shrink-0">{new Date(entry.timestamp).toLocaleTimeString('es-ES')}</span>
                    <span>—</span>
                    <span>{entry.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
