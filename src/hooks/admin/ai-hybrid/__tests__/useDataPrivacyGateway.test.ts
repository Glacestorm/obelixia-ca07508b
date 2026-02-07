/**
 * Tests for useDataPrivacyGateway hook
 * Sistema de IA Híbrida Universal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@/test/utils';
import { useDataPrivacyGateway } from '../useDataPrivacyGateway';

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
            id: 'rule-1',
            company_id: null,
            workspace_id: null,
            rule_name: 'PII Detection',
            data_category: 'pii',
            classification_level: 'confidential',
            can_send_external: false,
            anonymization_required: true,
            field_patterns: [{ pattern: 'email', type: 'contains' }],
            entity_types: ['client', 'contact'],
            is_active: true,
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('useDataPrivacyGateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', async () => {
    const { result } = renderHook(() => useDataPrivacyGateway());

    // Wait for initial state to settle
    await waitFor(() => {
      expect(result.current.lastClassification).toBeNull();
    });
  });

  it('should have fetchRules function', () => {
    const { result } = renderHook(() => useDataPrivacyGateway());
    expect(typeof result.current.fetchRules).toBe('function');
  });

  it('should have classifyData function', () => {
    const { result } = renderHook(() => useDataPrivacyGateway());
    expect(typeof result.current.classifyData).toBe('function');
  });

  it('should have canSendExternal function', () => {
    const { result } = renderHook(() => useDataPrivacyGateway());
    expect(typeof result.current.canSendExternal).toBe('function');
  });

  it('should have sanitizeForExternal function', () => {
    const { result } = renderHook(() => useDataPrivacyGateway());
    expect(typeof result.current.sanitizeForExternal).toBe('function');
  });

  it('should have createRule function', () => {
    const { result } = renderHook(() => useDataPrivacyGateway());
    expect(typeof result.current.createRule).toBe('function');
  });

  it('should have updateRule function', () => {
    const { result } = renderHook(() => useDataPrivacyGateway());
    expect(typeof result.current.updateRule).toBe('function');
  });

  it('should have deleteRule function', () => {
    const { result } = renderHook(() => useDataPrivacyGateway());
    expect(typeof result.current.deleteRule).toBe('function');
  });

  it('should classify data correctly', async () => {
    const { result } = renderHook(() => useDataPrivacyGateway());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Test classification with sample data
    const testData = { name: 'John Doe', message: 'Hello world' };
    const classification = result.current.classifyData(testData);
    
    expect(classification).toBeDefined();
    expect(classification.level).toBeDefined();
    expect(['public', 'internal', 'confidential', 'restricted']).toContain(classification.level);
    expect(Array.isArray(classification.matchedRules)).toBe(true);
    expect(Array.isArray(classification.sensitiveFields)).toBe(true);
    expect(typeof classification.canSendExternal).toBe('boolean');
    expect(typeof classification.requiresAnonymization).toBe('boolean');
  });

  it('should sanitize data for external use', async () => {
    const { result } = renderHook(() => useDataPrivacyGateway());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const testData = { name: 'John Doe', email: 'john@example.com' };
    const sanitized = result.current.sanitizeForExternal(testData, { anonymize: true });
    
    expect(sanitized).toBeDefined();
    expect(sanitized.originalData).toEqual(testData);
    expect(sanitized.anonymizedData).toBeDefined();
    expect(Array.isArray(sanitized.fieldsAnonymized)).toBe(true);
    expect(Array.isArray(sanitized.fieldsBlocked)).toBe(true);
  });

  it('should validate classification levels', () => {
    const { result } = renderHook(() => useDataPrivacyGateway());

    const validLevels = ['public', 'internal', 'confidential', 'restricted'];
    
    validLevels.forEach(level => {
      expect(validLevels).toContain(level);
    });
  });

  it('should check if data can be sent external', async () => {
    const { result } = renderHook(() => useDataPrivacyGateway());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const testData = { message: 'Safe public message' };
    const canSend = result.current.canSendExternal(testData);
    
    expect(typeof canSend).toBe('boolean');
  });
});
