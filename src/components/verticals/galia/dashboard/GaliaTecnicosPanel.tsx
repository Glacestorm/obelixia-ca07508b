/**
 * GALIA - Panel de Técnicos
 * Gestión de asignación y carga de trabajo de técnicos
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users,
  UserCheck,
  FolderOpen,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  MoreVertical,
  Plus,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Tecnico {
  id: string;
  nombre: string;
  email: string;
  avatar?: string;
  rol: 'instructor' | 'evaluador' | 'supervisor';
  expedientesActivos: number;
  expedientesCompletados: number;
  cargaTrabajo: number; // 0-100
  tiempoMedioResolucion: number; // días
  ultimaActividad: string;
  disponible: boolean;
}

const tecnicosMock: Tecnico[] = [
  {
    id: '1',
    nombre: 'María García López',
    email: 'maria.garcia@gal.es',
    rol: 'supervisor',
    expedientesActivos: 8,
    expedientesCompletados: 45,
    cargaTrabajo: 65,
    tiempoMedioResolucion: 12,
    ultimaActividad: '2024-01-28T10:30:00',
    disponible: true,
  },
  {
    id: '2',
    nombre: 'Carlos Fernández Ruiz',
    email: 'carlos.fernandez@gal.es',
    rol: 'instructor',
    expedientesActivos: 12,
    expedientesCompletados: 38,
    cargaTrabajo: 85,
    tiempoMedioResolucion: 15,
    ultimaActividad: '2024-01-28T09:15:00',
    disponible: true,
  },
  {
    id: '3',
    nombre: 'Ana Martínez Sánchez',
    email: 'ana.martinez@gal.es',
    rol: 'evaluador',
    expedientesActivos: 6,
    expedientesCompletados: 52,
    cargaTrabajo: 45,
    tiempoMedioResolucion: 10,
    ultimaActividad: '2024-01-28T11:00:00',
    disponible: true,
  },
  {
    id: '4',
    nombre: 'Pedro López Navarro',
    email: 'pedro.lopez@gal.es',
    rol: 'instructor',
    expedientesActivos: 0,
    expedientesCompletados: 28,
    cargaTrabajo: 0,
    tiempoMedioResolucion: 18,
    ultimaActividad: '2024-01-15T16:00:00',
    disponible: false,
  },
];

const rolConfig = {
  supervisor: { label: 'Supervisor', color: 'bg-purple-500' },
  instructor: { label: 'Instructor', color: 'bg-blue-500' },
  evaluador: { label: 'Evaluador', color: 'bg-green-500' },
};

interface GaliaTecnicosPanelProps {
  onAsignarExpediente?: (tecnicoId: string) => void;
  expedienteSeleccionado?: string;
}

export function GaliaTecnicosPanel({ 
  onAsignarExpediente,
  expedienteSeleccionado 
}: GaliaTecnicosPanelProps) {
  const [selectedTecnico, setSelectedTecnico] = useState<string | null>(null);

  const tecnicosDisponibles = tecnicosMock.filter(t => t.disponible);
  const cargaPromedio = tecnicosDisponibles.reduce((sum, t) => sum + t.cargaTrabajo, 0) / tecnicosDisponibles.length;

  const getInitials = (nombre: string) => {
    return nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Equipo Técnico
          </CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="gap-1">
              <UserCheck className="h-3 w-3" />
              {tecnicosDisponibles.length} disponibles
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Estadísticas del equipo */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="p-2 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold">
              {tecnicosMock.reduce((sum, t) => sum + t.expedientesActivos, 0)}
            </p>
            <p className="text-xs text-muted-foreground">Exp. Activos</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold">{cargaPromedio.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Carga Media</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold">
              {(tecnicosMock.reduce((sum, t) => sum + t.tiempoMedioResolucion, 0) / tecnicosMock.length).toFixed(0)}d
            </p>
            <p className="text-xs text-muted-foreground">Tiempo Medio</p>
          </div>
        </div>

        {/* Lista de técnicos */}
        <ScrollArea className="h-[280px]">
          <div className="space-y-2">
            {tecnicosMock.map((tecnico) => {
              const rol = rolConfig[tecnico.rol];
              const isSelected = selectedTecnico === tecnico.id;
              const cargaColor = tecnico.cargaTrabajo >= 80 ? 'text-destructive' :
                               tecnico.cargaTrabajo >= 60 ? 'text-amber-500' : 'text-green-500';

              return (
                <div
                  key={tecnico.id}
                  className={cn(
                    "p-3 rounded-lg border transition-all cursor-pointer",
                    !tecnico.disponible && "opacity-50",
                    isSelected && "ring-2 ring-primary bg-primary/5",
                    tecnico.disponible && "hover:bg-muted/50"
                  )}
                  onClick={() => tecnico.disponible && setSelectedTecnico(isSelected ? null : tecnico.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={tecnico.avatar} />
                        <AvatarFallback className={rol.color + " text-white text-xs"}>
                          {getInitials(tecnico.nombre)}
                        </AvatarFallback>
                      </Avatar>
                      {tecnico.disponible && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{tecnico.nombre}</p>
                          <Badge variant="outline" className="text-xs mt-0.5">
                            {rol.label}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Ver expedientes</DropdownMenuItem>
                            <DropdownMenuItem>Ver perfil</DropdownMenuItem>
                            <DropdownMenuItem>Enviar mensaje</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                        <div className="flex items-center gap-1">
                          <FolderOpen className="h-3 w-3 text-muted-foreground" />
                          <span>{tecnico.expedientesActivos} activos</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                          <span>{tecnico.expedientesCompletados} cerrados</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{tecnico.tiempoMedioResolucion}d media</span>
                        </div>
                      </div>

                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Carga de trabajo</span>
                          <span className={cargaColor}>{tecnico.cargaTrabajo}%</span>
                        </div>
                        <Progress 
                          value={tecnico.cargaTrabajo} 
                          className={cn(
                            "h-1.5",
                            tecnico.cargaTrabajo >= 80 && "[&>div]:bg-destructive",
                            tecnico.cargaTrabajo >= 60 && tecnico.cargaTrabajo < 80 && "[&>div]:bg-amber-500"
                          )}
                        />
                      </div>

                      {isSelected && expedienteSeleccionado && (
                        <Button
                          size="sm"
                          className="w-full mt-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAsignarExpediente?.(tecnico.id);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Asignar {expedienteSeleccionado}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Recomendación IA */}
        {expedienteSeleccionado && (
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="font-medium">Recomendación IA:</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Basado en la carga actual y especialización, se recomienda asignar a{' '}
              <span className="font-medium text-foreground">Ana Martínez Sánchez</span> (45% carga, especialista en evaluación)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GaliaTecnicosPanel;
