import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, Zap, ChevronRight, Star, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickReply {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  category?: string;
  channels?: string[];
  usageCount?: number;
}

interface QuickRepliesPanelProps {
  quickReplies: QuickReply[];
  isVisible: boolean;
  currentChannel?: string;
  onSelectReply: (content: string) => void;
  onClose: () => void;
  className?: string;
}

export function QuickRepliesPanel({
  quickReplies,
  isVisible,
  currentChannel,
  onSelectReply,
  onClose,
  className,
}: QuickRepliesPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    quickReplies.forEach(qr => {
      if (qr.category) cats.add(qr.category);
    });
    return Array.from(cats);
  }, [quickReplies]);

  // Filter replies
  const filteredReplies = useMemo(() => {
    return quickReplies.filter(qr => {
      // Filter by search
      const matchesSearch = !searchTerm || 
        qr.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        qr.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        qr.shortcut.toLowerCase().includes(searchTerm.toLowerCase());

      // Filter by category
      const matchesCategory = !selectedCategory || qr.category === selectedCategory;

      // Filter by channel
      const matchesChannel = !currentChannel || 
        !qr.channels || 
        qr.channels.length === 0 ||
        qr.channels.includes(currentChannel);

      return matchesSearch && matchesCategory && matchesChannel;
    });
  }, [quickReplies, searchTerm, selectedCategory, currentChannel]);

  // Sort by usage
  const sortedReplies = useMemo(() => {
    return [...filteredReplies].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  }, [filteredReplies]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className={cn(
          "absolute bottom-full left-0 right-0 mb-2 z-10",
          "bg-card border rounded-lg shadow-lg overflow-hidden",
          className
        )}
      >
        {/* Header */}
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Respuestas rápidas</span>
              <Badge variant="secondary" className="text-[10px]">
                {filteredReplies.length}
              </Badge>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={onClose}
            >
              ×
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, contenido o atajo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              <Button
                variant={selectedCategory === null ? "secondary" : "ghost"}
                size="sm"
                className="h-6 text-xs"
                onClick={() => setSelectedCategory(null)}
              >
                Todas
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Replies List */}
        <ScrollArea className="max-h-64">
          <div className="p-2 space-y-1">
            {sortedReplies.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No se encontraron respuestas
              </div>
            ) : (
              sortedReplies.map((reply) => (
                <motion.div
                  key={reply.id}
                  whileHover={{ scale: 1.01 }}
                  className={cn(
                    "p-2.5 rounded-lg cursor-pointer transition-colors",
                    "hover:bg-muted/50 group"
                  )}
                  onClick={() => {
                    onSelectReply(reply.content);
                    onClose();
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm">{reply.title}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          /{reply.shortcut}
                        </Badge>
                        {(reply.usageCount || 0) > 10 && (
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {reply.content}
                      </p>
                      {reply.category && (
                        <Badge variant="secondary" className="text-[9px] mt-1">
                          {reply.category}
                        </Badge>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer hint */}
        <div className="p-2 border-t bg-muted/20 text-center">
          <p className="text-[10px] text-muted-foreground">
            Tip: Escribe <span className="font-mono">/atajo</span> en el chat para insertar rápidamente
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default QuickRepliesPanel;
