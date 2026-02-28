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
// Cobertura completa: 19 sesiones (1-19, incluyendo 13, 15 y 19 generadas por IA)
const LESSON_OCR_MAP: Record<string, { sessions: number[]; contentType: 'theory' | 'mixed' }> = {
  // Bloque 0 - Fundamentos
  'Bienvenida + mapa del curso y método (Academia 3.0)': { sessions: [1], contentType: 'theory' },
  'Marco conceptual, ecuación patrimonial y masas': { sessions: [1], contentType: 'theory' },
  'Plan General de Contabilidad (PGC) y lógica de cuentas': { sessions: [2, 5], contentType: 'theory' },
  'Circuito documental y digitalización (ERP) + trazabilidad': { sessions: [2, 12, 13], contentType: 'theory' },
  // Bloque I - Estructura contable
  'Partida doble: Debe/Haber y mecánica del asiento': { sessions: [7, 8], contentType: 'theory' },
  'Libros contables: Diario, Mayor y balance de sumas': { sessions: [7, 8], contentType: 'mixed' },
  'Ciclo contable completo (apertura→cierre) con checklist': { sessions: [7, 10, 11], contentType: 'mixed' },
  'Primer mini-proyecto: contabilidad del mes 1 (empresa simulada)': { sessions: [7, 8], contentType: 'mixed' },
  // Bloque II - Operativa diaria  
  'Compras y gastos con IVA: proveedores, descuentos y suplidos': { sessions: [3, 4, 9], contentType: 'theory' },
  'Ventas e ingresos: clientes, anticipos, devoluciones': { sessions: [3, 10], contentType: 'theory' },
  'IVA avanzado: liquidación periódica y asiento completo': { sessions: [3, 9, 13], contentType: 'theory' },
  'Tesorería: cobros/pagos + conciliación bancaria': { sessions: [9, 14], contentType: 'mixed' },
  'Existencias: inventario, variación y deterioro': { sessions: [3, 10, 13], contentType: 'theory' },
  // Bloque III - Activos y financiación
  'Inmovilizado: altas, bajas, mejoras y en curso': { sessions: [2, 5, 6], contentType: 'theory' },
  'Amortizaciones y deterioros: cálculo y asientos': { sessions: [2, 5], contentType: 'theory' },
  'Arrendamientos: renting vs leasing (visión práctica)': { sessions: [5], contentType: 'theory' },
  'Financiación: capital, préstamos, intereses y reclasificación': { sessions: [4, 9], contentType: 'theory' },
  // Bloque IV - Ajustes y cierre
  'Devengo y periodificaciones: gastos/ingresos anticipados': { sessions: [11, 14], contentType: 'theory' },
  'Provisiones y contingencias (visión práctica)': { sessions: [5, 14, 15], contentType: 'theory' },
  'Cierre contable: regularización, resultado y asiento de cierre': { sessions: [10, 11, 14, 15], contentType: 'mixed' },
  // Bloque V - Avanzada y estratégica
  'Impuesto sobre Sociedades: impuesto corriente (y noción de diferido)': { sessions: [10, 16], contentType: 'theory' },
  'Análisis de estados financieros + ratios clave (cuadro de mando)': { sessions: [12, 15, 16, 17, 18], contentType: 'mixed' },
  'Contabilidad Digital 2026: IA generativa, blockchain contable y automatización fiscal': { sessions: [19], contentType: 'mixed' },
};

// OCR content organized by session (extracted from PDFs + AI-generated for sessions 13, 15, 19)
const SESSION_OCR_CONTENT: Record<number, string> = {};

// AI-generated session descriptions for sessions without PDF source
const AI_SESSION_DESCRIPTIONS: Record<number, string> = {
  13: `SESIÓN 13 – CONTABILIDAD ANALÍTICA Y DE COSTES (Contenido generado por IA – 2026)

Esta sesión cubre la contabilidad de costes moderna aplicada al contexto empresarial español 2026:

1. INTRODUCCIÓN A LA CONTABILIDAD ANALÍTICA
- Diferencia entre contabilidad financiera y analítica
- Grupo 9 del PGC 2007: Contabilidad Interna
- Objetivos de la contabilidad de costes en la empresa moderna

2. CLASIFICACIÓN DE COSTES
- Costes directos e indirectos
- Costes fijos y variables
- Costes de producción, distribución y administración
- Costes estándar vs costes reales

3. SISTEMAS DE COSTES
- Full costing (costes completos)
- Direct costing (costes variables)
- ABC Costing (Activity Based Costing) - aplicación moderna
- Costes por pedido vs costes por proceso

4. CENTROS DE COSTE
- Definición y tipología (principales, auxiliares, de estructura)
- Reparto primario y secundario
- Unidades de obra y claves de reparto
- Integración con ERP: centros de coste digitales

5. MÁRGENES Y RENTABILIDAD
- Margen de contribución unitario y total
- Punto de equilibrio (break-even point)
- Umbral de rentabilidad por producto/servicio
- Análisis coste-volumen-beneficio (CVB)

6. PRESUPUESTOS Y DESVIACIONES
- Presupuesto maestro y presupuestos operativos
- Análisis de desviaciones en costes
- Desviación en precio, en eficiencia, en volumen
- Control presupuestario con ERP

TESTS V/F:
1. La contabilidad analítica es obligatoria según el PGC 2007. (F)
2. El ABC Costing asigna costes indirectos mediante actividades. (V)
3. El punto de equilibrio se alcanza cuando el margen de contribución total iguala los costes fijos. (V)
4. Los costes variables por unidad cambian con el volumen de producción. (F)
5. Un centro de coste auxiliar presta servicios a otros centros de coste. (V)

EJERCICIOS:
- Calcular el punto de equilibrio de una empresa con costes fijos de 120.000€ y margen de contribución unitario de 15€
- Repartir costes indirectos de 80.000€ entre 3 centros de coste usando claves de reparto
- Determinar el coste de producción unitario con sistema ABC para una fábrica de muebles`,

  15: `SESIÓN 15 – AUDITORÍA Y CONTROL INTERNO (Contenido generado por IA – 2026)

Esta sesión cubre los fundamentos de auditoría y control interno para el contexto empresarial español 2026:

1. CONCEPTO Y TIPOS DE AUDITORÍA
- Auditoría externa vs interna
- Auditoría de cuentas anuales (Ley 22/2015 de Auditoría de Cuentas)
- Auditoría operativa, de gestión y de cumplimiento
- Quién está obligado a auditar según la legislación vigente 2026

2. PRINCIPIOS DE AUDITORÍA
- Normas Internacionales de Auditoría (NIA-ES)
- Independencia del auditor
- Escepticismo profesional
- Materialidad e importancia relativa
- Evidencia de auditoría: suficiencia y adecuación

3. PROCESO DE AUDITORÍA
- Planificación y evaluación de riesgos
- Ejecución: pruebas sustantivas y de cumplimiento
- Procedimientos analíticos
- Confirmaciones externas (bancos, clientes, proveedores)
- Documentación y papeles de trabajo

4. CONTROL INTERNO - MARCO COSO 2013
- Los 5 componentes del control interno (Entorno, Evaluación de Riesgos, Actividades de Control, Información/Comunicación, Supervisión)
- Segregación de funciones
- Controles de autorización y aprobación
- Controles de acceso y seguridad de la información
- Integración del control interno con ERP

5. INFORME DE AUDITORÍA
- Tipos de opinión: favorable, con salvedades, desfavorable, denegada
- Párrafos de énfasis y otras cuestiones
- Informe de auditoría y su publicación en el Registro Mercantil
- Plazos legales

6. COMPLIANCE CONTABLE Y PREVENCIÓN DE FRAUDE
- Marco normativo de compliance en España
- Responsabilidad penal de la persona jurídica (art. 31 bis CP)
- Canal de denuncias (Ley 2/2023)
- Señales de alerta de fraude contable (red flags)
- Forensic accounting y tecnología antifraude

TESTS V/F:
1. Todas las empresas españolas están obligadas a auditar sus cuentas anuales. (F)
2. El marco COSO establece 5 componentes del control interno. (V)
3. Una opinión favorable significa que las cuentas reflejan la imagen fiel en todos los aspectos materiales. (V)
4. La segregación de funciones implica que la misma persona autoriza y ejecuta una operación. (F)
5. El canal de denuncias es obligatorio para empresas de más de 50 trabajadores según la Ley 2/2023. (V)

EJERCICIOS:
- Diseñar un mapa de controles internos para el ciclo de compras de una pyme
- Evaluar la materialidad para una empresa con activos totales de 5.000.000€ y beneficio neto de 300.000€
- Identificar red flags de fraude en un caso práctico de estados financieros manipulados`,

  19: `SESIÓN 19 – CONTABILIDAD DIGITAL 2026: IA GENERATIVA, BLOCKCHAIN Y AUTOMATIZACIÓN FISCAL (Sesión extraordinaria)

Esta sesión de vanguardia posiciona al alumno en la frontera del conocimiento contable, combinando tecnología disruptiva con la práctica contable real en España 2026:

1. IA GENERATIVA APLICADA A CONTABILIDAD
- Modelos de lenguaje para clasificación automática de asientos contables
- Chatbots contables: consultas en lenguaje natural sobre el PGC 2007
- Generación automática de informes de gestión y memorias
- IA para detección de anomalías contables y prevención de fraude
- Limitaciones y riesgos: alucinaciones, sesgo, responsabilidad legal
- Caso práctico: automatizar la conciliación bancaria con IA

2. BLOCKCHAIN CONTABLE Y TRAZABILIDAD INMUTABLE
- Fundamentos de blockchain aplicados a la contabilidad triple
- Smart contracts para automatizar cobros y pagos condicionados
- Facturación programable: factura automática al cumplir condiciones
- Trazabilidad inmutable del libro diario: auditoría continua
- Tokenización de activos y su registro contable
- Caso práctico: registro de una operación de leasing en blockchain

3. AUTOMATIZACIÓN FISCAL TOTAL
- VeriFactu: sistema de verificación de facturas obligatorio 2026
- TicketBAI: sistema de control de facturación del País Vasco
- SII 2.0: evolución del Sistema Inmediato de Información
- Factura electrónica obligatoria (Ley Crea y Crece): B2B y B2G
- Integración ERP-AEAT: presentación automática de modelos tributarios
- Caso práctico: flujo completo de factura electrónica → SII → modelo 303

4. CONTABILIDAD PREDICTIVA CON MACHINE LEARNING
- Modelos de predicción de flujos de caja (cash flow forecasting)
- Scoring crediticio automático de clientes
- Detección predictiva de impagos
- Optimización de tesorería con algoritmos
- Predicción de ventas y su impacto en inventarios
- Caso práctico: construir un modelo de predicción de cobros

5. ESG Y REPORTING DE SOSTENIBILIDAD
- Directiva CSRD (Corporate Sustainability Reporting Directive)
- Estándares ESRS (European Sustainability Reporting Standards)
- Taxonomía europea de actividades sostenibles
- Doble materialidad: financiera y de impacto
- Integración del reporting ESG con la contabilidad financiera
- Caso práctico: preparar el informe de sostenibilidad de una pyme

6. CIBERSEGURIDAD CONTABLE
- Protección de datos contables (RGPD y LOPDGDD)
- Seguridad en sistemas ERP: control de accesos, logs de auditoría
- Backup y recuperación de datos contables
- Firma electrónica y certificados digitales
- Incidentes de seguridad: protocolo de actuación
- Caso práctico: diseñar la política de seguridad contable de una empresa

7. EL CONTABLE DEL FUTURO
- Evolución del rol: de registrador a analista estratégico
- Competencias digitales del contable 2026+
- Certificaciones relevantes: ACCA, CPA Digital, Data Analytics
- Herramientas imprescindibles: Python, Power BI, ERP cloud
- Ética profesional en la era de la IA
- Mapa de carrera: del junior al CFO digital

TESTS V/F:
1. VeriFactu es el sistema de verificación de facturas obligatorio en España desde 2026. (V)
2. La blockchain contable elimina la necesidad de auditoría externa. (F)
3. La Directiva CSRD obliga a todas las pymes a presentar informe de sostenibilidad. (F)
4. Los smart contracts pueden automatizar pagos al cumplirse condiciones predefinidas. (V)
5. La IA generativa puede sustituir completamente al contable humano. (F)
6. El SII exige el envío de facturas a la AEAT en un plazo máximo de 4 días. (V)
7. La doble materialidad considera tanto el impacto financiero como el impacto ambiental/social. (V)
8. La tokenización de activos permite fraccionar la propiedad de un inmueble. (V)

EJERCICIOS:
- Diseñar el flujo completo de facturación electrónica B2B de una empresa usando VeriFactu + SII
- Automatizar la clasificación de 100 asientos contables usando reglas de IA
- Preparar el borrador de un informe ESG con los indicadores ESRS obligatorios
- Calcular el ROI de implementar un sistema de contabilidad predictiva en una pyme`,
};

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

      // Combine OCR content from mapped sessions + AI descriptions for generated sessions
      const ocrContent = mapping.sessions
        .map(s => ocrContentBySession[s] || AI_SESSION_DESCRIPTIONS[s] || '')
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

      // Get test-specific OCR content + AI descriptions fallback
      const ocrContent = mapping.sessions
        .map(s => ocrContentBySession[s] || AI_SESSION_DESCRIPTIONS[s] || '')
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
