import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText, Sparkles, RefreshCw, Download, Send, Eye, CheckCircle, Clock,
  AlertTriangle, ArrowRight, BarChart3, Shield, Users, Building2, Scale,
  Brain, Globe, Activity, Loader2, ChevronDown, ChevronRight, Archive
} from 'lucide-react';
import { useHRBoardPack, type BoardPack, type BoardPackSection } from '@/hooks/admin/hr/useHRBoardPack';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Borrador', color: 'bg-muted text-muted-foreground', icon: <FileText className="h-3 w-3" /> },
  reviewed: { label: 'Revisado', color: 'bg-blue-500/10 text-blue-600', icon: <Eye className="h-3 w-3" /> },
  approved: { label: 'Aprobado', color: 'bg-green-500/10 text-green-600', icon: <CheckCircle className="h-3 w-3" /> },
  distributed: { label: 'Distribuido', color: 'bg-violet-500/10 text-violet-600', icon: <Send className="h-3 w-3" /> },
  archived: { label: 'Archivado', color: 'bg-amber-500/10 text-amber-600', icon: <Archive className="h-3 w-3" /> },
};

const SECTION_ICONS: Record<string, React.ReactNode> = {
  headcount: <Users className="h-4 w-4" />,
  workforce_planning: <BarChart3 className="h-4 w-4" />,
  fairness: <Scale className="h-4 w-4" />,
  compliance: <Shield className="h-4 w-4" />,
  legal: <FileText className="h-4 w-4" />,
  security: <Shield className="h-4 w-4" />,
  ai_governance: <Brain className="h-4 w-4" />,
  cnae: <Globe className="h-4 w-4" />,
  digital_twin: <Activity className="h-4 w-4" />,
  alerts: <AlertTriangle className="h-4 w-4" />,
  regulatory: <FileText className="h-4 w-4" />,
  integrations: <Building2 className="h-4 w-4" />,
};

export function HRBoardPackPanel({ companyId }: Props) {
  const {
    templates, packs, reviews, distributions,
    isLoading, isGenerating,
    audienceLabels,
    fetchReviews, fetchDistributions,
    generatePack, updateStatus, logDistribution,
  } = useHRBoardPack(companyId);

  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedPack, setSelectedPack] = useState<BoardPack | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [reviewComment, setReviewComment] = useState('');

  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate) return;
    const pack = await generatePack(selectedTemplate, { start: periodStart, end: periodEnd });
    if (pack) {
      setSelectedPack(pack);
      setActiveTab('preview');
    }
  }, [selectedTemplate, periodStart, periodEnd, generatePack]);

  const handleViewPack = useCallback((pack: BoardPack) => {
    setSelectedPack(pack);
    fetchReviews(pack.id);
    fetchDistributions(pack.id);
    setActiveTab('preview');
  }, [fetchReviews, fetchDistributions]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const sections = useMemo(() => {
    if (!selectedPack) return [];
    return (selectedPack.erp_hr_board_pack_sections || []).sort((a, b) => a.order_index - b.order_index);
  }, [selectedPack]);

  const narrative = selectedPack?.ai_narrative as any;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Board Pack / Comité</h2>
            <p className="text-sm text-muted-foreground">
              Packs ejecutivos consolidados para consejos y comités
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <Sparkles className="h-3 w-3" />
          Narrativa IA Premium
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="templates" className="text-xs">Plantillas</TabsTrigger>
          <TabsTrigger value="generate" className="text-xs">Generar</TabsTrigger>
          <TabsTrigger value="history" className="text-xs">Historial</TabsTrigger>
          <TabsTrigger value="preview" className="text-xs">Vista Previa</TabsTrigger>
          <TabsTrigger value="distribution" className="text-xs">Distribución</TabsTrigger>
        </TabsList>

        {/* TEMPLATES TAB */}
        <TabsContent value="templates">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {templates.map(tpl => (
              <Card key={tpl.id} className="hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => { setSelectedTemplate(tpl.id); setActiveTab('generate'); }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    {tpl.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">{tpl.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {(tpl.sections || []).slice(0, 5).map(s => (
                      <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                    ))}
                    {(tpl.sections || []).length > 5 && (
                      <Badge variant="outline" className="text-[10px]">+{(tpl.sections || []).length - 5}</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <Badge variant="outline" className="text-[10px]">{tpl.default_period}</Badge>
                    <Badge className="text-[10px] bg-primary/10 text-primary hover:bg-primary/20">
                      {audienceLabels[tpl.audience] || tpl.audience}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {templates.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hay plantillas disponibles</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* GENERATE TAB */}
        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generar Board Pack</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Plantilla</label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar plantilla" /></SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Inicio periodo</label>
                  <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fin periodo</label>
                  <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
                </div>
              </div>

              {selectedTemplate && (() => {
                const tpl = templates.find(t => t.id === selectedTemplate);
                if (!tpl) return null;
                return (
                  <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{tpl.name}</span>
                      <Badge variant="outline" className="text-[10px]">{audienceLabels[tpl.audience]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{tpl.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {(tpl.sections || []).map(s => (
                        <Badge key={s} variant="secondary" className="text-[10px] gap-1">
                          {SECTION_ICONS[s]}
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <Button
                onClick={handleGenerate}
                disabled={!selectedTemplate || isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generando con IA...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Generar Board Pack</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history">
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {packs.map(pack => {
                const statusCfg = STATUS_CONFIG[pack.status] || STATUS_CONFIG.draft;
                return (
                  <Card key={pack.id} className="hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => handleViewPack(pack)}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{pack.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {audienceLabels[pack.audience] || pack.audience} · {format(new Date(pack.generated_at), 'dd MMM yyyy', { locale: es })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn('text-[10px] gap-1', statusCfg.color)}>
                          {statusCfg.icon}
                          {statusCfg.label}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {packs.length === 0 && !isLoading && (
                <div className="text-center py-12 text-muted-foreground">
                  <Archive className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay board packs generados</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* PREVIEW TAB */}
        <TabsContent value="preview">
          {selectedPack ? (
            <div className="space-y-4">
              {/* Cover / Header */}
              <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-primary/20">
                <CardContent className="py-6 text-center space-y-3">
                  <Badge className="bg-primary/10 text-primary">{audienceLabels[selectedPack.audience]}</Badge>
                  <h2 className="text-xl font-bold">{selectedPack.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    Periodo: {selectedPack.period_start} — {selectedPack.period_end}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    {(() => {
                      const cfg = STATUS_CONFIG[selectedPack.status] || STATUS_CONFIG.draft;
                      return <Badge className={cn('gap-1', cfg.color)}>{cfg.icon}{cfg.label}</Badge>;
                    })()}
                    <Badge variant="outline" className="text-[10px]">
                      {format(new Date(selectedPack.generated_at), 'dd MMM yyyy HH:mm', { locale: es })}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Executive Summary */}
              {selectedPack.executive_summary && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Resumen Ejecutivo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed whitespace-pre-line">{selectedPack.executive_summary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Key Metrics */}
              {(selectedPack.key_metrics || []).length > 0 && (
                <div className="grid gap-2 md:grid-cols-4">
                  {selectedPack.key_metrics.map((m, i) => (
                    <Card key={i} className="p-3">
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className="text-lg font-bold">{m.value}</p>
                      {m.change !== undefined && (
                        <Badge variant="outline" className={cn('text-[10px]',
                          m.severity === 'success' ? 'text-green-600' :
                          m.severity === 'danger' ? 'text-destructive' :
                          m.severity === 'warning' ? 'text-amber-600' : ''
                        )}>
                          {m.change > 0 ? '+' : ''}{m.change}%
                        </Badge>
                      )}
                    </Card>
                  ))}
                </div>
              )}

              {/* Sections */}
              <div className="space-y-2">
                {sections.map(section => (
                  <Card key={section.id}>
                    <div
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleSection(section.id)}
                    >
                      {expandedSections.has(section.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      {SECTION_ICONS[section.section_key] || <FileText className="h-4 w-4" />}
                      <span className="text-sm font-medium flex-1">{section.title}</span>
                      <Badge variant="outline" className="text-[10px]">{section.data_source || 'N/A'}</Badge>
                    </div>
                    {expandedSections.has(section.id) && (
                      <CardContent className="pt-0 space-y-3">
                        <Separator />
                        {section.narrative && (
                          <p className="text-sm leading-relaxed whitespace-pre-line">{section.narrative}</p>
                        )}
                        {(section.metrics || []).length > 0 && (
                          <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
                            {section.metrics.map((m, i) => (
                              <div key={i} className="p-2 rounded border bg-muted/20">
                                <p className="text-[10px] text-muted-foreground">{m.label}</p>
                                <p className="text-sm font-semibold">{m.value}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {(section.alerts || []).length > 0 && (
                          <div className="space-y-1">
                            {section.alerts.map((a, i) => (
                              <div key={i} className={cn('flex items-start gap-2 p-2 rounded text-xs',
                                a.level === 'critical' ? 'bg-destructive/10 text-destructive' :
                                a.level === 'warning' ? 'bg-amber-500/10 text-amber-700' : 'bg-blue-500/10 text-blue-700'
                              )}>
                                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                                {a.message}
                              </div>
                            ))}
                          </div>
                        )}
                        {(section.recommendations || []).length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Recomendaciones:</p>
                            {section.recommendations.map((r, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                                {r}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>

              {/* Risks & Decisions */}
              {narrative?.risks?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Riesgos Identificados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {narrative.risks.map((r: any, i: number) => (
                      <div key={i} className="p-2 rounded border space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn('text-[10px]',
                            r.level === 'critical' ? 'border-destructive text-destructive' :
                            r.level === 'high' ? 'border-amber-500 text-amber-600' : ''
                          )}>{r.level}</Badge>
                          <span className="text-sm font-medium">{r.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{r.description}</p>
                        {r.mitigation && <p className="text-xs"><strong>Mitigación:</strong> {r.mitigation}</p>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {narrative?.decisions_suggested?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Decisiones Sugeridas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {narrative.decisions_suggested.map((d: any, i: number) => (
                      <div key={i} className="p-2 rounded border space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{d.urgency}</Badge>
                          <span className="text-sm font-medium">{d.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{d.description}</p>
                        {d.owner && <p className="text-xs"><strong>Responsable:</strong> {d.owner}</p>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Disclaimers */}
              {(selectedPack.disclaimers || []).length > 0 && (
                <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <p className="text-xs font-medium text-amber-700 mb-1">Disclaimers:</p>
                  {selectedPack.disclaimers.map((d, i) => (
                    <p key={i} className="text-xs text-amber-600">• {d}</p>
                  ))}
                </div>
              )}

              {/* Actions */}
              <Card>
                <CardContent className="py-3 flex flex-wrap gap-2">
                  {selectedPack.status === 'draft' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(selectedPack.id, 'reviewed', 'Revisión completada')}>
                      <Eye className="h-3.5 w-3.5 mr-1.5" /> Marcar Revisado
                    </Button>
                  )}
                  {(selectedPack.status === 'draft' || selectedPack.status === 'reviewed') && (
                    <Button size="sm" onClick={() => updateStatus(selectedPack.id, 'approved', 'Aprobado para distribución')}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Aprobar
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => {
                    logDistribution(selectedPack.id, 'download');
                    toast.success('Descarga registrada');
                  }}>
                    <Download className="h-3.5 w-3.5 mr-1.5" /> Descargar PDF
                  </Button>
                  {selectedPack.status === 'approved' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(selectedPack.id, 'distributed')}>
                      <Send className="h-3.5 w-3.5 mr-1.5" /> Distribuir
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Eye className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Selecciona o genera un board pack para previsualizarlo</p>
            </div>
          )}
        </TabsContent>

        {/* DISTRIBUTION TAB */}
        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Registro de Distribución y Revisiones</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPack ? (
                <div className="space-y-4">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Revisiones</h4>
                  {reviews.length > 0 ? reviews.map(r => (
                    <div key={r.id} className="flex items-start gap-3 p-2 rounded border text-sm">
                      <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs">
                          <strong>{r.reviewer_name}</strong> — {r.action}
                          {r.previous_status && r.new_status && ` (${r.previous_status} → ${r.new_status})`}
                        </p>
                        {r.comments && <p className="text-xs text-muted-foreground">{r.comments}</p>}
                        <p className="text-[10px] text-muted-foreground">{format(new Date(r.created_at), 'dd MMM yyyy HH:mm', { locale: es })}</p>
                      </div>
                    </div>
                  )) : <p className="text-xs text-muted-foreground">Sin revisiones registradas</p>}

                  <Separator />

                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Distribución</h4>
                  {distributions.length > 0 ? distributions.map(d => (
                    <div key={d.id} className="flex items-center gap-3 p-2 rounded border text-sm">
                      <Send className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-xs"><strong>{d.channel}</strong>{d.recipient && ` — ${d.recipient}`}</p>
                        <p className="text-[10px] text-muted-foreground">{format(new Date(d.distributed_at), 'dd MMM yyyy HH:mm', { locale: es })}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{d.status}</Badge>
                    </div>
                  )) : <p className="text-xs text-muted-foreground">Sin distribuciones registradas</p>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Selecciona un board pack del historial para ver su distribución
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRBoardPackPanel;
