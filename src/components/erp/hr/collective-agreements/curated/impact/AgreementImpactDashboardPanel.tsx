/**
 * B13.5C — Agreement Impact Dashboard panel.
 *
 * Read-only UI over `useAgreementImpactPreviews`. Strict rules:
 *  - No CTAs to apply payroll, activate agreements, or generate
 *    CRA/SILTRA/SEPA/accounting artifacts.
 *  - No `.from()` writes from this UI tree.
 *  - All actions go through the auth-safe hook.
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, RefreshCw } from 'lucide-react';
import { useAgreementImpactPreviews, type ImpactPreviewRow } from '@/hooks/erp/hr/useAgreementImpactPreviews';
import { AgreementImpactNoApplyBanner } from './AgreementImpactNoApplyBanner';
import { AgreementImpactSummaryCards } from './AgreementImpactSummaryCards';
import { AgreementImpactScopeList } from './AgreementImpactScopeList';
import { AgreementImpactPreviewTable } from './AgreementImpactPreviewTable';
import { AgreementImpactComputeDialog } from './AgreementImpactComputeDialog';
import { AgreementImpactEmployeeDetailDrawer } from './AgreementImpactEmployeeDetailDrawer';
import { AgreementImpactExportPanel } from './AgreementImpactExportPanel';

interface Filters {
  agreement_id?: string;
  version_id?: string;
  company_id?: string;
  employee_id?: string;
  affected?: boolean;
  blocked?: boolean;
}

export function AgreementImpactDashboardPanel() {
  const hook = useAgreementImpactPreviews();
  const [filters, setFilters] = useState<Filters>({});
  const [computeOpen, setComputeOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<ImpactPreviewRow | null>(null);

  useEffect(() => {
    void hook.refreshScopes(filters);
    void hook.refreshPreviews(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = () => {
    void hook.refreshScopes(filters);
    void hook.refreshPreviews(filters);
  };

  const onMarkStale = async (row: ImpactPreviewRow) => {
    await hook.markPreviewStale({
      preview_id: row.id,
      company_id: row.company_id,
      reason: 'manual_ui_mark_stale',
    });
    onRefresh();
  };

  const onView = (row: ImpactPreviewRow) => {
    setSelected(row);
    setDetailOpen(true);
  };

  const filteredPreviews = useMemo(() => hook.previews, [hook.previews]);

  if (hook.authRequired) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" /> Impacto económico de convenios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Necesitas iniciar sesión para consultar previews de impacto.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="agreement-impact-dashboard">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Impacto económico de convenios curados</CardTitle>
          <div className="flex items-center gap-2">
            <AgreementImpactExportPanel previews={filteredPreviews} />
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={hook.isLoading}>
              <RefreshCw className={`mr-1 h-4 w-4 ${hook.isLoading ? 'animate-spin' : ''}`} />
              Refrescar
            </Button>
            <Button size="sm" onClick={() => setComputeOpen(true)}>
              Calcular preview
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <AgreementImpactNoApplyBanner />

        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
          <div>
            <Label className="text-xs">agreement_id</Label>
            <Input
              value={filters.agreement_id ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, agreement_id: e.target.value || undefined }))}
            />
          </div>
          <div>
            <Label className="text-xs">version_id</Label>
            <Input
              value={filters.version_id ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, version_id: e.target.value || undefined }))}
            />
          </div>
          <div>
            <Label className="text-xs">company_id</Label>
            <Input
              value={filters.company_id ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, company_id: e.target.value || undefined }))}
            />
          </div>
          <div>
            <Label className="text-xs">employee_id</Label>
            <Input
              value={filters.employee_id ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, employee_id: e.target.value || undefined }))}
            />
          </div>
          <div className="flex items-end gap-1">
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              Aplicar
            </Button>
          </div>
        </div>

        <AgreementImpactSummaryCards scopes={hook.scopes} previews={filteredPreviews} />

        <div>
          <h3 className="mb-2 text-sm font-medium">Affected scopes</h3>
          <AgreementImpactScopeList scopes={hook.scopes} />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Previews</h3>
          <AgreementImpactPreviewTable
            previews={filteredPreviews}
            onView={onView}
            onMarkStale={onMarkStale}
          />
        </div>

        <AgreementImpactComputeDialog
          open={computeOpen}
          onOpenChange={setComputeOpen}
          hook={hook}
          defaultAgreementId={filters.agreement_id}
          defaultVersionId={filters.version_id}
          defaultCompanyId={filters.company_id}
        />
        <AgreementImpactEmployeeDetailDrawer
          open={detailOpen}
          onOpenChange={setDetailOpen}
          preview={selected}
        />
      </CardContent>
    </Card>
  );
}

export default AgreementImpactDashboardPanel;