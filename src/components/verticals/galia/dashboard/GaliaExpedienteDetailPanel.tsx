/**
 * GALIA - Panel de Detalle de Expediente
 * Vista detallada de expediente con timeline, documentos y acciones
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  User,
  Euro,
  Calendar,
  MapPin,
  Building2,
  Phone,
  Mail,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  FileCheck,
  Download,
  MessageSquare,
  History,
  Bot,
  X,
} from 'lucide-react';
import { GaliaStatusBadge } from '../shared/GaliaStatusBadge';
import { GaliaExpediente } from '@/hooks/galia/useGaliaExpedientes';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface GaliaExpedienteDetailPanelProps {
  expediente: GaliaExpediente;
  onClose: () => void;
  onCambiarEstado?: (nuevoEstado: GaliaExpediente['estado']) => void;
  onAsignarTecnico?: (tecnicoId: string) => void;
}

const timelineEvents = [
  { fecha: '2024-01-15', tipo: 'creacion', descripcion: 'Expediente creado', usuario: 'Sistema' },
  { fecha: '2024-01-16', tipo: 'documento', descripcion: 'Documentación presentada', usuario: 'Beneficiario' },
  { fecha: '2024-01-18', tipo: 'asignacion', descripcion: 'Asignado a técnico instructor', usuario: 'Admin' },
  { fecha: '2024-01-20', tipo: 'estado', descripcion: 'Pasado a evaluación', usuario: 'María García' },
  { fecha: '2024-01-25', tipo: 'ia', descripcion: 'Análisis IA completado: Sin anomalías', usuario: 'GALIA IA' },
];

export function GaliaExpedienteDetailPanel({
  expediente,
  onClose,
  onCambiarEstado,
  onAsignarTecnico,
}: GaliaExpedienteDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('info');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const porcentajeJustificado = expediente.importe_concedido 
    ? (expediente.importe_justificado / expediente.importe_concedido) * 100 
    : 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-mono">
                {expediente.numero_expediente}
              </CardTitle>
              <GaliaStatusBadge estado={expediente.estado} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {expediente.solicitud?.titulo_proyecto || 'Sin título'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 shrink-0">
            <TabsTrigger value="info" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Info
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs">
              <History className="h-3 w-3 mr-1" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="documentos" className="text-xs">
              <FileCheck className="h-3 w-3 mr-1" />
              Docs
            </TabsTrigger>
            <TabsTrigger value="acciones" className="text-xs">
              <ArrowRight className="h-3 w-3 mr-1" />
              Acciones
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4">
            <TabsContent value="info" className="h-full mt-0">
              <ScrollArea className="h-full">
                <div className="space-y-4 pr-2">
                  {/* Beneficiario */}
                  <div className="p-3 rounded-lg bg-muted/50">
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      Beneficiario
                    </h4>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">{expediente.solicitud?.beneficiario?.nombre}</p>
                      <p className="text-muted-foreground">
                        NIF: {expediente.solicitud?.beneficiario?.nif}
                      </p>
                      <p className="text-muted-foreground">
                        Tipo: {expediente.solicitud?.beneficiario?.tipo}
                      </p>
                    </div>
                  </div>

                  {/* Importes */}
                  <div className="p-3 rounded-lg bg-muted/50">
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <Euro className="h-4 w-4 text-primary" />
                      Importes
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Solicitado</p>
                        <p className="font-semibold">
                          {formatCurrency(expediente.solicitud?.importe_solicitado || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Concedido</p>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(expediente.importe_concedido || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Justificado</p>
                        <p className="font-semibold">
                          {formatCurrency(expediente.importe_justificado || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pagado</p>
                        <p className="font-semibold text-blue-600">
                          {formatCurrency(expediente.importe_pagado || 0)}
                        </p>
                      </div>
                    </div>
                    {expediente.importe_concedido && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Progreso justificación</span>
                          <span>{porcentajeJustificado.toFixed(0)}%</span>
                        </div>
                        <Progress value={porcentajeJustificado} className="h-2" />
                      </div>
                    )}
                  </div>

                  {/* Fechas */}
                  <div className="p-3 rounded-lg bg-muted/50">
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Fechas
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Apertura</span>
                        <span>{format(new Date(expediente.fecha_apertura), 'dd/MM/yyyy', { locale: es })}</span>
                      </div>
                      {expediente.fecha_resolucion && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Resolución</span>
                          <span>{format(new Date(expediente.fecha_resolucion), 'dd/MM/yyyy', { locale: es })}</span>
                        </div>
                      )}
                      {expediente.fecha_cierre && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cierre</span>
                          <span>{format(new Date(expediente.fecha_cierre), 'dd/MM/yyyy', { locale: es })}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Scoring Riesgo */}
                  {expediente.scoring_riesgo !== null && (
                    <div className={cn(
                      "p-3 rounded-lg",
                      expediente.scoring_riesgo >= 70 ? "bg-destructive/10" :
                      expediente.scoring_riesgo >= 40 ? "bg-amber-500/10" : "bg-green-500/10"
                    )}>
                      <h4 className="font-medium flex items-center gap-2 mb-2">
                        <AlertTriangle className={cn(
                          "h-4 w-4",
                          expediente.scoring_riesgo >= 70 ? "text-destructive" :
                          expediente.scoring_riesgo >= 40 ? "text-amber-500" : "text-green-500"
                        )} />
                        Scoring de Riesgo
                      </h4>
                      <div className="flex items-center gap-3">
                        <div className="text-3xl font-bold">
                          {expediente.scoring_riesgo}%
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {expediente.scoring_riesgo >= 70 ? 'Riesgo alto - Requiere revisión manual' :
                           expediente.scoring_riesgo >= 40 ? 'Riesgo medio - Monitorización recomendada' :
                           'Riesgo bajo - Sin anomalías detectadas'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Convocatoria */}
                  <div className="p-3 rounded-lg bg-muted/50">
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Convocatoria
                    </h4>
                    <div className="text-sm">
                      <p className="font-medium">{expediente.solicitud?.convocatoria?.nombre}</p>
                      <p className="text-muted-foreground">
                        {expediente.solicitud?.convocatoria?.codigo}
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="timeline" className="h-full mt-0">
              <ScrollArea className="h-full">
                <div className="space-y-3 pr-2">
                  {timelineEvents.map((event, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                          event.tipo === 'creacion' && "bg-primary/10 text-primary",
                          event.tipo === 'documento' && "bg-blue-500/10 text-blue-500",
                          event.tipo === 'asignacion' && "bg-purple-500/10 text-purple-500",
                          event.tipo === 'estado' && "bg-amber-500/10 text-amber-500",
                          event.tipo === 'ia' && "bg-green-500/10 text-green-500",
                        )}>
                          {event.tipo === 'ia' ? <Bot className="h-4 w-4" /> :
                           event.tipo === 'documento' ? <FileText className="h-4 w-4" /> :
                           event.tipo === 'asignacion' ? <User className="h-4 w-4" /> :
                           <Clock className="h-4 w-4" />}
                        </div>
                        {index < timelineEvents.length - 1 && (
                          <div className="w-px h-full bg-border my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium">{event.descripcion}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{format(new Date(event.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
                          <span>·</span>
                          <span>{event.usuario}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="documentos" className="h-full mt-0">
              <ScrollArea className="h-full">
                <div className="space-y-2 pr-2">
                  {[
                    { nombre: 'Solicitud firmada.pdf', tipo: 'solicitud', validado: true, fecha: '2024-01-15' },
                    { nombre: 'Presupuesto detallado.xlsx', tipo: 'presupuesto', validado: true, fecha: '2024-01-15' },
                    { nombre: 'DNI Representante.pdf', tipo: 'identificacion', validado: true, fecha: '2024-01-15' },
                    { nombre: 'Memoria técnica.pdf', tipo: 'memoria', validado: false, fecha: '2024-01-16' },
                    { nombre: 'Facturas justificación Q1.zip', tipo: 'justificacion', validado: false, fecha: '2024-02-01' },
                  ].map((doc, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{doc.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.tipo} · {doc.fecha}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.validado ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500" />
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="acciones" className="h-full mt-0">
              <ScrollArea className="h-full">
                <div className="space-y-4 pr-2">
                  {/* Cambiar Estado */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Cambiar Estado</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {(['instruccion', 'evaluacion', 'propuesta', 'resolucion', 'concedido', 'denegado'] as const).map((estado) => (
                        <Button
                          key={estado}
                          variant={expediente.estado === estado ? "default" : "outline"}
                          size="sm"
                          className="justify-start text-xs"
                          disabled={expediente.estado === estado}
                          onClick={() => onCambiarEstado?.(estado)}
                        >
                          <GaliaStatusBadge estado={estado} size="sm" showIcon={false} />
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Acciones Rápidas */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Acciones Rápidas</h4>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Enviar notificación al beneficiario
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Bot className="h-4 w-4 mr-2" />
                        Solicitar análisis IA
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <FileCheck className="h-4 w-4 mr-2" />
                        Generar informe técnico
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start text-destructive">
                        <XCircle className="h-4 w-4 mr-2" />
                        Archivar expediente
                      </Button>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default GaliaExpedienteDetailPanel;
