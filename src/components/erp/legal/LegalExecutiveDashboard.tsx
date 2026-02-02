/**
 * LegalExecutiveDashboard - Panel de control ejecutivo del módulo jurídico
 * KPIs, alertas, compliance por jurisdicción, actividad reciente
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Scale, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  TrendingDown,
  FileText,
  MessageSquare,
  Globe,
  Building2,
  Users,
  Gavel
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface LegalExecutiveDashboardProps {
  companyId: string;
}

interface JurisdictionCompliance {
  code: string;
  name: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  regulations: number;
  alerts: number;
}

interface RecentActivity {
  id: string;
  type: 'consultation' | 'document' | 'compliance' | 'contract';
  title: string;
  description: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'warning';
}

export function LegalExecutiveDashboard({ companyId }: LegalExecutiveDashboardProps) {
  const [jurisdictions, setJurisdictions] = useState<JurisdictionCompliance[]>([
    { code: 'AD', name: 'Andorra', score: 92, trend: 'up', regulations: 15, alerts: 0 },
    { code: 'ES', name: 'España', score: 87, trend: 'stable', regulations: 28, alerts: 1 },
    { code: 'EU', name: 'Europa', score: 84, trend: 'up', regulations: 12, alerts: 1 },
    { code: 'INT', name: 'Internacional', score: 78, trend: 'down', regulations: 8, alerts: 2 }
  ]);

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([
    {
      id: '1',
      type: 'consultation',
      title: 'Consulta sobre GDPR',
      description: 'Análisis de retención de datos para operaciones transfronterizas',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      status: 'completed'
    },
    {
      id: '2',
      type: 'contract',
      title: 'Análisis contrato proveedor',
      description: 'Revisión cláusulas de confidencialidad y protección de datos',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      status: 'pending'
    },
    {
      id: '3',
      type: 'compliance',
      title: 'Alerta MiFID II',
      description: 'Nueva actualización regulatoria detectada',
      timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      status: 'warning'
    },
    {
      id: '4',
      type: 'document',
      title: 'Contrato laboral generado',
      description: 'Contrato indefinido adaptado a normativa andorrana',
      timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      status: 'completed'
    }
  ]);

  const [kpis, setKpis] = useState({
    overallCompliance: 85,
    activeRisks: 4,
    documentsGenerated: 23,
    aiConsultations: 156,
    contractsAnalyzed: 12,
    averageResponseTime: 2.3
  });

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'consultation': return MessageSquare;
      case 'document': return FileText;
      case 'compliance': return Shield;
      case 'contract': return Gavel;
      default: return FileText;
    }
  };

  const getStatusBadge = (status: RecentActivity['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Completado</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case 'warning':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Alerta</Badge>;
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4 rounded-full bg-muted" />;
  };

  const getFlagEmoji = (code: string) => {
    const flags: Record<string, string> = {
      'AD': '🇦🇩',
      'ES': '🇪🇸',
      'EU': '🇪🇺',
      'INT': '🌍'
    };
    return flags[code] || '🏳️';
  };

  return (
    <div className="space-y-6">
      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Compliance Global</p>
                <p className="text-2xl font-bold">{kpis.overallCompliance}%</p>
              </div>
              <Shield className="h-8 w-8 text-indigo-500 opacity-50" />
            </div>
            <Progress value={kpis.overallCompliance} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Riesgos Activos</p>
                <p className="text-2xl font-bold text-amber-600">{kpis.activeRisks}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Documentos</p>
                <p className="text-2xl font-bold">{kpis.documentsGenerated}</p>
              </div>
              <FileText className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Consultas IA</p>
                <p className="text-2xl font-bold">{kpis.aiConsultations}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Contratos</p>
                <p className="text-2xl font-bold">{kpis.contractsAnalyzed}</p>
              </div>
              <Gavel className="h-8 w-8 text-cyan-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tiempo Resp.</p>
                <p className="text-2xl font-bold">{kpis.averageResponseTime}s</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance por Jurisdicción */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Compliance por Jurisdicción
            </CardTitle>
            <CardDescription>
              Estado de cumplimiento normativo en cada jurisdicción
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {jurisdictions.map((jurisdiction) => (
              <div key={jurisdiction.code} className="flex items-center gap-4">
                <div className="text-2xl">{getFlagEmoji(jurisdiction.code)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{jurisdiction.name}</span>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(jurisdiction.trend)}
                      <span className="font-bold">{jurisdiction.score}%</span>
                    </div>
                  </div>
                  <Progress value={jurisdiction.score} className="h-2" />
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{jurisdiction.regulations} regulaciones</span>
                    {jurisdiction.alerts > 0 && (
                      <Badge variant="destructive" className="h-5 text-xs">
                        {jurisdiction.alerts} alertas
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actividad Reciente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Actividad Reciente
            </CardTitle>
            <CardDescription>
              Últimas acciones del módulo jurídico
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <div className="space-y-4">
                {recentActivity.map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate">{activity.title}</p>
                          {getStatusBadge(activity.status)}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(activity.timestamp), { 
                            addSuffix: true, 
                            locale: es 
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Alertas Activas */}
      {kpis.activeRisks > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Alertas que Requieren Atención
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-amber-500/30 bg-background">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="destructive">MiFID II</Badge>
                  <span className="text-sm font-medium">Actualización regulatoria</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Nueva directiva sobre transparencia en costes de inversión. Revisar procedimientos actuales.
                </p>
                <Button size="sm" variant="outline" className="mt-2">
                  Revisar ahora
                </Button>
              </div>
              <div className="p-3 rounded-lg border border-amber-500/30 bg-background">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="destructive">DORA</Badge>
                  <span className="text-sm font-medium">Plazo cumplimiento</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Vencimiento de adaptación en 45 días. Verificar plan de implementación.
                </p>
                <Button size="sm" variant="outline" className="mt-2">
                  Ver plan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default LegalExecutiveDashboard;
