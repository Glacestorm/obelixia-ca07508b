/**
 * AI Unified Dashboard
 * Dashboard principal del sistema de IA Híbrida Universal
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Cpu,
  Server,
  Cloud,
  Shield,
  Coins,
  Route,
  Sparkles,
  Activity,
  Zap,
  Lock,
  CheckCircle,
} from 'lucide-react';
import { AIProvidersPanel } from './AIProvidersPanel';
import { AICreditsPanel } from './AICreditsPanel';
import { AIPrivacyPanel } from './AIPrivacyPanel';
import { AIRoutingPanel } from './AIRoutingPanel';
import { useAIProviders } from '@/hooks/admin/ai-hybrid';
import { useAICredits } from '@/hooks/admin/ai-hybrid';
import { useHybridAI } from '@/hooks/admin/ai-hybrid';
import { cn } from '@/lib/utils';

interface AIUnifiedDashboardProps {
  className?: string;
}

export function AIUnifiedDashboard({ className }: AIUnifiedDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const { providers, isLoading: providersLoading, getProvidersByType } = useAIProviders();
  const { balances, isLoading: creditsLoading } = useAICredits();
  const { routingMode } = useHybridAI();

  const localProviders = getProvidersByType('local');
  const externalProviders = getProvidersByType('external');
  const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);

  const stats = [
    {
      label: 'Proveedores Activos',
      value: providers.filter(p => p.is_active).length,
      total: providers.length,
      icon: <Cpu className="h-5 w-5" />,
      color: 'from-violet-500 to-purple-600',
    },
    {
      label: 'IA Local',
      value: localProviders.filter(p => p.is_active).length,
      total: localProviders.length,
      icon: <Server className="h-5 w-5" />,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      label: 'IA Cloud',
      value: externalProviders.filter(p => p.is_active).length,
      total: externalProviders.length,
      icon: <Cloud className="h-5 w-5" />,
      color: 'from-blue-500 to-cyan-600',
    },
    {
      label: 'Créditos Totales',
      value: totalBalance.toFixed(0),
      icon: <Coins className="h-5 w-5" />,
      color: 'from-amber-500 to-orange-600',
    },
  ];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25">
              <Sparkles className="h-6 w-6" />
            </div>
            <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
              IA Híbrida Universal
            </span>
          </h2>
          <p className="text-muted-foreground mt-1">
            Sistema unificado de inteligencia artificial local y en la nube
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className="gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
          >
            <Activity className="h-3.5 w-3.5" />
            Sistema Activo
          </Badge>
          <Badge 
            variant="outline" 
            className="gap-1.5 px-3 py-1.5"
          >
            <Route className="h-3.5 w-3.5" />
            {routingMode.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">
                      {stat.label}
                    </p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-bold">{stat.value}</span>
                      {stat.total !== undefined && (
                        <span className="text-sm text-muted-foreground">
                          /{stat.total}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={cn(
                    'p-2.5 rounded-lg text-white bg-gradient-to-br',
                    stat.color
                  )}>
                    {stat.icon}
                  </div>
                </div>
              </CardContent>
              {/* Decorative gradient */}
              <div 
                className={cn(
                  'absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r',
                  stat.color
                )}
              />
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="providers" className="gap-2">
            <Cpu className="h-4 w-4" />
            <span className="hidden sm:inline">Proveedores</span>
          </TabsTrigger>
          <TabsTrigger value="credits" className="gap-2">
            <Coins className="h-4 w-4" />
            <span className="hidden sm:inline">Créditos</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Privacidad</span>
          </TabsTrigger>
          <TabsTrigger value="routing" className="gap-2">
            <Route className="h-4 w-4" />
            <span className="hidden sm:inline">Enrutamiento</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  Estado del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    { label: 'Gateway de Privacidad', status: 'active', icon: <Shield className="h-4 w-4" /> },
                    { label: 'Enrutador Inteligente', status: 'active', icon: <Route className="h-4 w-4" /> },
                    { label: 'Sistema de Créditos', status: 'active', icon: <Coins className="h-4 w-4" /> },
                    { label: 'IA Local (Ollama)', status: localProviders.some(p => p.is_active) ? 'active' : 'inactive', icon: <Server className="h-4 w-4" /> },
                    { label: 'IA Cloud', status: externalProviders.some(p => p.is_active) ? 'active' : 'inactive', icon: <Cloud className="h-4 w-4" /> },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <Badge 
                        variant={item.status === 'active' ? 'default' : 'secondary'}
                        className={cn(
                          'text-xs',
                          item.status === 'active' && 'bg-emerald-500'
                        )}
                      >
                        {item.status === 'active' ? (
                          <><CheckCircle className="h-3 w-3 mr-1" /> Activo</>
                        ) : (
                          'Inactivo'
                        )}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Acciones Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3"
                  onClick={() => setActiveTab('providers')}
                >
                  <Server className="h-4 w-4" />
                  Configurar IA Local (Ollama)
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3"
                  onClick={() => setActiveTab('providers')}
                >
                  <Cloud className="h-4 w-4" />
                  Añadir Proveedor Cloud
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3"
                  onClick={() => setActiveTab('privacy')}
                >
                  <Shield className="h-4 w-4" />
                  Probar Clasificación de Datos
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3"
                  onClick={() => setActiveTab('routing')}
                >
                  <Route className="h-4 w-4" />
                  Cambiar Modo de Enrutamiento
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Features Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Características del Sistema</CardTitle>
              <CardDescription>
                Capacidades principales de la IA Híbrida Universal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    title: 'IA Local',
                    description: 'Ollama, LM Studio y más - datos nunca salen de tu servidor',
                    icon: <Server className="h-6 w-6" />,
                    color: 'from-emerald-500 to-teal-600',
                  },
                  {
                    title: 'IA en la Nube',
                    description: 'OpenAI, Anthropic, Google, Mistral y más proveedores',
                    icon: <Cloud className="h-6 w-6" />,
                    color: 'from-blue-500 to-cyan-600',
                  },
                  {
                    title: 'Privacidad Automática',
                    description: 'Clasificación y anonimización de datos sensibles',
                    icon: <Lock className="h-6 w-6" />,
                    color: 'from-violet-500 to-purple-600',
                  },
                  {
                    title: 'Enrutamiento Inteligente',
                    description: 'Decisiones automáticas basadas en contexto y costo',
                    icon: <Route className="h-6 w-6" />,
                    color: 'from-amber-500 to-orange-600',
                  },
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="p-4 rounded-xl border bg-gradient-to-br from-muted/50 to-transparent"
                  >
                    <div className={cn(
                      'p-3 rounded-lg text-white w-fit mb-3 bg-gradient-to-br',
                      feature.color
                    )}>
                      {feature.icon}
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{feature.title}</h4>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other Tabs */}
        <TabsContent value="providers">
          <AIProvidersPanel />
        </TabsContent>

        <TabsContent value="credits">
          <AICreditsPanel />
        </TabsContent>

        <TabsContent value="privacy">
          <AIPrivacyPanel />
        </TabsContent>

        <TabsContent value="routing">
          <AIRoutingPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AIUnifiedDashboard;
