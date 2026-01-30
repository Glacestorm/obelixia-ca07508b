/**
 * Vista 360° del Cliente - Tendencia 2025-2026
 * Visualiza todas las oportunidades del cliente en un recorrido unificado
 * (Customer-Centric vs Opportunity-Centric)
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Building2,
  MapPin,
  Globe,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Circle,
  ArrowRight,
  History,
  MessageSquare,
  FileText,
  Sparkles,
  Heart,
  AlertTriangle,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerOpportunity {
  id: string;
  title: string;
  value: number;
  stage: string;
  status: 'active' | 'won' | 'lost';
  probability: number;
  createdAt: Date;
  closedAt?: Date;
  assignedTo: string;
}

interface CustomerActivity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'deal_update';
  title: string;
  description: string;
  timestamp: Date;
  user: string;
  relatedDealId?: string;
}

interface Customer {
  id: string;
  name: string;
  logo?: string;
  industry: string;
  size: 'startup' | 'sme' | 'enterprise';
  location: string;
  website: string;
  primaryContact: {
    name: string;
    role: string;
    email: string;
    phone: string;
  };
  healthScore: number;
  lifetimeValue: number;
  opportunities: CustomerOpportunity[];
  activities: CustomerActivity[];
  firstContact: Date;
  lastContact: Date;
  nps?: number;
  tags: string[];
}

export function CustomerJourney360() {
  const [selectedCustomer, setSelectedCustomer] = useState<string>('cust-1');
  const [activeTab, setActiveTab] = useState('journey');

  const [customers] = useState<Customer[]>([
    {
      id: 'cust-1',
      name: 'Acme Corporation',
      industry: 'Tecnología',
      size: 'enterprise',
      location: 'Madrid, España',
      website: 'acme.com',
      healthScore: 92,
      lifetimeValue: 485000,
      nps: 9,
      tags: ['Enterprise', 'Tech', 'Top Client'],
      firstContact: new Date(Date.now() - 31536000000),
      lastContact: new Date(Date.now() - 86400000),
      primaryContact: {
        name: 'María García',
        role: 'CTO',
        email: 'maria@acme.com',
        phone: '+34 612 345 678',
      },
      opportunities: [
        { id: 'opp-1', title: 'Expansión ERP', value: 150000, stage: 'Propuesta', status: 'active', probability: 75, createdAt: new Date(Date.now() - 2592000000), assignedTo: 'Carlos Ruiz' },
        { id: 'opp-2', title: 'Licencias adicionales', value: 45000, stage: 'Negociación', status: 'active', probability: 85, createdAt: new Date(Date.now() - 1296000000), assignedTo: 'Carlos Ruiz' },
        { id: 'opp-3', title: 'Implementación inicial', value: 200000, stage: 'Cerrado', status: 'won', probability: 100, createdAt: new Date(Date.now() - 15552000000), closedAt: new Date(Date.now() - 10368000000), assignedTo: 'Ana López' },
        { id: 'opp-4', title: 'Módulo RRHH', value: 35000, stage: 'Perdido', status: 'lost', probability: 0, createdAt: new Date(Date.now() - 7776000000), closedAt: new Date(Date.now() - 5184000000), assignedTo: 'Ana López' },
        { id: 'opp-5', title: 'Soporte Premium', value: 55000, stage: 'Cerrado', status: 'won', probability: 100, createdAt: new Date(Date.now() - 20736000000), closedAt: new Date(Date.now() - 15552000000), assignedTo: 'Carlos Ruiz' },
      ],
      activities: [
        { id: 'act-1', type: 'meeting', title: 'Revisión trimestral', description: 'QBR con equipo ejecutivo', timestamp: new Date(Date.now() - 86400000), user: 'Carlos Ruiz' },
        { id: 'act-2', type: 'email', title: 'Propuesta enviada', description: 'Propuesta de expansión ERP v2', timestamp: new Date(Date.now() - 172800000), user: 'Carlos Ruiz', relatedDealId: 'opp-1' },
        { id: 'act-3', type: 'call', title: 'Llamada de seguimiento', description: 'Discusión de requisitos técnicos', timestamp: new Date(Date.now() - 432000000), user: 'Ana López' },
        { id: 'act-4', type: 'note', title: 'Nota interna', description: 'Cliente interesado en nuevos módulos para Q2', timestamp: new Date(Date.now() - 604800000), user: 'Carlos Ruiz' },
      ],
    },
    {
      id: 'cust-2',
      name: 'TechStart Inc',
      industry: 'SaaS',
      size: 'startup',
      location: 'Barcelona, España',
      website: 'techstart.io',
      healthScore: 68,
      lifetimeValue: 42000,
      nps: 7,
      tags: ['Startup', 'SaaS', 'Growing'],
      firstContact: new Date(Date.now() - 7776000000),
      lastContact: new Date(Date.now() - 604800000),
      primaryContact: {
        name: 'Pedro Sánchez',
        role: 'CEO',
        email: 'pedro@techstart.io',
        phone: '+34 678 901 234',
      },
      opportunities: [
        { id: 'opp-6', title: 'Licencias SaaS', value: 25000, stage: 'Calificado', status: 'active', probability: 45, createdAt: new Date(Date.now() - 1296000000), assignedTo: 'María López' },
        { id: 'opp-7', title: 'Proyecto piloto', value: 17000, stage: 'Cerrado', status: 'won', probability: 100, createdAt: new Date(Date.now() - 5184000000), closedAt: new Date(Date.now() - 2592000000), assignedTo: 'María López' },
      ],
      activities: [
        { id: 'act-5', type: 'email', title: 'Follow-up', description: 'Esperando feedback de demo', timestamp: new Date(Date.now() - 604800000), user: 'María López' },
      ],
    },
  ]);

  const currentCustomer = customers.find(c => c.id === selectedCustomer);

  const getStatusIcon = (status: CustomerOpportunity['status']) => {
    switch (status) {
      case 'won': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'lost': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Circle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSizeLabel = (size: Customer['size']) => {
    switch (size) {
      case 'enterprise': return 'Enterprise';
      case 'sme': return 'PYME';
      default: return 'Startup';
    }
  };

  const getActivityIcon = (type: CustomerActivity['type']) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'meeting': return <Calendar className="h-4 w-4" />;
      case 'note': return <FileText className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  if (!currentCustomer) return null;

  const activeDeals = currentCustomer.opportunities.filter(o => o.status === 'active');
  const wonDeals = currentCustomer.opportunities.filter(o => o.status === 'won');
  const lostDeals = currentCustomer.opportunities.filter(o => o.status === 'lost');
  const totalActiveValue = activeDeals.reduce((sum, o) => sum + o.value, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <User className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Vista 360° del Cliente</h3>
        <Badge variant="outline">Customer-Centric</Badge>
      </div>

      {/* Customer Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {customers.map((customer) => (
          <button
            key={customer.id}
            onClick={() => setSelectedCustomer(customer.id)}
            className={cn(
              "flex-shrink-0 p-3 rounded-lg border text-left transition-all min-w-[180px]",
              selectedCustomer === customer.id 
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "hover:bg-muted/50"
            )}
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {customer.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium truncate">{customer.name}</div>
                <div className="text-xs text-muted-foreground">{getSizeLabel(customer.size)}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Customer Header Card */}
      <Card className="border-2 border-primary/20">
        <CardContent className="pt-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-xl">
                {currentCustomer.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold">{currentCustomer.name}</h2>
                {currentCustomer.nps && currentCustomer.nps >= 8 && (
                  <Badge className="bg-green-500 text-white gap-1">
                    <Star className="h-3 w-3" />
                    Promotor
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {currentCustomer.industry}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {currentCustomer.location}
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  {currentCustomer.website}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {currentCustomer.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Health Score</div>
              <div className={cn("text-3xl font-bold", getHealthColor(currentCustomer.healthScore))}>
                {currentCustomer.healthScore}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">€{(currentCustomer.lifetimeValue / 1000).toFixed(0)}k</div>
              <div className="text-xs text-muted-foreground">Lifetime Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{activeDeals.length}</div>
              <div className="text-xs text-muted-foreground">Deals Activos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{wonDeals.length}</div>
              <div className="text-xs text-muted-foreground">Ganados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Math.floor((Date.now() - currentCustomer.firstContact.getTime()) / 86400000 / 30)}m
              </div>
              <div className="text-xs text-muted-foreground">Relación</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="journey" className="text-xs gap-1">
            <TrendingUp className="h-3 w-3" />
            Journey
          </TabsTrigger>
          <TabsTrigger value="deals" className="text-xs gap-1">
            <DollarSign className="h-3 w-3" />
            Oportunidades
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs gap-1">
            <History className="h-3 w-3" />
            Actividad
          </TabsTrigger>
        </TabsList>

        <TabsContent value="journey" className="mt-3">
          <Card>
            <CardContent className="pt-4">
              <ScrollArea className="h-[300px]">
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
                  
                  {/* Timeline items */}
                  <div className="space-y-4">
                    {[...currentCustomer.opportunities]
                      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                      .map((opp, idx) => (
                        <div key={opp.id} className="relative pl-10">
                          <div className={cn(
                            "absolute left-2 w-5 h-5 rounded-full border-2 bg-background flex items-center justify-center",
                            opp.status === 'won' && "border-green-500",
                            opp.status === 'lost' && "border-red-500",
                            opp.status === 'active' && "border-blue-500"
                          )}>
                            {getStatusIcon(opp.status)}
                          </div>
                          <div className={cn(
                            "p-3 rounded-lg border",
                            opp.status === 'won' && "bg-green-50/50 dark:bg-green-950/20",
                            opp.status === 'lost' && "bg-red-50/50 dark:bg-red-950/20"
                          )}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{opp.title}</span>
                              <span className="font-bold">€{(opp.value / 1000).toFixed(0)}k</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{opp.stage}</span>
                              <span>•</span>
                              <span>{opp.createdAt.toLocaleDateString('es-ES')}</span>
                              {opp.closedAt && (
                                <>
                                  <span>→</span>
                                  <span>{opp.closedAt.toLocaleDateString('es-ES')}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deals" className="mt-3">
          <div className="space-y-2">
            {currentCustomer.opportunities.map((opp) => (
              <Card key={opp.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(opp.status)}
                      <div>
                        <div className="font-medium text-sm">{opp.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {opp.stage} • {opp.assignedTo}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">€{(opp.value / 1000).toFixed(0)}k</div>
                      {opp.status === 'active' && (
                        <div className="text-xs text-muted-foreground">{opp.probability}% prob</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-3">
          <Card>
            <CardContent className="pt-4">
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {currentCustomer.activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{activity.title}</div>
                        <div className="text-xs text-muted-foreground">{activity.description}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {activity.user} • {activity.timestamp.toLocaleDateString('es-ES')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Insight */}
      <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/5 to-pink-500/5 border border-purple-500/20">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-purple-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Insight del Cliente</p>
            <p className="text-xs text-muted-foreground mt-1">
              {currentCustomer.healthScore >= 80 
                ? `${currentCustomer.name} es un cliente promotor con alto engagement. Considera upselling de servicios premium.`
                : currentCustomer.healthScore >= 60
                ? `${currentCustomer.name} muestra engagement moderado. Programa una revisión para fortalecer la relación.`
                : `${currentCustomer.name} requiere atención. El health score está bajo - programa una llamada de retención.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerJourney360;
