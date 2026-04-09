import { describe, expect, test } from 'bun:test'
import {
  IMAGE_LIBRARY_STORAGE_KEY,
  buildImageMarkdownSnippet,
  buildUniqueImageAssetPath,
  countImageAssetReferences,
  normalizeImageAssetPath,
  readStoredImageAssets,
  replaceImageAssetPathReferences,
  resolveImageAssetSource,
  writeStoredImageAssets,
  type ImageAsset,
} from '../src/lib/images'

const createImageAsset = (overrides?: Partial<ImageAsset>): ImageAsset => ({
  id: 'asset-1',
  path: 'assets/diagram.png',
  mimeType: 'image/png',
  size: 2048,
  dataUrl: 'data:image/png;base64,AAA=',
  createdAt: '2026-04-09T00:00:00.000Z',
  updatedAt: '2026-04-09T00:00:00.000Z',
  ...overrides,
})

describe('image library helpers', () => {
  test('normalizes image asset paths into the local assets namespace', () => {
    expect(normalizeImageAssetPath(' Diagram Final .PNG ')).toBe('assets/Diagram-Final.png')
    expect(normalizeImageAssetPath('/assets/mockups/hero shot.webp')).toBe(
      'assets/mockups/hero-shot.webp',
    )
  })

  test('deduplicates asset paths when names collide', () => {
    expect(
      buildUniqueImageAssetPath('assets/diagram.png', ['assets/diagram.png', 'assets/diagram-2.png']),
    ).toBe('assets/diagram-3.png')
  })

  test('builds markdown snippets and rewrites references consistently', () => {
    const markdown = '![Diagram](assets/diagram.png)\n<img src="assets/diagram.png" alt="Diagram" />'

    expect(buildImageMarkdownSnippet('assets/diagram.png')).toBe('![diagram](assets/diagram.png)')
    expect(countImageAssetReferences(markdown, 'assets/diagram.png')).toBe(2)
    expect(
      replaceImageAssetPathReferences(markdown, 'assets/diagram.png', 'assets/renamed.png'),
    ).toContain('assets/renamed.png')
  })

  test('only rewrites actual image references when an asset path changes', () => {
    const markdown = [
      '![Diagram](assets/diagram.png)',
      '![Diagram](assets/diagram.png "Title")',
      '![Diagram](<assets/diagram.png> "Title")',
      '<img src="assets/diagram.png" alt="Diagram" />',
      '',
      'Literal text assets/diagram.png should stay.',
      'https://cdn.example.com/assets/diagram.png should stay.',
      '',
      '```md',
      '![Code sample](assets/diagram.png)',
      '<img src="assets/diagram.png" alt="code" />',
      '```',
    ].join('\n')

    const next = replaceImageAssetPathReferences(
      markdown,
      'assets/diagram.png',
      'assets/renamed.png',
    )

    expect(next).toContain('![Diagram](assets/renamed.png)')
    expect(next).toContain('![Diagram](assets/renamed.png "Title")')
    expect(next).toContain('![Diagram](<assets/renamed.png> "Title")')
    expect(next).toContain('<img src="assets/renamed.png" alt="Diagram" />')
    expect(next).toContain('Literal text assets/diagram.png should stay.')
    expect(next).toContain('https://cdn.example.com/assets/diagram.png should stay.')
    expect(next).toContain('![Code sample](assets/diagram.png)')
    expect(next).toContain('<img src="assets/diagram.png" alt="code" />')
    expect(countImageAssetReferences(next, 'assets/renamed.png')).toBe(4)
    expect(countImageAssetReferences(next, 'assets/diagram.png')).toBe(0)
  })

  test('persists and reads stored image assets from localStorage', () => {
    const asset = createImageAsset()

    writeStoredImageAssets([asset])

    expect(localStorage.getItem(IMAGE_LIBRARY_STORAGE_KEY)).toContain('assets/diagram.png')
    expect(readStoredImageAssets()).toEqual([asset])
  })

  test('returns undefined for missing managed asset paths and leaves external sources alone', () => {
    const asset = createImageAsset()

    expect(resolveImageAssetSource('assets/diagram.png', [asset])).toBe(asset.dataUrl)
    expect(resolveImageAssetSource('assets/missing.png', [asset])).toBeUndefined()
    expect(resolveImageAssetSource('https://example.com/image.png', [asset])).toBe(
      'https://example.com/image.png',
    )
  })
})
