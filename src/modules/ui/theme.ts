/**
 * One place for the colours, radii, spacing and type sizes the screens share. Constants only.
 * Every text/background pair below is at least 4.5:1 (white on primary is about 5.7:1, white on neutral about 8.6:1).
 */
export const colors = {
  background: '#0B0F14',
  surface: '#11161C',
  surfaceRaised: '#1C2530',
  /** Translucent dock and bar backings. Text always sits on these, never on the video. */
  panel: 'rgba(11,15,20,0.92)',
  bar: 'rgba(11,15,20,0.88)',
  primary: '#1565C0',
  /** Selected-row border. 3:1 or more against `surfaceRaised`. */
  accent: '#2F6FEB',
  neutral: '#37474F',
  danger: '#7F1D1D',
  /** Destructive text on a dark panel (about 11:1 on `background`). */
  dangerText: '#FFB4AB',
  text: '#FFFFFF',
  textBody: '#E6EAF0',
  textMuted: '#CFD8DC',
  textSoft: '#D9E3EE',
  textHint: '#B8C2CF',
  inputBackground: '#FFFFFF',
  inputText: '#0B0F14',
  ringLight: '#FFFFFF',
  ringDark: '#0B0F14',
} as const;

export const radius = { sm: 8, md: 12, lg: 24, pill: 28 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

/** Sizes in sp. The instruction on a step is the largest text on the Guide card. */
export const fontSize = { note: 14, body: 16, title: 18, screenTitle: 22, headline: 24 } as const;
