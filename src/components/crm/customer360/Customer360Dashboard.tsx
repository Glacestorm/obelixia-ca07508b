// src/components/crm/customer360/Customer360Dashboard.tsx

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Activity, 
  Target, 
  Heart, 
  Layers, 
  Search,
  Sparkles,
  GitMerge,
  UserPlus
} from 'lucide-react';
import { useCustomer360 } from '@/hooks/crm/customer360';
import { ProfileList } from './ProfileList';
import { CustomerJourneyMap } from './CustomerJourneyMap';
import { TouchpointTimeline } from './TouchpointTimeline';
import { SegmentBuilder } from './SegmentBuilder';
import { IdentityResolution } from './IdentityResolution';

export function Customer360Dashboard() {
  const [activeTab, setActiveTab] = useState('profiles');
  const { stats, isLoading, enrichProfile, mergeProfiles } = useCustomer360();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Customer 360 & CDP
          </h2>
          <p className="text-muted-foreground">
            Visión unificada de clientes y plataforma de datos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <GitMerge className="h-4 w-4 mr-2" />
            Unificar Identidades
          </Button>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Nuevo Perfil
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Perfiles Totales</p>
                <p className="text-2xl font-bold">{stats.totalProfiles}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Leads Activos</p>
                <p className="text-2xl font-bold text-blue-500">{stats.leads}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Clientes</p>
                <p className="text-2xl font-bold text-emerald-500">{stats.customers}</p>
              </div>
              <Activity className="h-8 w-8 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Salud Promedio</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-rose-500">{stats.avgHealthScore}</p>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
              <Heart className="h-8 w-8 text-rose-500/50" />
            </div>
            <Progress value={stats.avgHealthScore} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Segmentos</p>
                <p className="text-2xl font-bold text-purple-500">{stats.totalSegments}</p>
              </div>
              <Layers className="h-8 w-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Data Quality</p>
                <p className="text-2xl font-bold text-amber-500">85%</p>
              </div>
              <Sparkles className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profiles" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Perfiles Unificados
          </TabsTrigger>
          <TabsTrigger value="journey" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Customer Journey
          </TabsTrigger>
          <TabsTrigger value="segments" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Segmentación Dinámica
          </TabsTrigger>
          <TabsTrigger value="identity" className="flex items-center gap-2">
            <GitMerge className="h-4 w-4" />
            Resolución Identidad
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="mt-4">
          <ProfileList />
        </TabsContent>

        <TabsContent value="journey" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <CustomerJourneyMap />
            </div>
            <div>
              <TouchpointTimeline />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="segments" className="mt-4">
          <SegmentBuilder />
        </TabsContent>

        <TabsContent value="identity" className="mt-4">
          <IdentityResolution />
        </TabsContent>
      </Tabs>
    </div>
  );
}
