import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_PAGE_CHROME,
  DEFAULT_STYLE,
  applyThemePreset,
  applyMarkdownAction,
  buildPagedDocumentCss,
  countWords,
  isPaletteStyleKey,
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
        footerEnabled: true,
        footerText: 'Internal Use',
        footerPosition: 'bottom-center',
      },
    })

    expect(css).toContain('@page')
    expect(css).toContain('size: 215.9mm 279.4mm;')
    expect(css).toContain('@top-left')
    expect(css).toContain('"Release Draft"')
    expect(css).toContain('@bottom-center')
    expect(css).toContain('"Internal Use"')
    expect(css).toContain('counter(page)')
    expect(css).toContain("font-family: 'Source Serif 4'")
    expect(css).toContain("font-family: 'Playfair Display'")
    expect(css).toContain('letter-spacing: 0.015em;')
    expect(css).toContain('print-color-adjust: exact;')
  })

  test('applies theme presets without touching typography settings', () => {
    const next = applyThemePreset(
      { ...DEFAULT_STYLE, fontSize: 21, lineHeight: 1.9, paragraphSpacing: 1.4 },
      'noir',
    )

    expect(next.fontSize).toBe(21)
    expect(next.lineHeight).toBe(1.9)
    expect(next.paragraphSpacing).toBe(1.4)
    expect(next.background).toBe('#191613')
    expect(next.text).toBe('#f5eadc')
    expect(next.accent).toBe('#f2a65a')
  })

  test('flags only palette controls as custom-theme triggers', () => {
    expect(isPaletteStyleKey('background')).toBe(true)
    expect(isPaletteStyleKey('text')).toBe(true)
    expect(isPaletteStyleKey('accent')).toBe(true)
    expect(isPaletteStyleKey('fontSize')).toBe(false)
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
})
