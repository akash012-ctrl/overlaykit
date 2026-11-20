/**
 * Design tokens: the one place for colours, radii, spacing, type, sizes and motion. Constants only.
 * Direction and rules: .kiro/skills/ui-design-system/SKILL.md. Text pairs are contrast-tested in
 * ui/a11y/__tests__/contrast.test.ts (4.5:1 or more, translucent backings checked over white).
 */
export const colors = {
  /** App canvas behind the camera and on Settings. */
  background: '#0B0F14',
  /** Cards and sheets. */
  surface: '#121821',
  /** Tonal buttons, the segment track, inputs. */
  surfaceRaised: '#1C2430',
  /** Chips and icon tiles. */
  surfaceHigh: '#273243',
  /** Near-opaque sheet over the camera. */
  panel: 'rgba(14,19,26,0.94)',
  /** Small floating controls over the camera. */
  scrim: 'rgba(11,15,20,0.72)',
  /** Translation chip drawn on the live image. */
  lens: 'rgba(12,16,22,0.88)',
  /** 1 dp hairline on dark surfaces; replaces shadows, which do not read on video. */
  outline: 'rgba(255,255,255,0.12)',
  /** Input borders, drag handle, selected segment edge. */
  outlineStrong: 'rgba(255,255,255,0.28)',
  /** The one action to take now. White text 5.5:1. */
  primary: '#1F63D8',
  /** Selected segment and selected row. */
  primaryContainer: '#183A6E',
  /** Icons and links on dark. */
  accentText: '#8AB4F8',
  /** Guide target ring and step accent. Drawn with ringDark beside it, never alone. */
  target: '#FFD54F',
  /** Live streaming banner. */
  dangerContainer: '#7F1D1D',
  /** Stop label and outline on dark. */
  dangerText: '#FFB4AB',
  text: '#FFFFFF',
  textBody: '#E6EAF0',
  textMuted: '#C3CCD6',
  ringLight: '#FFFFFF',
  ringDark: '#0B0F14',
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

/** 4 dp grid. Screen gutter is lg; gap inside a panel md; between panels sm. */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** sp. System font only: Devanagari and Kannada need it. The step instruction is the largest text on the dock. */
export const fontSize = { note: 14, body: 16, title: 18, screenTitle: 24, headline: 24 } as const;
export const lineHeight = { note: 22, body: 24, title: 26, screenTitle: 32, headline: 34 } as const;

export const size = { touch: 48, buttonLg: 56, shutter: 72, icon: 20, iconLg: 24, iconXl: 28, tile: 64, orb: 72 } as const;

/** Material 3 durations (ms) and curves. Every animation also has a static path under reduced motion. */
export const motion = {
  duration: { press: 100, state: 180, enter: 240, exit: 160, glide: 260 },
  easing: {
    standard: [0.2, 0, 0, 1],
    decelerate: [0.05, 0.7, 0.1, 1],
    accelerate: [0.3, 0, 0.8, 0.15],
  },
} as const;
