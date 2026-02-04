/**
 * HRSkillsMatrixPanel - Panel de Matriz de Competencias
 * Fase 2: Gestión del Talento Avanzada
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Brain,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Star,
  Sparkles,
  BarChart3,
  Users,
  GraduationCap,
  RefreshCw,
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  Zap
} from 'lucide-react';
import { useHRTalentSkills, SkillGap, SkillStrength } from '@/hooks/admin/hr/useHRTalentSkills';
import { cn } from '@/lib/utils';

// Mock data for demonstration
const mockEmployees = [
  { id: 'emp_1', name: 'María García', department: 'Tecnología', position: 'Senior Developer' },
  { id: 'emp_2', name: 'Carlos López', department: 'Operaciones', position: 'Operations Manager' },
  { id: 'emp_3', name: 'Ana Martínez', department: 'RRHH', position: 'HR Business Partner' },
];

const mockSkillsData = {
  employee_skills: [
    { name: 'Python', level: 4, category: 'technical' },
    { name: 'Leadership', level: 3, category: 'soft' },
    { name: 'Data Analysis', level: 4, category: 'technical' },
    { name: 'Cloud Architecture', level: 2, category: 'digital' },
    { name: 'Project Management', level: 3, category: 'management' },
  ],
  required_skills: [
    { name: 'Python', level: 4, category: 'technical' },
    { name: 'Leadership', level: 4, category: 'soft' },
    { name: 'Cloud Architecture', level: 4, category: 'digital' },
    { name: 'Machine Learning', level: 3, category: 'technical' },
  ]
};

const categoryColors: Record<string, string> = {
  technical: 'bg-blue-500/20 text-blue-700 border-blue-300',
  soft: 'bg-purple-500/20 text-purple-700 border-purple-300',
  digital: 'bg-cyan-500/20 text-cyan-700 border-cyan-300',
  industry: 'bg-amber-500/20 text-amber-700 border-amber-300',
  management: 'bg-emerald-500/20 text-emerald-700 border-emerald-300',
};

const severityColors: Record<string, string> = {
  low: 'text-green-600 bg-green-100',
  medium: 'text-amber-600 bg-amber-100',
  high: 'text-orange-600 bg-orange-100',
  critical: 'text-red-600 bg-red-100',
};

export function HRSkillsMatrixPanel() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const {
    isLoading,
    skillsAnalysis,
    developmentPlan,
    analyzeSkillsGap,
    recommendDevelopment
  } = useHRTalentSkills();

  const handleAnalyze = useCallback(async () => {
    if (!selectedEmployee) return;
    await analyzeSkillsGap(selectedEmployee, mockSkillsData);
  }, [selectedEmployee, analyzeSkillsGap]);

  const handleGeneratePlan = useCallback(async () => {
    if (!selectedEmployee) return;
    await recommendDevelopment(selectedEmployee, mockSkillsData, { 
      career_goal: 'Technical Lead',
      interests: ['AI/ML', 'Cloud', 'Team Leadership']
    });
  }, [selectedEmployee, recommendDevelopment]);

  const renderSkillLevel = (level: number, maxLevel: number = 5) => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: maxLevel }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              i < level ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">{level}/{maxLevel}</span>
      </div>
    );
  };

  const renderGapCard = (gap: SkillGap) => (
    <div 
      key={gap.skill_name}
      className="p-3 rounded-lg border bg-card hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-sm">{gap.skill_name}</h4>
          <Badge variant="outline" className={cn("text-xs mt-1", categoryColors[gap.category])}>
            {gap.category}
          </Badge>
        </div>
        <Badge className={cn("text-xs", severityColors[gap.gap_severity])}>
          {gap.gap_severity === 'critical' ? 'Crítico' : 
           gap.gap_severity === 'high' ? 'Alto' :
           gap.gap_severity === 'medium' ? 'Medio' : 'Bajo'}
        </Badge>
      </div>
      
      <div className="space-y-2 mt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Nivel actual</span>
          {renderSkillLevel(gap.current_level)}
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Nivel requerido</span>
          {renderSkillLevel(gap.required_level)}
        </div>
        
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-1">
            Tiempo estimado: <span className="font-medium">{gap.estimated_time_months} meses</span>
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {gap.recommended_actions.slice(0, 2).map((action, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {action}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStrengthCard = (strength: SkillStrength) => (
    <div 
      key={strength.skill_name}
      className="p-3 rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-sm flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-500" />
            {strength.skill_name}
          </h4>
          <Badge variant="outline" className={cn("text-xs mt-1", categoryColors[strength.category])}>
            {strength.category}
          </Badge>
        </div>
        <Badge className="bg-green-500/20 text-green-700 text-xs">
          +{strength.exceeds_by} niveles
        </Badge>
      </div>
      
      <div className="mt-3">
        {renderSkillLevel(strength.current_level)}
        
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-1">Oportunidades de apalancamiento:</p>
          <div className="flex flex-wrap gap-1">
            {strength.leverage_opportunities.map((opp, i) => (
              <Badge key={i} variant="outline" className="text-xs bg-white/50">
                {opp}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Matriz de Competencias
          </h2>
          <p className="text-muted-foreground">
            Análisis de gaps, fortalezas y planes de desarrollo personalizados
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Seleccionar empleado..." />
            </SelectTrigger>
            <SelectContent>
              {mockEmployees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>
                  <div className="flex flex-col">
                    <span>{emp.name}</span>
                    <span className="text-xs text-muted-foreground">{emp.position}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={handleAnalyze} 
            disabled={!selectedEmployee || isLoading}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Analizar
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {skillsAnalysis && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{skillsAnalysis.employee_summary.total_skills}</p>
                <p className="text-xs text-muted-foreground">Total Competencias</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{skillsAnalysis.employee_summary.proficient_count}</p>
                <p className="text-xs text-muted-foreground">Dominadas</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{skillsAnalysis.employee_summary.developing_count}</p>
                <p className="text-xs text-muted-foreground">En Desarrollo</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{skillsAnalysis.employee_summary.gap_count}</p>
                <p className="text-xs text-muted-foreground">Gaps Identificados</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{skillsAnalysis.employee_summary.overall_readiness}%</p>
                <p className="text-xs text-muted-foreground">Readiness Global</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Visión General
          </TabsTrigger>
          <TabsTrigger value="gaps" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Gaps
          </TabsTrigger>
          <TabsTrigger value="strengths" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Fortalezas
          </TabsTrigger>
          <TabsTrigger value="development" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Plan de Desarrollo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {!skillsAnalysis ? (
            <Card className="p-8 text-center">
              <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-semibold mb-2">Selecciona un empleado para analizar</h3>
              <p className="text-sm text-muted-foreground mb-4">
                El sistema analizará las competencias actuales vs las requeridas para su puesto
              </p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Skills Overview Chart placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Distribución de Competencias</CardTitle>
                  <CardDescription>Por categoría y nivel de dominio</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['technical', 'soft', 'digital', 'management'].map(cat => (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize">{cat}</span>
                          <span className="text-muted-foreground">
                            {Math.floor(Math.random() * 5) + 1} competencias
                          </span>
                        </div>
                        <Progress value={Math.floor(Math.random() * 40) + 60} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Readiness Score */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Índice de Preparación</CardTitle>
                  <CardDescription>Para el puesto actual y próximo nivel</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-muted"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${(skillsAnalysis.employee_summary.overall_readiness / 100) * 352} 352`}
                          className="text-primary"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold">
                          {skillsAnalysis.employee_summary.overall_readiness}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                      <p className="text-2xl font-bold text-green-600">
                        {skillsAnalysis.strengths.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Fortalezas</p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                      <p className="text-2xl font-bold text-red-600">
                        {skillsAnalysis.skill_gaps.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Gaps</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="gaps" className="mt-4">
          {skillsAnalysis?.skill_gaps && skillsAnalysis.skill_gaps.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Buscar competencia..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64"
                  />
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="technical">Técnicas</SelectItem>
                      <SelectItem value="soft">Soft Skills</SelectItem>
                      <SelectItem value="digital">Digitales</SelectItem>
                      <SelectItem value="management">Gestión</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {skillsAnalysis.skill_gaps
                  .filter(gap => 
                    (categoryFilter === 'all' || gap.category === categoryFilter) &&
                    gap.skill_name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map(renderGapCard)}
              </div>
            </div>
          ) : (
            <Card className="p-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="font-semibold mb-2">¡Sin gaps identificados!</h3>
              <p className="text-sm text-muted-foreground">
                El empleado cumple con todas las competencias requeridas
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="strengths" className="mt-4">
          {skillsAnalysis?.strengths && skillsAnalysis.strengths.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skillsAnalysis.strengths.map(renderStrengthCard)}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-semibold mb-2">Analiza primero las competencias</h3>
              <p className="text-sm text-muted-foreground">
                Selecciona un empleado y ejecuta el análisis
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="development" className="mt-4">
          <div className="space-y-4">
            {!developmentPlan ? (
              <Card className="p-8 text-center">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-semibold mb-2">Genera un Plan de Desarrollo</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Basado en los gaps identificados y objetivos de carrera
                </p>
                <Button onClick={handleGeneratePlan} disabled={!selectedEmployee || isLoading}>
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Generar Plan con IA
                </Button>
              </Card>
            ) : (
              <>
                {/* Plan Summary */}
                <Card className="p-4 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{developmentPlan.development_plan.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {developmentPlan.development_plan.duration_months} meses • 
                        {developmentPlan.development_plan.total_hours} horas • 
                        €{developmentPlan.development_plan.investment_estimate.toLocaleString()}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar PDF
                    </Button>
                  </div>
                </Card>

                {/* Quick Wins */}
                {developmentPlan.quick_wins.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-500" />
                        Quick Wins
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-3">
                        {developmentPlan.quick_wins.map((qw, i) => (
                          <div key={i} className="p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20">
                            <p className="font-medium text-sm">{qw.action}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                Impacto: {qw.impact}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                Esfuerzo: {qw.effort}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recommendations */}
                <div className="space-y-4">
                  {developmentPlan.recommendations.map((rec, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            Prioridad {rec.priority}: {rec.skill_target}
                          </CardTitle>
                          <Badge>
                            {rec.actions.length} acciones
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {rec.actions.map((action, j) => (
                            <div key={j} className="flex items-start gap-3 p-3 rounded-lg border">
                              <div className={cn(
                                "p-2 rounded-lg",
                                action.type === 'course' ? 'bg-blue-100' :
                                action.type === 'certification' ? 'bg-purple-100' :
                                action.type === 'mentoring' ? 'bg-green-100' :
                                action.type === 'project' ? 'bg-amber-100' : 'bg-gray-100'
                              )}>
                                <GraduationCap className="h-4 w-4" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-sm">{action.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {action.provider && `${action.provider} • `}
                                  {action.duration_hours}h • {action.timeline}
                                </p>
                                {action.cost_estimate && (
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    €{action.cost_estimate}
                                  </Badge>
                                )}
                              </div>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-4 pt-3 border-t">
                          <p className="text-xs text-muted-foreground mb-2">Métricas de éxito:</p>
                          <div className="flex flex-wrap gap-2">
                            {rec.success_metrics.map((metric, k) => (
                              <Badge key={k} variant="secondary" className="text-xs">
                                {metric}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRSkillsMatrixPanel;
