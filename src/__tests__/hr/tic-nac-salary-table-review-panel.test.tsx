/**
 * B11.2C.3 — Behavioural tests for the TIC-NAC staging review panel.
 *
 * Verifies:
 *  - permanent staging banner
 *  - auth-required state
 *  - tabs visible
 *  - OCR + manual rows are listed
 *  - row detail shows source page / excerpt / OCR raw
 *  - approval dialog requires the responsibility checkbox
 *  - same-reviewer is visually blocked in dual mode
 *  - payslip-literal blocker appears
 *  - rejected rows expose no writer CTA
 *  - no forbidden CTAs are present
 *  - approval calls go through hooks (no direct DB writes)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

const approveSingle = vi.fn().mockResolvedValue({ success: true, data: { row: {} } });
const approveFirst = vi.fn().mockResolvedValue({ success: true, data: { row: {} } });
const approveSecond = vi.fn().mockResolvedValue({ success: true, data: { row: {} } });
const rejectRow = vi.fn();
const editRow = vi.fn();
const markNeedsCorrection = vi.fn();

const refresh = vi.fn().mockResolvedValue(undefined);

let stagingState: {
  rows: any[];
  audit: any[];
  isLoading: boolean;
  error: null;
  authRequired: boolean;
} = {
  rows: [],
  audit: [],
  isLoading: false,
  error: null,
  authRequired: false,
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    functions: { invoke: vi.fn() },
    from: vi.fn(),
  },
}));

vi.mock('@/hooks/erp/hr/useTicNacSalaryTableStaging', () => ({
  useTicNacSalaryTableStaging: () => ({ ...stagingState, refresh }),
}));

vi.mock('@/hooks/erp/hr/useTicNacSalaryTableStagingActions', () => ({
  useTicNacSalaryTableStagingActions: () => ({
    isPending: false,
    stageOcrBatch: vi.fn(),
    stageManualBatch: vi.fn(),
    editRow,
    approveSingle,
    approveFirst,
    approveSecond,
    rejectRow,
    markNeedsCorrection,
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'reviewer-A' } }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { TicNacSalaryTableReviewPanel } from '@/components/erp/hr/collective-agreements/staging/TicNacSalaryTableReviewPanel';

// Radix DropdownMenu needs pointer + hasPointerCapture in jsdom
(window as any).PointerEvent = (window as any).PointerEvent ?? class PE extends Event {};
if (!(Element.prototype as any).hasPointerCapture) {
  (Element.prototype as any).hasPointerCapture = () => false;
  (Element.prototype as any).setPointerCapture = () => {};
  (Element.prototype as any).releasePointerCapture = () => {};
}
if (!(Element.prototype as any).scrollIntoView) {
  (Element.prototype as any).scrollIntoView = () => {};
}

function openMenu(triggerTestId: string) {
  const trigger = screen.getByTestId(triggerTestId);
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false } as any);
  fireEvent.pointerUp(trigger);
  fireEvent.click(trigger);
}

function makeOcrRow(overrides: Partial<any> = {}): any {
  return {
    id: overrides.id ?? 'row-ocr-1',
    agreement_id: 'agr-tic',
    version_id: 'ver-1',
    year: 2025,
    professional_group: 'Grupo 2',
    level: 'A',
    category: null,
    concept_literal_from_agreement: 'Plus transporte',
    normalized_concept_key: 'plus_transporte',
    payslip_label: 'Plus transporte',
    salary_base_annual: 18000,
    salary_base_monthly: 1500,
    plus_transport: 60,
    plus_antiguedad: 0,
    plus_convenio_annual: null,
    extraction_method: 'ocr',
    approval_mode: 'ocr_dual_human_approval',
    row_confidence: 'medium',
    validation_status: 'ocr_pending_review',
    source_page: '12',
    source_excerpt: 'Tabla salarial Anexo I — Grupo 2 nivel A',
    ocr_raw_text: 'OCR: 1.500,00 plus transporte 60',
    content_hash: 'hash-ocr-1',
    first_reviewed_by: null,
    first_reviewed_at: null,
    second_reviewed_by: null,
    second_reviewed_at: null,
    ...overrides,
  };
}

function makeManualRow(overrides: Partial<any> = {}): any {
  return {
    ...makeOcrRow({
      id: 'row-man-1',
      extraction_method: 'manual_csv',
      approval_mode: 'manual_upload_single_approval',
      validation_status: 'manual_pending_review',
      concept_literal_from_agreement: 'Salario base',
      normalized_concept_key: 'salario_base',
      payslip_label: 'Salario base',
    }),
    ...overrides,
  };
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  stagingState = {
    rows: [],
    audit: [],
    isLoading: false,
    error: null,
    authRequired: false,
  };
});

describe('TicNacSalaryTableReviewPanel', () => {
  it('renders the staging banner', () => {
    render(<TicNacSalaryTableReviewPanel agreementId="a" versionId="v" />);
    const banner = screen.getByTestId('staging-banner');
    expect(banner.textContent).toMatch(/Validación staging/i);
    expect(banner.textContent).toMatch(/no activa nómina/i);
  });

  it('shows the auth-required state without throwing when session is missing', () => {
    stagingState.authRequired = true;
    render(<TicNacSalaryTableReviewPanel agreementId="a" versionId="v" />);
    expect(screen.getByTestId('staging-auth-required')).toBeInTheDocument();
  });

  it('renders all the expected tabs', () => {
    render(<TicNacSalaryTableReviewPanel agreementId="a" versionId="v" />);
    for (const label of ['Todas', 'OCR', 'Manual', 'Pendientes', 'Aprobadas', 'Rechazadas', 'Auditoría']) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument();
    }
  });

  it('lists OCR rows in the OCR tab', () => {
    stagingState.rows = [makeOcrRow()];
    render(<TicNacSalaryTableReviewPanel agreementId="a" versionId="v" />);
    fireEvent.click(screen.getByRole('tab', { name: 'OCR' }));
    expect(screen.getByTestId('staging-row-row-ocr-1')).toBeInTheDocument();
  });

  it('lists manual rows in the Manual tab', () => {
    stagingState.rows = [makeManualRow()];
    render(<TicNacSalaryTableReviewPanel agreementId="a" versionId="v" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Manual' }));
    expect(screen.getByTestId('staging-row-row-man-1')).toBeInTheDocument();
  });

  it('detail drawer exposes source_page / source_excerpt / ocr raw text', () => {
    stagingState.rows = [makeOcrRow()];
    render(<TicNacSalaryTableReviewPanel agreementId="a" versionId="v" />);
    fireEvent.click(screen.getByTestId('staging-action-view-row-ocr-1'));
    expect(screen.getByTestId('detail-source-page').textContent).toBe('12');
    expect(screen.getByTestId('detail-source-excerpt').textContent).toMatch(/Anexo I/);
    expect(screen.getByTestId('detail-ocr-raw').textContent).toMatch(/1\.500,00 plus transporte/);
  });

  it('approval dialog shows the responsibility text and requires the checkbox', async () => {
    stagingState.rows = [makeOcrRow()];
    render(<TicNacSalaryTableReviewPanel agreementId="a" versionId="v" />);
    fireEvent.click(screen.getByTestId('staging-action-approve-first-row-ocr-1'));
    const text = screen.getByTestId('staging-responsibility-text').textContent ?? '';
    expect(text).toMatch(/asumo la responsabilidad/i);
    const confirm = screen.getByTestId('staging-confirm-approval') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.click(screen.getByTestId('staging-responsibility-checkbox'));
    expect(confirm.disabled).toBe(false);
  });

  it('blocks the same reviewer from doing the second approval (visual)', () => {
    stagingState.rows = [
      makeOcrRow({
        validation_status: 'human_approved_first',
        first_reviewed_by: 'reviewer-A',
      }),
    ];
    render(<TicNacSalaryTableReviewPanel agreementId="a" versionId="v" />);
    fireEvent.click(screen.getByTestId('staging-action-approve-second-row-ocr-1'));
    expect(screen.getByTestId('staging-same-reviewer-blocked')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('staging-responsibility-checkbox'));
    const confirm = screen.getByTestId('staging-confirm-approval') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
  });

  it('shows a payslip-literal blocker when "transporte" is missing in the label', () => {
    stagingState.rows = [
      makeOcrRow({
        concept_literal_from_agreement: 'Plus transporte',
        payslip_label: 'Otro plus',
      }),
    ];
    render(<TicNacSalaryTableReviewPanel agreementId="a" versionId="v" />);
    fireEvent.click(screen.getByTestId('staging-action-approve-first-row-ocr-1'));
    expect(screen.getByTestId('staging-row-blocker-payslip-literal')).toBeInTheDocument();
  });

  it('rejected rows do not expose any writer/approve action', () => {
    stagingState.rows = [makeOcrRow({ validation_status: 'rejected' })];
    render(<TicNacSalaryTableReviewPanel agreementId="a" versionId="v" />);
    expect(screen.queryByTestId('staging-action-approve-single-row-ocr-1')).toBeNull();
    expect(screen.queryByTestId('staging-action-approve-first-row-ocr-1')).toBeNull();
    expect(screen.queryByTestId('staging-action-edit-row-ocr-1')).toBeNull();
    expect(screen.queryByTestId('staging-action-reject-row-ocr-1')).toBeNull();
  });

  it('does not render any forbidden CTA in the panel', () => {
    stagingState.rows = [makeOcrRow(), makeManualRow()];
    const { container } = render(<TicNacSalaryTableReviewPanel agreementId="a" versionId="v" />);
    const text = container.textContent ?? '';
    for (const forbidden of [
      'Usar en nómina',
      'Activar convenio',
      'Activar nómina',
      'ready_for_payroll',
      'Marcar listo para nómina',
      'Saltar revisión',
    ]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it('approval action calls the hook (not the DB) when confirmed', async () => {
    stagingState.rows = [makeOcrRow({ approval_mode: 'ocr_single_human_approval' })];
    render(<TicNacSalaryTableReviewPanel agreementId="a" versionId="v" />);
    fireEvent.click(screen.getByTestId('staging-action-approve-single-row-ocr-1'));
    fireEvent.click(screen.getByTestId('staging-responsibility-checkbox'));
    fireEvent.click(screen.getByTestId('staging-confirm-approval'));
    // microtask flush
    await Promise.resolve();
    expect(approveSingle).toHaveBeenCalledWith('row-ocr-1');
  });
});