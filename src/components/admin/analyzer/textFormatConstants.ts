// Pre-computed string constants to avoid .repeat() template literals
// that cause Rollup RegExp heap exhaustion during build (OOM)

export const LINE_DOUBLE_80 = '════════════════════════════════════════════════════════════════════════════════';
export const LINE_DOUBLE_100 = '════════════════════════════════════════════════════════════════════════════════════════════════════════';
export const LINE_SINGLE_40 = '────────────────────────────────';
export const LINE_SINGLE_50 = '──────────────────────────────────────────────────';
export const LINE_SINGLE_78 = '──────────────────────────────────────────────────────────────────────────────';
export const CORNER_TOP_78 = '┌──────────────────────────────────────────────────────────────────────────────┐';
export const CORNER_BOT_78 = '└──────────────────────────────────────────────────────────────────────────────┘';

export function makeBoxHeader(label: string): string {
  const inner = label;
  const pad = Math.max(0, 78 - inner.length);
  return `${CORNER_TOP_78}\n│ ${inner}${' '.repeat(pad)}│\n${CORNER_BOT_78}`;
}
