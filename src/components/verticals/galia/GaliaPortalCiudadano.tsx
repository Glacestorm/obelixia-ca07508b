/**
 * GALIA - Portal Público del Ciudadano
 * Interfaz para ciudadanos, empresas y entidades
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  FileText, 
  Calendar, 
  MapPin, 
  Euro, 
  Clock,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  MessageSquare,
  Download,
  ExternalLink,
  Building2,
  Leaf,
  Users,
  Sparkles
} from 'lucide-react';
import { GaliaAsistenteVirtual } from './GaliaAsistenteVirtual';
import { cn } from '@/lib/utils';

interface Convocatoria {
  id: string;
  titulo: string;
  galNombre: string;
  fechaInicio: string;
  fechaFin: string;
  presupuesto: number;
  estado: 'abierta' | 'proxima' | 'cerrada';
  tipoProyecto: string[];
  intensidadAyuda: number;
}

interface ExpedientePublico {
  codigo: string;
  titulo: string;
  estado: string;
  fechaUltimaActualizacion: string;
  progreso: number;
  proximoPaso?: string;
}

// Mock data para demo
const convocatoriasMock: Convocatoria[] = [
  {
    id: '1',
    titulo: 'Ayudas a la diversificación económica rural 2024',
    galNombre: 'GAL Sierra Norte',
    fechaInicio: '2024-01-15',
    fechaFin: '2024-06-30',
    presupuesto: 500000,
    estado: 'abierta',
    tipoProyecto: ['Turismo rural', 'Agroalimentario', 'Artesanía'],
    intensidadAyuda: 45
  },
  {
    id: '2',
    titulo: 'Modernización de explotaciones agrarias',
    galNombre: 'GAL Campiña Sur',
    fechaInicio: '2024-03-01',
    fechaFin: '2024-09-15',
    presupuesto: 750000,
    estado: 'abierta',
    tipoProyecto: ['Agricultura', 'Ganadería', 'Transformación'],
    intensidadAyuda: 50
  },
  {
    id: '3',
    titulo: 'Servicios básicos para población rural',
    galNombre: 'GAL Montaña Oriental',
    fechaInicio: '2024-07-01',
    fechaFin: '2024-12-31',
    presupuesto: 300000,
    estado: 'proxima',
    tipoProyecto: ['Servicios', 'Infraestructuras', 'Digital'],
    intensidadAyuda: 60
  }
];

export function GaliaPortalCiudadano() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('convocatorias');
  const [showAsistente, setShowAsistente] = useState(false);
  const [codigoExpediente, setCodigoExpediente] = useState('');
  const [expedienteConsultado, setExpedienteConsultado] = useState<ExpedientePublico | null>(null);

  const filteredConvocatorias = convocatoriasMock.filter(c => 
    c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.galNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.tipoProyecto.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleConsultarExpediente = () => {
    // Simulación de consulta
    if (codigoExpediente.trim()) {
      setExpedienteConsultado({
        codigo: codigoExpediente.toUpperCase(),
        titulo: 'Proyecto de turismo rural sostenible',
        estado: 'En valoración técnica',
        fechaUltimaActualizacion: new Date().toISOString(),
        progreso: 65,
        proximoPaso: 'Pendiente de informe de elegibilidad'
      });
    }
  };

  const getEstadoBadge = (estado: Convocatoria['estado']) => {
    switch (estado) {
      case 'abierta':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Abierta</Badge>;
      case 'proxima':
        return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30">Próximamente</Badge>;
      case 'cerrada':
        return <Badge className="bg-gray-500/20 text-gray-600 border-gray-500/30">Cerrada</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-background to-emerald-50/30">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Leaf className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Portal LEADER</h1>
              <p className="text-green-100">Ayudas al desarrollo rural - Programa FEADER</p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold">12</div>
              <div className="text-sm text-green-100">Convocatorias activas</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold">€4.5M</div>
              <div className="text-sm text-green-100">Presupuesto disponible</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold">28</div>
              <div className="text-sm text-green-100">GALs participantes</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold">156</div>
              <div className="text-sm text-green-100">Proyectos en curso</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="convocatorias" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Convocatorias</span>
            </TabsTrigger>
            <TabsTrigger value="consulta" className="gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Mi Expediente</span>
            </TabsTrigger>
            <TabsTrigger value="documentacion" className="gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Documentación</span>
            </TabsTrigger>
            <TabsTrigger value="ayuda" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Ayuda</span>
            </TabsTrigger>
          </TabsList>

          {/* Convocatorias Tab */}
          <TabsContent value="convocatorias" className="space-y-6">
            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, GAL o tipo de proyecto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" className="gap-2">
                <MapPin className="h-4 w-4" />
                Filtrar por zona
              </Button>
            </div>

            {/* Convocatorias List */}
            <div className="grid gap-4">
              {filteredConvocatorias.map((conv) => (
                <Card key={conv.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold">{conv.titulo}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Building2 className="h-4 w-4" />
                              {conv.galNombre}
                            </div>
                          </div>
                          {getEstadoBadge(conv.estado)}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {conv.tipoProyecto.map((tipo) => (
                            <Badge key={tipo} variant="secondary" className="text-xs">
                              {tipo}
                            </Badge>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Hasta {new Date(conv.fechaFin).toLocaleDateString('es-ES')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Euro className="h-4 w-4 text-muted-foreground" />
                            <span>{(conv.presupuesto / 1000).toFixed(0)}K disponibles</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>{conv.intensidadAyuda}% intensidad</span>
                          </div>
                          <div>
                            <Button size="sm" className="gap-2">
                              Ver detalles
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Consulta Expediente Tab */}
          <TabsContent value="consulta" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Consultar estado de expediente
                </CardTitle>
                <CardDescription>
                  Introduce el código de tu expediente para conocer su estado actual
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    placeholder="Ej: EXP-2024-00123"
                    value={codigoExpediente}
                    onChange={(e) => setCodigoExpediente(e.target.value)}
                    className="max-w-sm"
                  />
                  <Button onClick={handleConsultarExpediente}>Consultar</Button>
                </div>

                {expedienteConsultado && (
                  <Card className="bg-muted/50 mt-6">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm text-muted-foreground">Expediente</div>
                          <div className="text-xl font-bold">{expedienteConsultado.codigo}</div>
                          <div className="text-sm mt-1">{expedienteConsultado.titulo}</div>
                        </div>
                        <Badge className="bg-amber-500/20 text-amber-700">
                          {expedienteConsultado.estado}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progreso de tramitación</span>
                          <span className="font-medium">{expedienteConsultado.progreso}%</span>
                        </div>
                        <Progress value={expedienteConsultado.progreso} className="h-2" />
                      </div>

                      <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg text-sm">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span><strong>Próximo paso:</strong> {expedienteConsultado.proximoPaso}</span>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Última actualización: {new Date(expedienteConsultado.fechaUltimaActualizacion).toLocaleString('es-ES')}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documentación Tab */}
          <TabsContent value="documentacion" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Guía del solicitante</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Pasos para solicitar ayudas LEADER
                    </p>
                    <Button variant="link" className="px-0 h-auto mt-2">
                      Descargar PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Checklist de documentación</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Documentos necesarios según tipo de proyecto
                    </p>
                    <Button variant="link" className="px-0 h-auto mt-2">
                      Ver checklist
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="p-3 bg-amber-500/10 rounded-lg">
                    <Euro className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Guía de justificación</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Cómo justificar los gastos de tu proyecto
                    </p>
                    <Button variant="link" className="px-0 h-auto mt-2">
                      Descargar PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Directorio de GALs</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Encuentra tu Grupo de Acción Local
                    </p>
                    <Button variant="link" className="px-0 h-auto mt-2">
                      Ver directorio
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Ayuda Tab */}
          <TabsContent value="ayuda" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Preguntas frecuentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {[
                        { q: '¿Quién puede solicitar ayudas LEADER?', a: 'PYMEs, autónomos, ayuntamientos y asociaciones ubicados en zonas rurales definidas en la estrategia de cada GAL.' },
                        { q: '¿Qué porcentaje de ayuda puedo recibir?', a: 'La intensidad varía entre el 40% y 60% del coste elegible, dependiendo del tipo de proyecto y beneficiario.' },
                        { q: '¿Cuál es la inversión mínima?', a: 'Generalmente entre 10.000€ y 15.000€, aunque puede variar según la convocatoria específica.' },
                        { q: '¿Cuánto tarda la tramitación?', a: 'El proceso completo suele durar entre 6 y 12 meses desde la solicitud hasta la resolución.' },
                        { q: '¿Puedo empezar el proyecto antes de la resolución?', a: 'No se recomienda. Los gastos anteriores a la resolución de concesión no son elegibles.' },
                      ].map((faq, idx) => (
                        <div key={idx} className="p-4 border rounded-lg">
                          <div className="font-medium flex items-start gap-2">
                            <HelpCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            {faq.q}
                          </div>
                          <p className="text-sm text-muted-foreground mt-2 ml-6">
                            {faq.a}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-primary/20 rounded-lg">
                        <Sparkles className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Asistente Virtual GALIA</h3>
                        <p className="text-sm text-muted-foreground">
                          IA especializada en ayudas LEADER
                        </p>
                      </div>
                    </div>
                    <p className="text-sm mb-4">
                      Resuelve tus dudas sobre convocatorias, documentación, requisitos y más con nuestro asistente inteligente.
                    </p>
                    <Button 
                      onClick={() => setShowAsistente(true)}
                      className="w-full gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Iniciar conversación
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Contacto directo</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        <span>Para consultas específicas, contacta con tu GAL</span>
                      </div>
                      <Button variant="outline" className="w-full gap-2">
                        <MapPin className="h-4 w-4" />
                        Buscar mi GAL
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Assistant */}
      {showAsistente && (
        <div className="fixed bottom-4 right-4 w-full max-w-md z-50">
          <GaliaAsistenteVirtual 
            modo="ciudadano"
            onClose={() => setShowAsistente(false)}
          />
        </div>
      )}
    </div>
  );
}

export default GaliaPortalCiudadano;
