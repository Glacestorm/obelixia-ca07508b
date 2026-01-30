/**
 * ActiveHelpBubble - Globo flotante de ayuda activa
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  XCircle,
  Lightbulb,
  Info,
  X,
  Volume2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { HelpBubble } from '@/hooks/erp/useERPActiveHelp';

interface ActiveHelpBubbleProps {
  bubble: HelpBubble;
  onDismiss: (id: string) => void;
  onSpeak?: (text: string) => void;
  className?: string;
}

export function ActiveHelpBubble({
  bubble,
  onDismiss,
  onSpeak,
  className
}: ActiveHelpBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getIcon = () => {
    switch (bubble.type) {
      case 'error':
        return <XCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'suggestion':
        return <Lightbulb className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getColors = () => {
    switch (bubble.type) {
      case 'error':
        return 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200';
      case 'suggestion':
        return 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
      default:
        return 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200';
    }
  };

  const getIconColors = () => {
    switch (bubble.type) {
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-amber-600 dark:text-amber-400';
      case 'suggestion':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-slate-600 dark:text-slate-400';
    }
  };

  const handleSpeak = () => {
    if (onSpeak) {
      const fullText = `${bubble.title}. ${bubble.message}${bubble.recommendation ? `. Recomendación: ${bubble.recommendation}` : ''}`;
      onSpeak(fullText);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className={cn(
        "rounded-lg border-2 shadow-lg max-w-sm overflow-hidden",
        getColors(),
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className={cn("flex-shrink-0", getIconColors())}>
            {getIcon()}
          </div>
          <span className="font-medium text-sm">{bubble.title}</span>
        </div>
        <div className="flex items-center gap-1">
          {onSpeak && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                handleSpeak();
              }}
            >
              <Volume2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(bubble.id);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 opacity-50" />
          ) : (
            <ChevronDown className="h-4 w-4 opacity-50" />
          )}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 pb-3"
          >
            <p className="text-sm opacity-90">{bubble.message}</p>
            {bubble.recommendation && (
              <div className="mt-2 pt-2 border-t border-current/10">
                <p className="text-xs font-medium opacity-70">Recomendación:</p>
                <p className="text-sm">{bubble.recommendation}</p>
              </div>
            )}
            {bubble.accountCode && (
              <div className="mt-2 inline-flex px-2 py-0.5 bg-black/5 dark:bg-white/5 rounded text-xs">
                Cuenta: {bubble.accountCode}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default ActiveHelpBubble;
