const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FunctionRequest {
  action: 'get_full_profile' | 'get_expedientes' | 'get_pagos' | 'get_documentos' | 'upload_documento' | 'mark_read' | 'send_message' | 'request_payment';
  beneficiarioId?: string;
  nif?: string;
  expedienteId?: string;
  comunicacionId?: string;
  documento?: {
    nombre: string;
    tipo: string;
    contenido: string;
  };
  mensaje?: {
    asunto: string;
    contenido: string;
  };
  solicitud?: {
    tipo: string;
    importe: number;
    concepto: string;
    documentosAdjuntos?: string[];
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, beneficiarioId, nif, expedienteId, comunicacionId, documento, mensaje, solicitud } = await req.json() as FunctionRequest;

    console.log(`[galia-beneficiario-360] Processing action: ${action}`);

    // Simulated data for demo - in production this would come from database
    const mockProfile = {
      id: beneficiarioId || 'ben-001',
      nif: nif || 'B12345678',
      nombre: 'Quesería Artesanal Los Picos S.L.',
      tipo: 'empresa',
      email: 'info@queserialospicos.es',
      telefono: '+34 985 123 456',
      direccion: 'Calle Mayor, 15',
      municipio: 'Cangas de Onís',
      codigoPostal: '33550',
      representanteLegal: 'María García López',
      fechaRegistro: '2023-01-15',
      estadoCuenta: 'activo'
    };

    const mockExpedientes = [
      {
        id: 'exp-001',
        codigo: 'LEADER-2024-0045',
        titulo: 'Ampliación de instalaciones de producción quesera',
        convocatoria: 'LEADER Asturias 2024 - Transformación agroalimentaria',
        estado: 'en_ejecucion',
        fechaSolicitud: '2024-02-15',
        fechaResolucion: '2024-04-20',
        importeSolicitado: 85000,
        importeAprobado: 72000,
        importeJustificado: 45000,
        importePagado: 36000,
        porcentajeEjecucion: 62.5,
        tecnicoAsignado: 'Carlos Fernández',
        proximaAccion: 'Presentar justificación 2ª fase',
        fechaLimite: '2024-12-15'
      },
      {
        id: 'exp-002',
        codigo: 'LEADER-2023-0128',
        titulo: 'Mejora de punto de venta directa',
        convocatoria: 'LEADER Asturias 2023 - Comercialización',
        estado: 'cerrado',
        fechaSolicitud: '2023-05-10',
        fechaResolucion: '2023-07-15',
        importeSolicitado: 25000,
        importeAprobado: 22500,
        importeJustificado: 22500,
        importePagado: 22500,
        porcentajeEjecucion: 100,
        tecnicoAsignado: 'Ana Martínez'
      },
      {
        id: 'exp-003',
        codigo: 'LEADER-2024-0189',
        titulo: 'Digitalización y e-commerce',
        convocatoria: 'LEADER Asturias 2024 - Digitalización rural',
        estado: 'en_instruccion',
        fechaSolicitud: '2024-09-01',
        importeSolicitado: 18000,
        porcentajeEjecucion: 0,
        tecnicoAsignado: 'Laura Pérez',
        proximaAccion: 'Aportar memoria técnica detallada',
        fechaLimite: '2024-11-30'
      }
    ];

    const mockPagos = [
      {
        id: 'pago-001',
        expedienteId: 'exp-001',
        expedienteCodigo: 'LEADER-2024-0045',
        tipo: 'anticipo',
        importe: 21600,
        estado: 'pagado',
        fechaSolicitud: '2024-05-01',
        fechaPago: '2024-05-20',
        concepto: 'Anticipo 30% subvención aprobada',
        numeroTransferencia: 'TRF-2024-00456'
      },
      {
        id: 'pago-002',
        expedienteId: 'exp-001',
        expedienteCodigo: 'LEADER-2024-0045',
        tipo: 'pago_parcial',
        importe: 14400,
        estado: 'pagado',
        fechaSolicitud: '2024-08-15',
        fechaPago: '2024-09-10',
        concepto: 'Pago 1ª justificación parcial',
        numeroTransferencia: 'TRF-2024-00789'
      },
      {
        id: 'pago-003',
        expedienteId: 'exp-001',
        expedienteCodigo: 'LEADER-2024-0045',
        tipo: 'pago_parcial',
        importe: 18000,
        estado: 'en_tramite',
        fechaSolicitud: '2024-10-20',
        concepto: 'Pago 2ª justificación parcial'
      },
      {
        id: 'pago-004',
        expedienteId: 'exp-002',
        expedienteCodigo: 'LEADER-2023-0128',
        tipo: 'pago_final',
        importe: 22500,
        estado: 'pagado',
        fechaSolicitud: '2023-10-01',
        fechaPago: '2023-11-15',
        concepto: 'Pago final tras justificación completa',
        numeroTransferencia: 'TRF-2023-01234'
      }
    ];

    const mockDocumentos = [
      {
        id: 'doc-001',
        expedienteId: 'exp-001',
        nombre: 'Solicitud de ayuda firmada',
        tipo: 'solicitud',
        estado: 'validado',
        fechaSubida: '2024-02-15',
        fechaValidacion: '2024-02-20'
      },
      {
        id: 'doc-002',
        expedienteId: 'exp-001',
        nombre: 'Memoria técnica del proyecto',
        tipo: 'memoria',
        estado: 'validado',
        fechaSubida: '2024-02-15',
        fechaValidacion: '2024-03-01'
      },
      {
        id: 'doc-003',
        expedienteId: 'exp-001',
        nombre: 'Presupuesto maquinaria',
        tipo: 'presupuesto',
        estado: 'validado',
        fechaSubida: '2024-02-15',
        fechaValidacion: '2024-02-25'
      },
      {
        id: 'doc-004',
        expedienteId: 'exp-001',
        nombre: 'Factura instalación cámara frigorífica',
        tipo: 'factura',
        estado: 'validado',
        fechaSubida: '2024-07-20',
        fechaValidacion: '2024-07-25'
      },
      {
        id: 'doc-005',
        expedienteId: 'exp-001',
        nombre: 'Justificante pago proveedor',
        tipo: 'justificante',
        estado: 'pendiente',
        fechaSubida: '2024-10-15',
        observaciones: 'Pendiente de validación por técnico'
      },
      {
        id: 'doc-006',
        expedienteId: 'exp-003',
        nombre: 'Memoria técnica digitalización',
        tipo: 'memoria',
        estado: 'requerido',
        fechaSubida: '2024-09-01',
        observaciones: 'Se requiere ampliar información sobre plataforma e-commerce'
      }
    ];

    const mockComunicaciones = [
      {
        id: 'com-001',
        expedienteId: 'exp-001',
        tipo: 'resolucion',
        asunto: 'Resolución de concesión de ayuda',
        contenido: 'Se le comunica que su solicitud de ayuda LEADER-2024-0045 ha sido APROBADA por importe de 72.000€...',
        fechaEnvio: '2024-04-20',
        fechaLectura: '2024-04-20',
        leido: true,
        prioridad: 'alta',
        requiereRespuesta: false
      },
      {
        id: 'com-002',
        expedienteId: 'exp-003',
        tipo: 'requerimiento',
        asunto: 'Requerimiento de documentación adicional',
        contenido: 'Se le requiere para que en el plazo de 10 días hábiles aporte memoria técnica detallada que incluya: especificaciones técnicas de la plataforma e-commerce, plan de marketing digital...',
        fechaEnvio: '2024-10-25',
        leido: false,
        prioridad: 'urgente',
        requiereRespuesta: true,
        fechaLimiteRespuesta: '2024-11-08'
      },
      {
        id: 'com-003',
        tipo: 'notificacion',
        asunto: 'Nueva convocatoria de interés',
        contenido: 'Se ha publicado la convocatoria "LEADER 2025 - Turismo Rural Sostenible" que podría ser de su interés según su perfil de actividad...',
        fechaEnvio: '2024-10-20',
        leido: false,
        prioridad: 'normal',
        requiereRespuesta: false
      },
      {
        id: 'com-004',
        expedienteId: 'exp-001',
        tipo: 'aviso',
        asunto: 'Recordatorio: Plazo de justificación',
        contenido: 'Le recordamos que el plazo para presentar la justificación de la 2ª fase de su proyecto finaliza el 15 de diciembre de 2024.',
        fechaEnvio: '2024-10-15',
        fechaLectura: '2024-10-16',
        leido: true,
        prioridad: 'alta',
        requiereRespuesta: false
      }
    ];

    const mockNotificaciones = [
      {
        id: 'not-001',
        tipo: 'warning',
        titulo: 'Documentación pendiente',
        mensaje: 'Tiene 1 documento pendiente de subsanar en el expediente LEADER-2024-0189',
        fecha: '2024-10-25',
        leida: false,
        accion: { texto: 'Ver expediente', url: '/galia/expediente/exp-003' }
      },
      {
        id: 'not-002',
        tipo: 'info',
        titulo: 'Pago en tramitación',
        mensaje: 'Su solicitud de pago por 18.000€ está siendo procesada',
        fecha: '2024-10-20',
        leida: true
      },
      {
        id: 'not-003',
        tipo: 'success',
        titulo: 'Pago realizado',
        mensaje: 'Se ha realizado la transferencia de 14.400€ correspondiente a la 1ª justificación',
        fecha: '2024-09-10',
        leida: true
      }
    ];

    const mockResumen = {
      totalExpedientes: 3,
      expedientesActivos: 2,
      importeTotalAprobado: 94500,
      importeTotalPagado: 58500,
      documentosPendientes: 2,
      comunicacionesSinLeer: 2,
      proximosVencimientos: [
        {
          expedienteId: 'exp-003',
          expedienteCodigo: 'LEADER-2024-0189',
          tipo: 'Respuesta requerimiento',
          fecha: '2024-11-08',
          diasRestantes: 5
        },
        {
          expedienteId: 'exp-001',
          expedienteCodigo: 'LEADER-2024-0045',
          tipo: 'Justificación 2ª fase',
          fecha: '2024-12-15',
          diasRestantes: 42
        }
      ]
    };

    let result;

    switch (action) {
      case 'get_full_profile':
        result = {
          profile: mockProfile,
          expedientes: mockExpedientes,
          pagos: mockPagos,
          documentos: mockDocumentos,
          comunicaciones: mockComunicaciones,
          notificaciones: mockNotificaciones,
          resumen: mockResumen
        };
        break;

      case 'get_expedientes':
        result = mockExpedientes;
        break;

      case 'get_pagos':
        result = expedienteId 
          ? mockPagos.filter(p => p.expedienteId === expedienteId)
          : mockPagos;
        break;

      case 'get_documentos':
        result = expedienteId
          ? mockDocumentos.filter(d => d.expedienteId === expedienteId)
          : mockDocumentos;
        break;

      case 'upload_documento':
        result = {
          id: `doc-${Date.now()}`,
          expedienteId,
          nombre: documento?.nombre,
          tipo: documento?.tipo,
          estado: 'pendiente',
          fechaSubida: new Date().toISOString()
        };
        console.log(`[galia-beneficiario-360] Documento uploaded: ${documento?.nombre}`);
        break;

      case 'mark_read':
        result = { success: true, comunicacionId };
        console.log(`[galia-beneficiario-360] Marked as read: ${comunicacionId}`);
        break;

      case 'send_message':
        result = {
          id: `msg-${Date.now()}`,
          expedienteId,
          tipo: 'mensaje',
          asunto: mensaje?.asunto,
          contenido: mensaje?.contenido,
          fechaEnvio: new Date().toISOString(),
          estado: 'enviado'
        };
        console.log(`[galia-beneficiario-360] Message sent: ${mensaje?.asunto}`);
        break;

      case 'request_payment':
        result = {
          id: `pago-${Date.now()}`,
          expedienteId,
          tipo: solicitud?.tipo,
          importe: solicitud?.importe,
          concepto: solicitud?.concepto,
          estado: 'pendiente',
          fechaSolicitud: new Date().toISOString()
        };
        console.log(`[galia-beneficiario-360] Payment requested: ${solicitud?.importe}€`);
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    console.log(`[galia-beneficiario-360] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[galia-beneficiario-360] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
