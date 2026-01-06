/**
 * VerticalAccountingDashboard - Dashboard de Contabilidad Vertical
 * Muestra los 12 módulos de contabilidad especializados por sector
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { 
  Wheat, GraduationCap, Zap, HeartPulse, Hotel, Building2,
  ShoppingCart, Factory, Briefcase, Heart, Landmark, Truck,
  Bot, CheckCircle2, Clock, ArrowRight, BarChart3, FileText,
  Settings, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VERTICAL_ACCOUNTING_MODULES, type VerticalAccountingModule } from './VerticalAccountingTypes';
import { UniversalModulePlaceholder } from '@/components/shared/UniversalModulePlaceholder';

const iconMap: Record<string, React.ElementType> = {
  Wheat, GraduationCap, Zap, HeartPulse, Hotel, Building2,
  ShoppingCart, Factory, Briefcase, Heart, Landmark, Truck
};

const colorClasses: Record<string, string> = {
  emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  rose: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  slate: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  teal: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
};

interface VerticalAccountingDashboardProps {
  className?: string;
}

export function VerticalAccountingDashboard({ className }: VerticalAccountingDashboardProps) {
  const [selectedModule, setSelectedModule] = useState<VerticalAccountingModule | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const statusColors = {
    active: 'bg-green-500/20 text-green-400',
    beta: 'bg-amber-500/20 text-amber-400',
    planned: 'bg-blue-500/20 text-blue-400',
    deprecated: 'bg-red-500/20 text-red-400'
  };

  const statusLabels = {
    active: 'Activo',
    beta: 'Beta',
    planned: 'Planificado',
    deprecated: 'Obsoleto'
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Contabilidad Vertical
          </h2>
          <p className="text-muted-foreground">
            12 módulos especializados por sector industrial
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Sparkles className="h-3 w-3" />
          {VERTICAL_ACCOUNTING_MODULES.filter(m => m.status === 'active').length} Activos
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="modules">Módulos</TabsTrigger>
          <TabsTrigger value="agents">Agentes IA</TabsTrigger>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Module Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {VERTICAL_ACCOUNTING_MODULES.map((module, index) => {
              const Icon = iconMap[module.icon] || BarChart3;
              return (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className={cn(
                      "cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]",
                      selectedModule?.id === module.id && "ring-2 ring-primary"
                    )}
                    onClick={() => setSelectedModule(module)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className={cn("p-2 rounded-lg", colorClasses[module.color])}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <Badge className={cn("text-xs", statusColors[module.status])}>
                          {statusLabels[module.status]}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-sm mb-1">{module.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {module.description}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {module.code}
                        </Badge>
                        {module.agentCapabilities.length > 0 && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Bot className="h-3 w-3" />
                            IA
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Selected Module Details */}
          {selectedModule && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-3 rounded-lg", colorClasses[selectedModule.color])}>
                        {React.createElement(iconMap[selectedModule.icon] || BarChart3, { className: "h-6 w-6" })}
                      </div>
                      <div>
                        <CardTitle>{selectedModule.name}</CardTitle>
                        <CardDescription>{selectedModule.description}</CardDescription>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => setSelectedModule(null)}>
                      Cerrar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Features */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Funcionalidades
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {selectedModule.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50">
                          <Sparkles className="h-3 w-3 text-primary shrink-0" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* KPIs */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                      KPIs Específicos
                    </h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      {selectedModule.kpis.map((kpi) => (
                        <Card key={kpi.id} className="bg-muted/30">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{kpi.name}</span>
                              <Badge variant="outline" className="text-xs">{kpi.unit}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{kpi.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Agent Capabilities */}
                  {selectedModule.agentCapabilities.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Bot className="h-4 w-4 text-purple-500" />
                        Capacidades del Agente IA
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedModule.agentCapabilities.map((cap, idx) => (
                          <Badge key={idx} variant="outline" className="bg-purple-500/10">
                            {cap}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Compliance */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-amber-500" />
                      Requisitos de Cumplimiento
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedModule.complianceRequirements.map((req, idx) => (
                        <Badge key={idx} variant="secondary">
                          {req}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Reports */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-cyan-500" />
                      Reportes
                    </h4>
                    <div className="grid md:grid-cols-2 gap-2">
                      {selectedModule.reports.map((report) => (
                        <div key={report.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                          <span>{report.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs capitalize">{report.frequency}</Badge>
                            {report.required && (
                              <Badge className="text-xs bg-red-500/20 text-red-400">Obligatorio</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules">
          <ScrollArea className="h-[600px]">
            <div className="space-y-4 pr-4">
              {VERTICAL_ACCOUNTING_MODULES.map((module) => {
                const Icon = iconMap[module.icon] || BarChart3;
                return (
                  <Card key={module.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={cn("p-3 rounded-lg", colorClasses[module.color])}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{module.name}</h3>
                            <Badge variant="outline">{module.code}</Badge>
                            <Badge className={cn("text-xs", statusColors[module.status])}>
                              {statusLabels[module.status]}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{module.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {module.features.slice(0, 4).map((f, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>
                            ))}
                            {module.features.length > 4 && (
                              <Badge variant="outline" className="text-xs">+{module.features.length - 4} más</Badge>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {VERTICAL_ACCOUNTING_MODULES.filter(m => m.agentCapabilities.length > 0).map((module) => {
              const Icon = iconMap[module.icon] || BarChart3;
              return (
                <Card key={module.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-2 rounded-lg", colorClasses[module.color])}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-sm">{module.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-3">
                      <Bot className="h-4 w-4 text-purple-400" />
                      <span className="text-sm font-medium">Agente IA Especializado</span>
                    </div>
                    <div className="space-y-1">
                      {module.agentCapabilities.map((cap, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          {cap}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Reportes por Industria</CardTitle>
              <CardDescription>
                Reportes obligatorios y operativos por cada vertical
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-6 pr-4">
                  {VERTICAL_ACCOUNTING_MODULES.map((module) => (
                    <div key={module.id}>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        {React.createElement(iconMap[module.icon] || BarChart3, { className: "h-4 w-4" })}
                        {module.name}
                      </h4>
                      <div className="grid md:grid-cols-2 gap-2 ml-6">
                        {module.reports.map((report) => (
                          <div key={report.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span>{report.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs capitalize">{report.type}</Badge>
                              {report.required && (
                                <Badge className="text-xs bg-red-500/20 text-red-400">Req.</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default VerticalAccountingDashboard;
