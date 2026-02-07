import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Circle, Coffee, Clock, Phone, Headphones,
  MessageSquare, TrendingUp, Users, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface AgentStatusPanelProps {
  agentName?: string;
  agentAvatar?: string;
  currentStatus: 'online' | 'away' | 'busy' | 'offline';
  statusMessage?: string;
  currentChatCount: number;
  maxChats: number;
  totalHandledToday: number;
  avgResponseTime?: number;
  skills?: string[];
  channels?: string[];
  onStatusChange: (status: 'online' | 'away' | 'busy' | 'offline', message?: string) => void;
  onMaxChatsChange?: (max: number) => void;
}

export function AgentStatusPanel({
  agentName = 'Agente',
  agentAvatar,
  currentStatus,
  statusMessage,
  currentChatCount,
  maxChats,
  totalHandledToday,
  avgResponseTime,
  skills = [],
  channels = [],
  onStatusChange,
  onMaxChatsChange,
}: AgentStatusPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-amber-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-400',
  };

  const statusLabels = {
    online: 'Disponible',
    away: 'Ausente',
    busy: 'Ocupado',
    offline: 'Desconectado',
  };

  const statusIcons = {
    online: <Circle className="h-3 w-3 fill-green-500 text-green-500" />,
    away: <Coffee className="h-3 w-3 text-amber-500" />,
    busy: <Phone className="h-3 w-3 text-red-500" />,
    offline: <Circle className="h-3 w-3 text-gray-400" />,
  };

  const loadPercentage = maxChats > 0 ? (currentChatCount / maxChats) * 100 : 0;
  const loadColor = loadPercentage >= 90 ? 'text-red-500' : loadPercentage >= 70 ? 'text-amber-500' : 'text-green-500';

  const handleStatusSelect = useCallback((value: string) => {
    onStatusChange(value as 'online' | 'away' | 'busy' | 'offline');
  }, [onStatusChange]);

  return (
    <Card className={cn(
      "transition-all duration-300",
      isExpanded ? "w-80" : "w-64"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={agentAvatar} />
                <AvatarFallback>
                  {agentName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background",
                statusColors[currentStatus]
              )} />
            </div>
            <div>
              <h4 className="font-medium text-sm">{agentName}</h4>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {statusIcons[currentStatus]}
                <span>{statusLabels[currentStatus]}</span>
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Zap className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Selector */}
        <Select value={currentStatus} onValueChange={handleStatusSelect}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="online">
              <div className="flex items-center gap-2">
                <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                Disponible
              </div>
            </SelectItem>
            <SelectItem value="away">
              <div className="flex items-center gap-2">
                <Coffee className="h-3 w-3 text-amber-500" />
                Ausente
              </div>
            </SelectItem>
            <SelectItem value="busy">
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-red-500" />
                Ocupado
              </div>
            </SelectItem>
            <SelectItem value="offline">
              <div className="flex items-center gap-2">
                <Circle className="h-3 w-3 text-gray-400" />
                Desconectado
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Chat Load */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              Chats activos
            </span>
            <span className={cn("font-medium", loadColor)}>
              {currentChatCount} / {maxChats}
            </span>
          </div>
          <Progress value={loadPercentage} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{totalHandledToday}</p>
            <p className="text-xs text-muted-foreground">Resueltos hoy</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{avgResponseTime || '--'}m</p>
            <p className="text-xs text-muted-foreground">Tiempo resp.</p>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 pt-2 border-t"
          >
            {/* Max Chats Setting */}
            {onMaxChatsChange && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Máx. chats simultáneos</span>
                <Select 
                  value={maxChats.toString()} 
                  onValueChange={(v) => onMaxChatsChange(parseInt(v))}
                >
                  <SelectTrigger className="w-16 h-7">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 5, 8, 10, 15, 20].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Skills */}
            {skills.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Habilidades</p>
                <div className="flex flex-wrap gap-1">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-[10px]">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Channels */}
            {channels.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Canales asignados</p>
                <div className="flex flex-wrap gap-1">
                  {channels.map((channel) => (
                    <Badge key={channel} variant="outline" className="text-[10px] capitalize">
                      {channel}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2 pt-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 h-8">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      Pausa
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Tomar un descanso de 15min</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 h-8">
                      <Users className="h-3.5 w-3.5 mr-1" />
                      Cola
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ver cola de espera</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

export default AgentStatusPanel;
