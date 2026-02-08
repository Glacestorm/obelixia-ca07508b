/**
 * GALIA - Guías Paso a Paso Interactivas (Refactorizado)
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowRight, ArrowLeft, ClipboardList, Euro, FileCheck,
  AlertCircle, Lightbulb, Download, BookOpen, ChevronRight, Sparkles,
  CheckCircle2, Circle, Clock
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
  colorClass: string;
  pasos: GuiaStep[];
}

const GUIAS: Guia[] = [
  {
    id: 'solicitud',
    titulo: 'Cómo solicitar una ayuda LEADER',
    descripcion: 'Proceso completo desde la idea hasta la presentación',
    icono: <ClipboardList className="h-6 w-6" />,
    colorClass: 'text-primary',
    pasos: [
      { id: 'paso-1', titulo: '1. Verifica tu elegibilidad', descripcion: 'Comprueba si tu proyecto cumple los requisitos básicos', contenido: ['Asegúrate de que tu proyecto se ubica en una zona rural elegible.', 'Confirma que tu tipo de entidad es elegible: PYME, autónomo, ayuntamiento.', 'Verifica que no tienes deudas con Hacienda ni Seguridad Social.'], tips: ['Consulta con tu GAL antes de empezar.'], duracionEstimada: '1-2 días' },
      { id: 'paso-2', titulo: '2. Elabora tu memoria técnica', descripcion: 'Describe tu proyecto de forma clara', contenido: ['Define objetivos SMART.', 'Explica cómo contribuye al desarrollo rural.', 'Detalla actividades y cronograma.'], documentos: ['Modelo de memoria técnica (DOCX)'], duracionEstimada: '1-2 semanas' },
      { id: 'paso-3', titulo: '3. Prepara el presupuesto', descripcion: 'Desglosa todos los gastos por partidas', contenido: ['Desglosa gastos por partidas.', 'Solicita 3 ofertas para >18.000€.', 'Identifica gastos elegibles.'], documentos: ['Modelo de presupuesto (XLSX)'], duracionEstimada: '3-5 días' },
      { id: 'paso-4', titulo: '4. Reúne la documentación', descripcion: 'Compila todos los documentos requeridos', contenido: ['DNI/NIF del solicitante.', 'Escrituras, estatutos, poderes.', 'Memoria, presupuesto, ofertas.'], duracionEstimada: '2-4 semanas' },
      { id: 'paso-5', titulo: '5. Presenta la solicitud', descripcion: 'Formaliza tu solicitud ante el GAL', contenido: ['Completa el formulario oficial.', 'Presenta en registro o sede electrónica.', 'Guarda el justificante de registro.'], duracionEstimada: '1 día' },
    ],
  },
  {
    id: 'justificacion',
    titulo: 'Cómo justificar los gastos',
    descripcion: 'Proceso de justificación económica del proyecto',
    icono: <Euro className="h-6 w-6" />,
    colorClass: 'text-secondary',
    pasos: [
      { id: 'just-1', titulo: '1. Conoce los plazos', descripcion: 'Fechas clave para la justificación', contenido: ['Revisa la resolución de concesión.', 'Generalmente 3-6 meses tras finalizar.', 'Solicita prórrogas si necesitas.'], duracionEstimada: 'Según resolución' },
      { id: 'just-2', titulo: '2. Ejecuta según lo aprobado', descripcion: 'Realiza las inversiones conforme al proyecto', contenido: ['Ejecuta las inversiones aprobadas.', 'Solicita autorización para cambios.', 'Documenta con fotografías.'], duracionEstimada: 'Variable' },
      { id: 'just-3', titulo: '3. Prepara las facturas', descripcion: 'Requisitos de los documentos de gasto', contenido: ['Facturas con requisitos fiscales.', 'A nombre del beneficiario.', 'Concepto claro y detallado.'], duracionEstimada: 'Durante ejecución' },
      { id: 'just-4', titulo: '4. Documenta los pagos', descripcion: 'Justificantes bancarios requeridos', contenido: ['Pagos por transferencia.', 'No efectivo >1.000€.', 'Extractos claros.'], duracionEstimada: 'Durante ejecución' },
      { id: 'just-5', titulo: '5. Presenta la cuenta justificativa', descripcion: 'Documentación final', contenido: ['Formulario de cuenta justificativa.', 'Relación de facturas y pagos.', 'Memoria final con fotos.'], duracionEstimada: '3-5 días' },
    ],
  },
  {
    id: 'modificaciones',
    titulo: 'Cómo solicitar modificaciones',
    descripcion: 'Cambios en el proyecto durante la ejecución',
    icono: <FileCheck className="h-6 w-6" />,
    colorClass: 'text-accent',
    pasos: [
      { id: 'mod-1', titulo: '1. Identifica el tipo de modificación', descripcion: 'Clasifica el cambio', contenido: ['Modificación menor: <10%.', 'Modificación sustancial: cambios significativos.', 'Ampliación de plazo.'], duracionEstimada: '1 día' },
      { id: 'mod-2', titulo: '2. Prepara la solicitud', descripcion: 'Documentación necesaria', contenido: ['Formulario de modificación.', 'Justifica los motivos.', 'Nuevo presupuesto si procede.'], duracionEstimada: '2-3 días' },
      { id: 'mod-3', titulo: '3. Presenta y espera resolución', descripcion: 'Tramitación de la solicitud', contenido: ['Presenta con antelación.', 'Espera autorización.', 'No ejecutes sin autorización.'], duracionEstimada: '15-30 días' },
    ],
  },
  {
    id: 'recursos',
    titulo: 'Cómo presentar un recurso',
    descripcion: 'Opciones si no estás de acuerdo',
    icono: <AlertCircle className="h-6 w-6" />,
    colorClass: 'text-destructive',
    pasos: [
      { id: 'rec-1', titulo: '1. Analiza la resolución', descripcion: 'Entiende los motivos', contenido: ['Lee la resolución completa.', 'Identifica criterios no cumplidos.', 'Evalúa argumentos.'], duracionEstimada: '3-5 días' },
      { id: 'rec-2', titulo: '2. Prepara el recurso', descripcion: 'Redacta los argumentos', contenido: ['Plazo de 1 mes.', 'Identifica la resolución.', 'Expón motivos ordenadamente.'], duracionEstimada: '5-10 días' },
      { id: 'rec-3', titulo: '3. Presenta y espera', descripcion: 'Tramitación del recurso', contenido: ['Presenta en el mismo órgano.', 'Plazo máximo 1 mes.', 'Recibirás notificación.'], duracionEstimada: '1-2 meses' },
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
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  if (selectedGuia) {
    const paso = selectedGuia.pasos[currentStep];
    const progress = (completedSteps.size / selectedGuia.pasos.length) * 100;

    return (
      <div className={cn("space-y-6", className)}>
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

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">{selectedGuia.icono}</div>
              <div>
                <CardTitle className="text-lg">{selectedGuia.titulo}</CardTitle>
                <CardDescription>{selectedGuia.descripcion}</CardDescription>
              </div>
            </div>
            <Progress value={progress} className="mt-4 h-2" />
          </CardHeader>
        </Card>

        {/* Timeline */}
        <div className="flex gap-1 overflow-x-auto pb-2">
          {selectedGuia.pasos.map((p, idx) => (
            <Button
              key={p.id}
              variant={idx === currentStep ? 'default' : completedSteps.has(p.id) ? 'secondary' : 'outline'}
              size="sm"
              className="shrink-0 gap-1"
              onClick={() => setCurrentStep(idx)}
            >
              {completedSteps.has(p.id) ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
              {idx + 1}
            </Button>
          ))}
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{paso.titulo}</CardTitle>
              {paso.duracionEstimada && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {paso.duracionEstimada}
                </Badge>
              )}
            </div>
            <CardDescription>{paso.descripcion}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              {paso.contenido.map((item, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <ChevronRight className="h-4 w-4 mt-1 text-primary shrink-0" />
                  <p className="text-sm">{item}</p>
                </div>
              ))}
            </div>

            {paso.tips && paso.tips.length > 0 && (
              <div className="bg-accent/10 rounded-lg p-4 space-y-2">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <Lightbulb className="h-4 w-4 text-accent" />
                  Consejos
                </h4>
                {paso.tips.map((tip, idx) => (
                  <p key={idx} className="text-sm text-muted-foreground pl-6">• {tip}</p>
                ))}
              </div>
            )}

            {paso.documentos && paso.documentos.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Documentos relacionados</h4>
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

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={handlePrevStep} disabled={currentStep === 0} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Anterior
              </Button>
              {currentStep < selectedGuia.pasos.length - 1 ? (
                <Button onClick={handleNextStep} className="gap-2">
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => { setCompletedSteps(prev => new Set(prev).add(paso.id)); }} className="gap-2 bg-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  Completar guía
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Lista de guías
  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Guías interactivas</h2>
          <p className="text-sm text-muted-foreground">Aprende paso a paso los procesos LEADER</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {GUIAS.map(guia => (
          <Card
            key={guia.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedGuia(guia)}
          >
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-lg bg-muted", guia.colorClass)}>
                  {guia.icono}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{guia.titulo}</CardTitle>
                  <CardDescription className="mt-1">{guia.descripcion}</CardDescription>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="secondary" className="text-xs">{guia.pasos.length} pasos</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default GaliaGuiasPasoAPaso;
