/**
 * AIGovernancePanel — Phase 5
 * GDPR / EU AI Act / LOPDGDD Compliance Dashboard
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  ShieldCheck, ShieldAlert, ShieldX, AlertTriangle,
  CheckCircle2, XCircle, MinusCircle, Eye,
  RefreshCw, Search, Filter, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useAIGovernance,
  type AgentGovernanceProfile,
  type AIRiskLevel,
  type GovernanceCheck,
} from '@/hooks/erp/ai-center/useAIGovernance';
import { AgentRegistryItem } from '@/hooks/erp/ai-center/useAICommandCenter';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';

interface Props {
  agents: AgentRegistryItem[];
  loading?: boolean;
}

const RISK_CONFIG: Record<AIRiskLevel, { label: string; color: string; icon: typeof ShieldCheck }> = {
  unacceptable: { label: 'Inaceptable', color: 'bg-red-500/10 text-red-600 border-red-500/30', icon: ShieldX },
  high: { label: 'Alto', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30', icon: ShieldAlert },
  limited: { label: 'Limitado', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30', icon: AlertTriangle },
  minimal: { label: 'Mínimo', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: ShieldCheck },
};

const STATUS_ICON: Record<GovernanceCheck['status'], { icon: typeof CheckCircle2; color: string }> = {
  compliant: { icon: CheckCircle2, color: 'text-emerald-500' },
  partial: { icon: MinusCircle, color: 'text-yellow-500' },
  non_compliant: { icon: XCircle, color: 'text-red-500' },
  not_assessed: { icon: Eye, color: 'text-muted-foreground' },
};

const CATEGORY_LABELS: Record<string, string> = {
  gdpr: 'GDPR',
  eu_ai_act: 'EU AI Act',
  lopdgdd: 'LOPDGDD',
  ethics: 'Ética IA',
};

function KPICard({ label, value, suffix, variant }: {
  label: string; value: number; suffix?: string;
  variant?: 'success' | 'warning' | 'danger' | 'neutral';
}) {
  const colors = {
    success: 'text-emerald-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
    neutral: 'text-foreground',
  };
  return (
    <Card className="border bg-card">
      <CardContent className="p-3 text-center">
        <p className={cn('text-2xl font-bold', colors[variant || 'neutral'])}>
          {value}{suffix}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

function AgentGovernanceCard({ profile, onClick }: {
  profile: AgentGovernanceProfile; onClick: () => void;
}) {
  const risk = RISK_CONFIG[profile.riskLevel];
  const RiskIcon = risk.icon;

  return (
    <Card
      className="border hover:shadow-md transition-all cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{profile.agentName}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{profile.agentCode}</p>
          </div>
          <Badge className={cn('text-[9px] shrink-0', risk.color)}>
            <RiskIcon className="h-3 w-3 mr-1" />
            {risk.label}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Cumplimiento</span>
            <span className="font-medium">{profile.complianceScore}%</span>
          </div>
          <Progress
            value={profile.complianceScore}
            className="h-1.5"
          />
        </div>

        <div className="flex gap-1.5 mt-2">
          {profile.requiresHumanReview && (
            <Badge variant="outline" className="text-[8px] h-4 px-1">HITL</Badge>
          )}
          {profile.hasExplainability && (
            <Badge variant="outline" className="text-[8px] h-4 px-1">XAI</Badge>
          )}
          {profile.hasAuditTrail && (
            <Badge variant="outline" className="text-[8px] h-4 px-1">Audit</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ComplianceChecklist({ checks }: { checks: GovernanceCheck[] }) {
  const grouped = useMemo(() => {
    const map: Record<string, GovernanceCheck[]> = {};
    checks.forEach(c => {
      if (!map[c.category]) map[c.category] = [];
      map[c.category].push(c);
    });
    return map;
  }, [checks]);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {CATEGORY_LABELS[cat] || cat}
          </h4>
          <div className="space-y-1">
            {items.map(check => {
              const st = STATUS_ICON[check.status];
              const Icon = st.icon;
              return (
                <div key={check.id} className="flex items-start gap-2 p-2 rounded-lg border bg-card text-xs">
                  <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', st.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{check.requirement}</p>
                    <p className="text-[10px] text-muted-foreground">{check.description}</p>
                  </div>
                  <Badge variant="outline" className="text-[8px] shrink-0">
                    {check.status === 'compliant' ? 'OK' :
                     check.status === 'partial' ? 'Parcial' :
                     check.status === 'non_compliant' ? 'No' : '?'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AIGovernancePanel({ agents, loading: externalLoading }: Props) {
  const { profiles, kpis, loading, refresh } = useAIGovernance(agents);
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState<AIRiskLevel | 'all'>('all');
  const [selectedProfile, setSelectedProfile] = useState<AgentGovernanceProfile | null>(null);

  const filtered = useMemo(() => {
    return profiles.filter(p => {
      const matchSearch = search === '' ||
        p.agentName.toLowerCase().includes(search.toLowerCase()) ||
        p.agentCode.toLowerCase().includes(search.toLowerCase());
      const matchRisk = filterRisk === 'all' || p.riskLevel === filterRisk;
      return matchSearch && matchRisk;
    });
  }, [profiles, search, filterRisk]);

  const isLoading = loading || externalLoading;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <KPICard label="Score Global" value={kpis.overallScore} suffix="%" variant={kpis.overallScore >= 70 ? 'success' : kpis.overallScore >= 50 ? 'warning' : 'danger'} />
        <KPICard label="Agentes Alto Riesgo" value={kpis.highRiskAgents} variant={kpis.highRiskAgents > 0 ? 'warning' : 'success'} />
        <KPICard label="Human-in-Loop" value={kpis.humanInLoopCoverage} suffix="%" variant={kpis.humanInLoopCoverage >= 80 ? 'success' : 'warning'} />
        <KPICard label="Explicabilidad" value={kpis.explainabilityCoverage} suffix="%" variant={kpis.explainabilityCoverage >= 70 ? 'success' : 'warning'} />
        <KPICard label="Audit Trail" value={kpis.auditTrailCoverage} suffix="%" variant="success" />
      </div>

      {/* Risk distribution bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold">Distribución de Riesgo EU AI Act</p>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={refresh} disabled={isLoading}>
              <RefreshCw className={cn('h-3 w-3 mr-1', isLoading && 'animate-spin')} /> Actualizar
            </Button>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-muted">
            {(['unacceptable', 'high', 'limited', 'minimal'] as AIRiskLevel[]).map(level => {
              const count = profiles.filter(p => p.riskLevel === level).length;
              const pct = profiles.length > 0 ? (count / profiles.length) * 100 : 0;
              if (pct === 0) return null;
              const colors = {
                unacceptable: 'bg-red-500',
                high: 'bg-orange-500',
                limited: 'bg-yellow-500',
                minimal: 'bg-emerald-500',
              };
              return (
                <div key={level} className={cn(colors[level], 'transition-all')} style={{ width: `${pct}%` }} title={`${RISK_CONFIG[level].label}: ${count}`} />
              );
            })}
          </div>
          <div className="flex gap-3 mt-2">
            {(['unacceptable', 'high', 'limited', 'minimal'] as AIRiskLevel[]).map(level => {
              const count = profiles.filter(p => p.riskLevel === level).length;
              return (
                <span key={level} className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className={cn('w-2 h-2 rounded-full', {
                    'bg-red-500': level === 'unacceptable',
                    'bg-orange-500': level === 'high',
                    'bg-yellow-500': level === 'limited',
                    'bg-emerald-500': level === 'minimal',
                  })} />
                  {RISK_CONFIG[level].label} ({count})
                </span>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Agents + Framework overview */}
      <Tabs defaultValue="agents" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="agents" className="text-xs">Agentes</TabsTrigger>
          <TabsTrigger value="framework" className="text-xs">Marco Normativo</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="mt-3 space-y-3">
          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar agente..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-7 h-8 text-xs"
              />
            </div>
            <select
              value={filterRisk}
              onChange={e => setFilterRisk(e.target.value as AIRiskLevel | 'all')}
              className="h-8 text-xs rounded-md border bg-background px-2"
            >
              <option value="all">Todos los riesgos</option>
              <option value="high">Alto</option>
              <option value="limited">Limitado</option>
              <option value="minimal">Mínimo</option>
            </select>
          </div>

          <Sheet>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filtered.map(profile => (
                <SheetTrigger key={profile.agentCode} asChild>
                  <div>
                    <AgentGovernanceCard
                      profile={profile}
                      onClick={() => setSelectedProfile(profile)}
                    />
                  </div>
                </SheetTrigger>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full text-center py-8 text-sm text-muted-foreground">
                  No se encontraron agentes
                </div>
              )}
            </div>

            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
              {selectedProfile && (
                <>
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2 text-base">
                      <ShieldCheck className="h-5 w-5" />
                      {selectedProfile.agentName}
                    </SheetTitle>
                    <div className="flex gap-2 mt-1">
                      <Badge className={RISK_CONFIG[selectedProfile.riskLevel].color}>
                        {RISK_CONFIG[selectedProfile.riskLevel].label}
                      </Badge>
                      <Badge variant="outline">{selectedProfile.domain}</Badge>
                    </div>
                  </SheetHeader>

                  <div className="mt-4 space-y-4">
                    {/* Score */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Cumplimiento normativo</span>
                        <span className="font-bold">{selectedProfile.complianceScore}%</span>
                      </div>
                      <Progress value={selectedProfile.complianceScore} className="h-2" />
                    </div>

                    {/* Capabilities */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'HITL', active: selectedProfile.requiresHumanReview },
                        { label: 'XAI', active: selectedProfile.hasExplainability },
                        { label: 'Audit Trail', active: selectedProfile.hasAuditTrail },
                      ].map(cap => (
                        <Card key={cap.label} className={cn('border', cap.active ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20')}>
                          <CardContent className="p-2 text-center">
                            {cap.active ?
                              <CheckCircle2 className="h-4 w-4 mx-auto text-emerald-500 mb-1" /> :
                              <XCircle className="h-4 w-4 mx-auto text-red-500 mb-1" />
                            }
                            <p className="text-[10px] font-medium">{cap.label}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Checklist */}
                    <ScrollArea className="h-[400px]">
                      <ComplianceChecklist checks={selectedProfile.checks} />
                    </ScrollArea>
                  </div>
                </>
              )}
            </SheetContent>
          </Sheet>
        </TabsContent>

        <TabsContent value="framework" className="mt-3">
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
                const allChecks = profiles.flatMap(p => p.checks.filter(c => c.category === cat));
                const compliant = allChecks.filter(c => c.status === 'compliant').length;
                const total = allChecks.length;
                const pct = total > 0 ? Math.round((compliant / total) * 100) : 0;

                return (
                  <Card key={cat}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <FileText className="h-4 w-4" />
                          {label}
                        </span>
                        <Badge variant={pct >= 70 ? 'default' : 'destructive'} className="text-[10px]">
                          {pct}%
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Progress value={pct} className="h-1.5 mb-2" />
                      <p className="text-[10px] text-muted-foreground">
                        {compliant} de {total} verificaciones cumplen ({profiles.length} agentes evaluados)
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AIGovernancePanel;
