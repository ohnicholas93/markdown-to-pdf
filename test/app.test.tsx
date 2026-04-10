/// <reference lib="dom" />

import { afterEach, beforeEach, describe, expect, test, vi } from 'bun:test'
import { readFileSync } from 'node:fs'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import App, { DocumentContent } from '../src/App'
import { IMAGE_LIBRARY_STORAGE_KEY, type ImageAsset } from '../src/lib/images'
import { countWords } from '../src/lib/editor'

describe('App', () => {
  let createObjectURLMock: ReturnType<typeof vi.fn>
  let revokeObjectURLMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    createObjectURLMock = vi.fn(() => 'blob:styleset')
    revokeObjectURLMock = vi.fn()
    URL.createObjectURL = createObjectURLMock
    URL.revokeObjectURL = revokeObjectURLMock
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('renders the default markdown preview and default stats', async () => {
    const originalConsoleError = console.error
    console.error = () => {}

    try {
      const view = render(<App />)
      const editor = view.getByLabelText('Markdown editor') as HTMLTextAreaElement

      expect(view.getByText('Markdown to PDF')).toBeInTheDocument()
      expect(view.getByText('Document Settings')).toBeInTheDocument()
      expect(view.getByText('Print / Save PDF')).toBeInTheDocument()
      expect(view.getByText('Bold')).toBeInTheDocument()
      expect(view.getByText(`${countWords(editor.value)} words`)).toBeInTheDocument()
      expect(view.queryByText('Real print rendering')).toBeNull()
      expect(view.queryByText('Bun + Vite client-side print studio')).toBeNull()

      await waitFor(() => {
        expect(
          view.queryByText('Editorial Markdown') ??
            view.queryAllByText(/Paginated preview is unavailable/)[0],
        ).toBeTruthy()
      })
    } finally {
      console.error = originalConsoleError
    }
  })

  test('keeps document settings collapsed until requested', () => {
    const view = render(<App />)

    expect(view.queryByLabelText('Page')).toBeNull()

    fireEvent.click(view.getByText('Document Settings'))

    expect(view.getByLabelText('Page')).toBeInTheDocument()
    expect(view.getByLabelText('Horizontal margin')).toBeInTheDocument()
    expect(view.getByLabelText('Vertical margin')).toBeInTheDocument()
  })

  test('supports keyboard resizing and clamps the split ratio', () => {
    const view = render(<App />)

    const separator = view.getByRole('separator', {
      name: 'Resize editor and preview panels',
    })
    const main = view.getByRole('main')

    expect(parseFloat(main.style.getPropertyValue('--editor-width'))).toBeCloseTo(42)

    fireEvent.keyDown(separator, { key: 'ArrowRight' })
    expect(parseFloat(main.style.getPropertyValue('--editor-width'))).toBeCloseTo(45)

    for (let index = 0; index < 20; index += 1) {
      fireEvent.keyDown(separator, { key: 'ArrowLeft' })
    }

    expect(parseFloat(main.style.getPropertyValue('--editor-width'))).toBeCloseTo(28)
  })

  test('uses stable list alignment and explicit page breaks in the print stylesheet', () => {
    const css = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8')

    expect(css).toContain('text-align: var(--page-list-text-align, var(--page-body-align));')
    expect(css).toContain('text-align-last: var(--page-list-text-align, var(--page-body-align));')
    expect(css).toContain('text-align: var(--page-h1-align);')
    expect(css).toContain('text-align: var(--page-display-math-align);')
    expect(css).toContain('overflow: visible !important;')
    expect(css).toContain('.markdown-body figure {')
    expect(css).toContain('.markdown-body img {')
    expect(css).toContain('.markdown-body .image-placeholder__frame {')
    expect(css).toContain(".markdown-body mjx-container[jax='SVG'] path[data-c],")
    expect(css).toContain('stroke-width: 0;')
  })

  test('uses pane-local scroll containers in the desktop workspace', () => {
    const view = render(<App />)
    const main = view.getByRole('main')
    const editor = view.getByLabelText('Markdown editor')

    expect(main.className).toContain('lg:h-[calc(100vh-5.5rem)]')
    expect(main.className).toContain('lg:min-h-0')
    expect(editor.className).toContain('overflow-auto')
  })

  test('keeps the editor uncontrolled so native edits stay in sync', () => {
    const view = render(<App />)
    const editor = view.getByLabelText('Markdown editor') as HTMLTextAreaElement

    fireEvent.input(editor, { target: { value: '# Changed\n\nBody copy' } })

    expect(editor.value).toBe('# Changed\n\nBody copy')
    expect(view.getByText(`${countWords(editor.value)} words`)).toBeInTheDocument()
  })

  test('toggles the image library sidebar from the editor pane', () => {
    const view = render(<App />)
    const sidebar = view.container.querySelector('#image-library-sidebar')
    const closeButton = view.getByRole('button', { name: 'Close image library' })

    expect(sidebar?.className ?? '').not.toMatch(/(^| )hidden( |$)/)
    expect(closeButton).toHaveAttribute('aria-expanded', 'true')
    expect(sidebar).toHaveAttribute('aria-hidden', 'false')

    fireEvent.click(closeButton)

    const openButton = view.getByRole('button', { name: 'Open image library' })

    expect(openButton).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(sidebar).toHaveAttribute('aria-hidden', 'true')

    fireEvent.click(openButton)

    expect(view.getByRole('button', { name: 'Close image library' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(sidebar).toHaveAttribute('aria-hidden', 'false')
  })

  test('renders markdown lists, raw html, and signature lines in the live preview', () => {
    const view = render(
      <DocumentContent
        markdown={`1. First item\n2. Second item\n\n**Klien**\n<br />\nTanda Tangan: ____________`}
      />,
    )

    expect(view.getByRole('list')).toBeInTheDocument()
    expect(view.getAllByRole('listitem')).toHaveLength(2)
    expect(view.container.querySelector('br')).not.toBeNull()
    expect(view.container.querySelector('.signature-line')?.getAttribute('style')).toBe(
      'width: 12ch;',
    )
  })

  test('renders managed images, captions, and missing-image placeholders in the live preview', () => {
    const imageAsset: ImageAsset = {
      id: 'asset-1',
      path: 'assets/cover.png',
      mimeType: 'image/png',
      size: 1024,
      dataUrl: 'data:image/png;base64,AAA=',
      createdAt: '2026-04-09T00:00:00.000Z',
      updatedAt: '2026-04-09T00:00:00.000Z',
    }
    const view = render(
      <DocumentContent
        markdown={`![Cover](assets/cover.png "Front cover")\n\n![Missing](assets/missing.png)`}
        imageAssets={[imageAsset]}
      />,
    )

    expect((view.getByAltText('Cover') as HTMLImageElement).src).toContain(imageAsset.dataUrl)
    expect(view.getByText('Front cover')).toBeInTheDocument()
    expect(view.getByText('Missing local image')).toBeInTheDocument()
    expect(view.getByText('assets/missing.png')).toBeInTheDocument()
  })

  test('marks short simple lists as compact and leaves loose lists splittable', () => {
    const compact = render(<DocumentContent markdown={`- One\n- Two\n- Three`} />)
    const loose = render(
      <DocumentContent
        markdown={`- One\n\n- First paragraph\n\n  Second paragraph\n\n- Three`}
      />,
    )
    const longTight = render(
      <DocumentContent
        markdown={`- One\n- ${'Long tight item '.repeat(30)}\n- Three`}
      />,
    )
    const media = render(
      <DocumentContent
        markdown={`- One\n- <img src="/logo.png" alt="Logo" />\n- Three`}
      />,
    )
    const hardBreaks = render(
      <DocumentContent
        markdown={`- One\n- first line<br />second line<br />third line<br />fourth line\n- Three`}
      />,
    )

    expect(compact.container.querySelector('ul')?.className).toContain('compact-list')
    expect(loose.container.querySelector('ul')?.className ?? '').not.toContain('compact-list')
    expect(longTight.container.querySelector('ul')?.className ?? '').not.toContain('compact-list')
    expect(media.container.querySelector('ul')?.className ?? '').not.toContain('compact-list')
    expect(hardBreaks.container.querySelector('ul')?.className ?? '').not.toContain('compact-list')
  })

  test('renders latex math in the live preview', () => {
    const originalConsoleWarn = console.warn
    console.warn = () => {}

    try {
      const markup = renderToStaticMarkup(
        <DocumentContent
          markdown={String.raw`Inline math \(E = mc^2\)

\[
\int_0^1 x^2 \, dx = \frac{1}{3}
\]

\begin{align}
f(x) &= x^2 + 2x + 1 \\
g(x) &= \frac{x^3}{3}
\end{align}`}
        />,
      )

      expect(markup).toContain('mjx-container')
      expect(markup).toContain('display="true"')
      expect(markup).toContain('E')
      expect(markup).not.toContain(String.raw`\begin{align}`)
      expect(markup).not.toContain(String.raw`\frac{1}{3}`)
    } finally {
      console.warn = originalConsoleWarn
    }
  })

  test('theme selection is not overwritten by a throttled palette sync', () => {
    const view = render(<App />)

    fireEvent.click(view.getByText('Document Settings'))

    const paperInput = view.getByLabelText('Paper') as HTMLInputElement
    fireEvent.input(paperInput, { target: { value: '#eeeeee' } })

    fireEvent.click(view.getByText('Slate Room'))

    expect((view.getByLabelText('Paper') as HTMLInputElement).value).toBe('#e8ecf3')

    vi.advanceTimersByTime(1000)

    expect((view.getByLabelText('Paper') as HTMLInputElement).value).toBe('#e8ecf3')
  })

  test('resetting the palette clears stale color drafts before delayed commits fire', () => {
    const view = render(<App />)

    fireEvent.click(view.getByText('Document Settings'))

    const paperInput = view.getByLabelText('Paper') as HTMLInputElement
    fireEvent.input(paperInput, { target: { value: '#eeeeee' } })

    fireEvent.click(view.getByText('Slate Room'))
    fireEvent.click(view.getByText('Reset settings'))

    expect((view.getByLabelText('Paper') as HTMLInputElement).value).toBe('#ffffff')

    vi.advanceTimersByTime(1000)

    expect((view.getByLabelText('Paper') as HTMLInputElement).value).toBe('#ffffff')
  })

  test('exports the current styleset as JSON', async () => {
    const view = render(<App />)
    const file = new File(
      [
        JSON.stringify({
          version: 1,
          themePreset: 'noir',
          pagePreset: 'a4',
          horizontalMarginMm: 14,
          verticalMarginMm: 20,
          style: {
            background: '#191613',
            text: '#f5eadc',
            accent: '#f2a65a',
            fontFamily: 'literata',
            headingFamily: 'libre',
            headingAlignmentMode: 'set',
            headingAlignments: {
              h1: 'right',
              h2: 'right',
              h3: 'right',
              h4: 'right',
              h5: 'right',
              h6: 'right',
            },
            displayMathAlignment: 'center',
            bodyAlignment: 'justify',
            bodyFontSize: 16,
            headingBaseSize: 22,
            lineHeight: 1.65,
            paragraphSpacing: 1.1,
            letterSpacing: 0,
          },
          pageChrome: {
            headerEnabled: false,
            headerText: '',
            headerPosition: 'top-center',
            headerFontSizePt: 12,
            footerEnabled: false,
            footerText: '',
            footerPosition: 'bottom-center',
            footerFontSizePt: 8,
            pageNumbersEnabled: true,
            pageNumberPosition: 'bottom-right',
          },
        }),
      ],
      'export-source.json',
      { type: 'application/json' },
    )

    fireEvent.click(view.getByText('Document Settings'))
    fireEvent.change(view.getByLabelText('Import styleset JSON'), {
      target: { files: [file] },
    })

    await waitFor(() => {
      expect((view.getByLabelText('Header size') as HTMLInputElement).value).toBe('12')
    })

    fireEvent.click(view.getByText('Export styleset'))

    await waitFor(() => expect(createObjectURLMock).toHaveBeenCalledTimes(1))

    const [blob] = createObjectURLMock.mock.calls[0] as [Blob]
    const exported = JSON.parse(await blob.text())

    expect(exported.version).toBe(1)
    expect(exported.themePreset).toBe('noir')
    expect(exported.pagePreset).toBe('a4')
    expect(exported.horizontalMarginMm).toBe(14)
    expect(exported.verticalMarginMm).toBe(20)
    expect(exported.style.background).toBe('#191613')
    expect(exported.style.headingAlignmentMode).toBe('set')
    expect(exported.style.headingAlignments.h1).toBe('right')
    expect(exported.style.headingAlignments.h6).toBe('right')
    expect(exported.style.displayMathAlignment).toBe('center')
    expect(exported.style.bodyAlignment).toBe('justify')
    expect(exported.pageChrome.headerFontSizePt).toBe(12)
    expect(exported.pageChrome.footerFontSizePt).toBe(8)
    expect(exported.pageChrome.pageNumbersEnabled).toBe(true)
    expect(view.getByText('Styleset exported as JSON.')).toBeInTheDocument()
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:styleset')
  })

  test('imports a styleset JSON file', async () => {
    const view = render(<App />)

    fireEvent.click(view.getByText('Document Settings'))

    const file = new File(
      [
        JSON.stringify({
          version: 1,
          themePreset: 'custom',
          pagePreset: 'legal',
          horizontalMarginMm: 22,
          verticalMarginMm: 24,
          style: {
            fontFamily: 'space',
            headingFamily: 'playfair',
            headingAlignmentMode: 'custom',
            headingAlignments: {
              h1: 'center',
              h2: 'center',
              h3: 'center',
              h4: 'center',
              h5: 'center',
              h6: 'center',
            },
            displayMathAlignment: 'right',
            bodyAlignment: 'justify',
            bodyFontSize: 19,
            headingBaseSize: 31,
            lineHeight: 1.8,
            paragraphSpacing: 1.35,
            letterSpacing: 0.02,
            background: '#f4efe8',
            text: '#221f1c',
            accent: '#bf5b2c',
          },
          pageChrome: {
            headerEnabled: true,
            headerText: 'Imported Header',
            headerPosition: 'top-left',
            headerFontSizePt: 13,
            footerEnabled: true,
            footerText: 'Imported Footer',
            footerPosition: 'bottom-right',
            footerFontSizePt: 10,
            pageNumbersEnabled: true,
            pageNumberPosition: 'bottom-left',
          },
        }),
      ],
      'custom-styleset.json',
      { type: 'application/json' },
    )

    fireEvent.change(view.getByLabelText('Import styleset JSON'), {
      target: { files: [file] },
    })

    await waitFor(() => {
      expect((view.getByLabelText('Page') as HTMLSelectElement).value).toBe('legal')
    })

    expect((view.getByLabelText('Horizontal margin') as HTMLInputElement).value).toBe('22')
    expect((view.getByLabelText('Vertical margin') as HTMLInputElement).value).toBe('24')
    expect((view.getByLabelText('Body font') as HTMLSelectElement).value).toBe('space')
    expect((view.getByLabelText('Heading font') as HTMLSelectElement).value).toBe('playfair')
    expect(view.getByRole('button', { name: 'Individual' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(view.getByRole('radio', { name: 'H1 center aligned' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(view.getByRole('radio', { name: 'Block LaTeX right aligned' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(view.getByRole('radio', { name: 'Justify body text' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect((view.getByLabelText('Paper') as HTMLInputElement).value).toBe('#f4efe8')
    expect((view.getByLabelText('Header text') as HTMLInputElement).value).toBe('Imported Header')
    expect((view.getByLabelText('Header size') as HTMLInputElement).value).toBe('13')
    expect((view.getByLabelText('Footer size') as HTMLInputElement).value).toBe('10')
    expect(view.getByText('Imported styleset from custom-styleset.json.')).toBeInTheDocument()
  })

  test('imports legacy stylesets that only specify one margin value', async () => {
    const view = render(<App />)

    fireEvent.click(view.getByText('Document Settings'))

    const file = new File(
      [
        JSON.stringify({
          version: 1,
          themePreset: 'classic',
          pagePreset: 'a4',
          marginMm: 21,
          style: {
            fontFamily: 'literata',
            headingFamily: 'libre',
            headingAlignment: 'left',
            bodyAlignment: 'left',
            bodyFontSize: 16,
            headingBaseSize: 22,
            lineHeight: 1.65,
            paragraphSpacing: 1.1,
            letterSpacing: 0,
            background: '#ffffff',
            text: '#111111',
            accent: '#111111',
          },
          pageChrome: {
            headerEnabled: false,
            headerText: '',
            headerPosition: 'top-center',
            headerFontSizePt: 9,
            footerEnabled: false,
            footerText: '',
            footerPosition: 'bottom-center',
            footerFontSizePt: 9,
            pageNumbersEnabled: true,
            pageNumberPosition: 'bottom-right',
          },
        }),
      ],
      'legacy-styleset.json',
      { type: 'application/json' },
    )

    fireEvent.change(view.getByLabelText('Import styleset JSON'), {
      target: { files: [file] },
    })

    await waitFor(() => {
      expect((view.getByLabelText('Horizontal margin') as HTMLInputElement).value).toBe('21')
    })

    expect((view.getByLabelText('Vertical margin') as HTMLInputElement).value).toBe('21')
    expect(view.getByRole('radio', { name: 'Grouped heading left aligned' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(view.getByRole('button', { name: 'Grouped' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('switching from custom heading mode to set mode copies the h1 alignment to all headings', () => {
    const view = render(<App />)

    fireEvent.click(view.getByText('Document Settings'))
    fireEvent.click(view.getByRole('button', { name: 'Individual' }))
    fireEvent.click(view.getByRole('radio', { name: 'H1 right aligned' }))
    fireEvent.click(view.getByRole('radio', { name: 'H3 center aligned' }))

    expect(view.getByRole('radio', { name: 'H3 center aligned' })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    fireEvent.click(view.getByRole('button', { name: 'Grouped' }))

    expect(view.getByRole('radio', { name: 'Grouped heading right aligned' })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    fireEvent.click(view.getByRole('button', { name: 'Individual' }))

    expect(view.getByRole('radio', { name: 'H1 right aligned' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(view.getByRole('radio', { name: 'H3 right aligned' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  test('uploads, inserts, renames, and removes local images from the editor library', async () => {
    const originalConfirm = window.confirm
    window.confirm = () => true

    try {
      const view = render(<App />)
      const editor = view.getByLabelText('Markdown editor') as HTMLTextAreaElement
      const file = new File(['image-binary'], 'diagram.png', { type: 'image/png' })

      fireEvent.change(view.getByLabelText('Import local images'), {
        target: { files: [file] },
      })

      await waitFor(() =>
        expect(view.getByDisplayValue('assets/diagram.png')).toBeInTheDocument(),
      )

      expect(localStorage.getItem(IMAGE_LIBRARY_STORAGE_KEY)).toContain('assets/diagram.png')

      fireEvent.click(view.getByText('Insert'))

      expect(editor.value).toContain('![diagram](assets/diagram.png)')

      const pathField = view.getByDisplayValue('assets/diagram.png') as HTMLInputElement
      fireEvent.change(pathField, { target: { value: 'cover shot.png' } })
      fireEvent.blur(pathField)

      await waitFor(() =>
        expect(view.getByDisplayValue('assets/cover-shot.png')).toBeInTheDocument(),
      )

      expect(editor.value).toContain('assets/cover-shot.png')
      expect(editor.value).not.toContain('assets/diagram.png')

      fireEvent.click(view.getByText('Remove'))

      await waitFor(() =>
        expect(view.queryByDisplayValue('assets/cover-shot.png')).toBeNull(),
      )

      expect(localStorage.getItem(IMAGE_LIBRARY_STORAGE_KEY)).toBeNull()
    } finally {
      window.confirm = originalConfirm
    }
  })

  test('shows an error when a styleset JSON file is invalid', async () => {
    const view = render(<App />)

    fireEvent.click(view.getByText('Document Settings'))

    const file = new File(['{"version":2}'], 'broken-styleset.json', {
      type: 'application/json',
    })

    fireEvent.change(view.getByLabelText('Import styleset JSON'), {
      target: { files: [file] },
    })

    await waitFor(() => {
      expect(view.getByText('Could not import that styleset JSON file.')).toBeInTheDocument()
    })
  })
})
