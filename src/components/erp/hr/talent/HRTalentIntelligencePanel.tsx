/**
 * HRTalentIntelligencePanel - Dashboard unificado de Talent Intelligence
 * Tabs: Overview, Skill Graph, Career Paths, Talent Pools, Mentoring, Gap Analysis
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Brain, Network, Users, Target, Sparkles, RefreshCw,
  Database, ArrowRight, AlertTriangle, CheckCircle, Star,
  TrendingUp, Briefcase, GraduationCap, UserCheck, Lightbulb,
  Shield, Activity
} from 'lucide-react';
import { useHRTalentIntelligence } from '@/hooks/admin/hr/useHRTalentIntelligence';
import { cn } from '@/lib/utils';

interface Props {
  companyId: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  technical: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  leadership: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  management: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  soft_skills: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  legal: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  finance: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
};

const RISK_COLORS: Record<string, string> = {
  high: 'text-destructive',
  medium: 'text-amber-500',
  low: 'text-emerald-600',
};

export function HRTalentIntelligencePanel({ companyId }: Props) {
  const [activeTab, setActiveTab] = useState('overview');
  const {
    loading, skills, careerPaths, talentPools, mentoringMatches, analysis, stats,
    fetchStats, fetchSkills, fetchCareerPaths, fetchTalentPools, fetchMentoring,
    runGapAnalysis, runMentoringMatch, seedData
  } = useHRTalentIntelligence();

  useEffect(() => {
    fetchStats(companyId);
    fetchSkills(companyId);
    fetchCareerPaths(companyId);
    fetchTalentPools(companyId);
    fetchMentoring(companyId);
  }, [companyId]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Talent Intelligence</h2>
            <p className="text-sm text-muted-foreground">Skill graph, career paths, talent pools y gap analysis IA</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => seedData(companyId)} disabled={loading}>
            <Database className="h-4 w-4 mr-1" /> Seed Demo
          </Button>
          <Button variant="outline" size="sm" onClick={() => { fetchStats(companyId); fetchSkills(companyId); }} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} /> Actualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3"><div className="flex items-center gap-2"><Network className="h-4 w-4 text-violet-500" /><div><p className="text-xs text-muted-foreground">Skills</p><p className="text-lg font-bold">{stats?.totalSkills || skills.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-blue-500" /><div><p className="text-xs text-muted-foreground">Career Paths</p><p className="text-lg font-bold">{stats?.totalPaths || careerPaths.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" /><div><p className="text-xs text-muted-foreground">Talent Pools</p><p className="text-lg font-bold">{talentPools.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-green-500" /><div><p className="text-xs text-muted-foreground">Mentoring</p><p className="text-lg font-bold">{stats?.activeMentoring || mentoringMatches.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-orange-500" /><div><p className="text-xs text-muted-foreground">Gigs Abiertos</p><p className="text-lg font-bold">{stats?.openGigs || 0}</p></div></div></CardContent></Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6 mb-4">
              <TabsTrigger value="overview" className="text-xs">Resumen</TabsTrigger>
              <TabsTrigger value="skills" className="text-xs">Skills</TabsTrigger>
              <TabsTrigger value="paths" className="text-xs">Career Paths</TabsTrigger>
              <TabsTrigger value="pools" className="text-xs">Pools</TabsTrigger>
              <TabsTrigger value="mentoring" className="text-xs">Mentoring</TabsTrigger>
              <TabsTrigger value="analysis" className="text-xs">Gap Analysis</TabsTrigger>
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Skill Distribution */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Network className="h-4 w-4" /> Distribución de Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {skills.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Sin skills registrados</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(skills.reduce((acc, s) => { acc[s.category] = (acc[s.category] || 0) + 1; return acc; }, {} as Record<string, number>))
                          .sort((a, b) => b[1] - a[1])
                          .map(([cat, count]) => (
                            <div key={cat} className="flex items-center justify-between">
                              <Badge className={cn("text-xs", CATEGORY_COLORS[cat] || 'bg-muted')}>{cat}</Badge>
                              <div className="flex items-center gap-2 flex-1 mx-3">
                                <Progress value={(count / skills.length) * 100} className="h-2" />
                              </div>
                              <span className="text-sm font-medium">{count}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Core Skills */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Core Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {skills.filter(s => s.is_core).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Sin core skills</p>
                      ) : skills.filter(s => s.is_core).map(skill => (
                        <div key={skill.id} className="flex items-center justify-between p-2 rounded border">
                          <span className="text-sm font-medium">{skill.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{skill.market_demand}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Talent Pools Summary */}
              {talentPools.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4" /> Talent Pools</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {talentPools.map(pool => (
                        <div key={pool.id} className="p-3 rounded-lg border text-center">
                          <p className="font-medium text-sm">{pool.name}</p>
                          <p className="text-2xl font-bold mt-1">{pool.member_count}</p>
                          <Badge variant="outline" className="text-xs mt-1">{pool.pool_type.replace(/_/g, ' ')}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* SKILLS */}
            <TabsContent value="skills">
              <ScrollArea className="h-[500px]">
                {skills.length === 0 ? (
                  <div className="text-center py-12">
                    <Network className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">Sin skills en el grafo</p>
                    <p className="text-xs text-muted-foreground mt-1">Usa "Seed Demo" para crear datos</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-2">
                    {skills.map(skill => (
                      <div key={skill.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-2 h-2 rounded-full", skill.is_core ? "bg-primary" : "bg-muted-foreground/30")} />
                          <div>
                            <p className="font-medium text-sm">{skill.name}</p>
                            <div className="flex gap-1 mt-0.5">
                              <Badge className={cn("text-xs", CATEGORY_COLORS[skill.category] || 'bg-muted')}>{skill.category}</Badge>
                              <Badge variant="outline" className="text-xs">{skill.skill_type}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={skill.market_demand === 'high' ? 'default' : 'outline'} className="text-xs">
                            <TrendingUp className="h-3 w-3 mr-0.5" />{skill.market_demand}
                          </Badge>
                          {skill.is_core && <Star className="h-4 w-4 text-amber-500" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* CAREER PATHS */}
            <TabsContent value="paths">
              <ScrollArea className="h-[500px]">
                {careerPaths.length === 0 ? (
                  <div className="text-center py-12">
                    <ArrowRight className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">Sin career paths configurados</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {careerPaths.map(path => (
                      <Card key={path.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-sm">{path.name}</h3>
                            <Badge variant={path.path_type === 'vertical' ? 'default' : 'secondary'} className="text-xs">
                              {path.path_type === 'vertical' ? '↑ Vertical' : '↔ Lateral'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="px-3 py-1.5 rounded bg-muted text-sm font-medium">{path.from_role}</div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <div className="px-3 py-1.5 rounded bg-primary/10 text-primary text-sm font-medium">{path.to_role}</div>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {path.avg_time_months && <span>⏱ {path.avg_time_months} meses</span>}
                            {path.required_experience_years && <span>📋 {path.required_experience_years} años exp.</span>}
                            {path.typical_salary_increase_percent && <span>💰 +{path.typical_salary_increase_percent}%</span>}
                            {path.department && <span>🏢 {path.department}</span>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* TALENT POOLS */}
            <TabsContent value="pools">
              <ScrollArea className="h-[500px]">
                {talentPools.length === 0 ? (
                  <div className="text-center py-12">
                    <Star className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">Sin talent pools configurados</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {talentPools.map(pool => (
                      <Card key={pool.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h3 className="font-semibold">{pool.name}</h3>
                              {pool.description && <p className="text-sm text-muted-foreground">{pool.description}</p>}
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold">{pool.member_count}</p>
                              <p className="text-xs text-muted-foreground">miembros</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">{pool.pool_type.replace(/_/g, ' ')}</Badge>
                            <Badge variant="outline" className="text-xs">Revisión: {pool.review_frequency}</Badge>
                            {pool.last_reviewed_at && (
                              <Badge variant="outline" className="text-xs">
                                Última: {new Date(pool.last_reviewed_at).toLocaleDateString('es-ES')}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* MENTORING */}
            <TabsContent value="mentoring" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Programa de Mentoring</h3>
                <Button onClick={() => runMentoringMatch(companyId)} disabled={loading} size="sm">
                  <Sparkles className="h-4 w-4 mr-1" />
                  {loading ? 'Generando...' : 'AI Matching'}
                </Button>
              </div>
              <ScrollArea className="h-[450px]">
                {mentoringMatches.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">Sin parejas de mentoring</p>
                    <p className="text-xs text-muted-foreground mt-1">Usa AI Matching para generar recomendaciones</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mentoringMatches.map(match => (
                      <div key={match.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Mentor</p>
                            <p className="font-medium text-sm">{match.mentor_name}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Mentee</p>
                            <p className="font-medium text-sm">{match.mentee_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {match.compatibility_score && (
                            <Badge variant="outline" className="text-xs">{match.compatibility_score}% compatible</Badge>
                          )}
                          <Badge variant={match.status === 'active' ? 'default' : 'secondary'} className="text-xs">{match.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* GAP ANALYSIS */}
            <TabsContent value="analysis" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Análisis de Talento con IA</h3>
                <Button onClick={() => runGapAnalysis(companyId)} disabled={loading} size="sm">
                  <Sparkles className="h-4 w-4 mr-1" />
                  {loading ? 'Analizando...' : 'Ejecutar Análisis IA'}
                </Button>
              </div>

              {!analysis ? (
                <div className="text-center py-12">
                  <Brain className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Ejecuta un análisis IA para obtener insights</p>
                  <p className="text-xs text-muted-foreground mt-1">Bench strength, readiness, flight risk, skill gaps</p>
                </div>
              ) : (
                <ScrollArea className="h-[450px]">
                  <div className="space-y-4">
                    {/* Bench Strength */}
                    {analysis.bench_strength && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" /> Bench Strength</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-4 gap-3 text-center">
                            <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/20">
                              <p className="text-xs text-muted-foreground">Fuerte</p>
                              <p className="text-xl font-bold text-emerald-600">{analysis.bench_strength.strong}</p>
                            </div>
                            <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/20">
                              <p className="text-xs text-muted-foreground">Adecuado</p>
                              <p className="text-xl font-bold text-blue-600">{analysis.bench_strength.adequate}</p>
                            </div>
                            <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/20">
                              <p className="text-xs text-muted-foreground">Débil</p>
                              <p className="text-xl font-bold text-amber-600">{analysis.bench_strength.weak}</p>
                            </div>
                            <div className="p-2 rounded bg-red-50 dark:bg-red-950/20">
                              <p className="text-xs text-muted-foreground">Crítico</p>
                              <p className="text-xl font-bold text-destructive">{analysis.bench_strength.critical}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Critical Roles at Risk */}
                    {analysis.critical_roles_at_risk?.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Roles Críticos en Riesgo</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {analysis.critical_roles_at_risk.map((role, i) => (
                              <div key={i} className="flex items-center justify-between p-2 rounded border">
                                <div>
                                  <p className="font-medium text-sm">{role.role}</p>
                                  <p className="text-xs text-muted-foreground">{role.reason}</p>
                                </div>
                                <Badge variant={role.risk === 'high' ? 'destructive' : 'outline'} className="text-xs">{role.risk}</Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Skill Gaps */}
                    {analysis.skill_gaps?.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" /> Skill Gaps</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {analysis.skill_gaps.map((gap, i) => (
                              <div key={i} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-sm">{gap.skill}</span>
                                  <Badge variant={gap.gap_severity === 'high' ? 'destructive' : gap.gap_severity === 'medium' ? 'secondary' : 'outline'} className="text-xs">
                                    {gap.gap_severity}
                                  </Badge>
                                </div>
                                <div className="flex gap-2 items-center text-xs text-muted-foreground">
                                  <span>Actual: {gap.current_coverage}%</span>
                                  <ArrowRight className="h-3 w-3" />
                                  <span>Target: {gap.target_coverage}%</span>
                                </div>
                                <Progress value={gap.current_coverage} className="h-1.5" />
                                {gap.recommendation && (
                                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                                    <Lightbulb className="h-3 w-3 mt-0.5 shrink-0 text-amber-500" />
                                    {gap.recommendation}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Mobility Pipeline */}
                    {analysis.mobility_pipeline && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2"><UserCheck className="h-4 w-4" /> Mobility Pipeline</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="p-3 rounded bg-muted/50">
                              <p className="text-xs text-muted-foreground">Movimientos internos</p>
                              <p className="text-xl font-bold">{analysis.mobility_pipeline.internal_moves_potential}</p>
                            </div>
                            <div className="p-3 rounded bg-muted/50">
                              <p className="text-xs text-muted-foreground">Cross-dept</p>
                              <p className="text-xl font-bold">{analysis.mobility_pipeline.cross_dept_candidates}</p>
                            </div>
                            <div className="p-3 rounded bg-muted/50">
                              <p className="text-xs text-muted-foreground">Listos promoción</p>
                              <p className="text-xl font-bold">{analysis.mobility_pipeline.promotion_ready}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* AI Narrative */}
                    {analysis.ai_narrative && (
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Análisis Ejecutivo IA</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{analysis.ai_narrative}</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default HRTalentIntelligencePanel;
