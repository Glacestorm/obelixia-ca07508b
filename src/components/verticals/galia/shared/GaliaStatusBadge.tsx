import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  FileEdit,
  Send,
  Search,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  FileCheck,
  Archive,
  Play,
  Pause,
} from 'lucide-react';

type SolicitudEstado = 'borrador' | 'presentada' | 'en_revision' | 'subsanacion' | 'admitida' | 'no_admitida' | 'desistida';
type ExpedienteEstado = 'instruccion' | 'evaluacion' | 'propuesta' | 'resolucion' | 'concedido' | 'denegado' | 'renunciado' | 'justificacion' | 'cerrado';
type ConvocatoriaEstado = 'borrador' | 'publicada' | 'abierta' | 'cerrada' | 'resuelta' | 'archivada';

type EstadoType = SolicitudEstado | ExpedienteEstado | ConvocatoriaEstado;

interface GaliaStatusBadgeProps {
  estado: EstadoType;
  size?: 'sm' | 'default';
  showIcon?: boolean;
  className?: string;
}

const estadoConfig: Record<EstadoType, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  color: string;
  icon: React.ElementType;
}> = {
  // Solicitud estados
  borrador: {
    label: 'Borrador',
    variant: 'outline',
    color: 'text-muted-foreground',
    icon: FileEdit,
  },
  presentada: {
    label: 'Presentada',
    variant: 'secondary',
    color: 'text-blue-500',
    icon: Send,
  },
  en_revision: {
    label: 'En Revisión',
    variant: 'secondary',
    color: 'text-amber-500',
    icon: Search,
  },
  subsanacion: {
    label: 'Subsanación',
    variant: 'secondary',
    color: 'text-orange-500',
    icon: AlertCircle,
  },
  admitida: {
    label: 'Admitida',
    variant: 'default',
    color: 'text-green-500',
    icon: CheckCircle,
  },
  no_admitida: {
    label: 'No Admitida',
    variant: 'destructive',
    color: 'text-red-500',
    icon: XCircle,
  },
  desistida: {
    label: 'Desistida',
    variant: 'outline',
    color: 'text-muted-foreground',
    icon: Pause,
  },
  // Expediente estados
  instruccion: {
    label: 'Instrucción',
    variant: 'secondary',
    color: 'text-blue-500',
    icon: FileEdit,
  },
  evaluacion: {
    label: 'Evaluación',
    variant: 'secondary',
    color: 'text-purple-500',
    icon: Search,
  },
  propuesta: {
    label: 'Propuesta',
    variant: 'secondary',
    color: 'text-amber-500',
    icon: FileCheck,
  },
  resolucion: {
    label: 'Resolución',
    variant: 'secondary',
    color: 'text-cyan-500',
    icon: Clock,
  },
  concedido: {
    label: 'Concedido',
    variant: 'default',
    color: 'text-green-500',
    icon: CheckCircle,
  },
  denegado: {
    label: 'Denegado',
    variant: 'destructive',
    color: 'text-red-500',
    icon: XCircle,
  },
  renunciado: {
    label: 'Renunciado',
    variant: 'outline',
    color: 'text-muted-foreground',
    icon: Pause,
  },
  justificacion: {
    label: 'Justificación',
    variant: 'secondary',
    color: 'text-indigo-500',
    icon: FileCheck,
  },
  cerrado: {
    label: 'Cerrado',
    variant: 'outline',
    color: 'text-muted-foreground',
    icon: Archive,
  },
  // Convocatoria estados
  publicada: {
    label: 'Publicada',
    variant: 'secondary',
    color: 'text-blue-500',
    icon: Send,
  },
  abierta: {
    label: 'Abierta',
    variant: 'default',
    color: 'text-green-500',
    icon: Play,
  },
  cerrada: {
    label: 'Cerrada',
    variant: 'secondary',
    color: 'text-gray-500',
    icon: Pause,
  },
  resuelta: {
    label: 'Resuelta',
    variant: 'secondary',
    color: 'text-purple-500',
    icon: CheckCircle,
  },
  archivada: {
    label: 'Archivada',
    variant: 'outline',
    color: 'text-muted-foreground',
    icon: Archive,
  },
};

export function GaliaStatusBadge({ 
  estado, 
  size = 'default', 
  showIcon = true,
  className 
}: GaliaStatusBadgeProps) {
  const config = estadoConfig[estado] || {
    label: estado,
    variant: 'outline',
    color: 'text-muted-foreground',
    icon: FileEdit,
  };

  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        "gap-1",
        size === 'sm' && "text-xs py-0 px-1.5",
        className
      )}
    >
      {showIcon && <Icon className={cn("h-3 w-3", config.color)} />}
      <span>{config.label}</span>
    </Badge>
  );
}

export default GaliaStatusBadge;
