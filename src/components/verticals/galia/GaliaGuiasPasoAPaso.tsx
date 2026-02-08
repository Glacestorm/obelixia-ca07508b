/**
 * GALIA - Guías Paso a Paso Interactivas
 * Wizards visuales para ciudadanos
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  FileText, 
  CheckCircle2, 
  Circle,
  ArrowRight,
  ArrowLeft,
  ClipboardList,
  Euro,
  FileCheck,
  Building2,
  Send,
  Clock,
  AlertCircle,
  Lightbulb,
  Download,
  BookOpen,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuiaStep {
  id: string;
  titulo: string;
  descripcion: string;
  contenido: string[];
  tips?: string[];
  documentos?: string[];
  duracionEstimada?: string;
}

interface Guia {
  id: string;
  titulo: string;
  descripcion: string;
  icono: React.ReactNode;
  color: string;
  bgColor: string;
  pasos: GuiaStep[];
}

const guias: Guia[] = [
  {
    id: 'solicitud',
    titulo: 'Cómo solicitar una ayuda LEADER',
    descripcion: 'Proceso completo desde la idea hasta la presentación',
    icono: <ClipboardList className="h-6 w-6" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    pasos: [
      {
        id: 'paso-1',
        titulo: '1. Verifica tu elegibilidad',
        descripcion: 'Comprueba si tu proyecto cumple los requisitos básicos',
        contenido: [
          'Asegúrate de que tu proyecto se ubica en una zona rural elegible (consulta el mapa de tu GAL).',
          'Confirma que tu tipo de entidad es elegible: PYME, autónomo, ayuntamiento, asociación sin ánimo de lucro.',
          'Verifica que tu proyecto encaja en alguna de las líneas de actuación de la convocatoria.',
          'Comprueba que no tienes deudas con Hacienda ni con la Seguridad Social.',
        ],
        tips: [
          'Consulta con tu GAL antes de empezar para confirmar la elegibilidad.',
          'Las zonas urbanas de más de 10.000 habitantes generalmente no son elegibles.',
        ],
        duracionEstimada: '1-2 días',
      },
      {
        id: 'paso-2',
        titulo: '2. Elabora tu memoria técnica',
        descripcion: 'Describe tu proyecto de forma clara y detallada',
        contenido: [
          'Define los objetivos de tu proyecto de manera SMART (específicos, medibles, alcanzables, relevantes y temporales).',
          'Explica cómo tu proyecto contribuye al desarrollo rural y a los objetivos de la estrategia del GAL.',
          'Detalla las actividades a realizar, el cronograma de ejecución y los resultados esperados.',
          'Indica los empleos que crearás o mantendrás con el proyecto.',
        ],
        tips: [
          'Utiliza la plantilla oficial disponible en la sección de documentación.',
          'Sé específico con las fechas y cifras - evita aproximaciones vagas.',
          'Destaca la innovación y el impacto en el territorio.',
        ],
        documentos: ['Modelo de memoria técnica (DOCX)', 'Guía de redacción de proyectos (PDF)'],
        duracionEstimada: '1-2 semanas',
      },
      {
        id: 'paso-3',
        titulo: '3. Prepara el presupuesto detallado',
        descripcion: 'Desglosa todos los gastos por partidas',
        contenido: [
          'Desglosa todos los gastos por partidas: obra civil, equipamiento, instalaciones, servicios profesionales, etc.',
          'Solicita al menos 3 ofertas comparables para inversiones superiores a 18.000€ (antes de IVA).',
          'Calcula el importe de ayuda según el porcentaje aplicable a tu tipo de proyecto.',
          'Identifica claramente los gastos elegibles y no elegibles.',
        ],
        tips: [
          'Usa la plantilla Excel con fórmulas automáticas.',
          'El IVA solo es elegible si no puedes recuperarlo.',
          'Incluye un pequeño margen para imprevistos (5-10%).',
        ],
        documentos: ['Modelo de presupuesto (XLSX)', 'Instrucciones presupuestarias (PDF)'],
        duracionEstimada: '3-5 días',
      },
      {
        id: 'paso-4',
        titulo: '4. Reúne la documentación',
        descripcion: 'Compila todos los documentos requeridos',
        contenido: [
          'Documentos de identidad: DNI/NIF del solicitante y representante legal.',
          'Documentos de la entidad: Escrituras, estatutos, poderes, certificado de estar al corriente.',
          'Documentos del proyecto: Memoria, presupuesto, ofertas, licencias, permisos.',
          'Documentos económicos: Últimas cuentas anuales, plan de viabilidad, declaración de minimis.',
        ],
        tips: [
          'Consulta el checklist interactivo para no olvidar ningún documento.',
          'Algunos documentos pueden tardar semanas en obtenerse (licencias, permisos).',
          'Prepara copias digitales en PDF de calidad.',
        ],
        documentos: ['Checklist de documentación', 'Modelos de declaraciones responsables'],
        duracionEstimada: '2-4 semanas',
      },
      {
        id: 'paso-5',
        titulo: '5. Presenta la solicitud',
        descripcion: 'Formaliza tu solicitud ante el GAL',
        contenido: [
          'Completa el formulario oficial de solicitud con todos los datos requeridos.',
          'Firma digitalmente o de forma manuscrita según se indique.',
          'Presenta la solicitud en el registro del GAL o a través de la sede electrónica.',
          'Guarda el justificante de registro con número y fecha de entrada.',
        ],
        tips: [
          'No esperes al último día - los sistemas pueden saturarse.',
          'Presenta antes del cierre para poder subsanar si falta algo.',
          'Solicita acuse de recibo de toda la documentación.',
        ],
        duracionEstimada: '1 día',
      },
    ],
  },
  {
    id: 'justificacion',
    titulo: 'Cómo justificar los gastos',
    descripcion: 'Proceso de justificación económica del proyecto',
    icono: <Euro className="h-6 w-6" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
    pasos: [
      {
        id: 'just-1',
        titulo: '1. Conoce los plazos',
        descripcion: 'Fechas clave para la justificación',
        contenido: [
          'Revisa la resolución de concesión: incluye el plazo máximo de ejecución y justificación.',
          'Generalmente dispones de 3-6 meses tras finalizar la inversión para presentar la justificación.',
          'Puedes solicitar prórrogas justificadas si las necesitas (antes de que venzan los plazos).',
          'Marca las fechas en tu calendario y configura recordatorios.',
        ],
        tips: [
          'No esperes al último momento - la tramitación puede llevar tiempo.',
          'Solicita cualquier modificación con antelación suficiente.',
        ],
        duracionEstimada: 'Según resolución',
      },
      {
        id: 'just-2',
        titulo: '2. Ejecuta según lo aprobado',
        descripcion: 'Realiza las inversiones conforme al proyecto',
        contenido: [
          'Ejecuta exactamente las inversiones aprobadas en la resolución.',
          'Si necesitas hacer cambios, solicita autorización previa al GAL.',
          'Contrata a los proveedores que presentaste en las ofertas (o justifica el cambio).',
          'Documenta el proceso con fotografías fechadas del antes, durante y después.',
        ],
        tips: [
          'Cambios menores (<10%) pueden no necesitar autorización, pero consúltalo.',
          'Mantén un archivo ordenado de toda la documentación generada.',
        ],
        duracionEstimada: 'Variable',
      },
      {
        id: 'just-3',
        titulo: '3. Prepara las facturas',
        descripcion: 'Requisitos de los documentos de gasto',
        contenido: [
          'Todas las facturas deben cumplir los requisitos fiscales (número, fecha, NIF, desglose de IVA).',
          'Las facturas deben estar a nombre del beneficiario de la ayuda.',
          'El concepto debe ser claro y coincidir con las partidas presupuestadas.',
          'No se admiten facturas simplificadas (tickets) para importes superiores a 400€.',
        ],
        tips: [
          'Solicita facturas con suficiente detalle para identificar los conceptos.',
          'Verifica que los proveedores están dados de alta en Hacienda.',
        ],
        documentos: ['Modelo de relación de facturas (XLSX)', 'Ejemplo de factura correcta (PDF)'],
        duracionEstimada: 'Durante la ejecución',
      },
      {
        id: 'just-4',
        titulo: '4. Documenta los pagos',
        descripcion: 'Justificantes bancarios requeridos',
        contenido: [
          'Todos los pagos deben realizarse por transferencia bancaria o domiciliación.',
          'No se admiten pagos en efectivo para importes superiores a 1.000€.',
          'El extracto bancario debe mostrar claramente: ordenante, beneficiario, importe, fecha y concepto.',
          'Adjunta capturas del banco online o certificados bancarios de cada operación.',
        ],
        tips: [
          'Usa una cuenta bancaria exclusiva para el proyecto si es posible.',
          'Incluye siempre referencia a la factura en el concepto del pago.',
        ],
        documentos: ['Modelo de relación de pagos (XLSX)'],
        duracionEstimada: 'Durante la ejecución',
      },
      {
        id: 'just-5',
        titulo: '5. Presenta la cuenta justificativa',
        descripcion: 'Documentación final de justificación',
        contenido: [
          'Cumplimenta el formulario de cuenta justificativa facilitado por el GAL.',
          'Incluye la relación detallada de todas las facturas y pagos.',
          'Adjunta copia de todas las facturas y justificantes de pago.',
          'Incluye la memoria final de actuación describiendo lo ejecutado.',
          'Añade fotografías del proyecto ejecutado y cualquier otro material de difusión.',
        ],
        tips: [
          'Organiza la documentación en carpetas por partida presupuestaria.',
          'Numera los documentos y crea un índice para facilitar la revisión.',
        ],
        documentos: ['Modelo de cuenta justificativa (PDF)', 'Memoria final de actuación (DOCX)'],
        duracionEstimada: '3-5 días',
      },
    ],
  },
  {
    id: 'modificaciones',
    titulo: 'Cómo solicitar modificaciones',
    descripcion: 'Cambios en el proyecto durante la ejecución',
    icono: <FileCheck className="h-6 w-6" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
    pasos: [
      {
        id: 'mod-1',
        titulo: '1. Identifica el tipo de modificación',
        descripcion: 'Clasifica el cambio que necesitas',
        contenido: [
          'Modificación menor: cambios inferiores al 10% del presupuesto que no alteran la naturaleza del proyecto.',
          'Modificación sustancial: cambios significativos en partidas, plazos o alcance del proyecto.',
          'Ampliación de plazo: prórroga del período de ejecución o justificación.',
          'Renuncia parcial: reducción del alcance manteniendo la viabilidad.',
        ],
        tips: [
          'Las modificaciones menores pueden comunicarse sin solicitud formal.',
          'Consulta siempre con tu técnico del GAL antes de iniciar.',
        ],
        duracionEstimada: '1 día',
      },
      {
        id: 'mod-2',
        titulo: '2. Prepara la solicitud',
        descripcion: 'Documentación necesaria para el cambio',
        contenido: [
          'Cumplimenta el formulario de solicitud de modificación.',
          'Justifica los motivos del cambio de forma clara y objetiva.',
          'Incluye nuevo presupuesto detallado si procede.',
          'Adjunta nueva memoria técnica si los cambios afectan al alcance.',
        ],
        documentos: ['Formulario de modificación (PDF)', 'Modelo de justificación de cambios'],
        duracionEstimada: '2-3 días',
      },
      {
        id: 'mod-3',
        titulo: '3. Presenta y espera resolución',
        descripcion: 'Tramitación de la solicitud',
        contenido: [
          'Presenta la solicitud en el registro del GAL con suficiente antelación.',
          'El GAL evaluará si los cambios son compatibles con el proyecto aprobado.',
          'Recibirás una resolución autorizando o denegando la modificación.',
          'No ejecutes los cambios hasta recibir la autorización por escrito.',
        ],
        tips: [
          'Solicita modificaciones con al menos 30 días de antelación.',
          'Si es urgente, contacta telefónicamente con tu técnico.',
        ],
        duracionEstimada: '15-30 días',
      },
    ],
  },
  {
    id: 'recursos',
    titulo: 'Cómo presentar un recurso',
    descripcion: 'Opciones si no estás de acuerdo con la resolución',
    icono: <AlertCircle className="h-6 w-6" />,
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    pasos: [
      {
        id: 'rec-1',
        titulo: '1. Analiza la resolución',
        descripcion: 'Entiende los motivos de la denegación',
        contenido: [
          'Lee detenidamente la resolución completa y sus fundamentos jurídicos.',
          'Identifica los criterios concretos que no se han cumplido según el órgano resolutor.',
          'Evalúa si tienes argumentos sólidos para rebatir cada motivo.',
          'Consulta con un asesor legal si el caso es complejo.',
        ],
        tips: [
          'No actúes impulsivamente - analiza fríamente las posibilidades de éxito.',
          'Solicita una reunión con el GAL para que te expliquen la resolución.',
        ],
        duracionEstimada: '3-5 días',
      },
      {
        id: 'rec-2',
        titulo: '2. Prepara el recurso de reposición',
        descripcion: 'Redacta los argumentos de tu recurso',
        contenido: [
          'El recurso de reposición debe presentarse en el plazo de UN MES desde la notificación.',
          'Identifica claramente la resolución que recurres (fecha, número, órgano).',
          'Expón ordenadamente los motivos de tu disconformidad.',
          'Aporta documentación adicional que respalde tus argumentos si la tienes.',
        ],
        tips: [
          'Sé preciso y objetivo - evita argumentos emocionales.',
          'Fundamenta en normativa aplicable cuando sea posible.',
        ],
        documentos: ['Modelo de recurso de reposición (DOCX)'],
        duracionEstimada: '5-10 días',
      },
      {
        id: 'rec-3',
        titulo: '3. Presenta y espera resolución',
        descripcion: 'Tramitación del recurso',
        contenido: [
          'Presenta el recurso en el registro del mismo órgano que dictó la resolución.',
          'El plazo máximo de resolución es de 1 mes (silencio negativo si no responden).',
          'Si estimas el silencio negativo, puedes acudir a la vía contencioso-administrativa.',
          'Recibirás notificación de la resolución del recurso.',
        ],
        tips: [
          'Solicita copia sellada del recurso como justificante.',
          'Considera la vía contenciosa solo como último recurso.',
        ],
        duracionEstimada: '1-2 meses',
      },
    ],
  },
];

interface GaliaGuiasPasoAPasoProps {
  className?: string;
}

export function GaliaGuiasPasoAPaso({ className }: GaliaGuiasPasoAPasoProps) {
  const [selectedGuia, setSelectedGuia] = useState<Guia | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const handleSelectGuia = (guia: Guia) => {
    setSelectedGuia(guia);
    setCurrentStep(0);
  };

  const handleBack = () => {
    setSelectedGuia(null);
    setCurrentStep(0);
    setCompletedSteps(new Set());
  };

  const handleNextStep = () => {
    if (selectedGuia && currentStep < selectedGuia.pasos.length - 1) {
      setCompletedSteps(prev => new Set(prev).add(selectedGuia.pasos[currentStep].id));
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const toggleStepComplete = (stepId: string) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  // Vista de detalle de guía
  if (selectedGuia) {
    const paso = selectedGuia.pasos[currentStep];
    const progress = ((completedSteps.size / selectedGuia.pasos.length) * 100);

    return (
      <div className={cn("space-y-6", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a guías
          </Button>
          <Badge variant="secondary" className="gap-1">
            <BookOpen className="h-3 w-3" />
            {completedSteps.size}/{selectedGuia.pasos.length} pasos
          </Badge>
        </div>

        {/* Guía Header */}
        <Card className={cn("border-l-4", selectedGuia.color.replace('text-', 'border-'))}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", selectedGuia.bgColor)}>
                {selectedGuia.icono}
              </div>
              <div>
                <CardTitle className="text-lg">{selectedGuia.titulo}</CardTitle>
                <CardDescription>{selectedGuia.descripcion}</CardDescription>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progreso</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardHeader>
        </Card>

        {/* Steps Navigation */}
        <div className="flex overflow-x-auto gap-2 pb-2">
          {selectedGuia.pasos.map((p, idx) => (
            <Button
              key={p.id}
              variant={idx === currentStep ? "default" : "outline"}
              size="sm"
              className={cn(
                "shrink-0 gap-2",
                completedSteps.has(p.id) && idx !== currentStep && "border-green-500 text-green-600"
              )}
              onClick={() => setCurrentStep(idx)}
            >
              {completedSteps.has(p.id) ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
              Paso {idx + 1}
            </Button>
          ))}
        </div>

        {/* Current Step Content */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {completedSteps.has(paso.id) ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  {paso.titulo}
                </CardTitle>
                <CardDescription className="mt-1">{paso.descripcion}</CardDescription>
              </div>
              {paso.duracionEstimada && (
                <Badge variant="outline" className="shrink-0 gap-1">
                  <Clock className="h-3 w-3" />
                  {paso.duracionEstimada}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Contenido principal */}
            <div className="space-y-3">
              {paso.contenido.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>

            {/* Tips */}
            {paso.tips && paso.tips.length > 0 && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-800">Consejos</span>
                </div>
                <ul className="space-y-2">
                  {paso.tips.map((tip, idx) => (
                    <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                      <span>•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Documentos relacionados */}
            {paso.documentos && paso.documentos.length > 0 && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium">Documentos relacionados</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {paso.documentos.map((doc, idx) => (
                    <Button key={idx} variant="outline" size="sm" className="gap-2">
                      <Download className="h-3 w-3" />
                      {doc}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={handlePrevStep}
                disabled={currentStep === 0}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Anterior
              </Button>

              <Button
                variant="ghost"
                onClick={() => toggleStepComplete(paso.id)}
                className={cn(
                  "gap-2",
                  completedSteps.has(paso.id) && "text-green-600"
                )}
              >
                {completedSteps.has(paso.id) ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Completado
                  </>
                ) : (
                  <>
                    <Circle className="h-4 w-4" />
                    Marcar como completado
                  </>
                )}
              </Button>

              {currentStep < selectedGuia.pasos.length - 1 ? (
                <Button onClick={handleNextStep} className="gap-2">
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleBack} className="gap-2 bg-green-600 hover:bg-green-700">
                  <Sparkles className="h-4 w-4" />
                  Finalizar guía
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vista de lista de guías
  return (
    <div className={cn("space-y-6", className)}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Guías Paso a Paso</h2>
        <p className="text-muted-foreground mt-2">
          Manuales interactivos para cada etapa del proceso de ayudas LEADER
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {guias.map((guia) => (
          <Card 
            key={guia.id} 
            className="hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => handleSelectGuia(guia)}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-3 rounded-lg transition-colors",
                  guia.bgColor,
                  "group-hover:scale-110 transition-transform"
                )}>
                  <div className={guia.color}>{guia.icono}</div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold group-hover:text-primary transition-colors">
                    {guia.titulo}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {guia.descripcion}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="secondary" className="text-xs">
                      {guia.pasos.length} pasos
                    </Badge>
                    <Badge variant="outline" className="text-xs gap-1">
                      <Clock className="h-3 w-3" />
                      ~{guia.pasos.reduce((acc, p) => {
                        const days = p.duracionEstimada?.match(/\d+/)?.[0];
                        return acc + (days ? parseInt(days) : 1);
                      }, 0)} días
                    </Badge>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick FAQ */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Preguntas Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q1">
              <AccordionTrigger className="text-left">
                ¿Cuánto tiempo tengo para ejecutar el proyecto?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                El plazo de ejecución se indica en la resolución de concesión, normalmente entre 12 y 24 meses. 
                Puedes solicitar prórrogas justificadas antes de que venza el plazo.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger className="text-left">
                ¿Puedo empezar antes de recibir la resolución?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                No es recomendable. Los gastos realizados antes de la resolución de concesión generalmente 
                no son elegibles para subvención. Espera a recibir la notificación oficial.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger className="text-left">
                ¿Qué pasa si no puedo completar toda la inversión?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Puedes solicitar una modificación para reducir el alcance del proyecto, siempre que mantenga 
                su viabilidad y los objetivos principales. El importe de ayuda se ajustará proporcionalmente.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

export default GaliaGuiasPasoAPaso;
