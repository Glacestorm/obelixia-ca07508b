/**
 * GALIA Portal - Consulta de Expediente
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Search, Clock, AlertCircle, MessageSquare, 
  Bell, BellRing, Loader2 
} from 'lucide-react';
import { ExpedientePublico, formatCurrency } from './types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ConsultaExpedienteTabProps {
  codigoExpediente: string;
  onCodigoChange: (codigo: string) => void;
  onConsultar: () => void;
  isConsultando: boolean;
  consultaError: string | null;
  expedienteConsultado: ExpedientePublico | null;
  unreadCount: number;
  onShowAsistente: () => void;
  onShowNotificaciones: () => void;
}

export function ConsultaExpedienteTab({
  codigoExpediente,
  onCodigoChange,
  onConsultar,
  isConsultando,
  consultaError,
  expedienteConsultado,
  unreadCount,
  onShowAsistente,
  onShowNotificaciones,
}: ConsultaExpedienteTabProps) {
  const getEstadoExpedienteBadge = (estado: string) => {
    const colores: Record<string, string> = {
      'borrador': 'bg-gray-500/20 text-gray-600',
      'presentada': 'bg-blue-500/20 text-blue-700',
      'admitida': 'bg-cyan-500/20 text-cyan-700',
      'subsanacion': 'bg-orange-500/20 text-orange-700',
      'instruccion': 'bg-indigo-500/20 text-indigo-700',
      'evaluacion': 'bg-purple-500/20 text-purple-700',
      'propuesta': 'bg-violet-500/20 text-violet-700',
      'resolucion': 'bg-pink-500/20 text-pink-700',
      'concedido': 'bg-green-500/20 text-green-700',
      'justificacion': 'bg-emerald-500/20 text-emerald-700',
      'cerrado': 'bg-slate-500/20 text-slate-700',
      'denegado': 'bg-red-500/20 text-red-700',
      'renunciado': 'bg-amber-500/20 text-amber-700',
    };
    return <Badge className={colores[estado] || 'bg-gray-500/20 text-gray-600'}>{estado}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Consultar estado de expediente
        </CardTitle>
        <CardDescription>
          Introduce el código de tu expediente o número de registro para conocer su estado actual
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Input
            placeholder="Ej: EXP-2024-00123 o REG-2024-00456"
            value={codigoExpediente}
            onChange={(e) => onCodigoChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onConsultar()}
            className="max-w-sm"
          />
          <Button 
            onClick={onConsultar}
            disabled={isConsultando}
          >
            {isConsultando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Consultar'
            )}
          </Button>
        </div>

        {consultaError && (
          <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {consultaError}
          </div>
        )}

        {expedienteConsultado && (
          <Card className="bg-muted/50 mt-6">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Expediente</div>
                  <div className="text-xl font-bold">{expedienteConsultado.codigo}</div>
                  <div className="text-sm mt-1">{expedienteConsultado.titulo}</div>
                </div>
                {getEstadoExpedienteBadge(expedienteConsultado.estado)}
              </div>

              {(expedienteConsultado.importeSolicitado || expedienteConsultado.importeConcedido) && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-background rounded-lg">
                  <div>
                    <div className="text-xs text-muted-foreground">Importe solicitado</div>
                    <div className="font-semibold">
                      {expedienteConsultado.importeSolicitado 
                        ? formatCurrency(expedienteConsultado.importeSolicitado)
                        : '-'
                      }
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Importe concedido</div>
                    <div className="font-semibold text-green-600">
                      {expedienteConsultado.importeConcedido 
                        ? formatCurrency(expedienteConsultado.importeConcedido)
                        : 'Pendiente'
                      }
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progreso de tramitación</span>
                  <span className="font-medium">{expedienteConsultado.progreso}%</span>
                </div>
                <Progress value={expedienteConsultado.progreso} className="h-2" />
              </div>

              {expedienteConsultado.proximoPaso && (
                <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg text-sm">
                  <Clock className="h-4 w-4 text-blue-600 shrink-0" />
                  <span><strong>Próximo paso:</strong> {expedienteConsultado.proximoPaso}</span>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Última actualización: {formatDistanceToNow(new Date(expedienteConsultado.fechaUltimaActualizacion), { addSuffix: true, locale: es })}
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2"
                  onClick={onShowAsistente}
                >
                  <MessageSquare className="h-4 w-4" />
                  Consultar dudas
                </Button>
                <Button 
                  variant="outline"
                  className="gap-2 relative"
                  onClick={onShowNotificaciones}
                >
                  {unreadCount > 0 ? (
                    <BellRing className="h-4 w-4 text-primary" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                  Alertas
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 min-w-5 px-1">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

export default ConsultaExpedienteTab;
