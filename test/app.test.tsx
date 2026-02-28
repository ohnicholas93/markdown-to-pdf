/// <reference lib="dom" />

import { afterEach, beforeEach, describe, expect, test, vi } from 'bun:test'
import { fireEvent, render, waitFor } from '@testing-library/react'
import App, { DocumentContent } from '../src/App'
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
      expect(view.getByRole('button', { name: 'Document Settings' })).toBeInTheDocument()
      expect(view.getByRole('button', { name: 'Print / Save PDF' })).toBeInTheDocument()
      expect(view.getByRole('button', { name: 'Bold' })).toBeInTheDocument()
      expect(view.getByText(`${countWords(editor.value)} words`)).toBeInTheDocument()
      expect(view.queryByText('Real print rendering')).toBeNull()
      expect(view.queryByText('Bun + Vite client-side print studio')).toBeNull()

      await waitFor(() => {
        expect(
          view.queryByRole('heading', { name: 'Editorial Markdown' }) ??
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

    fireEvent.click(view.getByRole('button', { name: 'Document Settings' }))

    expect(view.getByLabelText('Page')).toBeInTheDocument()
    expect(view.getByLabelText('Margin')).toBeInTheDocument()
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

  test('keeps the editor uncontrolled so native edits stay in sync', () => {
    const view = render(<App />)
    const editor = view.getByLabelText('Markdown editor') as HTMLTextAreaElement

    fireEvent.input(editor, { target: { value: '# Changed\n\nBody copy' } })

    expect(editor.value).toBe('# Changed\n\nBody copy')
    expect(view.getByText(`${countWords(editor.value)} words`)).toBeInTheDocument()
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

  test('theme selection is not overwritten by a throttled palette sync', () => {
    const view = render(<App />)

    fireEvent.click(view.getByRole('button', { name: 'Document Settings' }))

    const paperInput = view.getByLabelText('Paper') as HTMLInputElement
    fireEvent.input(paperInput, { target: { value: '#eeeeee' } })

    fireEvent.click(view.getByRole('button', { name: 'Slate Room' }))

    expect((view.getByLabelText('Paper') as HTMLInputElement).value).toBe('#e8ecf3')

    vi.advanceTimersByTime(1000)

    expect((view.getByLabelText('Paper') as HTMLInputElement).value).toBe('#e8ecf3')
  })

  test('exports the current styleset as JSON', async () => {
    const view = render(<App />)
    const file = new File(
      [
        JSON.stringify({
          version: 1,
          themePreset: 'noir',
          pagePreset: 'a4',
          marginMm: 16,
          style: {
            background: '#191613',
            text: '#f5eadc',
            accent: '#f2a65a',
            fontFamily: 'literata',
            headingFamily: 'libre',
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

    fireEvent.click(view.getByRole('button', { name: 'Document Settings' }))
    fireEvent.change(view.getByLabelText('Import styleset JSON'), {
      target: { files: [file] },
    })

    await waitFor(() => {
      expect((view.getByLabelText('Header size') as HTMLInputElement).value).toBe('12')
    })

    fireEvent.click(view.getByRole('button', { name: 'Export styleset' }))

    await waitFor(() => expect(createObjectURLMock).toHaveBeenCalledTimes(1))

    const [blob] = createObjectURLMock.mock.calls[0] as [Blob]
    const exported = JSON.parse(await blob.text())

    expect(exported.version).toBe(1)
    expect(exported.themePreset).toBe('noir')
    expect(exported.pagePreset).toBe('a4')
    expect(exported.style.background).toBe('#191613')
    expect(exported.pageChrome.headerFontSizePt).toBe(12)
    expect(exported.pageChrome.footerFontSizePt).toBe(8)
    expect(exported.pageChrome.pageNumbersEnabled).toBe(true)
    expect(view.getByText('Styleset exported as JSON.')).toBeInTheDocument()
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:styleset')
  })

  test('imports a styleset JSON file', async () => {
    const view = render(<App />)

    fireEvent.click(view.getByRole('button', { name: 'Document Settings' }))

    const file = new File(
      [
        JSON.stringify({
          version: 1,
          themePreset: 'custom',
          pagePreset: 'legal',
          marginMm: 24,
          style: {
            fontFamily: 'space',
            headingFamily: 'playfair',
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

    expect((view.getByLabelText('Margin') as HTMLInputElement).value).toBe('24')
    expect((view.getByLabelText('Body font') as HTMLSelectElement).value).toBe('space')
    expect((view.getByLabelText('Heading font') as HTMLSelectElement).value).toBe('playfair')
    expect((view.getByLabelText('Paper') as HTMLInputElement).value).toBe('#f4efe8')
    expect((view.getByLabelText('Header text') as HTMLInputElement).value).toBe('Imported Header')
    expect((view.getByLabelText('Header size') as HTMLInputElement).value).toBe('13')
    expect((view.getByLabelText('Footer size') as HTMLInputElement).value).toBe('10')
    expect(view.getByText('Imported styleset from custom-styleset.json.')).toBeInTheDocument()
  })

  test('shows an error when a styleset JSON file is invalid', async () => {
    const view = render(<App />)

    fireEvent.click(view.getByRole('button', { name: 'Document Settings' }))

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
