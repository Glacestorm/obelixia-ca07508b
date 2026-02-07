/**
 * Tests for useHybridAI hook
 * Sistema de IA Híbrida Universal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@/test/utils';
import { useHybridAI } from '../useHybridAI';

// Mock dependencies
vi.mock('../useAIProviders', () => ({
  useAIProviders: () => ({
    providers: [
      {
        id: 'provider-1',
        name: 'Lovable AI',
        provider_type: 'external',
        api_endpoint: 'https://ai.gateway.lovable.dev',
        requires_api_key: false,
        supported_models: [{ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }],
        pricing_info: null,
        capabilities: ['chat'],
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ],
    credentials: [],
    fetchCredentials: vi.fn(),
    getProvidersByType: vi.fn().mockReturnValue([]),
    getDefaultCredential: vi.fn().mockReturnValue(undefined),
  }),
}));

vi.mock('../useDataPrivacyGateway', () => ({
  useDataPrivacyGateway: () => ({
    classifyData: vi.fn().mockReturnValue({
      level: 'public',
      matchedRules: [],
      sensitiveFields: [],
      canSendExternal: true,
      requiresAnonymization: false,
      blockedFields: [],
    }),
    sanitizeForExternal: vi.fn().mockReturnValue({
      originalData: {},
      anonymizedData: {},
      fieldsAnonymized: [],
      fieldsBlocked: [],
    }),
  }),
}));

vi.mock('../useAICredits', () => ({
  useAICredits: () => ({
    balances: [],
    recordUsage: vi.fn(),
    getLowBalanceCredentials: vi.fn().mockReturnValue([]),
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: {
          success: true,
          response: 'Test AI response',
          model: 'gemini-2.5-flash',
          usage: { prompt_tokens: 100, completion_tokens: 50 },
          cost: 0,
        },
        error: null,
      }),
    },
  },
}));

describe('useHybridAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useHybridAI());

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.routingMode).toBe('hybrid_auto');
    expect(result.current.currentProvider).toBeNull();
    expect(result.current.lastDecision).toBeNull();
  });

  it('should have sendMessage function', () => {
    const { result } = renderHook(() => useHybridAI());
    expect(typeof result.current.sendMessage).toBe('function');
  });

  it('should have setRoutingMode function', () => {
    const { result } = renderHook(() => useHybridAI());
    expect(typeof result.current.setRoutingMode).toBe('function');
  });

  it('should have getRoutingDecision function', () => {
    const { result } = renderHook(() => useHybridAI());
    expect(typeof result.current.getRoutingDecision).toBe('function');
  });

  it('should have switchProvider function', () => {
    const { result } = renderHook(() => useHybridAI());
    expect(typeof result.current.switchProvider).toBe('function');
  });

  it('should have cancelRequest function', () => {
    const { result } = renderHook(() => useHybridAI());
    expect(typeof result.current.cancelRequest).toBe('function');
  });

  it('should have clearMessages function', () => {
    const { result } = renderHook(() => useHybridAI());
    expect(typeof result.current.clearMessages).toBe('function');
  });

  it('should have addSystemMessage function', () => {
    const { result } = renderHook(() => useHybridAI());
    expect(typeof result.current.addSystemMessage).toBe('function');
  });

  it('should change routing mode', () => {
    const { result } = renderHook(() => useHybridAI());

    act(() => {
      result.current.setRoutingMode('local_only');
    });

    expect(result.current.routingMode).toBe('local_only');
  });

  it('should support all routing modes', () => {
    const { result } = renderHook(() => useHybridAI());
    
    const validModes = ['local_only', 'external_only', 'hybrid_auto', 'hybrid_manual'] as const;
    
    validModes.forEach(mode => {
      act(() => {
        result.current.setRoutingMode(mode);
      });
      expect(result.current.routingMode).toBe(mode);
    });
  });

  it('should make routing decisions based on context', () => {
    const { result } = renderHook(() => useHybridAI());

    const decision = result.current.getRoutingDecision('Analyze this client');
    
    expect(decision).toBeDefined();
    expect(decision.source).toBeDefined();
    expect(['local', 'external']).toContain(decision.source);
    expect(decision.reason).toBeDefined();
    expect(typeof decision.reason).toBe('string');
    expect(decision.classification).toBeDefined();
    expect(Array.isArray(decision.warnings)).toBe(true);
  });

  it('should add system messages', () => {
    const { result } = renderHook(() => useHybridAI());

    act(() => {
      result.current.addSystemMessage('You are a helpful assistant.');
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('system');
    expect(result.current.messages[0].content).toBe('You are a helpful assistant.');
  });

  it('should clear messages', () => {
    const { result } = renderHook(() => useHybridAI());

    act(() => {
      result.current.addSystemMessage('Test message');
    });

    expect(result.current.messages).toHaveLength(1);

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toHaveLength(0);
  });
});
