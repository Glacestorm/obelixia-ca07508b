import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHRPremiumAPI } from '../useHRPremiumAPI';
import { supabase } from '@/integrations/supabase/client';

const mockInvoke = vi.mocked(supabase.functions.invoke);

describe('useHRPremiumAPI', () => {
  const companyId = 'test-company-uuid';

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useHRPremiumAPI(companyId));
    expect(result.current.clients).toEqual([]);
    expect(result.current.webhooks).toEqual([]);
    expect(result.current.deliveries).toEqual([]);
    expect(result.current.events).toEqual([]);
    expect(result.current.accessLogs).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('does not fetch clients without companyId', async () => {
    const { result } = renderHook(() => useHRPremiumAPI(undefined));
    await act(async () => {
      await result.current.fetchClients();
    });
    expect(result.current.clients).toEqual([]);
  });

  it('fetchClients calls edge function correctly', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, clients: [{ id: 'c1', name: 'Test Client' }] },
      error: null,
    });

    const { result } = renderHook(() => useHRPremiumAPI(companyId));
    await act(async () => {
      await result.current.fetchClients();
    });

    expect(mockInvoke).toHaveBeenCalledWith('hr-premium-api', {
      body: { action: 'list_api_clients', params: { company_id: companyId } },
    });
    expect(result.current.clients).toHaveLength(1);
  });

  it('createClient invokes and refreshes', async () => {
    mockInvoke
      .mockResolvedValueOnce({ data: { success: true, api_key: 'hrp_test1234567890abcdef' }, error: null })
      .mockResolvedValue({ data: { success: true, clients: [] }, error: null });

    const { result } = renderHook(() => useHRPremiumAPI(companyId));
    let res: any;
    await act(async () => {
      res = await result.current.createClient({ name: 'New Client', scopes: ['read:reports'] });
    });

    expect(res).toBeTruthy();
    expect(res.api_key).toContain('hrp_');
  });

  it('revokeClient invokes and refreshes', async () => {
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

    const { result } = renderHook(() => useHRPremiumAPI(companyId));
    await act(async () => {
      await result.current.revokeClient('client-1');
    });

    const revokeCall = mockInvoke.mock.calls.find(
      ([, opts]) => (opts?.body as any)?.action === 'revoke_api_client'
    );
    expect(revokeCall).toBeTruthy();
  });

  it('createWebhook invokes with correct params', async () => {
    mockInvoke
      .mockResolvedValueOnce({ data: { success: true, signing_secret: 'whsec_test1234567890' }, error: null })
      .mockResolvedValue({ data: { success: true, webhooks: [] }, error: null });

    const { result } = renderHook(() => useHRPremiumAPI(companyId));
    let res: any;
    await act(async () => {
      res = await result.current.createWebhook({
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['employee.created', 'payroll.processed'],
      });
    });

    expect(res).toBeTruthy();
    expect(res.signing_secret).toContain('whsec_');
  });

  it('testWebhook returns test result', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, test_result: { success: true, response_time_ms: 150, status_code: 200 } },
      error: null,
    });

    const { result } = renderHook(() => useHRPremiumAPI(companyId));
    let testResult: any;
    await act(async () => {
      testResult = await result.current.testWebhook('webhook-1');
    });

    expect(testResult).toBeTruthy();
    expect(testResult.success).toBe(true);
    expect(testResult.response_time_ms).toBe(150);
  });

  it('handles invoke errors gracefully', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('Network error') });

    const { result } = renderHook(() => useHRPremiumAPI(companyId));
    let res: any;
    await act(async () => {
      res = await result.current.createClient({ name: 'Fail' });
    });

    expect(res).toBeNull();
  });

  it('retryDelivery invokes correctly', async () => {
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

    const { result } = renderHook(() => useHRPremiumAPI(companyId));
    await act(async () => {
      await result.current.retryDelivery('delivery-1');
    });

    const retryCall = mockInvoke.mock.calls.find(
      ([, opts]) => (opts?.body as any)?.action === 'retry_delivery'
    );
    expect(retryCall).toBeTruthy();
  });

  it('deleteWebhook invokes and refreshes', async () => {
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

    const { result } = renderHook(() => useHRPremiumAPI(companyId));
    await act(async () => {
      await result.current.deleteWebhook('webhook-1');
    });

    const deleteCall = mockInvoke.mock.calls.find(
      ([, opts]) => (opts?.body as any)?.action === 'delete_webhook'
    );
    expect(deleteCall).toBeTruthy();
  });
});
