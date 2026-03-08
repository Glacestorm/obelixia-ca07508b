/**
 * HRSecurityGovernancePanel - Enterprise Security, Data Masking & SoD
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Shield, Lock, Eye, EyeOff, AlertTriangle, Database, Brain,
  RefreshCw, Sparkles, ShieldAlert, ShieldCheck, FileWarning, Activity
} from 'lucide-react';
import { useHRSecurityGovernance } from '@/hooks/admin/hr/useHRSecurityGovernance';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props { companyId: string; }

const severityColor: Record<string, string> = {
  low: 'bg-green-500/10 text-green-700 border-green-500/30',
  medium: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  high: 'bg-orange-500/10 text-orange-700 border-orange-500/30',
  critical: 'bg-destructive/10 text-destructive border-destructive/30',
};

const classificationColor: Record<string, string> = {
  public: 'bg-green-500/10 text-green-700',
  internal: 'bg-blue-500/10 text-blue-700',
  confidential: 'bg-amber-500/10 text-amber-700',
  restricted: 'bg-orange-500/10 text-orange-700',
  top_secret: 'bg-destructive/10 text-destructive',
};

export function HRSecurityGovernancePanel({ companyId }: Props) {
  const {
    loading, analyzing, stats, classifications, maskingRules, sodRules, violations, incidents, analysis,
    fetchAll, seedDemo, runSecurityAnalysis
  } = useHRSecurityGovernance();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { fetchAll(companyId); }, [companyId]);

  const isEmpty = !stats || (stats.total_classifications === 0 && stats.active_sod_rules === 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" /> Security Governance & SoD
          </h3>
          <p className="text-sm text-muted-foreground">Data Masking, Segregación de Funciones, Incidentes y Compliance</p>
        </div>
        <div className="flex gap-2">
          {isEmpty && (
            <Button onClick={() => seedDemo(companyId)} disabled={loading} size="sm" variant="outline">
              <Database className="h-4 w-4 mr-1" /> Generar Demo
            </Button>
          )}
          <Button onClick={() => fetchAll(companyId)} disabled={loading} size="sm" variant="outline">
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} /> Refrescar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardContent className="p-3 text-center">
            <Database className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{stats.total_classifications}</p>
            <p className="text-xs text-muted-foreground">Clasificaciones</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <Lock className="h-5 w-5 mx-auto mb-1 text-purple-500" />
            <p className="text-2xl font-bold">{stats.active_sod_rules}</p>
            <p className="text-xs text-muted-foreground">Reglas SoD</p>
          </CardContent></Card>
          <Card className={stats.open_violations > 0 ? 'border-destructive/50' : ''}>
            <CardContent className="p-3 text-center">
              <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-orange-500" />
              <p className="text-2xl font-bold">{stats.open_violations}</p>
              <p className="text-xs text-muted-foreground">Violaciones Abiertas</p>
            </CardContent>
          </Card>
          <Card className={stats.active_incidents > 0 ? 'border-destructive/50' : ''}>
            <CardContent className="p-3 text-center">
              <ShieldAlert className="h-5 w-5 mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-bold">{stats.active_incidents}</p>
              <p className="text-xs text-muted-foreground">Incidentes Activos</p>
            </CardContent>
          </Card>
          <Card><CardContent className="p-3 text-center">
            <Activity className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold">{stats.total_access_logs}</p>
            <p className="text-xs text-muted-foreground">Accesos Registrados</p>
          </CardContent></Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="text-xs">Resumen</TabsTrigger>
          <TabsTrigger value="classification" className="text-xs">Clasificación</TabsTrigger>
          <TabsTrigger value="masking" className="text-xs">Masking</TabsTrigger>
          <TabsTrigger value="sod" className="text-xs">SoD</TabsTrigger>
          <TabsTrigger value="incidents" className="text-xs">Incidentes</TabsTrigger>
          <TabsTrigger value="ai" className="text-xs">IA Analysis</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Violations */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileWarning className="h-4 w-4" /> Violaciones SoD Recientes</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  {violations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Sin violaciones detectadas</p>
                  ) : (
                    <div className="space-y-2">
                      {violations.slice(0, 10).map(v => (
                        <div key={v.id} className="p-2 rounded-lg border bg-card text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <Badge className={cn('text-xs', severityColor[v.erp_hr_sod_rules?.severity || 'medium'])}>{v.erp_hr_sod_rules?.severity || 'N/A'}</Badge>
                            <Badge variant="outline" className="text-xs">{v.status}</Badge>
                          </div>
                          <p className="font-medium text-xs">{v.erp_hr_sod_rules?.name || v.violation_type}</p>
                          <p className="text-xs text-muted-foreground">{v.conflicting_action_a} ↔ {v.conflicting_action_b}</p>
                          <div className="flex justify-between mt-1">
                            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(v.detected_at), { locale: es, addSuffix: true })}</span>
                            <span className="text-xs">Riesgo: {v.risk_score}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Incidents */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Incidentes de Seguridad</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  {incidents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Sin incidentes</p>
                  ) : (
                    <div className="space-y-2">
                      {incidents.slice(0, 10).map(inc => (
                        <div key={inc.id} className="p-2 rounded-lg border bg-card text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <Badge className={cn('text-xs', severityColor[inc.severity])}>{inc.severity}</Badge>
                            <Badge variant="outline" className="text-xs">{inc.status}</Badge>
                          </div>
                          <p className="font-medium text-xs">{inc.title}</p>
                          <p className="text-xs text-muted-foreground">{inc.description?.substring(0, 80)}...</p>
                          <div className="flex justify-between mt-1">
                            <span className="text-xs text-muted-foreground">{inc.affected_records} registros afectados</span>
                            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(inc.detected_at), { locale: es, addSuffix: true })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CLASSIFICATION */}
        <TabsContent value="classification">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4" /> Clasificación de Datos Sensibles</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {classifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sin clasificaciones. Genera datos demo.</p>
                ) : (
                  <div className="space-y-2">
                    {classifications.map(c => (
                      <div key={c.id} className="p-3 rounded-lg border bg-card flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={cn('text-xs', classificationColor[c.classification])}>{c.classification}</Badge>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{c.table_name}.{c.field_path}</code>
                          </div>
                          <p className="text-xs text-muted-foreground">{c.description}</p>
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            {c.gdpr_category && <span>GDPR: {c.gdpr_category}</span>}
                            <span>Retención: {c.retention_days}d</span>
                            {c.requires_encryption && <Badge variant="outline" className="text-xs h-5">🔐 Cifrado</Badge>}
                            {c.requires_consent && <Badge variant="outline" className="text-xs h-5">✋ Consentimiento</Badge>}
                          </div>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-muted-foreground">Nivel</span>
                          <span className="text-lg font-bold">{c.sensitivity_level}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MASKING */}
        <TabsContent value="masking">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><EyeOff className="h-4 w-4" /> Reglas de Enmascaramiento Dinámico</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {maskingRules.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sin reglas de masking</p>
                ) : (
                  <div className="space-y-2">
                    {maskingRules.map(r => (
                      <div key={r.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.table_name}.{r.field_path}</code>
                            <Badge variant="outline" className="text-xs">{r.masking_type}</Badge>
                          </div>
                          <Badge variant={r.is_active ? 'default' : 'secondary'} className="text-xs">{r.is_active ? 'Activa' : 'Inactiva'}</Badge>
                        </div>
                        {r.masking_pattern && <p className="text-xs font-mono mb-1">Patrón: <code>{r.masking_pattern}</code></p>}
                        <div className="flex gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">Visible para:</span>
                          {r.visible_to_roles.map(role => <Badge key={role} variant="outline" className="text-xs h-5">{role}</Badge>)}
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          {r.applies_to_ui && <span>✓ UI</span>}
                          {r.applies_to_api && <span>✓ API</span>}
                          {r.applies_to_export && <span>✓ Export</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SoD */}
        <TabsContent value="sod">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Lock className="h-4 w-4" /> Reglas de Segregación</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[350px]">
                  {sodRules.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Sin reglas SoD</p>
                  ) : (
                    <div className="space-y-2">
                      {sodRules.map(r => (
                        <div key={r.id} className="p-3 rounded-lg border bg-card">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium">{r.name}</p>
                            <Badge className={cn('text-xs', severityColor[r.severity])}>{r.severity}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{r.description}</p>
                          <div className="flex flex-wrap gap-1 mb-1">
                            {r.conflicting_permissions.map(p => <Badge key={p} variant="outline" className="text-xs font-mono h-5">{p}</Badge>)}
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Tipo: {r.rule_type}</span>
                            {r.regulatory_reference && <span>Ref: {r.regulatory_reference}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Violaciones Detectadas</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[350px]">
                  {violations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Sin violaciones</p>
                  ) : (
                    <div className="space-y-2">
                      {violations.map(v => (
                        <div key={v.id} className={cn("p-3 rounded-lg border", v.status === 'open' ? 'border-destructive/30 bg-destructive/5' : 'bg-card')}>
                          <div className="flex items-center justify-between mb-1">
                            <Badge className={cn('text-xs', severityColor[v.erp_hr_sod_rules?.severity || 'medium'])}>{v.erp_hr_sod_rules?.name || 'Regla'}</Badge>
                            <Badge variant="outline" className="text-xs">{v.status}</Badge>
                          </div>
                          <p className="text-xs font-mono">{v.conflicting_action_a} ↔ {v.conflicting_action_b}</p>
                          <div className="flex justify-between mt-2">
                            <Progress value={v.risk_score} className="h-1.5 w-20" />
                            <span className="text-xs">Riesgo: {v.risk_score}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* INCIDENTS */}
        <TabsContent value="incidents">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Gestión de Incidentes de Seguridad</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {incidents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sin incidentes registrados</p>
                ) : (
                  <div className="space-y-3">
                    {incidents.map(inc => (
                      <div key={inc.id} className={cn("p-3 rounded-lg border", ['open', 'investigating'].includes(inc.status) ? 'border-destructive/30' : '')}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Badge className={cn('text-xs', severityColor[inc.severity])}>{inc.severity}</Badge>
                            <Badge variant="outline" className="text-xs">{inc.incident_type.replace(/_/g, ' ')}</Badge>
                          </div>
                          <Badge variant={['open', 'investigating'].includes(inc.status) ? 'destructive' : 'secondary'} className="text-xs">{inc.status}</Badge>
                        </div>
                        <p className="text-sm font-medium">{inc.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{inc.description}</p>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{inc.affected_records} registros</span>
                          <span>{inc.affected_tables.join(', ')}</span>
                          <span>{formatDistanceToNow(new Date(inc.detected_at), { locale: es, addSuffix: true })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI ANALYSIS */}
        <TabsContent value="ai">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4" /> Análisis de Seguridad con IA</CardTitle>
                <Button onClick={() => runSecurityAnalysis(companyId)} disabled={analyzing} size="sm">
                  <Sparkles className={cn("h-4 w-4 mr-1", analyzing && "animate-spin")} />
                  {analyzing ? 'Analizando...' : 'Ejecutar Análisis'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!analysis ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Ejecuta un análisis IA para obtener una evaluación completa de seguridad</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Overall Score */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { label: 'Score Global', value: analysis.overall_score, icon: ShieldCheck },
                      { label: 'Protección Datos', value: analysis.data_protection_score, icon: Database },
                      { label: 'SoD Compliance', value: analysis.sod_compliance_score, icon: Lock },
                      { label: 'Control Accesos', value: analysis.access_control_score, icon: Eye },
                      { label: 'GDPR', value: analysis.gdpr_compliance?.score || 0, icon: Shield },
                    ].map(({ label, value, icon: Icon }) => (
                      <Card key={label}>
                        <CardContent className="p-3 text-center">
                          <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                          <p className={cn("text-2xl font-bold", value >= 80 ? 'text-green-600' : value >= 60 ? 'text-amber-600' : 'text-destructive')}>{value}</p>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <Progress value={value} className="h-1 mt-1" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Executive Summary */}
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-sm font-medium mb-1">Resumen Ejecutivo</p>
                      <p className="text-xs text-muted-foreground">{analysis.executive_summary}</p>
                      <Badge variant="outline" className="mt-2 text-xs">Madurez: {analysis.maturity_level}</Badge>
                    </CardContent>
                  </Card>

                  {/* Risk Areas + Priorities */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-1"><CardTitle className="text-xs">Áreas de Riesgo</CardTitle></CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-2">
                            {analysis.risk_areas?.map((r, i) => (
                              <div key={i} className="p-2 rounded border text-xs">
                                <div className="flex justify-between mb-1">
                                  <span className="font-medium">{r.area}</span>
                                  <Badge className={cn('text-xs', severityColor[r.risk_level])}>{r.risk_level}</Badge>
                                </div>
                                <p className="text-muted-foreground">{r.recommendation}</p>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-1"><CardTitle className="text-xs">Prioridades</CardTitle></CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-2">
                            {analysis.top_priorities?.map((p, i) => (
                              <div key={i} className="p-2 rounded border text-xs flex items-start gap-2">
                                <span className="font-bold text-primary">{p.priority}.</span>
                                <div>
                                  <p className="font-medium">{p.action}</p>
                                  <div className="flex gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs h-5">Impacto: {p.impact}</Badge>
                                    <Badge variant="outline" className="text-xs h-5">Esfuerzo: {p.effort}</Badge>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRSecurityGovernancePanel;
