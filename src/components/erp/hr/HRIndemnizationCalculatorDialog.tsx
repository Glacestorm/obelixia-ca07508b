/**
 * HRIndemnizationCalculatorDialog - Calculador específico de indemnizaciones por despido
 * Con límites legales automáticos y comparativa de escenarios
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Calculator, 
  Scale, 
  TrendingUp,
  AlertTriangle,
  Brain,
  Loader2,
  CheckCircle2,
  Info,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface HRIndemnizationCalculatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

interface IndemnizationScenario {
  type: string;
  label: string;
  days_per_year: number;
  max_months: number;
  legal_reference: string;
  calculated_amount: number;
  calculated_days: number;
  notes?: string;
}

// Spanish indemnization types
const INDEMNIZATION_TYPES: IndemnizationScenario[] = [
  {
    type: 'objective',
    label: 'Despido Objetivo',
    days_per_year: 20,
    max_months: 12,
    legal_reference: 'Art. 52 y 53 ET',
    calculated_amount: 0,
    calculated_days: 0,
    notes: 'Causas económicas, técnicas, organizativas o de producción'
  },
  {
    type: 'improcedent',
    label: 'Despido Improcedente',
    days_per_year: 33,
    max_months: 24,
    legal_reference: 'Art. 56 ET (post reforma 2012)',
    calculated_amount: 0,
    calculated_days: 0,
    notes: 'Contratos posteriores al 12/02/2012'
  },
  {
    type: 'improcedent_old',
    label: 'Despido Improcedente (anterior)',
    days_per_year: 45,
    max_months: 42,
    legal_reference: 'Art. 56 ET (anterior a 2012)',
    calculated_amount: 0,
    calculated_days: 0,
    notes: 'Contratos anteriores al 12/02/2012 (parte proporcional)'
  },
  {
    type: 'end_temporary',
    label: 'Fin Contrato Temporal',
    days_per_year: 12,
    max_months: 999, // No limit
    legal_reference: 'Art. 49.1.c ET',
    calculated_amount: 0,
    calculated_days: 0,
    notes: 'Contratos temporales posteriores a 01/01/2015'
  },
];

export function HRIndemnizationCalculatorDialog({
  open,
  onOpenChange,
  companyId
}: HRIndemnizationCalculatorDialogProps) {
  // Form inputs
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [extraPays, setExtraPays] = useState<number>(2); // Standard in Spain
  
  // Calculated values
  const [scenarios, setScenarios] = useState<IndemnizationScenario[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [yearsWorked, setYearsWorked] = useState<number>(0);
  const [dailySalary, setDailySalary] = useState<number>(0);

  // Calculate all scenarios when inputs change
  const calculateAllScenarios = useCallback(() => {
    if (!baseSalary || !startDate || !endDate) {
      setScenarios([]);
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = diffDays / 365;
    setYearsWorked(years);

    // Annual salary including extra pays
    const annualSalary = baseSalary * 12 + (baseSalary * extraPays);
    const daily = annualSalary / 365;
    setDailySalary(daily);

    // Calculate for each scenario
    const calculatedScenarios = INDEMNIZATION_TYPES.map(scenario => {
      let totalDays = scenario.days_per_year * years;
      const maxDays = scenario.max_months * 30;
      
      // Apply cap
      if (totalDays > maxDays) {
        totalDays = maxDays;
      }

      const amount = totalDays * daily;

      return {
        ...scenario,
        calculated_days: Math.round(totalDays * 100) / 100,
        calculated_amount: Math.round(amount * 100) / 100
      };
    });

    setScenarios(calculatedScenarios);
  }, [baseSalary, startDate, endDate, extraPays]);

  useEffect(() => {
    calculateAllScenarios();
  }, [calculateAllScenarios]);

  // AI-assisted explanation
  const [aiExplanation, setAiExplanation] = useState<string>('');
  
  const getAIExplanation = useCallback(async () => {
    if (scenarios.length === 0) return;

    setIsCalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('erp-hr-ai-agent', {
        body: {
          action: 'chat',
          company_id: companyId,
          message: `Explica brevemente las diferencias entre los tipos de indemnización por despido en España. 
          El trabajador tiene ${yearsWorked.toFixed(2)} años de antigüedad y un salario base de ${baseSalary}€/mes.
          Menciona qué documentación necesita la empresa para cada tipo de despido.`,
          context: {
            scenarios: scenarios.map(s => ({ type: s.type, amount: s.calculated_amount })),
            years_worked: yearsWorked,
            daily_salary: dailySalary
          }
        }
      });

      if (error) throw error;
      setAiExplanation(data?.response || 'Sin explicación disponible');
    } catch (error) {
      console.error('AI explanation error:', error);
      toast.error('Error al obtener explicación del agente');
    } finally {
      setIsCalculating(false);
    }
  }, [scenarios, yearsWorked, baseSalary, dailySalary, companyId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const maxAmount = Math.max(...scenarios.map(s => s.calculated_amount), 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Calculador de Indemnizaciones por Despido
          </DialogTitle>
          <DialogDescription>
            Comparativa automática según tipo de extinción - Normativa laboral española vigente
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-150px)] pr-4">
          <div className="space-y-6">
            {/* Input Form */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Datos para el cálculo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="salary">Salario base mensual (€)</Label>
                    <Input
                      id="salary"
                      type="number"
                      min={0}
                      step={100}
                      value={baseSalary || ''}
                      onChange={(e) => setBaseSalary(Number(e.target.value))}
                      placeholder="2.000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start">Fecha de alta</Label>
                    <Input
                      id="start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">Fecha de baja</Label>
                    <Input
                      id="end"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="extra">Pagas extras/año</Label>
                    <Input
                      id="extra"
                      type="number"
                      min={0}
                      max={4}
                      value={extraPays}
                      onChange={(e) => setExtraPays(Number(e.target.value))}
                    />
                  </div>
                </div>

                {yearsWorked > 0 && (
                  <div className="flex gap-4 mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                    <div>
                      <span className="text-muted-foreground">Antigüedad:</span>
                      <span className="ml-2 font-medium">{yearsWorked.toFixed(2)} años</span>
                    </div>
                    <Separator orientation="vertical" className="h-5" />
                    <div>
                      <span className="text-muted-foreground">Salario diario:</span>
                      <span className="ml-2 font-medium">{formatCurrency(dailySalary)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scenarios Comparison */}
            {scenarios.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Comparativa de Escenarios
                </h3>
                
                <div className="space-y-3">
                  {scenarios.map((scenario, index) => (
                    <Card 
                      key={scenario.type}
                      className={cn(
                        "transition-all",
                        index === 1 && "border-amber-500/50 bg-amber-500/5" // Highlight improcedent
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{scenario.label}</h4>
                              <Badge variant="outline" className="text-xs">
                                {scenario.days_per_year} días/año
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {scenario.legal_reference}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">
                              {formatCurrency(scenario.calculated_amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {scenario.calculated_days.toFixed(0)} días
                            </p>
                          </div>
                        </div>

                        <Progress 
                          value={(scenario.calculated_amount / maxAmount) * 100} 
                          className="h-2"
                        />

                        {scenario.notes && (
                          <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1">
                            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            {scenario.notes}
                          </p>
                        )}

                        {scenario.max_months < 999 && scenario.calculated_days >= scenario.max_months * 30 && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                            <AlertTriangle className="h-3 w-3" />
                            Límite alcanzado: máx. {scenario.max_months} mensualidades
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* AI Explanation Section */}
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    Asesoramiento del Agente IA
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={getAIExplanation}
                    disabled={isCalculating || scenarios.length === 0}
                  >
                    {isCalculating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>Consultar<ArrowRight className="h-3 w-3 ml-1" /></>
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {aiExplanation ? (
                  <p className="text-sm whitespace-pre-wrap">{aiExplanation}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Pulsa "Consultar" para obtener una explicación detallada de los diferentes tipos de despido y sus requisitos legales.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Legal References */}
            <div className="p-4 bg-muted/30 rounded-lg text-xs space-y-2">
              <h4 className="font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Normativa Aplicable
              </h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Real Decreto Legislativo 2/2015 - Estatuto de los Trabajadores</li>
                <li>• Ley 3/2012, de 6 de julio - Reforma laboral</li>
                <li>• Art. 49 ET - Extinción del contrato de trabajo</li>
                <li>• Art. 52-53 ET - Despido por causas objetivas</li>
                <li>• Art. 56 ET - Despido improcedente</li>
              </ul>
              <p className="mt-2 italic">
                Los cálculos son orientativos. Para situaciones específicas, consulte con un profesional.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default HRIndemnizationCalculatorDialog;
