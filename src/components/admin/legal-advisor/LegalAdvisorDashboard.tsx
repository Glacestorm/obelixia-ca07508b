/**
 * LegalAdvisorDashboard - Dashboard principal del Módulo Jurídico Enterprise
 * Fase 4: UI con tabs para asesoría, compliance, documentos y conocimiento
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Scale,
  Shield,
  FileText,
  BookOpen,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Brain,
  Gavel,
  Users,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLegalCompliance } from '@/hooks/admin/legal';
import { LegalAdvisorPanel } from './LegalAdvisorPanel';
import { LegalCompliancePanel } from './LegalCompliancePanel';
import { LegalDocumentsPanel } from './LegalDocumentsPanel';
import { LegalKnowledgePanel } from './LegalKnowledgePanel';
import { LegalAgentActivityPanel } from './LegalAgentActivityPanel';

interface LegalAdvisorDashboardProps {
  className?: string;
  embedded?: boolean;
}

export function LegalAdvisorDashboard({ className, embedded = false }: LegalAdvisorDashboardProps) {
  const [activeTab, setActiveTab] = useState('advisor');
  const { stats, isLoading: complianceLoading, fetchComplianceChecks } = useLegalCompliance();

  useEffect(() => {
    fetchComplianceChecks();
  }, [fetchComplianceChecks]);

  // Calculate dashboard stats
  const dashboardStats = useMemo(() => {
    return {
      overallCompliance: stats?.overall_score || 0,
      totalChecks: stats?.total_checks || 0,
      pendingActions: stats?.pending || 0,
      riskLevel: stats?.overall_score 
        ? stats.overall_score >= 80 ? 'low' : stats.overall_score >= 50 ? 'medium' : 'high'
        : 'unknown'
    };
  }, [stats]);

  const riskColors = {
    low: 'text-green-500',
    medium: 'text-yellow-500',
    high: 'text-red-500',
    unknown: 'text-muted-foreground'
  };

  const riskBadgeVariants = {
    low: 'bg-green-500/10 text-green-500 border-green-500/20',
    medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    high: 'bg-red-500/10 text-red-500 border-red-500/20',
    unknown: 'bg-muted text-muted-foreground'
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumplimiento Global</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.overallCompliance}%</div>
            <Progress value={dashboardStats.overallCompliance} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verificaciones</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalChecks}</div>
            <p className="text-xs text-muted-foreground">controles activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acciones Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.pendingActions}</div>
            <p className="text-xs text-muted-foreground">requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nivel de Riesgo</CardTitle>
            <AlertTriangle className={cn("h-4 w-4", riskColors[dashboardStats.riskLevel])} />
          </CardHeader>
          <CardContent>
            <Badge className={cn("text-sm font-semibold", riskBadgeVariants[dashboardStats.riskLevel])}>
              {dashboardStats.riskLevel === 'low' && 'Bajo'}
              {dashboardStats.riskLevel === 'medium' && 'Medio'}
              {dashboardStats.riskLevel === 'high' && 'Alto'}
              {dashboardStats.riskLevel === 'unknown' && 'Sin datos'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">evaluación actual</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="advisor" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Asesor IA</span>
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Compliance</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documentos</span>
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Conocimiento</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Actividad</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="advisor" className="space-y-4">
          <LegalAdvisorPanel />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <LegalCompliancePanel />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <LegalDocumentsPanel />
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-4">
          <LegalKnowledgePanel />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <LegalAgentActivityPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LegalAdvisorDashboard;
