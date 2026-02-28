import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_STYLE,
  applyThemePreset,
  buildPaperLayout,
  buildPdfImagePlan,
  countWords,
  isPaletteStyleKey,
} from '../src/lib/editor'

describe('editor helpers', () => {
  test('counts words without inflating empty whitespace', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   \n\t  ')).toBe(0)
    expect(countWords('One  two\nthree')).toBe(3)
  })

  test('builds page layout values that reflect preset proportions and margins', () => {
    const a4Layout = buildPaperLayout(
      { ...DEFAULT_STYLE, contentWidth: 840 },
      12,
      'a4',
    )
    const letterLayout = buildPaperLayout(
      { ...DEFAULT_STYLE, contentWidth: 840 },
      20,
      'letter',
    )

    expect(a4Layout.pagePadding).toBe('48px')
    expect(a4Layout.pageMinHeight).toBe('1188px')
    expect(letterLayout.safeMarginMm).toBe(20)
    expect(parseFloat(letterLayout.pagePadding)).toBeCloseTo((840 * 20) / 215.9)
    expect(parseFloat(letterLayout.pageMinHeight)).toBeCloseTo((840 * 279.4) / 215.9)
    expect(parseFloat(letterLayout.pageMinHeight)).toBeLessThan(parseFloat(a4Layout.pageMinHeight))
  })

  test('creates a stable multi-page PDF plan for tall previews', () => {
    const plan = buildPdfImagePlan({
      canvasWidthPx: 1000,
      canvasHeightPx: 3000,
      pageWidthMm: 210,
      pageHeightMm: 297,
      marginMm: 12,
    })

    expect(plan.printableWidthMm).toBe(186)
    expect(plan.printableHeightMm).toBe(273)
    expect(plan.renderedHeightMm).toBe(558)
    expect(plan.offsetsYMm).toEqual([12, -261, -534])
  })

  test('applies theme presets without touching typography settings', () => {
    const next = applyThemePreset(
      { ...DEFAULT_STYLE, fontSize: 21, lineHeight: 1.9 },
      'noir',
    )

    expect(next.fontSize).toBe(21)
    expect(next.lineHeight).toBe(1.9)
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
    expect(isPaletteStyleKey('contentWidth')).toBe(false)
  })
})
