/**
 * Safe Font Configuration for jsPDF
 * Only use fonts guaranteed to work in jsPDF
 */

// Safe fonts available in jsPDF by default
export const SAFE_FONTS = {
  // Primary fonts
  title: { family: 'helvetica', style: 'bold' as const },
  subtitle: { family: 'helvetica', style: 'normal' as const },
  body: { family: 'times', style: 'normal' as const },
  bodyBold: { family: 'times', style: 'bold' as const },
  code: { family: 'courier', style: 'normal' as const },
  
  // Font sizes
  sizes: {
    cover: 28,
    mainTitle: 20,
    h1: 16,
    h2: 14,
    h3: 12,
    h4: 11,
    body: 9,
    small: 8,
    tiny: 7,
    footer: 7,
  },
  
  // Line heights
  lineHeights: {
    normal: 4.5,
    compact: 3.5,
    loose: 6,
    table: 3.5,
  },
} as const;

// Font weight mappings for jsPDF
export const FONT_STYLES = {
  normal: 'normal',
  bold: 'bold',
  italic: 'italic',
  bolditalic: 'bolditalic',
} as const;

// Page layout configuration
export const PAGE_LAYOUT = {
  margin: 18,
  headerHeight: 15,
  footerHeight: 12,
  
  // Spacing
  spacing: {
    section: 12,
    paragraph: 6,
    bullet: 4,
    table: 8,
  },
  
  // Page dimensions (A4)
  a4: {
    width: 210,
    height: 297,
  },
} as const;

// Unicode replacement map for text sanitization
export const UNICODE_REPLACEMENTS: Record<string, string> = {
  // Emojis to text equivalents
  '\u{1F4A1}': '[i]',     // 💡
  '\u{1F4CA}': '[#]',     // 📊
  '\u{1F3AF}': '[>]',     // 🎯
  '\u{1F4C8}': '[^]',     // 📈
  '\u{1F512}': '[*]',     // 🔒
  '\u2705': '[OK]',       // ✅
  '\u274C': '[X]',        // ❌
  '\u26A0': '[!]',        // ⚠️
  '\u{1F680}': '[>>]',    // 🚀
  '\u{1F4B0}': '[EUR]',   // 💰
  '\u{1F3E6}': '[B]',     // 🏦
  '\u{1F310}': '[W]',     // 🌐
  '\u{1F4CB}': '[=]',     // 📋
  '\u{1F510}': '[*]',     // 🔐
  '\u2B50': '[*]',        // ⭐
  
  // Smart quotes
  '\u2018': "'",          // '
  '\u2019': "'",          // '
  '\u201C': '"',          // "
  '\u201D': '"',          // "
  
  // Dashes and special chars
  '\u2013': '-',          // en-dash
  '\u2014': '--',         // em-dash
  '\u2026': '...',        // ellipsis
  '\u00A0': ' ',          // non-breaking space
  '\u20AC': 'EUR',        // €
  '\u2022': '-',          // bullet
  '\u00B7': '-',          // middle dot
  '\u2192': '->',         // arrow
  '\u2713': '[OK]',       // check
  '\u2717': '[X]',        // x mark
  '\u00A9': '(c)',        // ©
  '\u00AE': '(R)',        // ®
  '\u2122': '(TM)',       // ™
};

// Text sanitization function
export const sanitizeForPDF = (text: string): string => {
  if (!text) return '';
  
  let result = text;
  
  // Apply unicode replacements
  for (const [char, replacement] of Object.entries(UNICODE_REPLACEMENTS)) {
    result = result.replace(new RegExp(char, 'g'), replacement);
  }
  
  // Remove remaining emojis
  result = result.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
  
  // Replace accented characters for safe rendering
  result = result
    .replace(/[\u00E0\u00E1\u00E2\u00E3\u00E4\u00E5]/g, 'a')
    .replace(/[\u00C0\u00C1\u00C2\u00C3\u00C4\u00C5]/g, 'A')
    .replace(/[\u00E8\u00E9\u00EA\u00EB]/g, 'e')
    .replace(/[\u00C8\u00C9\u00CA\u00CB]/g, 'E')
    .replace(/[\u00EC\u00ED\u00EE\u00EF]/g, 'i')
    .replace(/[\u00CC\u00CD\u00CE\u00CF]/g, 'I')
    .replace(/[\u00F2\u00F3\u00F4\u00F5\u00F6]/g, 'o')
    .replace(/[\u00D2\u00D3\u00D4\u00D5\u00D6]/g, 'O')
    .replace(/[\u00F9\u00FA\u00FB\u00FC]/g, 'u')
    .replace(/[\u00D9\u00DA\u00DB\u00DC]/g, 'U')
    .replace(/\u00F1/g, 'n')
    .replace(/\u00D1/g, 'N')
    .replace(/\u00E7/g, 'c')
    .replace(/\u00C7/g, 'C');
  
  // Remove any remaining non-ASCII
  result = result.replace(/[^\x00-\x7F]/g, '');
  
  return result;
};
