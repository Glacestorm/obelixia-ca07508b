import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileSpreadsheet, Calculator, CheckSquare, BookOpen, Library, Plus, Trash2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

const RESOURCE_TYPES = [
  { value: 'template', label: 'Plantilla Excel/Sheets', icon: FileSpreadsheet },
  { value: 'calculator', label: 'Calculadora', icon: Calculator },
  { value: 'checklist', label: 'Checklist', icon: CheckSquare },
  { value: 'glossary', label: 'Glosario', icon: BookOpen },
  { value: 'reference', label: 'Referencia/Fuente', icon: Library },
];

export function ResourceManager() {
  const [resources, setResources] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('template');
  const [newUrl, setNewUrl] = useState('');

  const fetchResources = useCallback(async () => {
    setLoading(true);
    const query = supabase.from('academia_course_resources').select('*').order('created_at', { ascending: false });
    if (selectedCourse) query.eq('course_id', selectedCourse);
    const { data } = await query.limit(50);
    if (data) setResources(data);
    setLoading(false);
  }, [selectedCourse]);

  useEffect(() => {
    supabase.from('academia_courses').select('id, title').order('title').then(({ data }) => { if (data) setCourses(data); });
  }, []);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  const addResource = async () => {
    if (!selectedCourse || !newTitle) { toast.error('Selecciona curso y título'); return; }
    const { error } = await supabase.from('academia_course_resources').insert([{
      course_id: selectedCourse, title: newTitle, type: newType, file_url: newUrl || null
    }] as any);
    if (error) { toast.error('Error al añadir'); return; }
    toast.success('Recurso añadido');
    setNewTitle(''); setNewUrl('');
    fetchResources();
  };

  const deleteResource = async (id: string) => {
    await supabase.from('academia_course_resources').delete().eq('id', id);
    toast.success('Recurso eliminado');
    fetchResources();
  };

  const typeInfo = (type: string) => RESOURCE_TYPES.find(t => t.value === type);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500">
          <FileSpreadsheet className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Gestor de Recursos</h2>
          <p className="text-sm text-muted-foreground">Plantillas, calculadoras, checklists y referencias por módulo</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger><SelectValue placeholder="Filtrar por curso..." /></SelectTrigger>
            <SelectContent>
              {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>

          {selectedCourse && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Input placeholder="Título del recurso" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="URL archivo (opcional)" value={newUrl} onChange={e => setNewUrl(e.target.value)} />
              <Button onClick={addResource}><Plus className="h-4 w-4 mr-1" /> Añadir</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recursos ({resources.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {resources.map(r => {
                const info = typeInfo(r.type);
                const Icon = info?.icon || FileSpreadsheet;
                return (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{r.title}</p>
                        <Badge variant="outline" className="text-xs">{info?.label}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{r.download_count || 0} descargas</span>
                      <Button variant="ghost" size="icon" onClick={() => deleteResource(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {resources.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No hay recursos aún</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default ResourceManager;
