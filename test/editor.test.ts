import { describe, expect, test } from 'bun:test'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import {
  applyMarkdownAstTransforms,
  createStylesetState,
  DEFAULT_DOCUMENT_TITLE,
  DEFAULT_PAGE_CHROME,
  DEFAULT_STYLE,
  applyThemePreset,
  applyMarkdownAction,
  buildPagedDocumentCss,
  countWords,
  isPaletteStyleKey,
  parseStylesetState,
  serializeStylesetState,
} from '../src/lib/editor'

const parseAndTransformMarkdown = (markdown: string) => {
  const tree = unified().use(remarkParse).parse(markdown) as {
    children: Array<Record<string, unknown>>
  }

  applyMarkdownAstTransforms(tree as never, markdown)

  return tree
}

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
        headingAlignments: {
          h1: 'center',
          h2: 'left',
          h3: 'right',
          h4: 'center',
          h5: 'left',
          h6: 'right',
        },
        displayMathAlignment: 'right',
        bodyAlignment: 'justify',
        paragraphSpacing: 1.35,
        letterSpacing: 0.015,
      },
      pagePreset: 'letter',
      horizontalMarginMm: 18,
      verticalMarginMm: 24,
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
    expect(css).toContain('margin: 24mm 18mm;')
    expect(css).toContain('@top-left')
    expect(css).toContain('"Release Draft"')
    expect(css).toContain('font-size: 11pt;')
    expect(css).toContain('@bottom-center')
    expect(css).toContain('"Internal Use"')
    expect(css).toContain('font-size: 8pt;')
    expect(css).toContain('counter(page)')
    expect(css).toContain("font-family: 'Source Serif 4'")
    expect(css).toContain("font-family: 'Playfair Display'")
    expect(css).toContain('text-align: center;')
    expect(css).toContain('.document-root .markdown-body h3 {\n  text-align: right;')
    expect(css).toContain('text-align: justify;')
    expect(css).toContain(
      '.document-root .markdown-body .compact-list {\n  break-inside: avoid;',
    )
    expect(css).toContain('.document-root .markdown-body li {\n  text-align: left;')
    expect(css).toContain('text-align-last: left;')
    expect(css).toContain('.document-root .markdown-body figure {\n  width: fit-content;')
    expect(css).toContain('.document-root .markdown-body img {\n  display: block;')
    expect(css).toContain('.document-root .markdown-body figcaption {')
    expect(css).toContain('.document-root .markdown-body .image-placeholder__frame {')
    expect(css).not.toContain(
      '.document-root .markdown-body li {\n  text-align: left;\n  text-align-last: left;\n  break-inside: avoid;',
    )
    expect(css).toContain(
      ".document-root .markdown-body mjx-container[jax='SVG'] path[data-c],\n.document-root .markdown-body mjx-container[jax='SVG'] use[data-c] {\n  stroke: none;\n  stroke-width: 0;",
    )
    expect(css).toContain("mjx-container[jax='SVG'][display='true'] {\n  display: block;\n  text-align: right;")
    expect(css).toContain('letter-spacing: 0.015em;')
    expect(css).toContain('print-color-adjust: exact;')
  })

  test('adjusts lists and blockquotes for right-aligned body copy while keeping block math separate', () => {
    const css = buildPagedDocumentCss({
      style: {
        ...DEFAULT_STYLE,
        bodyAlignment: 'right',
        displayMathAlignment: 'center',
      },
      pagePreset: 'a4',
      horizontalMarginMm: 16,
      verticalMarginMm: 16,
      chrome: DEFAULT_PAGE_CHROME,
    })

    expect(css).toContain('blockquote::before')
    expect(css).toContain('left: auto;')
    expect(css).toContain('right: 0;')
    expect(css).toContain('list-style-position: inside;')
    expect(css).toContain('padding-right: 1.3rem;')
    expect(css).toContain("mjx-container[jax='SVG'][display='true']")
    expect(css).toContain('margin: 0 auto 1.1rem auto;')
    expect(css).toContain("mjx-container[jax='SVG']:not([display='true']) > svg")
  })

  test('uses the footer size for page numbers', () => {
    const css = buildPagedDocumentCss({
      style: DEFAULT_STYLE,
      pagePreset: 'a4',
      horizontalMarginMm: 16,
      verticalMarginMm: 16,
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

  test('allows horizontal margins to collapse to zero', () => {
    const css = buildPagedDocumentCss({
      style: DEFAULT_STYLE,
      pagePreset: 'a4',
      horizontalMarginMm: 0,
      verticalMarginMm: 16,
      chrome: DEFAULT_PAGE_CHROME,
    })

    expect(css).toContain('margin: 16mm 0mm;')
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
    expect(DEFAULT_STYLE.headingAlignmentMode).toBe('set')
    expect(DEFAULT_STYLE.headingAlignments.h1).toBe('left')
    expect(DEFAULT_STYLE.headingAlignments.h6).toBe('left')
    expect(DEFAULT_STYLE.displayMathAlignment).toBe('center')
    expect(DEFAULT_STYLE.bodyAlignment).toBe('left')
    expect(DEFAULT_STYLE.background).toBe('#ffffff')
    expect(DEFAULT_STYLE.text).toBe('#111111')
    expect(DEFAULT_STYLE.accent).toBe('#111111')
  })

  test('falls back to default text alignment when a styleset uses invalid values', () => {
    const parsed = parseStylesetState(
      JSON.stringify({
        version: 1,
        themePreset: 'classic',
        pagePreset: 'a4',
        horizontalMarginMm: 16,
        verticalMarginMm: 16,
        style: {
          ...DEFAULT_STYLE,
          headingAlignments: {
            ...DEFAULT_STYLE.headingAlignments,
            h2: 'diagonal',
          },
          displayMathAlignment: 'diagonal',
          bodyAlignment: 'spread',
        },
        pageChrome: DEFAULT_PAGE_CHROME,
      }),
    )

    expect(parsed.style.headingAlignments.h2).toBe(DEFAULT_STYLE.headingAlignments.h2)
    expect(parsed.style.displayMathAlignment).toBe(DEFAULT_STYLE.displayMathAlignment)
    expect(parsed.style.bodyAlignment).toBe(DEFAULT_STYLE.bodyAlignment)
  })

  test('maps legacy single heading alignment values across all heading levels', () => {
    const parsed = parseStylesetState(
      JSON.stringify({
        version: 1,
        themePreset: 'classic',
        pagePreset: 'a4',
        horizontalMarginMm: 16,
        verticalMarginMm: 16,
        style: {
          fontFamily: DEFAULT_STYLE.fontFamily,
          headingFamily: DEFAULT_STYLE.headingFamily,
          headingAlignment: 'right',
          bodyAlignment: DEFAULT_STYLE.bodyAlignment,
          bodyFontSize: DEFAULT_STYLE.bodyFontSize,
          headingBaseSize: DEFAULT_STYLE.headingBaseSize,
          lineHeight: DEFAULT_STYLE.lineHeight,
          paragraphSpacing: DEFAULT_STYLE.paragraphSpacing,
          letterSpacing: DEFAULT_STYLE.letterSpacing,
          background: DEFAULT_STYLE.background,
          text: DEFAULT_STYLE.text,
          accent: DEFAULT_STYLE.accent,
        },
        pageChrome: DEFAULT_PAGE_CHROME,
      }),
    )

    expect(parsed.style.headingAlignments.h1).toBe('right')
    expect(parsed.style.headingAlignments.h6).toBe('right')
    expect(parsed.style.headingAlignmentMode).toBe('set')
  })

  test('infers custom heading mode when imported heading alignments differ', () => {
    const parsed = parseStylesetState(
      JSON.stringify({
        version: 1,
        themePreset: 'classic',
        pagePreset: 'a4',
        horizontalMarginMm: 16,
        verticalMarginMm: 16,
        style: {
          fontFamily: DEFAULT_STYLE.fontFamily,
          headingFamily: DEFAULT_STYLE.headingFamily,
          bodyAlignment: DEFAULT_STYLE.bodyAlignment,
          bodyFontSize: DEFAULT_STYLE.bodyFontSize,
          headingBaseSize: DEFAULT_STYLE.headingBaseSize,
          lineHeight: DEFAULT_STYLE.lineHeight,
          paragraphSpacing: DEFAULT_STYLE.paragraphSpacing,
          letterSpacing: DEFAULT_STYLE.letterSpacing,
          background: DEFAULT_STYLE.background,
          text: DEFAULT_STYLE.text,
          accent: DEFAULT_STYLE.accent,
          headingAlignments: {
            h1: 'left',
            h2: 'center',
            h3: 'left',
            h4: 'left',
            h5: 'left',
            h6: 'left',
          },
        },
        pageChrome: DEFAULT_PAGE_CHROME,
      }),
    )

    expect(parsed.style.headingAlignmentMode).toBe('custom')
  })

  test('overrides imported set mode when heading alignments disagree', () => {
    const parsed = parseStylesetState(
      JSON.stringify({
        version: 1,
        themePreset: 'classic',
        pagePreset: 'a4',
        horizontalMarginMm: 16,
        verticalMarginMm: 16,
        style: {
          fontFamily: DEFAULT_STYLE.fontFamily,
          headingFamily: DEFAULT_STYLE.headingFamily,
          headingAlignmentMode: 'set',
          headingAlignments: {
            h1: 'left',
            h2: 'right',
            h3: 'left',
            h4: 'left',
            h5: 'left',
            h6: 'left',
          },
          displayMathAlignment: DEFAULT_STYLE.displayMathAlignment,
          bodyAlignment: DEFAULT_STYLE.bodyAlignment,
          bodyFontSize: DEFAULT_STYLE.bodyFontSize,
          headingBaseSize: DEFAULT_STYLE.headingBaseSize,
          lineHeight: DEFAULT_STYLE.lineHeight,
          paragraphSpacing: DEFAULT_STYLE.paragraphSpacing,
          letterSpacing: DEFAULT_STYLE.letterSpacing,
          background: DEFAULT_STYLE.background,
          text: DEFAULT_STYLE.text,
          accent: DEFAULT_STYLE.accent,
        },
        pageChrome: DEFAULT_PAGE_CHROME,
      }),
    )

    expect(parsed.style.headingAlignmentMode).toBe('custom')
    expect(parsed.style.headingAlignments.h2).toBe('right')
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

  test('transforms signature lines in text while leaving code fences untouched', () => {
    const tree = parseAndTransformMarkdown(
      `Tanda Tangan: ________\n\n\`\`\`txt\nkeep ________ literal\n\`\`\``,
    )
    const paragraph = tree.children[0] as { children: Array<Record<string, unknown>> }
    const code = tree.children[1] as { type: string; value: string }

    expect(paragraph.children.map((child) => child.type)).toEqual(['text', 'html'])
    expect(paragraph.children[1].value).toBe(
      '<span class="signature-line" aria-hidden="true" style="width: 8ch"></span>',
    )
    expect(code.type).toBe('code')
    expect(code.value).toBe('keep ________ literal')
  })

  test('transforms escaped latex delimiters and standalone environments into math nodes', () => {
    const tree = parseAndTransformMarkdown(
      String.raw`Inline \(a^2 + b^2 = c^2\)

\[
\frac{1}{2}
\]

\begin{align}
f(x) &= x^2 \\
g(x) &= x^3
\end{align}`,
    )
    const inlineParagraph = tree.children[0] as { children: Array<Record<string, unknown>> }
    const displayMath = tree.children[1] as { type: string; value: string }
    const environmentMath = tree.children[2] as { type: string; value: string }

    expect(inlineParagraph.children.map((child) => child.type)).toEqual(['text', 'inlineMath'])
    expect(inlineParagraph.children[1].value).toBe('a^2 + b^2 = c^2')
    expect(displayMath).toMatchObject({ type: 'math', value: '\\frac{1}{2}' })
    expect(environmentMath).toMatchObject({
      type: 'math',
      value: String.raw`\begin{align}
f(x) &= x^2 \\
g(x) &= x^3
\end{align}`,
    })
  })

  test('keeps inline latex detection working after named html entities', () => {
    const tree = parseAndTransformMarkdown(String.raw`&nbsp; \(x\) and &copy; \(y\)`)
    const paragraph = tree.children[0] as { children: Array<Record<string, unknown>> }

    expect(paragraph.children.map((child) => child.type)).toEqual([
      'text',
      'inlineMath',
      'text',
      'inlineMath',
    ])
    expect(paragraph.children[0].value).toBe('\u00a0 ')
    expect(paragraph.children[1].value).toBe('x')
    expect(paragraph.children[2].value).toBe(' and \u00a9 ')
    expect(paragraph.children[3].value).toBe('y')
  })

  test('normalizes link labels without mutating destinations, titles, or raw html', () => {
    const tree = parseAndTransformMarkdown(
      String.raw`[see \(x\)](<https://example.com/\(foo\)> "title \(bar\)")

<span data-target="\[bar\]">safe</span>`,
    )
    const linkParagraph = tree.children[0] as { children: Array<Record<string, unknown>> }
    const link = linkParagraph.children[0] as {
      children: Array<Record<string, unknown>>
      title: string
      type: string
      url: string
    }
    const htmlParagraph = tree.children[1] as { children: Array<Record<string, unknown>> }

    expect(link.type).toBe('link')
    expect(link.url).toBe('https://example.com/(foo)')
    expect(link.title).toBe('title (bar)')
    expect(link.children.map((child) => child.type)).toEqual(['text', 'inlineMath'])
    expect(link.children[0].value).toBe('see ')
    expect(link.children[1].value).toBe('x')
    expect(htmlParagraph.children.map((child) => child.type)).toEqual(['html', 'text', 'html'])
    expect(htmlParagraph.children[0].value).toBe('<span data-target="\\[bar\\]">')
    expect(htmlParagraph.children[1].value).toBe('safe')
    expect(htmlParagraph.children[2].value).toBe('</span>')
  })

  test('keeps explicit and collapsed reference links aligned with their definitions', () => {
    const explicitTree = parseAndTransformMarkdown(
      String.raw`[see \(x\)][ref \(x\)]

[ref \(x\)]: https://example.com/\(foo\) "title \(bar\)"`,
    )
    const explicitReferenceParagraph = explicitTree.children[0] as {
      children: Array<Record<string, unknown>>
    }
    const explicitReference = explicitReferenceParagraph.children[0] as {
      children: Array<Record<string, unknown>>
      identifier: string
      type: string
    }
    const explicitDefinition = explicitTree.children[1] as {
      identifier: string
      title: string
      type: string
      url: string
    }

    expect(explicitReference.type).toBe('linkReference')
    expect(explicitReference.identifier).toBe(explicitDefinition.identifier)
    expect(explicitReference.children.map((child) => child.type)).toEqual(['text', 'inlineMath'])
    expect(explicitDefinition).toMatchObject({
      type: 'definition',
      url: 'https://example.com/(foo)',
      title: 'title (bar)',
    })

    const collapsedTree = parseAndTransformMarkdown(
      String.raw`[see \(x\)][]

[see \(x\)]: https://example.com/\(foo\)`,
    )
    const collapsedReferenceParagraph = collapsedTree.children[0] as {
      children: Array<Record<string, unknown>>
    }
    const collapsedReference = collapsedReferenceParagraph.children[0] as {
      children: Array<Record<string, unknown>>
      identifier: string
      type: string
    }
    const collapsedDefinition = collapsedTree.children[1] as {
      identifier: string
      type: string
      url: string
    }

    expect(collapsedReference.type).toBe('linkReference')
    expect(collapsedReference.identifier).toBe(collapsedDefinition.identifier)
    expect(collapsedReference.children.map((child) => child.type)).toEqual(['text', 'inlineMath'])
    expect(collapsedDefinition).toMatchObject({
      type: 'definition',
      url: 'https://example.com/(foo)',
    })
  })

  test('preserves list and blockquote containment for display math paragraphs', () => {
    const tree = parseAndTransformMarkdown(
      String.raw`- item

  \begin{align}
  f(x) &= x^2 \\
  g(x) &= x^3
  \end{align}

> quote
>
> \[
> \frac{1}{2}
> \]`,
    )
    const list = tree.children[0] as {
      children: Array<{ children: Array<Record<string, unknown>> }>
      type: string
    }
    const listMath = list.children[0].children[1] as { type: string; value: string }
    const blockquote = tree.children[1] as { children: Array<Record<string, unknown>>; type: string }
    const blockquoteMath = blockquote.children[1] as { type: string; value: string }

    expect(list.type).toBe('list')
    expect(listMath).toMatchObject({
      type: 'math',
      value: String.raw`\begin{align}
f(x) &= x^2 \\
g(x) &= x^3
\end{align}`,
    })
    expect(blockquote.type).toBe('blockquote')
    expect(blockquoteMath).toMatchObject({ type: 'math', value: '\\frac{1}{2}' })
  })

  test('serializes and parses stylesets as JSON', () => {
    const json = serializeStylesetState(
      createStylesetState({
        documentTitle: 'Specimen Draft',
        themePreset: 'noir',
        pagePreset: 'legal',
        horizontalMarginMm: 22,
        verticalMarginMm: 24,
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
    expect(parsed.documentTitle).toBe('Specimen Draft')
    expect(parsed.themePreset).toBe('noir')
    expect(parsed.pagePreset).toBe('legal')
    expect(parsed.horizontalMarginMm).toBe(22)
    expect(parsed.verticalMarginMm).toBe(24)
    expect(parsed.style.fontFamily).toBe('space')
    expect(parsed.style.accent).toBe('#f2a65a')
    expect(parsed.style.headingAlignmentMode).toBe('set')
    expect(parsed.pageChrome.headerEnabled).toBe(true)
    expect(parsed.pageChrome.headerText).toBe('Draft')
    expect(parsed.pageChrome.headerFontSizePt).toBe(12)
  })

  test('parses legacy stylesets with a single margin value for both axes', () => {
    const parsed = parseStylesetState(
      JSON.stringify({
        version: 1,
        themePreset: 'classic',
        pagePreset: 'letter',
        marginMm: 19,
        style: DEFAULT_STYLE,
        pageChrome: DEFAULT_PAGE_CHROME,
      }),
    )

    expect(parsed.horizontalMarginMm).toBe(19)
    expect(parsed.verticalMarginMm).toBe(19)
    expect(parsed.documentTitle).toBe(DEFAULT_DOCUMENT_TITLE)
  })

  test('rejects unsupported styleset versions', () => {
    expect(() => parseStylesetState('{"version":2}')).toThrow('Unsupported styleset file.')
  })
})
