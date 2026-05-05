/**
 * B13.6 — Pipeline tabs for the curated shell.
 *
 * Embeds existing B13 panels via the auth-safe hooks already in place.
 * No DB writes here, no auto-apply.
 */
import React, { Suspense, lazy } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import {
  CuratedAgreementsControlledApplyPanel,
  type CuratedNavTarget,
} from './CuratedAgreementsControlledApplyPanel';

const LazyDocumentIntake = lazy(() =>
  import('../AgreementDocumentIntakePanel').then((m) => ({
    default: m.AgreementDocumentIntakePanel,
  })),
);
const LazyImpactDashboard = lazy(() =>
  import('../impact/AgreementImpactDashboardPanel').then((m) => ({
    default: m.AgreementImpactDashboardPanel,
  })),
);

function PanelFallback() {
  return (
    <div
      className="flex items-center justify-center py-12"
      aria-label="curated-panel-loading"
    >
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function SafePlaceholder({ message }: { message: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-6">
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

export interface CuratedAgreementsPipelineTabsProps {
  onNavigate?: (target: CuratedNavTarget) => void;
  defaultTab?: string;
}

export function CuratedAgreementsPipelineTabs({
  onNavigate,
  defaultTab = 'sources',
}: CuratedAgreementsPipelineTabsProps) {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
        <TabsTrigger value="sources">Fuentes detectadas</TabsTrigger>
        <TabsTrigger value="documents">Documentos pendientes</TabsTrigger>
        <TabsTrigger value="extraction">Extracción</TabsTrigger>
        <TabsTrigger value="review">Revisión humana</TabsTrigger>
        <TabsTrigger value="impact">Impacto económico</TabsTrigger>
        <TabsTrigger value="apply">Aplicación controlada</TabsTrigger>
      </TabsList>

      <TabsContent value="sources" className="mt-4">
        <SafePlaceholder
          message="Source Watcher disponible vía hook/edge B13.1. UI dedicada se conectará en build posterior; mientras tanto las fuentes detectadas se inspeccionan desde el Centro de Convenios."
        />
      </TabsContent>

      <TabsContent value="documents" className="mt-4">
        <Suspense fallback={<PanelFallback />}>
          <LazyDocumentIntake />
        </Suspense>
      </TabsContent>

      <TabsContent value="extraction" className="mt-4">
        <SafePlaceholder
          message="Extraction Runner disponible por hook/edge B13.3A. UI avanzada diferida; los runs ya pueden lanzarse desde el flujo de revisión."
        />
      </TabsContent>

      <TabsContent value="review" className="mt-4">
        <SafePlaceholder
          message="Workbench reutilizable; generalización multi-convenio queda para B13.7. Hoy la revisión humana se realiza por convenio desde Validación humana o desde el Centro de Convenios."
        />
      </TabsContent>

      <TabsContent value="impact" className="mt-4">
        <Suspense fallback={<PanelFallback />}>
          <LazyImpactDashboard />
        </Suspense>
      </TabsContent>

      <TabsContent value="apply" className="mt-4">
        <CuratedAgreementsControlledApplyPanel onNavigate={onNavigate} />
      </TabsContent>
    </Tabs>
  );
}

export default CuratedAgreementsPipelineTabs;