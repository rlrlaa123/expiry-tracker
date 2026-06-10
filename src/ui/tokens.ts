/**
 * 디자인 토큰 — docs/mockups/ 5종 HTML의 :root CSS 변수에서 추출.
 * 목업이 레이아웃·색의 기준이므로 임의 변경 금지 (DEV-GUIDE §3).
 */
export const colors = {
  bg: '#ECEAE4',
  canvas: '#FAFAF7',
  surface: '#FFFFFF',
  line: '#E4E3DC',

  ink: '#1C1E1A',
  muted: '#878D85',

  primary: '#2E7D6B',
  primarySoft: '#E4F0EC',

  /** 만료 */
  danger: '#D24B3F',
  dangerSoft: '#FBEAE8',
  /** D-7 이내 */
  orange: '#D97E2B',
  orangeSoft: '#FBF0E2',
  /** D-30 이내 */
  yellow: '#C9A227',
  yellowSoft: '#FAF4DC',
  /** 안전 (= primary) */
  green: '#2E7D6B',
  greenSoft: '#E4F0EC',
  /** 기한 미설정 */
  graySoft: '#EDECE6',
} as const;

export const radius = {
  md: 14,
  /** 칩·뱃지 등 알약형 */
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

/** 시스템 폰트 스택 — RN은 플랫폼 기본 폰트를 그대로 사용 (fontFamily 미지정) */
export const typography = {
  title: { fontSize: 22, fontWeight: '800' },
  heading: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '400' },
  small: { fontSize: 11, fontWeight: '600' },
} as const;
