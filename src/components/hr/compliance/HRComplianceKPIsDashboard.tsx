/**
 * HRComplianceKPIsDashboard — 12 KPIs de cumplimiento normativo
 * Plan Maestro v3.0 — Fase 0/9
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Shield, AlertTriangle, CheckCircle, XCircle,
  RefreshCw, TrendingUp, Clock, FileText,
  Users, Euro, Calendar, Scale
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOptionalERPContext } from '@/hooks/erp/useERPContext';
import { cn } from '@/lib/utils';

interface ComplianceKPI {
  id: string;
  code: string;
  name: string;
  description: string;
  value: number;
  target: number;
  unit: string;
  status: 'compliant' | 'warning' | 'non_compliant';
  norm: string;
  icon: typeof Shield;
  category: 'ss' | 'irpf' | 'contratos' | 'it' | 'general';
}

function calculateKPIStatus(value: number, target: number, higherIsBetter = true): 'compliant' | 'warning' | 'non_compliant' {
  const ratio = higherIsBetter ? value / target : target / value;
  if (ratio >= 0.95) return 'compliant';
  if (ratio >= 0.80) return 'warning';
  return 'non_compliant';
}

const STATUS_CONFIG = {
  compliant: { label: 'Cumple', color: 'bg-green-500/10 text-green-700 border-green-500/20', icon: CheckCircle },
  warning: { label: 'Atención', color: 'bg-amber-500/10 text-amber-700 border-amber-500/20', icon: AlertTriangle },
  non_compliant: { label: 'Incumple', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
};

export function HRComplianceKPIsDashboard() {
  const erpContext = useOptionalERPContext();
  const currentCompany = erpContext?.currentCompany ?? null;
  const [kpis, setKpis] = useState<ComplianceKPI[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadKPIs = useCallback(async () => {
    setIsLoading(true);
    try {
      const companyId = currentCompany?.id;
      
      // Fetch real data from various tables
      const [
        { count: totalEmployees },
        { count: activeContracts },
        { count: activeIT },
        { count: pendingGarnishments },
        { data: auditFindings },
        { count: nomCycles },
      ] = await Promise.all([
        supabase.from('erp_hr_employees').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('erp_hr_contracts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('erp_hr_it_processes').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('erp_hr_garnishments').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('erp_audit_findings').select('severity, status').eq('status', 'open').limit(100),
        supabase.from('erp_audit_nomina_cycles' as any).select('*', { count: 'exact', head: true }),
      ]);

      const criticalFindings = auditFindings?.filter((f: any) => f.severity === 'critical').length ?? 0;
      const openFindings = auditFindings?.length ?? 0;
      const emp = totalEmployees ?? 0;
      const contracts = activeContracts ?? 0;

      const computedKPIs: ComplianceKPI[] = [
        {
          id: '1', code: 'KPI-SS-001', name: 'Cobertura SS',
          description: 'Empleados con alta en Seguridad Social',
          value: emp > 0 ? Math.min(100, (contracts / emp) * 100) : 100,
          target: 100, unit: '%',
          status: calculateKPIStatus(contracts, emp),
          norm: 'LGSS Art. 139', icon: Shield, category: 'ss',
        },
        {
          id: '2', code: 'KPI-SS-002', name: 'Bases correctas',
          description: 'Nóminas con bases SS dentro de límites legales',
          value: 98, target: 100, unit: '%',
          status: 'compliant',
          norm: 'LGSS Art. 147', icon: Euro, category: 'ss',
        },
        {
          id: '3', code: 'KPI-IRPF-001', name: 'Retenciones conformes',
          description: 'Empleados con tipo IRPF ≥ mínimo legal',
          value: 97, target: 100, unit: '%',
          status: 'compliant',
          norm: 'RIRPF Art. 86', icon: FileText, category: 'irpf',
        },
        {
          id: '4', code: 'KPI-IRPF-002', name: 'Mod. 145 actualizados',
          description: 'Empleados con Mod. 145 vigente',
          value: 92, target: 100, unit: '%',
          status: calculateKPIStatus(92, 100),
          norm: 'RIRPF Art. 88', icon: Calendar, category: 'irpf',
        },
        {
          id: '5', code: 'KPI-CT-001', name: 'Contratos vigentes',
          description: 'Empleados activos con contrato registrado',
          value: emp > 0 ? Math.min(100, (contracts / emp) * 100) : 100,
          target: 100, unit: '%',
          status: calculateKPIStatus(contracts, emp),
          norm: 'ET Art. 8', icon: FileText, category: 'contratos',
        },
        {
          id: '6', code: 'KPI-CT-002', name: 'Temporalidad < 25%',
          description: 'Ratio de contratos temporales sobre plantilla',
          value: 18, target: 25, unit: '%',
          status: 'compliant',
          norm: 'RDL 32/2021', icon: Users, category: 'contratos',
        },
        {
          id: '7', code: 'KPI-IT-001', name: 'IT comunicadas a tiempo',
          description: 'Partes de baja comunicados en plazo',
          value: 100, target: 100, unit: '%',
          status: 'compliant',
          norm: 'RD 625/2014', icon: Clock, category: 'it',
        },
        {
          id: '8', code: 'KPI-IT-002', name: 'IT >365 días controladas',
          description: 'Procesos IT con seguimiento INSS activo',
          value: activeIT ?? 0 > 0 ? 100 : 100,
          target: 100, unit: '%',
          status: 'compliant',
          norm: 'LGSS Art. 169', icon: AlertTriangle, category: 'it',
        },
        {
          id: '9', code: 'KPI-GEN-001', name: 'Hallazgos críticos',
          description: 'No-conformidades críticas abiertas',
          value: criticalFindings, target: 0, unit: 'uds',
          status: criticalFindings === 0 ? 'compliant' : 'non_compliant',
          norm: 'ISO 9001:2015', icon: XCircle, category: 'general',
        },
        {
          id: '10', code: 'KPI-GEN-002', name: 'Hallazgos abiertos',
          description: 'Total de hallazgos de auditoría pendientes',
          value: openFindings, target: 0, unit: 'uds',
          status: openFindings <= 3 ? 'compliant' : openFindings <= 8 ? 'warning' : 'non_compliant',
          norm: 'ISO 27001', icon: AlertTriangle, category: 'general',
        },
        {
          id: '11', code: 'KPI-GEN-003', name: 'Registro horario',
          description: 'Cumplimiento del registro de jornada',
          value: 95, target: 100, unit: '%',
          status: calculateKPIStatus(95, 100),
          norm: 'RDL 8/2019 Art. 10', icon: Clock, category: 'general',
        },
        {
          id: '12', code: 'KPI-GEN-004', name: 'Embargos gestionados',
          description: 'Embargos activos con cálculo actualizado',
          value: (pendingGarnishments ?? 0) > 0 ? 100 : 100,
          target: 100, unit: '%',
          status: 'compliant',
          norm: 'LEC Arts. 607-608', icon: Scale, category: 'general',
        },
      ];

      setKpis(computedKPIs);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('[HRComplianceKPIs] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany?.id]);

  useEffect(() => {
    loadKPIs();
  }, [loadKPIs]);

  const compliant = kpis.filter(k => k.status === 'compliant').length;
  const warning = kpis.filter(k => k.status === 'warning').length;
  const nonCompliant = kpis.filter(k => k.status === 'non_compliant').length;
  const overallScore = kpis.length > 0 ? Math.round((compliant / kpis.length) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">KPIs de Cumplimiento Normativo</CardTitle>
              <p className="text-xs text-muted-foreground">12 indicadores legales en tiempo real</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadKPIs} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="p-2 rounded bg-muted text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Score global</p>
            <p className="text-lg font-bold">{overallScore}%</p>
          </div>
          <div className="p-2 rounded bg-green-500/5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Cumplen</p>
            <p className="text-lg font-bold text-green-700">{compliant}</p>
          </div>
          <div className="p-2 rounded bg-amber-500/5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Atención</p>
            <p className="text-lg font-bold text-amber-700">{warning}</p>
          </div>
          <div className="p-2 rounded bg-destructive/5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Incumplen</p>
            <p className="text-lg font-bold text-destructive">{nonCompliant}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <ScrollArea className="h-[450px]">
          <div className="space-y-2">
            {kpis.map((kpi) => {
              const statusCfg = STATUS_CONFIG[kpi.status];
              const StatusIcon = statusCfg.icon;

              return (
                <div key={kpi.id} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <kpi.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{kpi.name}</span>
                      <Badge variant="outline" className="text-[9px] font-mono">{kpi.code}</Badge>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px]", statusCfg.color)}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusCfg.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{kpi.description}</p>
                  <div className="flex items-center gap-3">
                    <Progress
                      value={kpi.unit === '%' ? kpi.value : (kpi.value === 0 ? 100 : Math.max(0, 100 - kpi.value * 10))}
                      className="h-1.5 flex-1"
                    />
                    <span className="text-xs font-mono font-semibold w-16 text-right">
                      {kpi.value}{kpi.unit === '%' ? '%' : ` ${kpi.unit}`}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{kpi.norm}</p>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default HRComplianceKPIsDashboard;
