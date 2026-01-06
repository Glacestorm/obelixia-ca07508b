// Agent Help Sheet - Combined Help Menu and Chat
import React, { useState, memo, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  MessageCircle, 
  HelpCircle,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { useAgentHelpSystem } from '@/hooks/admin/agents/useAgentHelpSystem';
import { AgentHelpMenu } from './AgentHelpMenu';
import { AgentChatInterface } from './AgentChatInterface';
import { cn } from '@/lib/utils';

interface AgentHelpSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  agentType: 'erp' | 'crm' | 'supervisor' | 'domain';
}

export const AgentHelpSheet = memo(function AgentHelpSheet({
  open,
  onOpenChange,
  agentId,
  agentType,
}: AgentHelpSheetProps) {
  const [activeTab, setActiveTab] = useState<'help' | 'chat'>('help');

  const {
    isLoading,
    error,
    helpConfig,
    learnedKnowledge,
    chatSession,
    loadHelp,
    sendMessage,
    submitFeedback,
    clearChat,
    isRateLimited,
  } = useAgentHelpSystem({ agentId, agentType });

  const handleRefresh = useCallback(() => {
    loadHelp();
  }, [loadHelp]);

  if (!helpConfig) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-lg p-0 flex flex-col"
      >
        <SheetHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <SheetTitle className="text-base">
                Ayuda: {helpConfig.name}
              </SheetTitle>
            </div>
            <div className="flex items-center gap-2">
              {isRateLimited && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Pausado
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isLoading}
                className="h-8 w-8"
              >
                <RefreshCw className={cn(
                  "h-4 w-4",
                  isLoading && "animate-spin"
                )} />
              </Button>
            </div>
          </div>
          <SheetDescription className="text-xs">
            {helpConfig.shortDescription}
          </SheetDescription>
        </SheetHeader>

        {error && (
          <div className="mx-4 mt-2 p-2 rounded bg-destructive/10 text-destructive text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        <Tabs 
          value={activeTab} 
          onValueChange={(v) => setActiveTab(v as 'help' | 'chat')}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-2" style={{ width: 'calc(100% - 2rem)' }}>
            <TabsTrigger value="help" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Documentación
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chat
              {chatSession && chatSession.messages.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {chatSession.messages.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="help" className="flex-1 overflow-hidden mt-0">
            <AgentHelpMenu
              config={helpConfig}
              learnedKnowledge={learnedKnowledge}
              isLoading={isLoading}
              className="h-full"
            />
          </TabsContent>

          <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
            <AgentChatInterface
              config={helpConfig}
              chatSession={chatSession}
              onSendMessage={sendMessage}
              onFeedback={submitFeedback}
              onClearChat={clearChat}
              isLoading={isLoading}
              className="h-full"
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
});

export default AgentHelpSheet;
