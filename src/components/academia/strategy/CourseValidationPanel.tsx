import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, ClipboardCheck, MessageSquare, Globe, Video, Users } from 'lucide-react';

const CHECKLIST_ITEMS = [
  { key: 'conversations', label: '20 conversaciones con público objetivo', icon: MessageSquare, category: 'Validación' },
  { key: 'landing', label: 'Landing page con promesa concreta', icon: Globe, category: 'Validación' },
  { key: 'temario', label: 'Temario resumido publicado', icon: ClipboardCheck, category: 'Validación' },
  { key: 'bonus', label: 'Bonus definidos (plantillas)', icon: CheckCircle, category: 'Validación' },
  { key: 'beta_price', label: 'Precio beta configurado', icon: CheckCircle, category: 'Validación' },
  { key: 'waitlist', label: 'Lista de espera / preinscripción', icon: Users, category: 'Captación' },
  { key: 'shorts_1', label: '5 piezas cortas publicadas', icon: Video, category: 'Contenido' },
  { key: 'shorts_2', label: '10 piezas cortas publicadas', icon: Video, category: 'Contenido' },
  { key: 'first_leads', label: 'Primeros 10 leads cualificados', icon: Users, category: 'Resultado' },
  { key: 'first_sales', label: 'Primeras 10-30 ventas beta', icon: CheckCircle, category: 'Resultado' },
];

export function CourseValidationPanel() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('academia_courses').select('id, title, validation_status, validation_checklist').order('title').then(({ data }) => {
      if (data) setCourses(data);
    });
  }, []);

  useEffect(() => {
    const course = courses.find(c => c.id === selectedCourse);
    if (course?.validation_checklist) {
      setChecklist(course.validation_checklist as Record<string, boolean>);
    } else {
      setChecklist({});
    }
  }, [selectedCourse, courses]);

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const progress = CHECKLIST_ITEMS.length > 0 ? (completedCount / CHECKLIST_ITEMS.length) * 100 : 0;

  const toggleItem = (key: string) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!selectedCourse) return;
    setSaving(true);
    const status = progress >= 100 ? 'validated' : progress >= 50 ? 'in_progress' : 'draft';
    const { error } = await supabase
      .from('academia_courses')
      .update({ validation_checklist: checklist, validation_status: status } as any)
      .eq('id', selectedCourse);
    setSaving(false);
    if (error) { toast.error('Error al guardar'); return; }
    toast.success('Progreso de validación guardado');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500">
          <ClipboardCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Validación Pre-Lanzamiento</h2>
          <p className="text-sm text-muted-foreground">Valida tu curso antes de grabar - checklist probado</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger><SelectValue placeholder="Selecciona un curso..." /></SelectTrigger>
            <SelectContent>
              {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCourse && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Progreso de Validación</CardTitle>
                <Badge variant={progress >= 100 ? 'default' : progress >= 50 ? 'secondary' : 'outline'}>
                  {completedCount}/{CHECKLIST_ITEMS.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2">
                {progress >= 100 ? '✅ ¡Curso validado! Listo para producción' : progress >= 50 ? '🔄 En progreso - sigue validando' : '🚀 Comienza tu validación rápida (7-14 días)'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Checklist de Validación</CardTitle>
              <CardDescription>Marca cada paso completado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {CHECKLIST_ITEMS.map((item) => (
                <div key={item.key} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <Checkbox
                    checked={!!checklist[item.key]}
                    onCheckedChange={() => toggleItem(item.key)}
                  />
                  <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                  </div>
                </div>
              ))}
              <Button onClick={handleSave} disabled={saving} className="w-full mt-4">
                {saving ? 'Guardando...' : 'Guardar Progreso'}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default CourseValidationPanel;
