/**
 * TotalRewardsPanel - Panel principal de Total Rewards Statement
 * Fase 4: Visualización de compensación total para empleados
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Wallet, 
  Gift, 
  Heart, 
  TrendingUp, 
  BarChart3, 
  FileText,
  Download,
  Send,
  Sparkles,
  RefreshCw,
  Eye,
  Car,
  GraduationCap,
  Dumbbell,
  Home,
  Shield,
  Landmark,
  LineChart,
  UtensilsCrossed,
  Award
} from 'lucide-react';
import { useTotalRewards, TotalRewardsSummary, CompensationComponent } from '@/hooks/erp/hr/useTotalRewards';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface TotalRewardsPanelProps {
  employeeId: string;
  employeeName?: string;
  className?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  base_salary: '#3b82f6',
  variable: '#22c55e',
  benefits: '#ef4444',
  equity: '#8b5cf6',
  perks: '#f59e0b',
  development: '#06b6d4'
};

const CATEGORY_LABELS: Record<string, string> = {
  base_salary: 'Salario Base',
  variable: 'Variable',
  benefits: 'Beneficios',
  equity: 'Equity',
  perks: 'Perks',
  development: 'Desarrollo'
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Wallet,
  Gift,
  Heart,
  TrendingUp,
  BarChart3,
  Shield,
  Landmark,
  LineChart,
  UtensilsCrossed,
  Car,
  Dumbbell,
  GraduationCap,
  Home
};

export function TotalRewardsPanel({ 
  employeeId, 
  employeeName,
  className 
}: TotalRewardsPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<TotalRewardsSummary | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const {
    components,
    statements,
    loading,
    fetchStatements,
    calculateTotalRewards,
    generateStatement,
    sendStatement,
    generateAIAnalysis
  } = useTotalRewards();

  // Load data
  useEffect(() => {
    if (employeeId) {
      fetchStatements(employeeId);
      loadSummary();
    }
  }, [employeeId, selectedYear]);

  const loadSummary = useCallback(async () => {
    if (!employeeId) return;
    const result = await calculateTotalRewards(employeeId, selectedYear);
    setSummary(result);
  }, [employeeId, selectedYear, calculateTotalRewards]);

  const handleGenerateStatement = async () => {
    setIsGenerating(true);
    await generateStatement(employeeId, selectedYear);
    setIsGenerating(false);
  };

  const handleAIAnalysis = async () => {
    setIsGenerating(true);
    const analysis = await generateAIAnalysis(employeeId, selectedYear);
    setAiAnalysis(analysis);
    setIsGenerating(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Prepare chart data
  const chartData = summary ? Object.entries(summary.byCategory)
    .filter(([_, data]) => data && data.total > 0)
    .map(([category, data]) => ({
      name: CATEGORY_LABELS[category] || category,
      value: data?.total || 0,
      color: CATEGORY_COLORS[category] || '#6b7280'
    })) : [];

  const currentStatement = statements.find(s => s.fiscal_year === selectedYear);

  const renderIcon = (iconName: string | null | undefined, fallbackClassName?: string) => {
    const IconComponent = iconName && ICON_MAP[iconName] ? ICON_MAP[iconName] : Wallet;
    return <IconComponent className={fallbackClassName || "h-4 w-4"} />;
  };

  if (loading && !summary) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="py-12 text-center">
          <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Cargando datos de compensación...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-green-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
              <Award className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Total Rewards Statement</CardTitle>
              <p className="text-sm text-muted-foreground">
                {employeeName || 'Empleado'} - Año Fiscal {selectedYear}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadSummary}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {!summary ? (
          <div className="text-center py-8">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No hay datos de compensación para este año</p>
            <Button className="mt-4" variant="outline">
              Configurar Compensación
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="overview" className="text-xs">Resumen</TabsTrigger>
              <TabsTrigger value="breakdown" className="text-xs">Desglose</TabsTrigger>
              <TabsTrigger value="comparison" className="text-xs">Mercado</TabsTrigger>
              <TabsTrigger value="statement" className="text-xs">Statement</TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-4">
              {/* Total Compensation Card */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-6 text-white">
                <p className="text-sm opacity-80">Compensación Total Anual</p>
                <p className="text-4xl font-bold mt-1">
                  {formatCurrency(summary.totalCompensation)}
                </p>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-xs opacity-70">Efectivo</p>
                    <p className="text-lg font-semibold">{formatCurrency(summary.cashCompensation)}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-70">Beneficios</p>
                    <p className="text-lg font-semibold">{formatCurrency(summary.benefitsValue)}</p>
                  </div>
                </div>
              </div>

              {/* Pie Chart */}
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <Wallet className="h-5 w-5 text-blue-500 mb-1" />
                  <p className="text-xs text-muted-foreground">Salario Base</p>
                  <p className="font-semibold text-sm">
                    {formatCurrency(summary.byCategory.base_salary?.total || 0)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <Gift className="h-5 w-5 text-green-500 mb-1" />
                  <p className="text-xs text-muted-foreground">Variable</p>
                  <p className="font-semibold text-sm">
                    {formatCurrency(summary.byCategory.variable?.total || 0)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                  <LineChart className="h-5 w-5 text-purple-500 mb-1" />
                  <p className="text-xs text-muted-foreground">Equity</p>
                  <p className="font-semibold text-sm">
                    {formatCurrency(summary.byCategory.equity?.total || 0)}
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* BREAKDOWN TAB */}
            <TabsContent value="breakdown">
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {Object.entries(summary.byCategory).map(([category, data]) => {
                    if (!data || data.total === 0) return null;
                    const percentage = (data.total / summary.totalCompensation) * 100;
                    
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: CATEGORY_COLORS[category] }}
                            />
                            <span className="font-medium text-sm">
                              {CATEGORY_LABELS[category]}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold">{formatCurrency(data.total)}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        <Progress 
                          value={percentage} 
                          className="h-2"
                        />
                        <div className="pl-5 space-y-1">
                          {data.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm py-1">
                              <div className="flex items-center gap-2">
                                {renderIcon(item.icon, "h-3 w-3 text-muted-foreground")}
                                <span className="text-muted-foreground">{item.name}</span>
                              </div>
                              <span>{formatCurrency(item.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* COMPARISON TAB */}
            <TabsContent value="comparison" className="space-y-4">
              <div className="text-center py-6">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground mb-4">
                  Compara tu compensación con el mercado
                </p>
                <Button 
                  onClick={handleAIAnalysis}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Analizando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Análisis IA de Mercado
                    </>
                  )}
                </Button>
              </div>

              {aiAnalysis && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Análisis Inteligente
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {typeof aiAnalysis === 'string' ? aiAnalysis : JSON.stringify(aiAnalysis, null, 2)}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* STATEMENT TAB */}
            <TabsContent value="statement" className="space-y-4">
              {currentStatement ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">Statement {selectedYear}</p>
                        <p className="text-sm text-muted-foreground">
                          Generado el {new Date(currentStatement.statement_date).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                    <Badge variant={
                      currentStatement.status === 'sent' ? 'default' :
                      currentStatement.status === 'viewed' ? 'secondary' :
                      'outline'
                    }>
                      {currentStatement.status === 'sent' ? 'Enviado' :
                       currentStatement.status === 'viewed' ? 'Visto' :
                       currentStatement.status === 'generated' ? 'Generado' :
                       'Borrador'}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      <Eye className="h-4 w-4 mr-2" />
                      Ver PDF
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Descargar
                    </Button>
                    {currentStatement.status === 'generated' && (
                      <Button 
                        className="flex-1"
                        onClick={() => sendStatement(currentStatement.id)}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Enviar
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground mb-4">
                    No hay statement generado para {selectedYear}
                  </p>
                  <Button onClick={handleGenerateStatement} disabled={isGenerating}>
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Generar Statement
                      </>
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

export default TotalRewardsPanel;
