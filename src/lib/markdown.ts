export const MARKDOWN_STORAGE_KEY = 'markdown-to-pdf:markdown:v1'

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const coerceStorage = (storage?: StorageLike | null) => {
  if (storage) {
    return storage
  }

  try {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      return window.localStorage
    }
  } catch {
    return null
  }

  return null
}

export const readStoredMarkdown = (storage?: StorageLike | null) => {
  const target = coerceStorage(storage)

  if (!target) {
    return null
  }

  try {
    const stored = target.getItem(MARKDOWN_STORAGE_KEY)

    return stored === null ? null : stored
  } catch {
    return null
  }
}

export const writeStoredMarkdown = (markdown: string, storage?: StorageLike | null) => {
  const target = coerceStorage(storage)

  if (!target) {
    return false
  }

  try {
    target.setItem(MARKDOWN_STORAGE_KEY, markdown)
    return true
  } catch {
    return false
  }
}

export const removeStoredMarkdown = (storage?: StorageLike | null) => {
  const target = coerceStorage(storage)

  if (!target) {
    return false
  }

  try {
    target.removeItem(MARKDOWN_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
