import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, FileCheck, Users, RefreshCw, MessageSquare, Shield } from 'lucide-react';

const PRACTICES = [
  { key: 'measurable', label: 'Resultados medibles (rúbrica + entregables)', icon: Target },
  { key: 'real_cases', label: 'Casos reales con números, no solo teoría', icon: FileCheck },
  { key: 'templates', label: 'Plantillas excelentes (esto vende solo)', icon: FileCheck },
  { key: 'onboarding', label: 'Onboarding brutal (primeros 30 min = quick win)', icon: Users },
  { key: 'updates', label: 'Actualizaciones frecuentes (y comunicadas)', icon: RefreshCw },
  { key: 'testimonials', label: 'Testimonios específicos ("ahorro X / ordené Y / entiendo Z")', icon: MessageSquare },
  { key: 'ethics', label: 'Ética + compliance (en finanzas = marca)', icon: Shield },
];

export function BestPracticesPanel() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const completedCount = Object.values(checked).filter(Boolean).length;
  const progress = (completedCount / PRACTICES.length) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-500">
          <Trophy className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Mejores Prácticas</h2>
          <p className="text-sm text-muted-foreground">Lo que hacen los mejores creadores de cursos</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Nivel de excelencia</span>
            <Badge>{completedCount}/{PRACTICES.length}</Badge>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          {PRACTICES.map(p => (
            <div key={p.key} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30">
              <Checkbox checked={!!checked[p.key]} onCheckedChange={() => setChecked(prev => ({ ...prev, [p.key]: !prev[p.key] }))} />
              <p.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{p.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default BestPracticesPanel;
