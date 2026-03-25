/**
 * AI Command Center — Priority Calculator
 * Formula: (Urgency*0.4) + (Impact*0.3) + (WaitTime*0.2) + (ConfidenceInv*0.1)
 */

export type SemaphoreColor = 'red' | 'yellow' | 'green';

export interface PriorityInput {
  urgency: number;       // 1-10
  impact: number;        // 1-10
  waitTimeMinutes: number;
  confidenceScore: number; // 0-100
}

export interface PriorityResult {
  score: number;         // 1-10
  semaphore: SemaphoreColor;
  label: string;
}

const WEIGHTS = {
  urgency: 0.4,
  impact: 0.3,
  waitTime: 0.2,
  confidenceInv: 0.1,
} as const;

/**
 * Normalize wait time to 1-10 scale
 * 0 min = 1, 60+ min = 10
 */
function normalizeWaitTime(minutes: number): number {
  return Math.min(10, Math.max(1, 1 + (minutes / 60) * 9));
}

/**
 * Inverse confidence: low confidence = higher priority
 * 100% confidence = 1, 0% confidence = 10
 */
function inverseConfidence(score: number): number {
  return Math.max(1, 10 - (score / 100) * 9);
}

export function calculatePriority(input: PriorityInput): PriorityResult {
  const waitNorm = normalizeWaitTime(input.waitTimeMinutes);
  const confInv = inverseConfidence(input.confidenceScore);

  const raw =
    input.urgency * WEIGHTS.urgency +
    input.impact * WEIGHTS.impact +
    waitNorm * WEIGHTS.waitTime +
    confInv * WEIGHTS.confidenceInv;

  const score = Math.round(Math.min(10, Math.max(1, raw)));

  let semaphore: SemaphoreColor;
  let label: string;

  if (score >= 8) {
    semaphore = 'red';
    label = 'Crítico';
  } else if (score >= 5) {
    semaphore = 'yellow';
    label = 'Moderado';
  } else {
    semaphore = 'green';
    label = 'Normal';
  }

  return { score, semaphore, label };
}

export function semaphoreFromScore(priority: number): SemaphoreColor {
  if (priority >= 8) return 'red';
  if (priority >= 5) return 'yellow';
  return 'green';
}
