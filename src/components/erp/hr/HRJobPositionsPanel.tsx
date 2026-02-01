/**
 * Panel de Puestos de Trabajo - HRJobPositionsPanel
 * Gestión de puestos con responsabilidades, obligaciones y competencias
 * Fase 1: Sistema Avanzado de Gestión de Talento
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Search,
  Plus,
  MoreHorizontal,
  Briefcase,
  Edit,
  Eye,
  Trash2,
  RefreshCw,
  Users,
  Target,
  FileCheck,
  Home,
  Building2,
  GraduationCap,
  Scale,
  TrendingUp,
  ChevronRight,
  Copy,
  Award,
  ListChecks,
  Shield,
  Laptop
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// === INTERFACES ===

interface Responsibility {
  id: string;
  description: string;
  weight: number;
  measurable: boolean;
  kpis: string[];
}

interface Obligation {
  id: string;
  description: string;
  type: 'legal' | 'contractual' | 'internal';
  mandatory: boolean;
}

interface Competencies {
  hard_skills: string[];
  soft_skills: string[];
}

interface EvaluationCriterion {
  id: string;
  name: string;
  type: 'numeric' | 'qualitative';
  weight: number;
  scale?: { min: number; max: number };
}

interface JobPosition {
  id: string;
  company_id: string;
  position_code: string;
  position_name: string;
  department_id: string | null;
  department_name?: string;
  reports_to_position_id: string | null;
  reports_to_position_name?: string;
  responsibilities: Responsibility[];
  obligations: Obligation[];
  required_competencies: Competencies;
  required_certifications: string[];
  salary_band_min: number | null;
  salary_band_max: number | null;
  salary_currency: string;
  allows_remote_work: boolean;
  remote_work_percentage: number;
  evaluation_criteria: EvaluationCriterion[];
  cnae_specific_requirements: Record<string, unknown>;
  job_level: string | null;
  employment_type: string;
  min_experience_years: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface HRJobPositionsPanelProps {
  companyId: string;
}

// === COMPONENT ===

export function HRJobPositionsPanel({ companyId }: HRJobPositionsPanelProps) {
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<JobPosition | null>(null);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);

  // === FORM STATE ===
  const [formData, setFormData] = useState({
    position_code: '',
    position_name: '',
    department_id: '',
    reports_to_position_id: '',
    job_level: 'mid',
    employment_type: 'full_time',
    min_experience_years: 0,
    salary_band_min: 0,
    salary_band_max: 0,
    allows_remote_work: false,
    remote_work_percentage: 0,
    required_certifications: [] as string[],
    responsibilities: [] as Responsibility[],
    obligations: [] as Obligation[],
    required_competencies: { hard_skills: [], soft_skills: [] } as Competencies,
    evaluation_criteria: [] as EvaluationCriterion[]
  });

  // === FETCH DATA ===
  const fetchPositions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_job_positions')
        .select(`
          *,
          department:erp_hr_departments(id, name),
          reports_to:erp_hr_job_positions!erp_hr_job_positions_reports_to_position_id_fkey(id, position_name)
        `)
        .eq('company_id', companyId)
        .order('position_name');

      if (error) throw error;

      const formatted = (data || []).map((pos: any) => ({
        ...pos,
        department_name: pos.department?.name || null,
        reports_to_position_name: pos.reports_to?.position_name || null,
        responsibilities: pos.responsibilities || [],
        obligations: pos.obligations || [],
        required_competencies: pos.required_competencies || { hard_skills: [], soft_skills: [] },
        evaluation_criteria: pos.evaluation_criteria || []
      }));

      setPositions(formatted);
    } catch (error) {
      console.error('Error fetching positions:', error);
      toast.error('Error al cargar puestos de trabajo');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const fetchDepartments = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('erp_hr_departments')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  }, [companyId]);

  useEffect(() => {
    fetchPositions();
    fetchDepartments();
  }, [fetchPositions, fetchDepartments]);

  // === FILTERS ===
  const filteredPositions = useMemo(() => {
    return positions.filter(pos => {
      if (levelFilter !== 'all' && pos.job_level !== levelFilter) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        pos.position_name.toLowerCase().includes(term) ||
        pos.position_code.toLowerCase().includes(term) ||
        pos.department_name?.toLowerCase().includes(term)
      );
    });
  }, [positions, searchTerm, levelFilter]);

  // === STATS ===
  const stats = useMemo(() => {
    const active = positions.filter(p => p.is_active).length;
    const withRemote = positions.filter(p => p.allows_remote_work).length;
    const totalResponsibilities = positions.reduce((sum, p) => sum + (p.responsibilities?.length || 0), 0);
    return { total: positions.length, active, withRemote, totalResponsibilities };
  }, [positions]);

  // === HANDLERS ===
  const handleCreatePosition = async () => {
    try {
      const { error } = await supabase
        .from('erp_hr_job_positions')
        .insert([{
          company_id: companyId,
          position_code: formData.position_code,
          position_name: formData.position_name,
          department_id: formData.department_id || null,
          reports_to_position_id: formData.reports_to_position_id || null,
          job_level: formData.job_level,
          employment_type: formData.employment_type,
          min_experience_years: formData.min_experience_years,
          salary_band_min: formData.salary_band_min || null,
          salary_band_max: formData.salary_band_max || null,
          allows_remote_work: formData.allows_remote_work,
          remote_work_percentage: formData.remote_work_percentage,
          required_certifications: formData.required_certifications,
          responsibilities: JSON.parse(JSON.stringify(formData.responsibilities)),
          obligations: JSON.parse(JSON.stringify(formData.obligations)),
          required_competencies: JSON.parse(JSON.stringify(formData.required_competencies)),
          evaluation_criteria: JSON.parse(JSON.stringify(formData.evaluation_criteria))
        }]);

      if (error) throw error;

      toast.success('Puesto de trabajo creado');
      setShowFormDialog(false);
      resetForm();
      fetchPositions();
    } catch (error) {
      console.error('Error creating position:', error);
      toast.error('Error al crear puesto de trabajo');
    }
  };

  const handleUpdatePosition = async () => {
    if (!selectedPosition) return;
    try {
      const { error } = await supabase
        .from('erp_hr_job_positions')
        .update({
          position_code: formData.position_code,
          position_name: formData.position_name,
          department_id: formData.department_id || null,
          reports_to_position_id: formData.reports_to_position_id || null,
          job_level: formData.job_level,
          employment_type: formData.employment_type,
          min_experience_years: formData.min_experience_years,
          salary_band_min: formData.salary_band_min || null,
          salary_band_max: formData.salary_band_max || null,
          allows_remote_work: formData.allows_remote_work,
          remote_work_percentage: formData.remote_work_percentage,
          required_certifications: formData.required_certifications,
          responsibilities: JSON.parse(JSON.stringify(formData.responsibilities)),
          obligations: JSON.parse(JSON.stringify(formData.obligations)),
          required_competencies: JSON.parse(JSON.stringify(formData.required_competencies)),
          evaluation_criteria: JSON.parse(JSON.stringify(formData.evaluation_criteria))
        })
        .eq('id', selectedPosition.id);

      if (error) throw error;

      toast.success('Puesto actualizado');
      setShowFormDialog(false);
      setSelectedPosition(null);
      resetForm();
      fetchPositions();
    } catch (error) {
      console.error('Error updating position:', error);
      toast.error('Error al actualizar puesto');
    }
  };

  const handleDeletePosition = async (id: string) => {
    if (!confirm('¿Eliminar este puesto de trabajo?')) return;
    try {
      const { error } = await supabase
        .from('erp_hr_job_positions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Puesto eliminado');
      fetchPositions();
    } catch (error) {
      console.error('Error deleting position:', error);
      toast.error('Error al eliminar puesto');
    }
  };

  const resetForm = () => {
    setFormData({
      position_code: '',
      position_name: '',
      department_id: '',
      reports_to_position_id: '',
      job_level: 'mid',
      employment_type: 'full_time',
      min_experience_years: 0,
      salary_band_min: 0,
      salary_band_max: 0,
      allows_remote_work: false,
      remote_work_percentage: 0,
      required_certifications: [],
      responsibilities: [],
      obligations: [],
      required_competencies: { hard_skills: [], soft_skills: [] },
      evaluation_criteria: []
    });
  };

  const openEditDialog = (position: JobPosition) => {
    setSelectedPosition(position);
    setFormData({
      position_code: position.position_code,
      position_name: position.position_name,
      department_id: position.department_id || '',
      reports_to_position_id: position.reports_to_position_id || '',
      job_level: position.job_level || 'mid',
      employment_type: position.employment_type || 'full_time',
      min_experience_years: position.min_experience_years || 0,
      salary_band_min: position.salary_band_min || 0,
      salary_band_max: position.salary_band_max || 0,
      allows_remote_work: position.allows_remote_work,
      remote_work_percentage: position.remote_work_percentage,
      required_certifications: position.required_certifications || [],
      responsibilities: position.responsibilities || [],
      obligations: position.obligations || [],
      required_competencies: position.required_competencies || { hard_skills: [], soft_skills: [] },
      evaluation_criteria: position.evaluation_criteria || []
    });
    setShowFormDialog(true);
  };

  // === RESPONSIBILITY MANAGEMENT ===
  const addResponsibility = () => {
    const newResp: Responsibility = {
      id: crypto.randomUUID(),
      description: '',
      weight: 10,
      measurable: false,
      kpis: []
    };
    setFormData(prev => ({
      ...prev,
      responsibilities: [...prev.responsibilities, newResp]
    }));
  };

  const updateResponsibility = (id: string, field: keyof Responsibility, value: any) => {
    setFormData(prev => ({
      ...prev,
      responsibilities: prev.responsibilities.map(r =>
        r.id === id ? { ...r, [field]: value } : r
      )
    }));
  };

  const removeResponsibility = (id: string) => {
    setFormData(prev => ({
      ...prev,
      responsibilities: prev.responsibilities.filter(r => r.id !== id)
    }));
  };

  // === OBLIGATION MANAGEMENT ===
  const addObligation = () => {
    const newObl: Obligation = {
      id: crypto.randomUUID(),
      description: '',
      type: 'internal',
      mandatory: false
    };
    setFormData(prev => ({
      ...prev,
      obligations: [...prev.obligations, newObl]
    }));
  };

  const updateObligation = (id: string, field: keyof Obligation, value: any) => {
    setFormData(prev => ({
      ...prev,
      obligations: prev.obligations.map(o =>
        o.id === id ? { ...o, [field]: value } : o
      )
    }));
  };

  const removeObligation = (id: string) => {
    setFormData(prev => ({
      ...prev,
      obligations: prev.obligations.filter(o => o.id !== id)
    }));
  };

  // === LEVEL LABELS ===
  const levelLabels: Record<string, string> = {
    entry: 'Entrada',
    junior: 'Junior',
    mid: 'Intermedio',
    senior: 'Senior',
    lead: 'Lead',
    manager: 'Manager',
    director: 'Director',
    executive: 'Ejecutivo'
  };

  const employmentLabels: Record<string, string> = {
    full_time: 'Tiempo Completo',
    part_time: 'Tiempo Parcial',
    contract: 'Contrato',
    temporary: 'Temporal',
    intern: 'Prácticas'
  };

  // === RENDER ===
  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total Puestos</p>
                <p className="text-lg font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-success" />
              <div>
                <p className="text-xs text-muted-foreground">Activos</p>
                <p className="text-lg font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Laptop className="h-4 w-4 text-accent-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Con Teletrabajo</p>
                <p className="text-lg font-bold">{stats.withRemote}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-warning" />
              <div>
                <p className="text-xs text-muted-foreground">Responsabilidades</p>
                <p className="text-lg font-bold">{stats.totalResponsibilities}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Catálogo de Puestos de Trabajo
              </CardTitle>
              <CardDescription>
                Gestión de responsabilidades, obligaciones y competencias por puesto
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar puesto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-[180px]"
                />
              </div>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los niveles</SelectItem>
                  {Object.entries(levelLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={fetchPositions}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={() => { resetForm(); setSelectedPosition(null); setShowFormDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" />
                Nuevo Puesto
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPositions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay puestos de trabajo registrados</p>
              <Button 
                variant="outline" 
                className="mt-3"
                onClick={() => { resetForm(); setShowFormDialog(true); }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Crear primer puesto
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Puesto</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Nivel</TableHead>
                    <TableHead className="text-center">Resp.</TableHead>
                    <TableHead className="text-center">Remoto</TableHead>
                    <TableHead className="text-right">Banda Salarial</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPositions.map((position) => (
                    <TableRow key={position.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-mono text-xs">{position.position_code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-primary/10">
                            <Briefcase className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{position.position_name}</p>
                            {position.reports_to_position_name && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <ChevronRight className="h-3 w-3" />
                                Reporta a: {position.reports_to_position_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {position.department_name ? (
                          <Badge variant="outline" className="text-xs">
                            {position.department_name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {levelLabels[position.job_level || 'mid']}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {position.responsibilities?.length || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {position.allows_remote_work ? (
                          <Badge className="bg-success/20 text-success border-0 text-xs">
                            <Laptop className="h-3 w-3 mr-1" />
                            {position.remote_work_percentage}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {position.salary_band_min && position.salary_band_max ? (
                          <span className="font-mono">
                            €{(position.salary_band_min / 1000).toFixed(0)}k - €{(position.salary_band_max / 1000).toFixed(0)}k
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedPosition(position); setShowDetailDialog(true); }}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(position)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeletePosition(position.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPosition ? 'Editar Puesto de Trabajo' : 'Nuevo Puesto de Trabajo'}
            </DialogTitle>
            <DialogDescription>
              Define las responsabilidades, obligaciones y requisitos del puesto
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código del Puesto *</Label>
                <Input
                  placeholder="ej: DEV-001"
                  value={formData.position_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, position_code: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre del Puesto *</Label>
                <Input
                  placeholder="ej: Desarrollador Senior"
                  value={formData.position_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, position_name: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select 
                  value={formData.department_id} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, department_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reporta a</Label>
                <Select 
                  value={formData.reports_to_position_id} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, reports_to_position_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar superior" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.filter(p => p.id !== selectedPosition?.id).map(pos => (
                      <SelectItem key={pos.id} value={pos.id}>{pos.position_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nivel</Label>
                <Select 
                  value={formData.job_level} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, job_level: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(levelLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Empleo</Label>
                <Select 
                  value={formData.employment_type} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, employment_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(employmentLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Experiencia Mínima (años)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.min_experience_years}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_experience_years: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            {/* Salary Band */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Salario Mínimo (€/año)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.salary_band_min}
                  onChange={(e) => setFormData(prev => ({ ...prev, salary_band_min: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Salario Máximo (€/año)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.salary_band_max}
                  onChange={(e) => setFormData(prev => ({ ...prev, salary_band_max: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            {/* Remote Work */}
            <div className="flex items-center gap-4 p-3 rounded-lg border">
              <Checkbox
                id="allows_remote"
                checked={formData.allows_remote_work}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  allows_remote_work: !!checked,
                  remote_work_percentage: checked ? prev.remote_work_percentage || 50 : 0
                }))}
              />
              <Label htmlFor="allows_remote" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Laptop className="h-4 w-4" />
                  Permite Teletrabajo
                </div>
              </Label>
              {formData.allows_remote_work && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="w-20"
                    value={formData.remote_work_percentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, remote_work_percentage: parseInt(e.target.value) || 0 }))}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              )}
            </div>

            {/* Responsibilities */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="responsibilities">
                <AccordionTrigger className="text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Responsabilidades ({formData.responsibilities.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  {formData.responsibilities.map((resp, idx) => (
                    <div key={resp.id} className="flex gap-2 items-start p-3 rounded-lg border bg-muted/30">
                      <div className="flex-1 space-y-2">
                        <Textarea
                          placeholder="Descripción de la responsabilidad..."
                          value={resp.description}
                          onChange={(e) => updateResponsibility(resp.id, 'description', e.target.value)}
                          className="min-h-[60px]"
                        />
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Peso:</Label>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              className="w-16 h-7 text-xs"
                              value={resp.weight}
                              onChange={(e) => updateResponsibility(resp.id, 'weight', parseInt(e.target.value) || 0)}
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`measurable-${resp.id}`}
                              checked={resp.measurable}
                              onCheckedChange={(checked) => updateResponsibility(resp.id, 'measurable', !!checked)}
                            />
                            <Label htmlFor={`measurable-${resp.id}`} className="text-xs cursor-pointer">
                              Medible
                            </Label>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeResponsibility(resp.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addResponsibility}>
                    <Plus className="h-4 w-4 mr-1" />
                    Añadir Responsabilidad
                  </Button>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="obligations">
                <AccordionTrigger className="text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Obligaciones ({formData.obligations.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  {formData.obligations.map((obl) => (
                    <div key={obl.id} className="flex gap-2 items-start p-3 rounded-lg border bg-muted/30">
                      <div className="flex-1 space-y-2">
                        <Textarea
                          placeholder="Descripción de la obligación..."
                          value={obl.description}
                          onChange={(e) => updateObligation(obl.id, 'description', e.target.value)}
                          className="min-h-[60px]"
                        />
                        <div className="flex gap-4">
                          <Select
                            value={obl.type}
                            onValueChange={(v) => updateObligation(obl.id, 'type', v)}
                          >
                            <SelectTrigger className="w-[140px] h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="legal">Legal</SelectItem>
                              <SelectItem value="contractual">Contractual</SelectItem>
                              <SelectItem value="internal">Interna</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`mandatory-${obl.id}`}
                              checked={obl.mandatory}
                              onCheckedChange={(checked) => updateObligation(obl.id, 'mandatory', !!checked)}
                            />
                            <Label htmlFor={`mandatory-${obl.id}`} className="text-xs cursor-pointer">
                              Obligatoria
                            </Label>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeObligation(obl.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addObligation}>
                    <Plus className="h-4 w-4 mr-1" />
                    Añadir Obligación
                  </Button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={selectedPosition ? handleUpdatePosition : handleCreatePosition}>
              {selectedPosition ? 'Actualizar' : 'Crear'} Puesto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              {selectedPosition?.position_name}
            </DialogTitle>
            <DialogDescription>
              Código: {selectedPosition?.position_code}
            </DialogDescription>
          </DialogHeader>

          {selectedPosition && (
            <div className="space-y-4 py-4">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground">Departamento</p>
                  <p className="font-medium">{selectedPosition.department_name || '—'}</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground">Nivel</p>
                  <Badge variant="secondary">{levelLabels[selectedPosition.job_level || 'mid']}</Badge>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground">Banda Salarial</p>
                  <p className="font-medium font-mono">
                    {selectedPosition.salary_band_min && selectedPosition.salary_band_max
                      ? `€${selectedPosition.salary_band_min.toLocaleString()} - €${selectedPosition.salary_band_max.toLocaleString()}`
                      : '—'}
                  </p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground">Teletrabajo</p>
                  {selectedPosition.allows_remote_work ? (
                    <Badge className="bg-success/20 text-success border-0">
                      Sí ({selectedPosition.remote_work_percentage}%)
                    </Badge>
                  ) : (
                    <p className="font-medium">No permitido</p>
                  )}
                </div>
              </div>

              {/* Responsibilities */}
              {selectedPosition.responsibilities?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Responsabilidades
                  </h4>
                  <div className="space-y-2">
                    {selectedPosition.responsibilities.map((resp, idx) => (
                      <div key={resp.id || idx} className="p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm">{resp.description}</p>
                          <Badge variant="outline" className="shrink-0">
                            {resp.weight}%
                          </Badge>
                        </div>
                        {resp.measurable && (
                          <Badge className="mt-2 text-xs" variant="secondary">
                            <Target className="h-3 w-3 mr-1" />
                            Medible
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Obligations */}
              {selectedPosition.obligations?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Obligaciones
                  </h4>
                  <div className="space-y-2">
                    {selectedPosition.obligations.map((obl, idx) => (
                      <div key={obl.id || idx} className="p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm">{obl.description}</p>
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-xs capitalize">
                              {obl.type}
                            </Badge>
                            {obl.mandatory && (
                              <Badge variant="destructive" className="text-xs">
                                Obligatoria
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Competencies */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Competencias Requeridas
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-2">Hard Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedPosition.required_competencies?.hard_skills?.length > 0 ? (
                        selectedPosition.required_competencies.hard_skills.map((skill, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">{skill}</Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No definidas</span>
                      )}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-2">Soft Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedPosition.required_competencies?.soft_skills?.length > 0 ? (
                        selectedPosition.required_competencies.soft_skills.map((skill, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">{skill}</Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No definidas</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Cerrar
            </Button>
            <Button onClick={() => {
              setShowDetailDialog(false);
              if (selectedPosition) openEditDialog(selectedPosition);
            }}>
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default HRJobPositionsPanel;
