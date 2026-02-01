/**
 * HRHelpIndex - Índice completo de servicios del módulo RRHH
 * Navegación estructurada + acciones ejecutables + voz
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Search, BookOpen, ChevronRight,
  TrendingUp, DollarSign, Calendar, FileText, Building2,
  Shield, Brain, Newspaper, Rocket,
  Users, Calculator, HeartHandshake, Upload, Mic, MicOff, Volume2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HRHelpIndexProps {
  companyId: string;
  onNavigate?: (section: string) => void;
  onOpenPayrollDialog?: () => void;
  onOpenVacationDialog?: () => void;
  onAskAgent?: (question: string) => void;
}

// Estructura del índice con iconos
const HELP_INDEX = [
  {
    code: 'dashboard',
    name: 'Dashboard',
    icon: TrendingUp,
    description: 'Panel principal con KPIs, alertas y resumen de RRHH',
    subsections: [],
  },
  {
    code: 'empleados',
    name: 'Gestión de Empleados',
    icon: Users,
    description: 'Fichas completas de empleados, altas, bajas y modificaciones',
    subsections: [
      { code: 'empleados.ficha', name: 'Ficha de empleado', desc: 'Datos personales, laborales y bancarios' },
      { code: 'empleados.alta', name: 'Alta de empleado', desc: 'Proceso de incorporación' },
      { code: 'empleados.baja', name: 'Baja de empleado', desc: 'Proceso de desvinculación' },
    ],
  },
  {
    code: 'nominas',
    name: 'Nóminas',
    icon: DollarSign,
    description: 'Generación y gestión de nóminas mensuales',
    subsections: [
      { code: 'nominas.conceptos', name: 'Conceptos salariales', desc: 'Configuración de devengos y deducciones' },
      { code: 'nominas.calculo', name: 'Cálculo de nóminas', desc: 'Proceso de cálculo automático' },
      { code: 'nominas.historico', name: 'Histórico', desc: 'Consulta de nóminas anteriores' },
      { code: 'nominas.remesas', name: 'Remesas bancarias', desc: 'Exportación SEPA para pagos' },
    ],
  },
  {
    code: 'seguridad_social',
    name: 'Seguridad Social',
    icon: Shield,
    description: 'Cotizaciones, presentaciones RED y trámites con la TGSS',
    subsections: [
      { code: 'seguridad_social.cotizaciones', name: 'Cotizaciones', desc: 'Cálculo de bases y tipos' },
      { code: 'seguridad_social.red', name: 'Sistema RED', desc: 'Presentaciones electrónicas' },
      { code: 'seguridad_social.siltra', name: 'SILTRA', desc: 'Remesas de liquidación' },
      { code: 'seguridad_social.certificados', name: 'Certificados', desc: 'Vida laboral, estar al corriente' },
    ],
  },
  {
    code: 'vacaciones',
    name: 'Vacaciones y Permisos',
    icon: Calendar,
    description: 'Gestión de vacaciones, permisos y ausencias',
    subsections: [
      { code: 'vacaciones.solicitud', name: 'Solicitudes', desc: 'Tramitación de vacaciones' },
      { code: 'vacaciones.calendario', name: 'Calendario', desc: 'Vista de vacaciones por equipo' },
      { code: 'vacaciones.permisos', name: 'Permisos', desc: 'Permisos retribuidos y no retribuidos' },
    ],
  },
  {
    code: 'contratos',
    name: 'Contratos',
    icon: FileText,
    description: 'Gestión de contratos laborales',
    subsections: [
      { code: 'contratos.tipos', name: 'Tipos de contrato', desc: 'Indefinido, temporal, formación...' },
      { code: 'contratos.finiquito', name: 'Finiquitos', desc: 'Cálculo de finiquitos' },
      { code: 'contratos.indemnizacion', name: 'Indemnizaciones', desc: 'Cálculo por despido' },
    ],
  },
  {
    code: 'sindicatos',
    name: 'Sindicatos',
    icon: HeartHandshake,
    description: 'Afiliación sindical y representación laboral',
    subsections: [
      { code: 'sindicatos.afiliacion', name: 'Afiliación', desc: 'Gestión de afiliaciones' },
      { code: 'sindicatos.representantes', name: 'Representantes', desc: 'Delegados y comité' },
      { code: 'sindicatos.horas', name: 'Crédito horario', desc: 'Horas sindicales art. 68 ET' },
      { code: 'sindicatos.elecciones', name: 'Elecciones', desc: 'Proceso electoral' },
    ],
  },
  {
    code: 'documentos',
    name: 'Documentación',
    icon: Upload,
    description: 'Gestión documental por empleado',
    subsections: [
      { code: 'documentos.subida', name: 'Subida de documentos', desc: 'Contratos, DNI, títulos...' },
      { code: 'documentos.vencimientos', name: 'Vencimientos', desc: 'Alertas de caducidad' },
    ],
  },
  {
    code: 'organizacion',
    name: 'Organigrama',
    icon: Building2,
    description: 'Estructura organizativa de la empresa',
    subsections: [
      { code: 'organizacion.departamentos', name: 'Departamentos', desc: 'Gestión de áreas' },
      { code: 'organizacion.puestos', name: 'Puestos', desc: 'Definición y categorías' },
      { code: 'organizacion.salarios', name: 'Atribuciones salariales', desc: 'Bandas salariales por puesto' },
    ],
  },
  {
    code: 'prl',
    name: 'Seguridad y Salud (PRL)',
    icon: Shield,
    description: 'Prevención de riesgos laborales',
    subsections: [
      { code: 'prl.evaluacion', name: 'Evaluación de riesgos', desc: 'Identificación y valoración' },
      { code: 'prl.formacion', name: 'Formación PRL', desc: 'Cursos y certificados' },
      { code: 'prl.epis', name: 'EPIs', desc: 'Equipos de protección' },
    ],
  },
  {
    code: 'agente_ia',
    name: 'Agente IA',
    icon: Brain,
    description: 'Asistente inteligente de RRHH',
    subsections: [
      { code: 'agente_ia.consultas', name: 'Consultas', desc: 'Preguntas sobre normativa' },
      { code: 'agente_ia.calculos', name: 'Cálculos', desc: 'Nóminas, finiquitos, indemnizaciones' },
    ],
  },
  {
    code: 'normativa',
    name: 'Normativa Laboral',
    icon: BookOpen,
    description: 'Legislación y convenios aplicables',
    subsections: [
      { code: 'normativa.et', name: 'Estatuto Trabajadores', desc: 'RDL 2/2015' },
      { code: 'normativa.lgss', name: 'Ley Seg. Social', desc: 'RDL 8/2015' },
      { code: 'normativa.convenios', name: 'Convenios colectivos', desc: 'Según CNAE' },
    ],
  },
];

export function HRHelpIndex({ 
  companyId, 
  onNavigate, 
  onOpenPayrollDialog,
  onOpenVacationDialog,
  onAskAgent 
}: HRHelpIndexProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [helpData, setHelpData] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Web Speech API para voz
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Tu navegador no soporta reconocimiento de voz');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      toast.error('Error en el reconocimiento de voz');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchTerm(transcript);
      // Si hay callback para agente, enviar la pregunta
      if (onAskAgent && transcript.length > 3) {
        onAskAgent(transcript);
      }
    };

    recognition.start();
  }, [onAskAgent]);

  // Sintetizar voz
  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      toast.error('Tu navegador no soporta síntesis de voz');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    speechSynthesis.speak(utterance);
  }, []);

  // Acciones rápidas
  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'payroll':
        if (onOpenPayrollDialog) {
          onOpenPayrollDialog();
        } else {
          onNavigate?.('payroll');
        }
        break;
      case 'severance':
        if (onAskAgent) {
          onAskAgent('Calcular finiquito para empleado');
        } else {
          onNavigate?.('agent');
          toast.info('Navega al Agente IA para calcular finiquitos');
        }
        break;
      case 'ss':
        onNavigate?.('ss');
        break;
      case 'vacation':
        if (onOpenVacationDialog) {
          onOpenVacationDialog();
        } else {
          onNavigate?.('vacations');
        }
        break;
      case 'contracts':
        onNavigate?.('contracts');
        break;
      default:
        onNavigate?.(action);
    }
  }, [onNavigate, onOpenPayrollDialog, onOpenVacationDialog, onAskAgent]);

  // Cargar datos de ayuda desde DB
  useEffect(() => {
    const fetchHelpData = async () => {
      const { data, error } = await supabase
        .from('erp_hr_help_index')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (data) setHelpData(data);
    };
    fetchHelpData();
  }, []);

  // Filtrar índice por búsqueda
  const filteredIndex = HELP_INDEX.filter(section => {
    const matchesMain = section.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       section.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSub = section.subsections.some(
      sub => sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             sub.desc.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return matchesMain || matchesSub;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Índice de Servicios RRHH</CardTitle>
              <CardDescription>
                Consulta rápida de todas las funcionalidades del módulo
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Buscador con voz */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar o preguntar por voz..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button 
              variant={isListening ? "default" : "outline"} 
              size="icon"
              onClick={startListening}
              className={isListening ? "animate-pulse" : ""}
            >
              {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => speak('Bienvenido al módulo de Recursos Humanos. Puedo ayudarte con nóminas, vacaciones, contratos y más.')}
              disabled={isSpeaking}
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Índice acordeón */}
          <ScrollArea className="h-[500px] pr-4">
            <Accordion type="multiple" className="space-y-2">
              {filteredIndex.map((section) => {
                const Icon = section.icon;
                return (
                  <AccordionItem 
                    key={section.code} 
                    value={section.code}
                    className="border rounded-lg px-3"
                  >
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 text-left">
                        <div className="p-1.5 rounded-md bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{section.name}</p>
                          <p className="text-xs text-muted-foreground">{section.description}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-3">
                      {section.subsections.length > 0 ? (
                        <div className="space-y-1 ml-9">
                          {section.subsections.map((sub) => (
                            <button
                              key={sub.code}
                              onClick={() => onNavigate?.(sub.code)}
                              className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors text-left group"
                            >
                              <div>
                                <p className="text-sm font-medium">{sub.name}</p>
                                <p className="text-xs text-muted-foreground">{sub.desc}</p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground ml-9">
                          Acceda a esta sección desde la navegación principal.
                        </p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Quick links - OPERATIVOS */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="p-4">
          <h4 className="font-medium text-sm mb-3">Accesos rápidos</h4>
          <div className="flex flex-col gap-2">
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-primary/10 justify-start py-2 whitespace-normal text-left"
              onClick={() => handleQuickAction('payroll')}
            >
              <Calculator className="h-3 w-3 mr-2 flex-shrink-0" />
              Calcular nómina
            </Badge>
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-primary/10 justify-start py-2 whitespace-normal text-left"
              onClick={() => handleQuickAction('severance')}
            >
              <DollarSign className="h-3 w-3 mr-2 flex-shrink-0" />
              Calcular finiquito
            </Badge>
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-primary/10 justify-start py-2 whitespace-normal text-left"
              onClick={() => handleQuickAction('ss')}
            >
              <Shield className="h-3 w-3 mr-2 flex-shrink-0" />
              Cotizaciones Seguridad Social
            </Badge>
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-primary/10 justify-start py-2 whitespace-normal text-left"
              onClick={() => handleQuickAction('vacation')}
            >
              <Calendar className="h-3 w-3 mr-2 flex-shrink-0" />
              Solicitar vacaciones
            </Badge>
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-primary/10 justify-start py-2 whitespace-normal text-left"
              onClick={() => handleQuickAction('contracts')}
            >
              <FileText className="h-3 w-3 mr-2 flex-shrink-0" />
              Gestionar contratos
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default HRHelpIndex;
