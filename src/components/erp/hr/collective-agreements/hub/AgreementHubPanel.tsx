/**
 * B12.2 — Centro de Convenios.
 *
 * Read-only umbrella panel. Embeds existing technical panels in tabs and
 * adds a unified search. NEVER imports payroll bridge, resolver,
 * normalizer, payroll engine, payslip engine or safety gate. NEVER
 * mutates registry flags or pilot allow-list.
 */
import { lazy, Suspense, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles } from 'lucide-react';
import {
  useAgreementUnifiedSearch,
  type UnifiedAgreementRow,
} from '@/hooks/erp/hr/useAgreementUnifiedSearch';
import { AuthRequiredCard } from '../_shared/AuthRequiredCard';
import AgreementUnifiedSearch from './AgreementUnifiedSearch';
import AgreementUnifiedResultsTable from './AgreementUnifiedResultsTable';
import AgreementUnifiedDetailDrawer from './AgreementUnifiedDetailDrawer';
import AgreementMissingCandidateGuide from './AgreementMissingCandidateGuide';

// Lazy embeds of existing technical panels — kept as their own modules to
// avoid duplicating logic. The Hub is purely a navigation surface.
const RegistryMasterPanel = lazy(
  () => import('../registry-master/RegistryMasterPanel'),
);
const RegistryValidationLauncher = lazy(
  () => import('../registry-master/RegistryValidationLauncher'),
);
const CompanyAgreementRegistryMappingPanel = lazy(
  () => import('../mappings/CompanyAgreementRegistryMappingPanel'),
);
const RuntimeApplyRequestPanel = lazy(
  () => import('../runtime-apply/RuntimeApplyRequestPanel'),
);
const RegistryPilotCandidateDiscoveryPanel = lazy(
  () => import('../pilot-monitor/RegistryPilotCandidateDiscoveryPanel'),
);
const RegistryPilotMonitorPanel = lazy(
  () => import('../pilot-monitor/RegistryPilotMonitorPanel'),
);

interface Props {
  companyId?: string;
}

function PanelFallback() {
  return <div className="text-sm text-muted-foreground py-4">Cargando…</div>;
}

export function AgreementHubPanel({ companyId }: Props) {
  const { loading, results, authRequired, search } = useAgreementUnifiedSearch();
  const [selected, setSelected] = useState<UnifiedAgreementRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  return (
    <div className="space-y-4" data-testid="agreement-hub-panel">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Centro de Convenios
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Vista unificada de convenios colectivos. Busca por texto, código, CNAE o ámbito y
            consulta su estado en la fuente operativa y en el Registro Maestro. Esta pantalla es de
            solo lectura: las acciones operativas siguen disponibles en sus pestañas técnicas.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="search" className="w-full">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="search">Buscador</TabsTrigger>
              <TabsTrigger value="operative">Operativos</TabsTrigger>
              <TabsTrigger value="registry">Registry</TabsTrigger>
              <TabsTrigger value="validation">Validación</TabsTrigger>
              <TabsTrigger value="mapping">Mapping</TabsTrigger>
              <TabsTrigger value="runtime">Runtime</TabsTrigger>
              <TabsTrigger value="pilot">Piloto</TabsTrigger>
              <TabsTrigger value="missing">No encontrado</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-4 mt-4">
              <AgreementUnifiedSearch
                loading={loading}
                onSearch={(f) => {
                  setHasSearched(true);
                  void search(f);
                }}
              />
              {authRequired ? (
                <AuthRequiredCard
                  title="Sesión requerida para buscar"
                  message="Inicia sesión con un usuario autorizado para consultar convenios operativos y del Registro Maestro."
                />
              ) : hasSearched ? (
                <AgreementUnifiedResultsTable
                  rows={results}
                  loading={loading}
                  onSelect={(row) => {
                    setSelected(row);
                    setDrawerOpen(true);
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="py-6 text-sm text-muted-foreground">
                    Introduce un criterio y pulsa "Buscar".
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="operative" className="mt-4">
              <Card>
                <CardContent className="py-6 text-sm text-muted-foreground">
                  La gestión operativa de convenios sigue disponible en el módulo "Convenios
                  Colectivos" del menú RRHH. Esta pestaña es un acceso informativo.
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="registry" className="mt-4">
              <Suspense fallback={<PanelFallback />}>
                <RegistryMasterPanel />
              </Suspense>
            </TabsContent>

            <TabsContent value="validation" className="mt-4">
              <Suspense fallback={<PanelFallback />}>
                <RegistryValidationLauncher />
              </Suspense>
            </TabsContent>

            <TabsContent value="mapping" className="mt-4">
              {companyId ? (
                <Suspense fallback={<PanelFallback />}>
                  <CompanyAgreementRegistryMappingPanel companyId={companyId} />
                </Suspense>
              ) : (
                <Card>
                  <CardContent className="py-6 text-sm text-muted-foreground">
                    Selecciona una empresa para ver el mapping.
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="runtime" className="mt-4">
              {companyId ? (
                <Suspense fallback={<PanelFallback />}>
                  <RuntimeApplyRequestPanel companyId={companyId} />
                </Suspense>
              ) : (
                <Card>
                  <CardContent className="py-6 text-sm text-muted-foreground">
                    Selecciona una empresa para ver runtime apply.
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="pilot" className="mt-4 space-y-4">
              <Suspense fallback={<PanelFallback />}>
                <RegistryPilotCandidateDiscoveryPanel />
              </Suspense>
              <Suspense fallback={<PanelFallback />}>
                <RegistryPilotMonitorPanel />
              </Suspense>
            </TabsContent>

            <TabsContent value="missing" className="mt-4">
              <AgreementMissingCandidateGuide />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AgreementUnifiedDetailDrawer
        row={selected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}

export default AgreementHubPanel;