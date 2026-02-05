/**
 * LegalDashboardPanel - Panel de Matter Management & Legal Spend
 * Fase 6: Dashboard completo para gestión legal enterprise
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import {
  RefreshCw,
  Scale,
  Clock,
  DollarSign,
  FileText,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Briefcase,
  Timer,
  Receipt,
  BarChart3,
  Sparkles,
  Building2,
  Calendar,
  Target
} from 'lucide-react';
import { useLegalMatters, LegalMatter } from '@/hooks/erp/legal/useLegalMatters';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface LegalDashboardPanelProps {
  companyId: string;
  className?: string;
}

const MATTER_TYPE_COLORS: Record<string, string> = {
  litigation: '#ef4444',
  contract: '#3b82f6',
  compliance: '#22c55e',
  advisory: '#8b5cf6',
  ip: '#f59e0b',
  m_and_a: '#ec4899',
  labor: '#06b6d4',
  regulatory: '#64748b'
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  active: { color: 'bg-green-500', label: 'Activo' },
  pending: { color: 'bg-yellow-500', label: 'Pendiente' },
  on_hold: { color: 'bg-orange-500', label: 'En espera' },
  closed: { color: 'bg-gray-500', label: 'Cerrado' },
  archived: { color: 'bg-slate-400', label: 'Archivado' }
};

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: 'text-gray-500', label: 'Baja' },
  medium: { color: 'text-yellow-500', label: 'Media' },
  high: { color: 'text-orange-500', label: 'Alta' },
  critical: { color: 'text-red-500', label: 'Crítica' }
};

export function LegalDashboardPanel({ companyId, className }: LegalDashboardPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMatter, setSelectedMatter] = useState<LegalMatter | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const {
    matters,
    timeEntries,
    expenses,
    analytics,
    loading,
    fetchMatters,
    fetchTimeEntries,
    fetchExpenses,
    analyzeSpend,
    calculateMatterTotals
  } = useLegalMatters();

  // Initial load
  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  const loadData = useCallback(async () => {
    await fetchMatters(companyId);
    await analyzeSpend({ companyId });
    setLastRefresh(new Date());
  }, [companyId, fetchMatters, analyzeSpend]);

  const handleMatterSelect = async (matter: LegalMatter) => {
    setSelectedMatter(matter);
    await fetchTimeEntries(matter.id);
    await fetchExpenses(matter.id);
  };

  // Calculate summary metrics
  const summaryMetrics = {
    totalMatters: matters.length,
    activeMatters: matters.filter(m => m.status === 'active').length,
    totalBudget: matters.reduce((sum, m) => sum + (m.budget_amount || 0), 0),
    totalSpent: matters.reduce((sum, m) => sum + (m.budget_spent || 0), 0),
    upcomingDeadlines: matters.filter(m => m.next_deadline).length
  };

  const budgetUtilization = summaryMetrics.totalBudget > 0
    ? (summaryMetrics.totalSpent / summaryMetrics.totalBudget) * 100
    : 0;

  // Prepare chart data
  const mattersByType = Object.entries(
    matters.reduce((acc, m) => {
      acc[m.matter_type] = (acc[m.matter_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value,
    color: MATTER_TYPE_COLORS[name] || '#94a3b8'
  }));

  const mattersByStatus = Object.entries(
    matters.reduce((acc, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({
    name: STATUS_CONFIG[name]?.label || name,
    value
  }));

  if (!companyId) {
    return (
      <Card className={cn("border-dashed opacity-50", className)}>
        <CardContent className="py-8 text-center">
          <Scale className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">Selecciona una empresa para ver Legal Management</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-slate-900/10 via-indigo-900/10 to-purple-900/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600">
              <Scale className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Legal Operations
                <Badge variant="outline" className="text-xs">Enterprise</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {lastRefresh
                  ? `Actualizado ${formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}`
                  : 'Cargando...'
                }
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadData}
            disabled={loading}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Asuntos</span>
            </div>
            <p className="text-xl font-bold">{summaryMetrics.totalMatters}</p>
            <p className="text-xs text-blue-500">{summaryMetrics.activeMatters} activos</p>
          </div>

          <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Presupuesto</span>
            </div>
            <p className="text-xl font-bold">€{(summaryMetrics.totalBudget / 1000).toFixed(0)}K</p>
            <p className="text-xs text-green-500">{budgetUtilization.toFixed(0)}% utilizado</p>
          </div>

          <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Timer className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Horas</span>
            </div>
            <p className="text-xl font-bold">{timeEntries.reduce((s, t) => s + t.hours, 0).toFixed(0)}</p>
            <p className="text-xs text-amber-500">Este período</p>
          </div>

          <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Gastos</span>
            </div>
            <p className="text-xl font-bold">€{(expenses.reduce((s, e) => s + e.amount, 0) / 1000).toFixed(0)}K</p>
            <p className="text-xs text-purple-500">{expenses.length} registros</p>
          </div>

          <div className="p-3 rounded-lg bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Deadlines</span>
            </div>
            <p className="text-xl font-bold">{summaryMetrics.upcomingDeadlines}</p>
            <p className="text-xs text-red-500">Próximos</p>
          </div>
        </div>

        {/* Budget Utilization Bar */}
        <div className="mb-4 p-3 rounded-lg border bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm">Utilización de Presupuesto Legal</Label>
            <span className="text-sm font-medium">
              €{summaryMetrics.totalSpent.toLocaleString()} / €{summaryMetrics.totalBudget.toLocaleString()}
            </span>
          </div>
          <Progress 
            value={budgetUtilization} 
            className={cn(
              "h-2",
              budgetUtilization > 90 ? "bg-red-200" : budgetUtilization > 75 ? "bg-yellow-200" : "bg-green-200"
            )}
          />
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-3">
            <TabsTrigger value="overview" className="text-xs">Vista General</TabsTrigger>
            <TabsTrigger value="matters" className="text-xs">Asuntos</TabsTrigger>
            <TabsTrigger value="spend" className="text-xs">Gastos</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs">Analytics IA</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Matters by Type Chart */}
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Asuntos por Tipo
                </h4>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={mattersByType}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {mattersByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Matters by Status Chart */}
              <div className="p-4 rounded-lg border bg-card">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Estado de Asuntos
                </h4>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={mattersByStatus}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="matters" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {matters.map((matter) => {
                  const totals = calculateMatterTotals(matter.id);
                  const budgetPct = matter.budget_amount 
                    ? ((matter.budget_spent || 0) / matter.budget_amount) * 100 
                    : 0;
                    
                  return (
                    <div
                      key={matter.id}
                      onClick={() => handleMatterSelect(matter)}
                      className={cn(
                        "p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer",
                        selectedMatter?.id === matter.id && "ring-2 ring-primary"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{matter.matter_number}</span>
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", STATUS_CONFIG[matter.status]?.color)}
                            >
                              {STATUS_CONFIG[matter.status]?.label}
                            </Badge>
                            <span className={cn("text-xs", PRIORITY_CONFIG[matter.priority]?.color)}>
                              {PRIORITY_CONFIG[matter.priority]?.label}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{matter.title}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            €{((matter.budget_spent || 0) / 1000).toFixed(1)}K
                          </p>
                          <p className="text-xs text-muted-foreground">
                            de €{((matter.budget_amount || 0) / 1000).toFixed(1)}K
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {matter.practice_area || 'General'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Scale className="h-3 w-3" />
                          {matter.matter_type.replace(/_/g, ' ')}
                        </span>
                        {matter.next_deadline && (
                          <span className="flex items-center gap-1 text-amber-500">
                            <Calendar className="h-3 w-3" />
                            {new Date(matter.next_deadline).toLocaleDateString('es-ES')}
                          </span>
                        )}
                      </div>

                      {matter.budget_amount && (
                        <Progress 
                          value={budgetPct} 
                          className={cn(
                            "h-1.5 mt-2",
                            budgetPct > 90 ? "bg-red-100" : budgetPct > 75 ? "bg-yellow-100" : ""
                          )}
                        />
                      )}
                    </div>
                  );
                })}

                {matters.length === 0 && !loading && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>No hay asuntos legales registrados</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="spend" className="mt-0">
            <ScrollArea className="h-[400px]">
              {selectedMatter ? (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <h4 className="font-medium text-sm mb-2">{selectedMatter.title}</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Horas Registradas</p>
                        <p className="font-medium">{timeEntries.reduce((s, t) => s + t.hours, 0).toFixed(1)}h</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Honorarios</p>
                        <p className="font-medium">
                          €{timeEntries.filter(t => t.amount).reduce((s, t) => s + (t.amount || 0), 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Gastos</p>
                        <p className="font-medium">
                          €{expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Time Entries */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Registro de Tiempo
                    </h4>
                    <div className="space-y-2">
                      {timeEntries.slice(0, 5).map((entry) => (
                        <div key={entry.id} className="p-2 rounded border bg-card text-sm">
                          <div className="flex justify-between mb-1">
                            <span className="font-medium">{entry.hours}h - {entry.work_date}</span>
                            <Badge variant={entry.billable ? "default" : "outline"} className="text-xs">
                              {entry.billable ? 'Facturable' : 'No facturable'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">{entry.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expenses */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Gastos
                    </h4>
                    <div className="space-y-2">
                      {expenses.slice(0, 5).map((expense) => (
                        <div key={expense.id} className="p-2 rounded border bg-card text-sm">
                          <div className="flex justify-between">
                            <div>
                              <span className="font-medium">{expense.expense_type}</span>
                              <p className="text-xs text-muted-foreground">{expense.description}</p>
                            </div>
                            <span className="font-medium">€{expense.amount.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>Selecciona un asunto para ver detalles de gastos</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <ScrollArea className="h-[400px]">
              {analytics ? (
                <div className="space-y-4">
                  {/* AI Insights Card */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      <h4 className="font-medium">Insights IA</h4>
                    </div>
                    
                    {/* Spend Summary */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-3 rounded bg-background/50">
                        <p className="text-xs text-muted-foreground">Gasto Total</p>
                        <p className="text-lg font-bold">€{analytics.total_spend.toLocaleString()}</p>
                        <div className="flex items-center gap-1 text-xs">
                          {analytics.budget_variance_percentage >= 0 ? (
                            <>
                              <TrendingUp className="h-3 w-3 text-red-500" />
                              <span className="text-red-500">+{analytics.budget_variance_percentage}%</span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-3 w-3 text-green-500" />
                              <span className="text-green-500">{analytics.budget_variance_percentage}%</span>
                            </>
                          )}
                          <span className="text-muted-foreground">vs presupuesto</span>
                        </div>
                      </div>
                      <div className="p-3 rounded bg-background/50">
                        <p className="text-xs text-muted-foreground">Interno vs Externo</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">
                            Int: €{analytics.internal_spend.toLocaleString()}
                          </Badge>
                          <Badge variant="secondary">
                            Ext: €{analytics.external_spend.toLocaleString()}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Practice Area Breakdown */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Por Área de Práctica</p>
                      {Object.entries(analytics.spend_by_practice_area || {}).slice(0, 4).map(([area, amount]) => (
                        <div key={area} className="flex items-center justify-between text-sm">
                          <span>{area}</span>
                          <span className="font-medium">€{(amount as number).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Optimization Opportunities */}
                  <div className="p-4 rounded-lg border">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Oportunidades de Optimización
                    </h4>
                    <div className="space-y-2">
                      <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-sm">
                        <p className="font-medium">Renegociar tarifas con proveedor principal</p>
                        <p className="text-xs text-muted-foreground">Ahorro potencial: €12,500/año</p>
                      </div>
                      <div className="p-2 rounded bg-green-500/10 border border-green-500/20 text-sm">
                        <p className="font-medium">Implementar AFAs para contratos recurrentes</p>
                        <p className="text-xs text-muted-foreground">Ahorro potencial: €8,000/año</p>
                      </div>
                      <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20 text-sm">
                        <p className="font-medium">Internalizar revisión de contratos estándar</p>
                        <p className="text-xs text-muted-foreground">Ahorro potencial: €5,200/año</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Cargando análisis IA...</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => analyzeSpend({ companyId })}
                  >
                    Generar Análisis
                  </Button>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default LegalDashboardPanel;
