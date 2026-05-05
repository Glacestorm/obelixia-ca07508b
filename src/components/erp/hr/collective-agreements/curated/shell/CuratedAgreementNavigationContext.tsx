/**
 * B13.6 — Optional context for sharing curated-agreement filters
 * across tabs (read-only).
 */
import React, { createContext, useContext, useMemo } from 'react';

export interface CuratedAgreementNavigationFilters {
  agreement_id?: string;
  version_id?: string;
  company_id?: string;
  employee_id?: string;
  contract_id?: string;
}

const Ctx = createContext<CuratedAgreementNavigationFilters>({});

export function CuratedAgreementNavigationProvider({
  filters,
  children,
}: {
  filters: CuratedAgreementNavigationFilters;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ ...filters }), [
    filters.agreement_id,
    filters.version_id,
    filters.company_id,
    filters.employee_id,
    filters.contract_id,
  ]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCuratedAgreementNavigation() {
  return useContext(Ctx);
}

export default CuratedAgreementNavigationProvider;