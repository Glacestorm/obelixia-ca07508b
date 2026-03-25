/**
 * D3: API Contract Tests — Agent Registry
 * Validates that the Supabase schema for AI agents hasn't changed
 */
import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Expected schema contract for erp_ai_agents_registry
const EXPECTED_AGENT_FIELDS = [
  'id',
  'code',
  'name',
  'module_domain',
  'agent_type',
  'status',
  'confidence_threshold',
  'requires_human_review',
  'execution_type',
  'description',
  'specialization',
] as const;

// Expected schema contract for erp_ai_approval_queue
const EXPECTED_QUEUE_FIELDS = [
  'id',
  'company_id',
  'agent_code',
  'domain',
  'task_type',
  'status',
  'priority',
  'semaphore',
  'confidence_score',
  'payload_summary',
  'action_required',
  'cost_tokens',
  'started_at',
  'estimated_completion',
  'resolved_at',
  'resolved_by',
  'metadata',
  'created_at',
  'updated_at',
] as const;

// Expected schema contract for erp_ai_agent_invocations
const EXPECTED_INVOCATION_FIELDS = [
  'id',
  'confidence_score',
  'execution_time_ms',
  'escalated_to',
  'created_at',
] as const;

describe('Agent API Contract Tests', () => {
  it('D3.1 — erp_ai_agents_registry returns expected fields', async () => {
    const { data, error } = await supabase
      .from('erp_ai_agents_registry')
      .select(EXPECTED_AGENT_FIELDS.join(', '))
      .limit(1);

    // Should not error — if it does, the schema has changed
    expect(error).toBeNull();
    expect(data).toBeDefined();

    if (data && data.length > 0) {
      const row = data[0];
      for (const field of EXPECTED_AGENT_FIELDS) {
        expect(row).toHaveProperty(field);
      }
    }
  });

  it('D3.2 — erp_ai_approval_queue returns expected fields', async () => {
    const { data, error } = await supabase
      .from('erp_ai_approval_queue')
      .select(EXPECTED_QUEUE_FIELDS.join(', '))
      .limit(1);

    expect(error).toBeNull();
    expect(data).toBeDefined();

    if (data && data.length > 0) {
      const row = data[0];
      for (const field of EXPECTED_QUEUE_FIELDS) {
        expect(row).toHaveProperty(field);
      }
    }
  });

  it('D3.3 — erp_ai_agent_invocations returns expected fields', async () => {
    const { data, error } = await supabase
      .from('erp_ai_agent_invocations')
      .select(EXPECTED_INVOCATION_FIELDS.join(', '))
      .limit(1);

    expect(error).toBeNull();
    expect(data).toBeDefined();

    if (data && data.length > 0) {
      const row = data[0];
      for (const field of EXPECTED_INVOCATION_FIELDS) {
        expect(row).toHaveProperty(field);
      }
    }
  });

  it('D3.4 — Agent status enum allows expected values', async () => {
    const validStatuses = ['active', 'paused', 'error', 'inactive'];

    const { data } = await supabase
      .from('erp_ai_agents_registry')
      .select('status')
      .limit(100);

    if (data && data.length > 0) {
      for (const row of data) {
        expect(validStatuses).toContain(row.status);
      }
    }
  });

  it('D3.5 — Approval queue semaphore values are valid', async () => {
    const validSemaphores = ['red', 'yellow', 'green'];

    const { data } = await supabase
      .from('erp_ai_approval_queue')
      .select('semaphore')
      .limit(100);

    if (data && data.length > 0) {
      for (const row of data) {
        expect(validSemaphores).toContain(row.semaphore);
      }
    }
  });
});
