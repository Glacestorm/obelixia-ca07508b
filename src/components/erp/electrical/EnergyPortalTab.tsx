/**
 * EnergyPortalTab - Portal management + iframe preview
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ExternalLink, Copy, Link2, Eye, EyeOff, Shield, RefreshCw, Loader2
} from 'lucide-react';
import { useEnergyClientPortal, PortalToken } from '@/hooks/erp/useEnergyClientPortal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ClientPortalManager } from './ClientPortalManager';

interface Props {
  companyId: string;
}

export function EnergyPortalTab({ companyId }: Props) {
  const { tokens, loading, fetchTokens } = useEnergyClientPortal(companyId);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('tokens');

  const getPortalUrl = (token: string) => `${window.location.origin}/portal-cliente?portal_token=${token}`;

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(getPortalUrl(token));
    toast.success('Enlace copiado');
  };

  const openPortal = (token: string) => {
    window.open(getPortalUrl(token), '_blank', 'noopener,noreferrer');
  };

  const fmtDate = (d: string) => {
    try { return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: es }); } catch { return '—'; }
  };

  const isExpired = (d: string) => new Date(d) < new Date();

  const activeTokens = tokens.filter(t => t.is_active && !isExpired(t.expires_at));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Portal del Cliente</h2>
          <Badge variant="secondary">{activeTokens.length} activo{activeTokens.length !== 1 ? 's' : ''}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchTokens} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tokens" className="text-xs">Accesos generados</TabsTrigger>
          <TabsTrigger value="preview" className="text-xs">Vista previa</TabsTrigger>
        </TabsList>

        <TabsContent value="tokens" className="mt-4 space-y-3">
          {loading ? (
            <div className="py-8 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" /></div>
          ) : activeTokens.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Link2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No hay accesos activos al portal.</p>
                <p className="text-xs text-muted-foreground mt-1">Genera uno desde un expediente.</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {activeTokens.map(t => (
                  <Card key={t.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{t.client_name || 'Sin nombre'}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.client_email || '—'} · Expira: {fmtDate(t.expires_at)}
                            {t.last_accessed_at && ` · Último acceso: ${fmtDate(t.last_accessed_at)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Vista previa" onClick={() => { setPreviewToken(t.token); setActiveTab('preview'); }}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Abrir portal" onClick={() => openPortal(t.token)}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Copiar enlace" onClick={() => copyLink(t.token)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          {previewToken ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Vista previa del portal del cliente (iframe)</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openPortal(previewToken)}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir en nueva pestaña
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setPreviewToken(null)}>
                    <EyeOff className="h-3.5 w-3.5 mr-1" /> Cerrar
                  </Button>
                </div>
              </div>
              <Card className="overflow-hidden">
                <iframe
                  src={getPortalUrl(previewToken)}
                  className="w-full h-[600px] border-0"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                  title="Portal del cliente preview"
                />
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Eye className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Selecciona un acceso activo para previsualizar el portal.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EnergyPortalTab;
