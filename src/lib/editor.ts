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

export const BODY_FONT_PRESETS = {
  space: {
    label: 'Space Grotesk',
    family: "'Space Grotesk', 'Segoe UI', sans-serif",
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

export const HEADING_FONT_PRESETS = {
  fraunces: {
    label: 'Fraunces',
    family: "'Fraunces', Georgia, serif",
  },
  playfair: {
    label: 'Playfair Display',
    family: "'Playfair Display', Georgia, serif",
  },
  cormorant: {
    label: 'Cormorant Garamond',
    family: "'Cormorant Garamond', Georgia, serif",
  },
} as const

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
export type BodyFontPresetKey = keyof typeof BODY_FONT_PRESETS
export type HeadingFontPresetKey = keyof typeof HEADING_FONT_PRESETS
export type HeaderPosition = keyof typeof HEADER_POSITIONS
export type FooterPosition = keyof typeof FOOTER_POSITIONS
export type MarginBoxPosition = keyof typeof PAGE_NUMBER_POSITIONS
export type MarkdownActionKey = (typeof MARKDOWN_ACTIONS)[number]['key']
export type StyleState = {
  fontFamily: BodyFontPresetKey
  headingFamily: HeadingFontPresetKey
  fontSize: number
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
  footerEnabled: boolean
  footerText: string
  footerPosition: FooterPosition
  pageNumbersEnabled: boolean
  pageNumberPosition: MarginBoxPosition
}
export const PALETTE_STYLE_KEYS = ['background', 'text', 'accent'] as const

export const DEFAULT_STYLE: StyleState = {
  fontFamily: 'space',
  headingFamily: 'fraunces',
  fontSize: 17,
  lineHeight: 1.65,
  paragraphSpacing: 1.1,
  letterSpacing: 0,
  background: '#f7f1e3',
  text: '#1f2329',
  accent: '#c97342',
}

export const DEFAULT_PAGE_PRESET: PagePresetKey = 'a4'
export const DEFAULT_THEME_PRESET: ThemePresetKey = 'warm'
export const DEFAULT_MARGIN_MM = 16
export const DEFAULT_PAGE_CHROME: PageChromeState = {
  headerEnabled: false,
  headerText: '',
  headerPosition: 'top-center',
  footerEnabled: false,
  footerText: '',
  footerPosition: 'bottom-center',
  pageNumbersEnabled: true,
  pageNumberPosition: 'bottom-right',
}

type PagedDocumentCssInput = {
  style: StyleState
  pagePreset: PagePresetKey
  marginMm: number
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

const clampMarginMm = (marginMm: number, pageWidthMm: number, pageHeightMm: number) => {
  const maxMargin = Math.max(8, Math.min(pageWidthMm, pageHeightMm) / 2 - 12)
  return clamp(marginMm, 8, maxMargin)
}

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
  const boxes: Record<MarginBoxPosition, string[]> = {
    'top-left': [],
    'top-center': [],
    'top-right': [],
    'bottom-left': [],
    'bottom-center': [],
    'bottom-right': [],
  }

  const headerText = chrome.headerText.trim()
  const footerText = chrome.footerText.trim()

  if (chrome.headerEnabled && headerText) {
    boxes[chrome.headerPosition].push(escapeCssContent(headerText))
  }

  if (chrome.footerEnabled && footerText) {
    boxes[chrome.footerPosition].push(escapeCssContent(footerText))
  }

  if (chrome.pageNumbersEnabled) {
    boxes[chrome.pageNumberPosition].push('"Page " counter(page)')
  }

  return (Object.entries(boxes) as [MarginBoxPosition, string[]][])
    .map(
      ([box, parts]) => `
  @${box} {
    content: ${serializeMarginContent(parts)};
  }`,
    )
    .join('\n')
}

export const buildPagedDocumentCss = ({
  style,
  pagePreset,
  marginMm,
  chrome,
}: PagedDocumentCssInput) => {
  const preset = PAGE_PRESETS[pagePreset]
  const safeMarginMm = clampMarginMm(marginMm, preset.widthMm, preset.heightMm)
  const bodyFont = BODY_FONT_PRESETS[style.fontFamily]
  const headingFont = HEADING_FONT_PRESETS[style.headingFamily]
  const chromeColor = withAlpha(style.text, 0.72)

  return `
@page {
  size: ${preset.widthMm}mm ${preset.heightMm}mm;
  margin: ${safeMarginMm}mm;
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
  font-size: ${style.fontSize}px;
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
  font-size: 2.6rem;
}

.document-root .markdown-body h2 {
  font-size: 2rem;
}

.document-root .markdown-body h3 {
  font-size: 1.55rem;
}

.document-root .markdown-body h4 {
  font-size: 1.2rem;
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
