/**
 * Realtime Collaboration Hook - Phase 7: Advanced AI
 * Live presence, activity tracking, and team chat for CRM
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Collaborator {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  currentView?: string;
  currentEntityId?: string;
  currentEntityType?: string;
  lastActive: Date;
  cursor?: { x: number; y: number };
  isTyping?: boolean;
}

export interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  action: string;
  target: string;
  targetId?: string;
  targetType?: string;
  timestamp: Date;
  type: 'view' | 'edit' | 'create' | 'delete' | 'comment' | 'call' | 'email';
  metadata?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: Date;
  isRead?: boolean;
  replyTo?: string;
}

export interface CollaborationState {
  collaborators: Collaborator[];
  activities: ActivityItem[];
  messages: ChatMessage[];
  unreadCount: number;
  onlineCount: number;
}

const PRESENCE_CHANNEL = 'crm-presence';
const ACTIVITY_CHANNEL = 'crm-activity';
const CHAT_CHANNEL = 'crm-team-chat';

export function useRealtimeCollaboration(options?: {
  entityType?: string;
  entityId?: string;
  maxActivities?: number;
  maxMessages?: number;
}) {
  const { user } = useAuth();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [myStatus, setMyStatus] = useState<Collaborator['status']>('online');
  const [currentView, setCurrentView] = useState<string | undefined>(options?.entityType);

  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const activityChannelRef = useRef<RealtimeChannel | null>(null);
  const chatChannelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  const maxActivities = options?.maxActivities || 50;
  const maxMessages = options?.maxMessages || 100;

  // Computed values
  const onlineCount = collaborators.filter(c => c.status === 'online').length;
  const unreadCount = messages.filter(m => !m.isRead && m.userId !== user?.id).length;

  // Initialize presence tracking
  const initializePresence = useCallback(async () => {
    if (!user?.id) return;

    const myPresence: Partial<Collaborator> = {
      id: user.id,
      name: user.email?.split('@')[0] || 'Usuario',
      email: user.email || undefined,
      status: myStatus,
      currentView: currentView,
      lastActive: new Date(),
    };

    // Subscribe to presence channel
    const presenceChannel = supabase.channel(PRESENCE_CHANNEL, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users: Collaborator[] = [];

        Object.entries(state).forEach(([userId, presences]) => {
          if (presences && presences.length > 0) {
            const presence = presences[0] as any;
            users.push({
              id: userId,
              name: presence.name || 'Usuario',
              email: presence.email,
              avatar: presence.avatar,
              status: presence.status || 'online',
              currentView: presence.currentView,
              currentEntityId: presence.currentEntityId,
              currentEntityType: presence.currentEntityType,
              lastActive: new Date(presence.lastActive || Date.now()),
              cursor: presence.cursor,
              isTyping: presence.isTyping,
            });
          }
        });

        setCollaborators(users.filter(u => u.id !== user.id));
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('[Collaboration] User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('[Collaboration] User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track(myPresence);
          setIsConnected(true);
        }
      });

    presenceChannelRef.current = presenceChannel;

    // Start heartbeat
    heartbeatRef.current = setInterval(() => {
      presenceChannel.track({
        ...myPresence,
        lastActive: new Date(),
      });
    }, 30000);

    return () => {
      presenceChannel.unsubscribe();
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [user?.id, user?.email, myStatus, currentView]);

  // Initialize activity feed
  const initializeActivityFeed = useCallback(() => {
    const activityChannel = supabase.channel(ACTIVITY_CHANNEL);

    activityChannel
      .on('broadcast', { event: 'activity' }, ({ payload }) => {
        const activity = payload as ActivityItem;
        setActivities(prev => {
          const updated = [{ ...activity, timestamp: new Date(activity.timestamp) }, ...prev];
          return updated.slice(0, maxActivities);
        });
      })
      .subscribe();

    activityChannelRef.current = activityChannel;

    return () => {
      activityChannel.unsubscribe();
    };
  }, [maxActivities]);

  // Initialize team chat
  const initializeChat = useCallback(() => {
    const chatChannel = supabase.channel(CHAT_CHANNEL);

    chatChannel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        const message = payload as ChatMessage;
        setMessages(prev => {
          const updated = [...prev, { ...message, timestamp: new Date(message.timestamp) }];
          return updated.slice(-maxMessages);
        });
      })
      .subscribe();

    chatChannelRef.current = chatChannel;

    return () => {
      chatChannel.unsubscribe();
    };
  }, [maxMessages]);

  // Update my status
  const updateStatus = useCallback(async (status: Collaborator['status']) => {
    setMyStatus(status);
    
    if (presenceChannelRef.current && user?.id) {
      await presenceChannelRef.current.track({
        id: user.id,
        name: user.email?.split('@')[0] || 'Usuario',
        email: user.email,
        status,
        currentView,
        lastActive: new Date(),
      });
    }
  }, [user?.id, user?.email, currentView]);

  // Update current view
  const updateCurrentView = useCallback(async (view: string, entityId?: string, entityType?: string) => {
    setCurrentView(view);
    
    if (presenceChannelRef.current && user?.id) {
      await presenceChannelRef.current.track({
        id: user.id,
        name: user.email?.split('@')[0] || 'Usuario',
        email: user.email,
        status: myStatus,
        currentView: view,
        currentEntityId: entityId,
        currentEntityType: entityType,
        lastActive: new Date(),
      });
    }
  }, [user?.id, user?.email, myStatus]);

  // Broadcast an activity
  const broadcastActivity = useCallback(async (
    action: string,
    target: string,
    type: ActivityItem['type'],
    metadata?: Record<string, unknown>
  ) => {
    if (!activityChannelRef.current || !user?.id) return;

    const activity: ActivityItem = {
      id: `activity-${Date.now()}`,
      userId: user.id,
      userName: user.email?.split('@')[0] || 'Usuario',
      action,
      target,
      type,
      timestamp: new Date(),
      metadata,
    };

    await activityChannelRef.current.send({
      type: 'broadcast',
      event: 'activity',
      payload: activity,
    });

    // Also add to local state
    setActivities(prev => [activity, ...prev].slice(0, maxActivities));
  }, [user?.id, user?.email, maxActivities]);

  // Send a chat message
  const sendMessage = useCallback(async (content: string, replyTo?: string) => {
    if (!chatChannelRef.current || !user?.id || !content.trim()) return;

    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversationId: CHAT_CHANNEL,
      userId: user.id,
      userName: user.email?.split('@')[0] || 'Usuario',
      content: content.trim(),
      timestamp: new Date(),
      replyTo,
    };

    await chatChannelRef.current.send({
      type: 'broadcast',
      event: 'message',
      payload: message,
    });

    // Add to local state immediately
    setMessages(prev => [...prev, message].slice(-maxMessages));
  }, [user?.id, user?.email, maxMessages]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(() => {
    setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
  }, []);

  // Set typing indicator
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (presenceChannelRef.current && user?.id) {
      await presenceChannelRef.current.track({
        id: user.id,
        name: user.email?.split('@')[0] || 'Usuario',
        email: user.email,
        status: myStatus,
        currentView,
        lastActive: new Date(),
        isTyping,
      });
    }
  }, [user?.id, user?.email, myStatus, currentView]);

  // Initialize all channels
  useEffect(() => {
    const cleanupPresence = initializePresence();
    const cleanupActivity = initializeActivityFeed();
    const cleanupChat = initializeChat();

    // Load demo data
    loadDemoData();

    return () => {
      cleanupPresence?.then(cleanup => cleanup?.());
      cleanupActivity?.();
      cleanupChat?.();
    };
  }, [initializePresence, initializeActivityFeed, initializeChat]);

  // Load demo data
  const loadDemoData = useCallback(() => {
    setCollaborators([
      { id: '1', name: 'Ana García', avatar: '', status: 'online', currentView: 'Pipeline', lastActive: new Date() },
      { id: '2', name: 'Carlos López', avatar: '', status: 'online', currentView: 'Contactos', lastActive: new Date(), isTyping: true },
      { id: '3', name: 'María Rodríguez', avatar: '', status: 'away', lastActive: new Date(Date.now() - 300000) },
      { id: '4', name: 'Juan Martínez', avatar: '', status: 'busy', currentView: 'Deal: Acme Corp', lastActive: new Date() },
    ]);

    setActivities([
      { id: '1', userId: '1', userName: 'Ana', action: 'movió', target: 'Deal Acme Corp a Negociación', timestamp: new Date(Date.now() - 60000), type: 'edit' },
      { id: '2', userId: '2', userName: 'Carlos', action: 'agregó nota a', target: 'Contacto TechStart', timestamp: new Date(Date.now() - 120000), type: 'comment' },
      { id: '3', userId: '4', userName: 'Juan', action: 'creó', target: 'Deal Enterprise License', timestamp: new Date(Date.now() - 300000), type: 'create' },
    ]);

    setMessages([
      { id: '1', conversationId: CHAT_CHANNEL, userId: '1', userName: 'Ana', content: '¿Alguien puede revisar el deal de Acme Corp?', timestamp: new Date(Date.now() - 180000) },
      { id: '2', conversationId: CHAT_CHANNEL, userId: '2', userName: 'Carlos', content: 'Yo lo reviso, dame 5 min', timestamp: new Date(Date.now() - 120000) },
    ]);
  }, []);

  return {
    // State
    collaborators,
    activities,
    messages,
    isConnected,
    myStatus,
    currentView,
    onlineCount,
    unreadCount,
    // Actions
    updateStatus,
    updateCurrentView,
    broadcastActivity,
    sendMessage,
    markMessagesAsRead,
    setTyping,
    loadDemoData,
  };
}

export default useRealtimeCollaboration;
