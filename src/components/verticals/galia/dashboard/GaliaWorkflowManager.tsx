/**
 * GALIA - Gestor de Workflow
 * Panel visual de flujo de trabajo con transiciones de estado
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Search,
  FileCheck,
  Euro,
  XCircle,
  Archive,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowStep {
  id: string;
  estado: string;
  label: string;
  descripcion: string;
  icon: React.ElementType;
  color: string;
  expedientes: number;
}

const workflowSteps: WorkflowStep[] = [
  {
    id: 'instruccion',
    estado: 'instruccion',
    label: 'Instrucción',
    descripcion: 'Revisión inicial de documentación',
    icon: FileText,
    color: 'text-blue-500 bg-blue-500/10',
    expedientes: 12,
  },
  {
    id: 'evaluacion',
    estado: 'evaluacion',
    label: 'Evaluación',
    descripcion: 'Análisis técnico del proyecto',
    icon: Search,
    color: 'text-purple-500 bg-purple-500/10',
    expedientes: 8,
  },
  {
    id: 'propuesta',
    estado: 'propuesta',
    label: 'Propuesta',
    descripcion: 'Preparación de resolución',
    icon: FileCheck,
    color: 'text-amber-500 bg-amber-500/10',
    expedientes: 5,
  },
  {
    id: 'resolucion',
    estado: 'resolucion',
    label: 'Resolución',
    descripcion: 'Pendiente de firma',
    icon: Euro,
    color: 'text-cyan-500 bg-cyan-500/10',
    expedientes: 3,
  },
  {
    id: 'concedido',
    estado: 'concedido',
    label: 'Concedido',
    descripcion: 'Ayuda aprobada',
    icon: CheckCircle2,
    color: 'text-green-500 bg-green-500/10',
    expedientes: 45,
  },
  {
    id: 'justificacion',
    estado: 'justificacion',
    label: 'Justificación',
    descripcion: 'Verificación de gastos',
    icon: FileCheck,
    color: 'text-indigo-500 bg-indigo-500/10',
    expedientes: 22,
  },
  {
    id: 'cerrado',
    estado: 'cerrado',
    label: 'Cerrado',
    descripcion: 'Expediente finalizado',
    icon: Archive,
    color: 'text-gray-500 bg-gray-500/10',
    expedientes: 156,
  },
];

interface GaliaWorkflowManagerProps {
  onSelectEstado?: (estado: string) => void;
  selectedEstado?: string;
}

export function GaliaWorkflowManager({ 
  onSelectEstado,
  selectedEstado 
}: GaliaWorkflowManagerProps) {
  const totalExpedientes = workflowSteps.reduce((sum, step) => sum + step.expedientes, 0);
  const expedientesActivos = workflowSteps
    .filter(s => !['cerrado', 'denegado', 'renunciado'].includes(s.estado))
    .reduce((sum, step) => sum + step.expedientes, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" />
            Flujo de Trabajo
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{expedientesActivos}</span> activos de {totalExpedientes}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Visual Workflow Pipeline */}
        <div className="mb-6">
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {workflowSteps.slice(0, -1).map((step, index) => {
              const Icon = step.icon;
              const isSelected = selectedEstado === step.estado;
              const percentage = totalExpedientes ? (step.expedientes / totalExpedientes) * 100 : 0;
              
              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => onSelectEstado?.(step.estado)}
                    className={cn(
                      "flex flex-col items-center p-2 rounded-lg transition-all min-w-[80px]",
                      "hover:bg-muted/50",
                      isSelected && "ring-2 ring-primary bg-primary/5"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center mb-1",
                      step.color
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-center">{step.label}</span>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {step.expedientes}
                    </Badge>
                  </button>
                  {index < workflowSteps.length - 2 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mx-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Estado detallado */}
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {workflowSteps.map((step) => {
              const Icon = step.icon;
              const isSelected = selectedEstado === step.estado;
              const percentage = totalExpedientes ? (step.expedientes / totalExpedientes) * 100 : 0;

              return (
                <button
                  key={step.id}
                  onClick={() => onSelectEstado?.(step.estado)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                    "hover:bg-muted/50",
                    isSelected && "ring-2 ring-primary bg-primary/5 border-primary/50"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    step.color
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{step.label}</span>
                      <span className="font-bold">{step.expedientes}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {step.descripcion}
                    </p>
                    <Progress value={percentage} className="h-1 mt-2" />
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
          <div className="text-center p-2 rounded-lg bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 mx-auto text-green-500 mb-1" />
            <p className="text-lg font-bold">78%</p>
            <p className="text-xs text-muted-foreground">Aprobados</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-amber-500/10">
            <Clock className="h-4 w-4 mx-auto text-amber-500 mb-1" />
            <p className="text-lg font-bold">45d</p>
            <p className="text-xs text-muted-foreground">Tiempo medio</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-destructive/10">
            <AlertTriangle className="h-4 w-4 mx-auto text-destructive mb-1" />
            <p className="text-lg font-bold">3</p>
            <p className="text-xs text-muted-foreground">Con retraso</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default GaliaWorkflowManager;
