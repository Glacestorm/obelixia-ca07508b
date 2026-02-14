/**
 * GaliaPartnerCRM - CRM de Socios LEADER
 * Actuación 5: Gestión de socios potenciales, evaluación y captación
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Plus,
  Search,
  Building2,
  GraduationCap,
  Landmark,
  Globe,
  Phone,
  Mail,
  MapPin,
  Star,
  MessageSquare,
  Calendar,
  TrendingUp,
  Filter,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGaliaPartnerCRM, GaliaPartner, EVALUATION_CRITERIA } from '@/hooks/galia/useGaliaPartnerCRM';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  identificado: { label: 'Identificado', color: 'bg-muted text-muted-foreground' },
  contactado: { label: 'Contactado', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  interesado: { label: 'Interesado', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  comprometido: { label: 'Comprometido', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  descartado: { label: 'Descartado', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  gal: <Users className="h-4 w-4" />,
  organismo_publico: <Landmark className="h-4 w-4" />,
  centro_tecnologico: <Building2 className="h-4 w-4" />,
  universidad: <GraduationCap className="h-4 w-4" />,
  empresa: <Building2 className="h-4 w-4" />,
  asociacion: <Users className="h-4 w-4" />,
  otro: <Globe className="h-4 w-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  gal: 'GAL', organismo_publico: 'Organismo Público', centro_tecnologico: 'Centro Tecnológico',
  universidad: 'Universidad', empresa: 'Empresa', asociacion: 'Asociación', otro: 'Otro',
};

const PIPELINE_STAGES = ['identificado', 'contactado', 'interesado', 'comprometido'];

export function GaliaPartnerCRM() {
  const {
    partners, interactions, loading, filters, setFilters,
    createPartner, updatePartner, deletePartner,
    fetchInteractions, addInteraction, calculateScore, getStats,
  } = useGaliaPartnerCRM();

  const [activeTab, setActiveTab] = useState('pipeline');
  const [selectedPartner, setSelectedPartner] = useState<GaliaPartner | null>(null);
  const [showNewPartner, setShowNewPartner] = useState(false);
  const [newPartner, setNewPartner] = useState<Partial<GaliaPartner>>({ type: 'gal', scope: 'nacional', status: 'identificado' });
  const [newInteraction, setNewInteraction] = useState({ interaction_type: 'nota' as const, description: '' });

  const stats = useMemo(() => getStats(), [getStats]);

  const handleSelectPartner = (partner: GaliaPartner) => {
    setSelectedPartner(partner);
    fetchInteractions(partner.id);
  };

  const handleCreatePartner = async () => {
    const result = await createPartner(newPartner);
    if (result) {
      setShowNewPartner(false);
      setNewPartner({ type: 'gal', scope: 'nacional', status: 'identificado' });
    }
  };

  const handleAddInteraction = async () => {
    if (!selectedPartner || !newInteraction.description.trim()) return;
    await addInteraction({ ...newInteraction, partner_id: selectedPartner.id });
    setNewInteraction({ interaction_type: 'nota', description: '' });
  };

  const handleUpdateScore = async (partner: GaliaPartner, key: string, value: number) => {
    const scores = { ...partner.evaluation_scores, [key]: value };
    await updatePartner(partner.id, { evaluation_scores: scores } as any);
    if (selectedPartner?.id === partner.id) {
      setSelectedPartner({ ...partner, evaluation_scores: scores });
    }
  };

  // Pipeline view
  const pipelineData = useMemo(() => {
    return PIPELINE_STAGES.map(stage => ({
      stage,
      ...STATUS_CONFIG[stage],
      partners: partners.filter(p => p.status === stage),
    }));
  }, [partners]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            CRM Socios LEADER
          </h2>
          <p className="text-sm text-muted-foreground">
            {stats.total} socios · {stats.comprometidos} comprometidos · {stats.interesados} interesados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar socio..."
              className="pl-9 w-48"
              value={filters.search || ''}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          <Dialog open={showNewPartner} onOpenChange={setShowNewPartner}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nuevo Socio</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Nuevo Socio Potencial</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Nombre de la entidad *" value={newPartner.name || ''} onChange={e => setNewPartner(p => ({ ...p, name: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Select value={newPartner.type} onValueChange={v => setNewPartner(p => ({ ...p, type: v as any }))}>
                    <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={newPartner.scope} onValueChange={v => setNewPartner(p => ({ ...p, scope: v as any }))}>
                    <SelectTrigger><SelectValue placeholder="Ámbito" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local</SelectItem>
                      <SelectItem value="regional">Regional</SelectItem>
                      <SelectItem value="nacional">Nacional</SelectItem>
                      <SelectItem value="transnacional">Transnacional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input placeholder="Territorio" value={newPartner.territory || ''} onChange={e => setNewPartner(p => ({ ...p, territory: e.target.value }))} />
                <Input placeholder="Persona de contacto" value={newPartner.contact_person || ''} onChange={e => setNewPartner(p => ({ ...p, contact_person: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Email" type="email" value={newPartner.email || ''} onChange={e => setNewPartner(p => ({ ...p, email: e.target.value }))} />
                  <Input placeholder="Teléfono" value={newPartner.phone || ''} onChange={e => setNewPartner(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <Input placeholder="Web" value={newPartner.website || ''} onChange={e => setNewPartner(p => ({ ...p, website: e.target.value }))} />
                <Textarea placeholder="Notas..." value={newPartner.notes || ''} onChange={e => setNewPartner(p => ({ ...p, notes: e.target.value }))} />
                <Button onClick={handleCreatePartner} className="w-full" disabled={!newPartner.name}>Crear Socio</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filters.type || 'all'} onValueChange={v => setFilters(p => ({ ...p, type: v === 'all' ? undefined : v }))}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.status || 'all'} onValueChange={v => setFilters(p => ({ ...p, status: v === 'all' ? undefined : v }))}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.scope || 'all'} onValueChange={v => setFilters(p => ({ ...p, scope: v === 'all' ? undefined : v }))}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Ámbito" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="local">Local</SelectItem>
            <SelectItem value="regional">Regional</SelectItem>
            <SelectItem value="nacional">Nacional</SelectItem>
            <SelectItem value="transnacional">Transnacional</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pipeline" className="text-xs">Pipeline</TabsTrigger>
          <TabsTrigger value="listado" className="text-xs">Listado</TabsTrigger>
          <TabsTrigger value="evaluacion" className="text-xs">Evaluación</TabsTrigger>
        </TabsList>

        {/* Pipeline Kanban */}
        <TabsContent value="pipeline" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {pipelineData.map(stage => (
              <Card key={stage.stage} className="border-t-4" style={{ borderTopColor: stage.stage === 'comprometido' ? 'hsl(var(--primary))' : undefined }}>
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs font-medium flex items-center justify-between">
                    {stage.label}
                    <Badge variant="outline" className="text-[10px]">{stage.partners.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-2">
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {stage.partners.map(partner => (
                        <div
                          key={partner.id}
                          onClick={() => handleSelectPartner(partner)}
                          className={cn(
                            "p-2 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 text-xs",
                            selectedPartner?.id === partner.id && "border-primary bg-primary/5"
                          )}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            {TYPE_ICONS[partner.type]}
                            <span className="font-medium truncate">{partner.name}</span>
                          </div>
                          {partner.territory && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{partner.territory}</span>
                            </div>
                          )}
                          {partner.evaluation_scores && Object.keys(partner.evaluation_scores).length > 0 && (
                            <div className="mt-1 flex items-center gap-1">
                              <Star className="h-3 w-3 text-amber-500" />
                              <span className="text-[10px]">{calculateScore(partner.evaluation_scores)}/100</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {stage.partners.length === 0 && (
                        <p className="text-center text-muted-foreground text-[11px] py-6">Sin socios</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Listado */}
        <TabsContent value="listado" className="mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {partners.map(partner => (
                    <Card
                      key={partner.id}
                      className={cn("cursor-pointer transition-colors hover:bg-muted/30", selectedPartner?.id === partner.id && "border-primary")}
                      onClick={() => handleSelectPartner(partner)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {TYPE_ICONS[partner.type]}
                            <div>
                              <p className="font-medium text-sm">{partner.name}</p>
                              <p className="text-xs text-muted-foreground">{TYPE_LABELS[partner.type]} · {partner.territory || 'Sin territorio'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={cn("text-[10px]", STATUS_CONFIG[partner.status]?.color)}>
                              {STATUS_CONFIG[partner.status]?.label}
                            </Badge>
                            {calculateScore(partner.evaluation_scores) > 0 && (
                              <Badge variant="outline" className="text-[10px]">
                                <Star className="h-3 w-3 mr-1 text-amber-500" />
                                {calculateScore(partner.evaluation_scores)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Detail Panel */}
            <div>
              {selectedPartner ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {TYPE_ICONS[selectedPartner.type]}
                      {selectedPartner.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="space-y-1.5">
                      {selectedPartner.contact_person && <p className="flex items-center gap-1.5"><Users className="h-3 w-3" />{selectedPartner.contact_person}</p>}
                      {selectedPartner.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{selectedPartner.email}</p>}
                      {selectedPartner.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{selectedPartner.phone}</p>}
                      {selectedPartner.website && <p className="flex items-center gap-1.5"><ExternalLink className="h-3 w-3" /><a href={selectedPartner.website} target="_blank" rel="noopener noreferrer" className="text-primary underline truncate">{selectedPartner.website}</a></p>}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Estado:</span>
                      <Select value={selectedPartner.status} onValueChange={v => { updatePartner(selectedPartner.id, { status: v as any }); setSelectedPartner(p => p ? { ...p, status: v as any } : null); }}>
                        <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedPartner.notes && <p className="text-muted-foreground bg-muted/50 p-2 rounded">{selectedPartner.notes}</p>}

                    {/* Interactions */}
                    <div className="pt-2 border-t">
                      <h4 className="font-medium mb-2 flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Interacciones</h4>
                      <div className="flex gap-1 mb-2">
                        <Select value={newInteraction.interaction_type} onValueChange={v => setNewInteraction(p => ({ ...p, interaction_type: v as any }))}>
                          <SelectTrigger className="h-7 text-[11px] w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="llamada">Llamada</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="reunion">Reunión</SelectItem>
                            <SelectItem value="evento">Evento</SelectItem>
                            <SelectItem value="nota">Nota</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input className="h-7 text-[11px] flex-1" placeholder="Descripción..." value={newInteraction.description} onChange={e => setNewInteraction(p => ({ ...p, description: e.target.value }))} />
                        <Button size="sm" className="h-7 text-[11px] px-2" onClick={handleAddInteraction} disabled={!newInteraction.description.trim()}>+</Button>
                      </div>
                      <ScrollArea className="h-[150px]">
                        {interactions.map(i => (
                          <div key={i.id} className="p-1.5 border-b last:border-0">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDistanceToNow(new Date(i.date), { locale: es, addSuffix: true })}
                              <Badge variant="outline" className="text-[9px] ml-1">{i.interaction_type}</Badge>
                            </div>
                            <p className="text-[11px] mt-0.5">{i.description}</p>
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center text-sm text-muted-foreground">
                    Selecciona un socio para ver detalles
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Evaluación */}
        <TabsContent value="evaluacion" className="mt-3">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Evalúa cada socio en una escala 0-100 según criterios ponderados. La puntuación final se calcula automáticamente.</p>
            <ScrollArea className="h-[450px]">
              <div className="space-y-3">
                {partners.filter(p => p.status !== 'descartado').map(partner => {
                  const score = calculateScore(partner.evaluation_scores);
                  return (
                    <Card key={partner.id}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {TYPE_ICONS[partner.type]}
                            <span className="font-medium text-sm">{partner.name}</span>
                            <Badge className={cn("text-[10px]", STATUS_CONFIG[partner.status]?.color)}>{STATUS_CONFIG[partner.status]?.label}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <span className="font-bold text-lg">{score}</span>
                            <span className="text-xs text-muted-foreground">/100</span>
                          </div>
                        </div>
                        <Progress value={score} className="h-1.5 mb-2" />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {EVALUATION_CRITERIA.map(c => (
                            <div key={c.key} className="text-xs">
                              <div className="flex justify-between mb-0.5">
                                <span className="text-muted-foreground">{c.label} ({c.weight}%)</span>
                                <span className="font-medium">{partner.evaluation_scores?.[c.key] || 0}</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={partner.evaluation_scores?.[c.key] || 0}
                                onChange={e => handleUpdateScore(partner, c.key, parseInt(e.target.value))}
                                className="w-full h-1.5 accent-primary"
                              />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>

      {/* Redes y Captación */}
      <Card>
        <CardContent className="p-3">
          <h4 className="text-xs font-medium mb-2 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-primary" />
            Redes y Enlaces de Captación
          </h4>
          <div className="flex flex-wrap gap-2">
            {[
              { name: 'READER', url: 'https://www.readerasociacion.org' },
              { name: 'REDR', url: 'https://www.redr.es' },
              { name: 'RRN', url: 'https://www.rrn.es' },
              { name: 'ENRD', url: 'https://enrd.ec.europa.eu' },
              { name: 'ELARD', url: 'https://www.elard.eu' },
            ].map(net => (
              <Button key={net.name} variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => window.open(net.url, '_blank')}>
                <ExternalLink className="h-3 w-3 mr-1" />{net.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default GaliaPartnerCRM;
