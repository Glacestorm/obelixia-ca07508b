import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// === INTERFACES ===
export interface OmniConversation {
  id: string;
  contact_id?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  company_id?: string;
  channel: 'whatsapp' | 'email' | 'sms' | 'webchat' | 'instagram' | 'facebook' | 'telegram';
  external_id?: string;
  status: 'open' | 'pending' | 'resolved' | 'closed' | 'spam';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_agent_id?: string;
  assigned_team_id?: string;
  subject?: string;
  last_message_at?: string;
  last_message_preview?: string;
  last_message_direction?: 'inbound' | 'outbound';
  unread_count: number;
  is_bot_active: boolean;
  sla_deadline?: string;
  sla_breached: boolean;
  tags: string[];
  sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed';
  sentiment_score?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OmniMessage {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  sender_type: 'contact' | 'agent' | 'bot' | 'system';
  sender_id?: string;
  sender_name?: string;
  content: string;
  content_type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'template' | 'interactive';
  attachments?: unknown[];
  external_id?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  error_message?: string;
  is_internal_note: boolean;
  reply_to_message_id?: string;
  ai_generated: boolean;
  ai_confidence?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface AgentStatus {
  id: string;
  agent_id: string;
  agent_name?: string;
  team_id?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  status_message?: string;
  current_chat_count: number;
  max_chats: number;
  skills: string[];
  channels: string[];
  last_activity_at: string;
  total_handled_today: number;
  avg_response_time_today?: number;
}

export interface QuickReply {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  category?: string;
  channels: string[];
  variables: string[];
}

export interface ConversationFilters {
  status?: string;
  channel?: string;
  priority?: string;
  assignedToMe?: boolean;
  unreadOnly?: boolean;
  search?: string;
}

// === HOOK ===
export function useOmnichannelHub() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<OmniConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<OmniConversation | null>(null);
  const [messages, setMessages] = useState<OmniMessage[]>([]);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ConversationFilters>({});
  const [unreadTotal, setUnreadTotal] = useState(0);

  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const client = supabase as any;

  // === FETCH CONVERSATIONS ===
  const fetchConversations = useCallback(async (customFilters?: ConversationFilters) => {
    setIsLoading(true);
    setError(null);

    try {
      let query = client
        .from('crm_omni_conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(100);

      const activeFilters = customFilters || filters;

      if (activeFilters.status) {
        query = query.eq('status', activeFilters.status);
      }
      if (activeFilters.channel) {
        query = query.eq('channel', activeFilters.channel);
      }
      if (activeFilters.priority) {
        query = query.eq('priority', activeFilters.priority);
      }
      if (activeFilters.assignedToMe && user?.id) {
        query = query.eq('assigned_agent_id', user.id);
      }
      if (activeFilters.unreadOnly) {
        query = query.gt('unread_count', 0);
      }
      if (activeFilters.search) {
        query = query.or(`contact_name.ilike.%${activeFilters.search}%,contact_phone.ilike.%${activeFilters.search}%,contact_email.ilike.%${activeFilters.search}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setConversations(data || []);
      setUnreadTotal((data || []).reduce((sum: number, c: OmniConversation) => sum + (c.unread_count || 0), 0));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error loading conversations';
      setError(message);
      console.error('[useOmnichannelHub] fetchConversations error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [filters, user?.id, client]);

  // === FETCH MESSAGES ===
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error: fetchError } = await client
        .from('crm_omni_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      setMessages(data || []);
      return data;
    } catch (err) {
      console.error('[useOmnichannelHub] fetchMessages error:', err);
      return [];
    }
  }, [client]);

  // === SELECT CONVERSATION ===
  const selectConversation = useCallback(async (conversation: OmniConversation) => {
    setCurrentConversation(conversation);
    await fetchMessages(conversation.id);

    // Mark as read
    if (conversation.unread_count > 0) {
      await client
        .from('crm_omni_conversations')
        .update({ unread_count: 0 })
        .eq('id', conversation.id);

      setConversations(prev => prev.map(c => 
        c.id === conversation.id ? { ...c, unread_count: 0 } : c
      ));
    }
  }, [fetchMessages, client]);

  // === SEND MESSAGE ===
  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    contentType: OmniMessage['content_type'] = 'text',
    isInternalNote = false
  ) => {
    if (!user?.id) {
      toast.error('Debes iniciar sesión');
      return null;
    }

    setIsSending(true);

    try {
      // Insert message
      const { data: msgData, error: msgError } = await client
        .from('crm_omni_messages')
        .insert([{
          conversation_id: conversationId,
          direction: 'outbound',
          sender_type: 'agent',
          sender_id: user.id,
          content,
          content_type: contentType,
          is_internal_note: isInternalNote,
          status: 'sent'
        }])
        .select()
        .single();

      if (msgError) throw msgError;

      // Update conversation
      await client
        .from('crm_omni_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: content.substring(0, 100),
          last_message_direction: 'outbound'
        })
        .eq('id', conversationId);

      setMessages(prev => [...prev, msgData]);
      
      // Call edge function to send to external channel
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation && !isInternalNote) {
        await supabase.functions.invoke('crm-omnichannel', {
          body: {
            action: 'send_message',
            conversationId,
            channel: conversation.channel,
            content,
            contentType
          }
        });
      }

      return msgData;
    } catch (err) {
      console.error('[useOmnichannelHub] sendMessage error:', err);
      toast.error('Error al enviar mensaje');
      return null;
    } finally {
      setIsSending(false);
    }
  }, [user?.id, conversations, client]);

  // === UPDATE CONVERSATION ===
  const updateConversation = useCallback(async (
    conversationId: string,
    updates: Partial<OmniConversation>
  ) => {
    try {
      const { error: updateError } = await client
        .from('crm_omni_conversations')
        .update(updates)
        .eq('id', conversationId);

      if (updateError) throw updateError;

      setConversations(prev => prev.map(c => 
        c.id === conversationId ? { ...c, ...updates } : c
      ));

      if (currentConversation?.id === conversationId) {
        setCurrentConversation(prev => prev ? { ...prev, ...updates } : null);
      }

      toast.success('Conversación actualizada');
      return true;
    } catch (err) {
      console.error('[useOmnichannelHub] updateConversation error:', err);
      toast.error('Error al actualizar');
      return false;
    }
  }, [currentConversation, client]);

  // === ASSIGN CONVERSATION ===
  const assignConversation = useCallback(async (
    conversationId: string,
    agentId: string | null,
    teamId?: string | null
  ) => {
    return updateConversation(conversationId, {
      assigned_agent_id: agentId || undefined,
      assigned_team_id: teamId || undefined
    });
  }, [updateConversation]);

  // === CHANGE STATUS ===
  const changeStatus = useCallback(async (
    conversationId: string,
    status: OmniConversation['status']
  ) => {
    const updates: Partial<OmniConversation> = { status };
    if (status === 'resolved' || status === 'closed') {
      (updates as any).resolved_at = new Date().toISOString();
    }
    return updateConversation(conversationId, updates);
  }, [updateConversation]);

  // === ADD TAG ===
  const addTag = useCallback(async (conversationId: string, tag: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return false;

    const newTags = [...(conversation.tags || []), tag];
    return updateConversation(conversationId, { tags: newTags });
  }, [conversations, updateConversation]);

  // === REMOVE TAG ===
  const removeTag = useCallback(async (conversationId: string, tag: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return false;

    const newTags = (conversation.tags || []).filter(t => t !== tag);
    return updateConversation(conversationId, { tags: newTags });
  }, [conversations, updateConversation]);

  // === FETCH QUICK REPLIES ===
  const fetchQuickReplies = useCallback(async () => {
    try {
      const { data, error: fetchError } = await client
        .from('crm_quick_replies')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (fetchError) throw fetchError;
      setQuickReplies(data || []);
      return data;
    } catch (err) {
      console.error('[useOmnichannelHub] fetchQuickReplies error:', err);
      return [];
    }
  }, [client]);

  // === UPDATE AGENT STATUS ===
  const updateAgentStatus = useCallback(async (status: AgentStatus['status'], message?: string) => {
    if (!user?.id) return false;

    try {
      const { error: upsertError } = await client
        .from('crm_agent_status')
        .upsert({
          agent_id: user.id,
          status,
          status_message: message,
          last_activity_at: new Date().toISOString()
        }, { onConflict: 'agent_id' });

      if (upsertError) throw upsertError;

      setAgentStatus(prev => prev ? { ...prev, status, status_message: message } : null);
      toast.success(`Estado: ${status}`);
      return true;
    } catch (err) {
      console.error('[useOmnichannelHub] updateAgentStatus error:', err);
      return false;
    }
  }, [user?.id, client]);

  // === AI SUGGEST RESPONSE ===
  const suggestResponse = useCallback(async (conversationId: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('crm-omnichannel', {
        body: {
          action: 'suggest_response',
          conversationId,
          messages: messages.slice(-10)
        }
      });

      if (fnError) throw fnError;
      return data?.suggestion || null;
    } catch (err) {
      console.error('[useOmnichannelHub] suggestResponse error:', err);
      return null;
    }
  }, [messages]);

  // === ANALYZE SENTIMENT ===
  const analyzeSentiment = useCallback(async (conversationId: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('crm-omnichannel', {
        body: {
          action: 'analyze_sentiment',
          conversationId,
          messages: messages.filter(m => m.direction === 'inbound').slice(-5)
        }
      });

      if (fnError) throw fnError;

      if (data?.sentiment) {
        await updateConversation(conversationId, {
          sentiment: data.sentiment,
          sentiment_score: data.score
        });
      }

      return data;
    } catch (err) {
      console.error('[useOmnichannelHub] analyzeSentiment error:', err);
      return null;
    }
  }, [messages, updateConversation]);

  // === SETUP REALTIME ===
  useEffect(() => {
    realtimeChannel.current = supabase
      .channel('omnichannel-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'crm_omni_messages' },
        (payload) => {
          const newMessage = payload.new as OmniMessage;
          if (currentConversation?.id === newMessage.conversation_id) {
            setMessages(prev => [...prev, newMessage]);
          }
          // Update conversation preview
          setConversations(prev => prev.map(c => 
            c.id === newMessage.conversation_id
              ? {
                  ...c,
                  last_message_at: newMessage.created_at,
                  last_message_preview: newMessage.content.substring(0, 100),
                  last_message_direction: newMessage.direction,
                  unread_count: newMessage.direction === 'inbound' && c.id !== currentConversation?.id
                    ? (c.unread_count || 0) + 1
                    : c.unread_count
                }
              : c
          ));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_omni_conversations' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setConversations(prev => [payload.new as OmniConversation, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setConversations(prev => prev.map(c => 
              c.id === (payload.new as OmniConversation).id ? payload.new as OmniConversation : c
            ));
          }
        }
      )
      .subscribe();

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current);
      }
    };
  }, [currentConversation?.id]);

  // === INITIAL LOAD ===
  useEffect(() => {
    fetchConversations();
    fetchQuickReplies();
  }, []);

  return {
    // State
    conversations,
    currentConversation,
    messages,
    agentStatus,
    quickReplies,
    isLoading,
    isSending,
    error,
    filters,
    unreadTotal,
    // Actions
    fetchConversations,
    fetchMessages,
    selectConversation,
    sendMessage,
    updateConversation,
    assignConversation,
    changeStatus,
    addTag,
    removeTag,
    setFilters,
    updateAgentStatus,
    suggestResponse,
    analyzeSentiment,
    fetchQuickReplies,
  };
}

export default useOmnichannelHub;
