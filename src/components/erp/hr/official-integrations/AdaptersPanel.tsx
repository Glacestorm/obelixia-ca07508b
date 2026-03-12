/**
 * AdaptersPanel — Conectores oficiales registrados por país
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, Globe, Plug } from 'lucide-react';
import type { IntegrationAdapter } from '@/hooks/erp/hr/useOfficialIntegrationsHub';

interface Props {
  adapters: IntegrationAdapter[];
  onToggle: (id: string, active: boolean) => void;
  onRefresh: () => void;
}

const COUNTRY_LABELS: Record<string, string> = { ES: '🇪🇸 España', FR: '🇫🇷 Francia', PT: '🇵🇹 Portugal', DE: '🇩🇪 Alemania', UK: '🇬🇧 Reino Unido' };
const TYPE_COLORS: Record<string, string> = {
  social_security: 'bg-blue-500/10 text-blue-600',
  labor: 'bg-green-500/10 text-green-600',
  tax: 'bg-amber-500/10 text-amber-600',
  prevention: 'bg-red-500/10 text-red-600',
};

export function AdaptersPanel({ adapters, onToggle, onRefresh }: Props) {
  const grouped = adapters.reduce<Record<string, IntegrationAdapter[]>>((acc, a) => {
    (acc[a.country_code] = acc[a.country_code] || []).push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Plug className="h-5 w-5 text-primary" /> Conectores oficiales
        </h3>
        <Button variant="outline" size="sm" onClick={onRefresh}><RefreshCw className="h-4 w-4 mr-1.5" /> Actualizar</Button>
      </div>

      {Object.entries(grouped).map(([country, list]) => (
        <Card key={country}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4" /> {COUNTRY_LABELS[country] || country}
              <Badge variant="outline" className="text-[10px] ml-auto">{list.length} conectores</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {list.map(adapter => (
              <div key={adapter.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`px-2 py-1 rounded text-[10px] font-medium ${TYPE_COLORS[adapter.adapter_type] || 'bg-muted'}`}>
                    {adapter.adapter_type}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{adapter.adapter_name}</p>
                    <p className="text-xs text-muted-foreground">{adapter.system_name}</p>
                    {(adapter.config as any)?.description && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{(adapter.config as any).description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {adapter.last_execution_at && (
                    <span className="text-[10px] text-muted-foreground">
                      Último: {new Date(adapter.last_execution_at).toLocaleDateString('es-ES')}
                    </span>
                  )}
                  <Badge variant={adapter.status === 'configured' ? 'secondary' : 'outline'} className="text-[10px]">{adapter.status}</Badge>
                  <Switch checked={adapter.is_active} onCheckedChange={(v) => onToggle(adapter.id, v)} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {Object.keys(grouped).length === 0 && (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No hay conectores registrados</CardContent></Card>
      )}
    </div>
  );
}
