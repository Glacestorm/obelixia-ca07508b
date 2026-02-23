/**
 * CourseDetail - Página de detalle de curso dinámico
 * Carga datos reales desde la base de datos con inscripción/pago
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Play, Clock, Users, Star, BookOpen, Award, 
  CheckCircle, MessageSquare, ChevronDown,
  Globe, ArrowLeft, Lock, PlayCircle, FileText,
  Download, Share2, Heart, AlertCircle, Sparkles, Video,
  HelpCircle, Smartphone, Trophy, Infinity,
  ShoppingCart, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import StoreNavbar from '@/components/store/StoreNavbar';
import { AcademiaAIAssistant } from '@/components/academia/AcademiaAIAssistant';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useAcademiaEnrollment } from '@/hooks/academia/useAcademiaEnrollment';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DBModule {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  duration_minutes: number | null;
  lessons: DBLesson[];
}

interface DBLesson {
  id: string;
  title: string;
  duration_minutes: number | null;
  lesson_type: string | null;
  is_preview: boolean | null;
  order_index: number;
}

interface DBCourse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  category: string;
  level: string;
  price: number | null;
  is_free: boolean | null;
  is_featured: boolean | null;
  thumbnail_url: string | null;
  instructor_name: string | null;
  duration_hours: number | null;
  total_lessons: number | null;
  total_students: number | null;
  average_rating: number | null;
  total_reviews: number | null;
  learning_objectives: string[] | null;
  prerequisites: string[] | null;
  tags: string[] | null;
}

const getLessonIcon = (type: string | null) => {
  switch (type) {
    case 'video': return PlayCircle;
    case 'quiz': return HelpCircle;
    case 'exercise': return FileText;
    case 'reading': return BookOpen;
    case 'project': return Trophy;
    default: return PlayCircle;
  }
};

const CourseDetail: React.FC = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { enrollment, loading: enrollLoading, checkEnrollment, enrollFree, startCheckout } = useAcademiaEnrollment();

  const [course, setCourse] = useState<DBCourse | null>(null);
  const [modules, setModules] = useState<DBModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Fetch course data
  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      setIsLoading(true);
      try {
        // Fetch course by slug
        const { data: courseData, error: courseError } = await supabase
          .from('academia_courses')
          .select('*')
          .eq('slug', courseId)
          .maybeSingle();

        if (courseError) throw courseError;
        if (!courseData) {
          // Try by id
          const { data: courseById } = await supabase
            .from('academia_courses')
            .select('*')
            .eq('id', courseId)
            .maybeSingle();
          if (!courseById) {
            navigate('/academia/cursos');
            return;
          }
          setCourse(courseById as unknown as DBCourse);
          await fetchModules(courseById.id);
          if (user?.id) await checkEnrollment(courseById.id);
        } else {
          setCourse(courseData as unknown as DBCourse);
          await fetchModules(courseData.id);
          if (user?.id) await checkEnrollment(courseData.id);
          setExpandedModules([]);
        }
      } catch (err) {
        console.error('[CourseDetail] Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchModules = async (cId: string) => {
      const { data: modulesData, error: modulesError } = await supabase
        .from('academia_modules')
        .select('id, title, description, order_index, duration_minutes')
        .eq('course_id', cId)
        .order('order_index');

      if (modulesError) throw modulesError;

      const { data: lessonsData, error: lessonsError } = await supabase
        .from('academia_lessons')
        .select('id, title, duration_minutes, lesson_type, is_preview, order_index, module_id')
        .eq('course_id', cId)
        .order('order_index');

      if (lessonsError) throw lessonsError;

      const mods = (modulesData || []).map((m: any) => ({
        ...m,
        lessons: (lessonsData || [])
          .filter((l: any) => l.module_id === m.id)
          .sort((a: any, b: any) => a.order_index - b.order_index),
      }));

      setModules(mods as DBModule[]);
      if (mods.length > 0) setExpandedModules([mods[0].id]);
    };

    fetchCourse();
  }, [courseId, user?.id]);

  const totalLessons = modules.reduce((acc, mod) => acc + mod.lessons.length, 0);
  const totalDurationMin = modules.reduce((acc, mod) => 
    acc + mod.lessons.reduce((a, l) => a + (l.duration_minutes || 0), 0), 0);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins > 0 ? `${mins}min` : ''}`;
    return `${mins}min`;
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, { es: string; en: string }> = {
      beginner: { es: 'Principiante', en: 'Beginner' },
      intermediate: { es: 'Intermedio', en: 'Intermediate' },
      advanced: { es: 'Avanzado', en: 'Advanced' },
      expert: { es: 'Experto', en: 'Expert' },
    };
    return labels[level]?.[language as 'es' | 'en'] || level;
  };

  const handleEnroll = async () => {
    if (!user) {
      toast.error(language === 'es' ? 'Inicia sesión para inscribirte' : 'Login to enroll');
      navigate('/auth');
      return;
    }
    if (!course) return;
    if (course.is_free || (course.price ?? 0) === 0) {
      await enrollFree(course.id);
    } else {
      await startCheckout(course.id, course.title, course.price ?? 0);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success(language === 'es' ? 'Enlace copiado' : 'Link copied');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <StoreNavbar />
        <div className="flex items-center justify-center pt-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <StoreNavbar />
        <div className="flex flex-col items-center justify-center pt-40 gap-4">
          <h2 className="text-xl text-white">Curso no encontrado</h2>
          <Button onClick={() => navigate('/academia/cursos')}>Volver al catálogo</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <StoreNavbar />

      {/* Hero */}
      <section className="relative pt-24 pb-8 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-slate-400 text-sm mb-6">
            <Link to="/academia" className="hover:text-white transition-colors">Academia</Link>
            <span>/</span>
            <Link to="/academia/cursos" className="hover:text-white transition-colors">{language === 'es' ? 'Cursos' : 'Courses'}</Link>
            <span>/</span>
            <span className="text-white truncate max-w-[200px]">{course.title}</span>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Badge className="bg-primary/20 text-primary border-primary/30">{course.category}</Badge>
                <Badge variant="outline" className="border-slate-600 text-slate-300">{getLevelLabel(course.level)}</Badge>
                {enrollment && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">✓ Inscrito</Badge>}
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">{course.title}</h1>
              <p className="text-lg text-slate-300 mb-6">{course.short_description || course.description}</p>

              <div className="flex flex-wrap items-center gap-4 text-sm mb-6">
                {(course.average_rating ?? 0) > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-amber-400">{course.average_rating}</span>
                    {(course.total_reviews ?? 0) > 0 && <span className="text-slate-400">({course.total_reviews})</span>}
                  </div>
                )}
                {(course.total_students ?? 0) > 0 && (
                  <div className="flex items-center gap-1 text-slate-300">
                    <Users className="w-4 h-4" />
                    <span>{(course.total_students ?? 0).toLocaleString()} estudiantes</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-slate-300">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(totalDurationMin)}</span>
                </div>
              </div>

              {course.instructor_name && (
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12 ring-2 ring-primary/50">
                    <AvatarFallback>{course.instructor_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white font-medium">{course.instructor_name}</p>
                    <p className="text-sm text-slate-400">Instructor</p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Mobile image */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:hidden relative aspect-video rounded-xl overflow-hidden">
              <img src={course.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop'} alt={course.title} className="w-full h-full object-cover" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start bg-slate-800/50 border border-slate-700 h-auto p-1">
                <TabsTrigger value="overview" className="data-[state=active]:bg-primary">{language === 'es' ? 'Descripción' : 'Overview'}</TabsTrigger>
                <TabsTrigger value="curriculum" className="data-[state=active]:bg-primary">{language === 'es' ? 'Contenido' : 'Curriculum'}</TabsTrigger>
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview" className="mt-6 space-y-6">
                {course.description && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-6">
                      <p className="text-slate-300 leading-relaxed whitespace-pre-line">{course.description}</p>
                    </CardContent>
                  </Card>
                )}

                {course.learning_objectives && course.learning_objectives.length > 0 && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-primary" />
                        {language === 'es' ? 'Lo que aprenderás' : 'What you will learn'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-3">
                        {course.learning_objectives.map((obj, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                            <span className="text-slate-300">{obj}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {course.prerequisites && course.prerequisites.length > 0 && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-400" />
                        {language === 'es' ? 'Requisitos' : 'Requirements'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {course.prerequisites.map((req, i) => (
                          <li key={i} className="flex items-center gap-2 text-slate-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/30">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                        <Sparkles className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                          {language === 'es' ? 'Tutor IA Especializado 24/7' : 'Specialized AI Tutor 24/7'}
                        </h3>
                        <p className="text-slate-300">
                          {language === 'es' 
                            ? 'Este curso incluye un chatbot de IA entrenado específicamente en el contenido del curso.'
                            : 'This course includes an AI chatbot trained specifically on course content.'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Curriculum */}
              <TabsContent value="curriculum" className="mt-6">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        {language === 'es' ? 'Contenido del curso' : 'Course content'}
                      </CardTitle>
                      <Button 
                        variant="ghost" size="sm"
                        onClick={() => setExpandedModules(expandedModules.length === modules.length ? [] : modules.map(m => m.id))}
                        className="text-slate-400 hover:text-white"
                      >
                        {expandedModules.length === modules.length ? (language === 'es' ? 'Colapsar todo' : 'Collapse all') : (language === 'es' ? 'Expandir todo' : 'Expand all')}
                      </Button>
                    </div>
                    <p className="text-sm text-slate-400">
                      {modules.length} {language === 'es' ? 'módulos' : 'modules'} • {totalLessons} {language === 'es' ? 'lecciones' : 'lessons'} • {formatDuration(totalDurationMin)}
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Accordion type="multiple" value={expandedModules} onValueChange={setExpandedModules} className="space-y-3">
                      {modules.map((module, moduleIndex) => {
                        const moduleDuration = module.lessons.reduce((a, l) => a + (l.duration_minutes || 0), 0);
                        return (
                          <AccordionItem key={module.id} value={module.id}
                            className="border border-slate-700 rounded-xl overflow-hidden data-[state=open]:bg-slate-800/50">
                            <AccordionTrigger className="px-4 py-4 hover:no-underline hover:bg-slate-700/30">
                              <div className="flex items-center gap-4 text-left w-full pr-4">
                                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary font-bold shrink-0">
                                  {moduleIndex + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-white">{module.title}</p>
                                  <p className="text-sm text-slate-400 mt-0.5">
                                    {module.lessons.length} {language === 'es' ? 'lecciones' : 'lessons'} • {formatDuration(moduleDuration)}
                                  </p>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                              {module.description && <p className="text-sm text-slate-400 mb-4 pl-14">{module.description}</p>}
                              <div className="space-y-1 pl-14">
                                {module.lessons.map((lesson) => {
                                  const LessonIcon = getLessonIcon(lesson.lesson_type);
                                  return (
                                    <div key={lesson.id} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${lesson.is_preview ? 'hover:bg-primary/10 cursor-pointer' : 'opacity-80'}`}>
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${lesson.is_preview ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-slate-400'}`}>
                                        <LessonIcon className="w-4 h-4" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-sm truncate ${lesson.is_preview ? 'text-white' : 'text-slate-300'}`}>{lesson.title}</p>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
                                        {(lesson.duration_minutes ?? 0) > 0 && <span>{formatDuration(lesson.duration_minutes ?? 0)}</span>}
                                        {lesson.is_preview ? (
                                          <Badge variant="outline" className="text-xs border-primary/50 text-primary">Preview</Badge>
                                        ) : (
                                          <Lock className="w-3.5 h-3.5" />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Purchase Card */}
          <div className="lg:col-span-1">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="sticky top-28">
              <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm overflow-hidden">
                <div className="hidden lg:block relative aspect-video">
                  <img src={course.thumbnail_url || 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop'} alt={course.title} className="w-full h-full object-cover" />
                </div>

                <CardContent className="p-6 space-y-5">
                  {/* Price */}
                  <div>
                    {course.is_free || (course.price ?? 0) === 0 ? (
                      <span className="text-3xl font-bold text-emerald-400">{language === 'es' ? 'Gratis' : 'Free'}</span>
                    ) : (
                      <span className="text-3xl font-bold text-white">€{course.price}</span>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="space-y-3">
                    {enrollment ? (
                      <Button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90" size="lg" asChild>
                        <Link to={`/academia/aprender/${course.slug}`}>
                          <Play className="w-4 h-4 mr-2" />
                          {language === 'es' ? 'Continuar aprendiendo' : 'Continue learning'}
                        </Link>
                      </Button>
                    ) : (
                      <Button 
                        className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90" 
                        size="lg"
                        onClick={handleEnroll}
                        disabled={enrollLoading}
                      >
                        {enrollLoading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <ShoppingCart className="w-4 h-4 mr-2" />
                        )}
                        {course.is_free || (course.price ?? 0) === 0
                          ? (language === 'es' ? 'Inscribirse gratis' : 'Enroll for free')
                          : (language === 'es' ? `Comprar por €${course.price}` : `Buy for €${course.price}`)}
                      </Button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => setIsWishlisted(!isWishlisted)}
                            className={`flex-1 border-slate-600 ${isWishlisted ? 'text-rose-400 border-rose-400/50' : 'text-slate-400'}`}>
                            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{language === 'es' ? 'Favoritos' : 'Wishlist'}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" onClick={handleShare} className="flex-1 border-slate-600 text-slate-400">
                            <Share2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{language === 'es' ? 'Compartir' : 'Share'}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <Separator className="bg-slate-700" />

                  {/* Includes */}
                  <div>
                    <h4 className="font-medium text-white mb-3">{language === 'es' ? 'Este curso incluye:' : 'This course includes:'}</h4>
                    <div className="space-y-2.5 text-sm">
                      <div className="flex items-center gap-3 text-slate-300"><Video className="w-4 h-4 text-slate-400 shrink-0" /><span>{formatDuration(totalDurationMin)} de contenido</span></div>
                      <div className="flex items-center gap-3 text-slate-300"><BookOpen className="w-4 h-4 text-slate-400 shrink-0" /><span>{totalLessons} lecciones</span></div>
                      <div className="flex items-center gap-3 text-slate-300"><Download className="w-4 h-4 text-slate-400 shrink-0" /><span>Recursos descargables</span></div>
                      <div className="flex items-center gap-3 text-slate-300"><Sparkles className="w-4 h-4 text-slate-400 shrink-0" /><span>Tutor IA 24/7</span></div>
                      <div className="flex items-center gap-3 text-slate-300"><Award className="w-4 h-4 text-slate-400 shrink-0" /><span>Certificado de finalización</span></div>
                      <div className="flex items-center gap-3 text-slate-300"><Infinity className="w-4 h-4 text-slate-400 shrink-0" /><span>Acceso de por vida</span></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <AcademiaAIAssistant courseContext={course.title} lessonTitle={course.title} lessonContent={course.description || ''} />
    </div>
  );
};

export default CourseDetail;
