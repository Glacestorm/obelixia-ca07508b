import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserCircle, Save, Sparkles } from 'lucide-react';

interface AvatarData {
  situation: string;
  pain: string;
  goal: string;
  obstacles: string;
  level: string;
}

export function StudentAvatarBuilder() {
  const [courses, setCourses] = useState<{ id: string; title: string; target_avatar: any }[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [avatar, setAvatar] = useState<AvatarData>({ situation: '', pain: '', goal: '', obstacles: '', level: 'beginner' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('academia_courses').select('id, title, target_avatar').order('title').then(({ data }) => {
      if (data) setCourses(data);
    });
  }, []);

  useEffect(() => {
    const course = courses.find(c => c.id === selectedCourse);
    if (course?.target_avatar) {
      const a = course.target_avatar as any;
      setAvatar({
        situation: a.situation || '',
        pain: a.pain || '',
        goal: a.goal || '',
        obstacles: a.obstacles || '',
        level: a.level || 'beginner',
      });
    } else {
      setAvatar({ situation: '', pain: '', goal: '', obstacles: '', level: 'beginner' });
    }
  }, [selectedCourse, courses]);

  const handleSave = async () => {
    if (!selectedCourse) { toast.error('Selecciona un curso'); return; }
    setSaving(true);
    const { error } = await supabase
      .from('academia_courses')
      .update({ target_avatar: avatar } as any)
      .eq('id', selectedCourse);
    setSaving(false);
    if (error) { toast.error('Error al guardar'); return; }
    toast.success('Avatar del alumno guardado');
    setCourses(prev => prev.map(c => c.id === selectedCourse ? { ...c, target_avatar: avatar } : c));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500">
          <UserCircle className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Avatar del Alumno</h2>
          <p className="text-sm text-muted-foreground">Define el perfil-objetivo de tu alumno ideal por curso</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seleccionar Curso</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger><SelectValue placeholder="Elige un curso..." /></SelectTrigger>
            <SelectContent>
              {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCourse && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Constructor de Avatar
            </CardTitle>
            <CardDescription>Completa las 5 dimensiones del alumno ideal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Situación actual</Label>
              <Textarea placeholder='"Gano X, ahorro poco, me pierdo con..."' value={avatar.situation} onChange={e => setAvatar(p => ({ ...p, situation: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Dolor principal</Label>
              <Textarea placeholder='"No sé cuánto gastar / miedo a invertir / caos con impuestos..."' value={avatar.pain} onChange={e => setAvatar(p => ({ ...p, pain: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Objetivo</Label>
              <Textarea placeholder='"En 8 semanas tener un plan y control"' value={avatar.goal} onChange={e => setAvatar(p => ({ ...p, goal: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Obstáculos</Label>
              <Textarea placeholder='"No tengo tiempo, me da miedo equivocarme"' value={avatar.obstacles} onChange={e => setAvatar(p => ({ ...p, obstacles: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Nivel</Label>
              <Select value={avatar.level} onValueChange={v => setAvatar(p => ({ ...p, level: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Principiante (0)</SelectItem>
                  <SelectItem value="intermediate">Intermedio</SelectItem>
                  <SelectItem value="advanced">Avanzado / Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Avatar'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default StudentAvatarBuilder;
