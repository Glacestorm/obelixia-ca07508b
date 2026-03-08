/**
 * HRComplianceAutomationPanel — P11
 * Compliance Automation: Frameworks, Checklists, Audits, Alerts
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Shield, Plus, RefreshCw, Play, CheckCircle, XCircle, AlertTriangle,
  Clock, FileText, Scale, Inbox, ArrowRight, Loader2, Sparkles, Download
} from 'lucide-react';
import { useHRComplianceAutomation, PREDEFINED_FRAMEWORKS } from '@/hooks/admin/hr/useHRComplianceAutomation';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId?: string;
  className?: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-500 text-white',
  medium: 'bg-amber-500 text-white',
  low: 'bg-muted text-muted-foreground',
  info: 'bg-primary/20 text-primary',
};

const CATEGORY_LABELS: Record<string, string> = {
  privacy: '🔒 Privacidad',
  labor: '⚖️ Laboral',
  equality: '🤝 Igualdad',
  whistleblowing: '📢 Canal Denuncias',
  safety: '🛡️ Prevención',
  ai_governance: '🤖 IA',
};

export function HRComplianceAutomationPanel({ companyId, className }: Props) {
  const {
    frameworks, checklist, audits, alerts,
    stats, isLoading,
    fetchAll, installFramework, toggleChecklistItem,
    runAIAudit, resolveAlert,
  } = useHRComplianceAutomation(companyId);

  const [activeTab, setActiveTab] = useState('overview');
  const [auditRunning, setAuditRunning] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);

  if (!companyId) {
    return (
      <Card className={cn("border-dashed opacity-60", className)}>
        <CardContent className="py-12 text-center">
          <Inbox className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Selecciona una empresa para gestionar cumplimiento</p>
        </CardContent>
      </Card>
    );
  }

  const handleRunAudit = async () => {
    setAuditRunning(true);
    await runAIAudit(selectedFramework || undefined);
    setAuditRunning(false);
  };

  const installedCodes = frameworks.map(f => f.code);
  const availableFrameworks = PREDEFINED_FRAMEWORKS.filter(f => !installedCodes.includes(f.code));

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Motor de Cumplimiento Automatizado
          </h2>
          <p className="text-sm text-muted-foreground">
            {stats.activeFrameworks} marcos activos · {stats.avgComplianceScore}% cumplimiento medio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRunAudit} disabled={auditRunning || frameworks.length === 0} className="gap-2">
            {auditRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Auditoría IA
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={isLoading} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-2xl font-bold">{stats.activeFrameworks}</div>
            <p className="text-xs text-muted-foreground">Marcos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.avgComplianceScore}%</div>
            <p className="text-xs text-muted-foreground">Cumplimiento</p>
            <Progress value={stats.avgComplianceScore} className="mt-1 h-1" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-2xl font-bold">{stats.completedChecklist}/{stats.totalChecklist}</div>
            <p className="text-xs text-muted-foreground">Requisitos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className={cn("text-2xl font-bold", stats.overdueChecklist > 0 && "text-destructive")}>{stats.overdueChecklist}</div>
            <p className="text-xs text-muted-foreground">Vencidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className={cn("text-2xl font-bold", stats.criticalAlerts > 0 && "text-destructive")}>{stats.openAlerts}</div>
            <p className="text-xs text-muted-foreground">Alertas</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="overview" className="gap-1.5 text-xs">
            <Shield className="h-3.5 w-3.5" /> Marcos
          </TabsTrigger>
          <TabsTrigger value="checklist" className="gap-1.5 text-xs">
            <CheckCircle className="h-3.5 w-3.5" /> Checklist
          </TabsTrigger>
          <TabsTrigger value="audits" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> Auditorías
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5 text-xs">
            <AlertTriangle className="h-3.5 w-3.5" /> Alertas ({stats.openAlerts})
          </TabsTrigger>
        </TabsList>

        {/* Frameworks Tab */}
        <TabsContent value="overview">
          <div className="space-y-4">
            {/* Installed frameworks */}
            {frameworks.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Marcos Normativos Instalados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {frameworks.map(fw => (
                      <div key={fw.id} className="p-3 rounded-lg border hover:border-primary/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{fw.name}</span>
                              <Badge variant="outline" className="text-[10px]">{fw.code}</Badge>
                              <Badge variant="secondary" className="text-[10px]">
                                {CATEGORY_LABELS[fw.category] || fw.category}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex-1 max-w-xs">
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                                  <span>{fw.met_requirements}/{fw.total_requirements} requisitos</span>
                                  <span>{Number(fw.compliance_score).toFixed(0)}%</span>
                                </div>
                                <Progress value={Number(fw.compliance_score)} className="h-1.5" />
                              </div>
                              <Badge variant={Number(fw.compliance_score) >= 80 ? "default" : Number(fw.compliance_score) >= 50 ? "secondary" : "destructive"} className="text-[10px]">
                                {Number(fw.compliance_score) >= 80 ? 'Conforme' : Number(fw.compliance_score) >= 50 ? 'Parcial' : 'No conforme'}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost" size="sm" className="gap-1 text-xs shrink-0"
                            onClick={() => { setSelectedFramework(fw.id); setActiveTab('checklist'); }}
                          >
                            Ver <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Available templates */}
            {availableFrameworks.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Marcos Disponibles para Instalar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableFrameworks.map(fw => (
                      <div key={fw.code} className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/30 transition-colors">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{fw.code}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{fw.name}</div>
                          <div className="flex gap-1.5 mt-1">
                            <Badge variant="outline" className="text-[9px]">{fw.jurisdiction}</Badge>
                            <Badge variant="outline" className="text-[9px]">{fw.requirements} req.</Badge>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="gap-1 shrink-0 ml-2" onClick={() => installFramework(fw.code)}>
                          <Plus className="h-3.5 w-3.5" /> Instalar
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Checklist Tab */}
        <TabsContent value="checklist">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Checklist de Cumplimiento</CardTitle>
                {selectedFramework && (
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedFramework(null)}>
                    Ver todos
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {checklist.length === 0 ? (
                  <div className="py-12 text-center">
                    <CheckCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Instala un marco normativo para generar el checklist</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {checklist
                      .filter(item => !selectedFramework || item.framework_id === selectedFramework)
                      .map(item => {
                        const isOverdue = item.status !== 'completed' && item.due_date && item.due_date < new Date().toISOString().split('T')[0];
                        return (
                          <div key={item.id} className={cn(
                            "flex items-start gap-3 p-2.5 rounded-lg border transition-colors",
                            item.status === 'completed' ? "bg-muted/30 opacity-70" : "hover:bg-muted/50",
                            isOverdue && "border-destructive/30"
                          )}>
                            <Checkbox
                              checked={item.status === 'completed'}
                              onCheckedChange={(checked) => toggleChecklistItem(item.id, !!checked)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn("text-sm", item.status === 'completed' && "line-through")}>{item.title}</span>
                                <Badge variant="outline" className="text-[9px]">{item.requirement_code}</Badge>
                                {item.priority === 'critical' && <Badge variant="destructive" className="text-[9px]">Crítico</Badge>}
                                {item.priority === 'high' && <Badge className="text-[9px] bg-orange-500">Alto</Badge>}
                                {isOverdue && <Badge variant="destructive" className="text-[9px]">Vencido</Badge>}
                                {item.evidence_required && <Badge variant="secondary" className="text-[9px]">📎 Evidencia</Badge>}
                              </div>
                              {item.description && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">{item.description}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audits Tab */}
        <TabsContent value="audits">
          <Card>
            <CardContent className="pt-4">
              <ScrollArea className="h-[400px]">
                {audits.length === 0 ? (
                  <div className="py-12 text-center">
                    <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground mb-3">Sin auditorías registradas</p>
                    <Button variant="outline" size="sm" onClick={handleRunAudit} disabled={auditRunning || frameworks.length === 0} className="gap-2">
                      {auditRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Ejecutar Auditoría IA
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {audits.map(audit => (
                      <div key={audit.id} className="p-3 rounded-lg border">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{audit.audit_name}</span>
                              <Badge variant={audit.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">{audit.status}</Badge>
                              <Badge className={cn("text-[10px]", SEVERITY_COLORS[audit.risk_level || 'low'])}>
                                Riesgo: {audit.risk_level}
                              </Badge>
                            </div>
                            {audit.overall_score != null && (
                              <div className="flex items-center gap-2 mt-2">
                                <Progress value={Number(audit.overall_score)} className="h-1.5 w-24" />
                                <span className="text-xs text-muted-foreground">{Number(audit.overall_score).toFixed(0)}%</span>
                              </div>
                            )}
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                              <span>{audit.auditor_name}</span>
                              <span>·</span>
                              <span>{(audit.findings as any[])?.length || 0} hallazgos</span>
                              <span>·</span>
                              <span>{(audit.recommendations as any[])?.length || 0} recomendaciones</span>
                              {audit.completed_at && (
                                <>
                                  <span>·</span>
                                  <span>{formatDistanceToNow(new Date(audit.completed_at), { locale: es, addSuffix: true })}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Findings summary */}
                        {(audit.findings as any[])?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {(audit.findings as any[]).slice(0, 3).map((finding: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <Badge className={cn("text-[9px] shrink-0", SEVERITY_COLORS[finding.severity || 'info'])}>
                                  {finding.severity}
                                </Badge>
                                <span className="truncate">{finding.title}</span>
                              </div>
                            ))}
                            {(audit.findings as any[]).length > 3 && (
                              <span className="text-[10px] text-muted-foreground">+{(audit.findings as any[]).length - 3} más</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardContent className="pt-4">
              <ScrollArea className="h-[400px]">
                {alerts.length === 0 ? (
                  <div className="py-12 text-center">
                    <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Sin alertas de cumplimiento</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alerts.map(alert => (
                      <div key={alert.id} className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                        alert.status === 'resolved' ? "opacity-50" : "hover:bg-muted/50"
                      )}>
                        <AlertTriangle className={cn("h-4 w-4 mt-0.5 shrink-0",
                          alert.severity === 'critical' ? "text-destructive" :
                          alert.severity === 'high' ? "text-orange-500" :
                          "text-amber-500"
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{alert.title}</span>
                            <Badge className={cn("text-[9px]", SEVERITY_COLORS[alert.severity])}>
                              {alert.severity}
                            </Badge>
                            {alert.status === 'resolved' && <Badge variant="outline" className="text-[9px]">Resuelto</Badge>}
                          </div>
                          {alert.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">{alert.description}</p>
                          )}
                          {alert.regulation_reference && (
                            <p className="text-[10px] text-primary mt-0.5">📜 {alert.regulation_reference}</p>
                          )}
                          {alert.remediation_action && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">💡 {alert.remediation_action}</p>
                          )}
                        </div>
                        {alert.status === 'open' && (
                          <Button variant="ghost" size="sm" className="shrink-0 text-xs" onClick={() => resolveAlert(alert.id)}>
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Resolver
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRComplianceAutomationPanel;
