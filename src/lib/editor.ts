export const PAGE_PRESETS = {
  a4: {
    label: 'A4',
    widthMm: 210,
    heightMm: 297,
  },
  letter: {
    label: 'Letter',
    widthMm: 215.9,
    heightMm: 279.4,
  },
  legal: {
    label: 'Legal',
    widthMm: 215.9,
    heightMm: 355.6,
  },
} as const

export const THEME_PRESETS = {
  classic: {
    label: 'Classic Print',
    background: '#ffffff',
    text: '#111111',
    accent: '#111111',
  },
  warm: {
    label: 'Warm Editorial',
    background: '#f7f1e3',
    text: '#1f2329',
    accent: '#c97342',
  },
  slate: {
    label: 'Slate Room',
    background: '#e8ecf3',
    text: '#18212c',
    accent: '#5271ff',
  },
  forest: {
    label: 'Field Notes',
    background: '#eef2e6',
    text: '#1b2a22',
    accent: '#3f7a57',
  },
  noir: {
    label: 'Noir Print',
    background: '#191613',
    text: '#f5eadc',
    accent: '#f2a65a',
  },
} as const

export const FONT_PRESETS = {
  libre: {
    label: 'Libre Baskerville',
    family: "'Libre Baskerville', Georgia, serif",
  },
  ebgaramond: {
    label: 'EB Garamond',
    family: "'EB Garamond', Georgia, serif",
  },
  fraunces: {
    label: 'Fraunces',
    family: "'Fraunces', Georgia, serif",
  },
  dmserif: {
    label: 'DM Serif Display',
    family: "'DM Serif Display', Georgia, serif",
  },
  playfair: {
    label: 'Playfair Display',
    family: "'Playfair Display', Georgia, serif",
  },
  cormorant: {
    label: 'Cormorant Garamond',
    family: "'Cormorant Garamond', Georgia, serif",
  },
  literata: {
    label: 'Literata',
    family: "'Literata', Georgia, serif",
  },
  spectral: {
    label: 'Spectral',
    family: "'Spectral', Georgia, serif",
  },
  crimson: {
    label: 'Crimson Pro',
    family: "'Crimson Pro', Georgia, serif",
  },
  lora: {
    label: 'Lora',
    family: "'Lora', Georgia, serif",
  },
  merriweather: {
    label: 'Merriweather',
    family: "'Merriweather', Georgia, serif",
  },
  space: {
    label: 'Space Grotesk',
    family: "'Space Grotesk', 'Segoe UI', sans-serif",
  },
  manrope: {
    label: 'Manrope',
    family: "'Manrope', 'Segoe UI', sans-serif",
  },
  work: {
    label: 'Work Sans',
    family: "'Work Sans', 'Segoe UI', sans-serif",
  },
  dmsans: {
    label: 'DM Sans',
    family: "'DM Sans', 'Segoe UI', sans-serif",
  },
  plex: {
    label: 'IBM Plex Sans',
    family: "'IBM Plex Sans', 'Segoe UI', sans-serif",
  },
  source: {
    label: 'Source Serif 4',
    family: "'Source Serif 4', Georgia, serif",
  },
} as const

export const BODY_FONT_PRESETS = FONT_PRESETS
export const HEADING_FONT_PRESETS = FONT_PRESETS

export const HEADER_POSITIONS = {
  'top-left': 'Top left',
  'top-center': 'Top center',
  'top-right': 'Top right',
} as const

export const FOOTER_POSITIONS = {
  'bottom-left': 'Bottom left',
  'bottom-center': 'Bottom center',
  'bottom-right': 'Bottom right',
} as const

export const PAGE_NUMBER_POSITIONS = {
  'top-left': 'Top left',
  'top-center': 'Top center',
  'top-right': 'Top right',
  'bottom-left': 'Bottom left',
  'bottom-center': 'Bottom center',
  'bottom-right': 'Bottom right',
} as const

export const MARKDOWN_ACTIONS = [
  { key: 'heading', label: 'H2' },
  { key: 'bold', label: 'Bold' },
  { key: 'italic', label: 'Italic' },
  { key: 'link', label: 'Link' },
  { key: 'quote', label: 'Quote' },
  { key: 'bulleted-list', label: 'Bullets' },
  { key: 'numbered-list', label: 'Numbers' },
  { key: 'code-block', label: 'Code' },
  { key: 'table', label: 'Table' },
  { key: 'rule', label: 'Rule' },
] as const

export type PagePresetKey = keyof typeof PAGE_PRESETS
export type ThemePresetKey = keyof typeof THEME_PRESETS
export type ThemeSelection = ThemePresetKey | 'custom'
export type FontPresetKey = keyof typeof FONT_PRESETS
export type BodyFontPresetKey = FontPresetKey
export type HeadingFontPresetKey = FontPresetKey
export type HeaderPosition = keyof typeof HEADER_POSITIONS
export type FooterPosition = keyof typeof FOOTER_POSITIONS
export type MarginBoxPosition = keyof typeof PAGE_NUMBER_POSITIONS
export type MarkdownActionKey = (typeof MARKDOWN_ACTIONS)[number]['key']
export const MIN_CHROME_FONT_SIZE_PT = 7
export const MAX_CHROME_FONT_SIZE_PT = 16
export const DEFAULT_CHROME_FONT_SIZE_PT = 9

export type StyleState = {
  fontFamily: BodyFontPresetKey
  headingFamily: HeadingFontPresetKey
  bodyFontSize: number
  headingBaseSize: number
  lineHeight: number
  paragraphSpacing: number
  letterSpacing: number
  background: string
  text: string
  accent: string
}
export type PageChromeState = {
  headerEnabled: boolean
  headerText: string
  headerPosition: HeaderPosition
  headerFontSizePt: number
  footerEnabled: boolean
  footerText: string
  footerPosition: FooterPosition
  footerFontSizePt: number
  pageNumbersEnabled: boolean
  pageNumberPosition: MarginBoxPosition
}
export type StylesetState = {
  version: 1
  themePreset: ThemeSelection
  pagePreset: PagePresetKey
  horizontalMarginMm: number
  verticalMarginMm: number
  style: StyleState
  pageChrome: PageChromeState
}
export const PALETTE_STYLE_KEYS = ['background', 'text', 'accent'] as const

export const DEFAULT_STYLE: StyleState = {
  fontFamily: 'literata',
  headingFamily: 'libre',
  bodyFontSize: 16,
  headingBaseSize: 22,
  lineHeight: 1.65,
  paragraphSpacing: 1.1,
  letterSpacing: 0,
  background: '#ffffff',
  text: '#111111',
  accent: '#111111',
}

export const DEFAULT_PAGE_PRESET: PagePresetKey = 'a4'
export const DEFAULT_THEME_PRESET: ThemePresetKey = 'classic'
export const DEFAULT_HORIZONTAL_MARGIN_MM = 16
export const DEFAULT_VERTICAL_MARGIN_MM = 16
export const MIN_HORIZONTAL_MARGIN_MM = 0
export const MIN_VERTICAL_MARGIN_MM = 8
export const DEFAULT_PAGE_CHROME: PageChromeState = {
  headerEnabled: false,
  headerText: '',
  headerPosition: 'top-center',
  headerFontSizePt: DEFAULT_CHROME_FONT_SIZE_PT,
  footerEnabled: false,
  footerText: '',
  footerPosition: 'bottom-center',
  footerFontSizePt: DEFAULT_CHROME_FONT_SIZE_PT,
  pageNumbersEnabled: true,
  pageNumberPosition: 'bottom-right',
}

type PagedDocumentCssInput = {
  style: StyleState
  pagePreset: PagePresetKey
  horizontalMarginMm: number
  verticalMarginMm: number
  chrome: PageChromeState
}

type MarkdownSelectionInput = {
  markdown: string
  selectionStart: number
  selectionEnd: number
}

type MarkdownEditResult = {
  markdown: string
  selectionStart: number
  selectionEnd: number
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const countWords = (markdown: string) =>
  markdown.trim().split(/\s+/).filter(Boolean).length

const UNDERLINE_PLACEHOLDER_PATTERN = /_{4,}/g
const FENCED_CODE_BLOCK_PATTERN = /(```[\s\S]*?```|~~~[\s\S]*?~~~)/g

export const prepareMarkdownForRender = (markdown: string) =>
  markdown
    .split(FENCED_CODE_BLOCK_PATTERN)
    .map((segment) => {
      if (/^(```|~~~)/.test(segment)) {
        return segment
      }

      return segment.replace(UNDERLINE_PLACEHOLDER_PATTERN, (match) => {
        const widthCh = Math.max(match.length, 4)

        return `<span class="signature-line" aria-hidden="true" style="width: ${widthCh}ch"></span>`
      })
    })
    .join('')

export const isPaletteStyleKey = (
  key: keyof StyleState,
): key is (typeof PALETTE_STYLE_KEYS)[number] =>
  PALETTE_STYLE_KEYS.includes(key as (typeof PALETTE_STYLE_KEYS)[number])

export const applyThemePreset = (
  current: StyleState,
  preset: ThemePresetKey,
): StyleState => ({
  ...current,
  background: THEME_PRESETS[preset].background,
  text: THEME_PRESETS[preset].text,
  accent: THEME_PRESETS[preset].accent,
})

const COLOR_HEX_PATTERN = /^#[0-9a-f]{6}$/i

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const readString = (value: unknown, fallback: string) =>
  typeof value === 'string' ? value : fallback

const readBoolean = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback

const readColor = (value: unknown, fallback: string) =>
  typeof value === 'string' && COLOR_HEX_PATTERN.test(value) ? value : fallback

const isPagePresetKey = (value: unknown): value is PagePresetKey =>
  typeof value === 'string' && value in PAGE_PRESETS

const isThemeSelection = (value: unknown): value is ThemeSelection =>
  value === 'custom' || (typeof value === 'string' && value in THEME_PRESETS)

const isFontPresetKey = (value: unknown): value is FontPresetKey =>
  typeof value === 'string' && value in FONT_PRESETS

const isHeaderPosition = (value: unknown): value is HeaderPosition =>
  typeof value === 'string' && value in HEADER_POSITIONS

const isFooterPosition = (value: unknown): value is FooterPosition =>
  typeof value === 'string' && value in FOOTER_POSITIONS

const isMarginBoxPosition = (value: unknown): value is MarginBoxPosition =>
  typeof value === 'string' && value in PAGE_NUMBER_POSITIONS

export const createStylesetState = ({
  themePreset,
  pagePreset,
  horizontalMarginMm,
  verticalMarginMm,
  style,
  pageChrome,
}: Omit<StylesetState, 'version'>): StylesetState => ({
  version: 1,
  themePreset,
  pagePreset,
  horizontalMarginMm,
  verticalMarginMm,
  style: { ...style },
  pageChrome: { ...pageChrome },
})

export const serializeStylesetState = (styleset: StylesetState) =>
  JSON.stringify(styleset, null, 2)

export const parseStylesetState = (input: string): StylesetState => {
  const parsed = JSON.parse(input) as unknown

  if (!isRecord(parsed) || parsed.version !== 1) {
    throw new Error('Unsupported styleset file.')
  }

  const style = isRecord(parsed.style) ? parsed.style : {}
  const pageChrome = isRecord(parsed.pageChrome) ? parsed.pageChrome : {}
  const pagePreset = isPagePresetKey(parsed.pagePreset) ? parsed.pagePreset : DEFAULT_PAGE_PRESET
  const preset = PAGE_PRESETS[pagePreset]

  return createStylesetState({
    themePreset: isThemeSelection(parsed.themePreset) ? parsed.themePreset : DEFAULT_THEME_PRESET,
    pagePreset,
    horizontalMarginMm: clampHorizontalMarginMm(
      isFiniteNumber(parsed.horizontalMarginMm)
        ? parsed.horizontalMarginMm
        : isFiniteNumber(parsed.marginMm)
          ? parsed.marginMm
          : DEFAULT_HORIZONTAL_MARGIN_MM,
      preset.widthMm,
    ),
    verticalMarginMm: clampVerticalMarginMm(
      isFiniteNumber(parsed.verticalMarginMm)
        ? parsed.verticalMarginMm
        : isFiniteNumber(parsed.marginMm)
          ? parsed.marginMm
          : DEFAULT_VERTICAL_MARGIN_MM,
      preset.heightMm,
    ),
    style: {
      fontFamily: isFontPresetKey(style.fontFamily) ? style.fontFamily : DEFAULT_STYLE.fontFamily,
      headingFamily: isFontPresetKey(style.headingFamily)
        ? style.headingFamily
        : DEFAULT_STYLE.headingFamily,
      bodyFontSize: clamp(
        isFiniteNumber(style.bodyFontSize) ? style.bodyFontSize : DEFAULT_STYLE.bodyFontSize,
        13,
        24,
      ),
      headingBaseSize: clamp(
        isFiniteNumber(style.headingBaseSize)
          ? style.headingBaseSize
          : DEFAULT_STYLE.headingBaseSize,
        18,
        36,
      ),
      lineHeight: clamp(
        isFiniteNumber(style.lineHeight) ? style.lineHeight : DEFAULT_STYLE.lineHeight,
        1.25,
        2,
      ),
      paragraphSpacing: clamp(
        isFiniteNumber(style.paragraphSpacing)
          ? style.paragraphSpacing
          : DEFAULT_STYLE.paragraphSpacing,
        0.7,
        1.7,
      ),
      letterSpacing: clamp(
        isFiniteNumber(style.letterSpacing) ? style.letterSpacing : DEFAULT_STYLE.letterSpacing,
        -0.02,
        0.08,
      ),
      background: readColor(style.background, DEFAULT_STYLE.background),
      text: readColor(style.text, DEFAULT_STYLE.text),
      accent: readColor(style.accent, DEFAULT_STYLE.accent),
    },
    pageChrome: {
      headerEnabled: readBoolean(pageChrome.headerEnabled, DEFAULT_PAGE_CHROME.headerEnabled),
      headerText: readString(pageChrome.headerText, DEFAULT_PAGE_CHROME.headerText),
      headerPosition: isHeaderPosition(pageChrome.headerPosition)
        ? pageChrome.headerPosition
        : DEFAULT_PAGE_CHROME.headerPosition,
      headerFontSizePt: clampChromeFontSizePt(
        isFiniteNumber(pageChrome.headerFontSizePt)
          ? pageChrome.headerFontSizePt
          : DEFAULT_PAGE_CHROME.headerFontSizePt,
      ),
      footerEnabled: readBoolean(pageChrome.footerEnabled, DEFAULT_PAGE_CHROME.footerEnabled),
      footerText: readString(pageChrome.footerText, DEFAULT_PAGE_CHROME.footerText),
      footerPosition: isFooterPosition(pageChrome.footerPosition)
        ? pageChrome.footerPosition
        : DEFAULT_PAGE_CHROME.footerPosition,
      footerFontSizePt: clampChromeFontSizePt(
        isFiniteNumber(pageChrome.footerFontSizePt)
          ? pageChrome.footerFontSizePt
          : DEFAULT_PAGE_CHROME.footerFontSizePt,
      ),
      pageNumbersEnabled: readBoolean(
        pageChrome.pageNumbersEnabled,
        DEFAULT_PAGE_CHROME.pageNumbersEnabled,
      ),
      pageNumberPosition: isMarginBoxPosition(pageChrome.pageNumberPosition)
        ? pageChrome.pageNumberPosition
        : DEFAULT_PAGE_CHROME.pageNumberPosition,
    },
  })
}

const clampHorizontalMarginMm = (marginMm: number, pageWidthMm: number) =>
  clamp(marginMm, MIN_HORIZONTAL_MARGIN_MM, Math.max(MIN_HORIZONTAL_MARGIN_MM, pageWidthMm / 2 - 12))

const clampVerticalMarginMm = (marginMm: number, pageHeightMm: number) =>
  clamp(marginMm, MIN_VERTICAL_MARGIN_MM, Math.max(MIN_VERTICAL_MARGIN_MM, pageHeightMm / 2 - 12))

const clampChromeFontSizePt = (fontSizePt: number) =>
  clamp(fontSizePt, MIN_CHROME_FONT_SIZE_PT, MAX_CHROME_FONT_SIZE_PT)

const escapeCssContent = (value: string) =>
  `"${value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, '\\A ')}"`

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '')
  const fallback = { red: 31, green: 35, blue: 41 }

  if (normalized.length !== 6) {
    return fallback
  }

  const parsed = Number.parseInt(normalized, 16)

  if (Number.isNaN(parsed)) {
    return fallback
  }

  return {
    red: (parsed >> 16) & 255,
    green: (parsed >> 8) & 255,
    blue: parsed & 255,
  }
}

const withAlpha = (hex: string, alpha: number) => {
  const rgb = hexToRgb(hex)
  return `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${alpha})`
}

const serializeMarginContent = (parts: string[]) => {
  if (parts.length === 0) {
    return 'none'
  }

  return parts.reduce(
    (content, part, index) => (index === 0 ? part : `${content} " · " ${part}`),
    '',
  )
}

const buildMarginBoxRules = (chrome: PageChromeState) => {
  const boxes: Record<MarginBoxPosition, { content: string[]; fontSizePt: number | null }> = {
    'top-left': { content: [], fontSizePt: null },
    'top-center': { content: [], fontSizePt: null },
    'top-right': { content: [], fontSizePt: null },
    'bottom-left': { content: [], fontSizePt: null },
    'bottom-center': { content: [], fontSizePt: null },
    'bottom-right': { content: [], fontSizePt: null },
  }

  const headerText = chrome.headerText.trim()
  const footerText = chrome.footerText.trim()

  if (chrome.headerEnabled && headerText) {
    boxes[chrome.headerPosition].content.push(escapeCssContent(headerText))
    boxes[chrome.headerPosition].fontSizePt = clampChromeFontSizePt(chrome.headerFontSizePt)
  }

  if (chrome.footerEnabled && footerText) {
    boxes[chrome.footerPosition].content.push(escapeCssContent(footerText))
    boxes[chrome.footerPosition].fontSizePt = clampChromeFontSizePt(chrome.footerFontSizePt)
  }

  if (chrome.pageNumbersEnabled) {
    boxes[chrome.pageNumberPosition].content.push('"Page " counter(page)')
    boxes[chrome.pageNumberPosition].fontSizePt = clampChromeFontSizePt(chrome.footerFontSizePt)
  }

  return (Object.entries(boxes) as [
    MarginBoxPosition,
    { content: string[]; fontSizePt: number | null },
  ][])
    .map(
      ([box, rule]) => `
  @${box} {
    content: ${serializeMarginContent(rule.content)};
    ${rule.fontSizePt === null ? '' : `font-size: ${rule.fontSizePt}pt;`}
  }`,
    )
    .join('\n')
}

export const buildPagedDocumentCss = ({
  style,
  pagePreset,
  horizontalMarginMm,
  verticalMarginMm,
  chrome,
}: PagedDocumentCssInput) => {
  const preset = PAGE_PRESETS[pagePreset]
  const safeHorizontalMarginMm = clampHorizontalMarginMm(horizontalMarginMm, preset.widthMm)
  const safeVerticalMarginMm = clampVerticalMarginMm(verticalMarginMm, preset.heightMm)
  const bodyFont = BODY_FONT_PRESETS[style.fontFamily]
  const headingFont = HEADING_FONT_PRESETS[style.headingFamily]
  const chromeColor = withAlpha(style.text, 0.72)

  return `
@page {
  size: ${preset.widthMm}mm ${preset.heightMm}mm;
  margin: ${safeVerticalMarginMm}mm ${safeHorizontalMarginMm}mm;
  ${buildMarginBoxRules(chrome)}
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

.pagedjs_pagebox,
.pagedjs_pagebox *,
.document-root,
.document-root * {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.pagedjs_pages {
  background: transparent;
}

.pagedjs_pagebox,
.pagedjs_pagebox .pagedjs_area,
.pagedjs_pagebox .pagedjs_margin {
  background: ${style.background};
  color: ${style.text};
}

.pagedjs_pagebox {
  box-shadow: 0 32px 60px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.55);
  border-radius: 24px;
  overflow: hidden;
}

.pagedjs_margin {
  font-family: ${bodyFont.family};
  font-size: 9pt;
  letter-spacing: 0.05em;
  color: ${chromeColor};
}

.document-root {
  color: ${style.text};
  font-family: ${bodyFont.family};
  font-size: ${style.bodyFontSize}px;
  line-height: ${style.lineHeight};
  letter-spacing: ${style.letterSpacing}em;
}

.document-root .markdown-body > :first-child {
  margin-top: 0;
}

.document-root .markdown-body > :last-child {
  margin-bottom: 0;
}

.document-root .markdown-body h1,
.document-root .markdown-body h2,
.document-root .markdown-body h3,
.document-root .markdown-body h4 {
  font-family: ${headingFont.family};
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin: ${style.paragraphSpacing * 1.45}rem 0 ${style.paragraphSpacing * 0.6}rem;
  break-after: avoid;
  page-break-after: avoid;
}

.document-root .markdown-body h1 {
  font-size: ${style.headingBaseSize * 1.625}px;
}

.document-root .markdown-body h2 {
  font-size: ${style.headingBaseSize * 1.25}px;
}

.document-root .markdown-body h3 {
  font-size: ${style.headingBaseSize}px;
}

.document-root .markdown-body h4 {
  font-size: ${style.headingBaseSize * 0.82}px;
}

.document-root .markdown-body h5 {
  font-size: ${style.headingBaseSize * 0.68}px;
}

.document-root .markdown-body h6 {
  font-size: ${style.headingBaseSize * 0.58}px;
}

.document-root .markdown-body p,
.document-root .markdown-body ul,
.document-root .markdown-body ol,
.document-root .markdown-body blockquote,
.document-root .markdown-body pre,
.document-root .markdown-body table,
.document-root .markdown-body hr {
  margin: 0 0 ${style.paragraphSpacing}rem;
}

.document-root .markdown-body p,
.document-root .markdown-body li {
  orphans: 3;
  widows: 3;
}

.document-root .markdown-body a {
  color: ${style.accent};
}

.document-root .markdown-body strong {
  color: color-mix(in srgb, ${style.text} 84%, ${style.accent} 16%);
}

.document-root .markdown-body hr {
  border: 0;
  border-top: 1px solid color-mix(in srgb, ${style.accent} 35%, #ffffff 35%);
  break-after: avoid;
}

.document-root .markdown-body blockquote {
  margin-left: 0;
  padding: 0.4rem 0 0.4rem 1rem;
  border-left: 3px solid ${style.accent};
  color: color-mix(in srgb, ${style.text} 82%, #ffffff 18%);
  break-inside: avoid;
}

.document-root .markdown-body ul,
.document-root .markdown-body ol {
  padding-left: 1.3rem;
}

.document-root .markdown-body li + li {
  margin-top: 0.4rem;
}

.document-root .markdown-body code {
  font-family: 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 0.92em;
  background: color-mix(in srgb, ${style.accent} 10%, white 72%);
  padding: 0.12rem 0.32rem;
  border-radius: 0.35rem;
}

.document-root .markdown-body pre {
  overflow: hidden;
  padding: 1rem 1.1rem;
  border-radius: 1rem;
  background: #201b19;
  color: #f7f1e3;
  break-inside: avoid;
  white-space: pre-wrap;
}

.document-root .markdown-body pre code {
  background: transparent;
  color: inherit;
  padding: 0;
  white-space: inherit;
}

.document-root .markdown-body table {
  width: 100%;
  border-collapse: collapse;
  overflow: hidden;
  border-radius: 1rem;
  break-inside: auto;
}

.document-root .markdown-body thead {
  display: table-header-group;
}

.document-root .markdown-body tr,
.document-root .markdown-body img,
.document-root .markdown-body figure {
  break-inside: avoid;
}

.document-root .markdown-body th,
.document-root .markdown-body td {
  padding: 0.75rem 0.85rem;
  border: 1px solid color-mix(in srgb, ${style.text} 12%, white 72%);
  text-align: left;
  vertical-align: top;
}

.document-root .markdown-body th {
  background: color-mix(in srgb, ${style.accent} 12%, white 72%);
}

@media print {
  .pagedjs_pagebox {
    box-shadow: none;
    border-radius: 0;
  }
}
`
}

const replaceSelection = (
  markdown: string,
  selectionStart: number,
  selectionEnd: number,
  replacement: string,
  nextSelectionStart: number,
  nextSelectionEnd: number,
): MarkdownEditResult => ({
  markdown:
    markdown.slice(0, selectionStart) + replacement + markdown.slice(selectionEnd),
  selectionStart: nextSelectionStart,
  selectionEnd: nextSelectionEnd,
})

const wrapSelection = (
  markdown: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
  suffix: string,
  placeholder: string,
): MarkdownEditResult => {
  const selected = markdown.slice(selectionStart, selectionEnd)
  const content = selected || placeholder
  const replacement = `${prefix}${content}${suffix}`

  return replaceSelection(
    markdown,
    selectionStart,
    selectionEnd,
    replacement,
    selectionStart + prefix.length,
    selectionStart + prefix.length + content.length,
  )
}

const prefixLines = (
  markdown: string,
  selectionStart: number,
  selectionEnd: number,
  getPrefix: (index: number) => string,
  fallbackText: string,
): MarkdownEditResult => {
  const selected = markdown.slice(selectionStart, selectionEnd) || fallbackText
  const lines = selected.split('\n')
  const replacement = lines.map((line, index) => `${getPrefix(index)}${line}`).join('\n')

  return replaceSelection(
    markdown,
    selectionStart,
    selectionEnd,
    replacement,
    selectionStart,
    selectionStart + replacement.length,
  )
}

export const applyMarkdownAction = ({
  markdown,
  selectionStart,
  selectionEnd,
}: MarkdownSelectionInput,
action: MarkdownActionKey): MarkdownEditResult => {
  switch (action) {
    case 'heading':
      return prefixLines(markdown, selectionStart, selectionEnd, () => '## ', 'Section title')
    case 'bold':
      return wrapSelection(markdown, selectionStart, selectionEnd, '**', '**', 'bold text')
    case 'italic':
      return wrapSelection(markdown, selectionStart, selectionEnd, '*', '*', 'emphasis')
    case 'link':
      return wrapSelection(
        markdown,
        selectionStart,
        selectionEnd,
        '[',
        '](https://example.com)',
        'link text',
      )
    case 'quote':
      return prefixLines(markdown, selectionStart, selectionEnd, () => '> ', 'Quoted text')
    case 'bulleted-list':
      return prefixLines(markdown, selectionStart, selectionEnd, () => '- ', 'List item')
    case 'numbered-list':
      return prefixLines(
        markdown,
        selectionStart,
        selectionEnd,
        (index) => `${index + 1}. `,
        'List item',
      )
    case 'code-block': {
      const selected = markdown.slice(selectionStart, selectionEnd) || 'const message = "Hello world"'
      const replacement = `\`\`\`ts\n${selected}\n\`\`\``

      return replaceSelection(
        markdown,
        selectionStart,
        selectionEnd,
        replacement,
        selectionStart + 6,
        selectionStart + 6 + selected.length,
      )
    }
    case 'table': {
      const replacement = `| Column | Details |\n| --- | --- |\n| Item | Value |`

      return replaceSelection(
        markdown,
        selectionStart,
        selectionEnd,
        replacement,
        selectionStart,
        selectionStart + replacement.length,
      )
    }
    case 'rule': {
      const prefix = selectionStart > 0 && !markdown.slice(0, selectionStart).endsWith('\n') ? '\n' : ''
      const suffix = selectionEnd < markdown.length && !markdown.slice(selectionEnd).startsWith('\n') ? '\n' : ''
      const replacement = `${prefix}\n---\n${suffix}`
      const nextStart = selectionStart + replacement.length

      return replaceSelection(
        markdown,
        selectionStart,
        selectionEnd,
        replacement,
        nextStart,
        nextStart,
      )
    }
  }
}
