/**
 * GaliaBeneficiario360Panel - Portal Beneficiario 360°
 * Vista integral para beneficiarios: expedientes, pagos, documentos, comunicaciones
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  User, FileText, Euro, MessageSquare, Bell, 
  Calendar, Clock, AlertTriangle, CheckCircle, 
  Upload, Send, Eye, Download, RefreshCw,
  Building2, Mail, Phone, MapPin, TrendingUp,
  Folder, CreditCard, FileCheck, MessageCircle,
  ChevronRight, ExternalLink, Filter
} from 'lucide-react';
import { useGaliaBeneficiario360 } from '@/hooks/galia/useGaliaBeneficiario360';
import type { 
  ExpedienteBeneficiario, 
  PagoBeneficiario, 
  DocumentoBeneficiario,
  ComunicacionBeneficiario 
} from '@/hooks/galia/useGaliaBeneficiario360';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface GaliaBeneficiario360PanelProps {
  beneficiarioId?: string;
  nif?: string;
  className?: string;
}

export function GaliaBeneficiario360Panel({ 
  beneficiarioId = 'ben-001',
  nif,
  className 
}: GaliaBeneficiario360PanelProps) {
  const [activeTab, setActiveTab] = useState('resumen');
  const [selectedExpediente, setSelectedExpediente] = useState<string | null>(null);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');

  const {
    isLoading,
    profile,
    expedientes,
    pagos,
    documentos,
    comunicaciones,
    notificaciones,
    resumen,
    error,
    lastRefresh,
    fetchBeneficiarioData,
    marcarComunicacionLeida,
    enviarMensaje
  } = useGaliaBeneficiario360();

  // Cargar datos al montar
  useEffect(() => {
    fetchBeneficiarioData({ beneficiarioId, nif });
  }, [beneficiarioId, nif, fetchBeneficiarioData]);

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Estado badge
  const getEstadoBadge = (estado: string) => {
    const estados: Record<string, { color: string; label: string }> = {
      borrador: { color: 'bg-gray-100 text-gray-700', label: 'Borrador' },
      presentado: { color: 'bg-blue-100 text-blue-700', label: 'Presentado' },
      en_instruccion: { color: 'bg-yellow-100 text-yellow-700', label: 'En instrucción' },
      aprobado: { color: 'bg-green-100 text-green-700', label: 'Aprobado' },
      denegado: { color: 'bg-red-100 text-red-700', label: 'Denegado' },
      en_ejecucion: { color: 'bg-purple-100 text-purple-700', label: 'En ejecución' },
      justificado: { color: 'bg-teal-100 text-teal-700', label: 'Justificado' },
      cerrado: { color: 'bg-slate-100 text-slate-700', label: 'Cerrado' },
      pendiente: { color: 'bg-yellow-100 text-yellow-700', label: 'Pendiente' },
      en_tramite: { color: 'bg-blue-100 text-blue-700', label: 'En trámite' },
      pagado: { color: 'bg-green-100 text-green-700', label: 'Pagado' },
      rechazado: { color: 'bg-red-100 text-red-700', label: 'Rechazado' },
      validado: { color: 'bg-green-100 text-green-700', label: 'Validado' },
      requerido: { color: 'bg-orange-100 text-orange-700', label: 'Requerido' }
    };
    const config = estados[estado] || { color: 'bg-gray-100 text-gray-700', label: estado };
    return <Badge className={cn('text-xs', config.color)}>{config.label}</Badge>;
  };

  // Enviar mensaje
  const handleSendMessage = async () => {
    if (!messageSubject || !messageContent || !selectedExpediente) return;
    
    await enviarMensaje(beneficiarioId, selectedExpediente, {
      asunto: messageSubject,
      contenido: messageContent
    });
    
    setShowMessageForm(false);
    setMessageSubject('');
    setMessageContent('');
  };

  // Comunicaciones sin leer
  const unreadCount = comunicaciones.filter(c => !c.leido).length;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header con perfil */}
      <Card className="bg-gradient-to-r from-primary/10 via-accent/5 to-secondary/10">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">{profile?.nombre || 'Cargando...'}</CardTitle>
                <CardDescription className="flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    NIF: {profile?.nif}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {profile?.municipio}
                  </span>
                  {profile?.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {profile.email}
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {unreadCount} sin leer
                </Badge>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fetchBeneficiarioData({ beneficiarioId, nif })}
                disabled={isLoading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* KPIs rápidos */}
        {resumen && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="p-3 rounded-lg bg-background/80">
                <p className="text-xs text-muted-foreground">Expedientes</p>
                <p className="text-2xl font-bold">{resumen.totalExpedientes}</p>
                <p className="text-xs text-muted-foreground">{resumen.expedientesActivos} activos</p>
              </div>
              <div className="p-3 rounded-lg bg-background/80">
                <p className="text-xs text-muted-foreground">Aprobado</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(resumen.importeTotalAprobado)}</p>
              </div>
              <div className="p-3 rounded-lg bg-background/80">
                <p className="text-xs text-muted-foreground">Cobrado</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(resumen.importeTotalPagado)}</p>
              </div>
              <div className="p-3 rounded-lg bg-background/80">
                <p className="text-xs text-muted-foreground">Pendiente</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatCurrency(resumen.importeTotalAprobado - resumen.importeTotalPagado)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-background/80">
                <p className="text-xs text-muted-foreground">Docs pendientes</p>
                <p className="text-2xl font-bold text-orange-600">{resumen.documentosPendientes}</p>
              </div>
              <div className="p-3 rounded-lg bg-background/80">
                <p className="text-xs text-muted-foreground">Mensajes</p>
                <p className="text-2xl font-bold text-purple-600">{resumen.comunicacionesSinLeer}</p>
                <p className="text-xs text-muted-foreground">sin leer</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Alertas de vencimientos */}
      {resumen && resumen.proximosVencimientos.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              Próximos vencimientos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-3">
              {resumen.proximosVencimientos.map((v, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg",
                    v.diasRestantes <= 7 ? "bg-red-100" : "bg-amber-100"
                  )}
                >
                  <Clock className={cn(
                    "h-4 w-4",
                    v.diasRestantes <= 7 ? "text-red-600" : "text-amber-600"
                  )} />
                  <div>
                    <p className="text-sm font-medium">{v.tipo}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.expedienteCodigo} • {v.diasRestantes} días
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contenido principal con tabs */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-0">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="resumen" className="text-xs">
                <TrendingUp className="h-4 w-4 mr-1" />
                Resumen
              </TabsTrigger>
              <TabsTrigger value="expedientes" className="text-xs">
                <Folder className="h-4 w-4 mr-1" />
                Expedientes
              </TabsTrigger>
              <TabsTrigger value="pagos" className="text-xs">
                <CreditCard className="h-4 w-4 mr-1" />
                Pagos
              </TabsTrigger>
              <TabsTrigger value="documentos" className="text-xs">
                <FileCheck className="h-4 w-4 mr-1" />
                Documentos
              </TabsTrigger>
              <TabsTrigger value="comunicaciones" className="text-xs relative">
                <MessageCircle className="h-4 w-4 mr-1" />
                Mensajes
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Tab Resumen */}
            <TabsContent value="resumen" className="mt-0 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Expedientes activos */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Folder className="h-4 w-4 text-primary" />
                    Expedientes activos
                  </h4>
                  {expedientes.filter(e => !['cerrado', 'denegado'].includes(e.estado)).map(exp => (
                    <div 
                      key={exp.id}
                      className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedExpediente(exp.id);
                        setActiveTab('expedientes');
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{exp.codigo}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{exp.titulo}</p>
                        </div>
                        {getEstadoBadge(exp.estado)}
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Ejecución</span>
                          <span>{exp.porcentajeEjecucion}%</span>
                        </div>
                        <Progress value={exp.porcentajeEjecucion} className="h-1.5" />
                      </div>
                      {exp.proximaAccion && (
                        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {exp.proximaAccion}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Últimos pagos */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-green-600" />
                    Últimos movimientos
                  </h4>
                  {pagos.slice(0, 4).map(pago => (
                    <div key={pago.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{formatCurrency(pago.importe)}</p>
                          <p className="text-xs text-muted-foreground">{pago.concepto}</p>
                        </div>
                        {getEstadoBadge(pago.estado)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {pago.expedienteCodigo} • {format(new Date(pago.fechaSolicitud), 'dd/MM/yyyy', { locale: es })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab Expedientes */}
            <TabsContent value="expedientes" className="mt-0">
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {expedientes.map(exp => (
                    <div 
                      key={exp.id}
                      className={cn(
                        "p-4 rounded-lg border transition-all",
                        selectedExpediente === exp.id ? "ring-2 ring-primary bg-primary/5" : "bg-card hover:bg-muted/50"
                      )}
                      onClick={() => setSelectedExpediente(exp.id === selectedExpediente ? null : exp.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{exp.codigo}</p>
                            {getEstadoBadge(exp.estado)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{exp.titulo}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{exp.convocatoria}</p>
                        </div>
                        <ChevronRight className={cn(
                          "h-5 w-5 text-muted-foreground transition-transform",
                          selectedExpediente === exp.id && "rotate-90"
                        )} />
                      </div>

                      {selectedExpediente === exp.id && (
                        <div className="mt-4 pt-4 border-t space-y-4">
                          {/* Importes */}
                          <div className="grid grid-cols-4 gap-3">
                            <div className="p-2 rounded bg-muted/50">
                              <p className="text-xs text-muted-foreground">Solicitado</p>
                              <p className="font-medium">{formatCurrency(exp.importeSolicitado)}</p>
                            </div>
                            <div className="p-2 rounded bg-green-50">
                              <p className="text-xs text-muted-foreground">Aprobado</p>
                              <p className="font-medium text-green-600">{formatCurrency(exp.importeAprobado || 0)}</p>
                            </div>
                            <div className="p-2 rounded bg-blue-50">
                              <p className="text-xs text-muted-foreground">Justificado</p>
                              <p className="font-medium text-blue-600">{formatCurrency(exp.importeJustificado || 0)}</p>
                            </div>
                            <div className="p-2 rounded bg-purple-50">
                              <p className="text-xs text-muted-foreground">Pagado</p>
                              <p className="font-medium text-purple-600">{formatCurrency(exp.importePagado || 0)}</p>
                            </div>
                          </div>

                          {/* Progreso */}
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span>Progreso de ejecución</span>
                              <span className="font-medium">{exp.porcentajeEjecucion}%</span>
                            </div>
                            <Progress value={exp.porcentajeEjecucion} className="h-2" />
                          </div>

                          {/* Info adicional */}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground">Técnico asignado</p>
                              <p className="font-medium">{exp.tecnicoAsignado || 'Sin asignar'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Fecha solicitud</p>
                              <p className="font-medium">{format(new Date(exp.fechaSolicitud), 'dd/MM/yyyy', { locale: es })}</p>
                            </div>
                          </div>

                          {exp.proximaAccion && (
                            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                              <p className="text-sm font-medium text-amber-700 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                Próxima acción requerida
                              </p>
                              <p className="text-sm text-amber-600 mt-1">{exp.proximaAccion}</p>
                              {exp.fechaLimite && (
                                <p className="text-xs text-amber-500 mt-1">
                                  Fecha límite: {format(new Date(exp.fechaLimite), 'dd/MM/yyyy', { locale: es })}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Acciones */}
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <FileText className="h-4 w-4 mr-1" />
                              Ver documentos
                            </Button>
                            <Button variant="outline" size="sm">
                              <Euro className="h-4 w-4 mr-1" />
                              Ver pagos
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMessageForm(true);
                              }}
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Contactar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Tab Pagos */}
            <TabsContent value="pagos" className="mt-0">
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {pagos.map(pago => (
                    <div key={pago.id} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-lg">{formatCurrency(pago.importe)}</p>
                            {getEstadoBadge(pago.estado)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{pago.concepto}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {pago.tipo.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {pago.expedienteCodigo}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Solicitado: {format(new Date(pago.fechaSolicitud), 'dd/MM/yyyy', { locale: es })}
                        </span>
                        {pago.fechaPago && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            Pagado: {format(new Date(pago.fechaPago), 'dd/MM/yyyy', { locale: es })}
                          </span>
                        )}
                      </div>
                      {pago.numeroTransferencia && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Ref. transferencia: {pago.numeroTransferencia}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Tab Documentos */}
            <TabsContent value="documentos" className="mt-0">
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {documentos.map(doc => (
                    <div key={doc.id} className="p-4 rounded-lg border bg-card flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          doc.estado === 'validado' ? "bg-green-100" :
                          doc.estado === 'requerido' ? "bg-orange-100" :
                          doc.estado === 'rechazado' ? "bg-red-100" : "bg-gray-100"
                        )}>
                          <FileText className={cn(
                            "h-5 w-5",
                            doc.estado === 'validado' ? "text-green-600" :
                            doc.estado === 'requerido' ? "text-orange-600" :
                            doc.estado === 'rechazado' ? "text-red-600" : "text-gray-600"
                          )} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{doc.nombre}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {getEstadoBadge(doc.estado)}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(doc.fechaSubida), 'dd/MM/yyyy', { locale: es })}
                            </span>
                          </div>
                          {doc.observaciones && (
                            <p className="text-xs text-amber-600 mt-1">{doc.observaciones}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-4 border-2 border-dashed rounded-lg text-center">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Arrastra archivos aquí o haz clic para subir
                  </p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Seleccionar archivos
                  </Button>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Tab Comunicaciones */}
            <TabsContent value="comunicaciones" className="mt-0">
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {comunicaciones.map(com => (
                    <div 
                      key={com.id} 
                      className={cn(
                        "p-4 rounded-lg border transition-all cursor-pointer",
                        !com.leido ? "bg-primary/5 border-primary/20" : "bg-card"
                      )}
                      onClick={() => !com.leido && marcarComunicacionLeida(com.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            com.tipo === 'requerimiento' ? "bg-orange-100" :
                            com.tipo === 'resolucion' ? "bg-green-100" :
                            com.tipo === 'aviso' ? "bg-amber-100" : "bg-blue-100"
                          )}>
                            {com.tipo === 'requerimiento' ? <AlertTriangle className="h-5 w-5 text-orange-600" /> :
                             com.tipo === 'resolucion' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                             <MessageSquare className="h-5 w-5 text-blue-600" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className={cn("font-medium", !com.leido && "font-semibold")}>{com.asunto}</p>
                              {!com.leido && (
                                <Badge variant="default" className="text-[10px] px-1.5">Nuevo</Badge>
                              )}
                              {com.prioridad === 'urgente' && (
                                <Badge variant="destructive" className="text-[10px]">Urgente</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{com.contenido}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span>{format(new Date(com.fechaEnvio), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                              {com.expedienteId && (
                                <span className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  Expediente vinculado
                                </span>
                              )}
                            </div>
                            {com.requiereRespuesta && com.fechaLimiteRespuesta && (
                              <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Responder antes del {format(new Date(com.fechaLimiteRespuesta), 'dd/MM/yyyy', { locale: es })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Formulario de mensaje */}
              {showMessageForm && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-medium mb-3">Nuevo mensaje</h4>
                  <div className="space-y-3">
                    <Input 
                      placeholder="Asunto" 
                      value={messageSubject}
                      onChange={(e) => setMessageSubject(e.target.value)}
                    />
                    <Textarea 
                      placeholder="Escribe tu mensaje..." 
                      rows={4}
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowMessageForm(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleSendMessage} disabled={!messageSubject || !messageContent}>
                        <Send className="h-4 w-4 mr-1" />
                        Enviar
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Footer con última actualización */}
      {lastRefresh && (
        <p className="text-xs text-center text-muted-foreground">
          Última actualización: {formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}
        </p>
      )}
    </div>
  );
}

export default GaliaBeneficiario360Panel;
