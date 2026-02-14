/**
 * Academia Module Dashboard - Main Component
 */

import { useState, lazy, Suspense, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import {
  Plus, RefreshCw, Brain, GraduationCap, BookOpen, Users, Award,
  TrendingUp, Calendar, BarChart3, MessageSquare, Star, Target,
  Gamepad2, ExternalLink,
} from 'lucide-react';
import { AcademiaNavigation } from './AcademiaNavigation';
import { AcademiaKPIPanel } from './AcademiaKPIPanel';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

// Lazy load existing components
const CourseCatalog = lazy(() => import('@/pages/academia/CourseCatalog'));
const CourseManagement = lazy(() => import('@/pages/academia/CourseManagement'));
const AcademiaAnalytics = lazy(() => import('@/pages/academia/AcademiaAnalytics'));
const AcademiaNotifications = lazy(() => import('@/pages/academia/AcademiaNotifications'));
const AcademiaCommunity = lazy(() => import('@/pages/academia/AcademiaCommunity'));
const AcademiaProfile = lazy(() => import('@/pages/academia/AcademiaProfile'));
const CertificateVerification = lazy(() => import('@/pages/academia/CertificateVerification'));
const AIRecommendationsPanel = lazy(() => import('@/components/academia/AIRecommendationsPanel').then(m => ({ default: m.AIRecommendationsPanel })));
const AcademiaAIAssistant = lazy(() => import('@/components/academia/AcademiaAIAssistant').then(m => ({ default: m.AcademiaAIAssistant })));
const ContentUploader = lazy(() => import('@/components/academia/ContentUploader').then(m => ({ default: m.ContentUploader })));
const InstructorDashboard = lazy(() => import('@/components/academia/InstructorDashboard').then(m => ({ default: m.InstructorDashboard })));
const ProgressDashboard = lazy(() => import('@/components/academia/ProgressDashboard').then(m => ({ default: m.ProgressDashboard })));
const AdaptiveQuizPanel = lazy(() => import('@/components/academia/adaptive-quiz/AdaptiveQuizPanel').then(m => ({ default: m.AdaptiveQuizPanel })));
const LearningPathPanel = lazy(() => import('@/components/academia/learning-path/LearningPathPanel').then(m => ({ default: m.LearningPathPanel })));
const GamificationDashboard = lazy(() => import('@/components/academia/gamification/GamificationDashboard').then(m => ({ default: m.GamificationDashboard })));
const AchievementSystem = lazy(() => import('@/components/academia/AchievementSystem').then(m => ({ default: m.AchievementSystem })));
const WeeklyChallenges = lazy(() => import('@/components/academia/WeeklyChallenges').then(m => ({ default: m.WeeklyChallenges })));
const CertificatesPanel = lazy(() => import('@/components/academia/CertificatesPanel').then(m => ({ default: m.CertificatesPanel })));
const CommunityPanel = lazy(() => import('@/components/academia/CommunityPanel').then(m => ({ default: m.CommunityPanel })));
const NotificationsPanel = lazy(() => import('@/components/academia/NotificationsPanel').then(m => ({ default: m.NotificationsPanel })));

// Lazy load NEW Phase 1-5 components
const NicheConfigPanel = lazy(() => import('@/components/academia/strategy/NicheConfigPanel'));
const StudentAvatarBuilder = lazy(() => import('@/components/academia/strategy/StudentAvatarBuilder'));
const CourseValidationPanel = lazy(() => import('@/components/academia/strategy/CourseValidationPanel'));
const ResourceManager = lazy(() => import('@/components/academia/structure/ResourceManager'));
const CapstoneProjectPanel = lazy(() => import('@/components/academia/structure/CapstoneProjectPanel'));
const ProductionChecklist = lazy(() => import('@/components/academia/production/ProductionChecklist'));
const LegalCompliancePanel = lazy(() => import('@/components/academia/production/LegalCompliancePanel'));
const BusinessModelSelector = lazy(() => import('@/components/academia/business/BusinessModelSelector'));
const PricingLadderDesigner = lazy(() => import('@/components/academia/business/PricingLadderDesigner'));
const CohortManager = lazy(() => import('@/components/academia/business/CohortManager'));
const SalesFunnelDesigner = lazy(() => import('@/components/academia/marketing/SalesFunnelDesigner'));
const SalesKPIDashboard = lazy(() => import('@/components/academia/marketing/SalesKPIDashboard'));
const BestPracticesPanel = lazy(() => import('@/components/academia/marketing/BestPracticesPanel'));

const TabSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-48 w-full" />
  </div>
);

export function AcademiaModuleDashboard() {
  const [activeTab, setActiveTab] = useState('resumen');
  const [showAssistant, setShowAssistant] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { language } = useLanguage();

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  }, []);

  const renderResumen = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { id: 'catalogo', title: 'Catálogo de Cursos', desc: 'Explora todos los cursos disponibles', icon: BookOpen, color: 'from-blue-500 to-cyan-500' },
          { id: 'gestion', title: 'Gestión de Cursos', desc: 'Crear, editar y gestionar cursos', icon: GraduationCap, color: 'from-violet-500 to-purple-500' },
          { id: 'analytics', title: 'Analytics', desc: 'Métricas y análisis de rendimiento', icon: BarChart3, color: 'from-emerald-500 to-green-500' },
          { id: 'gamification', title: 'Gamificación', desc: 'Logros, puntos y rankings', icon: Gamepad2, color: 'from-amber-500 to-orange-500' },
          { id: 'community', title: 'Comunidad', desc: 'Foro y discusiones', icon: MessageSquare, color: 'from-pink-500 to-rose-500' },
          { id: 'ai', title: 'Inteligencia Artificial', desc: 'Tutor IA y recomendaciones', icon: Brain, color: 'from-indigo-500 to-blue-500' },
        ].map((module) => (
          <Card key={module.id} className="hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer group" onClick={() => {
            if (module.id === 'catalogo') setActiveTab('catalogo');
            else if (module.id === 'gestion') setActiveTab('gestion-cursos');
            else if (module.id === 'analytics') setActiveTab('analytics');
            else if (module.id === 'gamification') setActiveTab('gamification-dashboard');
            else if (module.id === 'community') setActiveTab('comunidad');
            else if (module.id === 'ai') setActiveTab('ai-recomendaciones');
          }}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${module.color}`}>
                  <module.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{module.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{module.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Rendimiento del Mes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Nuevas matrículas', current: 156, target: 200 },
              { label: 'Cursos completados', current: 89, target: 100 },
              { label: 'Certificados emitidos', current: 67, target: 80 },
            ].map(m => (
              <div key={m.label}>
                <div className="flex justify-between text-sm mb-1"><span>{m.label}</span><span className="font-medium">{m.current} / {m.target}</span></div>
                <Progress value={(m.current / m.target) * 100} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { user: 'Juan García', action: 'se matriculó en', target: 'React Fundamentals', time: 'Hace 5 min', icon: Users },
                { user: 'María López', action: 'completó', target: 'JavaScript Basics', time: 'Hace 15 min', icon: Award },
                { user: 'Carlos Ruiz', action: 'obtuvo certificado de', target: 'Node.js Master', time: 'Hace 1 hora', icon: Award },
                { user: 'Ana Martín', action: 'dejó reseña 5★ en', target: 'Python for Data', time: 'Hace 2 horas', icon: Star },
              ].map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <activity.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate"><span className="font-medium">{activity.user}</span> {activity.action} <span className="font-medium text-primary">{activity.target}</span></p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'resumen': return renderResumen();
      case 'analytics': return <Suspense fallback={<TabSkeleton />}><AcademiaAnalytics /></Suspense>;
      case 'catalogo': return <Suspense fallback={<TabSkeleton />}><CourseCatalog /></Suspense>;
      case 'gestion-cursos': return <Suspense fallback={<TabSkeleton />}><CourseManagement /></Suspense>;
      case 'contenido': return <Suspense fallback={<TabSkeleton />}><ContentUploader /></Suspense>;
      case 'instructor': return <Suspense fallback={<TabSkeleton />}><InstructorDashboard /></Suspense>;
      case 'perfil': return <Suspense fallback={<TabSkeleton />}><AcademiaProfile /></Suspense>;
      case 'progreso': return <Suspense fallback={<TabSkeleton />}><ProgressDashboard userId="current" /></Suspense>;
      case 'notificaciones': return <Suspense fallback={<TabSkeleton />}><NotificationsPanel /></Suspense>;
      case 'gamification-dashboard': return <Suspense fallback={<TabSkeleton />}><GamificationDashboard /></Suspense>;
      case 'logros': return <Suspense fallback={<TabSkeleton />}><AchievementSystem /></Suspense>;
      case 'desafios': return <Suspense fallback={<TabSkeleton />}><WeeklyChallenges /></Suspense>;
      case 'certificados': return <Suspense fallback={<TabSkeleton />}><CertificatesPanel /></Suspense>;
      case 'verificacion': return <Suspense fallback={<TabSkeleton />}><CertificateVerification /></Suspense>;
      case 'comunidad': return <Suspense fallback={<TabSkeleton />}><CommunityPanel /></Suspense>;
      case 'ai-recomendaciones': return <Suspense fallback={<TabSkeleton />}><AIRecommendationsPanel /></Suspense>;
      case 'ai-tutor': return <Suspense fallback={<TabSkeleton />}><AcademiaAIAssistant /></Suspense>;
      case 'quiz-adaptativo': return <Suspense fallback={<TabSkeleton />}><AdaptiveQuizPanel courseId="demo" /></Suspense>;
      case 'learning-path': return <Suspense fallback={<TabSkeleton />}><LearningPathPanel courseId="demo" /></Suspense>;
      // Phase 1: Strategy
      case 'nichos': return <Suspense fallback={<TabSkeleton />}><NicheConfigPanel /></Suspense>;
      case 'avatar': return <Suspense fallback={<TabSkeleton />}><StudentAvatarBuilder /></Suspense>;
      case 'validacion': return <Suspense fallback={<TabSkeleton />}><CourseValidationPanel /></Suspense>;
      // Phase 2: Structure
      case 'recursos': return <Suspense fallback={<TabSkeleton />}><ResourceManager /></Suspense>;
      case 'capstone': return <Suspense fallback={<TabSkeleton />}><CapstoneProjectPanel /></Suspense>;
      // Phase 3: Production & Legal
      case 'produccion-checklist': return <Suspense fallback={<TabSkeleton />}><ProductionChecklist /></Suspense>;
      case 'legal': return <Suspense fallback={<TabSkeleton />}><LegalCompliancePanel /></Suspense>;
      // Phase 4: Business
      case 'modelo-negocio': return <Suspense fallback={<TabSkeleton />}><BusinessModelSelector /></Suspense>;
      case 'pricing': return <Suspense fallback={<TabSkeleton />}><PricingLadderDesigner /></Suspense>;
      case 'cohortes': return <Suspense fallback={<TabSkeleton />}><CohortManager /></Suspense>;
      // Phase 5: Marketing
      case 'funnel': return <Suspense fallback={<TabSkeleton />}><SalesFunnelDesigner /></Suspense>;
      case 'kpis-ventas': return <Suspense fallback={<TabSkeleton />}><SalesKPIDashboard /></Suspense>;
      case 'best-practices': return <Suspense fallback={<TabSkeleton />}><BestPracticesPanel /></Suspense>;
      default:
        return (
          <div className="text-center py-12 text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Selecciona una opción del menú</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Academia - Plataforma Educativa
          </h1>
          <p className="text-muted-foreground">Gestión integral de cursos, estudiantes y contenido educativo con IA</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />Actualizar
          </Button>
          <Button variant={showAssistant ? "default" : "outline"} size="sm" onClick={() => setShowAssistant(!showAssistant)}>
            <Brain className="h-4 w-4 mr-2" />Tutor IA
          </Button>
          <Button size="sm" onClick={() => setActiveTab('gestion-cursos')}>
            <Plus className="h-4 w-4 mr-2" />Nuevo Curso
          </Button>
        </div>
      </div>

      <AcademiaKPIPanel />
      <AcademiaNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn("lg:col-span-2", showAssistant && "lg:col-span-2")}>
          <div className="bg-card rounded-xl border border-border/50 p-4 min-h-[400px]">
            {renderTabContent()}
          </div>
        </div>

        {showAssistant ? (
          <div className="lg:col-span-1">
            <Suspense fallback={<TabSkeleton />}><AcademiaAIAssistant /></Suspense>
          </div>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Acciones Rápidas</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setActiveTab('gestion-cursos')}><Plus className="h-4 w-4 mr-2" /> Crear Curso</Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setActiveTab('certificados')}><Award className="h-4 w-4 mr-2" /> Emitir Certificado</Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setActiveTab('nichos')}><Target className="h-4 w-4 mr-2" /> Configurar Nichos</Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setActiveTab('funnel')}><BarChart3 className="h-4 w-4 mr-2" /> Crear Funnel</Button>
                <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                  <Link to="/academia"><ExternalLink className="h-4 w-4 mr-2" /> Ver Landing Pública</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Cursos Populares</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { title: 'React Fundamentals', students: 456, rating: 4.8 },
                  { title: 'JavaScript Basics', students: 389, rating: 4.7 },
                  { title: 'Node.js Master', students: 234, rating: 4.9 },
                ].map((course, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{course.title}</p>
                      <p className="text-xs text-muted-foreground">{course.students} estudiantes</p>
                    </div>
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />{course.rating}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default AcademiaModuleDashboard;
