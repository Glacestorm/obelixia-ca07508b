/**
 * LegalTrends2026Panel - Tendencias legales y regulatorias 2026
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, 
  TrendingUp, 
  Bot, 
  Shield, 
  Globe,
  Leaf,
  Cpu,
  Scale
} from 'lucide-react';

interface Trend {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  readiness: number;
  category: string;
  icon: React.ElementType;
  deadline?: string;
}

export function LegalTrends2026Panel() {
  const trends: Trend[] = [
    {
      id: '1',
      title: 'AI Act - Regulación de Inteligencia Artificial',
      description: 'Nuevo marco regulatorio europeo para sistemas de IA. Clasificación por riesgo, obligaciones de transparencia y gobernanza.',
      impact: 'high',
      readiness: 45,
      category: 'Tecnología',
      icon: Bot,
      deadline: '2026-08-01'
    },
    {
      id: '2',
      title: 'DORA - Resiliencia Operativa Digital',
      description: 'Requisitos de resiliencia digital para entidades financieras. Gestión de riesgos TIC, pruebas de penetración, gestión de terceros.',
      impact: 'high',
      readiness: 65,
      category: 'Financiero',
      icon: Shield,
      deadline: '2025-01-17'
    },
    {
      id: '3',
      title: 'ESG Reporting - CSRD',
      description: 'Nueva Directiva de Información de Sostenibilidad Corporativa. Informes de sostenibilidad obligatorios según estándares ESRS.',
      impact: 'high',
      readiness: 55,
      category: 'Sostenibilidad',
      icon: Leaf,
      deadline: '2025-01-01'
    },
    {
      id: '4',
      title: 'PSD3 / PSR - Servicios de Pago',
      description: 'Evolución del marco de servicios de pago. Open Banking mejorado, mayor protección al consumidor.',
      impact: 'medium',
      readiness: 30,
      category: 'Financiero',
      icon: Globe
    },
    {
      id: '5',
      title: 'NIS2 - Ciberseguridad',
      description: 'Nueva Directiva de Seguridad de Redes e Información. Ampliación de sectores obligados, sanciones más severas.',
      impact: 'high',
      readiness: 50,
      category: 'Ciberseguridad',
      icon: Cpu,
      deadline: '2024-10-18'
    },
    {
      id: '6',
      title: 'Reforma Laboral - Teletrabajo',
      description: 'Nuevas regulaciones sobre trabajo remoto y desconexión digital. Mayor flexibilidad y protección.',
      impact: 'medium',
      readiness: 70,
      category: 'Laboral',
      icon: Scale
    }
  ];

  const getImpactBadge = (impact: Trend['impact']) => {
    switch (impact) {
      case 'high': return <Badge variant="destructive">Alto Impacto</Badge>;
      case 'medium': return <Badge className="bg-amber-600">Impacto Medio</Badge>;
      case 'low': return <Badge variant="secondary">Bajo Impacto</Badge>;
    }
  };

  const getReadinessColor = (readiness: number) => {
    if (readiness >= 70) return 'text-green-500';
    if (readiness >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Tendencias Legales 2025-2026
          </h2>
          <p className="text-sm text-muted-foreground">
            Principales cambios regulatorios y su impacto en la organización
          </p>
        </div>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trends.map((trend) => {
            const Icon = trend.icon;
            return (
              <Card key={trend.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{trend.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {getImpactBadge(trend.impact)}
                          <Badge variant="outline">{trend.category}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {trend.description}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Nivel de preparación</span>
                      <span className={`font-bold ${getReadinessColor(trend.readiness)}`}>
                        {trend.readiness}%
                      </span>
                    </div>
                    <Progress value={trend.readiness} className="h-2" />
                  </div>

                  {trend.deadline && (
                    <div className="mt-3 p-2 rounded-lg bg-muted/50 text-center">
                      <p className="text-xs text-muted-foreground">Fecha límite</p>
                      <p className="text-sm font-medium">
                        {new Date(trend.deadline).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export default LegalTrends2026Panel;
