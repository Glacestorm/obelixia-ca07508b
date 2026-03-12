/**
 * HRAdminRequestComments — Comment list + input with internal toggle
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Lock, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { type AdminRequestComment } from '@/hooks/admin/hr/useAdminPortal';

interface Props {
  comments: AdminRequestComment[];
  onAddComment: (content: string, isInternal: boolean) => Promise<boolean>;
}

export function HRAdminRequestComments({ comments, onAddComment }: Props) {
  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!content.trim()) return;
    setSending(true);
    const ok = await onAddComment(content.trim(), isInternal);
    if (ok) setContent('');
    setSending(false);
  };

  return (
    <div className="space-y-4">
      {/* Comment list */}
      {comments.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground text-sm">
          <MessageSquare className="h-6 w-6 mx-auto mb-1 opacity-40" />
          Sin comentarios
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map(c => (
            <div key={c.id} className={`p-3 rounded-lg border ${c.is_internal ? 'bg-amber-500/5 border-amber-500/20' : 'bg-card'}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{c.author_name}</span>
                  {c.is_internal && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-700 border-amber-500/30">
                      <Lock className="h-2.5 w-2.5 mr-0.5" /> Interno
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: es })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{c.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="space-y-2 pt-2 border-t">
        <Textarea
          placeholder="Escribe un comentario..."
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={2}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch checked={isInternal} onCheckedChange={setIsInternal} id="internal-toggle" />
            <Label htmlFor="internal-toggle" className="text-xs flex items-center gap-1 cursor-pointer">
              {isInternal ? <Lock className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {isInternal ? 'Nota interna' : 'Visible'}
            </Label>
          </div>
          <Button size="sm" onClick={handleSend} disabled={!content.trim() || sending} className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
