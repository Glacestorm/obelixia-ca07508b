/**
 * GALIA Portal - Pestaña de Ayuda
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HelpCircle, Sparkles, MessageSquare, AlertCircle, MapPin } from 'lucide-react';

const FAQS = [
  { q: '¿Quién puede solicitar ayudas LEADER?', a: 'PYMEs, autónomos, ayuntamientos y asociaciones ubicados en zonas rurales definidas en la estrategia de cada GAL.' },
  { q: '¿Qué porcentaje de ayuda puedo recibir?', a: 'La intensidad varía entre el 40% y 60% del coste elegible, dependiendo del tipo de proyecto y beneficiario.' },
  { q: '¿Cuál es la inversión mínima?', a: 'Generalmente entre 10.000€ y 15.000€, aunque puede variar según la convocatoria específica.' },
  { q: '¿Cuánto tarda la tramitación?', a: 'El proceso completo suele durar entre 6 y 12 meses desde la solicitud hasta la resolución.' },
  { q: '¿Puedo empezar el proyecto antes de la resolución?', a: 'No se recomienda. Los gastos anteriores a la resolución de concesión no son elegibles.' },
  { q: '¿Qué pasa si me deniegan la ayuda?', a: 'Puedes presentar un recurso de reposición en el plazo de 20 días hábiles desde la notificación.' },
  { q: '¿Cómo justifico los gastos?', a: 'Mediante facturas, justificantes de pago bancario y documentación acreditativa de la inversión realizada.' },
];

interface AyudaTabProps {
  onShowAsistente: () => void;
}

export function AyudaTab({ onShowAsistente }: AyudaTabProps) {
  return (
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
              {FAQS.map((faq, idx) => (
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
              onClick={onShowAsistente}
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
  );
}

export default AyudaTab;
