import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Wallet, TrendingUp, FileSpreadsheet, Briefcase, Building2, Award,
  Check, Plus, Target, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NICHES = [
  { id: 'personal_finance', label: 'Finanzas Personales', icon: Wallet, color: 'from-green-500 to-emerald-500', desc: 'Presupuesto, deudas, ahorro, hábitos, planificación' },
  { id: 'investment', label: 'Inversión Educativa', icon: TrendingUp, color: 'from-blue-500 to-cyan-500', desc: 'Riesgo, diversificación, productos, sesgos, plan' },
  { id: 'excel_finance', label: 'Excel/Sheets Financiero', icon: FileSpreadsheet, color: 'from-emerald-500 to-teal-500', desc: 'Plantillas, modelos, dashboards financieros' },
  { id: 'entrepreneurs', label: 'Finanzas Emprendedores', icon: Briefcase, color: 'from-amber-500 to-orange-500', desc: 'Cashflow, pricing, margen, unit economics' },
  { id: 'corporate', label: 'Finanzas Corporativas', icon: Building2, color: 'from-violet-500 to-purple-500', desc: 'Valoración, WACC, análisis estados, M&A' },
  { id: 'certifications', label: 'Certificaciones', icon: Award, color: 'from-rose-500 to-pink-500', desc: 'CFA, FRM, EFPA - preparación rigurosa' },
];

interface CourseNiche {
  courseId: string;
  courseTitle: string;
  niche: string | null;
}

export function NicheConfigPanel() {
  const [courses, setCourses] = useState<CourseNiche[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('academia_courses')
      .select('id, title, niche')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setCourses(data.map(c => ({ courseId: c.id, courseTitle: c.title, niche: c.niche })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const assignNiche = async (courseId: string, niche: string) => {
    const { error } = await supabase
      .from('academia_courses')
      .update({ niche } as any)
      .eq('id', courseId);
    if (error) { toast.error('Error al asignar nicho'); return; }
    toast.success('Nicho asignado');
    setCourses(prev => prev.map(c => c.courseId === courseId ? { ...c, niche } : c));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
          <Target className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Configuración de Nichos</h2>
          <p className="text-sm text-muted-foreground">Define el nicho de cada curso para maximizar conversiones</p>
        </div>
      </div>

      {/* Niche Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {NICHES.map((niche) => {
          const count = courses.filter(c => c.niche === niche.id).length;
          return (
            <Card
              key={niche.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]",
                selectedNiche === niche.id && "ring-2 ring-primary"
              )}
              onClick={() => setSelectedNiche(selectedNiche === niche.id ? null : niche.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${niche.color}`}>
                    <niche.icon className="h-5 w-5 text-white" />
                  </div>
                  <Badge variant="secondary">{count} cursos</Badge>
                </div>
                <h3 className="font-semibold">{niche.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">{niche.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Course Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Asignar Nicho a Cursos</CardTitle>
          <CardDescription>Selecciona un nicho arriba y asígnalo a tus cursos</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando cursos...</p>
          ) : courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay cursos creados aún</p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {courses.map((course) => (
                  <div key={course.courseId} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{course.courseTitle}</p>
                      {course.niche && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {NICHES.find(n => n.id === course.niche)?.label || course.niche}
                        </Badge>
                      )}
                    </div>
                    {selectedNiche && (
                      <Button
                        size="sm"
                        variant={course.niche === selectedNiche ? "default" : "outline"}
                        onClick={() => assignNiche(course.courseId, selectedNiche)}
                      >
                        {course.niche === selectedNiche ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default NicheConfigPanel;
