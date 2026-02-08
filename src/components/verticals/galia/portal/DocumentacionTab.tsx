/**
 * GALIA Portal - Pestaña de Documentación
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, Download, Users, MapPin, 
  Sparkles, CheckCircle, Euro, ExternalLink 
} from 'lucide-react';
import { GaliaGuiasPasoAPaso } from '../GaliaGuiasPasoAPaso';
import { GaliaPlantillasJustificacion } from '../GaliaPlantillasJustificacion';
import { cn } from '@/lib/utils';

type DocSubTab = 'formularios' | 'guias' | 'justificacion';

interface DocumentacionTabProps {
  docSubTab: DocSubTab;
  onSubTabChange: (tab: DocSubTab) => void;
  codigoExpediente?: string;
  presupuestoAprobado?: number;
}

export function DocumentacionTab({
  docSubTab,
  onSubTabChange,
  codigoExpediente,
  presupuestoAprobado = 50000,
}: DocumentacionTabProps) {
  return (
    <div className="space-y-6">
      {/* Sub-navegación por categorías */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            docSubTab === 'formularios' 
              ? "bg-gradient-to-br from-primary/10 to-primary/20 border-primary ring-2 ring-primary/20" 
              : "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20"
          )}
          onClick={() => onSubTabChange('formularios')}
        >
          <CardContent className="p-6 text-center">
            <div className="p-4 bg-primary/20 rounded-xl w-fit mx-auto mb-3">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Formularios</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Documentos oficiales para tramitación
            </p>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            docSubTab === 'guias' 
              ? "bg-gradient-to-br from-emerald-500/10 to-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/20" 
              : "bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20"
          )}
          onClick={() => onSubTabChange('guias')}
        >
          <CardContent className="p-6 text-center">
            <div className="p-4 bg-emerald-500/20 rounded-xl w-fit mx-auto mb-3">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-lg">Guías Paso a Paso</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Manuales interactivos
            </p>
            <Badge className="mt-2 bg-emerald-500/20 text-emerald-700 border-emerald-500/30">Nuevo</Badge>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            docSubTab === 'justificacion' 
              ? "bg-gradient-to-br from-amber-500/10 to-amber-500/20 border-amber-500 ring-2 ring-amber-500/20" 
              : "bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20"
          )}
          onClick={() => onSubTabChange('justificacion')}
        >
          <CardContent className="p-6 text-center">
            <div className="p-4 bg-amber-500/20 rounded-xl w-fit mx-auto mb-3">
              <Euro className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="font-semibold text-lg">Justificación</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Plantillas de gastos
            </p>
            <Badge className="mt-2 bg-amber-500/20 text-amber-700 border-amber-500/30">Interactivo</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Contenido según sub-pestaña seleccionada */}
      {docSubTab === 'formularios' && <FormulariosSection />}
      {docSubTab === 'guias' && <GaliaGuiasPasoAPaso />}
      {docSubTab === 'justificacion' && (
        <GaliaPlantillasJustificacion 
          codigoExpediente={codigoExpediente}
          presupuestoAprobado={presupuestoAprobado}
          porcentajeAyuda={50}
        />
      )}
    </div>
  );
}

function FormulariosSection() {
  const documentos = [
    { titulo: 'Formulario de solicitud', desc: 'Documento oficial para presentar tu solicitud', tipo: 'PDF', size: '1.2 MB', icon: FileText },
    { titulo: 'Directorio de GALs de Asturias', desc: 'Encuentra tu Grupo de Acción Local por municipio', tipo: 'Mapa', badge: '11 GALs', icon: Users, action: 'Ver directorio', actionIcon: MapPin },
    { titulo: 'Modelo de memoria técnica', desc: 'Plantilla para describir tu proyecto y objetivos', tipo: 'DOCX', size: '156 KB', icon: FileText },
    { titulo: 'Modelo de presupuesto', desc: 'Excel con desglose por partidas y cálculo automático de ayuda', tipo: 'XLSX', size: '89 KB', icon: Sparkles },
    { titulo: 'Checklist de documentación', desc: 'Documentos necesarios según tipo de proyecto', tipo: 'Interactivo', icon: CheckCircle, action: 'Ver checklist', actionIcon: ExternalLink },
    { titulo: 'Declaraciones responsables', desc: 'Modelos de declaraciones exigidas por normativa', tipo: 'PDF', size: '320 KB', icon: FileText },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {documentos.map((doc, idx) => (
        <Card key={idx} className="hover:shadow-md transition-shadow cursor-pointer group">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <doc.icon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{doc.titulo}</h3>
              <p className="text-sm text-muted-foreground mt-1">{doc.desc}</p>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline" className="text-xs">{doc.tipo}</Badge>
                {doc.size && <Badge variant="secondary" className="text-xs">{doc.size}</Badge>}
                {doc.badge && <Badge className="text-xs bg-emerald-500/20 text-emerald-700">{doc.badge}</Badge>}
              </div>
              <Button variant="link" className="px-0 h-auto mt-2 gap-2">
                {doc.actionIcon ? <doc.actionIcon className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                {doc.action || 'Descargar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default DocumentacionTab;
