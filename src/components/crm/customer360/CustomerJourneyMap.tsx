// src/components/crm/customer360/CustomerJourneyMap.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, CheckCircle2, Circle, Clock } from 'lucide-react';

const JOURNEY_STAGES = [
  { id: 'awareness', label: 'Conciencia', color: 'bg-blue-500' },
  { id: 'consideration', label: 'Consideración', color: 'bg-indigo-500' },
  { id: 'decision', label: 'Decisión', color: 'bg-purple-500' },
  { id: 'retention', label: 'Retención', color: 'bg-emerald-500' },
  { id: 'advocacy', label: 'Fidelización', color: 'bg-amber-500' }
];

export function CustomerJourneyMap() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Customer Journey Map</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative pt-8 pb-12">
          {/* Progress Line */}
          <div className="absolute top-12 left-0 right-0 h-1 bg-muted rounded-full" />
          
          <div className="grid grid-cols-5 relative z-10">
            {JOURNEY_STAGES.map((stage, index) => (
              <div key={stage.id} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-4 ${
                  index <= 2 ? stage.color : 'bg-muted text-muted-foreground'
                } text-white font-bold text-xs shadow-lg ring-4 ring-background`}>
                  {index + 1}
                </div>
                <span className={`text-xs font-medium mb-2 ${
                  index <= 2 ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {stage.label}
                </span>
                
                {index <= 2 && (
                  <div className="bg-card border rounded-lg p-3 w-full max-w-[140px] text-center shadow-sm">
                    <p className="text-[10px] text-muted-foreground mb-1">Tiempo en etapa</p>
                    <p className="font-bold text-sm">12 días</p>
                    <Progress value={80} className="h-1 mt-2" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <h4 className="font-medium mb-4 text-sm">Hitos Clave</h4>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 flex flex-col items-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <div className="w-0.5 h-full bg-border mt-1" />
              </div>
              <div className="pb-6">
                <p className="text-sm font-medium">Primera Visita Web</p>
                <p className="text-xs text-muted-foreground">Hace 2 meses • Fuente: LinkedIn Ads</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-8 flex flex-col items-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <div className="w-0.5 h-full bg-border mt-1" />
              </div>
              <div className="pb-6">
                <p className="text-sm font-medium">Descarga Whitepaper</p>
                <p className="text-xs text-muted-foreground">Hace 1.5 meses • Score +5</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 flex flex-col items-center">
                <Clock className="h-5 w-5 text-blue-500" />
                <div className="w-0.5 h-full bg-border mt-1" />
              </div>
              <div className="pb-6">
                <p className="text-sm font-medium">Demo Programada</p>
                <p className="text-xs text-muted-foreground">Mañana, 10:00 AM • Con Juan Pérez</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
