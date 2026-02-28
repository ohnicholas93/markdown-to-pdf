/// <reference lib="dom" />

import { describe, expect, test } from 'bun:test'
import { fireEvent, render } from '@testing-library/react'
import App from '../src/App'
import { countWords } from '../src/lib/editor'

describe('App', () => {
  test('renders the default markdown preview and default stats', () => {
    const view = render(<App />)
    const editor = view.getByLabelText('Markdown editor') as HTMLTextAreaElement

    expect(view.getByRole('heading', { name: 'Editorial Markdown' })).toBeInTheDocument()
    expect(view.getByText('A4 PDF')).toBeInTheDocument()
    expect(view.getByText('12mm margin')).toBeInTheDocument()
    expect(view.getAllByText('Warm Editorial').length).toBeGreaterThan(0)
    expect(view.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument()
    expect(view.getByText(`${countWords(editor.value)} words`)).toBeInTheDocument()
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
