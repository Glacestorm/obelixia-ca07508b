/**
 * ERPTrends2026Panel - Tendencias 2026-2030 y Características Disruptivas
 * Migración autónoma, blockchain, API-first, factura electrónica
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Sparkles,
  Zap,
  Shield,
  Link,
  FileCheck,
  Brain,
  Cloud,
  Cpu,
  TrendingUp,
  CheckCircle,
  Clock,
  Lock,
  Globe,
  Boxes,
  RefreshCw,
  PlayCircle,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ERPTrends2026PanelProps {
  sessionId?: string;
  companyId?: string;
}

interface TrendFeature {
  id: string;
  name: string;
  description: string;
  status: 'available' | 'beta' | 'coming_soon' | 'planned';
  category: 'ai' | 'compliance' | 'blockchain' | 'integration';
  icon: React.ComponentType<{ className?: string }>;
  releaseDate?: string;
  enabled?: boolean;
}

const TREND_FEATURES: TrendFeature[] = [
  {
    id: 'autonomous_migration',
    name: 'Migración Autónoma con IA',
    description: 'El agente IA analiza, planifica y ejecuta la migración sin intervención manual',
    status: 'beta',
    category: 'ai',
    icon: Brain
  },
  {
    id: 'zero_config',
    name: 'Zero-Configuration',
    description: 'Sube un backup y la IA detecta sistema, estructura y crea el plan automáticamente',
    status: 'available',
    category: 'ai',
    icon: Zap
  },
  {
    id: 'predictive_analysis',
    name: 'Análisis Predictivo',
    description: 'Predicción de errores y sugerencias de optimización antes de migrar',
    status: 'available',
    category: 'ai',
    icon: TrendingUp
  },
  {
    id: 'factura_electronica',
    name: 'Factura Electrónica 2026',
    description: 'Preparación automática para Ley Crea y Crece y formato Factura-e',
    status: 'available',
    category: 'compliance',
    icon: FileCheck
  },
  {
    id: 'ticketbai',
    name: 'TicketBAI / VeriFactu',
    description: 'Validación y migración de facturas con sistemas antifraude',
    status: 'available',
    category: 'compliance',
    icon: Shield
  },
  {
    id: 'sii_integration',
    name: 'Integración SII Avanzada',
    description: 'Verificación cruzada con Suministro Inmediato de Información',
    status: 'available',
    category: 'compliance',
    icon: Globe
  },
  {
    id: 'blockchain_audit',
    name: 'Blockchain Audit Trail',
    description: 'Hash inmutable de cada operación con certificación de integridad',
    status: 'beta',
    category: 'blockchain',
    icon: Link
  },
  {
    id: 'dora_compliance',
    name: 'Cumplimiento DORA/NIS2',
    description: 'Trazabilidad y resiliencia según normativa europea de ciberseguridad',
    status: 'coming_soon',
    category: 'blockchain',
    icon: Lock,
    releaseDate: 'Q2 2026'
  },
  {
    id: 'api_first',
    name: 'API-First Migration',
    description: 'Conexión directa con APIs de sistemas origen para migración continua',
    status: 'available',
    category: 'integration',
    icon: Cloud
  },
  {
    id: 'multi_company',
    name: 'Multi-Empresa Simultánea',
    description: 'Migrar múltiples empresas en paralelo con consolidación automática',
    status: 'beta',
    category: 'integration',
    icon: Boxes
  },
  {
    id: 'real_time_sync',
    name: 'Sincronización en Tiempo Real',
    description: 'Mantener sistemas sincronizados durante período de transición',
    status: 'planned',
    category: 'integration',
    icon: RefreshCw,
    releaseDate: 'Q3 2026'
  },
  {
    id: 'ai_agents',
    name: 'Agentes IA Especializados',
    description: 'Asistentes específicos por módulo: contabilidad, fiscal, tesorería',
    status: 'coming_soon',
    category: 'ai',
    icon: Cpu,
    releaseDate: 'Q2 2026'
  }
];

export function ERPTrends2026Panel({ sessionId, companyId }: ERPTrends2026PanelProps) {
  const [enabledFeatures, setEnabledFeatures] = useState<Set<string>>(
    new Set(['zero_config', 'predictive_analysis', 'factura_electronica', 'api_first'])
  );

  const toggleFeature = (featureId: string) => {
    setEnabledFeatures(prev => {
      const next = new Set(prev);
      if (next.has(featureId)) {
        next.delete(featureId);
      } else {
        next.add(featureId);
      }
      return next;
    });
  };

  const getStatusBadge = (status: TrendFeature['status']) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-500">Disponible</Badge>;
      case 'beta':
        return <Badge className="bg-purple-500">Beta</Badge>;
      case 'coming_soon':
        return <Badge variant="secondary">Próximamente</Badge>;
      case 'planned':
        return <Badge variant="outline">Planificado</Badge>;
    }
  };

  const getCategoryIcon = (category: TrendFeature['category']) => {
    switch (category) {
      case 'ai':
        return <Brain className="h-4 w-4" />;
      case 'compliance':
        return <Shield className="h-4 w-4" />;
      case 'blockchain':
        return <Link className="h-4 w-4" />;
      case 'integration':
        return <Cloud className="h-4 w-4" />;
    }
  };

  const availableCount = TREND_FEATURES.filter(f => f.status === 'available').length;
  const betaCount = TREND_FEATURES.filter(f => f.status === 'beta').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-gradient-to-r from-purple-500/20 to-pink-500/20 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Tendencias 2026-2030</CardTitle>
              <CardDescription>
                Características disruptivas y tecnologías emergentes
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{availableCount} disponibles</span>
            </div>
            <div className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4 text-purple-500" />
              <span>{betaCount} en beta</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{TREND_FEATURES.length - availableCount - betaCount} próximamente</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="ai">IA</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
          <TabsTrigger value="integration">Integración</TabsTrigger>
        </TabsList>

        {['all', 'ai', 'compliance', 'blockchain', 'integration'].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="grid gap-4 md:grid-cols-2">
              {TREND_FEATURES
                .filter(f => tab === 'all' || f.category === tab)
                .map((feature) => (
                  <Card 
                    key={feature.id}
                    className={cn(
                      "transition-all",
                      enabledFeatures.has(feature.id) && feature.status === 'available' 
                        ? "border-primary/50 bg-primary/5" 
                        : ""
                    )}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            feature.category === 'ai' && "bg-purple-500/20 text-purple-500",
                            feature.category === 'compliance' && "bg-green-500/20 text-green-500",
                            feature.category === 'blockchain' && "bg-blue-500/20 text-blue-500",
                            feature.category === 'integration' && "bg-orange-500/20 text-orange-500"
                          )}>
                            <feature.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{feature.name}</CardTitle>
                            {feature.releaseDate && (
                              <p className="text-xs text-muted-foreground">{feature.releaseDate}</p>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(feature.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {feature.description}
                      </p>
                      {(feature.status === 'available' || feature.status === 'beta') && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch
                              id={feature.id}
                              checked={enabledFeatures.has(feature.id)}
                              onCheckedChange={() => toggleFeature(feature.id)}
                            />
                            <Label htmlFor={feature.id} className="text-sm">
                              {enabledFeatures.has(feature.id) ? 'Activado' : 'Desactivado'}
                            </Label>
                          </div>
                          {feature.status === 'beta' && (
                            <Button size="sm" variant="outline">
                              <Settings className="h-3 w-3 mr-1" />
                              Configurar
                            </Button>
                          )}
                        </div>
                      )}
                      {feature.status === 'coming_soon' && (
                        <Button variant="outline" className="w-full" disabled>
                          <Clock className="h-4 w-4 mr-2" />
                          Disponible pronto
                        </Button>
                      )}
                      {feature.status === 'planned' && (
                        <Button variant="ghost" className="w-full" disabled>
                          En desarrollo
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Roadmap visual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Roadmap de Funcionalidades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { quarter: 'Q1 2026', items: ['Zero-Config Migration', 'Factura Electrónica', 'API-First'], status: 'done' },
              { quarter: 'Q2 2026', items: ['Agentes IA Especializados', 'DORA/NIS2 Compliance'], status: 'current' },
              { quarter: 'Q3 2026', items: ['Sincronización Tiempo Real', 'Blockchain v2'], status: 'planned' },
              { quarter: 'Q4 2026', items: ['IA Autónoma v2', 'Multi-Jurisdicción'], status: 'planned' },
            ].map((quarter, i) => (
              <div key={quarter.quarter} className="flex items-start gap-4">
                <div className={cn(
                  "w-20 text-sm font-medium",
                  quarter.status === 'done' && "text-green-600",
                  quarter.status === 'current' && "text-purple-600",
                  quarter.status === 'planned' && "text-muted-foreground"
                )}>
                  {quarter.quarter}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2">
                    {quarter.items.map((item) => (
                      <Badge 
                        key={item}
                        variant={quarter.status === 'done' ? 'default' : 'outline'}
                        className={cn(
                          quarter.status === 'current' && "border-purple-500 text-purple-600"
                        )}
                      >
                        {quarter.status === 'done' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {item}
                      </Badge>
                    ))}
                  </div>
                  {i < 3 && <div className="border-l-2 border-dashed ml-2 h-4 mt-2" />}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ERPTrends2026Panel;
