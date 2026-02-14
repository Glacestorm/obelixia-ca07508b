import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  Calculator, Plus, Trash2, ChevronDown, Sparkles, RotateCcw,
  TrendingUp, PieChart, Download
} from 'lucide-react';
import { useGaliaBudgetPlanner } from '@/hooks/galia/useGaliaBudgetPlanner';
import { cn } from '@/lib/utils';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(v);

export function GaliaBudgetPlanner() {
  const {
    categories, updateItem, addItem, removeItem,
    getSummary, generateAIRecommendation, isGenerating, resetToDefaults
  } = useGaliaBudgetPlanner();

  const [openCategories, setOpenCategories] = useState<string[]>(categories.map(c => c.id));
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);

  const summary = useMemo(() => getSummary(), [getSummary, categories]);

  const toggleCategory = (id: string) => {
    setOpenCategories(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAIReview = async () => {
    const result = await generateAIRecommendation();
    if (result) {
      setAiRecommendation(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
            <Calculator className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Presupuestación Fase 2</h2>
            <p className="text-sm text-muted-foreground">Estimación presupuestaria con desglose por herramienta</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-1" /> Restaurar
          </Button>
          <Button size="sm" onClick={handleAIReview} disabled={isGenerating}>
            <Sparkles className={cn("h-4 w-4 mr-1", isGenerating && "animate-spin")} />
            {isGenerating ? 'Analizando...' : 'Revisión IA'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Presupuesto Total</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(summary.totalBudget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Categorías</p>
            <p className="text-2xl font-bold">{categories.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Partidas</p>
            <p className="text-2xl font-bold">{categories.reduce((s, c) => s + c.items.length, 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><PieChart className="h-4 w-4" /> Distribución</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPie>
                <Pie data={summary.byCategory} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percentage }) => `${name}: ${percentage.toFixed(0)}%`}>
                  {summary.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </RechartsPie>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Cronograma Financiero</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={summary.timeline}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="quarter" className="text-xs" />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Budget Table by Category */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-3">
          {categories.map((cat, catIdx) => (
            <Collapsible key={cat.id} open={openCategories.includes(cat.id)} onOpenChange={() => toggleCategory(cat.id)}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[catIdx % COLORS.length] }} />
                        <CardTitle className="text-sm">{cat.name}</CardTitle>
                        <Badge variant="secondary" className="text-xs">{cat.items.length} partidas</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm">{formatCurrency(cat.items.reduce((s, i) => s + i.total, 0))}</span>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", openCategories.includes(cat.id) && "rotate-180")} />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
                    <Progress value={summary.byCategory[catIdx]?.percentage || 0} className="h-1 mt-2" />
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Concepto</TableHead>
                          <TableHead className="text-xs w-28">Coste Unit.</TableHead>
                          <TableHead className="text-xs w-20">Uds.</TableHead>
                          <TableHead className="text-xs w-28 text-right">Total</TableHead>
                          <TableHead className="text-xs w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cat.items.map(item => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Input
                                value={item.concept}
                                onChange={(e) => updateItem(cat.id, item.id, 'concept', e.target.value)}
                                className="h-8 text-xs border-0 bg-transparent p-0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.unitCost}
                                onChange={(e) => updateItem(cat.id, item.id, 'unitCost', Number(e.target.value))}
                                className="h-8 text-xs w-24"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItem(cat.id, item.id, 'quantity', Number(e.target.value))}
                                className="h-8 text-xs w-16"
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium text-xs">{formatCurrency(item.total)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(cat.id, item.id)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => addItem(cat.id)}>
                      <Plus className="h-3 w-3 mr-1" /> Añadir partida
                    </Button>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>

      {/* AI Recommendation */}
      {aiRecommendation && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Recomendaciones IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap text-muted-foreground">{aiRecommendation}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default GaliaBudgetPlanner;
