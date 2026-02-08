/**
 * GALIA - Portal Público del Ciudadano
 * Interfaz para ciudadanos, empresas y entidades
 * Refactorizado para optimización de memoria
 */

import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Search, Download, HelpCircle } from 'lucide-react';
import { GaliaAsistenteVirtualMejorado } from './GaliaAsistenteVirtualMejorado';
import { GaliaNotificacionesPanel } from './GaliaNotificacionesPanel';
import { useGaliaConvocatorias } from '@/hooks/galia/useGaliaConvocatorias';
import { useGaliaNotificaciones } from '@/hooks/galia/useGaliaNotificaciones';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Subcomponentes modularizados
import { 
  ExpedientePublico, 
  estadoProgreso, 
  estadoProximoPaso,
  PortalHeader,
  ConvocatoriasTab,
  ConsultaExpedienteTab,
  DocumentacionTab,
  AyudaTab 
} from './portal';

export function GaliaPortalCiudadano() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('convocatorias');
  const [showAsistente, setShowAsistente] = useState(false);
  const [showNotificaciones, setShowNotificaciones] = useState(false);
  const [codigoExpediente, setCodigoExpediente] = useState('');
  const [expedienteConsultado, setExpedienteConsultado] = useState<ExpedientePublico | null>(null);
  const [isConsultando, setIsConsultando] = useState(false);
  const [consultaError, setConsultaError] = useState<string | null>(null);
  const [docSubTab, setDocSubTab] = useState<'formularios' | 'guias' | 'justificacion'>('formularios');

  // Hook real para convocatorias
  const { 
    convocatorias, 
    isLoading: isLoadingConvocatorias, 
    fetchConvocatorias,
    getPresupuestoStats 
  } = useGaliaConvocatorias({
    estado: 'abierta',
    searchTerm: searchTerm || undefined
  });

  // Hook para notificaciones del expediente consultado
  const { unreadCount } = useGaliaNotificaciones({
    codigoExpediente: expedienteConsultado?.codigo,
    autoSubscribe: !!expedienteConsultado
  });

  // Estadísticas del presupuesto
  const presupuestoStats = getPresupuestoStats();

  // Consultar expediente real en Supabase
  const handleConsultarExpediente = useCallback(async () => {
    const codigo = codigoExpediente.trim().toUpperCase();
    if (!codigo) {
      toast.error('Introduce un código de expediente válido');
      return;
    }

    setIsConsultando(true);
    setConsultaError(null);
    setExpedienteConsultado(null);

    try {
      // Buscar en galia_expedientes por numero_expediente
      const { data: expediente, error: expError } = await supabase
        .from('galia_expedientes')
        .select(`
          *,
          solicitud:galia_solicitudes(
            titulo_proyecto,
            presupuesto_total,
            importe_solicitado
          )
        `)
        .eq('numero_expediente', codigo)
        .maybeSingle();

      if (expError) throw expError;

      if (expediente) {
        const solicitud = expediente.solicitud as { titulo_proyecto?: string; importe_solicitado?: number } | null;
        setExpedienteConsultado({
          codigo: expediente.numero_expediente,
          titulo: solicitud?.titulo_proyecto || 'Proyecto sin título',
          estado: expediente.estado,
          fechaUltimaActualizacion: expediente.updated_at,
          progreso: estadoProgreso[expediente.estado] || 0,
          proximoPaso: estadoProximoPaso[expediente.estado],
          importeSolicitado: solicitud?.importe_solicitado,
          importeConcedido: expediente.importe_concedido,
        });
        return;
      }

      // Si no encontró expediente, buscar en solicitudes
      const { data: solicitud, error: solError } = await supabase
        .from('galia_solicitudes')
        .select('*')
        .eq('numero_registro', codigo)
        .maybeSingle();

      if (solError) throw solError;

      if (solicitud) {
        setExpedienteConsultado({
          codigo: solicitud.numero_registro || codigo,
          titulo: solicitud.titulo_proyecto,
          estado: solicitud.estado,
          fechaUltimaActualizacion: solicitud.updated_at,
          progreso: estadoProgreso[solicitud.estado] || 0,
          proximoPaso: estadoProximoPaso[solicitud.estado],
          importeSolicitado: solicitud.importe_solicitado,
        });
        return;
      }

      // No encontrado
      setConsultaError('No se encontró ningún expediente o solicitud con ese código. Verifica que esté escrito correctamente.');

    } catch (err) {
      console.error('[GaliaPortalCiudadano] Error consultando expediente:', err);
      setConsultaError('Error al consultar el expediente. Inténtalo de nuevo.');
    } finally {
      setIsConsultando(false);
    }
  }, [codigoExpediente]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-background to-emerald-50/30">
      {/* Header */}
      <PortalHeader
        convocatoriasCount={convocatorias.length}
        presupuestoDisponible={presupuestoStats.disponible}
        presupuestoTotal={presupuestoStats.total}
        presupuestoEjecutado={presupuestoStats.ejecutado}
        presupuestoComprometido={presupuestoStats.comprometido}
      />

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

          <TabsContent value="convocatorias" className="space-y-6">
            <ConvocatoriasTab
              convocatorias={convocatorias}
              isLoading={isLoadingConvocatorias}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onRefresh={fetchConvocatorias}
            />
          </TabsContent>

          <TabsContent value="consulta" className="space-y-6">
            <ConsultaExpedienteTab
              codigoExpediente={codigoExpediente}
              onCodigoChange={setCodigoExpediente}
              onConsultar={handleConsultarExpediente}
              isConsultando={isConsultando}
              consultaError={consultaError}
              expedienteConsultado={expedienteConsultado}
              unreadCount={unreadCount}
              onShowAsistente={() => setShowAsistente(true)}
              onShowNotificaciones={() => setShowNotificaciones(true)}
            />
          </TabsContent>

          <TabsContent value="documentacion" className="space-y-6">
            <DocumentacionTab
              docSubTab={docSubTab}
              onSubTabChange={setDocSubTab}
              codigoExpediente={expedienteConsultado?.codigo}
              presupuestoAprobado={expedienteConsultado?.importeSolicitado}
            />
          </TabsContent>

          <TabsContent value="ayuda" className="space-y-6">
            <AyudaTab onShowAsistente={() => setShowAsistente(true)} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Assistant */}
      {showAsistente && (
        <div className="fixed bottom-4 right-4 w-full max-w-lg z-50 animate-in slide-in-from-bottom-4 duration-300">
          <GaliaAsistenteVirtualMejorado 
            modo="ciudadano"
            expedienteId={expedienteConsultado?.codigo}
            onClose={() => setShowAsistente(false)}
          />
        </div>
      )}

      {/* Panel de Notificaciones Flotante */}
      {showNotificaciones && expedienteConsultado && (
        <div className="fixed bottom-4 left-4 w-full max-w-md z-50 animate-in slide-in-from-bottom-4 duration-300">
          <GaliaNotificacionesPanel
            codigoExpediente={expedienteConsultado.codigo}
            autoSubscribe={true}
            onClose={() => setShowNotificaciones(false)}
          />
        </div>
      )}
    </div>
  );
}

export default GaliaPortalCiudadano;
