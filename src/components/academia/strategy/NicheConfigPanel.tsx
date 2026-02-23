import { useState, useEffect, useCallback } from 'react';
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
          <p className="text-xs text-muted-foreground leading-relaxed">{example.description}</p>
        </div>
      </div>
    </div>
  );
}

export default NicheConfigPanel;
