import { describe, expect, test } from 'bun:test'
import {
  MARKDOWN_STORAGE_KEY,
  readStoredMarkdown,
  removeStoredMarkdown,
  writeStoredMarkdown,
} from '../src/lib/markdown'

describe('markdown storage helpers', () => {
  test('persists, reads, and removes stored markdown from localStorage', () => {
    expect(readStoredMarkdown()).toBeNull()

    writeStoredMarkdown('# Draft\n\nBody copy')

    expect(localStorage.getItem(MARKDOWN_STORAGE_KEY)).toBe('# Draft\n\nBody copy')
    expect(readStoredMarkdown()).toBe('# Draft\n\nBody copy')

    removeStoredMarkdown()

    expect(readStoredMarkdown()).toBeNull()
    expect(localStorage.getItem(MARKDOWN_STORAGE_KEY)).toBeNull()
  })

  test('treats localStorage getter failures as missing markdown', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('denied')
      },
    })

    try {
      expect(readStoredMarkdown()).toBeNull()
      expect(writeStoredMarkdown('# Draft')).toBe(false)
      expect(removeStoredMarkdown()).toBe(false)
    } finally {
      if (descriptor) {
        Object.defineProperty(window, 'localStorage', descriptor)
      } else {
        delete (window as Window & { localStorage?: Storage }).localStorage
      }
    }
  })

  test('treats storage read failures as missing markdown', () => {
    const storage = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {},
      removeItem: () => {},
    }

    expect(readStoredMarkdown(storage)).toBeNull()
  })

  test('returns false when markdown persistence writes fail', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded')
      },
      removeItem: () => {},
    }

    expect(writeStoredMarkdown('# Draft', storage)).toBe(false)
  })

  test('returns false when markdown persistence removal fails', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {
        throw new Error('denied')
      },
    }

    expect(removeStoredMarkdown(storage)).toBe(false)
  })
})
