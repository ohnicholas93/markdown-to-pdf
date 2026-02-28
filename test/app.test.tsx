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

      expect(view.getByText('A4 layout')).toBeInTheDocument()
      expect(view.getByText('Page numbers on')).toBeInTheDocument()
      expect(view.getAllByText('Warm Editorial').length).toBeGreaterThan(0)
      expect(view.getByRole('button', { name: /Print \/ Save PDF|Paginating pages/ })).toBeInTheDocument()
      expect(view.getByRole('button', { name: 'Bold' })).toBeInTheDocument()
      expect(view.getByText(`${countWords(editor.value)} words`)).toBeInTheDocument()

      await waitFor(() => {
        expect(
          view.queryByRole('heading', { name: 'Editorial Markdown' }) ??
            view.queryByText(/Paginated preview is unavailable/),
        ).toBeTruthy()
      })
    } finally {
      console.error = originalConsoleError
    }
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
})
