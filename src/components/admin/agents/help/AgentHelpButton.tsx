/**
 * AgentHelpButton - Botón flotante para abrir el menú de ayuda de un agente
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, X } from 'lucide-react';
import { AgentHelpMenu } from './AgentHelpMenu';
import { type AgentHelpContext } from '@/hooks/admin/agents/useAgentHelpSystem';
import { cn } from '@/lib/utils';

interface AgentHelpButtonProps {
  agentContext: AgentHelpContext;
  variant?: 'floating' | 'inline' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AgentHelpButton({ 
  agentContext, 
  variant = 'inline',
  size = 'md',
  className 
}: AgentHelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  if (variant === 'floating') {
    return (
      <>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
          className={cn("fixed bottom-4 right-4 z-40", className)}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className={cn(
                    sizeClasses[size],
                    "rounded-full shadow-lg hover:shadow-xl transition-shadow"
                  )}
                  onClick={() => setIsOpen(true)}
                >
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {isOpen ? (
                      <X className={iconSizes[size]} />
                    ) : (
                      <HelpCircle className={iconSizes[size]} />
                    )}
                  </motion.div>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Ayuda: {agentContext.agentName}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Pulse Animation */}
          <AnimatePresence>
            {!isOpen && (
              <motion.div
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: 'easeOut'
                }}
                className={cn(
                  "absolute inset-0 rounded-full bg-primary -z-10",
                  sizeClasses[size]
                )}
              />
            )}
          </AnimatePresence>
        </motion.div>

        <AgentHelpMenu
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          agentContext={agentContext}
        />
      </>
    );
  }

  if (variant === 'icon') {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(sizeClasses[size], className)}
                onClick={() => setIsOpen(true)}
              >
                <HelpCircle className={iconSizes[size]} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ayuda: {agentContext.agentName}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <AgentHelpMenu
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          agentContext={agentContext}
        />
      </>
    );
  }

  // Default: inline
  return (
    <>
      <Button
        variant="outline"
        size={size === 'lg' ? 'default' : 'sm'}
        className={cn("gap-2", className)}
        onClick={() => setIsOpen(true)}
      >
        <HelpCircle className={iconSizes[size]} />
        <span>Ayuda</span>
      </Button>

      <AgentHelpMenu
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        agentContext={agentContext}
      />
    </>
  );
}

export default AgentHelpButton;
