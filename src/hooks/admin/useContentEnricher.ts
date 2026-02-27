/**
 * useContentEnricher - Hook para enriquecer el contenido del curso con OCR + IA
 * Fase 2-5 del plan de implementación
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EnrichmentJob {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  quizId?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface EnrichmentProgress {
  total: number;
  completed: number;
  current: string;
  phase: 'lessons' | 'quizzes' | 'resources' | 'datasets' | 'idle';
}

// === MAPPING: Lecciones → Sesiones OCR ===
// Based on plan.md correspondences (10 PDFs procesados: sesiones 1-5, 6-12, 14, 16-18)
const LESSON_OCR_MAP: Record<string, { sessions: number[]; contentType: 'theory' | 'mixed' }> = {
  // Bloque 0 - Fundamentos
  'Bienvenida + mapa del curso y método (Academia 3.0)': { sessions: [1], contentType: 'theory' },
  'Marco conceptual, ecuación patrimonial y masas': { sessions: [1], contentType: 'theory' },
  'Plan General de Contabilidad (PGC) y lógica de cuentas': { sessions: [2, 5], contentType: 'theory' },
  'Circuito documental y digitalización (ERP) + trazabilidad': { sessions: [2, 12], contentType: 'theory' },
  // Bloque I - Estructura contable
  'Partida doble: Debe/Haber y mecánica del asiento': { sessions: [7, 8], contentType: 'theory' },
  'Libros contables: Diario, Mayor y balance de sumas': { sessions: [7, 8], contentType: 'mixed' },
  'Ciclo contable completo (apertura→cierre) con checklist': { sessions: [7, 10, 11], contentType: 'mixed' },
  'Primer mini-proyecto: contabilidad del mes 1 (empresa simulada)': { sessions: [7, 8], contentType: 'mixed' },
  // Bloque II - Operativa diaria  
  'Compras y gastos con IVA: proveedores, descuentos y suplidos': { sessions: [3, 4, 9], contentType: 'theory' },
  'Ventas e ingresos: clientes, anticipos, devoluciones': { sessions: [3, 10], contentType: 'theory' },
  'IVA avanzado: liquidación periódica y asiento completo': { sessions: [3, 9], contentType: 'theory' },
  'Tesorería: cobros/pagos + conciliación bancaria': { sessions: [9, 14], contentType: 'mixed' },
  'Existencias: inventario, variación y deterioro': { sessions: [3, 10], contentType: 'theory' },
  // Bloque III - Activos y financiación
  'Inmovilizado: altas, bajas, mejoras y en curso': { sessions: [2, 5, 6], contentType: 'theory' },
  'Amortizaciones y deterioros: cálculo y asientos': { sessions: [2, 5], contentType: 'theory' },
  'Arrendamientos: renting vs leasing (visión práctica)': { sessions: [5], contentType: 'theory' },
  'Financiación: capital, préstamos, intereses y reclasificación': { sessions: [4, 9], contentType: 'theory' },
  // Bloque IV - Ajustes y cierre
  'Devengo y periodificaciones: gastos/ingresos anticipados': { sessions: [11, 14], contentType: 'theory' },
  'Provisiones y contingencias (visión práctica)': { sessions: [5, 14], contentType: 'theory' },
  'Cierre contable: regularización, resultado y asiento de cierre': { sessions: [10, 11, 14], contentType: 'mixed' },
  // Bloque V - Avanzada y estratégica
  'Impuesto sobre Sociedades: impuesto corriente (y noción de diferido)': { sessions: [10, 16], contentType: 'theory' },
  'Análisis de estados financieros + ratios clave (cuadro de mando)': { sessions: [12, 16, 17, 18], contentType: 'mixed' },
};

// OCR content organized by session (extracted from PDFs)
const SESSION_OCR_CONTENT: Record<number, string> = {};

export function useContentEnricher() {
  const [jobs, setJobs] = useState<EnrichmentJob[]>([]);
  const [progress, setProgress] = useState<EnrichmentProgress>({
    total: 0, completed: 0, current: '', phase: 'idle'
  });
  const [isRunning, setIsRunning] = useState(false);

  const enrichLesson = useCallback(async (
    lessonId: string,
    lessonTitle: string,
    moduleTitle: string,
    ocrContent: string
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('academia-content-enricher', {
        body: {
          action: 'enrich_lesson',
          lessonId,
          lessonTitle,
          moduleTitle,
          ocrContent
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Enrichment failed');

      return data;
    } catch (err) {
      console.error(`[useContentEnricher] Error enriching ${lessonTitle}:`, err);
      throw err;
    }
  }, []);

  const enrichQuiz = useCallback(async (
    quizId: string,
    ocrContent: string
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('academia-content-enricher', {
        body: {
          action: 'generate_quiz',
          quizId,
          ocrContent
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Quiz generation failed');

      return data;
    } catch (err) {
      console.error(`[useContentEnricher] Error enriching quiz ${quizId}:`, err);
      throw err;
    }
  }, []);

  const createResource = useCallback(async (
    courseId: string,
    ocrContent: string,
    resourceType: string
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('academia-content-enricher', {
        body: {
          action: 'create_resource',
          courseId,
          ocrContent,
          resourceType
        }
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error(`[useContentEnricher] Error creating resource:`, err);
      throw err;
    }
  }, []);

  const createSimulatorDataset = useCallback(async (
    courseId: string,
    ocrContent: string
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('academia-content-enricher', {
        body: {
          action: 'create_simulator_dataset',
          courseId,
          ocrContent
        }
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error(`[useContentEnricher] Error creating dataset:`, err);
      throw err;
    }
  }, []);

  const runFullEnrichment = useCallback(async (
    lessons: Array<{ id: string; title: string; moduleTitle: string; quizId?: string }>,
    ocrContentBySession: Record<number, string>,
    courseId: string
  ) => {
    setIsRunning(true);
    const totalJobs = lessons.length;
    
    // Initialize jobs
    const initialJobs: EnrichmentJob[] = lessons.map(l => ({
      lessonId: l.id,
      lessonTitle: l.title,
      moduleTitle: l.moduleTitle,
      quizId: l.quizId,
      status: 'pending'
    }));
    setJobs(initialJobs);

    // Phase 1: Enrich lessons
    setProgress({ total: totalJobs, completed: 0, current: 'Iniciando enriquecimiento...', phase: 'lessons' });

    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];
      const mapping = LESSON_OCR_MAP[lesson.title];
      
      if (!mapping) {
        console.warn(`No OCR mapping for: ${lesson.title}`);
        setJobs(prev => prev.map(j => 
          j.lessonId === lesson.id ? { ...j, status: 'completed' } : j
        ));
        setProgress(prev => ({ ...prev, completed: i + 1, current: `${lesson.title} (sin contenido OCR)` }));
        continue;
      }

      // Combine OCR content from mapped sessions
      const ocrContent = mapping.sessions
        .map(s => ocrContentBySession[s] || '')
        .filter(Boolean)
        .join('\n\n---\n\n');

      if (!ocrContent) {
        setJobs(prev => prev.map(j => 
          j.lessonId === lesson.id ? { ...j, status: 'completed' } : j
        ));
        setProgress(prev => ({ ...prev, completed: i + 1, current: `${lesson.title} (sin OCR)` }));
        continue;
      }

      setJobs(prev => prev.map(j => 
        j.lessonId === lesson.id ? { ...j, status: 'processing' } : j
      ));
      setProgress(prev => ({ ...prev, current: `Enriqueciendo: ${lesson.title}` }));

      try {
        await enrichLesson(lesson.id, lesson.title, lesson.moduleTitle, ocrContent);
        setJobs(prev => prev.map(j => 
          j.lessonId === lesson.id ? { ...j, status: 'completed' } : j
        ));
        toast.success(`✅ ${lesson.title}`);
      } catch (err) {
        setJobs(prev => prev.map(j => 
          j.lessonId === lesson.id ? { ...j, status: 'error', error: String(err) } : j
        ));
        toast.error(`❌ ${lesson.title}`);
      }

      setProgress(prev => ({ ...prev, completed: i + 1 }));
      
      // Rate limit: wait 2s between calls
      if (i < lessons.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Phase 2: Enrich quizzes
    setProgress({ total: totalJobs, completed: 0, current: 'Actualizando quizzes...', phase: 'quizzes' });

    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];
      if (!lesson.quizId) continue;

      const mapping = LESSON_OCR_MAP[lesson.title];
      if (!mapping) continue;

      // Get test-specific OCR content
      const ocrContent = mapping.sessions
        .map(s => ocrContentBySession[s] || '')
        .filter(Boolean)
        .join('\n\n');

      if (!ocrContent) continue;

      setProgress(prev => ({ ...prev, current: `Quiz: ${lesson.title}`, completed: i + 1 }));

      try {
        await enrichQuiz(lesson.quizId, ocrContent);
        toast.success(`✅ Quiz: ${lesson.title}`);
      } catch (err) {
        toast.error(`❌ Quiz: ${lesson.title}`);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    setProgress({ total: 0, completed: 0, current: 'Completado', phase: 'idle' });
    setIsRunning(false);
    toast.success(`Enriquecimiento completado: ${totalJobs} lecciones procesadas`);
  }, [enrichLesson, enrichQuiz]);

  return {
    jobs,
    progress,
    isRunning,
    enrichLesson,
    enrichQuiz,
    createResource,
    createSimulatorDataset,
    runFullEnrichment,
    LESSON_OCR_MAP,
  };
}

export default useContentEnricher;
