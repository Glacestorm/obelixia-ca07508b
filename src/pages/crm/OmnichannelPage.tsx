import React, { useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/layouts';
import { OmnichannelInbox, Conversation, Message } from '@/components/crm/omnichannel';
import { useOmnichannelHub, OmniConversation, OmniMessage } from '@/hooks/crm/omnichannel';
import { Loader2 } from 'lucide-react';

/**
 * Adapter functions to convert between hook types and UI component types
 */
function mapOmniConversationToUI(conv: OmniConversation): Conversation {
  return {
    id: conv.id,
    contact: {
      id: conv.contact_id || conv.id,
      name: conv.contact_name || 'Sin nombre',
      phone: conv.contact_phone,
      email: conv.contact_email,
    },
    channel: conv.channel === 'webchat' ? 'web' : 
             conv.channel === 'telegram' ? 'web' : 
             conv.channel as Conversation['channel'],
    status: conv.status === 'closed' ? 'resolved' : 
            conv.status === 'spam' ? 'archived' : 
            conv.status as Conversation['status'],
    priority: conv.priority,
    assignee: conv.assigned_agent_id ? { 
      id: conv.assigned_agent_id, 
      name: 'Agente' 
    } : undefined,
    lastMessage: conv.last_message_preview ? {
      content: conv.last_message_preview,
      timestamp: conv.last_message_at || conv.updated_at,
      isFromContact: conv.last_message_direction === 'inbound'
    } : undefined,
    unreadCount: conv.unread_count || 0,
    slaDeadline: conv.sla_deadline,
    tags: conv.tags || [],
    companyId: conv.company_id,
    sentimentScore: conv.sentiment_score,
  };
}

function mapOmniMessageToUI(msg: OmniMessage): Message {
  return {
    id: msg.id,
    conversationId: msg.conversation_id,
    content: msg.content,
    timestamp: msg.created_at,
    isFromContact: msg.direction === 'inbound',
    status: msg.status === 'pending' ? 'sent' : msg.status as Message['status'],
    isAutomated: msg.ai_generated || msg.sender_type === 'bot',
  };
}

const OmnichannelPage = () => {
  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    isSending,
    selectConversation,
    sendMessage,
    assignConversation,
    changeStatus,
    addTag,
  } = useOmnichannelHub();

  // Map hook data to UI format
  const uiConversations = useMemo(() => 
    conversations.map(mapOmniConversationToUI),
    [conversations]
  );

  const uiMessages = useMemo(() => 
    messages.map(mapOmniMessageToUI),
    [messages]
  );

  const uiCurrentConversation = useMemo(() => 
    currentConversation ? mapOmniConversationToUI(currentConversation) : undefined,
    [currentConversation]
  );

  // Handlers
  const handleSelectConversation = useCallback((conversation: Conversation) => {
    const omniConv = conversations.find(c => c.id === conversation.id);
    if (omniConv) {
      selectConversation(omniConv);
    }
  }, [conversations, selectConversation]);

  const handleSendMessage = useCallback((conversationId: string, content: string) => {
    sendMessage(conversationId, content);
  }, [sendMessage]);

  const handleAssign = useCallback((conversationId: string, assigneeId: string) => {
    assignConversation(conversationId, assigneeId);
  }, [assignConversation]);

  const handleUpdateStatus = useCallback((conversationId: string, status: Conversation['status']) => {
    const omniStatus = status === 'archived' ? 'closed' : status as OmniConversation['status'];
    changeStatus(conversationId, omniStatus);
  }, [changeStatus]);

  const handleAddTag = useCallback((conversationId: string, tag: string) => {
    addTag(conversationId, tag);
  }, [addTag]);

  return (
    <DashboardLayout title="Inbox Omnicanal">
      <div className="p-4 h-[calc(100vh-4rem)]">
        {isLoading && conversations.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <OmnichannelInbox 
            conversations={uiConversations}
            messages={uiMessages}
            currentConversation={uiCurrentConversation}
            onSelectConversation={handleSelectConversation}
            onSendMessage={handleSendMessage}
            onAssign={handleAssign}
            onUpdateStatus={handleUpdateStatus}
            onAddTag={handleAddTag}
            isLoading={isSending}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default OmnichannelPage;
