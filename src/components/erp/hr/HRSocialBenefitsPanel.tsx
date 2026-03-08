/**
 * HRSocialBenefitsPanel - Gestión de Prestaciones Sociales
 * Seguro médico, guardería, gym, tickets, etc.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Heart, Baby, Utensils, Car, Dumbbell, 
  PiggyBank, GraduationCap, Home, Sparkles,
  Dog, Leaf, Brain, Plus, Search, RefreshCw,
  Users, Euro, TrendingUp, Gift, Settings,
  CheckCircle, Clock, XCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HRBenefitEnrollmentDialog } from './HRBenefitEnrollmentDialog';
import { HRBenefitFormDialog } from './dialogs/HRBenefitFormDialog';

interface HRSocialBenefitsPanelProps {
  companyId: string;
}

interface Benefit {
  id: string;
  benefit_code: string;
  benefit_name: string;
  benefit_type: string;
  provider_name: string | null;
  monthly_cost_company: number;
  monthly_cost_employee: number;
  is_taxable: boolean;
  tax_percentage: number;
  is_flex_benefit: boolean;
  flex_points_cost: number | null;
  is_active: boolean;
  description: string | null;
  max_beneficiaries: number;
}

interface EmployeeBenefit {
  id: string;
  enrollment_date: string;
  status: string;
  employee_contribution: number;
  company_contribution: number;
  coverage_level: string;
  benefit?: Benefit;
  employee?: {
    first_name: string;
    last_name: string;
  };
}

const BENEFIT_ICONS: Record<string, React.ReactNode> = {
  health_insurance: <Heart className="h-5 w-5 text-rose-500" />,
  life_insurance: <Heart className="h-5 w-5 text-purple-500" />,
  dental_insurance: <Sparkles className="h-5 w-5 text-sky-500" />,
  childcare: <Baby className="h-5 w-5 text-pink-500" />,
  meal_vouchers: <Utensils className="h-5 w-5 text-amber-500" />,
  transport: <Car className="h-5 w-5 text-blue-500" />,
  gym: <Dumbbell className="h-5 w-5 text-emerald-500" />,
  pension: <PiggyBank className="h-5 w-5 text-yellow-500" />,
  education: <GraduationCap className="h-5 w-5 text-indigo-500" />,
  remote_work_allowance: <Home className="h-5 w-5 text-teal-500" />,
  wellness: <Leaf className="h-5 w-5 text-green-500" />,
  stock_options: <TrendingUp className="h-5 w-5 text-violet-500" />,
  pet_insurance: <Dog className="h-5 w-5 text-orange-500" />,
  mental_health: <Brain className="h-5 w-5 text-cyan-500" />,
  telemedicine: <Heart className="h-5 w-5 text-red-500" />,
  coworking: <Home className="h-5 w-5 text-slate-500" />,
  other: <Gift className="h-5 w-5 text-gray-500" />,
};

const BENEFIT_TYPE_LABELS: Record<string, string> = {
  health_insurance: 'Seguro Médico',
  life_insurance: 'Seguro de Vida',
  dental_insurance: 'Seguro Dental',
  childcare: 'Guardería',
  meal_vouchers: 'Tickets Restaurante',
  transport: 'Transporte',
  gym: 'Gimnasio',
  pension: 'Plan de Pensiones',
  education: 'Formación',
  remote_work_allowance: 'Teletrabajo',
  wellness: 'Bienestar',
  stock_options: 'Stock Options',
  pet_insurance: 'Seguro Mascotas',
  mental_health: 'Salud Mental',
  telemedicine: 'Telemedicina',
  coworking: 'Coworking',
  sabbatical: 'Año Sabático',
  other: 'Otros',
};

export function HRSocialBenefitsPanel({ companyId }: HRSocialBenefitsPanelProps) {
  const [activeTab, setActiveTab] = useState('catalog');
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [enrollments, setEnrollments] = useState<EmployeeBenefit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [showBenefitFormDialog, setShowBenefitFormDialog] = useState(false);
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);

  const fetchBenefits = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_hr_social_benefits')
        .select('*')
        .eq('company_id', companyId)
        .order('benefit_name');

      if (error) throw error;
      setBenefits((data || []) as unknown as Benefit[]);
    } catch (err) {
      console.error('Error fetching benefits:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const fetchEnrollments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('erp_hr_employee_benefits')
        .select('*, erp_hr_social_benefits(*), erp_hr_employees(first_name, last_name)')
        .order('enrollment_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEnrollments((data || []).map((e: any) => ({
        ...e,
        benefit: e.erp_hr_social_benefits,
        employee: e.erp_hr_employees,
      })));
    } catch (err) {
      console.error('Error fetching enrollments:', err);
    }
  }, []);

  useEffect(() => {
    fetchBenefits();
    fetchEnrollments();
  }, [fetchBenefits, fetchEnrollments]);

  const handleEnrollSuccess = () => {
    fetchEnrollments();
    setShowEnrollDialog(false);
    setSelectedBenefit(null);
  };

  // Stats
  const totalBenefits = benefits.length;
  const activeBenefits = benefits.filter(b => b.is_active).length;
  const totalEnrollments = enrollments.filter(e => e.status === 'active').length;
  const totalCostCompany = enrollments
    .filter(e => e.status === 'active')
    .reduce((acc, e) => acc + (e.company_contribution || 0), 0);

  const filteredBenefits = benefits.filter(b =>
    b.benefit_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.benefit_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/10 text-emerald-600"><CheckCircle className="h-3 w-3 mr-1" />Activo</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/10 text-amber-600"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case 'cancelled':
        return <Badge className="bg-destructive/10 text-destructive"><XCircle className="h-3 w-3 mr-1" />Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Beneficios</p>
                <p className="text-xl font-bold">{activeBenefits}/{totalBenefits}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Users className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Inscripciones</p>
                <p className="text-xl font-bold">{totalEnrollments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Euro className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Coste Mensual</p>
                <p className="text-xl font-bold">€{totalCostCompany.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <Sparkles className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Flex Benefits</p>
                <p className="text-xl font-bold">{benefits.filter(b => b.is_flex_benefit).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="catalog" className="gap-1">
            <Gift className="h-4 w-4" />
            Catálogo
          </TabsTrigger>
          <TabsTrigger value="enrollments" className="gap-1">
            <Users className="h-4 w-4" />
            Inscripciones
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1">
            <TrendingUp className="h-4 w-4" />
            Análisis
          </TabsTrigger>
        </TabsList>

        {/* Catálogo */}
        <TabsContent value="catalog" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Catálogo de Beneficios</CardTitle>
                  <CardDescription>Prestaciones sociales disponibles</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={fetchBenefits} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                  <Button size="sm" onClick={() => setShowBenefitFormDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Nuevo Beneficio
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar beneficio..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {filteredBenefits.length === 0 ? (
                <div className="text-center py-12">
                  <Gift className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No hay beneficios configurados</p>
                  <Button className="mt-4" size="sm" onClick={() => setShowBenefitFormDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Crear Primer Beneficio
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredBenefits.map((benefit) => (
                    <Card key={benefit.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            {BENEFIT_ICONS[benefit.benefit_type] || <Gift className="h-5 w-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{benefit.benefit_name}</h4>
                              {benefit.is_flex_benefit && (
                                <Badge variant="outline" className="text-xs">Flex</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {BENEFIT_TYPE_LABELS[benefit.benefit_type] || benefit.benefit_type}
                            </p>
                            <div className="flex items-center gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Empresa:</span>
                                <span className="ml-1 font-medium">€{benefit.monthly_cost_company}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Empleado:</span>
                                <span className="ml-1 font-medium">€{benefit.monthly_cost_employee}</span>
                              </div>
                            </div>
                            {benefit.is_taxable && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Tributa IRPF ({benefit.tax_percentage}%)
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-end mt-3 pt-3 border-t">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedBenefit(benefit);
                              setShowEnrollDialog(true);
                            }}
                          >
                            Inscribir Empleado
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inscripciones */}
        <TabsContent value="enrollments" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Inscripciones Activas</CardTitle>
                  <CardDescription>Empleados inscritos en beneficios</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Beneficio</TableHead>
                      <TableHead>Fecha Inscripción</TableHead>
                      <TableHead>Cobertura</TableHead>
                      <TableHead className="text-right">Aportación Emp.</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No hay inscripciones registradas
                        </TableCell>
                      </TableRow>
                    ) : (
                      enrollments.map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell>
                            {enrollment.employee 
                              ? `${enrollment.employee.first_name} ${enrollment.employee.last_name}`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {enrollment.benefit && BENEFIT_ICONS[enrollment.benefit.benefit_type]}
                              <span>{enrollment.benefit?.benefit_name || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{enrollment.enrollment_date}</TableCell>
                          <TableCell className="capitalize">{enrollment.coverage_level}</TableCell>
                          <TableCell className="text-right">€{enrollment.company_contribution}</TableCell>
                          <TableCell>{getStatusBadge(enrollment.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Análisis */}
        <TabsContent value="analytics" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribución por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(
                    benefits.reduce((acc, b) => {
                      acc[b.benefit_type] = (acc[b.benefit_type] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([type, count]) => (
                    <div key={type} className="flex items-center gap-3">
                      {BENEFIT_ICONS[type]}
                      <span className="flex-1 text-sm">{BENEFIT_TYPE_LABELS[type] || type}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Coste Total por Beneficio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {benefits.slice(0, 5).map((b) => {
                    const enrollmentCount = enrollments.filter(
                      e => e.benefit?.id === b.id && e.status === 'active'
                    ).length;
                    const totalCost = enrollmentCount * b.monthly_cost_company;
                    return (
                      <div key={b.id}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>{b.benefit_name}</span>
                          <span className="font-medium">€{totalCost.toLocaleString()}/mes</span>
                        </div>
                        <Progress value={Math.min((enrollmentCount / 10) * 100, 100)} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {enrollmentCount} empleados inscritos
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Enrollment Dialog */}
      <HRBenefitEnrollmentDialog
        open={showEnrollDialog}
        onOpenChange={setShowEnrollDialog}
        companyId={companyId}
        benefit={selectedBenefit}
        onSuccess={handleEnrollSuccess}
      />

      {/* Benefit Form Dialog */}
      <HRBenefitFormDialog
        open={showBenefitFormDialog}
        onOpenChange={setShowBenefitFormDialog}
        companyId={companyId}
        onSuccess={() => {
          fetchBenefits();
          setShowBenefitFormDialog(false);
        }}
      />
    </div>
  );
}

export default HRSocialBenefitsPanel;
