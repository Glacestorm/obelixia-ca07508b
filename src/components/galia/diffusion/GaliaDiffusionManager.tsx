/**
 * GALIA - Gestión de Difusión y Contenidos
 */
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Megaphone, Plus, Calendar, BarChart3, Globe, FileText,
  Video, Image, Users, ExternalLink, Trash2
} from 'lucide-react';

interface DiffusionActivity {
  id: string;
  title: string;
  type: 'publicacion_web' | 'evento' | 'foro' | 'jornada' | 'nota_prensa' | 'red_social';
  date: string;
  description: string;
  reach_estimate: number;
  status: 'planificada' | 'realizada' | 'cancelada';
  materials: string[];
  url?: string;
}

interface DiffusionMaterial {
  id: string;
  name: string;
  type: 'presentacion' | 'infografia' | 'video' | 'documento' | 'otro';
  description: string;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  publicacion_web: { label: 'Publicación Web', icon: <Globe className="h-3 w-3" />, color: 'bg-blue-500/20 text-blue-400' },
  evento: { label: 'Evento', icon: <Users className="h-3 w-3" />, color: 'bg-purple-500/20 text-purple-400' },
  foro: { label: 'Foro', icon: <Users className="h-3 w-3" />, color: 'bg-amber-500/20 text-amber-400' },
  jornada: { label: 'Jornada', icon: <Calendar className="h-3 w-3" />, color: 'bg-green-500/20 text-green-400' },
  nota_prensa: { label: 'Nota de Prensa', icon: <FileText className="h-3 w-3" />, color: 'bg-pink-500/20 text-pink-400' },
  red_social: { label: 'Red Social', icon: <Megaphone className="h-3 w-3" />, color: 'bg-cyan-500/20 text-cyan-400' },
};

const MATERIAL_ICONS: Record<string, React.ReactNode> = {
  presentacion: <FileText className="h-4 w-4" />,
  infografia: <Image className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  documento: <FileText className="h-4 w-4" />,
  otro: <FileText className="h-4 w-4" />,
};

// Mock data for demo
const MOCK_ACTIVITIES: DiffusionActivity[] = [
  { id: '1', title: 'Presentación proyecto LEADER IA en CONAMA', type: 'evento', date: '2026-03-15', description: 'Participación en congreso nacional de medio ambiente', reach_estimate: 500, status: 'planificada', materials: ['Presentación LEADER IA'] },
  { id: '2', title: 'Publicación resultados piloto en web GAL', type: 'publicacion_web', date: '2026-02-10', description: 'Artículo con métricas del piloto', reach_estimate: 2000, status: 'realizada', materials: ['Infografía resultados'], url: 'https://example.com' },
  { id: '3', title: 'Jornada formativa GALs Castilla y León', type: 'jornada', date: '2026-04-20', description: 'Sesión presencial demostración herramientas IA', reach_estimate: 80, status: 'planificada', materials: [] },
  { id: '4', title: 'Nota de prensa: IA en gestión LEADER', type: 'nota_prensa', date: '2026-01-28', description: 'Comunicado a medios locales y especializados', reach_estimate: 5000, status: 'realizada', materials: ['Nota de prensa PDF'] },
  { id: '5', title: 'Post LinkedIn resultados Q1', type: 'red_social', date: '2026-03-31', description: 'Publicación de métricas trimestrales', reach_estimate: 3000, status: 'planificada', materials: [] },
];

const MOCK_MATERIALS: DiffusionMaterial[] = [
  { id: '1', name: 'Presentación LEADER IA v2.0', type: 'presentacion', description: 'Diapositivas principales del proyecto', created_at: '2026-01-15' },
  { id: '2', name: 'Infografía resultados piloto', type: 'infografia', description: 'Resumen visual de KPIs del piloto', created_at: '2026-02-01' },
  { id: '3', name: 'Video demostración asistente', type: 'video', description: 'Screencast de 3min del asistente IA', created_at: '2026-01-20' },
  { id: '4', name: 'Nota de prensa PDF', type: 'documento', description: 'Comunicado oficial para medios', created_at: '2026-01-28' },
  { id: '5', name: 'Dossier proyecto LEADER IA', type: 'documento', description: 'Documento completo para socios potenciales', created_at: '2026-02-05' },
];

export function GaliaDiffusionManager() {
  const [activities, setActivities] = useState<DiffusionActivity[]>(MOCK_ACTIVITIES);
  const [materials] = useState<DiffusionMaterial[]>(MOCK_MATERIALS);
  const [activeTab, setActiveTab] = useState('actividades');
  const [showCreate, setShowCreate] = useState(false);
  const [newActivity, setNewActivity] = useState({ title: '', type: 'publicacion_web', date: '', description: '', reach_estimate: 0 });

  const metrics = {
    total: activities.length,
    realizadas: activities.filter(a => a.status === 'realizada').length,
    planificadas: activities.filter(a => a.status === 'planificada').length,
    alcance_total: activities.filter(a => a.status === 'realizada').reduce((sum, a) => sum + a.reach_estimate, 0),
  };

  const handleCreate = () => {
    const activity: DiffusionActivity = {
      id: Date.now().toString(),
      ...newActivity,
      type: newActivity.type as any,
      status: 'planificada',
      materials: [],
    };
    setActivities(prev => [activity, ...prev]);
    setShowCreate(false);
    setNewActivity({ title: '', type: 'publicacion_web', date: '', description: '', reach_estimate: 0 });
  };

  const deleteActivity = (id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Difusión y Contenidos
          </h2>
          <p className="text-sm text-muted-foreground">Gestión de actividades de comunicación del proyecto</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nueva Actividad
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-primary">{metrics.total}</p>
            <p className="text-xs text-muted-foreground">Total actividades</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-green-400">{metrics.realizadas}</p>
            <p className="text-xs text-muted-foreground">Realizadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{metrics.planificadas}</p>
            <p className="text-xs text-muted-foreground">Planificadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-blue-400">{metrics.alcance_total.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Alcance estimado</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="actividades">Actividades</TabsTrigger>
          <TabsTrigger value="materiales">Biblioteca</TabsTrigger>
          <TabsTrigger value="calendario">Calendario</TabsTrigger>
        </TabsList>

        {/* Activities */}
        <TabsContent value="actividades">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {activities.sort((a, b) => b.date.localeCompare(a.date)).map(activity => {
                const cfg = TYPE_CONFIG[activity.type];
                return (
                  <Card key={activity.id} className="hover:bg-muted/30 transition-colors">
                    <CardContent className="py-3 flex items-start justify-between">
                      <div className="flex gap-3">
                        <div className="mt-0.5">{cfg?.icon}</div>
                        <div>
                          <p className="font-medium text-sm">{activity.title}</p>
                          <p className="text-xs text-muted-foreground">{activity.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={cfg?.color}>{cfg?.label}</Badge>
                            <Badge variant={activity.status === 'realizada' ? 'default' : 'outline'} className="text-[10px]">
                              {activity.status === 'realizada' ? '✓ Realizada' : 'Planificada'}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />{activity.date}
                            </span>
                            <span className="text-[10px] text-muted-foreground">~{activity.reach_estimate.toLocaleString()} alcance</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {activity.url && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(activity.url, '_blank')}>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteActivity(activity.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Materials Library */}
        <TabsContent value="materiales">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {materials.map(m => (
              <Card key={m.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="py-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    {MATERIAL_ICONS[m.type]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{m.created_at}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Calendar */}
        <TabsContent value="calendario">
          <Card>
            <CardContent className="py-4">
              <div className="space-y-2">
                {activities
                  .filter(a => a.status === 'planificada')
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map(a => {
                    const cfg = TYPE_CONFIG[a.type];
                    return (
                      <div key={a.id} className="flex items-center gap-3 p-2 rounded border border-border/50">
                        <div className="text-center min-w-[50px]">
                          <p className="text-lg font-bold text-primary">{new Date(a.date).getDate()}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">
                            {new Date(a.date).toLocaleDateString('es-ES', { month: 'short' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{a.title}</p>
                          <Badge className={cfg?.color + ' text-[10px]'}>{cfg?.label}</Badge>
                        </div>
                      </div>
                    );
                  })}
                {activities.filter(a => a.status === 'planificada').length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">No hay eventos planificados</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Actividad de Difusión</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título" value={newActivity.title} onChange={e => setNewActivity(p => ({ ...p, title: e.target.value }))} />
            <select
              value={newActivity.type}
              onChange={e => setNewActivity(p => ({ ...p, type: e.target.value }))}
              className="w-full bg-background border rounded px-3 py-2 text-sm"
            >
              {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <Input type="date" value={newActivity.date} onChange={e => setNewActivity(p => ({ ...p, date: e.target.value }))} />
            <Input type="number" placeholder="Alcance estimado" value={newActivity.reach_estimate || ''} onChange={e => setNewActivity(p => ({ ...p, reach_estimate: Number(e.target.value) }))} />
            <Textarea placeholder="Descripción" value={newActivity.description} onChange={e => setNewActivity(p => ({ ...p, description: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newActivity.title}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GaliaDiffusionManager;
