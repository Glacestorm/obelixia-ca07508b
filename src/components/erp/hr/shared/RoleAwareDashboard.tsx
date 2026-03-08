/**
 * RoleAwareDashboard — Renders role-specific KPIs, alerts and quick actions
 * based on the active role experience profile.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Shield, Brain, Users, Scale, FileText, BarChart3, UserCog, Layers,
  TrendingUp, TrendingDown, Minus, AlertTriangle, Zap, Activity,
  DollarSign, CheckCircle, Clock, Target
} from 'lucide-react';
import { useHRActiveRoleExperience } from '@/hooks/admin/hr/useHRActiveRoleExperience';
import { DataSourceBadge, resolveDataSource } from './DataSourceBadge';
import { cn } from '@/lib/utils';

interface Props {
  companyId: string;
  realData?: {
    headcount?: number;
    avgSalary?: number;
    genderGap?: number;
    activeContracts?: number;
    openCases?: number;
    complianceScore?: number;
    criticalHires?: number;
    skillGaps?: number;
  };
  onNavigate?: (moduleId: string) => void;
  className?: string;
}

const ROLE_LABELS: Record<string, { title: string; subtitle: string; gradient: string }> = {
  ceo: { title: 'CEO / Dirección General', subtitle: 'Visión ejecutiva global de RRHH', gradient: 'from-amber-500/10 via-orange-500/10 to-red-500/10' },
  cfo: { title: 'Director/a Financiero', subtitle: 'Control financiero de plantilla', gradient: 'from-emerald-500/10 via-teal-500/10 to-cyan-500/10' },
  hr_director: { title: 'Director/a RRHH', subtitle: 'Gestión estratégica del capital humano', gradient: 'from-violet-500/10 via-purple-500/10 to-fuchsia-500/10' },
  manager: { title: 'Manager / Responsable', subtitle: 'Gestión operativa de equipo', gradient: 'from-blue-500/10 via-indigo-500/10 to-violet-500/10' },
  admin: { title: 'HR Operations', subtitle: 'Administración y operaciones de RRHH', gradient: 'from-sky-500/10 via-blue-500/10 to-indigo-500/10' },
  auditor: { title: 'Auditor/a', subtitle: 'Control, compliance y fiscalización', gradient: 'from-red-500/10 via-rose-500/10 to-pink-500/10' },
  employee: { title: 'Empleado/a', subtitle: 'Mi espacio personal', gradient: 'from-slate-500/10 via-gray-500/10 to-zinc-500/10' },
};

const ICON_MAP: Record<string, React.ReactNode> = {
  shield: <Shield className="h-4 w-4" />,
  brain: <Brain className="h-4 w-4" />,
  users: <Users className="h-4 w-4" />,
  scale: <Scale className="h-4 w-4" />,
  'file-text': <FileText className="h-4 w-4" />,
  'bar-chart': <BarChart3 className="h-4 w-4" />,
  'user-cog': <UserCog className="h-4 w-4" />,
  layers: <Layers className="h-4 w-4" />,
  dollar: <DollarSign className="h-4 w-4" />,
  target: <Target className="h-4 w-4" />,
  zap: <Zap className="h-4 w-4" />,
  activity: <Activity className="h-4 w-4" />,
};

function KPICard({ label, value, format, color, target }: {
  label: string; value: number | string; format?: string; color?: string; target?: number;
}) {
  const formatted = typeof value === 'number'
    ? format === 'currency' ? `€${value.toLocaleString()}`
    : format === 'percentage' ? `${value}%`
    : value.toLocaleString()
    : value;

  const progress = target && typeof value === 'number' ? Math.min(100, (value / target) * 100) : undefined;

  return (
    <Card className="p-3">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className={cn("text-xl font-bold mt-0.5", color)}>{formatted}</p>
      {progress !== undefined && <Progress value={progress} className="h-1 mt-2" />}
    </Card>
  );
}

export function RoleAwareDashboard({ companyId, realData, onNavigate, className }: Props) {
  const { profile, quickActions, kpiWidgets, isActive, loading } = useHRActiveRoleExperience(companyId);

  const roleKey = profile?.role_key || 'employee';
  const roleInfo = ROLE_LABELS[roleKey] || ROLE_LABELS.employee;
  const hasRealData = !!(realData?.headcount && realData.headcount > 0);

  // Build KPI values from real data when available
  const kpiValues: Record<string, number | string> = {
    headcount: realData?.headcount ?? 0,
    avg_salary: realData?.avgSalary ?? 0,
    gender_gap: realData?.genderGap ?? 0,
    active_contracts: realData?.activeContracts ?? 0,
    open_cases: realData?.openCases ?? 0,
    compliance_score: realData?.complianceScore ?? 0,
    critical_hires: realData?.criticalHires ?? 0,
    skill_gaps: realData?.skillGaps ?? 0,
  };

  if (!isActive && !loading) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="py-8 text-center">
          <UserCog className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No hay perfil de experiencia configurado para tu rol.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Contacta con el administrador para activar la experiencia por rol.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Role Header */}
      <Card className={cn("overflow-hidden")}>
        <div className={cn("px-4 py-3 bg-gradient-to-r", roleInfo.gradient)}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-base">{roleInfo.title}</h3>
              <p className="text-xs text-muted-foreground">{roleInfo.subtitle}</p>
            </div>
            <DataSourceBadge
              source={resolveDataSource(hasRealData)}
              lastUpdated={new Date()}
              coverage={hasRealData ? 85 : 0}
              compact
            />
          </div>
        </div>
      </Card>

      {/* KPIs */}
      {kpiWidgets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpiWidgets.slice(0, 8).map((w) => (
            <KPICard
              key={w.id}
              label={w.label}
              value={kpiValues[w.metric_key] ?? '—'}
              format={w.format}
              color={w.color}
              target={w.target}
            />
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => onNavigate?.(action.module)}
                >
                  {ICON_MAP[action.icon] || <Zap className="h-3.5 w-3.5" />}
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visible Modules */}
      {profile && profile.visible_modules.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Módulos Prioritarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {profile.visible_modules.slice(0, 12).map((mod) => (
                <Badge
                  key={mod}
                  variant="secondary"
                  className="text-xs cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => onNavigate?.(mod)}
                >
                  {mod.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default RoleAwareDashboard;
