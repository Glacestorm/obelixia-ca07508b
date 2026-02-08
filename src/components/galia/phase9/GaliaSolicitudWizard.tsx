/**
 * GaliaSolicitudWizard - Wizard de Solicitudes LEADER
 * Proceso guiado paso a paso para ciudadanos
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  FileText, 
  User, 
  Building, 
  MapPin, 
  Euro, 
  Upload,
  AlertCircle,
  Sparkles,
  Save,
  Send,
  Calculator,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Types
interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

interface SolicitudData {
  // Step 1: Datos Solicitante
  tipo_solicitante: 'persona_fisica' | 'persona_juridica' | 'entidad_publica';
  nif: string;
  nombre_razon_social: string;
  email: string;
  telefono: string;
  direccion: string;
  codigo_postal: string;
  municipio: string;
  provincia: string;
  
  // Step 2: Datos Proyecto
  titulo_proyecto: string;
  descripcion: string;
  sector_actividad: string;
  linea_actuacion: string;
  objetivos: string;
  
  // Step 3: Localización
  municipio_proyecto: string;
  direccion_proyecto: string;
  coordenadas?: { lat: number; lng: number };
  zona_rural: boolean;
  
  // Step 4: Presupuesto
  presupuesto_total: number;
  inversion_subvencionable: number;
  porcentaje_ayuda: number;
  importe_solicitado: number;
  otros_fondos: boolean;
  detalle_otros_fondos?: string;
  
  // Step 5: Documentación
  documentos: Array<{
    tipo: string;
    nombre: string;
    obligatorio: boolean;
    subido: boolean;
  }>;
  
  // Step 6: Declaraciones
  declaracion_veracidad: boolean;
  declaracion_no_inhabilitacion: boolean;
  declaracion_no_deudas: boolean;
  declaracion_minimis: boolean;
  acepta_condiciones: boolean;
}

interface GaliaSolicitudWizardProps {
  convocatoriaId?: string;
  convocatoriaTitulo?: string;
  beneficiarioId?: string;
  userData?: {
    nif: string;
    nombre: string;
    email?: string;
  };
  onComplete?: (solicitudId: string) => void;
  onCancel?: () => void;
  className?: string;
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 'solicitante', title: 'Datos del Solicitante', description: 'Información personal o empresarial', icon: User },
  { id: 'proyecto', title: 'Descripción del Proyecto', description: 'Detalles de la inversión', icon: FileText },
  { id: 'localizacion', title: 'Localización', description: 'Ubicación de la actuación', icon: MapPin },
  { id: 'presupuesto', title: 'Presupuesto', description: 'Inversión y financiación', icon: Euro },
  { id: 'documentacion', title: 'Documentación', description: 'Anexos requeridos', icon: Upload },
  { id: 'declaraciones', title: 'Declaraciones', description: 'Compromisos y firma', icon: Check },
];

const SECTORES_ACTIVIDAD = [
  { value: 'agroalimentario', label: 'Agroalimentario y transformación' },
  { value: 'turismo', label: 'Turismo rural y sostenible' },
  { value: 'artesania', label: 'Artesanía y productos locales' },
  { value: 'servicios', label: 'Servicios a la población' },
  { value: 'energia', label: 'Energías renovables' },
  { value: 'digitalizacion', label: 'Digitalización y TIC' },
  { value: 'patrimonio', label: 'Patrimonio y cultura' },
  { value: 'otro', label: 'Otro sector' },
];

const LINEAS_ACTUACION = [
  { value: 'creacion_empleo', label: 'Creación de empleo' },
  { value: 'modernizacion', label: 'Modernización de instalaciones' },
  { value: 'diversificacion', label: 'Diversificación económica' },
  { value: 'innovacion', label: 'Innovación y desarrollo' },
  { value: 'formacion', label: 'Formación y capacitación' },
  { value: 'cooperacion', label: 'Cooperación territorial' },
];

const DOCUMENTOS_REQUERIDOS = [
  { tipo: 'dni_nif', nombre: 'DNI/NIF del solicitante', obligatorio: true },
  { tipo: 'memoria_proyecto', nombre: 'Memoria descriptiva del proyecto', obligatorio: true },
  { tipo: 'presupuesto_detallado', nombre: 'Presupuesto detallado', obligatorio: true },
  { tipo: 'planos', nombre: 'Planos y/o croquis (si procede)', obligatorio: false },
  { tipo: 'licencias', nombre: 'Licencias y permisos', obligatorio: false },
  { tipo: 'ofertas', nombre: 'Ofertas comparativas (>18.000€)', obligatorio: false },
  { tipo: 'vida_laboral', nombre: 'Vida laboral (si aplica)', obligatorio: false },
  { tipo: 'otros', nombre: 'Otra documentación', obligatorio: false },
];

export function GaliaSolicitudWizard({
  convocatoriaId,
  convocatoriaTitulo,
  beneficiarioId,
  userData,
  onComplete,
  onCancel,
  className
}: GaliaSolicitudWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  
  const [formData, setFormData] = useState<SolicitudData>({
    tipo_solicitante: 'persona_fisica',
    nif: userData?.nif || '',
    nombre_razon_social: userData?.nombre || '',
    email: userData?.email || '',
    telefono: '',
    direccion: '',
    codigo_postal: '',
    municipio: '',
    provincia: '',
    titulo_proyecto: '',
    descripcion: '',
    sector_actividad: '',
    linea_actuacion: '',
    objetivos: '',
    municipio_proyecto: '',
    direccion_proyecto: '',
    zona_rural: true,
    presupuesto_total: 0,
    inversion_subvencionable: 0,
    porcentaje_ayuda: 50,
    importe_solicitado: 0,
    otros_fondos: false,
    documentos: DOCUMENTOS_REQUERIDOS.map(d => ({ ...d, subido: false })),
    declaracion_veracidad: false,
    declaracion_no_inhabilitacion: false,
    declaracion_no_deudas: false,
    declaracion_minimis: false,
    acepta_condiciones: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update field
  const updateField = useCallback(<K extends keyof SolicitudData>(
    field: K, 
    value: SolicitudData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }, [errors]);

  // Calculate aid amount
  const calculateAid = useCallback(() => {
    const subvencionable = formData.inversion_subvencionable || formData.presupuesto_total;
    const importe = (subvencionable * formData.porcentaje_ayuda) / 100;
    updateField('importe_solicitado', Math.round(importe * 100) / 100);
  }, [formData.inversion_subvencionable, formData.presupuesto_total, formData.porcentaje_ayuda, updateField]);

  // Validate current step
  const validateStep = useCallback((stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (stepIndex) {
      case 0: // Solicitante
        if (!formData.nif) newErrors.nif = 'NIF/CIF obligatorio';
        if (!formData.nombre_razon_social) newErrors.nombre_razon_social = 'Nombre obligatorio';
        if (!formData.email) newErrors.email = 'Email obligatorio';
        if (!formData.municipio) newErrors.municipio = 'Municipio obligatorio';
        break;
      case 1: // Proyecto
        if (!formData.titulo_proyecto) newErrors.titulo_proyecto = 'Título obligatorio';
        if (!formData.descripcion) newErrors.descripcion = 'Descripción obligatoria';
        if (!formData.sector_actividad) newErrors.sector_actividad = 'Sector obligatorio';
        break;
      case 2: // Localización
        if (!formData.municipio_proyecto) newErrors.municipio_proyecto = 'Municipio del proyecto obligatorio';
        break;
      case 3: // Presupuesto
        if (formData.presupuesto_total <= 0) newErrors.presupuesto_total = 'Presupuesto debe ser mayor que 0';
        if (formData.importe_solicitado <= 0) newErrors.importe_solicitado = 'Importe solicitado obligatorio';
        break;
      case 4: // Documentación
        const docsFaltantes = formData.documentos.filter(d => d.obligatorio && !d.subido);
        if (docsFaltantes.length > 0) {
          newErrors.documentos = `Faltan documentos obligatorios: ${docsFaltantes.map(d => d.nombre).join(', ')}`;
        }
        break;
      case 5: // Declaraciones
        if (!formData.declaracion_veracidad) newErrors.declaracion_veracidad = 'Declaración obligatoria';
        if (!formData.declaracion_no_inhabilitacion) newErrors.declaracion_no_inhabilitacion = 'Declaración obligatoria';
        if (!formData.declaracion_no_deudas) newErrors.declaracion_no_deudas = 'Declaración obligatoria';
        if (!formData.acepta_condiciones) newErrors.acepta_condiciones = 'Debe aceptar las condiciones';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Navigate steps
  const goToStep = useCallback((step: number) => {
    if (step < currentStep || validateStep(currentStep)) {
      setCurrentStep(step);
    }
  }, [currentStep, validateStep]);

  const nextStep = () => {
    if (validateStep(currentStep) && currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Save draft
  const saveDraft = async () => {
    setIsSavingDraft(true);
    try {
      // Save to localStorage for now (in production, save to DB)
      const draftKey = `galia_solicitud_draft_${convocatoriaId || 'new'}`;
      localStorage.setItem(draftKey, JSON.stringify({
        formData,
        currentStep,
        savedAt: new Date().toISOString()
      }));
      toast.success('Borrador guardado correctamente');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Error al guardar borrador');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Submit solicitud
  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    try {
      // Create solicitud in DB
      const { data: solicitud, error } = await supabase
        .from('galia_solicitudes')
        .insert({
          convocatoria_id: convocatoriaId,
          beneficiario_id: beneficiarioId,
          titulo_proyecto: formData.titulo_proyecto,
          descripcion: formData.descripcion,
          presupuesto_total: formData.presupuesto_total,
          importe_solicitado: formData.importe_solicitado,
          estado: 'borrador',
          datos_proyecto: {
            sector_actividad: formData.sector_actividad,
            linea_actuacion: formData.linea_actuacion,
            objetivos: formData.objetivos,
            municipio: formData.municipio_proyecto,
            direccion: formData.direccion_proyecto,
            zona_rural: formData.zona_rural,
            inversion_subvencionable: formData.inversion_subvencionable,
            porcentaje_ayuda: formData.porcentaje_ayuda,
            otros_fondos: formData.otros_fondos,
            detalle_otros_fondos: formData.detalle_otros_fondos,
          },
          datos_solicitante: {
            tipo: formData.tipo_solicitante,
            nif: formData.nif,
            nombre: formData.nombre_razon_social,
            email: formData.email,
            telefono: formData.telefono,
            direccion: formData.direccion,
            codigo_postal: formData.codigo_postal,
            municipio: formData.municipio,
            provincia: formData.provincia,
          },
          declaraciones: {
            veracidad: formData.declaracion_veracidad,
            no_inhabilitacion: formData.declaracion_no_inhabilitacion,
            no_deudas: formData.declaracion_no_deudas,
            minimis: formData.declaracion_minimis,
            acepta_condiciones: formData.acepta_condiciones,
            fecha_firma: new Date().toISOString(),
          }
        })
        .select('id, numero_registro')
        .single();

      if (error) throw error;

      toast.success('¡Solicitud registrada correctamente!', {
        description: `Número de registro: ${solicitud.numero_registro || solicitud.id}`
      });

      onComplete?.(solicitud.id);

    } catch (error) {
      console.error('Error submitting solicitud:', error);
      toast.error('Error al enviar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;
  const CurrentIcon = WIZARD_STEPS[currentStep].icon;

  return (
    <Card className={cn("w-full max-w-4xl mx-auto", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Nueva Solicitud de Ayuda LEADER
            </CardTitle>
            {convocatoriaTitulo && (
              <CardDescription className="mt-1">
                {convocatoriaTitulo}
              </CardDescription>
            )}
          </div>
          <Badge variant="outline" className="text-sm">
            Paso {currentStep + 1} de {WIZARD_STEPS.length}
          </Badge>
        </div>

        {/* Progress */}
        <div className="space-y-2 mt-4">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between">
            {WIZARD_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              return (
                <button
                  key={step.id}
                  onClick={() => goToStep(index)}
                  disabled={index > currentStep && !isCompleted}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                    isCurrent && "bg-primary/10",
                    isCompleted && "text-primary",
                    !isCurrent && !isCompleted && "text-muted-foreground opacity-50"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-full",
                    isCurrent && "bg-primary text-primary-foreground",
                    isCompleted && "bg-primary/20"
                  )}>
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <StepIcon className="h-4 w-4" />
                    )}
                  </div>
                  <span className="text-xs hidden md:block">{step.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-6">
        <ScrollArea className="h-[400px] pr-4">
          {/* Step 0: Datos Solicitante */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Datos del Solicitante</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de solicitante *</Label>
                  <Select
                    value={formData.tipo_solicitante}
                    onValueChange={(v) => updateField('tipo_solicitante', v as SolicitudData['tipo_solicitante'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="persona_fisica">Persona física</SelectItem>
                      <SelectItem value="persona_juridica">Persona jurídica</SelectItem>
                      <SelectItem value="entidad_publica">Entidad pública</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>NIF/CIF *</Label>
                  <Input
                    value={formData.nif}
                    onChange={(e) => updateField('nif', e.target.value.toUpperCase())}
                    placeholder="12345678A"
                    className={errors.nif ? 'border-destructive' : ''}
                  />
                  {errors.nif && <p className="text-xs text-destructive">{errors.nif}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Nombre / Razón Social *</Label>
                  <Input
                    value={formData.nombre_razon_social}
                    onChange={(e) => updateField('nombre_razon_social', e.target.value)}
                    className={errors.nombre_razon_social ? 'border-destructive' : ''}
                  />
                  {errors.nombre_razon_social && <p className="text-xs text-destructive">{errors.nombre_razon_social}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={formData.telefono}
                    onChange={(e) => updateField('telefono', e.target.value)}
                    placeholder="600 123 456"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input
                  value={formData.direccion}
                  onChange={(e) => updateField('direccion', e.target.value)}
                  placeholder="Calle, número, piso..."
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Código Postal</Label>
                  <Input
                    value={formData.codigo_postal}
                    onChange={(e) => updateField('codigo_postal', e.target.value)}
                    placeholder="28001"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Municipio *</Label>
                  <Input
                    value={formData.municipio}
                    onChange={(e) => updateField('municipio', e.target.value)}
                    className={errors.municipio ? 'border-destructive' : ''}
                  />
                  {errors.municipio && <p className="text-xs text-destructive">{errors.municipio}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Provincia</Label>
                  <Input
                    value={formData.provincia}
                    onChange={(e) => updateField('provincia', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Proyecto */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Descripción del Proyecto</h3>
              </div>

              <div className="space-y-2">
                <Label>Título del proyecto *</Label>
                <Input
                  value={formData.titulo_proyecto}
                  onChange={(e) => updateField('titulo_proyecto', e.target.value)}
                  placeholder="Nombre descriptivo del proyecto"
                  className={errors.titulo_proyecto ? 'border-destructive' : ''}
                />
                {errors.titulo_proyecto && <p className="text-xs text-destructive">{errors.titulo_proyecto}</p>}
              </div>

              <div className="space-y-2">
                <Label>Descripción detallada *</Label>
                <Textarea
                  value={formData.descripcion}
                  onChange={(e) => updateField('descripcion', e.target.value)}
                  placeholder="Describe el proyecto, sus objetivos y las actuaciones previstas..."
                  rows={4}
                  className={errors.descripcion ? 'border-destructive' : ''}
                />
                {errors.descripcion && <p className="text-xs text-destructive">{errors.descripcion}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sector de actividad *</Label>
                  <Select
                    value={formData.sector_actividad}
                    onValueChange={(v) => updateField('sector_actividad', v)}
                  >
                    <SelectTrigger className={errors.sector_actividad ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Selecciona un sector" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTORES_ACTIVIDAD.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.sector_actividad && <p className="text-xs text-destructive">{errors.sector_actividad}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Línea de actuación</Label>
                  <Select
                    value={formData.linea_actuacion}
                    onValueChange={(v) => updateField('linea_actuacion', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una línea" />
                    </SelectTrigger>
                    <SelectContent>
                      {LINEAS_ACTUACION.map(l => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Objetivos específicos</Label>
                <Textarea
                  value={formData.objetivos}
                  onChange={(e) => updateField('objetivos', e.target.value)}
                  placeholder="Describe los objetivos que se pretenden alcanzar..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 2: Localización */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Localización del Proyecto</h3>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium">Requisito de zona rural</p>
                    <p>El proyecto debe ejecutarse en un municipio dentro del territorio LEADER del GAL correspondiente.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Municipio donde se ejecutará *</Label>
                  <Input
                    value={formData.municipio_proyecto}
                    onChange={(e) => updateField('municipio_proyecto', e.target.value)}
                    placeholder="Municipio del proyecto"
                    className={errors.municipio_proyecto ? 'border-destructive' : ''}
                  />
                  {errors.municipio_proyecto && <p className="text-xs text-destructive">{errors.municipio_proyecto}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Dirección del proyecto</Label>
                  <Input
                    value={formData.direccion_proyecto}
                    onChange={(e) => updateField('direccion_proyecto', e.target.value)}
                    placeholder="Dirección o ubicación"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                <Checkbox
                  id="zona_rural"
                  checked={formData.zona_rural}
                  onCheckedChange={(checked) => updateField('zona_rural', !!checked)}
                />
                <Label htmlFor="zona_rural" className="cursor-pointer">
                  Confirmo que el proyecto se ejecutará en zona rural elegible LEADER
                </Label>
              </div>
            </div>
          )}

          {/* Step 3: Presupuesto */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Euro className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Presupuesto y Financiación</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Presupuesto total (€) *</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={formData.presupuesto_total || ''}
                    onChange={(e) => updateField('presupuesto_total', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className={errors.presupuesto_total ? 'border-destructive' : ''}
                  />
                  {errors.presupuesto_total && <p className="text-xs text-destructive">{errors.presupuesto_total}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Inversión subvencionable (€)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={formData.inversion_subvencionable || ''}
                    onChange={(e) => updateField('inversion_subvencionable', parseFloat(e.target.value) || 0)}
                    placeholder="Dejar vacío si es igual al total"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Porcentaje de ayuda solicitado (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={80}
                      value={formData.porcentaje_ayuda}
                      onChange={(e) => updateField('porcentaje_ayuda', Math.min(80, parseFloat(e.target.value) || 0))}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={calculateAid}
                      title="Calcular importe"
                    >
                      <Calculator className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Máximo 80% según convocatoria</p>
                </div>

                <div className="space-y-2">
                  <Label>Importe de ayuda solicitado (€) *</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={formData.importe_solicitado || ''}
                    onChange={(e) => updateField('importe_solicitado', parseFloat(e.target.value) || 0)}
                    className={cn(
                      "font-semibold text-primary",
                      errors.importe_solicitado && 'border-destructive'
                    )}
                  />
                  {errors.importe_solicitado && <p className="text-xs text-destructive">{errors.importe_solicitado}</p>}
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="otros_fondos"
                    checked={formData.otros_fondos}
                    onCheckedChange={(checked) => updateField('otros_fondos', !!checked)}
                  />
                  <Label htmlFor="otros_fondos" className="cursor-pointer">
                    El proyecto recibe o ha solicitado otras ayudas públicas
                  </Label>
                </div>

                {formData.otros_fondos && (
                  <Textarea
                    value={formData.detalle_otros_fondos || ''}
                    onChange={(e) => updateField('detalle_otros_fondos', e.target.value)}
                    placeholder="Detalla las otras ayudas solicitadas o concedidas..."
                    rows={2}
                  />
                )}
              </div>

              {/* Summary */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Resumen financiero</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Presupuesto total:</span>
                  <span className="font-medium text-right">{formData.presupuesto_total.toLocaleString('es-ES')} €</span>
                  <span className="text-muted-foreground">Base subvencionable:</span>
                  <span className="font-medium text-right">{(formData.inversion_subvencionable || formData.presupuesto_total).toLocaleString('es-ES')} €</span>
                  <span className="text-muted-foreground">Ayuda solicitada:</span>
                  <span className="font-semibold text-primary text-right">{formData.importe_solicitado.toLocaleString('es-ES')} €</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Documentación */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Upload className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Documentación Requerida</h3>
              </div>

              {errors.documentos && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <p className="text-sm text-destructive">{errors.documentos}</p>
                </div>
              )}

              <div className="space-y-3">
                {formData.documentos.map((doc, index) => (
                  <div 
                    key={doc.tipo}
                    className={cn(
                      "p-3 border rounded-lg flex items-center justify-between",
                      doc.subido ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900" : ""
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className={cn("h-5 w-5", doc.subido ? "text-green-600" : "text-muted-foreground")} />
                      <div>
                        <p className="font-medium text-sm">
                          {doc.nombre}
                          {doc.obligatorio && <span className="text-destructive ml-1">*</span>}
                        </p>
                        {doc.obligatorio && (
                          <Badge variant="outline" className="text-xs mt-1">Obligatorio</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant={doc.subido ? "outline" : "secondary"}
                      size="sm"
                      onClick={() => {
                        // Simulate upload
                        const newDocs = [...formData.documentos];
                        newDocs[index].subido = !newDocs[index].subido;
                        updateField('documentos', newDocs);
                      }}
                    >
                      {doc.subido ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Subido
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-1" />
                          Subir
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                * Documentos obligatorios. Formatos aceptados: PDF, JPG, PNG. Tamaño máximo: 10MB por archivo.
              </p>
            </div>
          )}

          {/* Step 5: Declaraciones */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Check className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Declaraciones Responsables</h3>
              </div>

              <div className="space-y-4">
                {[
                  { field: 'declaracion_veracidad', text: 'Declaro que todos los datos contenidos en esta solicitud y la documentación aportada son veraces.' },
                  { field: 'declaracion_no_inhabilitacion', text: 'Declaro no estar incurso en ninguna de las causas de inhabilitación previstas en la Ley General de Subvenciones.' },
                  { field: 'declaracion_no_deudas', text: 'Declaro estar al corriente en el cumplimiento de las obligaciones tributarias y con la Seguridad Social.' },
                  { field: 'declaracion_minimis', text: 'Declaro conocer el régimen de minimis y que las ayudas recibidas en los últimos 3 años no superan los límites establecidos.' },
                ].map(({ field, text }) => (
                  <div 
                    key={field}
                    className={cn(
                      "flex items-start space-x-3 p-3 rounded-lg border",
                      errors[field] ? "border-destructive bg-destructive/5" : "hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      id={field}
                      checked={formData[field as keyof SolicitudData] as boolean}
                      onCheckedChange={(checked) => updateField(field as keyof SolicitudData, !!checked as any)}
                      className="mt-0.5"
                    />
                    <Label htmlFor={field} className="cursor-pointer text-sm leading-relaxed">
                      {text} *
                    </Label>
                  </div>
                ))}

                <Separator />

                <div 
                  className={cn(
                    "flex items-start space-x-3 p-4 rounded-lg border-2",
                    formData.acepta_condiciones ? "border-primary bg-primary/5" : "border-muted"
                  )}
                >
                  <Checkbox
                    id="acepta_condiciones"
                    checked={formData.acepta_condiciones}
                    onCheckedChange={(checked) => updateField('acepta_condiciones', !!checked)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="acepta_condiciones" className="cursor-pointer text-sm leading-relaxed font-medium">
                    He leído y acepto las bases de la convocatoria, la normativa aplicable y autorizo el tratamiento 
                    de mis datos personales conforme a la política de privacidad. *
                  </Label>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <Separator />

      <CardFooter className="flex justify-between pt-4">
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button
            variant="outline"
            onClick={saveDraft}
            disabled={isSavingDraft}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSavingDraft ? 'Guardando...' : 'Guardar borrador'}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>

          {currentStep < WIZARD_STEPS.length - 1 ? (
            <Button onClick={nextStep}>
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-primary to-green-600"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

export default GaliaSolicitudWizard;
