/**
 * Marketing Automation Dashboard - Phase 1
 * Main entry point for CRM Marketing Suite
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Target, 
  Users, 
  BarChart3, 
  Megaphone,
  TrendingUp,
  MousePointerClick,
  Send,
  UserCheck
} from 'lucide-react';
import { CampaignList } from './CampaignList';
import { EmailSequenceList } from './EmailSequenceList';
import { AudienceSegmentList } from './AudienceSegmentList';
import { EmailTemplateList } from './EmailTemplateList';
import { useMarketingCampaigns } from '@/hooks/crm/marketing';

interface MarketingDashboardProps {
  companyId?: string;
}

export function MarketingDashboard({ companyId }: MarketingDashboardProps) {
  const [activeTab, setActiveTab] = useState('campaigns');
  const { campaigns, isLoading } = useMarketingCampaigns(companyId);

  // Calculate stats from campaigns
  const stats = React.useMemo(() => {
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const totalSent = campaigns.reduce((acc, c) => acc + (c.metrics?.sent || 0), 0);
    const totalOpened = campaigns.reduce((acc, c) => acc + (c.metrics?.opened || 0), 0);
    const totalClicked = campaigns.reduce((acc, c) => acc + (c.metrics?.clicked || 0), 0);
    const avgOpenRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const avgClickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
    
    return { activeCampaigns, totalSent, avgOpenRate, avgClickRate };
  }, [campaigns]);

  const statCards = [
    { 
      label: 'Campañas Activas', 
      value: stats.activeCampaigns.toString(), 
      icon: Megaphone, 
      trend: '+12%',
      colorClass: 'text-primary'
    },
    { 
      label: 'Emails Enviados', 
      value: stats.totalSent.toLocaleString(), 
      icon: Send, 
      trend: '+8%',
      colorClass: 'text-accent-foreground'
    },
    { 
      label: 'Tasa Apertura', 
      value: `${stats.avgOpenRate.toFixed(1)}%`, 
      icon: MousePointerClick, 
      trend: '+5%',
      colorClass: 'text-primary'
    },
    { 
      label: 'Tasa Click', 
      value: `${stats.avgClickRate.toFixed(1)}%`, 
      icon: UserCheck, 
      trend: '+3%',
      colorClass: 'text-secondary-foreground'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-7 w-7 text-primary" />
            Marketing Automation
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona campañas, secuencias y audiencias desde un solo lugar
          </p>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          Suite Fase 1
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="h-3 w-3 text-primary" />
                      <span className="text-xs text-primary">{stat.trend}</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg bg-muted/50 ${stat.colorClass}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Campañas
          </TabsTrigger>
          <TabsTrigger value="sequences" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Secuencias
          </TabsTrigger>
          <TabsTrigger value="segments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Segmentos
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <CampaignList companyId={companyId} />
        </TabsContent>

        <TabsContent value="sequences" className="space-y-4">
          <EmailSequenceList companyId={companyId} />
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <AudienceSegmentList companyId={companyId} />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <EmailTemplateList companyId={companyId} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Analytics de Marketing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Analytics avanzado próximamente</p>
                <p className="text-sm mt-1">
                  Métricas detalladas, ROI tracking y reportes personalizados
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MarketingDashboard;
