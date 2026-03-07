/**
 * HRInternalMarketplacePanel - Marketplace Interno de Oportunidades
 * Refactored: Uses real data from erp_hr_opportunities table
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Briefcase, Users, Lightbulb, Clock, Search, Plus, ArrowRight,
  Bookmark, TrendingUp, Target, Calendar, Building2, Sparkles, Heart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Opportunity {
  id: string;
  type: 'project' | 'rotation' | 'mentoring' | 'committee' | 'stretch';
  title: string;
  description: string | null;
  department: string | null;
  duration: string | null;
  time_commitment: string | null;
  skills_required: string[];
  skills_developed: string[];
  posted_by: string | null;
  posted_date: string | null;
  applicants: number;
  spots: number;
  deadline: string | null;
  status: string | null;
}

const opportunityTypeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  project: { icon: Briefcase, color: 'bg-blue-100 text-blue-700 border-blue-300', label: 'Proyecto' },
  rotation: { icon: ArrowRight, color: 'bg-purple-100 text-purple-700 border-purple-300', label: 'Rotación' },
  mentoring: { icon: Users, color: 'bg-green-100 text-green-700 border-green-300', label: 'Mentoring' },
  committee: { icon: Building2, color: 'bg-amber-100 text-amber-700 border-amber-300', label: 'Comité' },
  stretch: { icon: TrendingUp, color: 'bg-red-100 text-red-700 border-red-300', label: 'Stretch Assignment' },
};

export function HRInternalMarketplacePanel({ companyId }: { companyId: string }) {
  const [activeTab, setActiveTab] = useState('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newOpp, setNewOpp] = useState({ title: '', description: '', type: 'project', department: '', duration: '', time_commitment: '', spots: 1, deadline: '', skills_required: '', skills_developed: '', posted_by: '' });

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_opportunities')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOpportunities(data as Opportunity[]);
      }
    } catch (err) {
      console.error('Error fetching opportunities:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchOpportunities(); }, [fetchOpportunities]);

  const handleCreate = async () => {
    try {
      const { error } = await supabase.from('erp_hr_opportunities').insert({
        company_id: companyId,
        title: newOpp.title,
        description: newOpp.description || null,
        type: newOpp.type,
        department: newOpp.department || null,
        duration: newOpp.duration || null,
        time_commitment: newOpp.time_commitment || null,
        spots: newOpp.spots,
        deadline: newOpp.deadline || null,
        skills_required: newOpp.skills_required ? newOpp.skills_required.split(',').map(s => s.trim()) : [],
        skills_developed: newOpp.skills_developed ? newOpp.skills_developed.split(',').map(s => s.trim()) : [],
        posted_by: newOpp.posted_by || null,
      } as any);

      if (error) throw error;
      toast.success('Oportunidad creada');
      setShowCreateDialog(false);
      setNewOpp({ title: '', description: '', type: 'project', department: '', duration: '', time_commitment: '', spots: 1, deadline: '', skills_required: '', skills_developed: '', posted_by: '' });
      fetchOpportunities();
    } catch (err) {
      toast.error('Error al crear oportunidad');
    }
  };

  const filteredOpportunities = opportunities
    .filter(opp => (typeFilter === 'all' || opp.type === typeFilter) && (opp.title.toLowerCase().includes(searchQuery.toLowerCase()) || (opp.description || '').toLowerCase().includes(searchQuery.toLowerCase())))
    .sort((a, b) => {
      if (sortBy === 'deadline' && a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      return 0;
    });

  const renderOpportunityCard = (opp: Opportunity) => {
    const config = opportunityTypeConfig[opp.type] || opportunityTypeConfig.project;
    const TypeIcon = config.icon;
    return (
      <Card key={opp.id} className="group hover:shadow-lg transition-all">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3">
              <div className={cn("p-2 rounded-lg", config.color.split(' ')[0])}>
                <TypeIcon className="h-5 w-5" />
              </div>
              <div>
                <Badge variant="outline" className={cn("text-xs mb-1", config.color)}>{config.label}</Badge>
                <h3 className="font-semibold group-hover:text-primary transition-colors">{opp.title}</h3>
              </div>
            </div>
          </div>
          {opp.description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{opp.description}</p>}
          <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
            {opp.duration && <div className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" />{opp.duration}</div>}
            {opp.time_commitment && <div className="flex items-center gap-1 text-muted-foreground"><Target className="h-3 w-3" />{opp.time_commitment}</div>}
            {opp.department && <div className="flex items-center gap-1 text-muted-foreground"><Building2 className="h-3 w-3" />{opp.department}</div>}
          </div>
          {opp.skills_required && opp.skills_required.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-1">Requisitos:</p>
              <div className="flex flex-wrap gap-1">
                {opp.skills_required.slice(0, 4).map((skill, i) => <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>)}
              </div>
            </div>
          )}
          {opp.skills_developed && opp.skills_developed.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-1">Desarrollarás:</p>
              <div className="flex flex-wrap gap-1">
                {opp.skills_developed.slice(0, 3).map((skill, i) => <Badge key={i} variant="secondary" className="text-xs bg-green-50 text-green-700"><TrendingUp className="h-2 w-2 mr-1" />{skill}</Badge>)}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{opp.applicants} aplicantes • {opp.spots} plaza{opp.spots > 1 ? 's' : ''}</span>
            {opp.deadline && (
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Cierra: {new Date(opp.deadline).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-amber-500" />Marketplace de Oportunidades
          </h2>
          <p className="text-muted-foreground">Descubre proyectos, rotaciones y oportunidades de desarrollo interno</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4 mr-2" />Publicar Oportunidad</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(opportunityTypeConfig).map(([type, config]) => {
          const count = opportunities.filter(o => o.type === type).length;
          const Icon = config.icon;
          return (
            <Card key={type} className={cn("p-3 cursor-pointer hover:shadow-md transition-shadow", typeFilter === type && "ring-2 ring-primary")} onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}>
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", config.color.split(' ')[0])}><Icon className="h-4 w-4" /></div>
                <div><p className="text-xl font-bold">{count}</p><p className="text-xs text-muted-foreground">{config.label}</p></div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar oportunidades..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(opportunityTypeConfig).map(([key, config]) => <SelectItem key={key} value={key}>{config.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card className="p-8 text-center"><p className="text-muted-foreground">Cargando oportunidades...</p></Card>
      ) : filteredOpportunities.length === 0 ? (
        <Card className="p-8 text-center">
          <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="font-semibold mb-2">No hay oportunidades</h3>
          <p className="text-sm text-muted-foreground">Publica una nueva oportunidad o genera datos demo</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredOpportunities.map(renderOpportunityCard)}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Publicar Oportunidad</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título *</Label><Input value={newOpp.title} onChange={e => setNewOpp(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Descripción</Label><Textarea value={newOpp.description} onChange={e => setNewOpp(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Tipo</Label>
                <Select value={newOpp.type} onValueChange={v => setNewOpp(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(opportunityTypeConfig).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Departamento</Label><Input value={newOpp.department} onChange={e => setNewOpp(p => ({ ...p, department: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Duración</Label><Input placeholder="6 meses" value={newOpp.duration} onChange={e => setNewOpp(p => ({ ...p, duration: e.target.value }))} /></div>
              <div><Label>Dedicación</Label><Input placeholder="30%" value={newOpp.time_commitment} onChange={e => setNewOpp(p => ({ ...p, time_commitment: e.target.value }))} /></div>
              <div><Label>Plazas</Label><Input type="number" value={newOpp.spots} onChange={e => setNewOpp(p => ({ ...p, spots: parseInt(e.target.value) || 1 }))} /></div>
            </div>
            <div><Label>Fecha límite</Label><Input type="date" value={newOpp.deadline} onChange={e => setNewOpp(p => ({ ...p, deadline: e.target.value }))} /></div>
            <div><Label>Skills requeridas (separadas por coma)</Label><Input value={newOpp.skills_required} onChange={e => setNewOpp(p => ({ ...p, skills_required: e.target.value }))} /></div>
            <div><Label>Skills a desarrollar (separadas por coma)</Label><Input value={newOpp.skills_developed} onChange={e => setNewOpp(p => ({ ...p, skills_developed: e.target.value }))} /></div>
            <div><Label>Publicado por</Label><Input value={newOpp.posted_by} onChange={e => setNewOpp(p => ({ ...p, posted_by: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newOpp.title}>Publicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default HRInternalMarketplacePanel;
