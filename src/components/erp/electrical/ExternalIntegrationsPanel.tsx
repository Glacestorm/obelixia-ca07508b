/**
 * ExternalIntegrationsPanel - Datadis, indexed prices, market data stubs
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Plug, Zap, BarChart3, Database, Globe, Lock, CheckCircle2, Settings
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: typeof Plug;
  status: 'ready' | 'stub' | 'planned';
  statusLabel: string;
  features: string[];
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'datadis',
    name: 'Datadis',
    description: 'Acceso a datos de consumo real de distribuidoras españolas vía API Datadis.',
    icon: Database,
    status: 'stub',
    statusLabel: 'Preparado (requiere credenciales)',
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
    description: 'Datos de Red Eléctrica: precios regulados, peajes, cargos del sistema.',
    icon: Zap,
    status: 'stub',
    statusLabel: 'Preparado',
    features: [
      'Peajes de acceso actualizados',
      'Cargos del sistema eléctrico',
      'Indicadores de REE',
      'Previsiones de demanda',
    ],
  },
  {
    id: 'cnmc',
    name: 'CNMC - Tarifas reguladas',
    description: 'Datos de la CNMC sobre tarifas reguladas y comercializadoras.',
    icon: Globe,
    status: 'planned',
    statusLabel: 'Planificado',
    features: [
      'Listado oficial de comercializadoras',
      'Tarifas de último recurso',
      'Datos regulatorios actualizados',
    ],
  },
];

export function ExternalIntegrationsPanel() {
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
                    integration.status === 'ready' ? 'default' :
                    integration.status === 'stub' ? 'secondary' : 'outline'
                  }>
                    {integration.status === 'ready' ? <CheckCircle2 className="h-3 w-3 mr-1" /> :
                     integration.status === 'stub' ? <Lock className="h-3 w-3 mr-1" /> :
                     <Settings className="h-3 w-3 mr-1" />}
                    {integration.statusLabel}
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
                {integration.status === 'stub' && (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    <Lock className="h-3.5 w-3.5 mr-1" /> Configurar credenciales
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default ExternalIntegrationsPanel;
