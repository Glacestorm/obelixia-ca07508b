/**
 * Panel de Comparación de Cotizaciones
 * Phase 3: Comparar y evaluar cotizaciones de proveedores
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Scale, Trophy, DollarSign, Star, Clock, 
  TrendingUp, CheckCircle, X, ArrowUp, ArrowDown,
  Award, AlertTriangle, Loader2
} from 'lucide-react';
import { useERPRFQ, type RFQ, type SupplierQuote, type SupplierQuoteLine } from '@/hooks/erp/useERPRFQ';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QuoteComparisonPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rfq: RFQ | null;
  onSuccess?: () => void;
}

interface EvaluationWeights {
  price: number;
  quality: number;
  delivery: number;
  service: number;
}

interface QuoteWithLines extends SupplierQuote {
  lines: SupplierQuoteLine[];
}

const defaultWeights: EvaluationWeights = {
  price: 40,
  quality: 25,
  delivery: 20,
  service: 15
};

export function QuoteComparisonPanel({ 
  open, 
  onOpenChange, 
  rfq,
  onSuccess 
}: QuoteComparisonPanelProps) {
  const { 
    isLoading, 
    fetchQuotesByRFQ, 
    fetchQuoteLines,
    evaluateQuote,
    awardRFQ
  } = useERPRFQ();

  const [quotes, setQuotes] = useState<QuoteWithLines[]>([]);
  const [weights, setWeights] = useState<EvaluationWeights>(defaultWeights);
  const [evaluating, setEvaluating] = useState(false);
  const [awarding, setAwarding] = useState(false);

  useEffect(() => {
    if (open && rfq) {
      loadQuotesWithLines();
      // Cargar criterios de evaluación del RFQ si existen
      if (rfq.evaluation_criteria) {
        setWeights({
          price: rfq.evaluation_criteria.price || defaultWeights.price,
          quality: rfq.evaluation_criteria.quality || defaultWeights.quality,
          delivery: rfq.evaluation_criteria.delivery || defaultWeights.delivery,
          service: rfq.evaluation_criteria.service || defaultWeights.service
        });
      }
    }
  }, [open, rfq?.id]);

  const loadQuotesWithLines = async () => {
    if (!rfq) return;
    
    const quotesData = await fetchQuotesByRFQ(rfq.id);
    
    // Cargar líneas para cada cotización
    const quotesWithLines = await Promise.all(
      quotesData.map(async (quote) => {
        const lines = await fetchQuoteLines(quote.id);
        return { ...quote, lines } as QuoteWithLines;
      })
    );
    
    setQuotes(quotesWithLines);
  };

  // Estadísticas de precios
  const priceStats = useMemo(() => {
    if (quotes.length === 0) return null;
    
    const totals = quotes.map(q => q.total || 0);
    const min = Math.min(...totals);
    const max = Math.max(...totals);
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    
    return { min, max, avg, range: max - min };
  }, [quotes]);

  // Calcular puntuaciones ponderadas
  const scoredQuotes = useMemo(() => {
    if (quotes.length === 0 || !priceStats) return [];

    const totalWeight = weights.price + weights.quality + weights.delivery + weights.service;
    
    return quotes.map(quote => {
      // Precio: inversamente proporcional (menor es mejor)
      const priceScore = priceStats.range > 0 
        ? 100 - ((quote.total - priceStats.min) / priceStats.range) * 100
        : 100;
      
      // Usar scores existentes o valores por defecto
      const qualityScore = quote.score_quality ?? 70;
      const deliveryScore = quote.score_delivery ?? (quote.delivery_days ? Math.max(0, 100 - quote.delivery_days * 2) : 70);
      const serviceScore = quote.score_service ?? 70;

      // Puntuación total ponderada
      const weightedTotal = (
        (priceScore * weights.price) +
        (qualityScore * weights.quality) +
        (deliveryScore * weights.delivery) +
        (serviceScore * weights.service)
      ) / totalWeight;

      return {
        ...quote,
        calculated_price_score: priceScore,
        calculated_quality_score: qualityScore,
        calculated_delivery_score: deliveryScore,
        calculated_service_score: serviceScore,
        calculated_total: weightedTotal
      };
    }).sort((a, b) => b.calculated_total - a.calculated_total);
  }, [quotes, weights, priceStats]);

  // Mejor cotización
  const bestQuote = scoredQuotes[0];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  };

  const handleEvaluateQuote = async (quoteId: string, scores: { quality: number; delivery: number; service: number }) => {
    setEvaluating(true);
    const success = await evaluateQuote(quoteId, scores);
    if (success) {
      await loadQuotesWithLines();
    }
    setEvaluating(false);
  };

  const handleAwardRFQ = async (quoteId: string) => {
    if (!rfq) return;
    
    setAwarding(true);
    const success = await awardRFQ(rfq.id, quoteId);
    if (success) {
      onSuccess?.();
      onOpenChange(false);
    }
    setAwarding(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (!rfq) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Comparación de Cotizaciones - {rfq.rfq_number}
          </DialogTitle>
          <CardDescription>
            {rfq.title} • {quotes.length} cotizaciones recibidas
          </CardDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mb-4" />
            <p>No hay cotizaciones para comparar</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* Resumen de Precios */}
              {priceStats && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Resumen de Precios
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Mínimo</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(priceStats.min)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Máximo</p>
                        <p className="text-lg font-bold text-red-600">{formatCurrency(priceStats.max)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Promedio</p>
                        <p className="text-lg font-bold">{formatCurrency(priceStats.avg)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Rango</p>
                        <p className="text-lg font-bold text-blue-600">{formatCurrency(priceStats.range)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Criterios de Evaluación */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Criterios de Evaluación (Ponderación)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Precio</span>
                        <span className="font-medium">{weights.price}%</span>
                      </div>
                      <Slider
                        value={[weights.price]}
                        onValueChange={([v]) => setWeights(w => ({ ...w, price: v }))}
                        min={0}
                        max={100}
                        step={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Calidad</span>
                        <span className="font-medium">{weights.quality}%</span>
                      </div>
                      <Slider
                        value={[weights.quality]}
                        onValueChange={([v]) => setWeights(w => ({ ...w, quality: v }))}
                        min={0}
                        max={100}
                        step={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Entrega</span>
                        <span className="font-medium">{weights.delivery}%</span>
                      </div>
                      <Slider
                        value={[weights.delivery]}
                        onValueChange={([v]) => setWeights(w => ({ ...w, delivery: v }))}
                        min={0}
                        max={100}
                        step={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Servicio</span>
                        <span className="font-medium">{weights.service}%</span>
                      </div>
                      <Slider
                        value={[weights.service]}
                        onValueChange={([v]) => setWeights(w => ({ ...w, service: v }))}
                        min={0}
                        max={100}
                        step={5}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Total ponderación: {weights.price + weights.quality + weights.delivery + weights.service}%
                  </p>
                </CardContent>
              </Card>

              {/* Tabla Comparativa */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Ranking de Cotizaciones
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-center">Precio</TableHead>
                        <TableHead className="text-center">Calidad</TableHead>
                        <TableHead className="text-center">Entrega</TableHead>
                        <TableHead className="text-center">Servicio</TableHead>
                        <TableHead className="text-center">Puntuación</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scoredQuotes.map((quote, index) => (
                        <TableRow 
                          key={quote.id}
                          className={cn(
                            index === 0 && 'bg-green-50 dark:bg-green-950/20',
                            quote.is_winner && 'ring-2 ring-green-500'
                          )}
                        >
                          <TableCell>
                            {index === 0 ? (
                              <Trophy className="h-5 w-5 text-yellow-500" />
                            ) : (
                              <span className="text-muted-foreground">{index + 1}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{quote.supplier_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {quote.quote_number} • {quote.delivery_days || '?'} días entrega
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(quote.total)}
                            {index === 0 && (
                              <span className="ml-1 text-xs text-green-600">
                                <ArrowDown className="h-3 w-3 inline" />
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <ScoreCell score={quote.calculated_price_score} />
                          </TableCell>
                          <TableCell className="text-center">
                            <ScoreCell score={quote.calculated_quality_score} editable />
                          </TableCell>
                          <TableCell className="text-center">
                            <ScoreCell score={quote.calculated_delivery_score} />
                          </TableCell>
                          <TableCell className="text-center">
                            <ScoreCell score={quote.calculated_service_score} editable />
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={getScoreBadge(quote.calculated_total)}>
                              {quote.calculated_total.toFixed(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {quote.is_winner ? (
                              <Badge className="bg-green-600">
                                <Award className="h-3 w-3 mr-1" />
                                Ganador
                              </Badge>
                            ) : rfq.status !== 'awarded' && (
                              <Button
                                size="sm"
                                onClick={() => handleAwardRFQ(quote.id)}
                                disabled={awarding}
                              >
                                {awarding ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Adjudicar
                                  </>
                                )}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Detalle de Líneas Comparativo */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Comparación por Línea</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-background">Concepto</TableHead>
                          {scoredQuotes.map(quote => (
                            <TableHead key={quote.id} className="text-center min-w-[120px]">
                              {quote.supplier_name}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Agrupar líneas por descripción */}
                        {getUniqueLineDescriptions(scoredQuotes).map((desc, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="sticky left-0 bg-background font-medium">
                              {desc}
                            </TableCell>
                            {scoredQuotes.map(quote => {
                              const line = quote.lines?.find(l => l.description === desc);
                              const isLowest = line && isLowestPrice(desc, line.unit_price, scoredQuotes);
                              return (
                                <TableCell key={quote.id} className="text-center">
                                  {line ? (
                                    <div className={cn(isLowest && 'text-green-600 font-bold')}>
                                      {formatCurrency(line.unit_price)}
                                      <span className="text-xs text-muted-foreground block">
                                        x{line.quantity} = {formatCurrency(line.subtotal)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                        <TableRow className="font-bold bg-muted/50">
                          <TableCell className="sticky left-0 bg-muted/50">TOTAL</TableCell>
                          {scoredQuotes.map(quote => (
                            <TableCell key={quote.id} className="text-center">
                              {formatCurrency(quote.total)}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Componente para mostrar puntuación
function ScoreCell({ score, editable }: { score: number; editable?: boolean }) {
  const getColor = (s: number) => {
    if (s >= 80) return 'text-green-600';
    if (s >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <span className={cn('font-medium', getColor(score))}>
      {score.toFixed(0)}
    </span>
  );
}

// Helpers
function getUniqueLineDescriptions(quotes: QuoteWithLines[]): string[] {
  const descriptions = new Set<string>();
  quotes.forEach(q => {
    q.lines?.forEach(l => descriptions.add(l.description));
  });
  return Array.from(descriptions);
}

function isLowestPrice(description: string, price: number, quotes: QuoteWithLines[]): boolean {
  const prices = quotes
    .flatMap(q => q.lines || [])
    .filter(l => l.description === description)
    .map(l => l.unit_price);
  
  return price === Math.min(...prices);
}

export default QuoteComparisonPanel;
