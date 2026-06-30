export type ResumeFontFamilyId = 'sans' | 'serif'

export const RESUME_FONT_BASE_URL = 'https://aijianli-nextjs.oss-cn-hangzhou.aliyuncs.com/fonts/v1'

export const RESUME_FONT_FAMILY_NAMES: Record<ResumeFontFamilyId, string> = {
  sans: 'Resume Noto Sans SC',
  serif: 'Resume Noto Serif SC',
}

export const RESUME_FONT_STACKS: Record<ResumeFontFamilyId, string> = {
  sans: `"${RESUME_FONT_FAMILY_NAMES.sans}", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Noto Sans CJK SC", Arial, sans-serif`,
  serif: `"${RESUME_FONT_FAMILY_NAMES.serif}", "Songti SC", "SimSun", "Noto Serif SC", "Noto Sans SC", serif`,
}

export const RESUME_FONT_OPTIONS: ReadonlyArray<{
  readonly id: ResumeFontFamilyId
  readonly label: string
  readonly description: string
  readonly stack: string
}> = [
  {
    id: 'sans',
    label: '清晰现代',
    description: '适合大多数投递场景',
    stack: RESUME_FONT_STACKS.sans,
  },
  {
    id: 'serif',
    label: '正式文雅',
    description: '适合文字感、学术和传统风格',
    stack: RESUME_FONT_STACKS.serif,
  },
]

const FONT_WEIGHTS = [400, 500, 600, 700] as const

export function getResumeFontFamily(id: ResumeFontFamilyId | undefined): string {
  return RESUME_FONT_STACKS[id ?? 'sans']
}

export function resolveResumeFontFamilyId(
  id?: string,
  fontFamily?: string,
  fallback: ResumeFontFamilyId = 'sans',
): ResumeFontFamilyId {
  if (id === 'sans' || id === 'serif') return id
  const family = fontFamily?.toLowerCase() ?? ''
  if (
    family.includes('serif') ||
    family.includes('songti') ||
    family.includes('simsun') ||
    family.includes('georgia')
  ) {
    return 'serif'
  }
  return fallback
}

export function normalizeResumeFontTheme<T extends { readonly fontFamily?: string; readonly fontFamilyId?: string }>(
  theme: T,
  fallback: ResumeFontFamilyId = 'sans',
): T & { readonly fontFamily: string; readonly fontFamilyId: ResumeFontFamilyId } {
  const fontFamilyId = resolveResumeFontFamilyId(theme.fontFamilyId, theme.fontFamily, fallback)
  return {
    ...theme,
    fontFamilyId,
    fontFamily: getResumeFontFamily(fontFamilyId),
  }
}

export function buildResumeFontFaceCss(baseUrl: string = RESUME_FONT_BASE_URL): string {
  const normalizedBase = baseUrl.replace(/\/$/, '')
  return (Object.entries(RESUME_FONT_FAMILY_NAMES) as Array<[ResumeFontFamilyId, string]>)
    .flatMap(([id, family]) =>
  FONT_WEIGHTS.map((weight) => `
@font-face {
  font-family: "${family}";
  font-style: normal;
  font-display: block;
  font-weight: ${weight};
  src: url("${normalizedBase}/noto-${id === 'sans' ? 'sans' : 'serif'}-sc-${weight}.woff2") format("woff2");
}`)
    )
    .join('\n')
}
