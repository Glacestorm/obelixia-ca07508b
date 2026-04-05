/**
 * UserApprovalPanel — SuperAdmin panel to approve/reject pending users.
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, Clock, Users, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface PendingUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string | null;
  is_approved: boolean;
}

export function UserApprovalPanel() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPendingUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at, is_approved')
        .eq('is_approved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data as PendingUser[]) || []);
    } catch (err) {
      console.error('Error fetching pending users:', err);
      toast.error('Error al cargar usuarios pendientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingUsers();
  }, [fetchPendingUsers]);

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: true } as any)
        .eq('id', userId);

      if (error) throw error;
      
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('Usuari aprovat correctament');
    } catch (err) {
      console.error('Error approving user:', err);
      toast.error('Error al aprovar l\'usuari');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = users.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-base">Aprovació d'Usuaris</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pendingCount} {pendingCount === 1 ? 'usuari pendent' : 'usuaris pendents'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchPendingUsers} disabled={loading} className="h-8 w-8">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Carregant...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <CheckCircle className="h-10 w-10 mx-auto text-green-500/50" />
            <p className="text-sm text-muted-foreground">No hi ha usuaris pendents d'aprovació</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {user.full_name || 'Sense nom'}
                      </p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendent
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    {user.created_at && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Registrat {formatDistanceToNow(new Date(user.created_at), { locale: es, addSuffix: true })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 ml-3">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleApprove(user.id)}
                      disabled={actionLoading === user.id}
                      className="h-8 text-xs"
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      Aprovar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export default UserApprovalPanel;
