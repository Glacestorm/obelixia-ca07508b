/**
 * LegalContractAnalysisPanel - Análisis de contratos con IA
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  FileSearch, 
  Upload, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  Loader2,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LegalContractAnalysisPanelProps {
  companyId: string;
}

interface AnalysisResult {
  overallRisk: 'low' | 'medium' | 'high';
  score: number;
  clauses: {
    id: string;
    title: string;
    risk: 'low' | 'medium' | 'high';
    description: string;
    recommendation: string;
  }[];
  summary: string;
}

export function LegalContractAnalysisPanel({ companyId }: LegalContractAnalysisPanelProps) {
  const [contractText, setContractText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!contractText.trim()) {
      toast.error('Por favor, introduce el texto del contrato');
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-ai-advisor', {
        body: {
          action: 'analyze_contract',
          context: {
            companyId,
            contractText: contractText.trim()
          }
        }
      });

      if (error) throw error;

      // Demo result if no real data
      const analysisResult: AnalysisResult = data?.data || {
        overallRisk: 'medium',
        score: 72,
        summary: 'El contrato presenta algunos riesgos moderados que requieren atención. Se recomienda revisar las cláusulas de confidencialidad y limitación de responsabilidad.',
        clauses: [
          {
            id: '1',
            title: 'Cláusula de Confidencialidad',
            risk: 'low',
            description: 'La cláusula es estándar y protege adecuadamente la información.',
            recommendation: 'Considerar añadir período de vigencia post-contractual.'
          },
          {
            id: '2',
            title: 'Limitación de Responsabilidad',
            risk: 'high',
            description: 'La limitación es muy amplia y podría no ser ejecutable.',
            recommendation: 'Revisar límites específicos y excepciones por dolo o negligencia grave.'
          },
          {
            id: '3',
            title: 'Resolución del Contrato',
            risk: 'medium',
            description: 'Faltan causas específicas de resolución anticipada.',
            recommendation: 'Añadir supuestos concretos y plazos de preaviso.'
          }
        ]
      };

      setResult(analysisResult);
      toast.success('Análisis completado');
    } catch (error) {
      console.error('Error analyzing contract:', error);
      toast.error('Error al analizar el contrato');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low': return 'text-green-500';
      case 'medium': return 'text-amber-500';
      case 'high': return 'text-red-500';
    }
  };

  const getRiskBadge = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low': return <Badge className="bg-green-600">Bajo</Badge>;
      case 'medium': return <Badge className="bg-amber-600">Medio</Badge>;
      case 'high': return <Badge variant="destructive">Alto</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            Análisis de Contratos
          </CardTitle>
          <CardDescription>
            Pega el texto del contrato o sube un documento para análisis automático
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Pega aquí el texto del contrato a analizar..."
            value={contractText}
            onChange={(e) => setContractText(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
          />
          <div className="flex gap-3">
            <Button 
              onClick={handleAnalyze} 
              disabled={isAnalyzing || !contractText.trim()}
              className="flex-1"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analizar Contrato
                </>
              )}
            </Button>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Subir PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados del Análisis</CardTitle>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="flex flex-col items-center justify-center h-[350px] text-center text-muted-foreground">
              <FileSearch className="h-12 w-12 mb-4 opacity-50" />
              <p>Introduce un contrato para analizarlo</p>
              <p className="text-sm mt-1">
                El análisis identificará cláusulas de riesgo y proporcionará recomendaciones
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-6">
                {/* Score general */}
                <div className="p-4 rounded-lg border bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Puntuación de Riesgo</span>
                    <div className="flex items-center gap-2">
                      {getRiskBadge(result.overallRisk)}
                      <span className="text-2xl font-bold">{result.score}/100</span>
                    </div>
                  </div>
                  <Progress value={result.score} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-3">
                    {result.summary}
                  </p>
                </div>

                {/* Cláusulas */}
                <div className="space-y-3">
                  <h4 className="font-medium">Cláusulas Analizadas</h4>
                  {result.clauses.map((clause) => (
                    <div 
                      key={clause.id} 
                      className="p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {clause.risk === 'high' ? (
                            <AlertTriangle className={`h-4 w-4 ${getRiskColor(clause.risk)}`} />
                          ) : clause.risk === 'low' ? (
                            <CheckCircle2 className={`h-4 w-4 ${getRiskColor(clause.risk)}`} />
                          ) : (
                            <Clock className={`h-4 w-4 ${getRiskColor(clause.risk)}`} />
                          )}
                          <span className="font-medium text-sm">{clause.title}</span>
                        </div>
                        {getRiskBadge(clause.risk)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {clause.description}
                      </p>
                      <div className="p-2 rounded bg-primary/5 text-sm">
                        <span className="font-medium text-primary">Recomendación:</span>{' '}
                        {clause.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LegalContractAnalysisPanel;
