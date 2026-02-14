import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Store, Landmark, Users, Repeat, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const MODELS = [
  {
    id: 'marketplace', label: 'Marketplace', subtitle: 'Volumen', icon: Store, color: 'from-blue-500 to-cyan-500',
    pros: ['Validación rápida', 'SEO de la plataforma', 'Gran catálogo'],
    cons: ['Bajo margen (17-37%)', 'Poco control', 'Competencia por precio'],
    metrics: 'Revenue share: 17.5-37%', ideal: 'Validar demanda rápido'
  },
  {
    id: 'brand', label: 'Marca Propia', subtitle: 'Margen alto', icon: Landmark, color: 'from-violet-500 to-purple-500',
    pros: ['Control total', 'Alto margen', 'Email + funnel propio'],
    cons: ['Requiere audiencia', 'Marketing propio', 'Más trabajo técnico'],
    metrics: 'Margen: 85-100%', ideal: 'Negocio estable a largo plazo'
  },
  {
    id: 'cohort', label: 'Cohortes', subtitle: 'Alto ticket', icon: Users, color: 'from-amber-500 to-orange-500',
    pros: ['500€-3000€+', 'Resultados reales', 'Alta transformación'],
    cons: ['Escalabilidad limitada', 'Alto esfuerzo', 'Requiere soporte real'],
    metrics: 'Ticket: 500-3000€+', ideal: 'Soporte real + alto valor'
  },
  {
    id: 'subscription', label: 'Comunidad + Suscripción', subtitle: 'Recurrente', icon: Repeat, color: 'from-emerald-500 to-green-500',
    pros: ['Ingresos recurrentes', 'Alta retención', 'Continuidad'],
    cons: ['Churn constante', 'Requiere contenido mensual', 'Comunidad activa'],
    metrics: '15-79€/mes', ideal: 'Ingresos recurrentes continuos'
  },
];

export function BusinessModelSelector() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500">
          <Store className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Modelo de Negocio</h2>
          <p className="text-sm text-muted-foreground">Elige el modelo que mejor se adapta a tu estrategia</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MODELS.map(model => (
          <Card
            key={model.id}
            className={cn("cursor-pointer transition-all hover:shadow-lg", selected === model.id && "ring-2 ring-primary")}
            onClick={() => setSelected(model.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${model.color}`}>
                  <model.icon className="h-5 w-5 text-white" />
                </div>
                <Badge variant="outline">{model.subtitle}</Badge>
              </div>
              <CardTitle className="text-lg mt-2">{model.label}</CardTitle>
              <p className="text-xs font-medium text-primary">{model.metrics}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-green-600 mb-1">Ventajas</p>
                {model.pros.map(p => (
                  <div key={p} className="flex items-center gap-2 text-xs"><Check className="h-3 w-3 text-green-500" />{p}</div>
                ))}
              </div>
              <div>
                <p className="text-xs font-medium text-red-600 mb-1">Desventajas</p>
                {model.cons.map(c => (
                  <div key={c} className="flex items-center gap-2 text-xs"><X className="h-3 w-3 text-red-500" />{c}</div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground italic">Ideal: {model.ideal}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default BusinessModelSelector;
