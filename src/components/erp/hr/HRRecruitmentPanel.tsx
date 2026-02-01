/**
 * HRRecruitmentPanel - Panel de Reclutamiento Inteligente
 * Sistema completo de gestión de ofertas y candidatos
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Briefcase, 
  Users, 
  UserPlus, 
  Search, 
  Filter,
  Plus,
  Eye,
  Mail,
  Calendar,
  Brain,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  FileText,
  Sparkles,
  RefreshCw,
  MoreHorizontal,
  Building2,
  MapPin,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useERPContext } from '@/contexts/ERPContext';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface JobOpening {
  id: string;
  company_id: string;
  position_id: string | null;
  title: string;
  description: string | null;
  requirements: unknown[];
  nice_to_have: unknown[];
  salary_range_min: number | null;
  salary_range_max: number | null;
  employment_type: string;
  location: string | null;
  remote_option: string;
  status: string;
  auto_screen_cvs: boolean;
  max_candidates_to_interview: number;
  interview_mode: string;
  published_at: string | null;
  closes_at: string | null;
  created_at: string;
  candidates_count?: number;
}

interface Candidate {
  id: string;
  company_id: string;
  job_opening_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  cv_file_url: string | null;
  cv_parsed_data: Record<string, unknown>;
  ai_analysis: Record<string, unknown>;
  ai_recommendation: string | null;
  ai_score: number | null;
  status: string;
  source: string;
  created_at: string;
  job_opening?: JobOpening;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  published: 'bg-success/10 text-success',
  paused: 'bg-warning/10 text-warning',
  closed: 'bg-destructive/10 text-destructive',
  new: 'bg-primary/10 text-primary',
  screening: 'bg-info/10 text-info',
  shortlisted: 'bg-accent/10 text-accent-foreground',
  interviewing: 'bg-warning/10 text-warning',
  offer: 'bg-success/10 text-success',
  hired: 'bg-success text-success-foreground',
  rejected: 'bg-destructive/10 text-destructive',
  withdrawn: 'bg-muted text-muted-foreground',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  published: 'Publicada',
  paused: 'Pausada',
  closed: 'Cerrada',
  new: 'Nuevo',
  screening: 'Cribando',
  shortlisted: 'Preseleccionado',
  interviewing: 'Entrevistando',
  offer: 'Oferta',
  hired: 'Contratado',
  rejected: 'Rechazado',
  withdrawn: 'Retirado',
};

export function HRRecruitmentPanel({ companyId }: { companyId?: string }) {
  const activeCompanyId = companyId;
  const [activeTab, setActiveTab] = useState('openings');
  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialog states
  const [showNewOpeningDialog, setShowNewOpeningDialog] = useState(false);
  const [showNewCandidateDialog, setShowNewCandidateDialog] = useState(false);
  const [selectedOpening, setSelectedOpening] = useState<JobOpening | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  
  // Form states
  const [newOpening, setNewOpening] = useState({
    title: '',
    description: '',
    employment_type: 'full_time',
    location: '',
    remote_option: 'no',
    salary_range_min: '',
    salary_range_max: '',
    interview_mode: 'hybrid'
  });
  
  const [newCandidate, setNewCandidate] = useState({
    job_opening_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    source: 'portal'
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!activeCompanyId) return;
    
    setLoading(true);
    try {
      // Fetch job openings
      const { data: openingsData, error: openingsError } = await supabase
        .from('erp_hr_job_openings')
        .select('*')
        .eq('company_id', activeCompanyId)
        .order('created_at', { ascending: false });

      if (openingsError) throw openingsError;
      
      // Fetch candidates
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('erp_hr_candidates')
        .select('*, job_opening:erp_hr_job_openings(title)')
        .eq('company_id', activeCompanyId)
        .order('created_at', { ascending: false });

      if (candidatesError) throw candidatesError;

      // Count candidates per opening
      const openingsWithCounts = (openingsData || []).map(opening => ({
        ...opening,
        requirements: (opening.requirements || []) as unknown[],
        nice_to_have: (opening.nice_to_have || []) as unknown[],
        candidates_count: (candidatesData || []).filter(c => c.job_opening_id === opening.id).length
      }));

      setJobOpenings(openingsWithCounts as JobOpening[]);
      setCandidates((candidatesData || []).map(c => ({
        ...c,
        cv_parsed_data: (c.cv_parsed_data || {}) as Record<string, unknown>,
        ai_analysis: (c.ai_analysis || {}) as Record<string, unknown>
      })) as Candidate[]);
    } catch (error) {
      console.error('Error fetching recruitment data:', error);
      toast.error('Error al cargar datos de reclutamiento');
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create job opening
  const handleCreateOpening = async () => {
    if (!activeCompanyId || !newOpening.title) {
      toast.error('El título es obligatorio');
      return;
    }

    try {
      const { error } = await supabase
        .from('erp_hr_job_openings')
        .insert({
          company_id: activeCompanyId,
          title: newOpening.title,
          description: newOpening.description || null,
          employment_type: newOpening.employment_type,
          location: newOpening.location || null,
          remote_option: newOpening.remote_option,
          salary_range_min: newOpening.salary_range_min ? parseFloat(newOpening.salary_range_min) : null,
          salary_range_max: newOpening.salary_range_max ? parseFloat(newOpening.salary_range_max) : null,
          interview_mode: newOpening.interview_mode,
          status: 'draft'
        });

      if (error) throw error;

      toast.success('Oferta creada correctamente');
      setShowNewOpeningDialog(false);
      setNewOpening({
        title: '',
        description: '',
        employment_type: 'full_time',
        location: '',
        remote_option: 'no',
        salary_range_min: '',
        salary_range_max: '',
        interview_mode: 'hybrid'
      });
      fetchData();
    } catch (error) {
      console.error('Error creating opening:', error);
      toast.error('Error al crear oferta');
    }
  };

  // Create candidate
  const handleCreateCandidate = async () => {
    if (!activeCompanyId || !newCandidate.first_name || !newCandidate.last_name || !newCandidate.email || !newCandidate.job_opening_id) {
      toast.error('Nombre, apellido, email y oferta son obligatorios');
      return;
    }

    try {
      const { error } = await supabase
        .from('erp_hr_candidates')
        .insert({
          company_id: activeCompanyId,
          job_opening_id: newCandidate.job_opening_id,
          first_name: newCandidate.first_name,
          last_name: newCandidate.last_name,
          email: newCandidate.email,
          phone: newCandidate.phone || null,
          source: newCandidate.source,
          status: 'new'
        });

      if (error) throw error;

      toast.success('Candidato añadido correctamente');
      setShowNewCandidateDialog(false);
      setNewCandidate({
        job_opening_id: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        source: 'portal'
      });
      fetchData();
    } catch (error) {
      console.error('Error creating candidate:', error);
      toast.error('Error al añadir candidato');
    }
  };

  // Update opening status
  const handleUpdateOpeningStatus = async (openingId: string, newStatus: string) => {
    try {
      const updates: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'published') {
        updates.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('erp_hr_job_openings')
        .update(updates)
        .eq('id', openingId);

      if (error) throw error;
      toast.success(`Oferta ${STATUS_LABELS[newStatus]?.toLowerCase()}`);
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error al actualizar estado');
    }
  };

  // Analyze candidate with AI
  const handleAnalyzeCandidate = async (candidate: Candidate) => {
    try {
      toast.info('Analizando candidato con IA...');
      
      const { data, error } = await supabase.functions.invoke('erp-hr-recruitment-agent', {
        body: {
          action: 'analyze_candidate',
          companyId: activeCompanyId,
          candidateId: candidate.id,
          candidateData: {
            ...candidate,
            cv_parsed_data: candidate.cv_parsed_data
          },
          positionData: candidate.job_opening
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Análisis completado');
        fetchData();
      } else {
        throw new Error(data?.error || 'Error en análisis');
      }
    } catch (error) {
      console.error('Error analyzing candidate:', error);
      toast.error('Error al analizar candidato');
    }
  };

  // Filter data
  const filteredOpenings = jobOpenings.filter(opening => {
    const matchesSearch = opening.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         opening.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || opening.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredCandidates = candidates.filter(candidate => {
    const fullName = `${candidate.first_name} ${candidate.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
                         candidate.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || candidate.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    activeOpenings: jobOpenings.filter(o => o.status === 'published').length,
    totalCandidates: candidates.length,
    inProcess: candidates.filter(c => ['screening', 'shortlisted', 'interviewing', 'offer'].includes(c.status)).length,
    hired: candidates.filter(c => c.status === 'hired').length,
  };

  if (!activeCompanyId) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">Selecciona una empresa para gestionar reclutamiento</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeOpenings}</p>
                <p className="text-xs text-muted-foreground">Ofertas Activas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-info/10 to-info/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/20">
                <Users className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalCandidates}</p>
                <p className="text-xs text-muted-foreground">Candidatos Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProcess}</p>
                <p className="text-xs text-muted-foreground">En Proceso</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.hired}</p>
                <p className="text-xs text-muted-foreground">Contratados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Reclutamiento Inteligente
              </CardTitle>
              <CardDescription>Gestión de ofertas y candidatos con IA</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              <Button onClick={() => setShowNewOpeningDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Oferta
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="openings" className="gap-2">
                  <Briefcase className="h-4 w-4" />
                  Ofertas ({jobOpenings.length})
                </TabsTrigger>
                <TabsTrigger value="candidates" className="gap-2">
                  <Users className="h-4 w-4" />
                  Candidatos ({candidates.length})
                </TabsTrigger>
                <TabsTrigger value="pipeline" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Pipeline
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-[200px]"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {activeTab === 'openings' ? (
                      <>
                        <SelectItem value="draft">Borrador</SelectItem>
                        <SelectItem value="published">Publicada</SelectItem>
                        <SelectItem value="paused">Pausada</SelectItem>
                        <SelectItem value="closed">Cerrada</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="new">Nuevo</SelectItem>
                        <SelectItem value="screening">Cribando</SelectItem>
                        <SelectItem value="shortlisted">Preseleccionado</SelectItem>
                        <SelectItem value="interviewing">Entrevistando</SelectItem>
                        <SelectItem value="offer">Oferta</SelectItem>
                        <SelectItem value="hired">Contratado</SelectItem>
                        <SelectItem value="rejected">Rechazado</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Openings Tab */}
            <TabsContent value="openings" className="mt-0">
              <ScrollArea className="h-[500px]">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredOpenings.length === 0 ? (
                  <div className="text-center py-10">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No hay ofertas de trabajo</p>
                    <Button className="mt-4" onClick={() => setShowNewOpeningDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Primera Oferta
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredOpenings.map((opening) => (
                      <Card key={opening.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{opening.title}</h4>
                                <Badge className={STATUS_COLORS[opening.status]}>
                                  {STATUS_LABELS[opening.status]}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {opening.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {opening.location}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {opening.candidates_count || 0} candidatos
                                </span>
                                {opening.salary_range_min && opening.salary_range_max && (
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    {opening.salary_range_min.toLocaleString()}€ - {opening.salary_range_max.toLocaleString()}€
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                Creada {formatDistanceToNow(new Date(opening.created_at), { locale: es, addSuffix: true })}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedOpening(opening)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Detalles
                                </DropdownMenuItem>
                                {opening.status === 'draft' && (
                                  <DropdownMenuItem onClick={() => handleUpdateOpeningStatus(opening.id, 'published')}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Publicar
                                  </DropdownMenuItem>
                                )}
                                {opening.status === 'published' && (
                                  <DropdownMenuItem onClick={() => handleUpdateOpeningStatus(opening.id, 'paused')}>
                                    <Clock className="h-4 w-4 mr-2" />
                                    Pausar
                                  </DropdownMenuItem>
                                )}
                                {opening.status === 'paused' && (
                                  <DropdownMenuItem onClick={() => handleUpdateOpeningStatus(opening.id, 'published')}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Reactivar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleUpdateOpeningStatus(opening.id, 'closed')}>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cerrar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Candidates Tab */}
            <TabsContent value="candidates" className="mt-0">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setShowNewCandidateDialog(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Añadir Candidato
                </Button>
              </div>
              <ScrollArea className="h-[450px]">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="text-center py-10">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No hay candidatos</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredCandidates.map((candidate) => (
                      <Card key={candidate.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">
                                  {candidate.first_name} {candidate.last_name}
                                </h4>
                                <Badge className={STATUS_COLORS[candidate.status]}>
                                  {STATUS_LABELS[candidate.status]}
                                </Badge>
                                {candidate.ai_score && (
                                  <Badge variant="outline" className="gap-1">
                                    <Brain className="h-3 w-3" />
                                    {candidate.ai_score}%
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{candidate.email}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Briefcase className="h-3 w-3" />
                                  {(candidate.job_opening as { title?: string })?.title || 'Sin oferta'}
                                </span>
                                <span>Fuente: {candidate.source}</span>
                              </div>
                              {candidate.ai_recommendation && (
                                <div className="mt-2">
                                  <Badge 
                                    className={cn(
                                      candidate.ai_recommendation === 'hire' && 'bg-success/10 text-success',
                                      candidate.ai_recommendation === 'consider' && 'bg-warning/10 text-warning',
                                      candidate.ai_recommendation === 'reject' && 'bg-destructive/10 text-destructive'
                                    )}
                                  >
                                    IA: {candidate.ai_recommendation === 'hire' ? 'Contratar' : 
                                         candidate.ai_recommendation === 'consider' ? 'Considerar' : 'Rechazar'}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleAnalyzeCandidate(candidate)}
                                title="Analizar con IA"
                              >
                                <Brain className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setSelectedCandidate(candidate)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver Perfil
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Enviar Email
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Agendar Entrevista
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Ver CV
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Pipeline Tab */}
            <TabsContent value="pipeline" className="mt-0">
              <div className="grid grid-cols-6 gap-4">
                {['new', 'screening', 'shortlisted', 'interviewing', 'offer', 'hired'].map((status) => {
                  const statusCandidates = candidates.filter(c => c.status === status);
                  return (
                    <Card key={status} className="min-h-[400px]">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span>{STATUS_LABELS[status]}</span>
                          <Badge variant="secondary">{statusCandidates.length}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-2">
                        <ScrollArea className="h-[350px]">
                          <div className="space-y-2">
                            {statusCandidates.map((candidate) => (
                              <Card 
                                key={candidate.id} 
                                className="cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => setSelectedCandidate(candidate)}
                              >
                                <CardContent className="p-3">
                                  <p className="font-medium text-sm truncate">
                                    {candidate.first_name} {candidate.last_name}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {(candidate.job_opening as { title?: string })?.title}
                                  </p>
                                  {candidate.ai_score && (
                                    <div className="mt-2">
                                      <Progress value={candidate.ai_score} className="h-1" />
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Score: {candidate.ai_score}%
                                      </p>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* New Opening Dialog */}
      <Dialog open={showNewOpeningDialog} onOpenChange={setShowNewOpeningDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Oferta de Trabajo</DialogTitle>
            <DialogDescription>Crea una nueva oferta para publicar</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={newOpening.title}
                onChange={(e) => setNewOpening({ ...newOpening, title: e.target.value })}
                placeholder="Ej: Desarrollador Senior"
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={newOpening.description}
                onChange={(e) => setNewOpening({ ...newOpening, description: e.target.value })}
                placeholder="Descripción del puesto..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Empleo</Label>
                <Select 
                  value={newOpening.employment_type}
                  onValueChange={(v) => setNewOpening({ ...newOpening, employment_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Tiempo Completo</SelectItem>
                    <SelectItem value="part_time">Tiempo Parcial</SelectItem>
                    <SelectItem value="contract">Contrato</SelectItem>
                    <SelectItem value="internship">Prácticas</SelectItem>
                    <SelectItem value="temporary">Temporal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Trabajo Remoto</Label>
                <Select 
                  value={newOpening.remote_option}
                  onValueChange={(v) => setNewOpening({ ...newOpening, remote_option: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">Presencial</SelectItem>
                    <SelectItem value="hybrid">Híbrido</SelectItem>
                    <SelectItem value="full">100% Remoto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Ubicación</Label>
              <Input
                value={newOpening.location}
                onChange={(e) => setNewOpening({ ...newOpening, location: e.target.value })}
                placeholder="Ej: Madrid, España"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Salario Mínimo (€)</Label>
                <Input
                  type="number"
                  value={newOpening.salary_range_min}
                  onChange={(e) => setNewOpening({ ...newOpening, salary_range_min: e.target.value })}
                  placeholder="30000"
                />
              </div>
              <div>
                <Label>Salario Máximo (€)</Label>
                <Input
                  type="number"
                  value={newOpening.salary_range_max}
                  onChange={(e) => setNewOpening({ ...newOpening, salary_range_max: e.target.value })}
                  placeholder="45000"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewOpeningDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateOpening}>
              Crear Oferta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Candidate Dialog */}
      <Dialog open={showNewCandidateDialog} onOpenChange={setShowNewCandidateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Añadir Candidato</DialogTitle>
            <DialogDescription>Añade un nuevo candidato manualmente</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Oferta de Trabajo *</Label>
              <Select 
                value={newCandidate.job_opening_id}
                onValueChange={(v) => setNewCandidate({ ...newCandidate, job_opening_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una oferta" />
                </SelectTrigger>
                <SelectContent>
                  {jobOpenings.filter(o => o.status === 'published').map((opening) => (
                    <SelectItem key={opening.id} value={opening.id}>
                      {opening.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={newCandidate.first_name}
                  onChange={(e) => setNewCandidate({ ...newCandidate, first_name: e.target.value })}
                  placeholder="Nombre"
                />
              </div>
              <div>
                <Label>Apellidos *</Label>
                <Input
                  value={newCandidate.last_name}
                  onChange={(e) => setNewCandidate({ ...newCandidate, last_name: e.target.value })}
                  placeholder="Apellidos"
                />
              </div>
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={newCandidate.email}
                onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                placeholder="email@ejemplo.com"
              />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input
                value={newCandidate.phone}
                onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })}
                placeholder="+34 600 000 000"
              />
            </div>
            <div>
              <Label>Fuente</Label>
              <Select 
                value={newCandidate.source}
                onValueChange={(v) => setNewCandidate({ ...newCandidate, source: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portal">Portal de Empleo</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="referral">Referido</SelectItem>
                  <SelectItem value="email">Email Directo</SelectItem>
                  <SelectItem value="agency">Agencia</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCandidateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCandidate}>
              Añadir Candidato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default HRRecruitmentPanel;
