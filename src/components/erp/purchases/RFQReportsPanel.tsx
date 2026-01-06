import { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Award,
  DollarSign,
  Users,
  FileText,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface RFQReportsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RFQStats {
  total: number;
  draft: number;
  sent: number;
  in_progress: number;
  evaluated: number;
  awarded: number;
  cancelled: number;
  expired: number;
  avgResponseTime: number;
  totalSavings: number;
  avgQuotesPerRFQ: number;
}

const statusColors: Record<string, string> = {
  draft: '#6b7280',
  sent: '#8b5cf6',
  in_progress: '#3b82f6',
  evaluated: '#eab308',
  awarded: '#22c55e',
  cancelled: '#ef4444',
  expired: '#f97316',
};

const CHART_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#f97316', '#6b7280'];

export function RFQReportsPanel({ open, onOpenChange }: RFQReportsPanelProps) {
  const [stats, setStats] = useState<RFQStats | null>(null);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchReportData();
    }
  }, [open, period]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(period));

      // Fetch RFQs
      const { data: rfqData } = await supabase
        .from('erp_rfqs' as any)
        .select('*')
        .gte('created_at', daysAgo.toISOString());

      // Fetch suppliers
      const { data: supplierData } = await supabase
        .from('erp_suppliers' as any)
        .select('*')
        .eq('is_active', true);

      // Fetch quotes count
      const { data: quotesData } = await supabase
        .from('erp_supplier_quotes' as any)
        .select('rfq_id');

      const rfqList = (rfqData || []) as any[];
      const quotesList = (quotesData || []) as any[];
      
      if (rfqList.length > 0) {
        setRfqs(rfqList);
        
        // Calculate stats
        const statusCounts = rfqList.reduce((acc: Record<string, number>, rfq: any) => {
          acc[rfq.status] = (acc[rfq.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const totalQuotes = quotesList.length;

        setStats({
          total: rfqList.length,
          draft: statusCounts.draft || 0,
          sent: statusCounts.sent || 0,
          in_progress: statusCounts.in_progress || 0,
          evaluated: statusCounts.evaluated || 0,
          awarded: statusCounts.awarded || 0,
          cancelled: statusCounts.cancelled || 0,
          expired: statusCounts.expired || 0,
          avgResponseTime: 3.5, // Placeholder
          totalSavings: rfqList.length * 2500, // Placeholder calculation
          avgQuotesPerRFQ: rfqList.length > 0 ? totalQuotes / rfqList.length : 0,
        });
      }

      if (supplierData) {
        setSuppliers(supplierData as any[]);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusChartData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Borrador', value: stats.draft, color: statusColors.draft },
      { name: 'Enviadas', value: stats.sent, color: statusColors.sent },
      { name: 'En proceso', value: stats.in_progress, color: statusColors.in_progress },
      { name: 'Evaluadas', value: stats.evaluated, color: statusColors.evaluated },
      { name: 'Adjudicadas', value: stats.awarded, color: statusColors.awarded },
      { name: 'Canceladas', value: stats.cancelled, color: statusColors.cancelled },
    ].filter(item => item.value > 0);
  }, [stats]);

  const supplierPerformance = useMemo(() => {
    return suppliers
      .map(s => ({
        name: s.company_name?.substring(0, 15) || 'N/A',
        quotes: s.quotes?.[0]?.count || 0,
        rating: s.rating || 0,
      }))
      .sort((a, b) => b.quotes - a.quotes)
      .slice(0, 5);
  }, [suppliers]);

  const completionRate = stats ? ((stats.awarded / Math.max(stats.total, 1)) * 100).toFixed(1) : '0';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Reportes de RFQ
            </SheetTitle>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 días</SelectItem>
                <SelectItem value="30">30 días</SelectItem>
                <SelectItem value="90">90 días</SelectItem>
                <SelectItem value="365">1 año</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Resumen</TabsTrigger>
                <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
                <TabsTrigger value="trends">Tendencias</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Total RFQs</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{stats?.total || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Adjudicadas</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{stats?.awarded || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Tasa éxito</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{completionRate}%</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Prom. cotizaciones</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{stats?.avgQuotesPerRFQ.toFixed(1) || 0}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Status Distribution */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Distribución por estado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {statusChartData.length > 0 ? (
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statusChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={70}
                              paddingAngle={2}
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                            >
                              {statusChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No hay datos para mostrar
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="suppliers" className="space-y-4">
                {/* Top Suppliers */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top proveedores por cotizaciones</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {supplierPerformance.length > 0 ? (
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={supplierPerformance} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                            <Tooltip />
                            <Bar dataKey="quotes" fill="hsl(var(--primary))" radius={4} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No hay datos de proveedores
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Supplier List */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Rendimiento de proveedores</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {suppliers.slice(0, 5).map((supplier) => (
                      <div key={supplier.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{supplier.company_name}</p>
                          <p className="text-xs text-muted-foreground">{supplier.category}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{supplier.rating || 'N/A'} ⭐</Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="trends" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Métricas clave
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Tasa de adjudicación</span>
                        <span>{completionRate}%</span>
                      </div>
                      <Progress value={parseFloat(completionRate)} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Participación de proveedores</span>
                        <span>{Math.min((stats?.avgQuotesPerRFQ || 0) * 33, 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={Math.min((stats?.avgQuotesPerRFQ || 0) * 33, 100)} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>RFQs en proceso</span>
                        <span>{stats ? ((stats.in_progress + stats.evaluated) / Math.max(stats.total, 1) * 100).toFixed(0) : 0}%</span>
                      </div>
                      <Progress 
                        value={stats ? ((stats.in_progress + stats.evaluated) / Math.max(stats.total, 1) * 100) : 0} 
                        className="h-2" 
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Tiempos promedio
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Tiempo de respuesta</span>
                      <Badge variant="secondary">~3.5 días</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Tiempo hasta adjudicación</span>
                      <Badge variant="secondary">~7 días</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Tiempo de evaluación</span>
                      <Badge variant="secondary">~2 días</Badge>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
