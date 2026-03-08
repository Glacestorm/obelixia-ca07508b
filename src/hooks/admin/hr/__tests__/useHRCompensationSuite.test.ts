import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHRCompensationSuite } from '../useHRCompensationSuite';
import { supabase } from '@/integrations/supabase/client';

const mockInvoke = vi.mocked(supabase.functions.invoke);

describe('useHRCompensationSuite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useHRCompensationSuite());
    expect(result.current.loading).toBe(false);
    expect(result.current.meritCycles).toEqual([]);
    expect(result.current.bonusCycles).toEqual([]);
    expect(result.current.payEquitySnapshots).toEqual([]);
  });

  it('fetchMeritCycles calls edge function', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, data: [{ id: 'mc1', name: 'Merit 2026', status: 'active' }] },
      error: null,
    });

    const { result } = renderHook(() => useHRCompensationSuite());
    await act(async () => {
      await result.current.fetchMeritCycles('company-1');
    });

    expect(mockInvoke).toHaveBeenCalledWith('erp-hr-compensation-suite', expect.objectContaining({
      body: expect.objectContaining({ action: 'list_merit_cycles' }),
    }));
  });

  it('createMeritCycle handles success', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, data: { id: 'new-mc', name: 'Merit 2026' } },
      error: null,
    });

    const { result } = renderHook(() => useHRCompensationSuite());
    let res: any;
    await act(async () => {
      res = await result.current.createMeritCycle({
        name: 'Merit 2026',
        year: 2026,
        company_id: 'company-1',
        budget_pool: 50000,
      });
    });

    expect(res).toBeTruthy();
  });

  it('analyzPayEquity calls AI edge function', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, data: { gap_percentage: 3.2, recommendations: [] } },
      error: null,
    });

    const { result } = renderHook(() => useHRCompensationSuite());
    await act(async () => {
      await result.current.analyzePayEquity('company-1');
    });

    expect(mockInvoke).toHaveBeenCalledWith('erp-hr-compensation-suite', expect.objectContaining({
      body: expect.objectContaining({ action: 'analyze_pay_equity' }),
    }));
  });

  it('handles edge function errors', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('Service unavailable') });

    const { result } = renderHook(() => useHRCompensationSuite());
    await act(async () => {
      await result.current.fetchMeritCycles('company-1');
    });

    // Should not throw, just log error
    expect(result.current.loading).toBe(false);
  });
});
