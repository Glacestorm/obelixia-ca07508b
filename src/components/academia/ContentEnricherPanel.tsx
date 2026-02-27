/**
 * ContentEnricherPanel - Panel de administración para enriquecimiento OCR→IA del curso
 * Permite ejecutar las Fases 2-5 del plan de implementación
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sparkles, RefreshCw, CheckCircle, XCircle, Clock, 
  BookOpen, FileQuestion, FileSpreadsheet, Database,
  Play, Pause, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useContentEnricher, type EnrichmentJob } from '@/hooks/admin/useContentEnricher';
import { toast } from 'sonner';

const COURSE_SLUG = 'contabilidad-empresarial-360';

export function ContentEnricherPanel() {
  const [lessons, setLessons] = useState<Array<{
    id: string; title: string; moduleTitle: string; quizId?: string;
  }>>([]);
  const [ocrBySession, setOcrBySession] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  const {
    jobs, progress, isRunning,
    enrichLesson, enrichQuiz, runFullEnrichment,
    LESSON_OCR_MAP,
  } = useContentEnricher();

  // Fetch lessons and quizzes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: courseData } = await supabase
          .from('academia_courses')
          .select('id')
          .eq('slug', COURSE_SLUG)
          .single();

        if (!courseData) return;

        const { data: lessonsData } = await supabase
          .from('academia_lessons')
          .select(`
            id, title, order_index,
            module:academia_modules!inner(title, order_index)
          `)
          .eq('course_id', courseData.id)
          .order('order_index');

        const { data: quizzesData } = await supabase
          .from('academia_quizzes')
          .select('id, lesson_id')
          .eq('course_id', courseData.id);

        const quizMap = new Map(quizzesData?.map(q => [q.lesson_id, q.id]) || []);

        const mapped = (lessonsData || []).map((l: any) => ({
          id: l.id,
          title: l.title,
          moduleTitle: (l.module as any)?.title || 'Sin módulo',
          quizId: quizMap.get(l.id),
        }));

        setLessons(mapped);
      } catch (err) {
        console.error('Error fetching lessons:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleStartEnrichment = useCallback(() => {
    if (Object.keys(ocrBySession).length === 0) {
      toast.error('Debes pegar el contenido OCR de al menos una sesión');
      return;
    }

    const courseId = 'b6ce668b-3114-522a-aec2-ca725475952c';
    runFullEnrichment(lessons, ocrBySession, courseId);
  }, [lessons, ocrBySession, runFullEnrichment]);

  const handleSingleLesson = useCallback(async (lesson: typeof lessons[0]) => {
    const mapping = LESSON_OCR_MAP[lesson.title];
    if (!mapping) {
      toast.error('No hay mapeo OCR para esta lección');
      return;
    }

    const content = mapping.sessions
      .map(s => ocrBySession[s] || '')
      .filter(Boolean)
      .join('\n\n---\n\n');

    if (!content) {
      toast.error('No hay contenido OCR para las sesiones asignadas');
      return;
    }

    try {
      await enrichLesson(lesson.id, lesson.title, lesson.moduleTitle, content);
      toast.success(`Lección "${lesson.title}" enriquecida correctamente`);
    } catch {
      toast.error(`Error enriqueciendo "${lesson.title}"`);
    }
  }, [ocrBySession, enrichLesson, LESSON_OCR_MAP]);

  const getStatusIcon = (status: EnrichmentJob['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'processing': return <RefreshCw className="h-4 w-4 text-primary animate-spin" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const progressPercent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <Card className="border-primary/20">
      <CardHeader className="bg-gradient-to-r from-primary/10 via-accent/5 to-secondary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Enriquecimiento OCR → IA</CardTitle>
              <p className="text-sm text-muted-foreground">
                Contabilidad Empresarial 360 · {lessons.length} lecciones
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isRunning ? (
              <Badge variant="secondary" className="animate-pulse">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Procesando...
              </Badge>
            ) : (
              <Button onClick={handleStartEnrichment} disabled={loading || lessons.length === 0}>
                <Play className="h-4 w-4 mr-2" />
                Ejecutar Enriquecimiento Completo
              </Button>
            )}
          </div>
        </div>

        {isRunning && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>{progress.current}</span>
              <span>{progress.completed}/{progress.total} ({progressPercent}%)</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <Badge variant="outline" className="text-xs">
              Fase: {progress.phase === 'lessons' ? '📝 Lecciones' : 
                     progress.phase === 'quizzes' ? '❓ Quizzes' :
                     progress.phase === 'resources' ? '📎 Recursos' : 
                     progress.phase === 'datasets' ? '🎯 Datasets' : '✅ Completado'}
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="text-xs">
              <BookOpen className="h-3 w-3 mr-1" />Lecciones
            </TabsTrigger>
            <TabsTrigger value="ocr" className="text-xs">
              <FileSpreadsheet className="h-3 w-3 mr-1" />OCR Input
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="text-xs">
              <FileQuestion className="h-3 w-3 mr-1" />Quizzes
            </TabsTrigger>
            <TabsTrigger value="progress" className="text-xs">
              <Database className="h-3 w-3 mr-1" />Progreso
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {lessons.map((lesson, idx) => {
                  const mapping = LESSON_OCR_MAP[lesson.title];
                  const job = jobs.find(j => j.lessonId === lesson.id);
                  const hasOcr = mapping?.sessions.some(s => ocrBySession[s]);

                  return (
                    <div key={lesson.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <span className="text-xs font-mono text-muted-foreground w-6">{idx + 1}</span>
                      {job ? getStatusIcon(job.status) : (
                        hasOcr ? <Badge variant="outline" className="text-xs">OCR</Badge> : 
                        <Badge variant="secondary" className="text-xs opacity-50">—</Badge>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{lesson.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {lesson.moduleTitle}
                          {mapping && <span className="ml-2">· Sesiones: {mapping.sessions.join(', ')}</span>}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {lesson.quizId && <Badge variant="outline" className="text-xs">Quiz</Badge>}
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleSingleLesson(lesson)}
                          disabled={isRunning || !hasOcr}
                          className="h-7 text-xs"
                        >
                          <Sparkles className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="ocr">
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-medium">Contenido OCR por Sesión</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pega el contenido OCR de cada sesión del curso original. El sistema lo mapeará automáticamente a las lecciones correspondientes.
                </p>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 6, 7, 14, 16, 17, 18].map(session => (
                    <div key={session} className="space-y-1">
                      <label className="text-sm font-medium flex items-center gap-2">
                        Sesión {session}
                        {ocrBySession[session] && (
                          <Badge variant="outline" className="text-xs">
                            {ocrBySession[session].length.toLocaleString()} chars
                          </Badge>
                        )}
                      </label>
                      <Textarea
                        placeholder={`Pega aquí el contenido OCR de la Sesión ${session}...`}
                        value={ocrBySession[session] || ''}
                        onChange={(e) => setOcrBySession(prev => ({ ...prev, [session]: e.target.value }))}
                        className="h-24 text-xs font-mono"
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="quizzes">
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {lessons.filter(l => l.quizId).map((lesson, idx) => (
                  <div key={lesson.quizId} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    <span className="text-xs font-mono text-muted-foreground w-6">{idx + 1}</span>
                    <FileQuestion className="h-4 w-4 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{lesson.title}</p>
                      <p className="text-xs text-muted-foreground">{lesson.moduleTitle}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">V/F</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="progress">
            <ScrollArea className="h-[500px]">
              {jobs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Ejecuta el enriquecimiento para ver el progreso</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {jobs.map((job) => (
                    <div key={job.lessonId} className="flex items-center gap-3 p-3 rounded-lg border">
                      {getStatusIcon(job.status)}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{job.lessonTitle}</p>
                        {job.error && <p className="text-xs text-destructive">{job.error}</p>}
                      </div>
                      <Badge variant={
                        job.status === 'completed' ? 'default' :
                        job.status === 'error' ? 'destructive' :
                        job.status === 'processing' ? 'secondary' : 'outline'
                      } className="text-xs">
                        {job.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default ContentEnricherPanel;
