/**
 * CENTRALIZED COLOR CONSTANTS
 * Single source of truth for all colors. CSS variables are defined in index.html :root.
 * Use CSS var references in components. Use hex values only for canvas/SVG/programmatic contexts.
 */

// Brand tokens — match :root in index.html exactly
export const BRAND = {
  amethyst:      '#7B2CFF',
  amethystSoft:  '#9d4edd',
  cyan:          '#18E6FF',
  executiveGold: '#f1c21b',
  plasmaGreen:   '#10b981',
  amber:         '#f59e0b',
  azureBlue:     '#3b82f6',
  stellarWhite:  '#f0f0ff',
  obsidian:      '#020204',
} as const;

// CSS variable references — use these in style props
export const THEME_COLORS = {
  amethyst:      'var(--amethyst)',
  amethystSoft:  'var(--amethyst-soft)',
  cyan:          'var(--cyan)',
  executiveGold: 'var(--executive-gold)',
  plasmaGreen:   'var(--plasma-green)',
  amber:         'var(--amber)',
  azureBlue:     'var(--azure-blue)',
  stellarWhite:  'var(--stellar-white)',
  obsidian:      'var(--obsidian)',
  textMuted:     'var(--text-muted)',
} as const;

// Status colors
export const STATUS_COLORS = {
  success: BRAND.plasmaGreen,
  warning: BRAND.amber,
  error:   '#ef4444',
  info:    BRAND.azureBlue,
  neutral: '#6b7280',
} as const;

// Agent-related colors
export const AGENT_COLORS = {
  active:  BRAND.plasmaGreen,
  pending: BRAND.amber,
  error:   '#ef4444',
  idle:    '#6b7280',
} as const;

// UI element colors
export const UI_COLORS = {
  background: {
    primary:   '#0a0a0a',
    secondary: '#111111',
    tertiary:  '#1a1a1a',
    overlay:   'rgba(0, 0, 0, 0.8)',
  },
  border: {
    default: 'rgba(255, 255, 255, 0.1)',
    hover:   'rgba(255, 255, 255, 0.2)',
    active:  'rgba(255, 255, 255, 0.3)',
  },
  text: {
    primary:   '#ffffff',
    secondary: '#a0a0a0',
    muted:     '#6b7280',
    accent:    BRAND.cyan,
  },
} as const;

// Chart/visualization colors (hex required for canvas/SVG)
export const CHART_COLORS = {
  primary:   [BRAND.amethystSoft, BRAND.cyan, BRAND.plasmaGreen, BRAND.amber, '#ef4444'],
  secondary: ['#8b5cf6', BRAND.azureBlue, '#06b6d4', '#84cc16', '#f97316'],
  gradient: {
    purple: [BRAND.amethystSoft, '#6d28d9'],
    cyan:   [BRAND.cyan, '#0891b2'],
    green:  [BRAND.plasmaGreen, '#059669'],
  },
} as const;

// Semantic model colors
export const MODEL_COLORS = {
  claude: BRAND.amethyst,
  gemini: BRAND.plasmaGreen,
  grok:   BRAND.amber,
  openai: BRAND.azureBlue,
} as const;

// Glow/shadow effects
export const GLOW_COLORS = {
  amethyst: `0 0 20px rgba(123, 44, 255, 0.5)`,
  cyan:     `0 0 20px rgba(24, 230, 255, 0.5)`,
  green:    `0 0 20px rgba(16, 185, 129, 0.5)`,
  warning:  `0 0 20px rgba(245, 158, 11, 0.5)`,
  error:    `0 0 20px rgba(239, 68, 68, 0.5)`,
} as const;
