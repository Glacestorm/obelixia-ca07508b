/**
 * PDF Color Palette - Professional corporate colors
 * All colors are RGB arrays for jsPDF compatibility
 */

export const PDF_COLORS = {
  // Primary corporate colors
  primary: [15, 50, 120] as const,        // Deep corporate blue
  primaryLight: [30, 80, 150] as const,   // Lighter blue
  primaryDark: [10, 35, 90] as const,     // Darker blue
  
  // Secondary colors
  secondary: [50, 100, 170] as const,     // Medium blue
  accent: [34, 197, 94] as const,         // Success green
  
  // Status colors
  success: [34, 197, 94] as const,        // Green
  warning: [234, 179, 8] as const,        // Yellow/Amber
  error: [239, 68, 68] as const,          // Red
  info: [59, 130, 246] as const,          // Blue
  
  // Neutral colors
  white: [255, 255, 255] as const,
  black: [0, 0, 0] as const,
  gray: {
    50: [249, 250, 251] as const,
    100: [243, 244, 246] as const,
    200: [229, 231, 235] as const,
    300: [209, 213, 219] as const,
    400: [156, 163, 175] as const,
    500: [107, 114, 128] as const,
    600: [75, 85, 99] as const,
    700: [55, 65, 81] as const,
    800: [31, 41, 55] as const,
    900: [17, 24, 39] as const,
  },
  
  // Background colors for boxes
  backgrounds: {
    info: [235, 245, 255] as const,
    success: [236, 253, 245] as const,
    warning: [254, 249, 195] as const,
    error: [254, 226, 226] as const,
    muted: [248, 250, 252] as const,
    zebra: [245, 247, 250] as const,
  },
  
  // Border colors
  borders: {
    info: [59, 130, 246] as const,
    success: [34, 197, 94] as const,
    warning: [234, 179, 8] as const,
    error: [239, 68, 68] as const,
  },
  
  // Title colors by level
  titles: {
    h1: [15, 50, 120] as const,
    h2: [30, 80, 150] as const,
    h3: [50, 100, 170] as const,
    h4: [70, 120, 180] as const,
  },
  
  // Text colors
  text: {
    primary: [0, 0, 0] as const,
    secondary: [75, 85, 99] as const,
    muted: [120, 120, 120] as const,
    light: [156, 163, 175] as const,
  },
} as const;

// Type for RGB color tuple
export type RGBColor = readonly [number, number, number];

// Box style configurations
export const BOX_STYLES = {
  info: {
    bg: PDF_COLORS.backgrounds.info,
    border: PDF_COLORS.borders.info,
    title: [20, 60, 140] as const,
  },
  success: {
    bg: PDF_COLORS.backgrounds.success,
    border: PDF_COLORS.borders.success,
    title: [22, 101, 52] as const,
  },
  warning: {
    bg: PDF_COLORS.backgrounds.warning,
    border: PDF_COLORS.borders.warning,
    title: [161, 98, 7] as const,
  },
  error: {
    bg: PDF_COLORS.backgrounds.error,
    border: PDF_COLORS.borders.error,
    title: [153, 27, 27] as const,
  },
} as const;
