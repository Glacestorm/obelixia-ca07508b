/**
 * LegalRiskAssessmentPanel - Evaluación de riesgos legales
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  Shield, 
  TrendingUp, 
  TrendingDown,
  CheckCircle2,
  Clock,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LegalRiskAssessmentPanelProps {
  companyId: string;
}

interface RiskItem {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  probability: number;
  impact: number;
  status: 'open' | 'mitigating' | 'resolved';
  mitigation: string;
  deadline?: string;
}

const DemoBadge = () => (
  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700">
    Datos de ejemplo
  </Badge>
);

export function LegalRiskAssessmentPanel({ companyId }: LegalRiskAssessmentPanelProps) {
  const [isAssessing, setIsAssessing] = useState(false);
  const [risks, setRisks] = useState<RiskItem[]>([
    {
      id: '1',
      category: 'Regulatorio',
      title: 'Actualización DORA no implementada',
      description: 'Pendiente adaptación a los nuevos requisitos de resiliencia operativa digital',
      severity: 'high',
      probability: 0.8,
      impact: 0.9,
      status: 'mitigating',
      mitigation: 'Plan de implementación en curso. Revisión de sistemas y procesos.',
      deadline: '2024-06-30'
    },
    {
      id: '2',
      category: 'Contractual',
      title: 'Cláusulas de responsabilidad insuficientes',
      description: 'Varios contratos con proveedores carecen de limitación de responsabilidad adecuada',
      severity: 'medium',
      probability: 0.5,
      impact: 0.7,
      status: 'open',
      mitigation: 'Renegociar contratos afectados e incluir cláusulas estándar.'
    },
    {
      id: '3',
      category: 'Protección de Datos',
      title: 'Transferencias internacionales sin garantías',
      description: 'Posibles transferencias a terceros países sin mecanismos legales adecuados',
      severity: 'critical',
      probability: 0.6,
      impact: 0.95,
      status: 'mitigating',
      mitigation: 'Implementar SCCs y evaluar países terceros.',
      deadline: '2024-04-15'
    },
    {
      id: '4',
      category: 'Laboral',
      title: 'Contratos temporales irregulares',
      description: 'Posible concatenación de contratos temporales en varios departamentos',
      severity: 'medium',
      probability: 0.4,
      impact: 0.6,
      status: 'open',
      mitigation: 'Auditoría de contratación temporal y regularización.'
    },
    {
      id: '5',
      category: 'Fiscal',
      title: 'Cumplimiento SII',
      description: 'Obligaciones de suministro inmediato de información al día',
      severity: 'low',
      probability: 0.1,
      impact: 0.3,
      status: 'resolved',
      mitigation: 'Procesos automatizados y verificados.'
    }
  ]);

  const getSeverityBadge = (severity: RiskItem['severity']) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">Crítico</Badge>;
      case 'high': return <Badge className="bg-orange-600">Alto</Badge>;
      case 'medium': return <Badge className="bg-amber-600">Medio</Badge>;
      case 'low': return <Badge className="bg-green-600">Bajo</Badge>;
    }
  };

  const getStatusIcon = (status: RiskItem['status']) => {
    switch (status) {
      case 'open': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'mitigating': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'resolved': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
  };

  const calculateRiskScore = (probability: number, impact: number) => {
    return Math.round(probability * impact * 100);
  };

  const handleRunAssessment = async () => {
    setIsAssessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-ai-advisor', {
        body: {
          action: 'assess_risks',
          context: { companyId }
        }
      });

      if (error) throw error;
      toast.success('Evaluación de riesgos actualizada');
    } catch (error) {
      console.error('Error running assessment:', error);
      toast.error('Error al ejecutar evaluación');
    } finally {
      setIsAssessing(false);
    }
  };

  // Stats
  const stats = {
    total: risks.length,
    critical: risks.filter(r => r.severity === 'critical').length,
    high: risks.filter(r => r.severity === 'high').length,
    open: risks.filter(r => r.status === 'open').length,
    avgScore: Math.round(
      risks.reduce((acc, r) => acc + calculateRiskScore(r.probability, r.impact), 0) / risks.length
    )
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Evaluación de Riesgos Legales
            <DemoBadge />
          </h2>
          <p className="text-sm text-muted-foreground">
            Identificación y seguimiento de riesgos jurídicos
          </p>
        </div>
        <Button onClick={handleRunAssessment} disabled={isAssessing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isAssessing ? 'animate-spin' : ''}`} />
          Reevaluar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Riesgos Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            <p className="text-sm text-muted-foreground">Críticos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{stats.high}</p>
            <p className="text-sm text-muted-foreground">Altos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.open}</p>
            <p className="text-sm text-muted-foreground">Abiertos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">{stats.avgScore}%</p>
            <p className="text-sm text-muted-foreground">Score Promedio</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk list */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-4">
          {risks.map((risk) => {
            const riskScore = calculateRiskScore(risk.probability, risk.impact);
            
            return (
              <Card key={risk.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {getStatusIcon(risk.status)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{risk.title}</h3>
                          {getSeverityBadge(risk.severity)}
                          <Badge variant="outline">{risk.category}</Badge>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold">{riskScore}%</span>
                          <p className="text-xs text-muted-foreground">Puntuación</p>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {risk.description}
                      </p>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Probabilidad</p>
                          <Progress value={risk.probability * 100} className="h-2" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Impacto</p>
                          <Progress value={risk.impact * 100} className="h-2" />
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs font-medium mb-1 flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Mitigación:
                        </p>
                        <p className="text-sm">{risk.mitigation}</p>
                        {risk.deadline && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Plazo: {new Date(risk.deadline).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export default LegalRiskAssessmentPanel;
