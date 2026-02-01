/**
 * HRHelpIndex - Índice completo de servicios del módulo RRHH
 * Navegación estructurada por todos los servicios disponibles
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Search, BookOpen, ChevronRight, ExternalLink,
  TrendingUp, DollarSign, Calendar, FileText, Building2,
  Shield, Brain, Newspaper, HelpCircle, Rocket,
  Users, Calculator, Clock, HeartHandshake, Upload
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HRHelpIndexProps {
  companyId: string;
  onNavigate?: (section: string) => void;
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

export function HRHelpIndex({ companyId, onNavigate }: HRHelpIndexProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [helpData, setHelpData] = useState<any[]>([]);

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
          {/* Buscador */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en el índice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
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

      {/* Quick links */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="p-4">
          <h4 className="font-medium text-sm mb-3">Accesos rápidos</h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
              <Calculator className="h-3 w-3 mr-1" />
              Calcular nómina
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
              <DollarSign className="h-3 w-3 mr-1" />
              Finiquito
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
              <Shield className="h-3 w-3 mr-1" />
              Cotizaciones SS
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
              <Calendar className="h-3 w-3 mr-1" />
              Vacaciones
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
              <FileText className="h-3 w-3 mr-1" />
              Contratos
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default HRHelpIndex;
