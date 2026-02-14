/**
 * Academia Module Dashboard - Main Component
 * Dashboard vertical completo para el módulo Academia
 * Arquitectura similar a GALIA/LEADER
 */

import { useState, lazy, Suspense, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import {
  Plus,
  RefreshCw,
  Brain,
  GraduationCap,
  BookOpen,
  Users,
  Award,
  TrendingUp,
  Calendar,
  BarChart3,
  MessageSquare,
  Star,
  Target,
  Gamepad2,
  ExternalLink,
} from 'lucide-react';
import { AcademiaNavigation } from './AcademiaNavigation';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

// Lazy load heavy components
const CourseCatalog = lazy(() => import('@/pages/academia/CourseCatalog'));
const CourseManagement = lazy(() => import('@/pages/academia/CourseManagement'));
const AcademiaAnalytics = lazy(() => import('@/pages/academia/AcademiaAnalytics'));
const AcademiaNotifications = lazy(() => import('@/pages/academia/AcademiaNotifications'));
const AcademiaCommunity = lazy(() => import('@/pages/academia/AcademiaCommunity'));
const AcademiaProfile = lazy(() => import('@/pages/academia/AcademiaProfile'));
const CertificateVerification = lazy(() => import('@/pages/academia/CertificateVerification'));

// Lazy load academia components
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

const TabSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-48 w-full" />
  </div>
);

// KPI Cards for Academia
const quickStats = [
  { label: 'Estudiantes Activos', value: '1,234', change: '+12%', up: true, icon: Users, color: 'from-blue-500 to-cyan-500' },
  { label: 'Cursos Publicados', value: '24', change: '+3', up: true, icon: BookOpen, color: 'from-violet-500 to-purple-500' },
  { label: 'Tasa de Finalización', value: '78%', change: '+5%', up: true, icon: Target, color: 'from-emerald-500 to-green-500' },
  { label: 'Certificados Emitidos', value: '456', change: '+18%', up: true, icon: Award, color: 'from-amber-500 to-orange-500' },
];

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
      {/* Quick Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { id: 'catalogo', title: 'Catálogo de Cursos', desc: 'Explora todos los cursos disponibles', icon: BookOpen, color: 'from-blue-500 to-cyan-500', href: '/academia/cursos' },
          { id: 'gestion', title: 'Gestión de Cursos', desc: 'Crear, editar y gestionar cursos', icon: GraduationCap, color: 'from-violet-500 to-purple-500', href: '/academia/gestion-cursos' },
          { id: 'analytics', title: 'Analytics', desc: 'Métricas y análisis de rendimiento', icon: BarChart3, color: 'from-emerald-500 to-green-500' },
          { id: 'gamification', title: 'Gamificación', desc: 'Logros, puntos y rankings', icon: Gamepad2, color: 'from-amber-500 to-orange-500' },
          { id: 'community', title: 'Comunidad', desc: 'Foro y discusiones', icon: MessageSquare, color: 'from-pink-500 to-rose-500', href: '/academia/comunidad' },
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
                {module.href && (
                  <Link to={module.href} onClick={e => e.stopPropagation()}>
                    <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  </Link>
                )}
              </div>
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                {module.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{module.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Rendimiento del Mes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Nuevas matrículas</span>
                <span className="font-medium">156 / 200</span>
              </div>
              <Progress value={78} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Cursos completados</span>
                <span className="font-medium">89 / 100</span>
              </div>
              <Progress value={89} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Certificados emitidos</span>
                <span className="font-medium">67 / 80</span>
              </div>
              <Progress value={84} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Satisfacción media</span>
                <span className="font-medium flex items-center gap-1">4.7 <Star className="h-3 w-3 fill-amber-500 text-amber-500" /></span>
              </div>
              <Progress value={94} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Actividad Reciente
            </CardTitle>
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
                    <p className="text-sm truncate">
                      <span className="font-medium">{activity.user}</span>
                      {' '}{activity.action}{' '}
                      <span className="font-medium text-primary">{activity.target}</span>
                    </p>
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
      case 'resumen':
        return renderResumen();
      case 'analytics':
        return <Suspense fallback={<TabSkeleton />}><AcademiaAnalytics /></Suspense>;
      case 'catalogo':
        return <Suspense fallback={<TabSkeleton />}><CourseCatalog /></Suspense>;
      case 'gestion-cursos':
        return <Suspense fallback={<TabSkeleton />}><CourseManagement /></Suspense>;
      case 'contenido':
        return <Suspense fallback={<TabSkeleton />}><ContentUploader /></Suspense>;
      case 'instructor':
        return <Suspense fallback={<TabSkeleton />}><InstructorDashboard /></Suspense>;
      case 'perfil':
        return <Suspense fallback={<TabSkeleton />}><AcademiaProfile /></Suspense>;
      case 'progreso':
        return <Suspense fallback={<TabSkeleton />}><ProgressDashboard userId="current" /></Suspense>;
      case 'notificaciones':
        return <Suspense fallback={<TabSkeleton />}><NotificationsPanel /></Suspense>;
      case 'gamification-dashboard':
        return <Suspense fallback={<TabSkeleton />}><GamificationDashboard /></Suspense>;
      case 'logros':
        return <Suspense fallback={<TabSkeleton />}><AchievementSystem /></Suspense>;
      case 'desafios':
        return <Suspense fallback={<TabSkeleton />}><WeeklyChallenges /></Suspense>;
      case 'certificados':
        return <Suspense fallback={<TabSkeleton />}><CertificatesPanel /></Suspense>;
      case 'verificacion':
        return <Suspense fallback={<TabSkeleton />}><CertificateVerification /></Suspense>;
      case 'comunidad':
        return <Suspense fallback={<TabSkeleton />}><CommunityPanel /></Suspense>;
      case 'ai-recomendaciones':
        return <Suspense fallback={<TabSkeleton />}><AIRecommendationsPanel /></Suspense>;
      case 'ai-tutor':
        return <Suspense fallback={<TabSkeleton />}><AcademiaAIAssistant /></Suspense>;
      case 'quiz-adaptativo':
        return <Suspense fallback={<TabSkeleton />}><AdaptiveQuizPanel courseId="demo" /></Suspense>;
      case 'learning-path':
        return <Suspense fallback={<TabSkeleton />}><LearningPathPanel courseId="demo" /></Suspense>;
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Academia - Plataforma Educativa
          </h1>
          <p className="text-muted-foreground">
            Gestión integral de cursos, estudiantes y contenido educativo con IA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Actualizar
          </Button>
          <Button
            variant={showAssistant ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAssistant(!showAssistant)}
          >
            <Brain className="h-4 w-4 mr-2" />
            Tutor IA
          </Button>
          <Button size="sm" onClick={() => setActiveTab('gestion-cursos')}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Curso
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
                <Badge variant={stat.up ? 'default' : 'destructive'} className="text-xs">
                  {stat.change}
                </Badge>
              </div>
              <p className="text-2xl font-bold mt-2">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Navigation */}
      <AcademiaNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn("lg:col-span-2", showAssistant && "lg:col-span-2")}>
          <div className="bg-card rounded-xl border border-border/50 p-4 min-h-[400px]">
            {renderTabContent()}
          </div>
        </div>

        {showAssistant ? (
          <div className="lg:col-span-1">
            <Suspense fallback={<TabSkeleton />}>
              <AcademiaAIAssistant />
            </Suspense>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Sidebar - Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setActiveTab('gestion-cursos')}>
                  <Plus className="h-4 w-4 mr-2" /> Crear Curso
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setActiveTab('certificados')}>
                  <Award className="h-4 w-4 mr-2" /> Emitir Certificado
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setActiveTab('notificaciones')}>
                  <MessageSquare className="h-4 w-4 mr-2" /> Enviar Anuncio
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                  <Link to="/academia">
                    <ExternalLink className="h-4 w-4 mr-2" /> Ver Landing Pública
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Sidebar - Top Courses */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Cursos Populares</CardTitle>
              </CardHeader>
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
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      {course.rating}
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
