/**
 * AcademiaKPIPanel - Panel de KPIs en tiempo real
 * Muestra métricas reales desde la base de datos con actualización automática
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Users,
  BookOpen,
  Target,
  Award,
  Star,
  MessageSquare,
  Gamepad2,
  FileText,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
} from 'lucide-react';
import { useAcademiaKPIs } from '@/hooks/academia/useAcademiaKPIs';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function AcademiaKPIPanel() {
  const { kpis, trends, isLoading, lastRefresh, refresh } = useAcademiaKPIs(60000);

  const kpiCards = kpis
    ? [
        {
          label: 'Estudiantes Activos',
          value: kpis.activeStudents.toLocaleString(),
          change: trends ? `${trends.studentsChange > 0 ? '+' : ''}${trends.studentsChange}%` : undefined,
          up: (trends?.studentsChange ?? 0) >= 0,
          icon: Users,
          color: 'from-blue-500 to-cyan-500',
        },
        {
          label: 'Cursos Publicados',
          value: `${kpis.publishedCourses}`,
          subtitle: `${kpis.totalCourses} totales`,
          change: trends ? `+${trends.coursesChange}` : undefined,
          up: true,
          icon: BookOpen,
          color: 'from-violet-500 to-purple-500',
        },
        {
          label: 'Tasa de Finalización',
          value: `${kpis.completionRate}%`,
          subtitle: `${kpis.totalEnrollments} matrículas`,
          change: trends ? `${trends.completionChange > 0 ? '+' : ''}${trends.completionChange}%` : undefined,
          up: (trends?.completionChange ?? 0) >= 0,
          icon: Target,
          color: 'from-emerald-500 to-green-500',
        },
        {
          label: 'Certificados Emitidos',
          value: kpis.certificatesIssued.toLocaleString(),
          change: trends ? `+${trends.certificatesChange}%` : undefined,
          up: true,
          icon: Award,
          color: 'from-amber-500 to-orange-500',
        },
      ]
    : [];

  const secondaryKpis = kpis
    ? [
        { label: 'Valoración Media', value: kpis.avgRating > 0 ? `${kpis.avgRating}` : '—', icon: Star, suffix: `(${kpis.totalReviews} reseñas)` },
        { label: 'Lecciones', value: kpis.totalLessons.toString(), icon: FileText },
        { label: 'Quizzes Activos', value: kpis.activeQuizzes.toString(), icon: Gamepad2 },
        { label: 'Posts Comunidad', value: kpis.communityPosts.toString(), icon: MessageSquare },
      ]
    : [];

  if (isLoading && !kpis) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-4 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Refresh indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="h-3 w-3 text-emerald-500 animate-pulse" />
          <span>Datos en tiempo real</span>
          {lastRefresh && (
            <span>
              · Actualizado {formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={refresh} className="h-7 px-2 text-xs">
          <RefreshCw className={cn("h-3 w-3 mr-1", isLoading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
                {stat.change && (
                  <Badge
                    variant={stat.up ? 'default' : 'destructive'}
                    className="text-xs flex items-center gap-0.5"
                  >
                    {stat.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {stat.change}
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold mt-2">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              {stat.subtitle && (
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">{stat.subtitle}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {secondaryKpis.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
          >
            <item.icon className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">{item.value} {item.suffix && <span className="text-[10px] text-muted-foreground font-normal">{item.suffix}</span>}</p>
              <p className="text-[11px] text-muted-foreground">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AcademiaKPIPanel;
