import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  FolderOpen,
  Euro,
  AlertTriangle,
  Bot,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GaliaKPIs } from '@/hooks/galia/useGaliaAnalytics';

interface GaliaKPICardsProps {
  kpis: GaliaKPIs | null;
  isLoading?: boolean;
  className?: string;
}

export function GaliaKPICards({ kpis, isLoading, className }: GaliaKPICardsProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M €`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K €`;
    }
    return `${value.toFixed(0)} €`;
  };

  const cards = [
    {
      title: 'Convocatorias Activas',
      value: kpis?.convocatoriasActivas || 0,
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Solicitudes Pendientes',
      value: kpis?.solicitudesPendientes || 0,
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Expedientes en Curso',
      value: kpis?.expedientesEnCurso || 0,
      icon: FolderOpen,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Presupuesto Disponible',
      value: formatCurrency(kpis?.presupuestoTotal ? kpis.presupuestoTotal - kpis.presupuestoComprometido : 0),
      icon: Euro,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      isText: true,
    },
    {
      title: 'Tasa Resolución',
      value: `${kpis?.tasaResolucion || 0}%`,
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      isText: true,
    },
    {
      title: 'Alertas Pendientes',
      value: kpis?.alertasPendientes || 0,
      icon: AlertTriangle,
      color: kpis?.alertasPendientes ? 'text-red-500' : 'text-muted-foreground',
      bgColor: kpis?.alertasPendientes ? 'bg-red-500/10' : 'bg-muted',
    },
    {
      title: 'Interacciones IA',
      value: kpis?.interaccionesIA || 0,
      icon: Bot,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      subtitle: 'últimos 30 días',
    },
    {
      title: 'Tiempo Medio',
      value: `${kpis?.tiempoMedioTramitacion || 0}d`,
      icon: TrendingUp,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
      subtitle: 'tramitación',
      isText: true,
    },
  ];

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3", className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3", className)}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className={cn("p-1.5 rounded-md", card.bgColor)}>
                  <Icon className={cn("h-4 w-4", card.color)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground truncate">{card.title}</p>
              <p className={cn(
                "text-xl font-bold",
                card.isText ? card.color : ""
              )}>
                {card.value}
              </p>
              {card.subtitle && (
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default GaliaKPICards;
