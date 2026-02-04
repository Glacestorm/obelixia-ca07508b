/**
 * HRSuccessionPlanningPanel - Panel de Planificación de Sucesión
 * Fase 2: Gestión del Talento Avanzada
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Crown,
  Users,
  Target,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Star,
  Shield,
  Clock,
  Building2,
  UserCheck,
  RefreshCw,
  Sparkles,
  ChevronRight,
  BarChart3,
  Zap
} from 'lucide-react';
import { useHRTalentSkills, SuccessionCandidate } from '@/hooks/admin/hr/useHRTalentSkills';
import { cn } from '@/lib/utils';

// Types
interface CriticalPosition {
  id: string;
  title: string;
  department: string;
  incumbent: string;
  incumbent_tenure_years: number;
  criticality: 'critical' | 'high' | 'medium';
  vacancy_risk: 'high' | 'medium' | 'low';
  bench_strength: 'strong' | 'adequate' | 'weak';
  candidates_count: number;
  ready_now_count: number;
}

// Mock Data
const mockCriticalPositions: CriticalPosition[] = [
  {
    id: 'pos_1',
    title: 'Chief Technology Officer',
    department: 'Tecnología',
    incumbent: 'María García',
    incumbent_tenure_years: 8,
    criticality: 'critical',
    vacancy_risk: 'medium',
    bench_strength: 'adequate',
    candidates_count: 3,
    ready_now_count: 0
  },
  {
    id: 'pos_2',
    title: 'VP Sales & Marketing',
    department: 'Comercial',
    incumbent: 'Carlos López',
    incumbent_tenure_years: 5,
    criticality: 'critical',
    vacancy_risk: 'low',
    bench_strength: 'strong',
    candidates_count: 4,
    ready_now_count: 2
  },
  {
    id: 'pos_3',
    title: 'Director de Operaciones',
    department: 'Operaciones',
    incumbent: 'Juan Rodríguez',
    incumbent_tenure_years: 12,
    criticality: 'high',
    vacancy_risk: 'high',
    bench_strength: 'weak',
    candidates_count: 2,
    ready_now_count: 0
  },
  {
    id: 'pos_4',
    title: 'CFO',
    department: 'Finanzas',
    incumbent: 'Ana Martínez',
    incumbent_tenure_years: 6,
    criticality: 'critical',
    vacancy_risk: 'low',
    bench_strength: 'adequate',
    candidates_count: 2,
    ready_now_count: 1
  }
];

const mockCandidates: SuccessionCandidate[] = [
  {
    employee_id: 'emp_1',
    employee_name: 'Laura Fernández',
    current_position: 'VP Engineering',
    nine_box_position: { performance: 5, potential: 5 },
    overall_readiness: 85,
    readiness_level: 'ready_in_1_year',
    strengths_for_role: ['Liderazgo técnico', 'Visión estratégica', 'Gestión de equipos grandes'],
    gaps_for_role: ['Exposición a board', 'P&L ownership'],
    development_actions: [
      { action: 'Participación en comité ejecutivo', timeline: 'Inmediato' },
      { action: 'Proyecto de optimización de costes', timeline: 'Q2 2026' }
    ],
    flight_risk: 'low',
    recommendation_priority: 1
  },
  {
    employee_id: 'emp_2',
    employee_name: 'Pedro Sánchez',
    current_position: 'Director de Arquitectura',
    nine_box_position: { performance: 4, potential: 5 },
    overall_readiness: 72,
    readiness_level: 'ready_in_2_years',
    strengths_for_role: ['Conocimiento técnico profundo', 'Innovación'],
    gaps_for_role: ['People management', 'Budget management', 'Executive presence'],
    development_actions: [
      { action: 'Programa de liderazgo ejecutivo', timeline: 'Q1 2026' },
      { action: 'Mentoring con CEO', timeline: '6 meses' }
    ],
    flight_risk: 'medium',
    recommendation_priority: 2
  },
  {
    employee_id: 'emp_3',
    employee_name: 'Isabel Torres',
    current_position: 'Senior Director IT',
    nine_box_position: { performance: 4, potential: 4 },
    overall_readiness: 65,
    readiness_level: 'ready_in_2_years',
    strengths_for_role: ['Gestión operacional', 'Stakeholder management'],
    gaps_for_role: ['Visión estratégica', 'Technical depth', 'Innovation leadership'],
    development_actions: [
      { action: 'Rotación a área de producto', timeline: 'Q2 2026' },
      { action: 'MBA Executive', timeline: '18 meses' }
    ],
    flight_risk: 'low',
    recommendation_priority: 3
  }
];

const criticalityConfig = {
  critical: { color: 'bg-red-100 text-red-700 border-red-300', label: 'Crítico' },
  high: { color: 'bg-amber-100 text-amber-700 border-amber-300', label: 'Alto' },
  medium: { color: 'bg-blue-100 text-blue-700 border-blue-300', label: 'Medio' }
};

const riskConfig = {
  high: { color: 'text-red-600', label: 'Alto' },
  medium: { color: 'text-amber-600', label: 'Medio' },
  low: { color: 'text-green-600', label: 'Bajo' }
};

const benchConfig = {
  strong: { color: 'bg-green-100 text-green-700', label: 'Fuerte' },
  adequate: { color: 'bg-amber-100 text-amber-700', label: 'Adecuado' },
  weak: { color: 'bg-red-100 text-red-700', label: 'Débil' }
};

const readinessConfig = {
  ready_now: { color: 'bg-green-500', label: 'Listo ahora' },
  ready_in_1_year: { color: 'bg-blue-500', label: 'Listo en 1 año' },
  ready_in_2_years: { color: 'bg-amber-500', label: 'Listo en 2 años' },
  development_needed: { color: 'bg-red-500', label: 'Desarrollo requerido' }
};

export function HRSuccessionPlanningPanel() {
  const [activeTab, setActiveTab] = useState('positions');
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  
  const { isLoading, analyzeSuccession, successionCandidates } = useHRTalentSkills();

  const handleAnalyzePosition = useCallback(async (positionId: string) => {
    setSelectedPosition(positionId);
    await analyzeSuccession(positionId, undefined, {
      candidates: mockCandidates.map(c => ({
        id: c.employee_id,
        name: c.employee_name,
        position: c.current_position,
        performance: c.nine_box_position.performance,
        potential: c.nine_box_position.potential
      }))
    });
  }, [analyzeSuccession]);

  // 9-Box Grid Component
  const NineBoxGrid = ({ candidates }: { candidates: SuccessionCandidate[] }) => {
    const getBoxCandidates = (perfMin: number, perfMax: number, potMin: number, potMax: number) => {
      return candidates.filter(c => 
        c.nine_box_position.performance >= perfMin && 
        c.nine_box_position.performance <= perfMax &&
        c.nine_box_position.potential >= potMin &&
        c.nine_box_position.potential <= potMax
      );
    };

    const boxes = [
      // Top row (High Potential)
      { perfRange: [1, 2], potRange: [4, 5], label: 'Enigma', color: 'bg-amber-100' },
      { perfRange: [3, 3], potRange: [4, 5], label: 'Growth', color: 'bg-blue-100' },
      { perfRange: [4, 5], potRange: [4, 5], label: 'Star', color: 'bg-green-100' },
      // Middle row
      { perfRange: [1, 2], potRange: [3, 3], label: 'Underperformer', color: 'bg-red-100' },
      { perfRange: [3, 3], potRange: [3, 3], label: 'Core Player', color: 'bg-gray-100' },
      { perfRange: [4, 5], potRange: [3, 3], label: 'High Performer', color: 'bg-blue-100' },
      // Bottom row (Low Potential)
      { perfRange: [1, 2], potRange: [1, 2], label: 'Risk', color: 'bg-red-200' },
      { perfRange: [3, 3], potRange: [1, 2], label: 'Effective', color: 'bg-gray-100' },
      { perfRange: [4, 5], potRange: [1, 2], label: 'Workhouse', color: 'bg-green-50' },
    ];

    return (
      <div className="relative">
        {/* Labels */}
        <div className="absolute -left-20 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-medium text-muted-foreground whitespace-nowrap">
          POTENCIAL →
        </div>
        <div className="absolute bottom-[-30px] left-1/2 -translate-x-1/2 text-sm font-medium text-muted-foreground">
          DESEMPEÑO →
        </div>
        
        <div className="grid grid-cols-3 gap-1 ml-4">
          {boxes.map((box, i) => {
            const boxCandidates = getBoxCandidates(
              box.perfRange[0], box.perfRange[1],
              box.potRange[0], box.potRange[1]
            );
            return (
              <div 
                key={i}
                className={cn(
                  "aspect-square p-2 rounded-lg border transition-all hover:shadow-md",
                  box.color,
                  boxCandidates.length > 0 && "ring-2 ring-primary/30"
                )}
              >
                <p className="text-xs font-medium mb-1">{box.label}</p>
                <div className="flex flex-wrap gap-1">
                  {boxCandidates.map(c => (
                    <Badge 
                      key={c.employee_id} 
                      variant="secondary" 
                      className="text-xs px-1"
                    >
                      {c.employee_name.split(' ')[0]}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPositionCard = (pos: CriticalPosition) => (
    <Card 
      key={pos.id}
      className={cn(
        "cursor-pointer hover:shadow-md transition-all",
        selectedPosition === pos.id && "ring-2 ring-primary"
      )}
      onClick={() => handleAnalyzePosition(pos.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <Badge 
              variant="outline" 
              className={cn("text-xs mb-1", criticalityConfig[pos.criticality].color)}
            >
              {criticalityConfig[pos.criticality].label}
            </Badge>
            <h3 className="font-semibold">{pos.title}</h3>
            <p className="text-sm text-muted-foreground">{pos.department}</p>
          </div>
          <Crown className="h-5 w-5 text-amber-500" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Titular actual:</span>
            <span className="font-medium">{pos.incumbent}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Antigüedad:</span>
            <span>{pos.incumbent_tenure_years} años</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Riesgo vacante:</span>
            <span className={cn("font-medium", riskConfig[pos.vacancy_risk].color)}>
              {riskConfig[pos.vacancy_risk].label}
            </span>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Bench strength:</span>
              <Badge className={benchConfig[pos.bench_strength].color}>
                {benchConfig[pos.bench_strength].label}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {pos.candidates_count} candidatos
              </span>
              <span className={cn(
                "flex items-center gap-1",
                pos.ready_now_count > 0 ? "text-green-600" : "text-amber-600"
              )}>
                <UserCheck className="h-3 w-3" />
                {pos.ready_now_count} listos
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderCandidateCard = (candidate: SuccessionCandidate) => (
    <Card key={candidate.employee_id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="text-xs">
                #{candidate.recommendation_priority}
              </Badge>
              {candidate.flight_risk !== 'low' && (
                <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Riesgo fuga: {candidate.flight_risk}
                </Badge>
              )}
            </div>
            <h3 className="font-semibold">{candidate.employee_name}</h3>
            <p className="text-sm text-muted-foreground">{candidate.current_position}</p>
          </div>
          
          <div className="text-center">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold",
              candidate.overall_readiness >= 80 ? "bg-green-500" :
              candidate.overall_readiness >= 60 ? "bg-blue-500" :
              "bg-amber-500"
            )}>
              {candidate.overall_readiness}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Readiness</p>
          </div>
        </div>

        {/* 9-Box Position */}
        <div className="flex items-center gap-4 mb-3 p-2 rounded-lg bg-muted/50">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Desempeño</p>
            <div className="flex gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map(n => (
                <div 
                  key={n} 
                  className={cn(
                    "w-2 h-2 rounded-full",
                    n <= candidate.nine_box_position.performance ? "bg-primary" : "bg-muted"
                  )} 
                />
              ))}
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Potencial</p>
            <div className="flex gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map(n => (
                <div 
                  key={n} 
                  className={cn(
                    "w-2 h-2 rounded-full",
                    n <= candidate.nine_box_position.potential ? "bg-purple-500" : "bg-muted"
                  )} 
                />
              ))}
            </div>
          </div>
          <Badge className={readinessConfig[candidate.readiness_level].color}>
            {readinessConfig[candidate.readiness_level].label}
          </Badge>
        </div>

        {/* Strengths & Gaps */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Fortalezas:</p>
            <div className="space-y-1">
              {candidate.strengths_for_role.slice(0, 2).map((s, i) => (
                <div key={i} className="flex items-center gap-1 text-xs">
                  <Star className="h-3 w-3 text-amber-500" />
                  {s}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Gaps:</p>
            <div className="space-y-1">
              {candidate.gaps_for_role.slice(0, 2).map((g, i) => (
                <div key={i} className="flex items-center gap-1 text-xs">
                  <TrendingUp className="h-3 w-3 text-blue-500" />
                  {g}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Development Actions */}
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-2">Acciones de desarrollo:</p>
          {candidate.development_actions.map((action, i) => (
            <div key={i} className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                {action.action}
              </span>
              <Badge variant="outline" className="text-xs">
                {action.timeline}
              </Badge>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <Button size="sm" className="flex-1">
            Ver Perfil Completo
          </Button>
          <Button size="sm" variant="outline">
            Plan de Desarrollo
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-500" />
            Planificación de Sucesión
          </h2>
          <p className="text-muted-foreground">
            Identifica, desarrolla y prepara el talento para posiciones críticas
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="tech">Tecnología</SelectItem>
              <SelectItem value="commercial">Comercial</SelectItem>
              <SelectItem value="operations">Operaciones</SelectItem>
              <SelectItem value="finance">Finanzas</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <Shield className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {mockCriticalPositions.filter(p => p.criticality === 'critical').length}
              </p>
              <p className="text-xs text-muted-foreground">Posiciones Críticas</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {mockCriticalPositions.filter(p => p.bench_strength === 'weak').length}
              </p>
              <p className="text-xs text-muted-foreground">Bench Débil</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {mockCriticalPositions.reduce((acc, p) => acc + p.ready_now_count, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Listos Ahora</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">72%</p>
              <p className="text-xs text-muted-foreground">Health Score</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="positions" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Posiciones Críticas
          </TabsTrigger>
          <TabsTrigger value="candidates" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Candidatos
          </TabsTrigger>
          <TabsTrigger value="nine-box" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            9-Box Grid
          </TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockCriticalPositions.map(renderPositionCard)}
          </div>
        </TabsContent>

        <TabsContent value="candidates" className="mt-6">
          {selectedPosition ? (
            <div className="space-y-4">
              <Card className="p-4 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">
                      {mockCriticalPositions.find(p => p.id === selectedPosition)?.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {mockCandidates.length} candidatos identificados
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analizar con IA
                  </Button>
                </div>
              </Card>
              
              <div className="grid md:grid-cols-2 gap-4">
                {mockCandidates.map(renderCandidateCard)}
              </div>
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-semibold mb-2">Selecciona una posición crítica</h3>
              <p className="text-sm text-muted-foreground">
                Haz clic en una posición para ver sus candidatos a sucesión
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="nine-box" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Matriz 9-Box</CardTitle>
                <CardDescription>
                  Distribución de candidatos por desempeño y potencial
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-12 pl-12">
                <NineBoxGrid candidates={mockCandidates} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Leyenda y Acciones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-green-100 dark:bg-green-950/20">
                    <p className="font-medium text-sm text-green-700">Star (Top Right)</p>
                    <p className="text-xs text-green-600">Alto desempeño + Alto potencial. Candidatos prioritarios para sucesión.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-950/20">
                    <p className="font-medium text-sm text-blue-700">Growth / High Performer</p>
                    <p className="text-xs text-blue-600">Desarrollar para roles de mayor responsabilidad.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-950/20">
                    <p className="font-medium text-sm text-amber-700">Enigma / Core Player</p>
                    <p className="text-xs text-amber-600">Evaluar fit y proporcionar coaching específico.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-100 dark:bg-red-950/20">
                    <p className="font-medium text-sm text-red-700">Underperformer / Risk</p>
                    <p className="text-xs text-red-600">Plan de mejora o reubicación.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRSuccessionPlanningPanel;
