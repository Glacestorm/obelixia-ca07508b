import React, { useCallback, useMemo, useState } from 'react';
import { DashboardLayout } from '@/layouts';
import { 
  OmnichannelInbox, 
  Conversation, 
  Message, 
  AgentStatusPanel,
  AISuggestionPanel,
  QuickRepliesPanel 
} from '@/components/crm/omnichannel';
import { useOmnichannelHub, OmniConversation, OmniMessage } from '@/hooks/crm/omnichannel';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Settings } from 'lucide-react';

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
  const { user } = useAuth();
  const [showAISuggestion, setShowAISuggestion] = useState(false);
  const [showAgentPanel, setShowAgentPanel] = useState(true);

  const {
    conversations,
    currentConversation,
    messages,
    agentStatus,
    quickReplies,
    isLoading,
    isSending,
    selectConversation,
    sendMessage,
    assignConversation,
    changeStatus,
    addTag,
    updateAgentStatus,
    suggestResponse,
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

  // Map quick replies to simple format
  const mappedQuickReplies = useMemo(() => 
    quickReplies.map(qr => ({
      id: qr.id,
      shortcut: qr.shortcut,
      title: qr.title,
      content: qr.content,
      category: qr.category,
      channels: qr.channels,
    })),
    [quickReplies]
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

  const handleAgentStatusChange = useCallback((status: 'online' | 'away' | 'busy' | 'offline', message?: string) => {
    updateAgentStatus(status, message);
  }, [updateAgentStatus]);

  const handleSuggestResponse = useCallback(async () => {
    if (!currentConversation) return null;
    return suggestResponse(currentConversation.id);
  }, [currentConversation, suggestResponse]);

  const handleApplySuggestion = useCallback((suggestion: string) => {
    if (currentConversation) {
      sendMessage(currentConversation.id, suggestion);
    }
  }, [currentConversation, sendMessage]);

  return (
    <DashboardLayout title="Inbox Omnicanal">
      <div className="p-4 h-[calc(100vh-4rem)] flex gap-4">
        {/* Main Inbox */}
        <div className="flex-1 min-w-0">
          {isLoading && conversations.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="relative h-full">
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

              {/* Floating AI Button */}
              {currentConversation && (
                <div className="absolute bottom-20 right-8">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 shadow-lg bg-background"
                    onClick={() => setShowAISuggestion(!showAISuggestion)}
                  >
                    <Sparkles className="h-4 w-4" />
                    Sugerencia IA
                  </Button>
                </div>
              )}

              {/* AI Suggestion Panel */}
              {currentConversation && (
                <div className="absolute bottom-24 right-8 w-96">
                  <AISuggestionPanel
                    conversationId={currentConversation.id}
                    isVisible={showAISuggestion}
                    onSuggest={handleSuggestResponse}
                    onApplySuggestion={handleApplySuggestion}
                    onClose={() => setShowAISuggestion(false)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Agent Status Panel (collapsible) */}
        {showAgentPanel && (
          <div className="flex-shrink-0">
            <AgentStatusPanel
              agentName={user?.email?.split('@')[0] || 'Agente'}
              currentStatus={agentStatus?.status || 'online'}
              statusMessage={agentStatus?.status_message}
              currentChatCount={agentStatus?.current_chat_count || conversations.filter(c => c.status === 'open').length}
              maxChats={agentStatus?.max_chats || 10}
              totalHandledToday={agentStatus?.total_handled_today || 0}
              avgResponseTime={agentStatus?.avg_response_time_today}
              skills={agentStatus?.skills || []}
              channels={agentStatus?.channels || ['whatsapp', 'webchat', 'email']}
              onStatusChange={handleAgentStatusChange}
            />
          </div>
        )}

        {/* Toggle Agent Panel Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-20 right-4 h-8 w-8"
          onClick={() => setShowAgentPanel(!showAgentPanel)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default OmnichannelPage;
