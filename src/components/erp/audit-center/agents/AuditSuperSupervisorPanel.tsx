/**
 * AuditSuperSupervisorPanel — Panel 360° del SuperSupervisor de Auditoría
 * AUDIT-SS-001: Coordinador central de toda la inteligencia de auditoría
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bot, Shield, Eye, TrendingUp, AlertTriangle, Activity, Settings,
  Brain, Network, GitBranch, Gauge, FileText, ArrowUpRight,
} from 'lucide-react';
import { useAuditAgents } from '@/hooks/erp/audit';
import { useUnifiedAudit } from '@/hooks/erp/audit';
import { cn } from '@/lib/utils';

export function AuditSuperSupervisorPanel() {
  const { superSupervisor, supervisors, specialists, stats, fetchAuditAgents } = useAuditAgents();
  const { kpis } = useUnifiedAudit();
  const [configOpen, setConfigOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Config state
  const [config, setConfig] = useState({
    autonomousMode: false,
    orchestrationInterval: 60000,
    globalConfidence: 0.80,
    conflictResolution: 'conservative' as 'conservative' | 'balanced' | 'dynamic',
    parallelConsultations: true,
    autoCalibration: true,
    weeklyReportEnabled: true,
    metaAnomalyDetection: true,
    maxTokenBudget: 50000,
    hitlThreshold: 0.70,
    auditLogRetention: 730,
    xaiExplainability: true,
    fairnessEngine: false,
  });

  useEffect(() => { fetchAuditAgents(); }, []);

  const escalationProtocols = [
    { from: 'Sup. Interno', to: 'SuperSupervisor', trigger: 'Violación sistémica multi-módulo', severity: 'critical' },
    { from: 'Sup. Interno', to: 'SuperSupervisor', trigger: 'Risk score global > umbral crítico', severity: 'high' },
    { from: 'Sup. Interno', to: 'SuperSupervisor', trigger: 'Conflicto no resoluble entre agentes', severity: 'high' },
    { from: 'Sup. Externo', to: 'SuperSupervisor', trigger: 'Plazo regulatorio en riesgo', severity: 'critical' },
    { from: 'Sup. Externo', to: 'SuperSupervisor', trigger: 'Inconsistencia crítica en evidencias', severity: 'high' },
    { from: 'Sup. Externo', to: 'SuperSupervisor', trigger: 'Manipulación del blockchain trail', severity: 'critical' },
    { from: 'SuperSupervisor', to: 'Humano', trigger: 'Conflicto inter-dominio no arbitrable', severity: 'critical' },
    { from: 'SuperSupervisor', to: 'ObelixIA-Supervisor', trigger: 'Impacto cross-domain (HR/Legal/Audit)', severity: 'high' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
            <Bot className="h-7 w-7 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              SuperSupervisor de Auditoría
              <Badge className="bg-amber-500/10 text-amber-600 text-xs">AUDIT-SS-001</Badge>
            </h3>
            <p className="text-sm text-muted-foreground">
              Coordinador central · Visión 360° · Arbitraje inter-dominio · Calibración continua
            </p>
          </div>
        </div>
        <Sheet open={configOpen} onOpenChange={setConfigOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Settings className="h-4 w-4" /> Configuración
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[500px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" /> Config SuperSupervisor Audit
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-6 mt-6">
              {/* Orchestration */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2"><Network className="h-4 w-4" /> Orquestación</h4>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Modo autónomo</Label>
                  <Switch checked={config.autonomousMode} onCheckedChange={v => setConfig(p => ({ ...p, autonomousMode: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Consultas paralelas</Label>
                  <Switch checked={config.parallelConsultations} onCheckedChange={v => setConfig(p => ({ ...p, parallelConsultations: v }))} />
                </div>
                <div>
                  <Label className="text-xs">Resolución de conflictos</Label>
                  <Select value={config.conflictResolution} onValueChange={v => setConfig(p => ({ ...p, conflictResolution: v as any }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservador (más seguro)</SelectItem>
                      <SelectItem value="balanced">Balanceado</SelectItem>
                      <SelectItem value="dynamic">Dinámico (más eficiente)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Thresholds */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2"><Gauge className="h-4 w-4" /> Umbrales</h4>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Confianza global</span><span className="font-medium">{config.globalConfidence}</span>
                  </div>
                  <Slider value={[config.globalConfidence * 100]} min={50} max={99} step={1} onValueChange={v => setConfig(p => ({ ...p, globalConfidence: v[0] / 100 }))} />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Umbral HITL</span><span className="font-medium">{config.hitlThreshold}</span>
                  </div>
                  <Slider value={[config.hitlThreshold * 100]} min={40} max={95} step={5} onValueChange={v => setConfig(p => ({ ...p, hitlThreshold: v[0] / 100 }))} />
                </div>
              </div>

              {/* Learning & Calibration */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2"><Brain className="h-4 w-4" /> Aprendizaje</h4>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Auto-calibración de agentes</Label>
                  <Switch checked={config.autoCalibration} onCheckedChange={v => setConfig(p => ({ ...p, autoCalibration: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Detección de meta-anomalías</Label>
                  <Switch checked={config.metaAnomalyDetection} onCheckedChange={v => setConfig(p => ({ ...p, metaAnomalyDetection: v }))} />
                </div>
              </div>

              {/* Reports */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Informes</h4>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Informe semanal automático</Label>
                  <Switch checked={config.weeklyReportEnabled} onCheckedChange={v => setConfig(p => ({ ...p, weeklyReportEnabled: v }))} />
                </div>
              </div>

              {/* Governance */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2"><Shield className="h-4 w-4" /> Gobernanza</h4>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">XAI Explicabilidad (GDPR Art.22)</Label>
                  <Switch checked={config.xaiExplainability} onCheckedChange={v => setConfig(p => ({ ...p, xaiExplainability: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Fairness Engine</Label>
                  <Switch checked={config.fairnessEngine} onCheckedChange={v => setConfig(p => ({ ...p, fairnessEngine: v }))} />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Retención audit logs</span><span className="font-medium">{config.auditLogRetention} días</span>
                  </div>
                  <Slider value={[config.auditLogRetention]} min={365} max={2555} step={365} onValueChange={v => setConfig(p => ({ ...p, auditLogRetention: v[0] }))} />
                </div>
              </div>

              {/* Budget */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Presupuesto</h4>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Tokens máx/mes</span><span className="font-medium">{config.maxTokenBudget.toLocaleString()}</span>
                  </div>
                  <Slider value={[config.maxTokenBudget]} min={10000} max={200000} step={5000} onValueChange={v => setConfig(p => ({ ...p, maxTokenBudget: v[0] }))} />
                </div>
              </div>

              <Button className="w-full mt-4" onClick={() => setConfigOpen(false)}>
                Guardar configuración
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Status KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{stats.totalAgents}</p>
            <p className="text-[10px] text-muted-foreground">Agentes coordinados</p>
          </CardContent>
        </Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{kpis.complianceScore}%</p><p className="text-[10px] text-muted-foreground">Compliance</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{kpis.riskScore}</p><p className="text-[10px] text-muted-foreground">Risk Score</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{stats.escalationRate}%</p><p className="text-[10px] text-muted-foreground">Tasa escalación</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{stats.avgConfidence}</p><p className="text-[10px] text-muted-foreground">Confianza media</p></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="text-xs gap-1"><Eye className="h-3.5 w-3.5" /> Visión 360°</TabsTrigger>
          <TabsTrigger value="escalation" className="text-xs gap-1"><ArrowUpRight className="h-3.5 w-3.5" /> Escalaciones</TabsTrigger>
          <TabsTrigger value="calibration" className="text-xs gap-1"><Gauge className="h-3.5 w-3.5" /> Calibración</TabsTrigger>
          <TabsTrigger value="meta" className="text-xs gap-1"><Brain className="h-3.5 w-3.5" /> Meta-Anomalías</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Internal Supervisor */}
            <Card className="border-blue-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-500" /> Supervisor Interno
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Agentes</span><span className="font-medium">5 especialistas</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Estado</span><Badge className="bg-emerald-500/10 text-emerald-600 text-[10px]">Activo</Badge></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Cobertura</span><span>Anomalías, Clasificación, Compliance, Riesgo, Resúmenes</span></div>
                <Progress value={85} className="h-2" />
                <p className="text-[10px] text-muted-foreground">Rendimiento: 85%</p>
              </CardContent>
            </Card>

            {/* External Supervisor */}
            <Card className="border-green-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" /> Supervisor Externo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Agentes</span><span className="font-medium">3 especialistas</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Estado</span><Badge className="bg-emerald-500/10 text-emerald-600 text-[10px]">Activo</Badge></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Cobertura</span><span>Informes Regulatorios, Evidencias, Blockchain</span></div>
                <Progress value={78} className="h-2" />
                <p className="text-[10px] text-muted-foreground">Rendimiento: 78%</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="escalation">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Protocolo de Escalación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {escalationProtocols.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50">
                    <Badge variant="outline" className="text-[10px] min-w-[90px] justify-center">{p.from}</Badge>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Badge variant="outline" className="text-[10px] min-w-[110px] justify-center">{p.to}</Badge>
                    <span className="text-xs flex-1">{p.trigger}</span>
                    <Badge variant={p.severity === 'critical' ? 'destructive' : 'secondary'} className="text-[10px]">
                      {p.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calibration">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Calibración de Agentes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                El SuperSupervisor analiza el rendimiento de los 8 agentes y ajusta los confidence_threshold según la evidencia acumulada
              </p>
              <div className="space-y-3">
                {specialists.map(agent => (
                  <div key={agent.id} className="flex items-center gap-3">
                    <span className="text-xs w-40 truncate">{agent.name}</span>
                    <Progress value={agent.confidence_threshold * 100} className="flex-1 h-2" />
                    <span className="text-xs font-medium w-12 text-right">{agent.confidence_threshold}</span>
                    <Badge variant={agent.requires_human_review ? 'secondary' : 'outline'} className="text-[10px]">
                      {agent.requires_human_review ? 'HITL' : 'Auto'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meta">
          <Card>
            <CardContent className="p-6 text-center">
              <Brain className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <h4 className="text-sm font-medium">Detección de Meta-Anomalías</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                El SuperSupervisor detecta anomalías en el propio sistema de auditoría: agentes que dejan de generar alertas, 
                caídas bruscas en el volumen de eventos, gaps temporales en el blockchain trail.
                Son señales de interferencia externa con la integridad del sistema.
              </p>
              <Badge variant="outline" className="mt-3">Sin meta-anomalías detectadas</Badge>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Acciones del SuperSupervisor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: 'Generar informe semanal', icon: FileText },
              { label: 'Calibrar agentes', icon: Gauge },
              { label: 'Scan meta-anomalías', icon: Brain },
              { label: 'Arbitraje inter-dominio', icon: GitBranch },
              { label: 'Health check global', icon: Activity },
              { label: 'Análisis impacto regulatorio', icon: Shield },
              { label: 'Consultar ObelixIA-Supervisor', icon: Network },
              { label: 'Exportar estado 360°', icon: Eye },
            ].map(action => (
              <Button key={action.label} variant="outline" size="sm" className="gap-1.5 text-xs h-auto py-2 justify-start">
                <action.icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
