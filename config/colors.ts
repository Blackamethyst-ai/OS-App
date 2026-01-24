/**
 * CENTRALIZED COLOR CONSTANTS
 * CSS variable references and common colors used throughout the app.
 */

// CSS Variable References (defined in globals.css)
export const THEME_COLORS = {
  // Primary accent colors (CSS variables)
  amethyst: 'var(--amethyst)',       // #9d4edd - Primary purple
  cyan: 'var(--cyan)',               // #22d3ee - Accent cyan
  plasmaGreen: 'var(--plasma-green)', // #10b981 - Success/active green

  // Raw hex values for programmatic use
  amethystHex: '#9d4edd',
  cyanHex: '#22d3ee',
  plasmaGreenHex: '#10b981',
} as const;

// Status colors
export const STATUS_COLORS = {
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  neutral: '#6b7280',
} as const;

// Agent-related colors
export const AGENT_COLORS = {
  active: '#10b981',
  pending: '#f59e0b',
  error: '#ef4444',
  idle: '#6b7280',
} as const;

// UI element colors
export const UI_COLORS = {
  background: {
    primary: '#0a0a0a',
    secondary: '#111111',
    tertiary: '#1a1a1a',
    overlay: 'rgba(0, 0, 0, 0.8)',
  },
  border: {
    default: 'rgba(255, 255, 255, 0.1)',
    hover: 'rgba(255, 255, 255, 0.2)',
    active: 'rgba(255, 255, 255, 0.3)',
  },
  text: {
    primary: '#ffffff',
    secondary: '#a0a0a0',
    muted: '#6b7280',
    accent: '#22d3ee',
  },
} as const;

// Chart/visualization colors
export const CHART_COLORS = {
  primary: ['#9d4edd', '#22d3ee', '#10b981', '#f59e0b', '#ef4444'],
  secondary: ['#8b5cf6', '#3b82f6', '#06b6d4', '#84cc16', '#f97316'],
  gradient: {
    purple: ['#9d4edd', '#6d28d9'],
    cyan: ['#22d3ee', '#0891b2'],
    green: ['#10b981', '#059669'],
  },
} as const;

// Semantic model colors
export const MODEL_COLORS = {
  claude: '#9d4edd',    // Purple for Claude/Anthropic
  gemini: '#10b981',    // Green for Google/Gemini
  grok: '#f59e0b',      // Amber for xAI/Grok
  openai: '#3b82f6',    // Blue for OpenAI
} as const;

// Glow/shadow effects
export const GLOW_COLORS = {
  amethyst: '0 0 20px rgba(157, 78, 221, 0.5)',
  cyan: '0 0 20px rgba(34, 211, 238, 0.5)',
  green: '0 0 20px rgba(16, 185, 129, 0.5)',
  warning: '0 0 20px rgba(245, 158, 11, 0.5)',
  error: '0 0 20px rgba(239, 68, 68, 0.5)',
} as const;
