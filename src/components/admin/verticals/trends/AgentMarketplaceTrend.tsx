/**
 * AgentMarketplaceTrend - Tendencia #4: Marketplace de Agentes Verticales
 * Implementación completa con datos de ejemplo
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { 
  Store, 
  Star, 
  Download, 
  TrendingUp,
  Search,
  Filter,
  CheckCircle2,
  Zap,
  Users,
  Clock,
  ShoppingCart,
  Package,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Catálogo de agentes disponibles
const AGENT_CATALOG = [
  {
    id: 'agent-accounting-pro',
    name: 'Accounting Pro Agent',
    vendor: 'Obelixia Labs',
    category: 'Finance',
    vertical: 'Services',
    rating: 4.8,
    reviews: 156,
    downloads: 2340,
    price: 'Premium',
    status: 'installed',
    description: 'Automatiza contabilidad, reconciliaciones y reporting financiero con IA avanzada.',
    features: ['Auto-reconciliación', 'NIIF Compliance', 'Forecasting', 'Chatbot contable'],
    icon: '📊',
    version: '2.4.1',
    lastUpdate: '2024-01-15',
    usage: { tasks: 1250, accuracy: 97.2 },
  },
  {
    id: 'agent-healthcare-dx',
    name: 'Healthcare Diagnostic Agent',
    vendor: 'MedTech AI',
    category: 'Healthcare',
    vertical: 'Healthcare',
    rating: 4.9,
    reviews: 89,
    downloads: 1560,
    price: 'Premium',
    status: 'installed',
    description: 'Asistente de diagnóstico con análisis de historial clínico y alertas de medicación.',
    features: ['Diagnóstico asistido', 'Interacciones medicamentos', 'Historial clínico', 'Telemedicina'],
    icon: '🏥',
    version: '3.1.0',
    lastUpdate: '2024-01-20',
    usage: { tasks: 890, accuracy: 95.8 },
  },
  {
    id: 'agent-agro-precision',
    name: 'Precision Agriculture Agent',
    vendor: 'AgriTech Solutions',
    category: 'Agriculture',
    vertical: 'Agriculture',
    rating: 4.7,
    reviews: 67,
    downloads: 890,
    price: 'Core',
    status: 'available',
    description: 'Optimiza cultivos con análisis de suelo, predicción climática y gestión de riego.',
    features: ['Análisis de suelo', 'Predicción cosecha', 'Gestión riego', 'Control plagas'],
    icon: '🌾',
    version: '1.8.2',
    lastUpdate: '2024-01-18',
    usage: null,
  },
  {
    id: 'agent-industrial-oee',
    name: 'Industrial OEE Optimizer',
    vendor: 'FactoryAI',
    category: 'Manufacturing',
    vertical: 'Industrial',
    rating: 4.6,
    reviews: 112,
    downloads: 1890,
    price: 'Premium',
    status: 'available',
    description: 'Maximiza OEE con mantenimiento predictivo y optimización de líneas de producción.',
    features: ['OEE real-time', 'Mantenimiento predictivo', 'Control calidad', 'Digital Twin'],
    icon: '🏭',
    version: '2.2.0',
    lastUpdate: '2024-01-22',
    usage: null,
  },
  {
    id: 'agent-crm-sales',
    name: 'Sales Intelligence Agent',
    vendor: 'Obelixia Labs',
    category: 'Sales',
    vertical: 'Services',
    rating: 4.5,
    reviews: 203,
    downloads: 3450,
    price: 'Core',
    status: 'available',
    description: 'Potencia ventas con scoring de leads, predicción de cierre y coaching automático.',
    features: ['Lead scoring', 'Pipeline prediction', 'Email assistant', 'Coaching IA'],
    icon: '🎯',
    version: '4.0.1',
    lastUpdate: '2024-01-25',
    usage: null,
  },
  {
    id: 'agent-logistics',
    name: 'Logistics Optimization Agent',
    vendor: 'LogiTech AI',
    category: 'Logistics',
    vertical: 'Industrial',
    rating: 4.4,
    reviews: 78,
    downloads: 1120,
    price: 'Premium',
    status: 'update',
    description: 'Optimiza rutas, gestiona flotas y predice demanda de transporte.',
    features: ['Optimización rutas', 'Gestión flota', 'Tracking tiempo real', 'Predicción demanda'],
    icon: '🚛',
    version: '1.9.5',
    lastUpdate: '2024-01-10',
    usage: { tasks: 456, accuracy: 92.1 },
  },
];

const CATEGORIES = ['Todos', 'Finance', 'Healthcare', 'Agriculture', 'Manufacturing', 'Sales', 'Logistics'];

export function AgentMarketplaceTrend() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedAgent, setSelectedAgent] = useState<typeof AGENT_CATALOG[0] | null>(null);

  const filteredAgents = AGENT_CATALOG.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          agent.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || agent.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const installedCount = AGENT_CATALOG.filter(a => a.status === 'installed').length;
  const totalDownloads = AGENT_CATALOG.reduce((acc, a) => acc + a.downloads, 0);

  const handleInstall = (agent: typeof AGENT_CATALOG[0]) => {
    toast.success(`${agent.name} instalado correctamente`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'installed': return <Badge className="bg-green-500">Instalado</Badge>;
      case 'update': return <Badge className="bg-blue-500">Actualización</Badge>;
      case 'available': return <Badge variant="outline">Disponible</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <Store className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{AGENT_CATALOG.length}</p>
            <p className="text-xs text-muted-foreground">Agentes Disponibles</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 text-center">
            <Package className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{installedCount}</p>
            <p className="text-xs text-muted-foreground">Instalados</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4 text-center">
            <Download className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{(totalDownloads / 1000).toFixed(1)}k</p>
            <p className="text-xs text-muted-foreground">Descargas Totales</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 text-center">
            <Award className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">4.6</p>
            <p className="text-xs text-muted-foreground">Rating Promedio</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar agentes..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="whitespace-nowrap"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="browse" className="space-y-4">
        <TabsList>
          <TabsTrigger value="browse">Explorar</TabsTrigger>
          <TabsTrigger value="installed">Instalados ({installedCount})</TabsTrigger>
          <TabsTrigger value="updates">Actualizaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map((agent) => (
              <Card 
                key={agent.id} 
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedAgent?.id === agent.id && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedAgent(agent)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{agent.icon}</span>
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">{agent.vendor}</p>
                      </div>
                    </div>
                    {getStatusBadge(agent.status)}
                  </div>

                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {agent.description}
                  </p>

                  <div className="flex items-center gap-4 mb-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      <span>{agent.rating}</span>
                      <span className="text-muted-foreground">({agent.reviews})</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Download className="h-4 w-4" />
                      <span>{agent.downloads}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {agent.features.slice(0, 3).map((feat, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {feat}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant={agent.price === 'Premium' ? 'default' : 'secondary'}>
                      {agent.price}
                    </Badge>
                    {agent.status !== 'installed' && (
                      <Button 
                        size="sm" 
                        className="gap-1"
                        onClick={(e) => { e.stopPropagation(); handleInstall(agent); }}
                      >
                        <ShoppingCart className="h-3 w-3" />
                        Instalar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="installed" className="mt-0">
          <div className="space-y-4">
            {AGENT_CATALOG.filter(a => a.status === 'installed').map((agent) => (
              <Card key={agent.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{agent.icon}</span>
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">v{agent.version} • {agent.vendor}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {agent.usage && (
                        <div className="text-right">
                          <p className="text-sm font-medium">{agent.usage.tasks} tareas</p>
                          <p className="text-xs text-muted-foreground">{agent.usage.accuracy}% precisión</p>
                        </div>
                      )}
                      <Button variant="outline" size="sm">Configurar</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="updates" className="mt-0">
          <div className="space-y-4">
            {AGENT_CATALOG.filter(a => a.status === 'update').map((agent) => (
              <Card key={agent.id} className="border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{agent.icon}</span>
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Nueva versión disponible • Actual: v{agent.version}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Actualizar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Agent Detail Modal would go here */}
      {selectedAgent && (
        <Card className="mt-4 border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <span className="text-3xl">{selectedAgent.icon}</span>
                {selectedAgent.name}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedAgent(null)}>✕</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{selectedAgent.description}</p>
            
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-3 rounded-lg bg-muted/50">
                <Star className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                <p className="font-bold">{selectedAgent.rating}</p>
                <p className="text-xs text-muted-foreground">{selectedAgent.reviews} reviews</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <Download className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                <p className="font-bold">{selectedAgent.downloads}</p>
                <p className="text-xs text-muted-foreground">Descargas</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <Package className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                <p className="font-bold">v{selectedAgent.version}</p>
                <p className="text-xs text-muted-foreground">Versión</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <Clock className="h-5 w-5 mx-auto mb-1 text-green-500" />
                <p className="font-bold text-sm">{selectedAgent.lastUpdate}</p>
                <p className="text-xs text-muted-foreground">Actualizado</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Características</p>
              <div className="flex flex-wrap gap-2">
                {selectedAgent.features.map((feat, i) => (
                  <Badge key={i} variant="outline" className="gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {feat}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              {selectedAgent.status !== 'installed' ? (
                <Button className="flex-1 gap-2" onClick={() => handleInstall(selectedAgent)}>
                  <ShoppingCart className="h-4 w-4" />
                  Instalar Agente
                </Button>
              ) : (
                <Button className="flex-1 gap-2" variant="outline">
                  <Zap className="h-4 w-4" />
                  Abrir Agente
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AgentMarketplaceTrend;
