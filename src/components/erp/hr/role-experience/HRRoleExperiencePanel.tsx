/**
 * HRRoleExperiencePanel - P8: Role-Based Experience Ecosystem
 * 5 tabs: Perfiles, Dashboards, Onboarding, Analytics, IA Analysis
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Users, Layout, Compass, BarChart3, Sparkles, RefreshCw,
  CheckCircle, Eye, Zap, Shield, ChevronRight, Star,
  Maximize2, Minimize2, UserCog, Layers
} from 'lucide-react';
import { useHRRoleExperience } from '@/hooks/admin/hr/useHRRoleExperience';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface HRRoleExperiencePanelProps {
  companyId: string;
}

export function HRRoleExperiencePanel({ companyId }: HRRoleExperiencePanelProps) {
  const [activeTab, setActiveTab] = useState('profiles');
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const {
    profiles, dashboards, onboardingSteps, analytics,
    stats, aiAnalysis, loading, aiLoading,
    fetchProfiles, fetchDashboards, fetchOnboarding, fetchAnalytics,
    runAIAnalysis,
  } = useHRRoleExperience();

  useEffect(() => {
    fetchProfiles(companyId);
    fetchDashboards(companyId);
    fetchAnalytics(companyId);
  }, [companyId]);

  useEffect(() => {
    if (selectedProfileId) {
      fetchOnboarding(companyId, selectedProfileId);
      fetchDashboards(companyId, selectedProfileId);
    }
  }, [selectedProfileId, companyId]);

  const handleRefresh = useCallback(() => {
    fetchProfiles(companyId);
    fetchDashboards(companyId);
    fetchAnalytics(companyId);
  }, [companyId]);

  const roleColors: Record<string, string> = {
    ceo: 'from-amber-500 to-orange-500',
    hr_director: 'from-violet-500 to-purple-500',
    hr_manager: 'from-blue-500 to-cyan-500',
    team_lead: 'from-emerald-500 to-green-500',
    employee: 'from-slate-500 to-gray-500',
    auditor: 'from-red-500 to-rose-500',
  };

  return (
    <Card className={cn(
      "transition-all duration-300 overflow-hidden",
      isExpanded ? "fixed inset-4 z-50 shadow-2xl" : ""
    )}>
      <CardHeader className="pb-2 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-purple-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
              <UserCog className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Role-Based Experience</CardTitle>
              <p className="text-xs text-muted-foreground">
                UX personalizada por rol organizacional
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={loading} className="h-8 w-8">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="h-8 w-8">
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            <div className="bg-background/60 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-indigo-500">{stats.total_profiles}</p>
              <p className="text-[10px] text-muted-foreground">Perfiles</p>
            </div>
            <div className="bg-background/60 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-violet-500">{stats.active_profiles}</p>
              <p className="text-[10px] text-muted-foreground">Activos</p>
            </div>
            <div className="bg-background/60 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-purple-500">{stats.avg_modules_per_role}</p>
              <p className="text-[10px] text-muted-foreground">Módulos/Rol</p>
            </div>
            <div className="bg-background/60 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-fuchsia-500">{dashboards.length}</p>
              <p className="text-[10px] text-muted-foreground">Dashboards</p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className={cn("pt-3", isExpanded ? "h-[calc(100%-160px)]" : "")}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-5 mb-3">
            <TabsTrigger value="profiles" className="text-xs gap-1"><Users className="h-3 w-3" />Perfiles</TabsTrigger>
            <TabsTrigger value="dashboards" className="text-xs gap-1"><Layout className="h-3 w-3" />Dashboards</TabsTrigger>
            <TabsTrigger value="onboarding" className="text-xs gap-1"><Compass className="h-3 w-3" />Onboarding</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs gap-1"><BarChart3 className="h-3 w-3" />Analytics</TabsTrigger>
            <TabsTrigger value="ai" className="text-xs gap-1"><Sparkles className="h-3 w-3" />IA</TabsTrigger>
          </TabsList>

          {/* PROFILES TAB */}
          <TabsContent value="profiles" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-340px)]" : "h-[400px]"}>
              <div className="space-y-3">
                {profiles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserCog className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No hay perfiles configurados</p>
                    <p className="text-xs mt-1">Usa "Datos Demo" para cargar perfiles de ejemplo</p>
                  </div>
                ) : (
                  profiles.map((profile) => (
                    <Card
                      key={profile.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50 transition-colors",
                        selectedProfileId === profile.id && "ring-2 ring-primary"
                      )}
                      onClick={() => setSelectedProfileId(profile.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg bg-gradient-to-br text-white",
                              roleColors[profile.role_key] || 'from-gray-500 to-gray-600'
                            )}>
                              <Users className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{profile.role_label}</p>
                              <p className="text-xs text-muted-foreground">{profile.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={profile.is_active ? 'default' : 'secondary'} className="text-[10px]">
                              {profile.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />{profile.visible_modules?.length || 0} módulos
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />{profile.quick_actions?.length || 0} acciones
                          </span>
                          <span className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />{profile.kpi_widgets?.length || 0} KPIs
                          </span>
                        </div>

                        {profile.quick_actions?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {profile.quick_actions.slice(0, 4).map((action, idx) => (
                              <Badge key={idx} variant="outline" className="text-[10px]">
                                {action.label}
                              </Badge>
                            ))}
                            {profile.quick_actions.length > 4 && (
                              <Badge variant="outline" className="text-[10px]">
                                +{profile.quick_actions.length - 4}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* DASHBOARDS TAB */}
          <TabsContent value="dashboards" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-340px)]" : "h-[400px]"}>
              <div className="space-y-3">
                {dashboards.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Layout className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No hay dashboards configurados</p>
                  </div>
                ) : (
                  dashboards.map((dashboard) => (
                    <Card key={dashboard.id}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Layout className="h-4 w-4 text-violet-500" />
                            <div>
                              <p className="font-medium text-sm">{dashboard.dashboard_name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{dashboard.dashboard_type}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {dashboard.is_default && (
                              <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                                <Star className="h-3 w-3 mr-1" />Default
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px]">
                              {dashboard.widgets?.length || 0} widgets
                            </Badge>
                          </div>
                        </div>
                        {dashboard.widgets?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {dashboard.widgets.map((w: any, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-[10px]">
                                {w.title || w.type}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ONBOARDING TAB */}
          <TabsContent value="onboarding" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-340px)]" : "h-[400px]"}>
              {!selectedProfileId ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Compass className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Selecciona un perfil para ver su onboarding</p>
                </div>
              ) : onboardingSteps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Compass className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay pasos de onboarding configurados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {onboardingSteps.map((step, idx) => (
                    <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{step.step_title}</p>
                          {step.is_required && (
                            <Badge variant="destructive" className="text-[10px]">Requerido</Badge>
                          )}
                        </div>
                        {step.step_description && (
                          <p className="text-xs text-muted-foreground mt-1">{step.step_description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>~{step.estimated_minutes} min</span>
                          {step.target_module && <Badge variant="outline" className="text-[10px]">{step.target_module}</Badge>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-340px)]" : "h-[400px]"}>
              <div className="space-y-3">
                {analytics.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No hay datos de uso aún</p>
                  </div>
                ) : (
                  <>
                    <Card>
                      <CardContent className="p-3">
                        <p className="font-medium text-sm mb-2">Top Módulos por Uso</p>
                        <div className="space-y-2">
                          {analytics.slice(0, 8).map((a) => (
                            <div key={a.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">{a.role_key}</Badge>
                                <span className="text-sm">{a.module_id}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{a.usage_count} usos</span>
                                <Progress value={Math.min(a.usage_count, 100)} className="w-20 h-1.5" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* AI ANALYSIS TAB */}
          <TabsContent value="ai" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-340px)]" : "h-[400px]"}>
              <div className="space-y-3">
                <Button
                  onClick={() => runAIAnalysis(companyId)}
                  disabled={aiLoading}
                  className="w-full gap-2"
                  variant="outline"
                >
                  <Sparkles className={cn("h-4 w-4", aiLoading && "animate-spin")} />
                  {aiLoading ? 'Analizando...' : 'Ejecutar Análisis IA de UX'}
                </Button>

                {aiAnalysis && (
                  <>
                    <Card>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-sm">Madurez UX</p>
                          <Badge className="capitalize">{aiAnalysis.ux_maturity}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-muted-foreground">Cobertura de roles</span>
                          <Progress value={aiAnalysis.role_coverage} className="flex-1 h-2" />
                          <span className="text-xs font-medium">{aiAnalysis.role_coverage}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Profundidad: <span className="font-medium capitalize">{aiAnalysis.personalization_depth}</span>
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-3">
                        <p className="font-medium text-sm mb-2">Resumen Ejecutivo</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{aiAnalysis.executive_summary}</p>
                      </CardContent>
                    </Card>

                    {aiAnalysis.recommendations?.length > 0 && (
                      <Card>
                        <CardContent className="p-3">
                          <p className="font-medium text-sm mb-2">Recomendaciones</p>
                          <div className="space-y-2">
                            {aiAnalysis.recommendations.map((rec, idx) => (
                              <div key={idx} className="p-2 rounded border bg-muted/30">
                                <p className="text-xs font-medium">{rec.area}</p>
                                <p className="text-xs text-muted-foreground">{rec.suggestion}</p>
                                <Badge variant="outline" className="text-[10px] mt-1">{rec.impact}</Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {aiAnalysis.adoption_insights?.length > 0 && (
                      <Card>
                        <CardContent className="p-3">
                          <p className="font-medium text-sm mb-2">Adopción por Rol</p>
                          <div className="space-y-2">
                            {aiAnalysis.adoption_insights.map((insight, idx) => (
                              <div key={idx} className="flex items-center justify-between">
                                <span className="text-sm">{insight.role}</span>
                                <div className="flex items-center gap-2">
                                  <Progress value={insight.adoption_rate} className="w-20 h-1.5" />
                                  <span className="text-xs font-medium">{insight.adoption_rate}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default HRRoleExperiencePanel;
