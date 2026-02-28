/// <reference lib="dom" />

import { describe, expect, test } from 'bun:test'
import { fireEvent, render, waitFor } from '@testing-library/react'
import App from '../src/App'
import { countWords } from '../src/lib/editor'

describe('App', () => {
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
})
