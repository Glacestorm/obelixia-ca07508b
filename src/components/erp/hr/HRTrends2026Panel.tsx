/**
 * HRTrends2026Panel - Tendencias RRHH 2026+
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Rocket, Brain, Users, Shield, Sparkles } from 'lucide-react';

export function HRTrends2026Panel() {
  const trends = [
    { icon: Brain, title: 'IA en selección', status: 'coming', desc: 'Análisis automático de CVs' },
    { icon: Users, title: 'People Analytics', status: 'active', desc: 'Métricas predictivas de RRHH' },
    { icon: Shield, title: 'Bienestar digital', status: 'coming', desc: 'Monitorización de engagement' },
    { icon: Sparkles, title: 'Onboarding IA', status: 'planned', desc: 'Asistente virtual para nuevos empleados' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Rocket className="h-4 w-4" />
          Tendencias RRHH 2026+
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {trends.map((trend, i) => (
              <div key={i} className="p-3 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <trend.icon className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{trend.title}</span>
                  </div>
                  <Badge variant={trend.status === 'active' ? 'default' : 'secondary'}>
                    {trend.status === 'active' ? 'Activo' : trend.status === 'coming' ? 'Próximo' : 'Planificado'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{trend.desc}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default HRTrends2026Panel;
