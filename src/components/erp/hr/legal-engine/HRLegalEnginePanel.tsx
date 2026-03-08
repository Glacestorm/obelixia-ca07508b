/**
 * HRLegalEnginePanel - Documentary Legal Engine Premium (P6)
 * Contract generation, clause library, compliance automation
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  RefreshCw, Sparkles, FileText, BookOpen, ShieldCheck, Scale,
  AlertTriangle, CheckCircle, XCircle, Database, FileSignature,
  Maximize2, Minimize2, Clock, Tag
} from 'lucide-react';
import { useHRLegalEngine } from '@/hooks/admin/hr/useHRLegalEngine';
import { DataSourceBadge, resolveDataSource } from '@/components/erp/hr/shared/DataSourceBadge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId: string;
}

export function HRLegalEnginePanel({ companyId }: Props) {
  const [activeTab, setActiveTab] = useState('summary');
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    templates, clauses, contracts, stats, aiAnalysis,
    loading, aiLoading,
    loadAll, seedDemo, aiComplianceAnalysis, aiClauseReview, aiGenerateContract,
    realContracts, realDataLoading, fetchRealContracts, syncRealContractsToLegal,
  } = useHRLegalEngine();

  const hasRealData = !!(realContracts && Object.keys(realContracts).length > 0);

  useEffect(() => {
    loadAll(companyId);
    fetchRealContracts(companyId);
  }, [companyId, loadAll, fetchRealContracts]);

  const handleSeed = useCallback(() => seedDemo(companyId), [companyId, seedDemo]);
  const handleRefresh = useCallback(() => loadAll(companyId), [companyId, loadAll]);

  const handleAICompliance = useCallback(() => {
    aiComplianceAnalysis(companyId, {
      templates_count: templates.length,
      clauses_count: clauses.length,
      contracts_count: contracts.length,
      template_types: [...new Set(templates.map(t => t.template_type))],
      clause_categories: [...new Set(clauses.map(c => c.category))],
    });
  }, [companyId, templates, clauses, contracts, aiComplianceAnalysis]);

  const handleAIClauseReview = useCallback(() => {
    aiClauseReview(companyId, {
      clauses: clauses.map(c => ({ name: c.clause_name, type: c.clause_type, category: c.category, content: c.content.substring(0, 200), risk_level: c.risk_level, is_mandatory: c.is_mandatory })),
    });
  }, [companyId, clauses, aiClauseReview]);

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      active: 'bg-emerald-500/10 text-emerald-600', draft: 'bg-amber-500/10 text-amber-600',
      signed: 'bg-blue-500/10 text-blue-600', archived: 'bg-muted text-muted-foreground',
      pending_review: 'bg-orange-500/10 text-orange-600', expired: 'bg-red-500/10 text-red-600',
    };
    return map[status] || 'bg-muted text-muted-foreground';
  };

  const riskColor = (level: string) => {
    const map: Record<string, string> = { low: 'text-emerald-600', medium: 'text-amber-600', high: 'text-orange-600', critical: 'text-red-600' };
    return map[level] || 'text-muted-foreground';
  };

  const isEmpty = !templates.length && !clauses.length && !contracts.length;

  return (
    <Card className={cn("transition-all duration-300 overflow-hidden", isExpanded && "fixed inset-4 z-50 shadow-2xl")}>
      <CardHeader className="pb-2 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <FileSignature className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Legal Engine Premium</CardTitle>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Generación contractual + Biblioteca cláusulas + Compliance</p>
                <DataSourceBadge source={resolveDataSource(hasRealData)} lastUpdated={new Date()} compact />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isEmpty && (
              <Button variant="outline" size="sm" onClick={handleSeed} disabled={loading} className="gap-1 text-xs">
                <Database className="h-3 w-3" /> Demo
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={loading} className="h-8 w-8">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="h-8 w-8">
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn("pt-3", isExpanded && "h-[calc(100%-80px)]")}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-5 mb-3">
            <TabsTrigger value="summary" className="text-xs">Resumen</TabsTrigger>
            <TabsTrigger value="templates" className="text-xs">Plantillas</TabsTrigger>
            <TabsTrigger value="clauses" className="text-xs">Cláusulas</TabsTrigger>
            <TabsTrigger value="contracts" className="text-xs">Contratos</TabsTrigger>
            <TabsTrigger value="ai" className="text-xs">IA Analysis</TabsTrigger>
          </TabsList>

          {/* === SUMMARY === */}
          <TabsContent value="summary" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[400px]"}>
              <div className="space-y-4">
                {/* KPIs */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
                    <CardContent className="p-3 text-center">
                      <FileText className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                      <p className="text-2xl font-bold">{stats?.total_templates || 0}</p>
                      <p className="text-xs text-muted-foreground">Plantillas</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                    <CardContent className="p-3 text-center">
                      <BookOpen className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                      <p className="text-2xl font-bold">{stats?.total_clauses || 0}</p>
                      <p className="text-xs text-muted-foreground">Cláusulas</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                    <CardContent className="p-3 text-center">
                      <FileSignature className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
                      <p className="text-2xl font-bold">{stats?.total_contracts || 0}</p>
                      <p className="text-xs text-muted-foreground">Contratos</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">Borradores pendientes</p>
                      <p className="text-xl font-bold text-amber-600">{stats?.draft_contracts || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">Contratos activos</p>
                      <p className="text-xl font-bold text-emerald-600">{stats?.active_contracts || 0}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent contracts */}
                {contracts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Contratos recientes</h4>
                    <div className="space-y-2">
                      {contracts.slice(0, 5).map(c => (
                        <div key={c.id} className="flex items-center justify-between p-2 rounded-lg border bg-card">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{c.contract_number}</p>
                              <p className="text-xs text-muted-foreground">{c.employee_name || 'Sin asignar'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={cn("text-xs", statusColor(c.status))}>{c.status}</Badge>
                            <div className="text-right">
                              <p className={cn("text-xs font-medium", c.compliance_score >= 90 ? 'text-emerald-600' : c.compliance_score >= 70 ? 'text-amber-600' : 'text-red-600')}>
                                {c.compliance_score}%
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* === TEMPLATES === */}
          <TabsContent value="templates" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[400px]"}>
              <div className="space-y-2">
                {templates.map(t => (
                  <Card key={t.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-amber-500" />
                          <span className="text-sm font-medium">{t.template_name}</span>
                        </div>
                        <Badge className={cn("text-xs", statusColor(t.status))}>{t.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">{t.template_type}</Badge>
                        <Badge variant="outline" className="text-xs">{t.category}</Badge>
                        <span>v{t.version}</span>
                        <span>•</span>
                        <span>{t.jurisdiction}</span>
                        <span>•</span>
                        <span>Usado {t.usage_count}x</span>
                      </div>
                      {t.required_variables.length > 0 && (
                        <div className="mt-2 flex gap-1 flex-wrap">
                          {t.required_variables.slice(0, 5).map(v => (
                            <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
                          ))}
                          {t.required_variables.length > 5 && (
                            <Badge variant="secondary" className="text-xs">+{t.required_variables.length - 5}</Badge>
                          )}
                        </div>
                      )}
                      {t.applicable_regulations.length > 0 && (
                        <div className="mt-1 flex gap-1 flex-wrap">
                          {t.applicable_regulations.map(r => (
                            <span key={r} className="text-xs text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded">{r}</span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {templates.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    Sin plantillas. Carga datos demo para comenzar.
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* === CLAUSES === */}
          <TabsContent value="clauses" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[400px]"}>
              <div className="space-y-2">
                {clauses.map(c => (
                  <Card key={c.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">{c.clause_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {c.is_mandatory && <Badge variant="destructive" className="text-xs">Obligatoria</Badge>}
                          <Badge className={cn("text-xs", riskColor(c.risk_level))} variant="outline">{c.risk_level}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{c.content}</p>
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <Badge variant="outline">{c.category}</Badge>
                        <Badge variant="outline">{c.clause_type}</Badge>
                        {c.legal_basis && (
                          <span className="text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded">{c.legal_basis}</span>
                        )}
                        {c.is_negotiable && <span className="text-emerald-600">Negociable</span>}
                        {c.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-muted-foreground flex items-center gap-0.5">
                            <Tag className="h-3 w-3" />{tag}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {clauses.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    Sin cláusulas. Carga datos demo para comenzar.
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* === CONTRACTS === */}
          <TabsContent value="contracts" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[400px]"}>
              <div className="space-y-2">
                {contracts.map(c => (
                  <Card key={c.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium">{c.contract_number}</p>
                          <p className="text-xs text-muted-foreground">{c.employee_name || '—'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={cn("text-xs", statusColor(c.status))}>{c.status}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">{c.contract_type}</Badge>
                          {c.effective_date && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{c.effective_date}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Compliance:</span>
                          <div className="flex items-center gap-1">
                            {c.compliance_score >= 90 ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : c.compliance_score >= 70 ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                            <span className={cn("text-sm font-bold", c.compliance_score >= 90 ? 'text-emerald-600' : c.compliance_score >= 70 ? 'text-amber-600' : 'text-red-600')}>
                              {c.compliance_score}%
                            </span>
                          </div>
                        </div>
                      </div>
                      {Array.isArray(c.compliance_issues) && c.compliance_issues.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {(c.compliance_issues as Array<{ issue?: string; severity?: string }>).map((issue, i) => (
                            <div key={i} className="flex items-center gap-1 text-xs text-red-600 bg-red-500/10 px-2 py-1 rounded">
                              <AlertTriangle className="h-3 w-3" />
                              {issue.issue || 'Issue'}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {contracts.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <FileSignature className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    Sin contratos generados.
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* === AI ANALYSIS === */}
          <TabsContent value="ai" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-280px)]" : "h-[400px]"}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={handleAICompliance} disabled={aiLoading} className="gap-1.5" variant="outline" size="sm">
                    <ShieldCheck className="h-4 w-4" />
                    Compliance Analysis
                  </Button>
                  <Button onClick={handleAIClauseReview} disabled={aiLoading || clauses.length === 0} className="gap-1.5" variant="outline" size="sm">
                    <Scale className="h-4 w-4" />
                    Clause Review
                  </Button>
                </div>

                {aiLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <Sparkles className="h-8 w-8 animate-pulse text-amber-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Analizando con IA...</p>
                    </div>
                  </div>
                )}

                {aiAnalysis && !aiLoading && (
                  <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        <h4 className="font-medium text-sm">Resultado del Análisis IA</h4>
                      </div>

                      {/* Executive Summary */}
                      {(aiAnalysis as any).executive_summary && (
                        <p className="text-sm mb-3 p-3 bg-background/50 rounded-lg">{(aiAnalysis as any).executive_summary}</p>
                      )}
                      {(aiAnalysis as any).summary && (
                        <p className="text-sm mb-3 p-3 bg-background/50 rounded-lg">{(aiAnalysis as any).summary}</p>
                      )}

                      {/* Overall Score */}
                      {(aiAnalysis as any).overall_compliance_score !== undefined && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Compliance Score</span>
                            <span className="font-bold">{(aiAnalysis as any).overall_compliance_score}%</span>
                          </div>
                          <Progress value={(aiAnalysis as any).overall_compliance_score} className="h-2" />
                        </div>
                      )}
                      {(aiAnalysis as any).overall_quality_score !== undefined && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Quality Score</span>
                            <span className="font-bold">{(aiAnalysis as any).overall_quality_score}%</span>
                          </div>
                          <Progress value={(aiAnalysis as any).overall_quality_score} className="h-2" />
                        </div>
                      )}

                      {/* Missing Documents */}
                      {(aiAnalysis as any).missing_documents?.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-xs font-medium mb-1">Documentos faltantes</h5>
                          {(aiAnalysis as any).missing_documents.map((doc: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs p-2 bg-red-500/10 rounded mb-1">
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                              <span className="flex-1">{doc.document || doc}</span>
                              {doc.urgency && <Badge variant="outline" className="text-xs">{doc.urgency}</Badge>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Clause Reviews */}
                      {(aiAnalysis as any).clause_reviews?.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-xs font-medium mb-1">Revisión de Cláusulas</h5>
                          {(aiAnalysis as any).clause_reviews.map((rev: any, i: number) => (
                            <div key={i} className="p-2 border rounded mb-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium">{rev.clause_name}</span>
                                <Badge className={cn("text-xs", rev.validity === 'valid' ? 'bg-emerald-500/10 text-emerald-600' : rev.validity === 'questionable' ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600')}>
                                  {rev.validity}
                                </Badge>
                              </div>
                              {rev.issues?.length > 0 && (
                                <div className="mt-1">
                                  {rev.issues.map((issue: string, j: number) => (
                                    <p key={j} className="text-xs text-red-600">• {issue}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action Plan */}
                      {(aiAnalysis as any).action_plan?.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium mb-1">Plan de Acción</h5>
                          {(aiAnalysis as any).action_plan.map((a: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs p-2 bg-muted/50 rounded mb-1">
                              <span className="font-bold text-amber-600">#{a.priority || i + 1}</span>
                              <span className="flex-1">{a.action}</span>
                              {a.deadline && <span className="text-muted-foreground">{a.deadline}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {!aiAnalysis && !aiLoading && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <Sparkles className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    Selecciona un análisis para comenzar
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default HRLegalEnginePanel;
