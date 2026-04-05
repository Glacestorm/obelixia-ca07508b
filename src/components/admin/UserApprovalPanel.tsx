/**
 * UserApprovalPanel — SuperAdmin panel to manage user approval.
 * Shows pending users and approved users in a tabbed layout.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  CheckCircle, XCircle, Clock, Users, RefreshCw,
  ShieldCheck, Search, UserX, UserCheck
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProfileUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string | null;
  is_approved: boolean;
}

export function UserApprovalPanel() {
  const [pendingUsers, setPendingUsers] = useState<ProfileUser[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<ProfileUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAllUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, email, full_name, created_at, is_approved')
          .eq('is_approved', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, email, full_name, created_at, is_approved')
          .eq('is_approved', true)
          .order('created_at', { ascending: false })
          .limit(200),
      ]);

      if (pendingRes.error) throw pendingRes.error;
      if (approvedRes.error) throw approvedRes.error;

      setPendingUsers((pendingRes.data as ProfileUser[]) || []);
      setApprovedUsers((approvedRes.data as ProfileUser[]) || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: true } as any)
        .eq('id', userId);

      if (error) throw error;

      const user = pendingUsers.find(u => u.id === userId);
      if (user) {
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
        setApprovedUsers(prev => [{ ...user, is_approved: true }, ...prev]);
      }
      toast.success('Usuario aprobado correctamente');
    } catch (err) {
      console.error('Error approving user:', err);
      toast.error('Error al aprobar el usuario');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: false } as any)
        .eq('id', userId);

      if (error) throw error;

      const user = approvedUsers.find(u => u.id === userId);
      if (user) {
        setApprovedUsers(prev => prev.filter(u => u.id !== userId));
        setPendingUsers(prev => [{ ...user, is_approved: false }, ...prev]);
      }
      toast.success('Acceso revocado correctamente');
    } catch (err) {
      console.error('Error revoking user:', err);
      toast.error('Error al revocar acceso');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredApproved = useMemo(() => {
    if (!searchQuery.trim()) return approvedUsers;
    const q = searchQuery.toLowerCase();
    return approvedUsers.filter(
      u => u.email?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q)
    );
  }, [approvedUsers, searchQuery]);

  const pendingCount = pendingUsers.length;
  const approvedCount = approvedUsers.length;

  const renderUserRow = (user: ProfileUser, type: 'pending' | 'approved') => (
    <div
      key={user.id}
      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">
            {user.full_name || 'Sin nombre'}
          </p>
          {type === 'pending' ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 border-amber-500/40 text-amber-600 dark:text-amber-400">
              <Clock className="h-3 w-3 mr-1" />
              Pendiente
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-3 w-3 mr-1" />
              Activo
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        {user.created_at && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Registrado {formatDistanceToNow(new Date(user.created_at), { locale: es, addSuffix: true })}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 ml-3">
        {type === 'pending' ? (
          <Button
            size="sm"
            variant="default"
            onClick={() => handleApprove(user.id)}
            disabled={actionLoading === user.id}
            className="h-8 text-xs"
          >
            <UserCheck className="h-3.5 w-3.5 mr-1" />
            Aprobar
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleRevoke(user.id)}
            disabled={actionLoading === user.id}
            className="h-8 text-xs text-destructive hover:text-destructive"
          >
            <UserX className="h-3.5 w-3.5 mr-1" />
            Revocar
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-base">Gestión de Usuarios</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pendingCount} pendientes · {approvedCount} autorizados
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchAllUsers} disabled={loading} className="h-8 w-8">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Cargando...</div>
        ) : (
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="pending" className="text-xs gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Pendientes
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 min-w-5 text-[10px] px-1.5">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved" className="text-xs gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Autorizados
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-[10px] px-1.5">
                  {approvedCount}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-0">
              {pendingUsers.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <CheckCircle className="h-10 w-10 mx-auto text-emerald-500/50" />
                  <p className="text-sm text-muted-foreground">No hay usuarios pendientes de aprobación</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-2">
                    {pendingUsers.map(u => renderUserRow(u, 'pending'))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="approved" className="mt-0 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              {filteredApproved.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'Sin resultados' : 'No hay usuarios autorizados'}
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[450px]">
                  <div className="space-y-2">
                    {filteredApproved.map(u => renderUserRow(u, 'approved'))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

export default UserApprovalPanel;
