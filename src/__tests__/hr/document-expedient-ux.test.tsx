/**
 * HR Document Expedient & Calendars UX (contract render tests)
 *
 * Cobertura:
 *  - EmployeeDocumentExpedient muestra:
 *      · texto "v{n}" para versión
 *      · botón History si hay >1 versiones
 *      · botón de descarga si hay storage_path
 *      · resumen ejecutivo cuando hay documentos
 *  - HRCalendarsPanel muestra festivos operativos cuando existen
 *
 * Estrategia: se montan los componentes REALES con todos sus hooks mockeados
 * (mocks deterministas; sin red, sin BD).
 *
 * Cómo ejecutar:
 *   bunx vitest run src/__tests__/hr/document-expedient-ux.test.tsx
 *
 * Invariantes: no toca componentes ni hooks de producción; solo los mockea.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// === Hook mocks (deterministas) =====================================
const docFixture = {
  id: 'doc-1',
  employee_id: 'emp-1',
  company_id: 'test-company-own-0001',
  document_name: 'Contrato indefinido v2',
  document_type: 'contract_indefinite',
  category: 'contract',
  version: 2,
  storage_path: 'contracts/doc-1.pdf',
  file_name: 'doc-1.pdf',
  metadata: null,
  source: 'system',
  integrity_verified: true,
  expiry_date: null,
  document_status: 'active',
  related_entity_type: 'contract',
  is_confidential: false,
};

vi.mock('@/hooks/erp/hr/useHRDocumentExpedient', () => ({
  useHRDocumentExpedient: () => ({
    documents: [docFixture],
    isLoadingDocuments: false,
    logAccess: { mutate: vi.fn() },
    verifyIntegrity: { mutate: vi.fn() },
    selectedDocumentId: null,
    setSelectedDocumentId: vi.fn(),
    getExpedientStats: () => ({
      total: 1,
      expiringSoon: 0,
      unverified: 0,
      activeConsents: 0,
      byCategory: { contract: 1 },
    }),
  }),
}));

vi.mock('@/hooks/erp/hr/useHRDocumentStorage', () => ({
  useHRDocumentStorage: () => ({
    getDownloadUrl: vi.fn().mockResolvedValue({ ok: true, data: 'blob://x' }),
  }),
}));

vi.mock('@/hooks/erp/hr/useDocumentVersionCounts', () => ({
  useDocumentVersionCounts: () => ({
    countsMap: new Map([['doc-1', 3]]),
  }),
}));

vi.mock('@/hooks/erp/hr/useHRHolidayCalendar', () => ({
  useHRHolidayCalendar: () => ({
    entries: [
      {
        id: 'h-1',
        date: '2026-01-06',
        name: 'Reyes',
        scope: 'national',
        is_recurring: false,
      },
      {
        id: 'h-2',
        date: '2026-04-01',
        name: 'Festivo Local',
        scope: 'local',
        is_recurring: false,
      },
    ],
    calendarLabel: 'ES · Madrid',
    holidayCount: 2,
    isLoading: false,
  }),
}));

vi.mock('@/hooks/admin/hr/useHREnterprise', () => ({
  useHREnterprise: () => ({
    calendars: [],
    fetchCalendars: vi.fn(),
    loading: false,
  }),
}));

// Heavy subcomponents → stub mínimos que reciben props pero no traen contexto pesado
vi.mock('@/components/erp/hr/document-expedient/DocumentDetailPanel', () => ({
  DocumentDetailPanel: () => null,
}));
vi.mock('@/components/erp/hr/shared/RegistrationSummaryWidget', () => ({
  RegistrationSummaryWidget: () => <div data-testid="registration-summary" />,
}));
vi.mock('@/components/erp/hr/shared/ContractSummaryWidget', () => ({
  ContractSummaryWidget: () => <div data-testid="contract-summary" />,
}));
vi.mock('@/components/erp/hr/shared/ExpedientExecutiveSummary', () => ({
  ExpedientExecutiveSummary: ({ docs }: any) => (
    <div data-testid="executive-summary">Resumen ejecutivo · {docs.length} doc(s)</div>
  ),
}));
vi.mock('@/components/erp/hr/shared/DocAlertsSummaryBar', () => ({
  DocAlertsSummaryBar: () => null,
}));
vi.mock('@/components/erp/hr/shared/DocumentAlertsSummary', () => ({
  DocumentAlertsSummary: () => null,
}));
vi.mock('@/components/erp/hr/shared/DocStatusBadge', () => ({
  DocStatusBadge: ({ status }: any) => <span>status:{status}</span>,
}));
vi.mock('@/components/erp/hr/shared/DocTrafficLightBadge', () => ({
  DocTrafficLightBadge: () => null,
}));
vi.mock('@/components/erp/hr/shared/DocumentOriginBadge', () => ({
  DocumentOriginBadge: () => null,
  ORIGIN_FILTER_OPTIONS: [{ value: 'all', label: 'Todos' }],
  filterByOrigin: (docs: any[]) => docs,
}));
vi.mock('@/components/erp/hr/shared/DocGenerationBadge', () => ({
  DocGenerationBadge: () => <span data-testid="gen-badge">gen</span>,
}));

import { EmployeeDocumentExpedient } from '@/components/erp/hr/document-expedient/EmployeeDocumentExpedient';
import { HRCalendarsPanel } from '@/components/erp/hr/enterprise/HRCalendarsPanel';

describe('EmployeeDocumentExpedient — UX contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra version "v2" del documento', () => {
    render(<EmployeeDocumentExpedient companyId="test-company-own-0001" employeeId="emp-1" />);
    // El componente real renderiza "{type} · v{version}"
    expect(screen.getAllByText(/v2/).length).toBeGreaterThan(0);
  });

  it('muestra resumen ejecutivo cuando hay documentos', () => {
    render(<EmployeeDocumentExpedient companyId="test-company-own-0001" employeeId="emp-1" />);
    expect(screen.getByTestId('executive-summary')).toBeInTheDocument();
  });

  it('muestra badge de generación (DocGenerationBadge)', () => {
    render(<EmployeeDocumentExpedient companyId="test-company-own-0001" employeeId="emp-1" />);
    expect(screen.getByTestId('gen-badge')).toBeInTheDocument();
  });

  it('muestra badge de status del documento', () => {
    render(<EmployeeDocumentExpedient companyId="test-company-own-0001" employeeId="emp-1" />);
    expect(screen.getByText(/status:active/)).toBeInTheDocument();
  });

  it('renderiza más de un botón de acción cuando hay storage_path y >1 versiones (descarga + history + ver)', () => {
    render(<EmployeeDocumentExpedient companyId="test-company-own-0001" employeeId="emp-1" />);
    // 3 botones de icon (download, history, eye) en el row + 1 "Subir documento" en filtros
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });
});

describe('HRCalendarsPanel — festivos operativos', () => {
  it('lista festivos operativos cuando existen', () => {
    render(<HRCalendarsPanel companyId="test-company-own-0001" />);
    expect(screen.getAllByText(/Festivos Operativos/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Reyes/)).toBeInTheDocument();
    expect(screen.getByText(/Festivo Local/)).toBeInTheDocument();
    expect(screen.getAllByText(/2 festivos/).length).toBeGreaterThan(0);
  });
});
