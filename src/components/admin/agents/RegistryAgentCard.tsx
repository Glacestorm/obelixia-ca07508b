/**
 * RegistryAgentCard - Operational card for agents from erp_ai_agents_registry
 * Shows status, confidence, supervisor, health, actions, Live/Demo/Beta badges
 */

import { memo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Bot, Brain, Scale, Network, MessageSquare, Settings,
  Shield, Activity, Eye, Play, Pause, ArrowUpRight, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { RegistryAgent } from '@/hooks/admin/agents/useSupervisorDomainData';

const STATUS_CONFIG: Record<string, { dot: string; label: string; badge: string }> = {
  active: { dot: 'bg-emerald-500', label: 'Activo', badge: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' },
  beta: { dot: 'bg-amber-500', label: 'Beta', badge: 'bg-amber-500/15 text-amber-700 border-amber-500/30' },
  disabled: { dot: 'bg-muted-foreground/40', label: 'Pausado', badge: 'bg-muted text-muted-foreground' },
};

const DOMAIN_CONFIG: Record<string, { icon: typeof Bot; color: string; bg: string }> = {
  hr: { icon: Bot, color: 'text-blue-600', bg: 'bg-blue-500/10' },
  legal: { icon: Scale, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  cross: { icon: Network, color: 'text-violet-600', bg: 'bg-violet-500/10' },
  erp: { icon: Zap, color: 'text-cyan-600', bg: 'bg-cyan-500/10' },
  crm: { icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
};

interface RegistryAgentCardProps {
  agent: RegistryAgent;
  invocationCount?: number;
  lastInvocation?: string;
  onInteract?: (agent: RegistryAgent) => void;
  onConfigure?: (agent: RegistryAgent) => void;
  onViewLogs?: (agent: RegistryAgent) => void;
  className?: string;
}

export const RegistryAgentCard = memo(function RegistryAgentCard({
  agent,
  invocationCount = 0,
  lastInvocation,
  onInteract,
  onConfigure,
  onViewLogs,
  className,
}: RegistryAgentCardProps) {
  const status = STATUS_CONFIG[agent.status] || STATUS_CONFIG.active;
  const domain = DOMAIN_CONFIG[agent.module_domain] || DOMAIN_CONFIG.erp;
  const DomainIcon = agent.agent_type === 'supervisor' ? Brain : domain.icon;
  const isSupervisor = agent.agent_type === 'supervisor';
  const confidencePct = Math.round(agent.confidence_threshold * 100);

  return (
    <Card className={cn(
      "transition-all hover:shadow-md group",
      isSupervisor && "border-primary/30 bg-primary/[0.02]",
      className
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-lg shrink-0",
            isSupervisor ? "bg-gradient-to-br from-primary to-violet-600" : domain.bg
          )}>
            <DomainIcon className={cn("h-4 w-4", isSupervisor ? "text-white" : domain.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold truncate">{agent.name}</span>
              <div className={cn("w-2 h-2 rounded-full shrink-0", status.dot)} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{agent.specialization}</p>
          </div>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[10px] py-0 bg-violet-500/10 text-violet-700 border-violet-500/30">
            Live
          </Badge>
          <Badge variant="outline" className={cn("text-[10px] py-0", status.badge)}>
            {status.label}
          </Badge>
          {isSupervisor && (
            <Badge variant="outline" className="text-[10px] py-0 bg-primary/10 text-primary border-primary/30">
              Supervisor
            </Badge>
          )}
          {agent.requires_human_review && (
            <Badge variant="outline" className="text-[10px] py-0 bg-amber-500/10 text-amber-700 border-amber-500/30">
              <Shield className="h-2.5 w-2.5 mr-0.5" /> Rev. humana
            </Badge>
          )}
        </div>

        {/* Metrics */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Confianza</span>
            <div className="flex items-center gap-2">
              <Progress value={confidencePct} className="w-16 h-1.5" />
              <span className="text-[11px] font-medium w-8 text-right">{confidencePct}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Dominio</span>
            <span className="font-medium">{agent.module_domain.toUpperCase()}</span>
          </div>
          {agent.supervisor_code && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Supervisor</span>
              <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{agent.supervisor_code}</code>
            </div>
          )}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Invocaciones</span>
            <span className="font-medium">{invocationCount}</span>
          </div>
          {lastInvocation && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Última actividad</span>
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(lastInvocation), { locale: es, addSuffix: true })}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 pt-1">
          {onInteract && (
            <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => onInteract(agent)}>
              <MessageSquare className="h-3 w-3 mr-1" />
              Interactuar
            </Button>
          )}
          {onViewLogs && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onViewLogs(agent)}>
              <Eye className="h-3 w-3" />
            </Button>
          )}
          {onConfigure && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onConfigure(agent)}>
              <Settings className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export default RegistryAgentCard;
