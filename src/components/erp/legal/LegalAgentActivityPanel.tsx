/**
 * LegalAgentActivityPanel - Actividad de agentes IA y log de auditoría
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Bot, 
  CheckCircle2, 
  Clock,
  AlertTriangle,
  MessageSquare,
  FileText,
  Shield,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface LegalAgentActivityPanelProps {
  companyId: string;
}

interface AgentActivity {
  id: string;
  agentType: string;
  action: string;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  confidence: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export function LegalAgentActivityPanel({ companyId }: LegalAgentActivityPanelProps) {
  const [activities, setActivities] = useState<AgentActivity[]>([
    {
      id: '1',
      agentType: 'labor_law',
      action: 'Consulta respondida',
      description: 'Análisis de despido procedente según ET art. 52',
      status: 'completed',
      confidence: 0.92,
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString()
    },
    {
      id: '2',
      agentType: 'data_protection',
      action: 'Validación de política',
      description: 'Revisión de política de privacidad conforme GDPR',
      status: 'completed',
      confidence: 0.88,
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString()
    },
    {
      id: '3',
      agentType: 'contract_analysis',
      action: 'Análisis de contrato',
      description: 'Detección de cláusulas de riesgo en NDA',
      status: 'completed',
      confidence: 0.85,
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString()
    },
    {
      id: '4',
      agentType: 'banking_compliance',
      action: 'Verificación MiFID II',
      description: 'Comprobación de requisitos de transparencia',
      status: 'pending',
      confidence: 0.78,
      timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString()
    },
    {
      id: '5',
      agentType: 'tax_law',
      action: 'Consulta fiscal',
      description: 'Análisis de obligaciones fiscales transfronterizas',
      status: 'completed',
      confidence: 0.90,
      timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString()
    }
  ]);

  const [isLoading, setIsLoading] = useState(false);

  const agentConfig: Record<string, { name: string; icon: React.ElementType; color: string }> = {
    labor_law: { name: 'Derecho Laboral', icon: MessageSquare, color: 'text-blue-500' },
    corporate_law: { name: 'Derecho Mercantil', icon: Shield, color: 'text-purple-500' },
    tax_law: { name: 'Derecho Fiscal', icon: FileText, color: 'text-amber-500' },
    data_protection: { name: 'Protección de Datos', icon: Shield, color: 'text-green-500' },
    banking_compliance: { name: 'Compliance Bancario', icon: Shield, color: 'text-cyan-500' },
    contract_analysis: { name: 'Análisis Contratos', icon: FileText, color: 'text-indigo-500' }
  };

  const getAgentInfo = (type: string) => {
    return agentConfig[type] || { name: type, icon: Bot, color: 'text-gray-500' };
  };

  const getStatusBadge = (status: AgentActivity['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Completado</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Error</Badge>;
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-ai-advisor', {
        body: {
          action: 'get_agent_activity',
          context: { companyId, limit: 20 }
        }
      });

      if (error) throw error;
      if (data?.data?.activities) {
        setActivities(data.data.activities);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Estadísticas
  const stats = {
    total: activities.length,
    completed: activities.filter(a => a.status === 'completed').length,
    avgConfidence: Math.round(
      activities.reduce((acc, a) => acc + a.confidence, 0) / activities.length * 100
    )
  };

  return (
    <div className="space-y-6">
      {/* Header con stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Actividad de Agentes IA
          </h2>
          <p className="text-sm text-muted-foreground">
            Log de acciones y consultas procesadas por los agentes jurídicos
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Acciones totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-sm text-muted-foreground">Completadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">{stats.avgConfidence}%</p>
            <p className="text-sm text-muted-foreground">Confianza promedio</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {activities.map((activity) => {
                const agentInfo = getAgentInfo(activity.agentType);
                const AgentIcon = agentInfo.icon;

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg bg-primary/10 ${agentInfo.color}`}>
                      <AgentIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{activity.action}</span>
                          {getStatusBadge(activity.status)}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(activity.confidence * 100)}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {agentInfo.name}
                        </Badge>
                        <span>
                          {formatDistanceToNow(new Date(activity.timestamp), {
                            addSuffix: true,
                            locale: es
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default LegalAgentActivityPanel;
