/**
 * B13.6 — Curated Agreements shell panel.
 *
 * Visual hub that wires together B13.1–B13.5 pieces and a controlled
 * apply tab that ONLY routes to existing B10C/B10D flows. No payroll
 * application, no mapping/runtime auto-creation, no flag mutation.
 */
import { Card, CardContent } from '@/components/ui/card';
import { CuratedAgreementsHeader } from './CuratedAgreementsHeader';
import { CuratedAgreementsStatusOverview } from './CuratedAgreementsStatusOverview';
import { CuratedAgreementsPipelineTabs } from './CuratedAgreementsPipelineTabs';
import {
  CuratedAgreementNavigationProvider,
  type CuratedAgreementNavigationFilters,
} from './CuratedAgreementNavigationContext';
import type { CuratedNavTarget } from './CuratedAgreementsControlledApplyPanel';

export interface CuratedAgreementsPanelProps {
  filters?: CuratedAgreementNavigationFilters;
  onNavigate?: (target: CuratedNavTarget) => void;
  defaultTab?: string;
}

export function CuratedAgreementsPanel({
  filters = {},
  onNavigate,
  defaultTab,
}: CuratedAgreementsPanelProps) {
  return (
    <CuratedAgreementNavigationProvider filters={filters}>
      <div className="space-y-4" aria-label="curated-agreements-shell">
        <CuratedAgreementsHeader />
        <CuratedAgreementsStatusOverview />
        <Card>
          <CardContent className="pt-4">
            <CuratedAgreementsPipelineTabs
              onNavigate={onNavigate}
              defaultTab={defaultTab}
            />
          </CardContent>
        </Card>
      </div>
    </CuratedAgreementNavigationProvider>
  );
}

export default CuratedAgreementsPanel;