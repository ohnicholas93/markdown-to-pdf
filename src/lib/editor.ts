export const DEFAULT_STYLE = {
  fontSize: 17,
  lineHeight: 1.65,
  contentWidth: 760,
  background: '#f7f1e3',
  text: '#1f2329',
  accent: '#c97342',
}

export const DEFAULT_PAGE_PRESET = 'a4'
export const DEFAULT_THEME_PRESET = 'warm'
export const DEFAULT_MARGIN_MM = 12

export const PAGE_PRESETS = {
  a4: {
    label: 'A4',
    pdfFormat: 'a4',
    widthMm: 210,
    heightMm: 297,
  },
  letter: {
    label: 'Letter',
    pdfFormat: 'letter',
    widthMm: 215.9,
    heightMm: 279.4,
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

export type StyleState = typeof DEFAULT_STYLE
export type PagePresetKey = keyof typeof PAGE_PRESETS
export type ThemePresetKey = keyof typeof THEME_PRESETS
export type ThemeSelection = ThemePresetKey | 'custom'
export const PALETTE_STYLE_KEYS = ['background', 'text', 'accent'] as const

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
  const maxMargin = Math.max(0, Math.min(pageWidthMm, pageHeightMm) / 2 - 1)
  return clamp(marginMm, 0, maxMargin)
}

export const buildPaperLayout = (
  style: StyleState,
  marginMm: number,
  presetKey: PagePresetKey,
) => {
  const preset = PAGE_PRESETS[presetKey]
  const safeMarginMm = clampMarginMm(marginMm, preset.widthMm, preset.heightMm)

  return {
    safeMarginMm,
    pageWidth: `${style.contentWidth}px`,
    pagePadding: `${(style.contentWidth * safeMarginMm) / preset.widthMm}px`,
    pageMinHeight: `${(style.contentWidth * preset.heightMm) / preset.widthMm}px`,
  }
}

type PdfImagePlanInput = {
  canvasWidthPx: number
  canvasHeightPx: number
  pageWidthMm: number
  pageHeightMm: number
  marginMm: number
}

export const buildPdfImagePlan = ({
  canvasWidthPx,
  canvasHeightPx,
  pageWidthMm,
  pageHeightMm,
  marginMm,
}: PdfImagePlanInput) => {
  const safeMarginMm = clampMarginMm(marginMm, pageWidthMm, pageHeightMm)
  const printableWidthMm = pageWidthMm - safeMarginMm * 2
  const printableHeightMm = pageHeightMm - safeMarginMm * 2
  const renderedHeightMm = (canvasHeightPx * printableWidthMm) / canvasWidthPx
  const offsetsYMm = [safeMarginMm]

  let heightLeftMm = renderedHeightMm - printableHeightMm

  while (heightLeftMm > 0) {
    offsetsYMm.push(heightLeftMm - renderedHeightMm + safeMarginMm)
    heightLeftMm -= printableHeightMm
  }

  return {
    safeMarginMm,
    printableWidthMm,
    printableHeightMm,
    renderedHeightMm,
    offsetsYMm,
  }
}
