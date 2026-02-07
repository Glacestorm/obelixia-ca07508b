/**
 * Tests for useAIProviders hook
 * Sistema de IA Híbrida Universal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@/test/utils';
import { useAIProviders } from '../useAIProviders';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'provider-1',
            name: 'Lovable AI Gateway',
            provider_type: 'external',
            api_endpoint: 'https://ai.gateway.lovable.dev',
            requires_api_key: false,
            supported_models: [{ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }],
            pricing_info: { currency: 'USD', billing_type: 'per_token' },
            capabilities: ['chat', 'analysis'],
            is_active: true,
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: { success: true, latency: 150, models: ['gemini-2.5-flash'] },
        error: null,
      }),
    },
  },
}));

describe('useAIProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', async () => {
    const { result } = renderHook(() => useAIProviders());

    // Wait for initial state to settle
    await waitFor(() => {
      expect(result.current.credentials).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  it('should have fetchProviders function', () => {
    const { result } = renderHook(() => useAIProviders());
    expect(typeof result.current.fetchProviders).toBe('function');
  });

  it('should have fetchCredentials function', () => {
    const { result } = renderHook(() => useAIProviders());
    expect(typeof result.current.fetchCredentials).toBe('function');
  });

  it('should have testConnection function', () => {
    const { result } = renderHook(() => useAIProviders());
    expect(typeof result.current.testConnection).toBe('function');
  });

  it('should have getProviderModels function', () => {
    const { result } = renderHook(() => useAIProviders());
    expect(typeof result.current.getProviderModels).toBe('function');
  });

  it('should have addCredential function', () => {
    const { result } = renderHook(() => useAIProviders());
    expect(typeof result.current.addCredential).toBe('function');
  });

  it('should have setDefaultProvider function', () => {
    const { result } = renderHook(() => useAIProviders());
    expect(typeof result.current.setDefaultProvider).toBe('function');
  });

  it('should have deleteCredential function', () => {
    const { result } = renderHook(() => useAIProviders());
    expect(typeof result.current.deleteCredential).toBe('function');
  });

  it('should have getProvidersByType helper', () => {
    const { result } = renderHook(() => useAIProviders());
    expect(typeof result.current.getProvidersByType).toBe('function');
  });

  it('should have getDefaultCredential helper', () => {
    const { result } = renderHook(() => useAIProviders());
    expect(typeof result.current.getDefaultCredential).toBe('function');
  });

  it('should filter providers by type', async () => {
    const { result } = renderHook(() => useAIProviders());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Test filtering
    const localProviders = result.current.getProvidersByType('local');
    const externalProviders = result.current.getProvidersByType('external');
    
    expect(Array.isArray(localProviders)).toBe(true);
    expect(Array.isArray(externalProviders)).toBe(true);
  });
});
