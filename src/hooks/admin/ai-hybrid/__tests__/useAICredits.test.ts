/**
 * Tests for useAICredits hook
 * Sistema de IA Híbrida Universal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@/test/utils';
import { useAICredits } from '../useAICredits';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'cred-1',
            provider_id: 'provider-1',
            credits_balance: 10000,
            credits_alert_threshold: 1000,
            last_usage_check: new Date().toISOString(),
            provider: { name: 'Lovable AI Gateway' },
          },
        ],
        error: null,
      }),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    })),
  },
}));

describe('useAICredits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAICredits());

    expect(result.current.balances).toEqual([]);
    expect(result.current.transactions).toEqual([]);
    expect(result.current.alerts).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('should have fetchBalances function', () => {
    const { result } = renderHook(() => useAICredits());
    expect(typeof result.current.fetchBalances).toBe('function');
  });

  it('should have fetchTransactions function', () => {
    const { result } = renderHook(() => useAICredits());
    expect(typeof result.current.fetchTransactions).toBe('function');
  });

  it('should have fetchAlerts function', () => {
    const { result } = renderHook(() => useAICredits());
    expect(typeof result.current.fetchAlerts).toBe('function');
  });

  it('should have addCredits function', () => {
    const { result } = renderHook(() => useAICredits());
    expect(typeof result.current.addCredits).toBe('function');
  });

  it('should have recordUsage function', () => {
    const { result } = renderHook(() => useAICredits());
    expect(typeof result.current.recordUsage).toBe('function');
  });

  it('should have getUsageStats function', () => {
    const { result } = renderHook(() => useAICredits());
    expect(typeof result.current.getUsageStats).toBe('function');
  });

  it('should have estimateCost function', () => {
    const { result } = renderHook(() => useAICredits());
    expect(typeof result.current.estimateCost).toBe('function');
  });

  it('should have getLowBalanceCredentials function', () => {
    const { result } = renderHook(() => useAICredits());
    expect(typeof result.current.getLowBalanceCredentials).toBe('function');
  });

  it('should correctly estimate cost', async () => {
    const { result } = renderHook(() => useAICredits());

    // Test cost estimation with proper parameters
    const estimate = result.current.estimateCost(
      'What is the meaning of life?',
      'gemini-2.5-flash',
      { inputPer1k: 0.001, outputPer1k: 0.002 }
    );

    expect(estimate).toBeDefined();
    expect(estimate.promptTokens).toBeGreaterThan(0);
    expect(estimate.estimatedCompletionTokens).toBeGreaterThan(0);
    expect(estimate.estimatedCost).toBeGreaterThanOrEqual(0);
    expect(estimate.currency).toBe('USD');
    expect(estimate.model).toBe('gemini-2.5-flash');
  });

  it('should return low balance credentials', () => {
    const { result } = renderHook(() => useAICredits());
    
    const lowBalance = result.current.getLowBalanceCredentials();
    expect(Array.isArray(lowBalance)).toBe(true);
  });
});
