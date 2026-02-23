import { useState, useEffect, useCallback } from 'react';
import { generateCsvContent } from './nicheExampleGenerators';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Wallet, TrendingUp, FileSpreadsheet, Briefcase, Building2, Award,
  Check, Plus, Target, Download, BookOpen, Calculator, BarChart3,
  PieChart, Table2, LineChart, Shield, GraduationCap, Lightbulb,
  ClipboardList, DollarSign, Landmark, ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

// === EXAMPLE RESOURCES PER NICHE ===
interface NicheExample {
  title: string;
  type: 'excel' | 'calculator' | 'checklist' | 'template' | 'case_study' | 'quiz' | 'guide';
  description: string;
  difficulty: 'básico' | 'intermedio' | 'avanzado';
}

const NICHE_EXAMPLES: Record<string, NicheExample[]> = {
  personal_finance: [
    { title: 'Plantilla Presupuesto Mensual 50/30/20', type: 'excel', description: 'Excel con regla 50/30/20 automatizada, gráficos de distribución y seguimiento mensual de gastos vs ingresos.', difficulty: 'básico' },
    { title: 'Calculadora de Fondo de Emergencia', type: 'calculator', description: 'Calcula cuántos meses de gastos necesitas ahorrar según tu situación familiar, laboral y nivel de riesgo.', difficulty: 'básico' },
    { title: 'Simulador Eliminación de Deudas (Bola de Nieve vs Avalancha)', type: 'excel', description: 'Compara método bola de nieve y avalancha con tus deudas reales. Proyecta fechas de liberación y ahorro en intereses.', difficulty: 'intermedio' },
    { title: 'Checklist: Auditoría Financiera Personal', type: 'checklist', description: '25 puntos para revisar tu salud financiera: seguros, testamento, beneficiarios, suscripciones innecesarias, etc.', difficulty: 'básico' },
    { title: 'Plantilla Planificación Jubilación', type: 'excel', description: 'Proyecta tu patrimonio futuro con inflación, rentabilidad esperada y diferentes escenarios de ahorro mensual.', difficulty: 'avanzado' },
    { title: 'Dashboard Patrimonio Neto Personal', type: 'excel', description: 'Seguimiento trimestral de activos (inmuebles, inversiones, efectivo) vs pasivos (hipoteca, préstamos, tarjetas).', difficulty: 'intermedio' },
    { title: 'Guía: Los 7 Hábitos del Ahorrador Eficaz', type: 'guide', description: 'Documento con los principios psicológicos del ahorro, automatización de finanzas y técnicas de behavioral finance.', difficulty: 'básico' },
    { title: 'Caso Práctico: Familia García - Reestructuración Financiera', type: 'case_study', description: 'Caso real de una familia con ingresos de 3.500€/mes, 15.000€ en deudas. Plan de 18 meses para sanear finanzas.', difficulty: 'intermedio' },
  ],
  investment: [
    { title: 'Simulador de Interés Compuesto con Aportaciones', type: 'excel', description: 'Visualiza el crecimiento de tu inversión a 10, 20 y 30 años con diferentes tasas y aportaciones mensuales.', difficulty: 'básico' },
    { title: 'Calculadora Asset Allocation por Perfil de Riesgo', type: 'calculator', description: 'Test de 15 preguntas que determina tu perfil inversor y sugiere distribución óptima entre renta fija, variable y alternativa.', difficulty: 'intermedio' },
    { title: 'Plantilla Análisis de Fondos Indexados', type: 'excel', description: 'Compara TER, tracking error, patrimonio y rentabilidad histórica de los principales fondos indexados europeos.', difficulty: 'intermedio' },
    { title: 'Excel Comparativa Broker Online', type: 'excel', description: 'Tabla comparativa de 15 brokers: comisiones, productos, regulación, fiscalidad y facilidad de uso.', difficulty: 'básico' },
    { title: 'Simulador Rebalanceo de Cartera', type: 'excel', description: 'Introduce tu cartera actual y tu asset allocation objetivo. El Excel calcula automáticamente qué comprar/vender.', difficulty: 'avanzado' },
    { title: 'Checklist: Antes de Invertir en un Producto Financiero', type: 'checklist', description: '20 preguntas que debes hacerte antes de invertir: liquidez, riesgo, fiscalidad, conflictos de interés del vendedor.', difficulty: 'básico' },
    { title: 'Quiz: Sesgos Cognitivos del Inversor', type: 'quiz', description: '15 escenarios reales para identificar tus sesgos: anclaje, aversión a pérdidas, efecto manada, sobreconfianza.', difficulty: 'intermedio' },
    { title: 'Caso: Portfolio de María - De 0€ a 100.000€ en 10 años', type: 'case_study', description: 'Caso real de inversora con 500€/mes, cartera 80/20 indexada. Evolución, crisis de 2020 y lecciones aprendidas.', difficulty: 'intermedio' },
    { title: 'Plantilla Fiscalidad de Inversiones España', type: 'excel', description: 'Calcula retenciones, ganancias patrimoniales y compensación de pérdidas según normativa IRPF vigente.', difficulty: 'avanzado' },
  ],
  excel_finance: [
    { title: 'Dashboard Financiero Completo en Excel', type: 'excel', description: 'Dashboard con P&L, Balance, Cash Flow y 12 KPIs clave. Gráficos dinámicos, tablas pivotantes y slicers.', difficulty: 'avanzado' },
    { title: 'Plantilla Modelo Financiero 3-Statement', type: 'excel', description: 'Modelo integrado de Estado de Resultados, Balance y Flujo de Caja con proyecciones a 5 años vinculadas.', difficulty: 'avanzado' },
    { title: 'Excel: 50 Fórmulas Financieras Esenciales', type: 'template', description: 'Libro con VAN, TIR, TIRM, PMT, NPER, TASA, PRECIO, RENDTO y 42 fórmulas más con ejemplos prácticos.', difficulty: 'intermedio' },
    { title: 'Plantilla Control de Gastos Empresarial', type: 'excel', description: 'Registro de gastos por categoría, centro de coste y proyecto. Alertas automáticas de desviación presupuestaria.', difficulty: 'intermedio' },
    { title: 'Simulador de Escenarios (What-If Analysis)', type: 'excel', description: 'Template con tablas de datos, Solver y escenarios para análisis de sensibilidad en modelos financieros.', difficulty: 'avanzado' },
    { title: 'Macro VBA: Conciliación Bancaria Automática', type: 'template', description: 'Macro que cruza extracto bancario con libro de contabilidad e identifica descuadres automáticamente.', difficulty: 'avanzado' },
    { title: 'Google Sheets: Dashboard de Inversiones en Tiempo Real', type: 'template', description: 'Sheet conectada a Google Finance con cotizaciones en tiempo real, P&L por posición y alertas de precio.', difficulty: 'intermedio' },
    { title: 'Plantilla Facturación y Control de Cobros', type: 'excel', description: 'Genera facturas, controla vencimientos, calcula IVA/IRPF y envía alertas de cobros pendientes >30 días.', difficulty: 'básico' },
    { title: 'Caso: Automatizar Reporting Mensual con Power Query', type: 'case_study', description: 'Cómo reducir 8 horas de reporting manual a 15 minutos con Power Query y tablas dinámicas conectadas.', difficulty: 'avanzado' },
  ],
  entrepreneurs: [
    { title: 'Plantilla Cash Flow Proyectado 12 Meses', type: 'excel', description: 'Proyección de flujo de caja mensual con cobros, pagos, IVA y escenarios optimista/pesimista. Alerta de tensiones de tesorería.', difficulty: 'intermedio' },
    { title: 'Calculadora Unit Economics (CAC/LTV/Payback)', type: 'calculator', description: 'Calcula tu coste de adquisición, valor de vida del cliente, ratio LTV/CAC y período de recuperación por canal.', difficulty: 'intermedio' },
    { title: 'Excel Pricing Strategy: Cost-Plus vs Value-Based', type: 'excel', description: 'Herramienta para fijar precios analizando costes directos, indirectos, margen objetivo y disposición a pagar del mercado.', difficulty: 'intermedio' },
    { title: 'Plantilla Modelo de Negocio Financiero (Canvas + Números)', type: 'template', description: 'Business Model Canvas con proyecciones financieras vinculadas: ingresos por segmento, estructura de costes y break-even.', difficulty: 'básico' },
    { title: 'Simulador Break-Even y Punto de Equilibrio', type: 'calculator', description: 'Calcula cuántas unidades/clientes necesitas para cubrir costes fijos. Análisis de sensibilidad con variación de precio y coste.', difficulty: 'básico' },
    { title: 'Checklist: Métricas SaaS que Todo Fundador Debe Conocer', type: 'checklist', description: 'MRR, ARR, Churn, NRR, Rule of 40, Burn Multiple, Magic Number y 8 métricas más con benchmarks por sector.', difficulty: 'intermedio' },
    { title: 'Plantilla Pitch Deck Financiero para Inversores', type: 'template', description: 'Slides de proyecciones financieras, uso de fondos, cap table y escenarios de exit para rondas de inversión.', difficulty: 'avanzado' },
    { title: 'Caso: De 0 a 50K€ MRR - Métricas de un SaaS B2B', type: 'case_study', description: 'Evolución real de un SaaS español: CAC por canal, cohort analysis, churn por segmento y decisiones clave de pricing.', difficulty: 'avanzado' },
    { title: 'Excel Control de Márgenes por Producto/Servicio', type: 'excel', description: 'Análisis de rentabilidad por línea de producto con costes directos, indirectos imputados y margen de contribución.', difficulty: 'intermedio' },
  ],
  corporate: [
    { title: 'Modelo DCF (Descuento de Flujos de Caja)', type: 'excel', description: 'Valoración por DCF completa: FCFF, WACC, valor terminal (Gordon/Exit Multiple), análisis de sensibilidad WACC vs g.', difficulty: 'avanzado' },
    { title: 'Calculadora WACC (Coste Medio Ponderado de Capital)', type: 'calculator', description: 'Calcula WACC con CAPM, beta apalancada/desapalancada, prima de riesgo país, y coste de deuda después de impuestos.', difficulty: 'avanzado' },
    { title: 'Plantilla Análisis de Estados Financieros', type: 'excel', description: 'Análisis horizontal, vertical y ratios (liquidez, solvencia, rentabilidad, eficiencia) de los últimos 5 ejercicios.', difficulty: 'intermedio' },
    { title: 'Excel Valoración por Múltiplos Comparables', type: 'excel', description: 'Tabla de comparables con EV/EBITDA, P/E, P/B y EV/Revenue. Cálculo de prima/descuento vs sector.', difficulty: 'avanzado' },
    { title: 'Simulador LBO (Leveraged Buyout)', type: 'excel', description: 'Modelo LBO simplificado: estructura de deuda (Senior/Mezzanine), calendario de amortización y TIR para el sponsor.', difficulty: 'avanzado' },
    { title: 'Checklist Due Diligence Financiera', type: 'checklist', description: '50 puntos de revisión para M&A: calidad de beneficios, normalización de EBITDA, working capital, contingencias.', difficulty: 'avanzado' },
    { title: 'Plantilla Presupuesto Anual Corporativo', type: 'excel', description: 'Presupuesto departamental bottom-up con consolidación, desviaciones mensuales y forecast rolling.', difficulty: 'intermedio' },
    { title: 'Caso: Valoración de Inditex - Análisis Completo', type: 'case_study', description: 'Caso práctico de valoración: análisis de negocio, DCF, múltiplos, football field y recomendación de inversión.', difficulty: 'avanzado' },
    { title: 'Quiz: Interpretación de Estados Financieros', type: 'quiz', description: '20 preguntas con estados financieros reales. Identifica red flags, manipulación contable y calidad de beneficios.', difficulty: 'intermedio' },
  ],
  certifications: [
    { title: 'Simulacro CFA Level I - Quantitative Methods', type: 'quiz', description: '60 preguntas tipo examen con explicaciones detalladas. Cubre estadística, valor temporal del dinero y probabilidad.', difficulty: 'avanzado' },
    { title: 'Formulario Resumen CFA Level I (todas las fórmulas)', type: 'template', description: 'Las 180+ fórmulas esenciales organizadas por área: Economics, FRA, Corporate Finance, Equity, Fixed Income, Derivatives.', difficulty: 'avanzado' },
    { title: 'Plantilla Plan de Estudio CFA (300 horas)', type: 'template', description: 'Planificación semanal de 6 meses con pesos por tema, hitos de revisión y simulacros. Adaptable a tu disponibilidad.', difficulty: 'intermedio' },
    { title: 'Excel Práctica FRM - Cálculos de VaR y Expected Shortfall', type: 'excel', description: 'Ejercicios prácticos de VaR paramétrico, histórico y Monte Carlo con datos reales de mercado.', difficulty: 'avanzado' },
    { title: 'Simulacro EFPA EIP - 50 Preguntas', type: 'quiz', description: 'Test de práctica con preguntas de fiscalidad española, productos financieros, MiFID II y planificación patrimonial.', difficulty: 'intermedio' },
    { title: 'Flashcards: Ética CFA (Standards of Professional Conduct)', type: 'template', description: '90 flashcards con escenarios éticos y la respuesta correcta según el Code of Ethics and Standards del CFA Institute.', difficulty: 'avanzado' },
    { title: 'Checklist: Requisitos y Plazos de Inscripción', type: 'checklist', description: 'Fechas de inscripción, requisitos de elegibilidad, tasas y documentación necesaria para CFA, FRM y EFPA.', difficulty: 'básico' },
    { title: 'Caso: Mi Experiencia Aprobando el CFA en 18 meses', type: 'case_study', description: 'Testimonio detallado: horas de estudio por tema, recursos utilizados, errores comunes y estrategias de examen.', difficulty: 'intermedio' },
  ],
};

const TYPE_ICONS: Record<string, typeof FileSpreadsheet> = {
  excel: FileSpreadsheet,
  calculator: Calculator,
  checklist: ClipboardList,
  template: BookOpen,
  case_study: Lightbulb,
  quiz: GraduationCap,
  guide: Shield,
};

const TYPE_LABELS: Record<string, string> = {
  excel: 'Excel',
  calculator: 'Calculadora',
  checklist: 'Checklist',
  template: 'Plantilla',
  case_study: 'Caso Práctico',
  quiz: 'Quiz',
  guide: 'Guía',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  'básico': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'intermedio': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'avanzado': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const NICHES = [
  { id: 'personal_finance', label: 'Finanzas Personales', icon: Wallet, color: 'from-green-500 to-emerald-500', desc: 'Presupuesto, deudas, ahorro, hábitos, planificación' },
  { id: 'investment', label: 'Inversión Educativa', icon: TrendingUp, color: 'from-blue-500 to-cyan-500', desc: 'Riesgo, diversificación, productos, sesgos, plan' },
  { id: 'excel_finance', label: 'Excel/Sheets Financiero', icon: FileSpreadsheet, color: 'from-emerald-500 to-teal-500', desc: 'Plantillas, modelos, dashboards financieros' },
  { id: 'entrepreneurs', label: 'Finanzas Emprendedores', icon: Briefcase, color: 'from-amber-500 to-orange-500', desc: 'Cashflow, pricing, margen, unit economics' },
  { id: 'corporate', label: 'Finanzas Corporativas', icon: Building2, color: 'from-violet-500 to-purple-500', desc: 'Valoración, WACC, análisis estados, M&A' },
  { id: 'certifications', label: 'Certificaciones', icon: Award, color: 'from-rose-500 to-pink-500', desc: 'CFA, FRM, EFPA - preparación rigurosa' },
];

interface CourseNiche {
  courseId: string;
  courseTitle: string;
  niche: string | null;
}

export function NicheConfigPanel() {
  const [courses, setCourses] = useState<CourseNiche[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [expandedNiche, setExpandedNiche] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('academia_courses')
      .select('id, title, niche')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setCourses(data.map(c => ({ courseId: c.id, courseTitle: c.title, niche: c.niche })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const assignNiche = async (courseId: string, niche: string) => {
    const { error } = await supabase
      .from('academia_courses')
      .update({ niche } as any)
      .eq('id', courseId);
    if (error) { toast.error('Error al asignar nicho'); return; }
    toast.success('Nicho asignado');
    setCourses(prev => prev.map(c => c.courseId === courseId ? { ...c, niche } : c));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
          <Target className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Configuración de Nichos</h2>
          <p className="text-sm text-muted-foreground">Define el nicho de cada curso para maximizar conversiones</p>
        </div>
      </div>

      {/* Niche Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {NICHES.map((niche) => {
          const count = courses.filter(c => c.niche === niche.id).length;
          const examples = NICHE_EXAMPLES[niche.id] || [];
          const isExpanded = expandedNiche === niche.id;

          return (
            <Card
              key={niche.id}
              className={cn(
                "transition-all hover:shadow-lg",
                selectedNiche === niche.id && "ring-2 ring-primary",
                isExpanded && "md:col-span-2 lg:col-span-3"
              )}
            >
              <CardContent className="p-5">
                <div
                  className="cursor-pointer"
                  onClick={() => setSelectedNiche(selectedNiche === niche.id ? null : niche.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${niche.color}`}>
                      <niche.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{count} cursos</Badge>
                      <Badge variant="outline" className="text-xs">{examples.length} ejemplos</Badge>
                    </div>
                  </div>
                  <h3 className="font-semibold">{niche.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{niche.desc}</p>
                </div>

                {/* Toggle examples */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-3 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedNiche(isExpanded ? null : niche.id);
                  }}
                >
                  {isExpanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                  {isExpanded ? 'Ocultar ejemplos' : `Ver ${examples.length} recursos de ejemplo`}
                </Button>

                {/* Expanded examples */}
                {isExpanded && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      <p className="text-sm font-medium">Recursos y ejemplos incluidos</p>
                    </div>

                    {/* Group by type */}
                    <Tabs defaultValue="all" className="w-full">
                      <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50">
                        <TabsTrigger value="all" className="text-xs">Todos ({examples.length})</TabsTrigger>
                        {['excel', 'calculator', 'template', 'checklist', 'case_study', 'quiz', 'guide'].map(type => {
                          const typeCount = examples.filter(e => e.type === type).length;
                          if (typeCount === 0) return null;
                          return (
                            <TabsTrigger key={type} value={type} className="text-xs">
                              {TYPE_LABELS[type]} ({typeCount})
                            </TabsTrigger>
                          );
                        })}
                      </TabsList>

                      <TabsContent value="all" className="mt-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {examples.map((ex, idx) => (
                            <ExampleCard key={idx} example={ex} />
                          ))}
                        </div>
                      </TabsContent>

                      {['excel', 'calculator', 'template', 'checklist', 'case_study', 'quiz', 'guide'].map(type => (
                        <TabsContent key={type} value={type} className="mt-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {examples.filter(e => e.type === type).map((ex, idx) => (
                              <ExampleCard key={idx} example={ex} />
                            ))}
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Course Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Asignar Nicho a Cursos</CardTitle>
          <CardDescription>Selecciona un nicho arriba y asígnalo a tus cursos</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando cursos...</p>
          ) : courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay cursos creados aún</p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {courses.map((course) => (
                  <div key={course.courseId} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{course.courseTitle}</p>
                      {course.niche && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {NICHES.find(n => n.id === course.niche)?.label || course.niche}
                        </Badge>
                      )}
                    </div>
                    {selectedNiche && (
                      <Button
                        size="sm"
                        variant={course.niche === selectedNiche ? "default" : "outline"}
                        onClick={() => assignNiche(course.courseId, selectedNiche)}
                      >
                        {course.niche === selectedNiche ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function generateExampleFile(example: NicheExample) {
  const { title, type, description, difficulty } = example;
  
  if (type === 'excel' || type === 'calculator') {
    // Use professional CSV generators
    const csvString = generateCsvContent(title);
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${slugify(title)}.csv`);
  } else if (type === 'checklist') {
    const content = generateChecklistContent(title, description, difficulty);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    downloadBlob(blob, `${slugify(title)}.md`);
  } else if (type === 'quiz') {
    const content = generateQuizContent(title, description, difficulty);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    downloadBlob(blob, `${slugify(title)}.md`);
  } else if (type === 'case_study') {
    const content = generateCaseStudyContent(title, description, difficulty);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    downloadBlob(blob, `${slugify(title)}.md`);
  } else if (type === 'guide') {
    const content = generateGuideContent(title, description, difficulty);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    downloadBlob(blob, `${slugify(title)}.md`);
  } else {
    const content = generateTemplateContent(title, description, difficulty);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    downloadBlob(blob, `${slugify(title)}.md`);
  }
  
  toast.success(`"${title}" descargado correctamente`);
}

// === PROFESSIONAL MARKDOWN GENERATORS ===

function generateChecklistContent(title: string, description: string, difficulty: string): string {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('auditoría financiera personal')) {
    return `# ✅ ${title}\n**Nivel:** ${difficulty}\n\n${description}\n\n## A. INGRESOS Y GASTOS\n- [ ] 1. ¿Conoces exactamente tu ingreso neto mensual (tras impuestos y SS)?\n- [ ] 2. ¿Tienes un presupuesto mensual escrito y actualizado?\n- [ ] 3. ¿Revisas tus gastos bancarios al menos 1 vez al mes?\n- [ ] 4. ¿Has cancelado suscripciones que no usas en los últimos 3 meses?\n- [ ] 5. ¿Tu ratio gastos fijos / ingresos es inferior al 50%?\n\n## B. AHORRO Y FONDO DE EMERGENCIA\n- [ ] 6. ¿Tienes un fondo de emergencia de al menos 3 meses de gastos?\n- [ ] 7. ¿El fondo está en una cuenta separada de tu cuenta corriente?\n- [ ] 8. ¿Ahorras automáticamente al menos un 10% de tu ingreso neto?\n- [ ] 9. ¿Tienes un objetivo de ahorro definido con fecha?\n- [ ] 10. ¿Has definido tu "número de libertad financiera"?\n\n## C. DEUDAS\n- [ ] 11. ¿Conoces el saldo exacto de TODAS tus deudas?\n- [ ] 12. ¿Conoces el TAE (no solo el TIN) de cada deuda?\n- [ ] 13. ¿Tu ratio deuda/ingresos es inferior al 35%?\n- [ ] 14. ¿Tienes un plan de eliminación de deudas (avalancha o bola de nieve)?\n- [ ] 15. ¿Has renegociado condiciones bancarias en los últimos 12 meses?\n\n## D. SEGUROS Y PROTECCIÓN\n- [ ] 16. ¿Tienes seguro de vida si tienes dependientes económicos?\n- [ ] 17. ¿Tienes seguro de salud privado o complementario?\n- [ ] 18. ¿Tu seguro de hogar está actualizado al valor real?\n- [ ] 19. ¿Tienes seguro de responsabilidad civil?\n- [ ] 20. ¿Has revisado coberturas y beneficiarios en el último año?\n\n## E. PLANIFICACIÓN Y DOCUMENTOS\n- [ ] 21. ¿Tienes testamento actualizado?\n- [ ] 22. ¿Tu pareja/familia sabe dónde están tus documentos financieros?\n- [ ] 23. ¿Tienes un archivo digital seguro con contraseñas financieras?\n- [ ] 24. ¿Has hecho tu declaración de la renta optimizando deducciones?\n- [ ] 25. ¿Tienes un plan de inversión a largo plazo documentado?\n\n---\n**Puntuación:**\n- 20-25 ✅: Salud financiera excelente\n- 15-19 ✅: Buena base, mejora puntos débiles\n- 10-14 ✅: Necesitas acción urgente en varias áreas\n- <10 ✅: Prioridad máxima: construye fundamentos\n`;
  }

  if (lowerTitle.includes('due diligence')) {
    return `# ✅ ${title}\n**Nivel:** ${difficulty}\n\n${description}\n\n## 1. CALIDAD DE BENEFICIOS\n- [ ] Reconciliar EBITDA reportado vs EBITDA ajustado\n- [ ] Identificar partidas extraordinarias / no recurrentes\n- [ ] Analizar política de reconocimiento de ingresos\n- [ ] Verificar cut-off de ingresos en cierre de ejercicio\n- [ ] Comprobar evolución del margen bruto (3-5 años)\n- [ ] Detectar cambios en políticas contables recientes\n- [ ] Normalizar salarios de propietarios/directivos\n- [ ] Ajustar gastos de alquiler a valor de mercado\n- [ ] Identificar ingresos/gastos entre partes vinculadas\n- [ ] Verificar consistencia de márgenes por línea de negocio\n\n## 2. WORKING CAPITAL\n- [ ] Analizar evolución del capital circulante (3 años)\n- [ ] Calcular días de cobro (DSO) y tendencia\n- [ ] Calcular días de pago (DPO) y tendencia\n- [ ] Calcular días de inventario (DIO) y tendencia\n- [ ] Identificar estacionalidad en working capital\n- [ ] Detectar deudores de cobro dudoso\n- [ ] Verificar provisiones de inventario obsoleto\n- [ ] Analizar dependencia de clientes (concentración >10%)\n- [ ] Revisar condiciones de pago a proveedores clave\n- [ ] Estimar necesidad de WC normalizado para la transacción\n\n## 3. DEUDA Y ESTRUCTURA FINANCIERA\n- [ ] Listar toda la deuda financiera (incluyendo avales/garantías)\n- [ ] Verificar cumplimiento de covenants bancarios\n- [ ] Identificar deuda oculta (leasing, factoring, confirming)\n- [ ] Analizar vencimientos de deuda y refinanciación necesaria\n- [ ] Revisar cláusulas de cambio de control (change of control)\n- [ ] Calcular deuda neta ajustada para la transacción\n\n## 4. FISCAL Y CONTINGENCIAS\n- [ ] Verificar declaraciones de IVA, IS e IRPF (últimos 4 años)\n- [ ] Identificar inspecciones fiscales abiertas o previstas\n- [ ] Revisar precios de transferencia si hay grupo\n- [ ] Analizar contingencias laborales (demandas, ERE)\n- [ ] Revisar contingencias medioambientales\n- [ ] Identificar litigios en curso y provisiones\n- [ ] Verificar cumplimiento de LOPD/RGPD\n\n## 5. ACTIVOS Y CAPEX\n- [ ] Verificar titularidad de activos inmobiliarios\n- [ ] Analizar estado y antigüedad del inmovilizado material\n- [ ] Distinguir CAPEX de mantenimiento vs crecimiento\n- [ ] Revisar política de amortización vs vida útil real\n- [ ] Identificar activos no operativos\n- [ ] Valorar intangibles (marcas, patentes, software)\n`;
  }

  if (lowerTitle.includes('antes de invertir')) {
    return `# ✅ ${title}\n**Nivel:** ${difficulty}\n\n${description}\n\n## COMPRENSIÓN DEL PRODUCTO\n- [ ] 1. ¿Puedes explicar en 2 frases cómo genera dinero este producto?\n- [ ] 2. ¿Has leído el folleto/KID completo del producto?\n- [ ] 3. ¿Conoces TODAS las comisiones (gestión, custodia, éxito, entrada/salida)?\n- [ ] 4. ¿Sabes cuál es la fiscalidad de este producto en tu país?\n- [ ] 5. ¿Conoces la liquidez (en cuántos días puedes recuperar tu dinero)?\n\n## RIESGO\n- [ ] 6. ¿Cuál es la pérdida máxima histórica (máximo drawdown) de este producto?\n- [ ] 7. ¿Cuánto puedes permitirte perder SIN que afecte a tu vida diaria?\n- [ ] 8. ¿Has comprobado que está regulado por un supervisor (CNMV, BaFin, SEC)?\n- [ ] 9. ¿Entiendes la diferencia entre riesgo de mercado, crédito y liquidez?\n- [ ] 10. ¿Has verificado la calificación crediticia del emisor (si aplica)?\n\n## CONFLICTOS DE INTERÉS\n- [ ] 11. ¿Quién te ha recomendado este producto? ¿Cobra comisión por vendértelo?\n- [ ] 12. ¿Es un producto de la propia entidad o de un tercero independiente?\n- [ ] 13. ¿Has comparado con al menos 3 alternativas similares?\n- [ ] 14. ¿Has buscado opiniones independientes (no de la propia entidad)?\n- [ ] 15. ¿El asesor tiene las certificaciones requeridas (MiFID II)?\n\n## ENCAJE EN TU CARTERA\n- [ ] 16. ¿Este producto encaja con tu perfil de riesgo documentado?\n- [ ] 17. ¿Cuánto % de tu cartera total representará esta inversión?\n- [ ] 18. ¿Estás diversificando o concentrando riesgo?\n- [ ] 19. ¿Tienes un horizonte temporal definido para esta inversión?\n- [ ] 20. ¿Tienes un plan de salida (stop-loss, take-profit, rebalanceo)?\n\n---\n⚠️ **Regla de oro:** Si no puedes responder SÍ a las preguntas 1, 2 y 8, NO inviertas.\n`;
  }

  if (lowerTitle.includes('métricas saas')) {
    return `# ✅ ${title}\n**Nivel:** ${difficulty}\n\n${description}\n\n## MÉTRICAS DE INGRESOS\n- [ ] **MRR** (Monthly Recurring Revenue): Ingresos recurrentes mensuales → Meta: crecimiento >10% MoM en fase temprana\n- [ ] **ARR** (Annual Recurring Revenue): MRR × 12 → Métrica principal para inversores\n- [ ] **NRR** (Net Revenue Retention): Ingresos de la misma cohorte año vs año → Benchmark: >100%, ideal >120%\n- [ ] **ARPU** (Average Revenue Per User): ARR / nº clientes → ¿Estás vendiendo a los clientes correctos?\n\n## MÉTRICAS DE CRECIMIENTO\n- [ ] **Growth Rate** (MoM / YoY): Velocidad de crecimiento → Benchmark: T2D3 (triple, triple, double, double, double)\n- [ ] **Quick Ratio**: (New MRR + Expansion) / (Churn + Contraction) → Benchmark: >4x\n- [ ] **Magic Number**: Net New ARR / S&M del trimestre anterior → Benchmark: >0.75\n\n## MÉTRICAS DE EFICIENCIA\n- [ ] **CAC** (Customer Acquisition Cost): Gasto total S&M / nuevos clientes → ¿Puedes adquirir de forma rentable?\n- [ ] **LTV** (Lifetime Value): ARPU × Margen bruto / Churn rate → Benchmark: LTV/CAC > 3x\n- [ ] **Payback Period**: CAC / (ARPU × Margen bruto mensual) → Benchmark: <18 meses\n- [ ] **Rule of 40**: Growth rate + Profit margin → Benchmark: suma >40%\n- [ ] **Burn Multiple**: Net Burn / Net New ARR → Benchmark: <2x\n\n## MÉTRICAS DE RETENCIÓN\n- [ ] **Gross Churn**: MRR perdido / MRR inicio mes → Benchmark: <2% mensual\n- [ ] **Logo Churn**: Clientes perdidos / clientes inicio mes → ¿Estás perdiendo los correctos?\n- [ ] **Expansion Revenue %**: % MRR que viene de upsell/cross-sell → Benchmark: >30% del crecimiento\n\n## MÉTRICAS DE PRODUCTO\n- [ ] **DAU/MAU**: Ratio de engagement → Benchmark: >20% para B2B\n- [ ] **Activation Rate**: % usuarios que completan onboarding → Detecta fricción temprana\n- [ ] **Time to Value**: Tiempo hasta que el usuario obtiene valor → Cuanto menor, mejor\n`;
  }

  // Generic checklist
  return `# ✅ ${title}\n**Nivel:** ${difficulty}\n\n${description}\n\n## Checklist\n${Array.from({length: 15}, (_, i) => `- [ ] ${i + 1}. Punto de verificación ${i + 1}`).join('\n')}\n`;
}

function generateQuizContent(title: string, description: string, difficulty: string): string {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes('sesgos cognitivos')) {
    return `# 🧠 ${title}\n**Nivel:** ${difficulty}\n\n${description}\n\n---\n\n### Pregunta 1: Anclaje\nHas comprado acciones de Telefónica a 5,20€. Ahora cotizan a 3,80€. Un analista rebaja el precio objetivo a 3,50€. ¿Qué haces?\n\na) Mantienes porque "ya se recuperará al precio que pagaste"\nb) Vendes inmediatamente\nc) Analizas los fundamentales actuales sin considerar tu precio de compra\nd) Compras más para "promediar a la baja"\n\n**Respuesta correcta:** c)\n**Explicación:** La opción a) es el **sesgo de anclaje**: tu precio de compra es irrelevante para el valor futuro de la acción. La opción d) combina anclaje con **falacia del coste hundido**. Lo correcto es evaluar la inversión como si NO la tuvieras.\n\n---\n\n### Pregunta 2: Aversión a Pérdidas\nTu cartera tiene dos posiciones: Acción A con +40% de ganancia y Acción B con -30% de pérdida. Necesitas liquidez y debes vender una. ¿Cuál vendes?\n\na) Acción A (así "aseguras" la ganancia)\nb) Acción B (para cortar pérdidas)\nc) La que tenga peores perspectivas futuras, independientemente de la ganancia/pérdida\nd) Mitad de cada una\n\n**Respuesta correcta:** c)\n**Explicación:** Vender la ganadora y mantener la perdedora es el **efecto disposición** (Shefrin & Statman, 1985). La decisión correcta depende SOLO de las perspectivas futuras. El precio al que compraste es irrelevante.\n\n---\n\n### Pregunta 3: Efecto Manada\nTodos tus amigos están invirtiendo en un fondo temático de IA que ha subido un 85% en el último año. ¿Qué haces?\n\na) Inviertes inmediatamente para no "perderte la subida"\nb) Investigas fundamentales, valoración y riesgos antes de decidir\nc) No inviertes porque "seguro que ya ha subido demasiado"\nd) Inviertes la mitad "por si acaso"\n\n**Respuesta correcta:** b)\n**Explicación:** La opción a) es **efecto manada** (FOMO). La c) es el **sesgo de representatividad inversa**. La d) es un compromiso irracional. Solo b) aplica un proceso de inversión disciplinado.\n\n---\n\n### Pregunta 4: Sobreconfianza\nLlevas 6 meses invirtiendo y has obtenido +25% de rentabilidad en un mercado alcista. ¿Qué conclusión es más acertada?\n\na) "Tengo talento natural para invertir"\nb) "Mi estrategia es superior al mercado"\nc) "El mercado alcista ha impulsado mis resultados; debo evaluar en un ciclo completo"\nd) "Debo apalancarme para ganar más"\n\n**Respuesta correcta:** c)\n**Explicación:** Atribuir resultados a tu habilidad en un mercado alcista es **sesgo de sobreconfianza** y **sesgo de atribución**. Los estudios muestran que los inversores sobreconfiados operan más y obtienen peores resultados netos (Barber & Odean, 2001).\n\n---\n\n### Pregunta 5: Sesgo de Confirmación\nHas decidido invertir en Bitcoin. Al investigar, ¿cuál es el comportamiento más peligroso?\n\na) Leer solo artículos positivos sobre Bitcoin\nb) Buscar activamente argumentos EN CONTRA de tu tesis\nc) Preguntar a expertos con opiniones diversas\nd) Establecer un criterio de invalidación antes de invertir\n\n**Respuesta correcta:** a)\n**Explicación:** Buscar solo información que confirma tu tesis es el **sesgo de confirmación**. Las opciones b), c) y d) son antídotos contra este sesgo. Charlie Munger: "Invierto tu argumento. Busca siempre lo que puede salir mal."\n`;
  }

  if (lowerTitle.includes('estados financieros')) {
    return `# 📊 ${title}\n**Nivel:** ${difficulty}\n\n${description}\n\n---\n\n### Pregunta 1\nUna empresa muestra ingresos crecientes del 15% anual pero su flujo de caja operativo ha CAÍDO un 20%. ¿Qué puede estar pasando?\n\na) La empresa está creciendo de forma saludable\nb) Posible deterioro en calidad de ingresos (ventas a crédito agresivas, inventario creciente)\nc) Es normal en empresas en crecimiento\nd) Error contable\n\n**Respuesta correcta:** b)\n**Explicación:** Cuando ingresos y cash flow divergen significativamente, es una **red flag de calidad de beneficios**. Revisar: ¿Ha crecido el DSO (días de cobro)? ¿Ha crecido el inventario más que las ventas? ¿Hay cambios en política de reconocimiento de ingresos?\n\n---\n\n### Pregunta 2\nEl margen EBITDA de una empresa es 25% pero su margen de flujo de caja libre es solo 5%. ¿Cuál es la causa más probable?\n\na) Alta eficiencia operativa\nb) Elevadas necesidades de CAPEX y/o capital circulante\nc) Bajos impuestos\nd) No hay problema, EBITDA es la métrica correcta\n\n**Respuesta correcta:** b)\n**Explicación:** EBITDA ignora CAPEX, cambios en working capital e impuestos. Una brecha grande entre EBITDA y FCF indica que la empresa necesita reinvertir mucho para mantener operaciones. "EBITDA is not cash flow" - Warren Buffett.\n\n---\n\n### Pregunta 3\nUna empresa tiene Ratio Corriente de 2,5 pero Ratio Rápido (Acid Test) de 0,4. ¿Qué indica?\n\na) Excelente liquidez\nb) La mayor parte del activo corriente está en inventario (posible problema de liquidez real)\nc) Demasiado efectivo ocioso\nd) Gestión eficiente del working capital\n\n**Respuesta correcta:** b)\n**Explicación:** La diferencia entre Ratio Corriente y Rápido = inventario. Un ratio rápido de 0,4 significa que sin vender inventario, la empresa NO puede pagar sus deudas a corto plazo. Esto es crítico en sectores con inventario de lenta rotación.\n`;
  }

  // Generic quiz
  return `# 📝 ${title}\n**Nivel:** ${difficulty}\n\n${description}\n\n${Array.from({length: 5}, (_, i) => `### Pregunta ${i+1}\n¿Pregunta de ejemplo ${i+1}?\n\na) Opción A\nb) Opción B\nc) Opción C\nd) Opción D\n\n**Respuesta correcta:** c)\n**Explicación:** Justificación detallada.\n\n---\n`).join('\n')}\n`;
}

function generateCaseStudyContent(title: string, description: string, difficulty: string): string {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes('familia garcía')) {
    return `# 📋 ${title}\n**Nivel:** ${difficulty}\n\n## Situación Inicial\n\n**Familia:** Carlos (38) y Laura (36), 2 hijos (8 y 5 años)\n**Ingresos netos combinados:** 3.500 €/mes\n**Deudas totales:** 15.230 €\n\n### Desglose de Deudas\n| Deuda | Saldo | TAE | Cuota mensual |\n|-------|-------|-----|---------------|\n| Tarjeta Visa | 3.800€ | 22,0% | 95€ |\n| Tarjeta Mastercard | 2.200€ | 19,5% | 55€ |\n| Préstamo electrodomésticos | 1.730€ | 12,0% | 85€ |\n| Préstamo coche | 7.500€ | 6,5% | 280€ |\n| **Total** | **15.230€** | - | **515€** |\n\n### Gastos Mensuales Actuales\n| Categoría | Importe | % Ingresos |\n|-----------|---------|------------|\n| Alquiler | 900€ | 25,7% |\n| Alimentación | 550€ | 15,7% |\n| Colegios + actividades | 320€ | 9,1% |\n| Cuotas deuda | 515€ | 14,7% |\n| Transporte | 180€ | 5,1% |\n| Seguros | 120€ | 3,4% |\n| Servicios (luz, agua, internet) | 195€ | 5,6% |\n| Ocio y restaurantes | 380€ | 10,9% |\n| Ropa y cuidado personal | 150€ | 4,3% |\n| Suscripciones | 85€ | 2,4% |\n| **Total Gastos** | **3.395€** | **97,0%** |\n| **Margen disponible** | **105€** | **3,0%** |\n\n## Diagnóstico\n\n🔴 **Problemas identificados:**\n1. Ratio deuda/ingresos del 14,7% (solo cuotas, sin hipoteca)\n2. Margen de ahorro de solo 3% (objetivo mínimo: 10%)\n3. Sin fondo de emergencia\n4. Tarjetas a TAE >19%: están pagando ~1.100€/año solo en intereses\n5. Gasto en ocio (10,9%) desproporcionado para su situación\n\n## Plan de Reestructuración (18 meses)\n\n### Fase 1: Estabilización (Meses 1-3)\n- Reducir ocio de 380€ a 200€ → Ahorro: 180€/mes\n- Cancelar suscripciones no esenciales: 45€/mes\n- Renegociar seguro coche y hogar: 25€/mes\n- **Nuevo margen disponible: 355€/mes**\n- Crear mini fondo de emergencia: 1.000€ (3 meses)\n\n### Fase 2: Ataque a Deudas (Meses 4-14)\nMétodo Avalancha (mayor interés primero):\n- Mes 4-7: Eliminar Tarjeta Visa (3.800€ a 22% TAE)\n- Mes 8-10: Eliminar Tarjeta Mastercard (2.200€ a 19,5%)\n- Mes 11-12: Eliminar Préstamo electrodomésticos (1.730€ a 12%)\n- Meses 13+: Pago normal coche (ya sin presión de deuda tóxica)\n\n### Fase 3: Construcción (Meses 15-18)\n- Deuda tóxica: 0€ ✅\n- Fondo de emergencia: 3.500€ (1 mes de gastos) ✅\n- Inicio ahorro sistemático: 300€/mes en fondo indexado\n- Nuevo presupuesto 50/30/20 funcional\n\n## Resultado Proyectado (Mes 18)\n| Métrica | Antes | Después |\n|---------|-------|----------|\n| Deuda tóxica | 7.730€ | 0€ |\n| Intereses anuales pagados | 1.100€ | 0€ |\n| Fondo de emergencia | 0€ | 3.500€ |\n| Ahorro mensual | 105€ | 655€ |\n| Ratio ahorro | 3% | 18,7% |\n`;
  }

  if (lowerTitle.includes('inditex') || lowerTitle.includes('valoración')) {
    return `# 📋 ${title}\n**Nivel:** ${difficulty}\n\n${description}\n\n## 1. Análisis de Negocio\n\n**Modelo:** Fast fashion integrado verticalmente\n**Marcas:** Zara (>70% ingresos), Pull&Bear, Massimo Dutti, Bershka, Stradivarius, Oysho\n**Presencia:** >5.800 tiendas en 96 mercados + ecommerce en 215 mercados\n\n### Ventajas Competitivas (Moat)\n1. **Modelo integrado:** Diseño-producción-distribución en 2-3 semanas (vs 6 meses competidores)\n2. **Data-driven:** Reposición basada en ventas reales, no predicciones\n3. **Baja publicidad:** <1% ventas vs 3-5% competidores. La tienda ES el marketing\n4. **Ubicaciones premium:** Difícil de replicar\n\n## 2. Análisis Financiero (Datos FY2024)\n| Métrica | Valor |\n|---------|-------|\n| Ingresos | 35.900M€ |\n| EBITDA | 10.100M€ |\n| Margen EBITDA | 28,1% |\n| Beneficio Neto | 5.700M€ |\n| Free Cash Flow | 5.200M€ |\n| Deuda Neta | -11.400M€ (caja neta) |\n| ROE | 28,5% |\n| ROIC | 42,3% |\n\n## 3. Valoración por DCF\n| Supuesto | Valor |\n|----------|-------|\n| WACC | 8,5% |\n| Crecimiento ventas (5 años) | 7% CAGR |\n| Margen EBITDA terminal | 27% |\n| Tasa crecimiento terminal | 2,5% |\n| **Valor empresa (EV)** | **155.000M€** |\n| (-) Deuda neta | -11.400M€ |\n| **Valor equity** | **166.400M€** |\n| **Precio objetivo/acción** | **53,2€** |\n\n## 4. Valoración por Múltiplos\n| Múltiplo | Inditex | Media sector | Prima/Descuento |\n|----------|---------|-------------|------------------|\n| EV/EBITDA | 15,3x | 11,2x | +37% prima |\n| P/E | 27,1x | 20,5x | +32% prima |\n| EV/Revenue | 4,3x | 2,1x | +105% prima |\n\n**Justificación de la prima:** ROIC superior (42% vs 15% media), crecimiento sostenido, caja neta, modelo de negocio defensivo.\n`;
  }

  // Generic case study
  return `# 📋 ${title}\n**Nivel:** ${difficulty}\n\n## Contexto\n${description}\n\n## Datos del Caso\n- Situación inicial: [Descripción detallada]\n- Objetivo: [Meta a alcanzar]\n- Restricciones: [Limitaciones]\n\n## Análisis\n1. ¿Cuál es el diagnóstico?\n2. ¿Qué alternativas existen?\n3. ¿Cuál es tu recomendación?\n\n## Solución Propuesta\n_Completa tu análisis antes de ver la solución._\n`;
}

function generateGuideContent(title: string, description: string, difficulty: string): string {
  if (title.toLowerCase().includes('7 hábitos') || title.toLowerCase().includes('ahorrador')) {
    return `# 📖 ${title}\n**Nivel:** ${difficulty}\n\n${description}\n\n---\n\n## Hábito 1: Págate a Ti Mismo Primero\n\n> "No ahorres lo que te sobra después de gastar; gasta lo que te sobra después de ahorrar." — Warren Buffett\n\n**Cómo implementarlo:**\n- Configura una transferencia automática el día 1 de cada mes\n- Destina al menos el 10% de tu ingreso neto\n- Usa una cuenta separada que NO tenga tarjeta asociada\n\n**Psicología detrás:** El "sesgo del status quo" trabaja a tu favor: una vez automatizado, la inercia mantiene el hábito.\n\n## Hábito 2: Conoce Tu Número\n\nCalcula tu **"Freedom Number"**: la cantidad que necesitas para que tus inversiones cubran tus gastos.\n\n**Fórmula:** Gastos anuales × 25 (regla del 4%)\n- Si gastas 2.000€/mes → necesitas 600.000€\n- Si gastas 3.000€/mes → necesitas 900.000€\n\n## Hábito 3: La Regla de las 48 Horas\n\nPara cualquier compra no esencial >100€, espera 48 horas antes de comprar.\n\n**Resultado esperado:** Eliminarás el 60-70% de compras impulsivas (estudio Journal of Consumer Research, 2019).\n\n## Hábito 4: Auditoría Mensual de 15 Minutos\n\nEl día 1 de cada mes, revisa:\n1. ¿Cuánto gasté el mes anterior? (vs presupuesto)\n2. ¿Cuánto ahorré? (vs objetivo)\n3. ¿Hay suscripciones que no uso?\n4. ¿Mi patrimonio neto subió o bajó?\n\n## Hábito 5: El Principio del Coste de Oportunidad\n\nAntes de cada compra, pregúntate: "¿Cuánto valdrá esto invertido en 10 años?"\n\n**Ejemplo:** Un gasto de 200€/mes en comidas fuera = 2.400€/año\nInvertido al 7% durante 20 años = **98.500€**\n\n## Hábito 6: Diversifica Tus Fuentes de Ingreso\n\nNo dependas de un solo salario. Explora:\n- Inversiones que generen dividendos o rentas\n- Un proyecto paralelo (side hustle) alineado con tus skills\n- Formación continua que aumente tu valor en el mercado\n\n## Hábito 7: Edúcate Financieramente (1 hora/semana)\n\n**Lecturas recomendadas:**\n- "El inversor inteligente" - Benjamin Graham\n- "Padre rico, padre pobre" - Robert Kiyosaki\n- "Un paso por delante de Wall Street" - Peter Lynch\n- "The Psychology of Money" - Morgan Housel\n\n---\n\n## Implementación: Plan de 30 Días\n\n| Semana | Acción |\n|--------|--------|\n| 1 | Automatizar ahorro + calcular Freedom Number |\n| 2 | Auditoría de gastos + cancelar suscripciones |\n| 3 | Implementar regla 48h + abrir cuenta inversión |\n| 4 | Primera inversión automática + lectura semanal |\n`;
  }

  return `# 📖 ${title}\n**Nivel:** ${difficulty}\n\n${description}\n\n## 1. Introducción\nEsta guía cubre los conceptos fundamentales.\n\n## 2. Conceptos Clave\n- Concepto A\n- Concepto B\n- Concepto C\n\n## 3. Paso a Paso\n1. Primer paso\n2. Segundo paso\n3. Tercer paso\n\n## 4. Errores Comunes\n- Error 1: Explicación\n- Error 2: Explicación\n\n## 5. Recursos Adicionales\n- Recurso 1\n- Recurso 2\n`;
}

function generateTemplateContent(title: string, description: string, difficulty: string): string {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes('50 fórmulas') || lowerTitle.includes('fórmulas financieras')) {
    return `# 📐 ${title}\n**Nivel:** ${difficulty}\n\n${description}\n\n---\n\n## VALOR TEMPORAL DEL DINERO\n\n| # | Fórmula | Excel | Descripción |\n|---|---------|-------|-------------|\n| 1 | VAN (Valor Actual Neto) | =VNA(tasa;flujos)+inversión | Valor presente de flujos futuros menos inversión |\n| 2 | TIR (Tasa Interna Retorno) | =TIR(flujos) | Tasa que hace VAN=0 |\n| 3 | TIRM (TIR Modificada) | =TIRM(flujos;tasa_fin;tasa_reinv) | TIR con tasa de reinversión realista |\n| 4 | VA (Valor Actual) | =VA(tasa;nper;pago;vf) | Valor presente de pagos futuros |\n| 5 | VF (Valor Futuro) | =VF(tasa;nper;pago;va) | Valor futuro con interés compuesto |\n| 6 | PMT (Cuota) | =PAGO(tasa;nper;va) | Cuota periódica de un préstamo |\n| 7 | NPER (Períodos) | =NPER(tasa;pago;va;vf) | Nº de períodos para alcanzar objetivo |\n| 8 | TASA | =TASA(nper;pago;va;vf) | Tasa de interés implícita |\n\n## ESTADÍSTICA Y RIESGO\n\n| # | Fórmula | Excel | Descripción |\n|---|---------|-------|-------------|\n| 9 | Media | =PROMEDIO(rango) | Rendimiento medio |\n| 10 | Desviación estándar | =DESVEST(rango) | Volatilidad / riesgo |\n| 11 | Varianza | =VAR(rango) | Dispersión de rendimientos |\n| 12 | Covarianza | =COVARIANZA.M(rango1;rango2) | Co-movimiento entre activos |\n| 13 | Correlación | =COEF.DE.CORREL(rango1;rango2) | Correlación entre activos (-1 a +1) |\n| 14 | Beta | =COVARIANZA.M(activo;mercado)/VAR(mercado) | Sensibilidad al mercado |\n| 15 | Sharpe Ratio | =(Rp-Rf)/σp | Rendimiento ajustado por riesgo |\n\n## RATIOS FINANCIEROS\n\n| # | Fórmula | Cálculo | Benchmark |\n|---|---------|---------|----------|\n| 16 | Ratio Corriente | Activo Corriente / Pasivo Corriente | >1,5 |\n| 17 | Ratio Rápido | (AC - Inventario) / PC | >1,0 |\n| 18 | ROE | Beneficio Neto / Patrimonio Neto | >15% |\n| 19 | ROA | Beneficio Neto / Activo Total | >5% |\n| 20 | ROIC | NOPAT / Capital Invertido | >WACC |\n| 21 | Margen Bruto | (Ventas - COGS) / Ventas | Sector |\n| 22 | Margen EBITDA | EBITDA / Ventas | Sector |\n| 23 | Margen Neto | Beneficio Neto / Ventas | >10% |\n| 24 | DuPont (3 factores) | Margen × Rotación × Apalancamiento | Descomposición ROE |\n| 25 | EV/EBITDA | Enterprise Value / EBITDA | 8-12x |\n`;
  }

  if (lowerTitle.includes('formulario') || lowerTitle.includes('cfa')) {
    return `# 📋 ${title}\n**Nivel:** ${difficulty}\n\n${description}\n\n---\n\n## ETHICS & PROFESSIONAL STANDARDS\n- Standard I(A): Knowledge of the Law → Comply with most strict law/regulation\n- Standard III(A): Loyalty, Prudence, Care → Duty to clients above employer\n- Standard V(A): Diligence → Reasonable basis for recommendations\n- Standard VI(B): Priority of Transactions → Client > Employer > Personal\n\n## QUANTITATIVE METHODS\n- Future Value: FV = PV × (1 + r)^n\n- Present Value: PV = FV / (1 + r)^n\n- Annuity PV: PV = PMT × [(1 - (1+r)^-n) / r]\n- HPR: (P1 - P0 + D1) / P0\n- Time-Weighted Return: (1+R1)(1+R2)...(1+Rn) - 1\n- Money-Weighted Return: IRR of cash flows\n- Sharpe: (Rp - Rf) / σp\n- Roy's Safety First: (E(Rp) - RL) / σp\n\n## ECONOMICS\n- GDP = C + I + G + (X - M)\n- Fisher Effect: (1 + Rnom) = (1 + Rreal)(1 + π)\n- Quantity Theory: MV = PY\n\n## FINANCIAL REPORTING\n- Basic EPS = (NI - Preferred Div) / Weighted Avg Shares\n- Diluted EPS: Include convertible bonds, options, warrants\n- DuPont: ROE = (NI/Sales)(Sales/Assets)(Assets/Equity)\n- CFO = NI + Non-cash charges ± ΔWC\n\n## CORPORATE FINANCE\n- WACC = (E/V)×Re + (D/V)×Rd×(1-T)\n- CAPM: E(Ri) = Rf + βi(E(Rm) - Rf)\n- NPV = Σ [CFt / (1+r)^t] - CF0\n- Payback = Years before recovery + (Unrecovered / CF next year)\n- DOL = %ΔEBIT / %ΔSales\n- DFL = %ΔEPS / %ΔEBIT\n- DTL = DOL × DFL\n\n## EQUITY\n- DDM: V0 = D1 / (r - g)\n- Gordon Growth: g = ROE × (1 - Payout ratio)\n- P/E = Payout / (r - g)\n- PEG = (P/E) / g\n- EV = Market Cap + Debt - Cash\n\n## FIXED INCOME\n- Duration: ΔP/P ≈ -D × Δy\n- Modified Duration = Macaulay D / (1 + y/n)\n- Convexity adjustment: ΔP/P ≈ -D×Δy + ½×C×(Δy)²\n- Spot rate from forward: (1+S2)² = (1+S1)(1+f1,1)\n`;
  }

  if (lowerTitle.includes('flashcard') || lowerTitle.includes('ética')) {
    return `# 🃏 ${title}\n**Nivel:** ${difficulty}\n\n${description}\n\n---\n\n## Flashcard 1\n**Escenario:** Un analista descubre que su empresa ha inflado los ingresos del último trimestre. Su jefe le pide que no diga nada hasta el próximo informe.\n**Standard aplicable:** I(A) Knowledge of the Law, I(D) Misconduct\n**Acción correcta:** Disociar del fraude. Informar al compliance/legal. Si no se toma acción, escalar o renunciar. Documentar todo.\n\n## Flashcard 2\n**Escenario:** Un gestor de fondos compra acciones de una empresa para su cuenta personal ANTES de ejecutar la misma orden para el fondo.\n**Standard aplicable:** VI(B) Priority of Transactions\n**Acción correcta:** Esto es **front-running** y viola directamente el Standard. Las transacciones de clientes SIEMPRE van primero. Sanción: suspensión o revocación de charter.\n\n## Flashcard 3\n**Escenario:** Un asesor recomienda un fondo de inversión a un cliente porque la gestora le paga una comisión del 2% por cada venta, sin informar al cliente.\n**Standard aplicable:** VI(A) Disclosure of Conflicts, I(B) Independence and Objectivity\n**Acción correcta:** DEBE revelar el conflicto de interés al cliente ANTES de la recomendación. El incentivo puede sesgar el consejo.\n\n## Flashcard 4\n**Escenario:** Un analista incluye en su informe una proyección de crecimiento del 40% anual sin ningún dato que la respalde.\n**Standard aplicable:** V(A) Diligence and Reasonable Basis\n**Acción correcta:** Toda recomendación debe tener "reasonable basis". Debe documentar la investigación, fuentes y metodología utilizada.\n\n## Flashcard 5\n**Escenario:** Un CFA charterholder publica en LinkedIn: "Como CFA, garantizo rendimientos superiores al 15% anual."\n**Standard aplicable:** VII(B) Reference to CFA Institute\n**Acción correcta:** No se puede usar la designación para implicar rendimiento superior. No se pueden garantizar rendimientos. Violación del Code of Ethics.\n`;
  }

  if (lowerTitle.includes('plan de estudio')) {
    return `# 📅 ${title}\n**Nivel:** ${difficulty}\n\n${description}\n\n---\n\n## Distribución por Área (300 horas)\n\n| Área | Peso Examen | Horas | Semanas |\n|------|------------|-------|----------|\n| Ethics | 15-20% | 36h | 3 |\n| Quant Methods | 8-12% | 30h | 2,5 |\n| Economics | 8-12% | 28h | 2,5 |\n| FRA | 13-17% | 48h | 4 |\n| Corporate Finance | 8-12% | 28h | 2,5 |\n| Equity | 10-12% | 36h | 3 |\n| Fixed Income | 10-12% | 36h | 3 |\n| Derivatives | 5-8% | 20h | 1,5 |\n| Alternative Inv. | 5-8% | 14h | 1 |\n| Portfolio Mgmt | 5-8% | 24h | 2 |\n| **Total** | **100%** | **300h** | **25** |\n\n## Plan Semanal (6 meses)\n\n| Semana | Área | Actividad |\n|--------|------|----------|\n| 1-3 | Ethics | Lectura + Flashcards + Cases |\n| 4-5 | Quant | Lectura + Problemas prácticos |\n| 6-7 | Economics | Lectura + Esquemas |\n| 8-11 | FRA | Lectura + Ejercicios contables |\n| 12-13 | Corporate Finance | Lectura + Cálculos WACC/NPV |\n| 14-16 | Equity | Lectura + Modelos valoración |\n| 17-19 | Fixed Income | Lectura + Duration/Convexity |\n| 20 | Derivatives | Lectura + Pricing options |\n| 21 | Alternative | Lectura + Comparativas |\n| 22-23 | Portfolio | Lectura + CAPM/APT |\n| 24 | **Repaso general** | Mock exams + áreas débiles |\n| 25 | **Simulacros finales** | 2 mock exams completos |\n| 26 | **Últimos repasos** | Ethics (re-read) + fórmulas |\n`;
  }

  return `# 📄 ${title}\n**Nivel:** ${difficulty}\n\n${description}\n\n## Contenido\nEste recurso contiene la plantilla completa lista para usar.\nPersonaliza los campos según tu caso específico.\n`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ExampleCard({ example }: { example: NicheExample }) {
  const Icon = TYPE_ICONS[example.type] || BookOpen;

  return (
    <div className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-medium text-sm leading-tight">{example.title}</p>
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {TYPE_LABELS[example.type]}
            </Badge>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", DIFFICULTY_COLORS[example.difficulty])}>
              {example.difficulty}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">{example.description}</p>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => generateExampleFile(example)}
          >
            <Download className="h-3 w-3" />
            Descargar {example.type === 'excel' ? 'CSV' : 'Recurso'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NicheConfigPanel;
