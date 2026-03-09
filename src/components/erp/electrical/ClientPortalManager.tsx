/**
 * ClientPortalManager - Generate and manage client portal access tokens
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Link2, ExternalLink, Copy, XCircle, Plus, CheckCircle2, Loader2, Shield, Eye
} from 'lucide-react';
import { useEnergyClientPortal, PortalToken } from '@/hooks/erp/useEnergyClientPortal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  caseId: string;
  companyId: string;
}

export function ClientPortalManager({ caseId, companyId }: Props) {
  const { tokens, loading, createToken, revokeToken } = useEnergyClientPortal(companyId, caseId);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ client_name: '', client_email: '', expires_days: '30' });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    const result = await createToken({
      case_id: caseId,
      client_name: form.client_name || undefined,
      client_email: form.client_email || undefined,
      expires_days: parseInt(form.expires_days) || 30,
    });
    setCreating(false);
    if (result) {
      setShowCreate(false);
      setForm({ client_name: '', client_email: '', expires_days: '30' });
    }
  };

  const getPortalUrl = (token: string) => `${window.location.origin}/portal-cliente?portal_token=${token}`;

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(getPortalUrl(token));
    toast.success('Enlace copiado al portapapeles');
  };

  const openPortal = (token: string) => {
    window.open(getPortalUrl(token), '_blank', 'noopener,noreferrer');
  };

  const fmtDate = (d: string) => {
    try { return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: es }); } catch { return '—'; }
  };

  const isExpired = (d: string) => new Date(d) < new Date();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> Portal del cliente
        </h4>
        <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Generar acceso
        </Button>
      </div>

      {tokens.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center">
            <Link2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No hay accesos generados para este expediente.</p>
          </CardContent>
        </Card>
      ) : (
        tokens.map(t => {
          const expired = isExpired(t.expires_at);
          const inactive = !t.is_active;
          return (
            <Card key={t.id} className={cn((expired || inactive) && "opacity-60")}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{t.client_name || 'Sin nombre'}</span>
                      {t.is_active && !expired ? (
                        <Badge variant="default" className="text-[10px]">Activo</Badge>
                      ) : expired ? (
                        <Badge variant="destructive" className="text-[10px]">Expirado</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Revocado</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t.client_email || '—'} · Expira: {fmtDate(t.expires_at)}
                      {t.last_accessed_at && ` · Último acceso: ${fmtDate(t.last_accessed_at)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {t.is_active && !expired && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyLink(t.token)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => revokeToken(t.id)}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Generar acceso al portal</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label className="text-xs">Nombre del cliente</Label>
              <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Ej: Juan García" />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Email del cliente</Label>
              <Input type="email" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} placeholder="cliente@ejemplo.com" />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Días de validez</Label>
              <Input type="number" value={form.expires_days} onChange={e => setForm(f => ({ ...f, expires_days: e.target.value }))} min="1" max="365" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Link2 className="h-4 w-4 mr-1" />}
              Generar enlace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ClientPortalManager;
