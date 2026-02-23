/**
 * LearningPlayer - Reproductor de contenido dinámico con control de acceso
 * Carga datos reales desde la base de datos, requiere inscripción activa
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Menu, X, FileText, Download, 
  CheckCircle, Layers, MessageSquare, Trophy, Loader2, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useAcademiaEnrollment } from '@/hooks/academia/useAcademiaEnrollment';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import {
  VideoPlayer,
  LessonSidebar,
  NotesPanel,
  ResourcesPanel,
  AITutorPanel,
  QuizPlayer,
  type Module,
  type Resource,
} from '@/components/academia/learning-player';
import { GamificationMiniWidget } from '@/components/academia/GamificationMiniWidget';
import { AccountingSimulator } from '@/components/academia/simulator/AccountingSimulator';
import { NewsFeed } from '@/components/academia/news/NewsFeed';

interface DBQuizQuestion {
  id: string;
  question_text: string;
  options: any;
  correct_answer: string | null;
  explanation: string | null;
  order_index: number | null;
}

const LearningPlayer: React.FC = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { enrollment, checkEnrollment } = useAcademiaEnrollment();
  
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseSlug, setCourseSlug] = useState('');
  const [realCourseId, setRealCourseId] = useState('');
  const [modules, setModules] = useState<Module[]>([]);
  const [lessonContents, setLessonContents] = useState<Record<string, string>>({});
  const [resources, setResources] = useState<Resource[]>([]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentLessonId, setCurrentLessonId] = useState('');
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [rightPanelTab, setRightPanelTab] = useState<string>('simulator');
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [showContent, setShowContent] = useState(false);
  const [currentDatasetId, setCurrentDatasetId] = useState<string | undefined>(undefined);

  // Load dataset for current lesson if exists
  useEffect(() => {
    const loadLessonDataset = async () => {
        if (!currentLessonId) return;
        const { data } = await supabase
            .from('academia_simulator_datasets')
            .select('id')
            .eq('lesson_id', currentLessonId)
            .maybeSingle();
        setCurrentDatasetId(data?.id);
    };
    loadLessonDataset();
  }, [currentLessonId]);

  // Load course data and check access
  useEffect(() => {
    const loadCourse = async () => {
      if (!courseId || !user?.id) {
        setAccessDenied(true);
        setIsLoading(false);
        return;
      }

      try {
        // Find course by slug or id
        let courseData: any = null;
        const { data: bySlug } = await supabase
          .from('academia_courses')
          .select('id, title, slug')
          .eq('slug', courseId)
          .maybeSingle();

        if (bySlug) {
          courseData = bySlug;
        } else {
          const { data: byId } = await supabase
            .from('academia_courses')
            .select('id, title, slug')
            .eq('id', courseId)
            .maybeSingle();
          courseData = byId;
        }

        if (!courseData) {
          navigate('/academia/cursos');
          return;
        }

        setCourseTitle(courseData.title);
        setCourseSlug(courseData.slug);
        setRealCourseId(courseData.id);

        // Check enrollment
        const enrollmentData = await checkEnrollment(courseData.id);
        if (!enrollmentData) {
          setAccessDenied(true);
          setIsLoading(false);
          return;
        }

        // Load modules & lessons
        const { data: modulesData } = await supabase
          .from('academia_modules')
          .select('id, title, order_index')
          .eq('course_id', courseData.id)
          .order('order_index');

        const { data: lessonsData } = await supabase
          .from('academia_lessons')
          .select('id, title, duration_minutes, lesson_type, is_preview, order_index, module_id, content, resources')
          .eq('course_id', courseData.id)
          .order('order_index');

        // Load progress
        const { data: progressData } = await supabase
          .from('academia_lesson_progress')
          .select('lesson_id, status')
          .eq('user_id', user.id)
          .eq('course_id', courseData.id);

        const completedIds = (progressData || [])
          .filter((p: any) => p.status === 'completed')
          .map((p: any) => p.lesson_id);
        setCompletedLessons(completedIds);

        // Build content map
        const contentMap: Record<string, string> = {};
        (lessonsData || []).forEach((l: any) => {
          if (l.content) contentMap[l.id] = l.content;
        });
        setLessonContents(contentMap);

        // Build modules
        const mods: Module[] = (modulesData || []).map((m: any) => ({
          id: m.id,
          title: m.title,
          lessons: (lessonsData || [])
            .filter((l: any) => l.module_id === m.id)
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((l: any) => ({
              id: l.id,
              title: l.title,
              duration: (l.duration_minutes || 0) * 60,
              completed: completedIds.includes(l.id),
              type: l.lesson_type || 'video',
              isFree: l.is_preview || false,
            })),
        }));

        setModules(mods);

        // Set first uncompleted lesson as current
        const allLessons = mods.flatMap(m => m.lessons);
        const firstUncompleted = allLessons.find(l => !completedIds.includes(l.id));
        if (firstUncompleted) {
          setCurrentLessonId(firstUncompleted.id);
        } else if (allLessons.length > 0) {
          setCurrentLessonId(allLessons[0].id);
        }

        // Build resources from lesson resources field
        const res: Resource[] = [];
        (lessonsData || []).forEach((l: any) => {
          if (l.resources && Array.isArray(l.resources)) {
            l.resources.forEach((r: any, i: number) => {
              res.push({
                id: `${l.id}-res-${i}`,
                title: r.title || r.name || 'Recurso',
                type: r.type || 'doc',
                url: r.url || '#',
                size: r.size || '',
                lessonId: l.id,
              });
            });
          }
        });
        setResources(res);

      } catch (err) {
        console.error('[LearningPlayer] Error loading course:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCourse();
  }, [courseId, user?.id]);

  const allLessons = useMemo(() => modules.flatMap(m => m.lessons), [modules]);
  const currentLessonIndex = useMemo(() => allLessons.findIndex(l => l.id === currentLessonId), [allLessons, currentLessonId]);
  const currentLesson = allLessons[currentLessonIndex];
  const currentModule = useMemo(() => modules.find(m => m.lessons.some(l => l.id === currentLessonId)), [modules, currentLessonId]);
  const courseProgress = useMemo(() => {
    if (allLessons.length === 0) return 0;
    return Math.round((completedLessons.length / allLessons.length) * 100);
  }, [allLessons.length, completedLessons.length]);

  const currentContent = lessonContents[currentLessonId] || '';

  // Load quiz questions when selecting quiz lesson
  const loadQuiz = useCallback(async (lessonId: string) => {
    try {
      const { data: quizData } = await supabase
        .from('academia_quizzes')
        .select('id, title, passing_score')
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (!quizData) return;

      const { data: questionsData } = await supabase
        .from('academia_quiz_questions')
        .select('id, question_text, options, correct_answer, explanation, order_index')
        .eq('quiz_id', quizData.id)
        .order('order_index');

      const questions = (questionsData || []).map((q: any) => {
        const opts = Array.isArray(q.options) ? q.options : [];
        const correctIdx = opts.findIndex((o: any) => o.isCorrect === true);
        return {
          id: q.id,
          question: q.question_text,
          options: opts.map((o: any) => o.text || o),
          correctIndex: correctIdx >= 0 ? correctIdx : 0,
          explanation: q.explanation || '',
        };
      });
      setQuizQuestions(questions);
    } catch (err) {
      console.error('[LearningPlayer] Error loading quiz:', err);
    }
  }, []);

  const handleLessonSelect = useCallback((lessonId: string) => {
    const lesson = allLessons.find(l => l.id === lessonId);
    if (lesson?.type === 'quiz') {
      setShowQuiz(true);
      setShowContent(false);
      loadQuiz(lessonId);
    } else if (lesson?.type === 'reading' || lessonContents[lessonId]) {
      setShowQuiz(false);
      setShowContent(true);
    } else {
      setShowQuiz(false);
      setShowContent(false);
    }
    setCurrentLessonId(lessonId);
    setCurrentVideoTime(0);
  }, [allLessons, loadQuiz, lessonContents]);

  const handleMarkComplete = useCallback(async () => {
    if (!completedLessons.includes(currentLessonId) && user?.id && realCourseId) {
      setCompletedLessons(prev => [...prev, currentLessonId]);
      toast.success(language === 'es' ? 'Lección completada' : 'Lesson completed');
      
      // Save progress to DB
      try {
        await supabase.from('academia_lesson_progress').upsert({
          user_id: user.id,
          course_id: realCourseId,
          lesson_id: currentLessonId,
          status: 'completed',
          completed_at: new Date().toISOString(),
        }, { onConflict: 'user_id,lesson_id' });

        // Update enrollment progress
        const newProgress = Math.round(((completedLessons.length + 1) / allLessons.length) * 100);
        await supabase.from('academia_enrollments')
          .update({ progress_percentage: newProgress, last_accessed_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('course_id', realCourseId);
      } catch (err) {
        console.error('[LearningPlayer] Error saving progress:', err);
      }
    }
  }, [completedLessons, currentLessonId, user?.id, realCourseId, allLessons.length, language]);

  const handlePreviousLesson = useCallback(() => {
    if (currentLessonIndex > 0) handleLessonSelect(allLessons[currentLessonIndex - 1].id);
  }, [currentLessonIndex, allLessons, handleLessonSelect]);

  const handleNextLesson = useCallback(() => {
    if (currentLessonIndex < allLessons.length - 1) handleLessonSelect(allLessons[currentLessonIndex + 1].id);
  }, [currentLessonIndex, allLessons, handleLessonSelect]);

  const handleVideoComplete = useCallback(() => {
    handleMarkComplete();
    setTimeout(() => {
      if (currentLessonIndex < allLessons.length - 1) handleNextLesson();
    }, 2000);
  }, [handleMarkComplete, currentLessonIndex, allLessons.length, handleNextLesson]);

  const handleQuizComplete = useCallback((score: number, passed: boolean) => {
    if (passed) handleMarkComplete();
    toast[passed ? 'success' : 'info'](
      passed ? '¡Excelente! Has aprobado el quiz' : 'Necesitas más práctica'
    );
  }, [handleMarkComplete]);

  const handleTimestampClick = useCallback((lessonId: string, timestamp: number) => {
    if (lessonId !== currentLessonId) handleLessonSelect(lessonId);
    setCurrentVideoTime(timestamp);
  }, [currentLessonId, handleLessonSelect]);

  const modulesWithProgress = useMemo(() => 
    modules.map(module => ({
      ...module,
      lessons: module.lessons.map(lesson => ({
        ...lesson,
        completed: completedLessons.includes(lesson.id),
      })),
    })),
  [modules, completedLessons]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Access denied
  if (accessDenied || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <Lock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3">
            {language === 'es' ? 'Acceso restringido' : 'Access restricted'}
          </h2>
          <p className="text-slate-400 mb-6">
            {language === 'es' 
              ? 'Necesitas estar inscrito en este curso para acceder al contenido.'
              : 'You need to be enrolled in this course to access the content.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild variant="outline" className="border-slate-600 text-white">
              <Link to={`/academia/curso/${courseSlug || courseId}`}>
                {language === 'es' ? 'Ver detalles del curso' : 'View course details'}
              </Link>
            </Button>
            {!user && (
              <Button asChild>
                <Link to="/auth">{language === 'es' ? 'Iniciar sesión' : 'Sign in'}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 text-slate-400 hover:text-white bg-slate-900/80 backdrop-blur">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[350px] p-0 bg-slate-900 border-slate-800">
          <LessonSidebar
            courseTitle={courseTitle}
            progress={courseProgress}
            modules={modulesWithProgress}
            currentLessonId={currentLessonId}
            isOpen={true}
            onLessonSelect={handleLessonSelect}
            backUrl="/academia/cursos"
            backLabel={language === 'es' ? 'Volver al catálogo' : 'Back to catalog'}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 380 : 0 }}
        className="hidden lg:block bg-slate-900 border-r border-slate-800 overflow-hidden flex-shrink-0"
      >
        <div className="w-[380px] h-screen">
          <LessonSidebar
            courseTitle={courseTitle}
            progress={courseProgress}
            modules={modulesWithProgress}
            currentLessonId={currentLessonId}
            isOpen={sidebarOpen}
            onLessonSelect={handleLessonSelect}
            backUrl="/academia/cursos"
            backLabel={language === 'es' ? 'Volver al catálogo' : 'Back to catalog'}
          />
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden lg:flex text-slate-400 hover:text-white">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate">{currentLesson?.title}</p>
            <p className="text-xs text-slate-500 truncate">{currentModule?.title}</p>
          </div>
          <Badge variant="outline" className="border-slate-700 text-slate-400 hidden sm:flex">
            {language === 'es' ? `Lección ${currentLessonIndex + 1} de ${allLessons.length}` : `Lesson ${currentLessonIndex + 1} of ${allLessons.length}`}
          </Badge>
          <Button variant="ghost" size="icon" onClick={() => setShowRightPanel(!showRightPanel)} className={`text-slate-400 hover:text-white ${showRightPanel ? 'bg-slate-800' : ''}`}>
            <Layers className="w-5 h-5" />
          </Button>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0">
            <AnimatePresence mode="wait">
              {showQuiz && currentLesson?.type === 'quiz' ? (
                <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-auto">
                  <QuizPlayer
                    quizId={currentLesson.id}
                    title={currentLesson.title}
                    questions={quizQuestions}
                    passingScore={70}
                    onComplete={handleQuizComplete}
                    onRetry={() => setShowQuiz(true)}
                  />
                </motion.div>
              ) : currentContent ? (
                <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-auto">
                  <div className="max-w-3xl mx-auto p-6 md:p-10">
                    <div className="prose prose-invert prose-lg max-w-none
                      prose-headings:text-white prose-p:text-slate-300 prose-strong:text-white
                      prose-ul:text-slate-300 prose-ol:text-slate-300
                      prose-a:text-primary prose-code:text-primary
                      prose-blockquote:border-primary/50 prose-blockquote:text-slate-400
                      prose-table:text-slate-300 prose-th:text-white prose-td:text-slate-300
                      prose-hr:border-slate-700">
                      <ReactMarkdown>{currentContent}</ReactMarkdown>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="video" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1">
                  <VideoPlayer
                    title={currentLesson?.title || ''}
                    onComplete={handleVideoComplete}
                    onTimeUpdate={(time) => setCurrentVideoTime(time)}
                    onPrevious={currentLessonIndex > 0 ? handlePreviousLesson : undefined}
                    onNext={currentLessonIndex < allLessons.length - 1 ? handleNextLesson : undefined}
                    hasPrevious={currentLessonIndex > 0}
                    hasNext={currentLessonIndex < allLessons.length - 1}
                    autoPlay={false}
                    startTime={currentVideoTime}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <footer className="h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-4">
              <Button variant="ghost" className="text-slate-400 hover:text-white gap-2" onClick={handlePreviousLesson} disabled={currentLessonIndex === 0}>
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{language === 'es' ? 'Anterior' : 'Previous'}</span>
              </Button>
              <Button className="gap-2" onClick={handleMarkComplete} disabled={completedLessons.includes(currentLessonId)}
                variant={completedLessons.includes(currentLessonId) ? 'secondary' : 'default'}>
                <CheckCircle className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {completedLessons.includes(currentLessonId) ? (language === 'es' ? 'Completado' : 'Completed') : (language === 'es' ? 'Marcar como completado' : 'Mark as completed')}
                </span>
              </Button>
              <Button variant="ghost" className="text-slate-400 hover:text-white gap-2" onClick={handleNextLesson} disabled={currentLessonIndex === allLessons.length - 1}>
                <span className="hidden sm:inline">{language === 'es' ? 'Siguiente' : 'Next'}</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </footer>
          </div>

          {/* Right Panel */}
          <AnimatePresence>
            {showRightPanel && (
              <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 400, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                className="bg-slate-900 border-l border-slate-800 overflow-hidden hidden md:block">
                <div className="w-[400px] h-full flex flex-col">
                  <Tabs value={rightPanelTab} onValueChange={setRightPanelTab} className="flex-1 flex flex-col">
                    <TabsList className="grid w-full grid-cols-4 m-2 mx-4">
                      <TabsTrigger value="notes" className="text-xs gap-1"><FileText className="w-3 h-3" /><span className="hidden lg:inline">{language === 'es' ? 'Notas' : 'Notes'}</span></TabsTrigger>
                      <TabsTrigger value="resources" className="text-xs gap-1"><Download className="w-3 h-3" /><span className="hidden lg:inline">{language === 'es' ? 'Recursos' : 'Resources'}</span></TabsTrigger>
                      <TabsTrigger value="ai" className="text-xs gap-1"><MessageSquare className="w-3 h-3" /><span className="hidden lg:inline">Tutor</span></TabsTrigger>
                      <TabsTrigger value="progress" className="text-xs gap-1"><Trophy className="w-3 h-3" /><span className="hidden lg:inline">{language === 'es' ? 'Logros' : 'Progress'}</span></TabsTrigger>
                    </TabsList>
                    <TabsContent value="notes" className="flex-1 m-0 overflow-hidden">
                      <NotesPanel courseId={realCourseId || courseId || ''} currentLessonId={currentLessonId} currentLessonTitle={currentLesson?.title || ''} currentVideoTime={currentVideoTime} onTimestampClick={handleTimestampClick} />
                    </TabsContent>
                    <TabsContent value="resources" className="flex-1 m-0 overflow-hidden">
                      <ResourcesPanel resources={resources} currentLessonId={currentLessonId} showAllResources={true} />
                    </TabsContent>
                    <TabsContent value="ai" className="flex-1 m-0 overflow-hidden">
                      <AITutorPanel courseId={realCourseId || courseId || ''} currentLessonId={currentLessonId} currentLessonTitle={currentLesson?.title || ''} courseTitle={courseTitle} courseTopic={courseTitle} />
                    </TabsContent>
                    <TabsContent value="progress" className="flex-1 m-0 overflow-auto p-4">
                      <GamificationMiniWidget courseProgress={courseProgress} showCertificateButton={courseProgress >= 100} />
                    </TabsContent>
                  </Tabs>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Right Panel */}
      <Sheet open={showRightPanel} onOpenChange={setShowRightPanel}>
        <SheetContent side="right" className="w-full sm:w-[400px] p-0 bg-slate-900 border-slate-800 md:hidden">
          <Tabs value={rightPanelTab} onValueChange={setRightPanelTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 m-2 mx-4">
              <TabsTrigger value="notes" className="text-xs gap-1"><FileText className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="resources" className="text-xs gap-1"><Download className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="ai" className="text-xs gap-1"><MessageSquare className="w-3 h-3" /></TabsTrigger>
              <TabsTrigger value="progress" className="text-xs gap-1"><Trophy className="w-3 h-3" /></TabsTrigger>
            </TabsList>
            <TabsContent value="notes" className="flex-1 m-0 overflow-hidden">
              <NotesPanel courseId={realCourseId || courseId || ''} currentLessonId={currentLessonId} currentLessonTitle={currentLesson?.title || ''} currentVideoTime={currentVideoTime} onTimestampClick={handleTimestampClick} />
            </TabsContent>
            <TabsContent value="resources" className="flex-1 m-0 overflow-hidden">
              <ResourcesPanel resources={resources} currentLessonId={currentLessonId} showAllResources={true} />
            </TabsContent>
            <TabsContent value="ai" className="flex-1 m-0 overflow-hidden">
              <AITutorPanel courseId={realCourseId || courseId || ''} currentLessonId={currentLessonId} currentLessonTitle={currentLesson?.title || ''} courseTitle={courseTitle} courseTopic={courseTitle} />
            </TabsContent>
            <TabsContent value="progress" className="flex-1 m-0 overflow-auto p-4">
              <GamificationMiniWidget courseProgress={courseProgress} showCertificateButton={courseProgress >= 100} />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default LearningPlayer;
