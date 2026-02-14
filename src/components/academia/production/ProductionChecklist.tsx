import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Mic, Sun, Monitor, FileText, Film, Scissors, Package } from 'lucide-react';

const SECTIONS = [
  {
    title: 'Setup Técnico',
    items: [
      { key: 'mic', label: 'Micrófono decente configurado', icon: Mic },
      { key: 'light', label: 'Luz frontal simple', icon: Sun },
      { key: 'screen', label: 'Captura de pantalla configurada', icon: Monitor },
      { key: 'templates', label: 'Plantillas con branding consistente', icon: FileText },
    ]
  },
  {
    title: 'Flujo de Producción',
    items: [
      { key: 'script', label: 'Guion por lección: Hook → Explicación → Ejemplo → Tarea', icon: FileText },
      { key: 'batch', label: 'Grabación por bloques (10-20 lecciones)', icon: Film },
      { key: 'edit', label: 'Edición ligera: cortes, zoom, títulos', icon: Scissors },
      { key: 'resources', label: 'Recursos descargables por módulo', icon: Package },
    ]
  }
];

export function ProductionChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const allItems = SECTIONS.flatMap(s => s.items);
  const completedCount = Object.values(checked).filter(Boolean).length;
  const progress = allItems.length > 0 ? (completedCount / allItems.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500">
          <Film className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Checklist de Producción</h2>
          <p className="text-sm text-muted-foreground">Setup profesional y flujo de grabación optimizado</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progreso general</span>
            <Badge variant={progress >= 100 ? 'default' : 'secondary'}>{completedCount}/{allItems.length}</Badge>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      {SECTIONS.map(section => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="text-base">{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {section.items.map(item => (
              <div key={item.key} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30">
                <Checkbox checked={!!checked[item.key]} onCheckedChange={() => setChecked(p => ({ ...p, [item.key]: !p[item.key] }))} />
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{item.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default ProductionChecklist;
