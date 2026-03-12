/**
 * MobilityDashboard — Real KPIs + alerts for Global Mobility
 */
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Globe, FileText, DollarSign, AlertTriangle } from 'lucide-react';
import type { MobilityStats, MobilityDocument } from '@/hooks/erp/hr/useGlobalMobility';

interface Props {
  stats: MobilityStats | null;
  expiringDocs: MobilityDocument[];
  loading: boolean;
}

export function MobilityDashboard({ stats, expiringDocs, loading }: Props) {
  const kpis = [
    { label: 'Asignaciones activas', value: stats?.totalActive ?? 0, icon: Users, color: 'text-emerald-600' },
    { label: 'Países involucrados', value: stats?.countriesInvolved ?? 0, icon: Globe, color: 'text-blue-600' },
    { label: 'Docs por expirar', value: stats?.expiringDocuments ?? 0, icon: FileText, color: 'text-amber-600' },
    { label: 'Coste mensual total', value: `€${((stats?.totalMonthlyCost ?? 0) / 1000).toFixed(1)}K`, icon: DollarSign, color: 'text-violet-600' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <k.icon className={`h-4 w-4 ${k.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="text-lg font-bold">{loading ? '—' : k.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Distribución por tipo */}
      {stats && Object.keys(stats.byType).length > 0 && (
        <Card>
          <CardContent className="py-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Por tipo de asignación</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byType).map(([type, count]) => (
                <Badge key={type} variant="outline" className="text-xs">
                  {type.replace(/_/g, ' ')}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas documentos */}
      {expiringDocs.length > 0 && (
        <Card className="border-amber-500/30">
          <CardContent className="py-3">
            <p className="text-xs font-medium text-amber-700 flex items-center gap-1 mb-2">
              <AlertTriangle className="h-3.5 w-3.5" /> Documentos próximos a expirar
            </p>
            <div className="space-y-1.5">
              {expiringDocs.slice(0, 5).map(d => (
                <div key={d.id} className="flex items-center justify-between text-xs">
                  <span>{d.document_name}</span>
                  <span className="text-muted-foreground">{d.expiry_date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribución por riesgo */}
      {stats && Object.keys(stats.byRisk).length > 0 && (
        <Card>
          <CardContent className="py-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Nivel de riesgo</p>
            <div className="flex gap-3">
              {Object.entries(stats.byRisk).map(([risk, count]) => {
                const colors: Record<string, string> = {
                  low: 'bg-emerald-500/15 text-emerald-700',
                  medium: 'bg-amber-500/15 text-amber-700',
                  high: 'bg-orange-500/15 text-orange-700',
                  critical: 'bg-red-500/15 text-red-700',
                };
                return (
                  <Badge key={risk} variant="outline" className={`text-xs ${colors[risk] || ''}`}>
                    {risk}: {count}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
