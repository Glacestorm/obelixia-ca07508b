/**
 * Real-time Collaboration Panel - 2026 Trend
 * Live presence, cursors, and collaborative editing
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Users,
  MessageCircle,
  Eye,
  Edit3,
  Send,
  Circle,
  MousePointer2,
  Video,
  Phone,
  Sparkles,
  Activity,
  Clock,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Collaborator {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy';
  currentView?: string;
  lastActive: Date;
  cursor?: { x: number; y: number };
  isTyping?: boolean;
}

interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  action: string;
  target: string;
  timestamp: Date;
  type: 'view' | 'edit' | 'create' | 'comment';
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
}

const MOCK_COLLABORATORS: Collaborator[] = [
  { id: '1', name: 'Ana García', avatar: '', status: 'online', currentView: 'Pipeline', lastActive: new Date() },
  { id: '2', name: 'Carlos López', avatar: '', status: 'online', currentView: 'Contactos', lastActive: new Date(), isTyping: true },
  { id: '3', name: 'María Rodríguez', avatar: '', status: 'away', lastActive: new Date(Date.now() - 300000) },
  { id: '4', name: 'Juan Martínez', avatar: '', status: 'busy', currentView: 'Deal: Acme Corp', lastActive: new Date() },
];

const MOCK_ACTIVITIES: ActivityItem[] = [
  { id: '1', userId: '1', userName: 'Ana', action: 'movió', target: 'Deal Acme Corp a Negociación', timestamp: new Date(Date.now() - 60000), type: 'edit' },
  { id: '2', userId: '2', userName: 'Carlos', action: 'agregó nota a', target: 'Contacto TechStart', timestamp: new Date(Date.now() - 120000), type: 'comment' },
  { id: '3', userId: '4', userName: 'Juan', action: 'creó', target: 'Deal Enterprise License', timestamp: new Date(Date.now() - 300000), type: 'create' },
];

const MOCK_MESSAGES: ChatMessage[] = [
  { id: '1', userId: '1', userName: 'Ana', content: '¿Alguien puede revisar el deal de Acme Corp?', timestamp: new Date(Date.now() - 180000) },
  { id: '2', userId: '2', userName: 'Carlos', content: 'Yo lo reviso, dame 5 min', timestamp: new Date(Date.now() - 120000) },
];

export function RealtimeCollaborationPanel() {
  const [collaborators] = useState<Collaborator[]>(MOCK_COLLABORATORS);
  const [activities] = useState<ActivityItem[]>(MOCK_ACTIVITIES);
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);

  const onlineCount = collaborators.filter(c => c.status === 'online').length;

  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim()) return;
    
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      userId: 'me',
      userName: 'Tú',
      content: newMessage.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, message]);
    setNewMessage('');
  }, [newMessage]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: Collaborator['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-amber-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'view': return Eye;
      case 'edit': return Edit3;
      case 'create': return Sparkles;
      case 'comment': return MessageCircle;
      default: return Activity;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Colaboración
                <Badge className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs">
                  Live
                </Badge>
              </CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Video className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Videollamada</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant={showChat ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setShowChat(!showChat)}
              className="h-8 w-8 relative"
            >
              <MessageCircle className="h-4 w-4" />
              {messages.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 space-y-4">
        {/* Online collaborators */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">En línea ({onlineCount})</span>
            <div className="flex -space-x-2">
              {collaborators.filter(c => c.status === 'online').slice(0, 4).map((c) => (
                <TooltipProvider key={c.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="h-7 w-7 border-2 border-background cursor-pointer">
                        <AvatarImage src={c.avatar} />
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {c.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        <p className="font-medium">{c.name}</p>
                        {c.currentView && (
                          <p className="text-muted-foreground flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {c.currentView}
                          </p>
                        )}
                        {c.isTyping && (
                          <p className="text-primary flex items-center gap-1">
                            <Edit3 className="h-3 w-3" />
                            Escribiendo...
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>

          {/* Full collaborator list */}
          <div className="space-y-2">
            {collaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={collaborator.avatar} />
                      <AvatarFallback className="text-xs">
                        {collaborator.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                      getStatusColor(collaborator.status)
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{collaborator.name}</p>
                    {collaborator.currentView && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {collaborator.currentView}
                      </p>
                    )}
                    {collaborator.isTyping && (
                      <p className="text-xs text-primary flex items-center gap-1">
                        <Edit3 className="h-3 w-3 animate-pulse" />
                        Escribiendo...
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatTime(collaborator.lastActive)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed or Chat */}
        <div className="flex-1 flex flex-col">
          {showChat ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium">Chat del equipo</span>
              </div>
              <ScrollArea className="flex-1 pr-2">
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className={cn(
                      "flex gap-2",
                      msg.userId === 'me' && "flex-row-reverse"
                    )}>
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {msg.userName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "max-w-[75%] rounded-2xl px-3 py-1.5",
                        msg.userId === 'me' 
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted rounded-bl-sm"
                      )}>
                        {msg.userId !== 'me' && (
                          <p className="text-xs font-medium mb-0.5">{msg.userName}</p>
                        )}
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex gap-2 mt-2 pt-2 border-t">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="h-9 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button
                  size="icon"
                  className="h-9 w-9"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium">Actividad reciente</span>
              </div>
              <ScrollArea className="flex-1">
                <div className="space-y-3">
                  {activities.map((activity) => {
                    const Icon = getActivityIcon(activity.type);
                    return (
                      <div key={activity.id} className="flex items-start gap-2">
                        <div className={cn(
                          "p-1.5 rounded-lg",
                          activity.type === 'edit' && "bg-blue-100 dark:bg-blue-900/30",
                          activity.type === 'create' && "bg-green-100 dark:bg-green-900/30",
                          activity.type === 'comment' && "bg-purple-100 dark:bg-purple-900/30",
                          activity.type === 'view' && "bg-gray-100 dark:bg-gray-800/30"
                        )}>
                          <Icon className={cn(
                            "h-3 w-3",
                            activity.type === 'edit' && "text-blue-600",
                            activity.type === 'create' && "text-green-600",
                            activity.type === 'comment' && "text-purple-600",
                            activity.type === 'view' && "text-gray-600"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">{activity.userName}</span>
                            {' '}{activity.action}{' '}
                            <span className="text-primary">{activity.target}</span>
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default RealtimeCollaborationPanel;
