import React from 'react';
import { DashboardLayout } from '@/layouts';
import { MultichannelSLADashboard } from '@/components/crm/omnichannel';
import { useSLAMetrics } from '@/hooks/crm/omnichannel/useSLAMetrics';
import { Loader2 } from 'lucide-react';

const SLADashboardPage = () => {
  const {
    slaPolicies,
    agentMetrics,
    channelMetrics,
    globalMetrics,
    isLoading,
    period,
    setPeriod,
    updateSlaPolicy,
  } = useSLAMetrics();

  // Map SLA policies to component format
  const slaConfigs = slaPolicies.map(policy => ({
    id: policy.id,
    name: policy.name,
    channel: policy.channel as 'whatsapp' | 'instagram' | 'facebook' | 'web' | 'all',
    firstResponseMinutes: policy.first_response_minutes,
    resolutionMinutes: policy.resolution_minutes,
    priority: policy.priority as 'low' | 'normal' | 'high' | 'urgent',
  }));

  // Use demo data as fallback when no real data
  const fallbackSlaConfigs = slaConfigs.length > 0 ? slaConfigs : [
    { id: '1', name: 'Estándar', channel: 'all' as const, firstResponseMinutes: 30, resolutionMinutes: 480, priority: 'normal' as const },
    { id: '2', name: 'WhatsApp Premium', channel: 'whatsapp' as const, firstResponseMinutes: 5, resolutionMinutes: 60, priority: 'high' as const },
    { id: '3', name: 'Urgente', channel: 'all' as const, firstResponseMinutes: 5, resolutionMinutes: 30, priority: 'urgent' as const },
  ];

  const fallbackAgentMetrics = agentMetrics.length > 0 ? agentMetrics : [
    { id: 'a1', name: 'Juan Pérez', activeConversations: 8, resolvedToday: 23, avgResponseTime: 4, avgResolutionTime: 45, slaCompliance: 94, csat: 4.7, channels: ['whatsapp', 'instagram'] },
    { id: 'a2', name: 'Laura Sánchez', activeConversations: 5, resolvedToday: 18, avgResponseTime: 6, avgResolutionTime: 52, slaCompliance: 88, csat: 4.5, channels: ['facebook', 'web'] },
    { id: 'a3', name: 'Carlos Ruiz', activeConversations: 12, resolvedToday: 31, avgResponseTime: 3, avgResolutionTime: 38, slaCompliance: 97, csat: 4.9, channels: ['whatsapp'] },
  ];

  const fallbackChannelMetrics = channelMetrics.length > 0 ? channelMetrics : [
    { channel: 'WhatsApp', totalConversations: 450, openConversations: 28, avgWaitTime: 2, avgResponseTime: 4, slaCompliance: 95, csat: 4.8 },
    { channel: 'Instagram', totalConversations: 180, openConversations: 12, avgWaitTime: 8, avgResponseTime: 12, slaCompliance: 82, csat: 4.3 },
    { channel: 'Facebook', totalConversations: 95, openConversations: 5, avgWaitTime: 15, avgResponseTime: 18, slaCompliance: 78, csat: 4.1 },
    { channel: 'Web Chat', totalConversations: 220, openConversations: 15, avgWaitTime: 1, avgResponseTime: 3, slaCompliance: 98, csat: 4.6 },
  ];

  const handleUpdateSLA = (config: typeof slaConfigs[0]) => {
    updateSlaPolicy(config.id, {
      name: config.name,
      first_response_minutes: config.firstResponseMinutes,
      resolution_minutes: config.resolutionMinutes,
    });
  };

  return (
    <DashboardLayout title="SLAs y Métricas">
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <MultichannelSLADashboard 
            slaConfigs={fallbackSlaConfigs}
            agentMetrics={fallbackAgentMetrics}
            channelMetrics={fallbackChannelMetrics}
            globalMetrics={globalMetrics}
            onUpdateSLA={handleUpdateSLA}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default SLADashboardPage;
