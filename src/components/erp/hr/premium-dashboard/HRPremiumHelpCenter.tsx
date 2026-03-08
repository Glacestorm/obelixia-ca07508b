/**
 * HRPremiumHelpCenter — P9.13
 * Contextual inline documentation for all 8 Premium HR modules.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import {
  HelpCircle, Shield, Brain, Users, Scale, Layers, FileText,
  BarChart3, UserCog, Search, BookOpen, Lightbulb, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
}

type ModuleKey = 'security' | 'ai_governance' | 'workforce' | 'fairness' | 'twin' | 'legal' | 'cnae' | 'role_experience';

interface HelpSection {
  title: string;
  content: string;
  tips?: string[];
  warnings?: string[];
}

interface ModuleHelp {
  label: string;
  icon: React.ReactNode;
  description: string;
  sections: HelpSection[];
}

const HELP_CONTENT: Record<ModuleKey, ModuleHelp> = {
  security: {
    label: 'Security & Data Masking',
    icon: <Shield className="h-4 w-4" />,
    description: 'Protección de datos sensibles, segregación de funciones y auditoría de accesos.',
    sections: [
      { title: '¿Qué es Data Masking?', content: 'El enmascaramiento de datos oculta información sensible (DNI, salarios, datos médicos) según el nivel de clasificación y el rol del usuario. Se configuran reglas por campo y nivel de acceso.', tips: ['Configura reglas para campos PII antes de dar acceso a usuarios externos', 'Usa niveles de clasificación: público, interno, confidencial, restringido'] },
      { title: 'Segregación de Funciones (SoD)', content: 'Previene conflictos de interés definiendo pares de roles incompatibles. Por ejemplo, quien aprueba nóminas no puede modificarlas.', warnings: ['Las violaciones de SoD se registran automáticamente como incidencias de seguridad'] },
      { title: 'Log de Acceso a Datos', content: 'Registro inmutable de todos los accesos a datos sensibles, cumpliendo con GDPR Art. 30. Incluye quién, qué, cuándo y desde dónde.' },
    ],
  },
  ai_governance: {
    label: 'AI Governance',
    icon: <Brain className="h-4 w-4" />,
    description: 'Gobernanza de modelos IA conforme a EU AI Act, auditorías de sesgo y explicabilidad.',
    sections: [
      { title: 'Registro de Modelos', content: 'Todo modelo de IA usado en decisiones de RRHH debe registrarse con su propósito, datos de entrenamiento, métricas de rendimiento y nivel de riesgo según EU AI Act.', tips: ['Los modelos de alto riesgo (contratación, evaluación) requieren auditoría trimestral'] },
      { title: 'Auditoría de Sesgo', content: 'Detecta sesgos algorítmicos mediante métricas de impacto dispar y paridad demográfica. Se ejecutan automáticamente tras cada ciclo de decisiones.', warnings: ['Un ratio de impacto dispar < 0.8 activa alerta automática'] },
      { title: 'Decisiones Automatizadas', content: 'Cada decisión de IA se registra con su contexto, resultado, confianza y factores explicativos. Los empleados tienen derecho a solicitar revisión humana (GDPR Art. 22).' },
    ],
  },
  workforce: {
    label: 'Workforce Planning',
    icon: <Users className="h-4 w-4" />,
    description: 'Planificación estratégica de fuerza laboral con simulación de escenarios.',
    sections: [
      { title: 'Planes de Workforce', content: 'Define planes estratégicos con horizonte temporal, objetivos de headcount, presupuesto y competencias requeridas. Cada plan puede tener múltiples escenarios.', tips: ['Crea al menos un escenario base, uno optimista y uno pesimista'] },
      { title: 'Simulación de Escenarios', content: 'Modela el impacto de cambios organizacionales: fusiones, expansiones, reestructuraciones. La IA analiza viabilidad, costes y riesgos de cada escenario.' },
      { title: 'Gap Analysis', content: 'Identifica brechas entre la plantilla actual y la planificada en competencias, capacidad y distribución geográfica.' },
    ],
  },
  fairness: {
    label: 'Fairness Engine',
    icon: <Scale className="h-4 w-4" />,
    description: 'Motor de equidad salarial, análisis de brecha y casos de justicia organizacional.',
    sections: [
      { title: 'Análisis de Equidad Salarial', content: 'Compara compensaciones por género, antigüedad, nivel y localización. Detecta brechas estadísticamente significativas y propone ajustes.', tips: ['Ejecuta el análisis trimestralmente para cumplir con la Ley de Igualdad Retributiva'] },
      { title: 'Casos de Justicia', content: 'Gestiona reclamaciones de equidad con seguimiento, investigación y resolución documentada. Alimenta el registro de igualdad obligatorio.' },
      { title: 'Reglas de Pay Equity', content: 'Define umbrales aceptables de diferencia salarial por categoría. Las violaciones generan alertas automáticas al comité de igualdad.' },
    ],
  },
  twin: {
    label: 'Digital Twin',
    icon: <Layers className="h-4 w-4" />,
    description: 'Gemelo digital organizacional: snapshots, divergencias y experimentos what-if.',
    sections: [
      { title: 'Snapshots Organizacionales', content: 'Captura periódica del estado completo de la organización: estructura, headcount, competencias, costes. Permite comparar evolución temporal.' },
      { title: 'Alertas de Divergencia', content: 'Detecta automáticamente cuando la realidad organizacional diverge del plan estratégico. Por ejemplo, un departamento que crece más de lo previsto.', warnings: ['Las divergencias >15% activan alerta crítica al CHRO'] },
      { title: 'Experimentos What-If', content: 'Simula cambios hipotéticos sobre el gemelo digital sin afectar datos reales. Ideal para evaluar reorganizaciones antes de implementarlas.' },
    ],
  },
  legal: {
    label: 'Legal Engine',
    icon: <FileText className="h-4 w-4" />,
    description: 'Generación automática de contratos, biblioteca de cláusulas y compliance documental.',
    sections: [
      { title: 'Generación de Contratos', content: 'Genera contratos laborales con IA basándose en plantillas, convenio colectivo aplicable y normativa vigente. Incluye revisión automática de compliance.', tips: ['Siempre revisa los contratos generados con el departamento legal antes de firmar'] },
      { title: 'Biblioteca de Cláusulas', content: 'Repositorio centralizado de cláusulas legales reutilizables, categorizadas por tipo (confidencialidad, no competencia, protección de datos) y jurisdicción.' },
      { title: 'Plantillas Legales', content: 'Plantillas predefinidas para diferentes tipos de contrato: indefinido, temporal, prácticas, alta dirección. Actualizadas según cambios normativos.' },
    ],
  },
  cnae: {
    label: 'CNAE Intelligence',
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'Inteligencia sectorial basada en código CNAE, benchmarks y evaluación de riesgos.',
    sections: [
      { title: 'Perfiles Sectoriales', content: 'Configura el perfil CNAE de tu empresa para recibir inteligencia sectorial específica: convenios aplicables, riesgos laborales típicos, ratios de referencia.', tips: ['Mantén actualizado tu código CNAE para recibir alertas normativas relevantes'] },
      { title: 'Evaluación de Riesgos', content: 'Analiza riesgos sectoriales específicos: siniestralidad laboral, rotación media del sector, cambios regulatorios inminentes.' },
      { title: 'Benchmarks', content: 'Compara tus indicadores de RRHH (absentismo, rotación, coste por empleado) con la media del sector según datos CNAE.' },
    ],
  },
  role_experience: {
    label: 'Role Experience',
    icon: <UserCog className="h-4 w-4" />,
    description: 'Experiencia personalizada por rol organizativo con dashboards y widgets dinámicos.',
    sections: [
      { title: 'Dashboards por Rol', content: 'Cada rol organizativo (CEO, Director RRHH, Manager, Empleado) tiene un dashboard personalizado con los KPIs y widgets más relevantes para su función.' },
      { title: 'Widgets Dinámicos', content: 'Los widgets se configuran por rol y se adaptan al contexto del usuario: departamento, centro de trabajo, nivel jerárquico. Se pueden añadir, quitar y reordenar.' },
      { title: 'Onboarding Contextual', content: 'Flujo de bienvenida personalizado según el rol del nuevo usuario, mostrando solo las funcionalidades relevantes para su posición.', tips: ['Configura el onboarding antes de dar de alta nuevos usuarios en el sistema'] },
    ],
  },
};

const MODULE_ORDER: ModuleKey[] = ['security', 'ai_governance', 'workforce', 'fairness', 'twin', 'legal', 'cnae', 'role_experience'];

export function HRPremiumHelpCenter({ className }: Props) {
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState<ModuleKey | null>(null);

  const filteredModules = MODULE_ORDER.filter(key => {
    if (!search) return true;
    const mod = HELP_CONTENT[key];
    const q = search.toLowerCase();
    return mod.label.toLowerCase().includes(q) ||
      mod.description.toLowerCase().includes(q) ||
      mod.sections.some(s => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q));
  });

  const activeModule = selectedModule && filteredModules.includes(selectedModule) ? selectedModule : null;
  const displayContent = activeModule ? HELP_CONTENT[activeModule] : null;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Centro de Ayuda Premium
        </h2>
        <p className="text-sm text-muted-foreground">Documentación contextual de los 8 módulos Premium HR</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar en la documentación..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Module List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Módulos</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-[420px]">
              <div className="space-y-1">
                {filteredModules.map(key => {
                  const mod = HELP_CONTENT[key];
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedModule(key)}
                      className={cn(
                        "w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-colors text-sm",
                        activeModule === key
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <span className={activeModule === key ? "text-primary" : "text-muted-foreground"}>
                        {mod.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate">{mod.label}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{mod.sections.length} secciones</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Content */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            {displayContent ? (
              <ScrollArea className="h-[440px]">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      {displayContent.icon}
                      {displayContent.label}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{displayContent.description}</p>
                  </div>

                  <Accordion type="multiple" className="w-full">
                    {displayContent.sections.map((section, idx) => (
                      <AccordionItem key={idx} value={`section-${idx}`}>
                        <AccordionTrigger className="text-sm font-medium">
                          {section.title}
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3">
                          <p className="text-sm text-foreground/80">{section.content}</p>

                          {section.tips && section.tips.length > 0 && (
                            <div className="space-y-1.5">
                              {section.tips.map((tip, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-primary/5 border border-primary/10">
                                  <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                  <span>{tip}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {section.warnings && section.warnings.length > 0 && (
                            <div className="space-y-1.5">
                              {section.warnings.map((warn, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-destructive/5 border border-destructive/10">
                                  <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                                  <span>{warn}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </ScrollArea>
            ) : (
              <div className="py-16 text-center">
                <HelpCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Selecciona un módulo para ver su documentación</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default HRPremiumHelpCenter;
