/**
 * ExternalIntegrationsPanel - Datadis, indexed prices, market data with credential config
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Plug, Zap, BarChart3, Database, Globe, Lock, CheckCircle2, Settings, Loader2, TestTube2, Flame
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: typeof Plug;
  status: 'ready' | 'stub' | 'planned';
  statusLabel: string;
  features: string[];
  configurable: boolean;
  fields?: { key: string; label: string; type: string; placeholder: string }[];
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'datadis',
    name: 'Datadis',
    description: 'Acceso a datos de consumo real de distribuidoras españolas vía API Datadis.',
    icon: Database,
    status: 'stub',
    statusLabel: 'Preparado (requiere credenciales)',
    configurable: true,
    fields: [
      { key: 'username', label: 'Usuario Datadis', type: 'text', placeholder: 'tu-usuario@email.com' },
      { key: 'password', label: 'Contraseña', type: 'password', placeholder: '••••••••' },
      { key: 'nif', label: 'NIF/CIF autorizado', type: 'text', placeholder: 'B12345678' },
    ],
    features: [
      'Descarga automática de consumo horario',
      'Validación de CUPS con datos reales',
      'Histórico de potencias maximetradas',
      'Sincronización automática mensual',
    ],
  },
  {
    id: 'omie',
    name: 'OMIE - Precios Indexados',
    description: 'Precios horarios del mercado mayorista español (OMIE/PVPC).',
    icon: BarChart3,
    status: 'ready',
    statusLabel: 'Activo',
    configurable: false,
    features: [
      'Precios horarios OMIE',
      'PVPC con peajes y cargos',
      'Histórico de precios',
      'Simulación con indexados reales',
    ],
  },
  {
    id: 'esios',
    name: 'e·sios REE',
    description: 'Datos de Red Eléctrica: precios PVPC horarios, peajes, cargos del sistema. Token configurado y operativo.',
    icon: Zap,
    status: 'ready',
    statusLabel: 'Activo — datos reales',
    configurable: false,
    features: [
      'Peajes de acceso actualizados',
      'Cargos del sistema eléctrico',
      'Indicadores de REE',
      'Previsiones de demanda',
    ],
  },
  {
    id: 'mibgas',
    name: 'MIBGAS - Gas Natural',
    description: 'Precios reales del mercado ibérico del gas via scraping Firecrawl. Day Ahead, futuros y índices PVB.',
    icon: Flame,
    status: 'ready',
    statusLabel: 'Activo — datos reales',
    configurable: false,
    features: [
      'Precios PVB Day Ahead en tiempo real',
      'Futuros trimestrales, semestrales y anuales',
      'Índices LPI y API Day Ahead',
      'Comparativa ES vs PT',
    ],
  },
  {
    id: 'cnmc',
    name: 'CNMC - Tarifas reguladas',
    description: 'Datos de la CNMC sobre tarifas reguladas y comercializadoras.',
    icon: Globe,
    status: 'planned',
    statusLabel: 'Planificado',
    configurable: false,
    features: [
      'Listado oficial de comercializadoras',
      'Tarifas de último recurso',
      'Datos regulatorios actualizados',
    ],
  },
  {
    id: 'datadis',
    name: 'Datadis',
    description: 'Acceso a datos de consumo real de distribuidoras españolas vía API Datadis.',
    icon: Database,
    status: 'stub',
    statusLabel: 'Preparado (requiere credenciales)',
    configurable: true,
    fields: [
      { key: 'username', label: 'Usuario Datadis', type: 'text', placeholder: 'tu-usuario@email.com' },
      { key: 'password', label: 'Contraseña', type: 'password', placeholder: '••••••••' },
      { key: 'nif', label: 'NIF/CIF autorizado', type: 'text', placeholder: 'B12345678' },
    ],
    features: [
      'Descarga automática de consumo horario',
      'Validación de CUPS con datos reales',
      'Histórico de potencias maximetradas',
      'Sincronización automática mensual',
    ],
  },
];

export function ExternalIntegrationsPanel() {
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [configured, setConfigured] = useState<Set<string>>(new Set());

  const currentIntegration = INTEGRATIONS.find(i => i.id === configuring);

  const handleOpenConfig = (integrationId: string) => {
    setFormData({});
    setConfiguring(integrationId);
  };

  const handleSaveCredentials = async () => {
    if (!currentIntegration) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('external-integrations', {
        body: { action: 'connect', provider: currentIntegration.id, config: formData },
      });
      if (error) throw error;
      if (data?.success) {
        setConfigured(prev => new Set([...prev, currentIntegration.id]));
        toast.success(`Credenciales de ${currentIntegration.name} guardadas`);
        setConfiguring(null);
      }
    } catch (err) {
      toast.error('Error al guardar credenciales');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (integrationId: string) => {
    setTesting(integrationId);
    try {
      const { data, error } = await supabase.functions.invoke('external-integrations', {
        body: { action: 'check_health', integrationId },
      });
      if (error) throw error;
      if (data?.success) {
        const health = data.health?.[0];
        toast.success(`${integrationId}: Conexión OK · Latencia ${health?.latency_ms || '?'}ms`);
      }
    } catch {
      toast.error('Error al probar la conexión');
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Plug className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Integraciones externas</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Conectores preparados para ingestión automática de datos del mercado eléctrico español.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INTEGRATIONS.map(integration => {
          const Icon = integration.icon;
          const isConfigured = configured.has(integration.id);
          const effectiveStatus = isConfigured ? 'ready' : integration.status;
          const effectiveLabel = isConfigured ? 'Configurado' : integration.statusLabel;

          return (
            <Card key={integration.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{integration.name}</CardTitle>
                  </div>
                  <Badge variant={
                    effectiveStatus === 'ready' ? 'default' :
                    effectiveStatus === 'stub' ? 'secondary' : 'outline'
                  }>
                    {effectiveStatus === 'ready' ? <CheckCircle2 className="h-3 w-3 mr-1" /> :
                     effectiveStatus === 'stub' ? <Lock className="h-3 w-3 mr-1" /> :
                     <Settings className="h-3 w-3 mr-1" />}
                    {effectiveLabel}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{integration.description}</p>
                <Separator />
                <ul className="space-y-1">
                  {integration.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  {integration.configurable && (
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenConfig(integration.id)}>
                      <Settings className="h-3.5 w-3.5 mr-1" /> Configurar credenciales
                    </Button>
                  )}
                  {(effectiveStatus === 'ready' || isConfigured) && (
                    <Button variant="ghost" size="sm" onClick={() => handleTestConnection(integration.id)} disabled={testing === integration.id}>
                      {testing === integration.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TestTube2 className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Credential config dialog */}
      <Dialog open={!!configuring} onOpenChange={(open) => !open && setConfiguring(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Configurar {currentIntegration?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {currentIntegration?.fields?.map(field => (
              <div key={field.key} className="grid gap-2">
                <Label className="text-xs">{field.label}</Label>
                <Input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formData[field.key] || ''}
                  onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Las credenciales se almacenan cifradas y solo se usan para las sincronizaciones automáticas.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfiguring(null)}>Cancelar</Button>
            <Button onClick={handleSaveCredentials} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Guardar credenciales
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ExternalIntegrationsPanel;
