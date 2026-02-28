import { describe, expect, test } from 'bun:test'
import {
  createStylesetState,
  DEFAULT_PAGE_CHROME,
  DEFAULT_STYLE,
  applyThemePreset,
  applyMarkdownAction,
  buildPagedDocumentCss,
  countWords,
  isPaletteStyleKey,
  parseStylesetState,
  prepareMarkdownForRender,
  serializeStylesetState,
} from '../src/lib/editor'

describe('editor helpers', () => {
  test('counts words without inflating empty whitespace', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   \n\t  ')).toBe(0)
    expect(countWords('One  two\nthree')).toBe(3)
  })

  test('builds paged CSS with page boxes, page numbers, and typography controls', () => {
    const css = buildPagedDocumentCss({
      style: {
        ...DEFAULT_STYLE,
        fontFamily: 'source',
        headingFamily: 'playfair',
        paragraphSpacing: 1.35,
        letterSpacing: 0.015,
      },
      pagePreset: 'letter',
      marginMm: 18,
      chrome: {
        ...DEFAULT_PAGE_CHROME,
        headerEnabled: true,
        headerText: 'Release Draft',
        headerPosition: 'top-left',
        headerFontSizePt: 11,
        footerEnabled: true,
        footerText: 'Internal Use',
        footerPosition: 'bottom-center',
        footerFontSizePt: 8,
      },
    })

    expect(css).toContain('@page')
    expect(css).toContain('size: 215.9mm 279.4mm;')
    expect(css).toContain('@top-left')
    expect(css).toContain('"Release Draft"')
    expect(css).toContain('font-size: 11pt;')
    expect(css).toContain('@bottom-center')
    expect(css).toContain('"Internal Use"')
    expect(css).toContain('font-size: 8pt;')
    expect(css).toContain('counter(page)')
    expect(css).toContain("font-family: 'Source Serif 4'")
    expect(css).toContain("font-family: 'Playfair Display'")
    expect(css).toContain('letter-spacing: 0.015em;')
    expect(css).toContain('print-color-adjust: exact;')
  })

  test('uses the footer size for page numbers', () => {
    const css = buildPagedDocumentCss({
      style: DEFAULT_STYLE,
      pagePreset: 'a4',
      marginMm: 16,
      chrome: {
        ...DEFAULT_PAGE_CHROME,
        footerFontSizePt: 12,
        pageNumbersEnabled: true,
        pageNumberPosition: 'top-right',
      },
    })

    expect(css).toContain('@top-right')
    expect(css).toContain('"Page " counter(page)')
    expect(css).toContain('font-size: 12pt;')
  })

  test('applies theme presets without touching typography settings', () => {
    const next = applyThemePreset(
      {
        ...DEFAULT_STYLE,
        bodyFontSize: 21,
        headingBaseSize: 30,
        lineHeight: 1.9,
        paragraphSpacing: 1.4,
      },
      'noir',
    )

    expect(next.bodyFontSize).toBe(21)
    expect(next.headingBaseSize).toBe(30)
    expect(next.lineHeight).toBe(1.9)
    expect(next.paragraphSpacing).toBe(1.4)
    expect(next.background).toBe('#191613')
    expect(next.text).toBe('#f5eadc')
    expect(next.accent).toBe('#f2a65a')
  })

  test('uses a black and white classic print style by default', () => {
    expect(DEFAULT_STYLE.fontFamily).toBe('literata')
    expect(DEFAULT_STYLE.headingFamily).toBe('libre')
    expect(DEFAULT_STYLE.background).toBe('#ffffff')
    expect(DEFAULT_STYLE.text).toBe('#111111')
    expect(DEFAULT_STYLE.accent).toBe('#111111')
  })

  test('flags only palette controls as custom-theme triggers', () => {
    expect(isPaletteStyleKey('background')).toBe(true)
    expect(isPaletteStyleKey('text')).toBe(true)
    expect(isPaletteStyleKey('accent')).toBe(true)
    expect(isPaletteStyleKey('bodyFontSize')).toBe(false)
    expect(isPaletteStyleKey('headingBaseSize')).toBe(false)
    expect(isPaletteStyleKey('lineHeight')).toBe(false)
    expect(isPaletteStyleKey('paragraphSpacing')).toBe(false)
    expect(isPaletteStyleKey('letterSpacing')).toBe(false)
  })

  test('applies markdown toolbar actions around the current selection', () => {
    const bold = applyMarkdownAction(
      {
        markdown: 'Hello world',
        selectionStart: 6,
        selectionEnd: 11,
      },
      'bold',
    )

    const list = applyMarkdownAction(
      {
        markdown: 'First\nSecond',
        selectionStart: 0,
        selectionEnd: 12,
      },
      'numbered-list',
    )

    expect(bold.markdown).toBe('Hello **world**')
    expect(list.markdown).toBe('1. First\n2. Second')
  })

  test('prepares markdown for rendering signature lines without mutating code fences', () => {
    const next = prepareMarkdownForRender(
      `Tanda Tangan: ________\n\n\`\`\`txt\nkeep ________ literal\n\`\`\``,
    )

    expect(next).toContain(
      '<span class="signature-line" aria-hidden="true" style="width: 8ch"></span>',
    )
    expect(next).toContain('```txt\nkeep ________ literal\n```')
  })

  test('serializes and parses stylesets as JSON', () => {
    const json = serializeStylesetState(
      createStylesetState({
        themePreset: 'noir',
        pagePreset: 'legal',
        marginMm: 24,
        style: {
          ...DEFAULT_STYLE,
          fontFamily: 'space',
          accent: '#f2a65a',
        },
        pageChrome: {
          ...DEFAULT_PAGE_CHROME,
          headerEnabled: true,
          headerText: 'Draft',
          headerFontSizePt: 12,
        },
      }),
    )

    const parsed = parseStylesetState(json)

    expect(parsed.version).toBe(1)
    expect(parsed.themePreset).toBe('noir')
    expect(parsed.pagePreset).toBe('legal')
    expect(parsed.marginMm).toBe(24)
    expect(parsed.style.fontFamily).toBe('space')
    expect(parsed.style.accent).toBe('#f2a65a')
    expect(parsed.pageChrome.headerEnabled).toBe(true)
    expect(parsed.pageChrome.headerText).toBe('Draft')
    expect(parsed.pageChrome.headerFontSizePt).toBe(12)
  })

  test('rejects unsupported styleset versions', () => {
    expect(() => parseStylesetState('{"version":2}')).toThrow('Unsupported styleset file.')
  })
})
