/**
 * GigWorkforcePanel - Panel de Gestión de Fuerza Laboral Contingent/Gig
 * Fase 11: Freelancers, Contractors, Trabajadores Externos
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users,
  Briefcase,
  Clock,
  FileText,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Shield,
  Search,
  Plus,
  RefreshCw,
  Sparkles,
  UserCheck,
  UserX,
  Calendar,
  Building2,
  Star,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useGigWorkforce, GigContractor, ContractorType, ContractorStatus } from '@/hooks/erp/hr/useGigWorkforce';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface GigWorkforcePanelProps {
  companyId: string;
  companyName?: string;
  className?: string;
}

const contractorTypeLabels: Record<ContractorType, string> = {
  freelancer: 'Freelancer',
  contractor: 'Contractor',
  consultant: 'Consultor',
  temp_agency: 'ETT',
  outsourced: 'Outsourced',
  intern: 'Becario'
};

const statusColors: Record<ContractorStatus, string> = {
  active: 'bg-green-500/10 text-green-700 border-green-500/30',
  onboarding: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  offboarding: 'bg-orange-500/10 text-orange-700 border-orange-500/30',
  inactive: 'bg-gray-500/10 text-gray-700 border-gray-500/30',
  blacklisted: 'bg-red-500/10 text-red-700 border-red-500/30'
};

export function GigWorkforcePanel({ companyId, companyName, className }: GigWorkforcePanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<ContractorType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ContractorStatus | 'all'>('all');

  const {
    isLoading,
    contractors,
    projects,
    analytics,
    insights,
    lastRefresh,
    fetchContractors,
    fetchProjects,
    getAIAnalytics,
    getComplianceAlerts
  } = useGigWorkforce();

  // Initial load
  useEffect(() => {
    if (companyId) {
      fetchContractors(companyId);
      fetchProjects(companyId);
      getAIAnalytics({ companyId, companyName });
    }
  }, [companyId, companyName, fetchContractors, fetchProjects, getAIAnalytics]);

  const handleRefresh = useCallback(() => {
    fetchContractors(companyId);
    fetchProjects(companyId);
    getAIAnalytics({ companyId, companyName });
  }, [companyId, companyName, fetchContractors, fetchProjects, getAIAnalytics]);

  // Filter contractors
  const filteredContractors = contractors.filter(c => {
    const matchesSearch = 
      c.legal_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || c.contractor_type === filterType;
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Stats cards
  const statsCards = [
    {
      title: 'Total Contractors',
      value: analytics?.totalContractors || contractors.length,
      icon: Users,
      trend: '+12%',
      trendUp: true
    },
    {
      title: 'Activos',
      value: analytics?.activeContractors || contractors.filter(c => c.status === 'active').length,
      icon: UserCheck,
      trend: '+5%',
      trendUp: true
    },
    {
      title: 'Compliance',
      value: `${analytics?.complianceRate || 87}%`,
      icon: Shield,
      trend: '-2%',
      trendUp: false
    },
    {
      title: 'Gasto Mensual',
      value: `€${((analytics?.totalMonthlySpend || 45000) / 1000).toFixed(0)}K`,
      icon: DollarSign,
      trend: '+8%',
      trendUp: true
    }
  ];

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Gestión Gig Workforce</CardTitle>
              <p className="text-xs text-muted-foreground">
                {lastRefresh 
                  ? `Actualizado ${formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}`
                  : 'Freelancers, Contractors y Externos'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
              Actualizar
            </Button>
            <Button size="sm" className="bg-gradient-to-r from-violet-500 to-purple-600">
              <Plus className="h-4 w-4 mr-1" />
              Nuevo Contractor
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {statsCards.map((stat, index) => (
            <Card key={index} className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                  <div className={cn(
                    "flex items-center text-xs",
                    stat.trendUp ? "text-green-600" : "text-red-600"
                  )}>
                    {stat.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {stat.trend}
                  </div>
                </div>
                <p className="text-xl font-bold mt-1">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.title}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="overview" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="contractors" className="text-xs">
              <Briefcase className="h-3 w-3 mr-1" />
              Contractors
            </TabsTrigger>
            <TabsTrigger value="projects" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Proyectos
            </TabsTrigger>
            <TabsTrigger value="compliance" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Compliance
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              IA Insights
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Distribution by Type */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Distribución por Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(analytics?.byType || {}).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm">{contractorTypeLabels[type as ContractorType] || type}</span>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={(count as number / (analytics?.totalContractors || 1)) * 100} 
                            className="w-20 h-2" 
                          />
                          <span className="text-sm font-medium w-8">{count as number}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Skills */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Top Skills Disponibles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(analytics?.topSkills || []).slice(0, 10).map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {skill.skill} ({skill.count})
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Alertas y Pendientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[150px]">
                    <div className="space-y-2">
                      {insights.filter(i => i.severity === 'high' || i.severity === 'critical').slice(0, 5).map((insight, index) => (
                        <div 
                          key={index} 
                          className={cn(
                            "p-2 rounded-lg border flex items-start gap-2",
                            insight.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                          )}
                        >
                          <AlertTriangle className={cn(
                            "h-4 w-4 mt-0.5",
                            insight.severity === 'critical' ? 'text-red-600' : 'text-amber-600'
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{insight.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{insight.description}</p>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {insight.type}
                          </Badge>
                        </div>
                      ))}
                      {insights.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No hay alertas pendientes
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Contractors Tab */}
          <TabsContent value="contractors" className="mt-0">
            {/* Filters */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email o skills..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as ContractorType | 'all')}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {Object.entries(contractorTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as ContractorStatus | 'all')}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="offboarding">Offboarding</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contractors List */}
            <ScrollArea className="h-[350px]">
              <div className="space-y-2">
                {filteredContractors.map((contractor) => (
                  <Card key={contractor.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-medium">
                            {contractor.legal_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{contractor.legal_name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{contractor.email}</span>
                              <span>•</span>
                              <span>{contractorTypeLabels[contractor.contractor_type]}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {contractor.performance_rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                              <span className="text-sm">{contractor.performance_rating.toFixed(1)}</span>
                            </div>
                          )}
                          <Badge className={cn("text-xs", statusColors[contractor.status])}>
                            {contractor.status}
                          </Badge>
                          {contractor.compliance_status !== 'compliant' && (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {contractor.skills.slice(0, 4).map((skill, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {contractor.skills.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{contractor.skills.length - 4}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredContractors.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No se encontraron contractors</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {projects.map((project) => (
                  <Card key={project.id} className="hover:bg-muted/30 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{project.title}</p>
                          <p className="text-xs text-muted-foreground">{project.project_code}</p>
                        </div>
                        <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                          {project.status}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Progreso</span>
                          <span>{project.completion_percentage}%</span>
                        </div>
                        <Progress value={project.completion_percentage} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{project.actual_hours}h / {project.estimated_hours || '∞'}h</span>
                          <span>€{project.spent_amount.toLocaleString()} / €{(project.budget_amount || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {projects.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No hay proyectos registrados</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="mt-0">
            <div className="space-y-4">
              <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Índice de Compliance Global</p>
                      <p className="text-3xl font-bold text-green-600">{analytics?.complianceRate || 87}%</p>
                    </div>
                    <Shield className="h-12 w-12 text-green-500/50" />
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">NDAs Firmados</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {contractors.filter(c => c.has_nda_signed).length}/{contractors.length}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">Con Seguro RC</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {contractors.filter(c => c.has_liability_insurance).length}/{contractors.length}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Documentos por Revisar</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[150px]">
                    <div className="space-y-2">
                      {contractors
                        .filter(c => c.compliance_status !== 'compliant')
                        .map((contractor) => (
                          <div key={contractor.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-200">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                              <span className="text-sm">{contractor.legal_name}</span>
                            </div>
                            <Badge variant="outline" className="text-xs bg-amber-100">
                              {contractor.compliance_status}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="insights" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <Card 
                    key={index}
                    className={cn(
                      "border-l-4",
                      insight.severity === 'critical' && "border-l-red-500 bg-red-50/50",
                      insight.severity === 'high' && "border-l-orange-500 bg-orange-50/50",
                      insight.severity === 'medium' && "border-l-amber-500 bg-amber-50/50",
                      insight.severity === 'low' && "border-l-blue-500 bg-blue-50/50"
                    )}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 mt-0.5 text-purple-500" />
                          <div>
                            <p className="font-medium text-sm">{insight.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                            {insight.recommendedAction && (
                              <p className="text-xs text-primary mt-2">
                                💡 {insight.recommendedAction}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className="text-xs">
                            {insight.type}
                          </Badge>
                          {insight.potentialSavings && insight.potentialSavings > 0 && (
                            <span className="text-xs text-green-600 font-medium">
                              Ahorro: €{insight.potentialSavings.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {insights.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Ejecuta el análisis IA para obtener insights</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => getAIAnalytics({ companyId, companyName })}
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      Analizar con IA
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default GigWorkforcePanel;
