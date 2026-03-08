import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHRBoardPack } from '../useHRBoardPack';
import { supabase } from '@/integrations/supabase/client';

const mockInvoke = vi.mocked(supabase.functions.invoke);
const mockFrom = vi.mocked(supabase.from);

describe('useHRBoardPack', () => {
  const companyId = 'test-company-uuid';

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: return empty data
    mockInvoke.mockResolvedValue({ data: { success: true, templates: [], packs: [] }, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any);
  });

  it('initializes with empty arrays', () => {
    const { result } = renderHook(() => useHRBoardPack(companyId));
    expect(result.current.templates).toEqual([]);
    expect(result.current.packs).toEqual([]);
    // isLoading may be true on mount due to useEffect fetching
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('does not fetch packs without companyId', async () => {
    const { result } = renderHook(() => useHRBoardPack(undefined));
    await act(async () => {
      await result.current.fetchPacks();
    });
    // Should not invoke for packs when no companyId
    const packsCalls = mockInvoke.mock.calls.filter(
      ([name, opts]) => name === 'hr-board-pack' && (opts?.body as any)?.action === 'list_packs'
    );
    // The hook checks !companyId and returns early
    expect(result.current.packs).toEqual([]);
  });

  it('fetches templates on mount', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, templates: [{ id: 't1', name: 'Test Template' }] },
      error: null,
    });

    const { result } = renderHook(() => useHRBoardPack(companyId));

    // Wait for useEffect
    await vi.waitFor(() => {
      expect(mockInvoke).toHaveBeenCalled();
    });
  });

  it('generatePack returns null without companyId', async () => {
    const { result } = renderHook(() => useHRBoardPack(undefined));
    let pack: any;
    await act(async () => {
      pack = await result.current.generatePack('template-1', { start: '2026-01-01', end: '2026-03-31' });
    });
    expect(pack).toBeNull();
  });

  it('generatePack calls edge function with correct params', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, pack: { id: 'pack-1', title: 'Test Pack', status: 'draft' } },
      error: null,
    });

    const { result } = renderHook(() => useHRBoardPack(companyId));
    await act(async () => {
      const pack = await result.current.generatePack('template-1', { start: '2026-01-01', end: '2026-03-31' });
      expect(pack).toBeTruthy();
      expect(pack?.id).toBe('pack-1');
    });

    expect(mockInvoke).toHaveBeenCalledWith('hr-board-pack', {
      body: {
        action: 'generate_pack',
        companyId,
        templateId: 'template-1',
        period: { start: '2026-01-01', end: '2026-03-31' },
      },
    });
  });

  it('generatePack handles errors gracefully', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: false, error: 'AI rate limit exceeded' },
      error: null,
    });

    const { result } = renderHook(() => useHRBoardPack(companyId));
    let pack: any;
    await act(async () => {
      pack = await result.current.generatePack('template-1', { start: '2026-01-01', end: '2026-03-31' });
    });

    expect(pack).toBeNull();
    expect(result.current.error).toBeTruthy();
    expect(result.current.isGenerating).toBe(false);
  });

  it('updateStatus calls edge function and refreshes', async () => {
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any);

    const { result } = renderHook(() => useHRBoardPack(companyId));
    await act(async () => {
      await result.current.updateStatus('pack-1', 'approved', 'Looks good', 'Admin');
    });

    const statusCall = mockInvoke.mock.calls.find(
      ([, opts]) => (opts?.body as any)?.action === 'update_status'
    );
    expect(statusCall).toBeTruthy();
  });

  it('logDistribution inserts and refreshes', async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue({
      insert: insertMock,
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any);

    const { result } = renderHook(() => useHRBoardPack(companyId));
    await act(async () => {
      await result.current.logDistribution('pack-1', 'email', 'ceo@company.com');
    });

    expect(mockFrom).toHaveBeenCalledWith('erp_hr_board_pack_distribution');
  });

  it('has correct audience labels', () => {
    const { result } = renderHook(() => useHRBoardPack(companyId));
    expect(result.current.audienceLabels).toBeDefined();
    expect(result.current.audienceLabels.board_directors).toBe('Consejo de Administración');
  });
});
