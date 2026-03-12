import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { type PAPayrollAnalytics } from '@/hooks/erp/hr/usePeopleAnalytics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface Props {
  data: PAPayrollAnalytics | null;
  isLoading: boolean;
  companyId: string;
  onExplainAnomaly: (data: Record<string, unknown>) => Promise<string>;
}

export function PAPayrollDashboard({ data, isLoading, onExplainAnomaly }: Props) {
  const [explaining, setExplaining] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  const handleExplain = async (anomaly: Record<string, unknown>, key: string) => {
    setExplaining(key);
    const result = await onExplainAnomaly(anomaly);
    setExplanations(prev => ({ ...prev, [key]: result }));
    setExplaining(null);
  };

  if (isLoading && !data) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)}</div>;
  }

  if (!data) {
    return <Card><CardContent className="py-10 text-center text-muted-foreground">Sin datos de nómina disponibles</CardContent></Card>;
  }

  const fmt = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  const kpis = [
    { label: 'Coste Bruto Total', value: fmt(data.totalGrossCost), icon: DollarSign, color: 'text-emerald-500' },
    { label: 'Coste Empresa', value: fmt(data.totalEmployerCost), icon: DollarSign, color: 'text-blue-500' },
    { label: 'Salario Medio', value: fmt(data.avgSalary), icon: TrendingUp, color: 'text-primary' },
    { label: 'Salario Mediana', value: fmt(data.medianSalary), icon: TrendingUp, color: 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <Card key={k.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <k.icon className={`h-4 w-4 ${k.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="text-lg font-bold text-foreground">{k.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cost trend */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Evolución Coste Laboral</CardTitle></CardHeader>
          <CardContent>
            {data.costTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.costTrend}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="gross" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Bruto" />
                  <Line type="monotone" dataKey="employer" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} name="Empresa" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                Datos de tendencia no disponibles aún
              </div>
            )}
          </CardContent>
        </Card>

        {/* By concept */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Distribución por Concepto</CardTitle></CardHeader>
          <CardContent>
            {data.byConcept.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.byConcept.slice(0, 8)} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="concept" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                Datos por concepto no disponibles aún
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Anomalies */}
      <Card className={data.anomalies.length > 0 ? 'border-amber-500/30 bg-amber-500/5' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Anomalías Detectadas ({data.anomaliesCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.anomalies.length > 0 ? (
            <div className="space-y-2">
              {data.anomalies.map((a, i) => {
                const key = `${a.employeeId}-${a.concept}-${i}`;
                return (
                  <div key={key} className="p-3 rounded-lg border bg-background text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{a.employeeName} — {a.concept}</span>
                      <Badge variant="destructive" className="text-[10px]">Desviación {a.deviation}%</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Importe: {fmt(a.amount)} | Rango esperado: {fmt(a.expectedRange[0])} – {fmt(a.expectedRange[1])}
                    </p>
                    {explanations[key] ? (
                      <div className="p-2 rounded bg-primary/5 text-xs text-foreground mt-1">
                        <Sparkles className="h-3 w-3 inline mr-1 text-primary" />
                        {explanations[key]}
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="text-xs gap-1 h-6 mt-1" onClick={() => handleExplain(a as unknown as Record<string, unknown>, key)} disabled={explaining === key}>
                        {explaining === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        Explicar con IA
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No se han detectado anomalías en el período actual</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
