import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Filter, Youtube, Download, Mail, Video, ShoppingCart, Plus, ArrowDown } from 'lucide-react';

const STAGES = [
  { name: 'Contenido', icon: Youtube, color: 'from-red-500 to-rose-500', desc: 'YouTube/LinkedIn - Educación + casos' },
  { name: 'Captación', icon: Download, color: 'from-blue-500 to-cyan-500', desc: 'Lead magnet - Recurso descargable' },
  { name: 'Email', icon: Mail, color: 'from-violet-500 to-purple-500', desc: '7-12 correos de valor' },
  { name: 'Evento', icon: Video, color: 'from-amber-500 to-orange-500', desc: 'Webinar/Masterclass' },
  { name: 'Oferta', icon: ShoppingCart, color: 'from-emerald-500 to-green-500', desc: 'Bonus + garantía + urgencia ética' },
];

export function SalesFunnelDesigner() {
  const [funnels, setFunnels] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    supabase.from('academia_courses').select('id, title').order('title').then(({ data }) => { if (data) setCourses(data); });
    supabase.from('academia_sales_funnels').select('*').order('created_at', { ascending: false }).limit(20).then(({ data }) => { if (data) setFunnels(data); });
  }, []);

  const createFunnel = async () => {
    if (!selectedCourse || !newName) { toast.error('Completa los campos'); return; }
    const { error } = await supabase.from('academia_sales_funnels').insert([{
      course_id: selectedCourse, name: newName, status: 'draft'
    }] as any);
    if (error) { toast.error('Error'); return; }
    toast.success('Funnel creado');
    setNewName('');
    const { data } = await supabase.from('academia_sales_funnels').select('*').order('created_at', { ascending: false }).limit(20);
    if (data) setFunnels(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500">
          <Funnel className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Funnel de Ventas</h2>
          <p className="text-sm text-muted-foreground">Diseña tu embudo de conversión paso a paso</p>
        </div>
      </div>

      {/* Visual Funnel */}
      <div className="flex flex-col items-center gap-1">
        {STAGES.map((stage, i) => (
          <div key={stage.name} className="w-full">
            <Card className={`bg-gradient-to-r ${stage.color} text-white border-0`} style={{ width: `${100 - i * 10}%`, margin: '0 auto' }}>
              <CardContent className="p-4 flex items-center gap-3">
                <stage.icon className="h-5 w-5" />
                <div>
                  <p className="font-semibold text-sm">{stage.name}</p>
                  <p className="text-xs opacity-80">{stage.desc}</p>
                </div>
              </CardContent>
            </Card>
            {i < STAGES.length - 1 && <div className="text-center"><ArrowDown className="h-4 w-4 mx-auto text-muted-foreground" /></div>}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Crear Funnel</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger><SelectValue placeholder="Curso..." /></SelectTrigger>
            <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input placeholder="Nombre del funnel" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1" />
            <Button onClick={createFunnel}><Plus className="h-4 w-4 mr-1" /> Crear</Button>
          </div>
        </CardContent>
      </Card>

      {funnels.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Funnels Activos ({funnels.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {funnels.map(f => (
              <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border">
                <p className="text-sm font-medium">{f.name}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{f.total_leads || 0} leads</Badge>
                  <Badge variant={f.status === 'active' ? 'default' : 'secondary'}>{f.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SalesFunnelDesigner;
