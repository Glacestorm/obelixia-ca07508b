import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Award, FileCheck, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-500/10 text-yellow-600', icon: Clock },
  submitted: { label: 'Entregado', color: 'bg-blue-500/10 text-blue-600', icon: FileCheck },
  graded: { label: 'Evaluado', color: 'bg-green-500/10 text-green-600', icon: CheckCircle },
  revision: { label: 'En revisión', color: 'bg-orange-500/10 text-orange-600', icon: AlertCircle },
};

export function CapstoneProjectPanel() {
  const [projects, setProjects] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('academia_courses').select('id, title').order('title').then(({ data }) => { if (data) setCourses(data); });
  }, []);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const query = supabase.from('academia_capstone_projects').select('*').order('submitted_at', { ascending: false }).limit(50);
      if (selectedCourse) query.eq('course_id', selectedCourse);
      const { data } = await query;
      if (data) setProjects(data);
      setLoading(false);
    };
    fetch();
  }, [selectedCourse]);

  const statusInfo = (s: string) => STATUS_MAP[s] || STATUS_MAP.pending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
          <Award className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Proyectos Capstone</h2>
          <p className="text-sm text-muted-foreground">Gestión de proyectos finales, rúbricas y feedback</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger><SelectValue placeholder="Filtrar por curso..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los cursos</SelectItem>
              {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(STATUS_MAP).map(([key, info]) => {
          const count = projects.filter(p => p.status === key).length;
          return (
            <Card key={key}>
              <CardContent className="pt-6 text-center">
                <info.icon className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{info.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proyectos ({projects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {projects.map(p => {
                const info = statusInfo(p.status);
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.description?.slice(0, 80)}</p>
                    </div>
                    <Badge className={info.color}>{info.label}</Badge>
                  </div>
                );
              })}
              {projects.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No hay proyectos capstone aún</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default CapstoneProjectPanel;
