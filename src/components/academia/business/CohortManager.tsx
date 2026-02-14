import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Plus, Calendar, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function CohortManager() {
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('academia_courses').select('id, title').order('title').then(({ data }) => { if (data) setCourses(data); });
    supabase.from('academia_cohorts').select('*').order('start_date', { ascending: false }).limit(50).then(({ data }) => {
      if (data) setCohorts(data);
      setLoading(false);
    });
  }, []);

  const addCohort = async () => {
    if (!selectedCourse || !newName || !newDate) { toast.error('Completa todos los campos'); return; }
    const { error } = await supabase.from('academia_cohorts').insert([{
      course_id: selectedCourse, name: newName, start_date: newDate, status: 'upcoming'
    }] as any);
    if (error) { toast.error('Error al crear cohorte'); return; }
    toast.success('Cohorte creada');
    setNewName(''); setNewDate('');
    const { data } = await supabase.from('academia_cohorts').select('*').order('start_date', { ascending: false }).limit(50);
    if (data) setCohorts(data);
  };

  const statusColor = (s: string) => {
    if (s === 'active') return 'bg-green-500/10 text-green-600';
    if (s === 'completed') return 'bg-blue-500/10 text-blue-600';
    return 'bg-amber-500/10 text-amber-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
          <Users className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Gestor de Cohortes</h2>
          <p className="text-sm text-muted-foreground">Crea y gestiona cohortes con plazas limitadas</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Nueva Cohorte</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger><SelectValue placeholder="Curso..." /></SelectTrigger>
            <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
          </Select>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input placeholder="Nombre cohorte" value={newName} onChange={e => setNewName(e.target.value)} />
            <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
            <Button onClick={addCohort}><Plus className="h-4 w-4 mr-1" /> Crear</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Cohortes ({cohorts.length})</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[350px]">
            <div className="space-y-2">
              {cohorts.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.start_date ? format(new Date(c.start_date), 'dd MMM yyyy', { locale: es }) : 'Sin fecha'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{c.current_participants}/{c.max_participants}</Badge>
                    <Badge className={statusColor(c.status)}>{c.status}</Badge>
                  </div>
                </div>
              ))}
              {cohorts.length === 0 && <p className="text-sm text-center text-muted-foreground py-8">No hay cohortes</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default CohortManager;
