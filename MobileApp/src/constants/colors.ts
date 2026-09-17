/**
 * Civic-tech design system — muted, professional, not a generic AI-dashboard palette.
 * Primary is a deep forest/teal green (civic + environmental), with a warm amber accent
 * reserved only for the primary CTA so it stands out without the app feeling colorful.
 */
export const colors = {
  // Brand
  primary: '#1F5D4C', // deep forest teal — headers, active states
  primaryDark: '#153F33',
  primaryLight: '#E7F0ED', // tinted backgrounds / selected chips
  accent: '#D97D34', // warm amber — reserved for the single most important CTA

  // Neutrals
  background: '#F7F7F5',
  surface: '#FFFFFF',
  border: '#E4E3DF',
  divider: '#ECEBE7',

  textPrimary: '#1C1E1C',
  textSecondary: '#5B5F5C',
  textMuted: '#8B8F8B',
  textInverse: '#FFFFFF',

  // Status
  success: '#2E7D5B',
  successBg: '#E7F4EE',
  warning: '#B8862B',
  warningBg: '#FBF1DF',
  danger: '#B3412F',
  dangerBg: '#FAEAE6',
  info: '#33648C',
  infoBg: '#E8F0F6',

  // Status badge mapping
  statusPending: '#B8862B',
  statusPendingBg: '#FBF1DF',
  statusAssigned: '#33648C',
  statusAssignedBg: '#E8F0F6',
  statusInProgress: '#7A4FB5',
  statusInProgressBg: '#F0EAFA',
  statusResolved: '#2E7D5B',
  statusResolvedBg: '#E7F4EE',

  overlay: 'rgba(20, 22, 20, 0.55)',
  shadow: '#000000',
};

export type ColorKey = keyof typeof colors;
