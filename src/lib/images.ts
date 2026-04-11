export const IMAGE_LIBRARY_STORAGE_KEY = 'markdown-to-pdf:image-library:v1'
const DEFAULT_ASSET_DIRECTORY = 'assets'
const DEFAULT_IMAGE_ALT_TEXT = 'Image'

export type ImageAsset = {
  id: string
  path: string
  mimeType: string
  size: number
  dataUrl: string
  createdAt: string
  updatedAt: string
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const IMAGE_FILE_EXTENSION_PATTERN = /\.[a-z0-9]+$/i

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const sanitizePathSegment = (value: string) =>
  value
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) =>
      segment
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9._-]/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^[-_.]+|[-_.]+$/g, ''),
    )
    .filter(Boolean)

const splitAssetStemAndExtension = (value: string) => {
  const extensionMatch = value.match(IMAGE_FILE_EXTENSION_PATTERN)

  if (!extensionMatch) {
    return {
      stem: value,
      extension: '',
    }
  }

  return {
    stem: value.slice(0, -extensionMatch[0].length),
    extension: extensionMatch[0].toLowerCase(),
  }
}

const fallbackAssetStem = (value: string) => {
  const sanitized = sanitizePathSegment(value).join('-')

  return sanitized || 'image'
}

export const normalizeImageAssetPath = (input: string) => {
  const normalized = input.trim().replace(/\\/g, '/')
  const withoutLeadingSlash = normalized.replace(/^\/+/, '')
  const rawSegments = sanitizePathSegment(withoutLeadingSlash)

  if (rawSegments.length === 0) {
    return `${DEFAULT_ASSET_DIRECTORY}/image`
  }

  const [firstSegment, ...restSegments] = rawSegments
  const fileSegments =
    firstSegment.toLowerCase() === DEFAULT_ASSET_DIRECTORY ? restSegments : rawSegments

  if (fileSegments.length === 0) {
    return `${DEFAULT_ASSET_DIRECTORY}/image`
  }

  const filename = fileSegments.at(-1) ?? 'image'
  const parentSegments = fileSegments.slice(0, -1)
  const { stem, extension } = splitAssetStemAndExtension(filename)
  const safeStem = fallbackAssetStem(stem || filename)

  return [DEFAULT_ASSET_DIRECTORY, ...parentSegments, `${safeStem}${extension}`].join('/')
}

export const buildUniqueImageAssetPath = (desiredPath: string, existingPaths: Iterable<string>) => {
  const normalizedPath = normalizeImageAssetPath(desiredPath)
  const existingSet = new Set(Array.from(existingPaths, (path) => path.toLowerCase()))

  if (!existingSet.has(normalizedPath.toLowerCase())) {
    return normalizedPath
  }

  const segments = normalizedPath.split('/')
  const filename = segments.at(-1) ?? 'image'
  const parentDirectory = segments.slice(0, -1)
  const { stem, extension } = splitAssetStemAndExtension(filename)
  let counter = 2

  while (counter < 10_000) {
    const candidate = [...parentDirectory, `${stem}-${counter}${extension}`].join('/')

    if (!existingSet.has(candidate.toLowerCase())) {
      return candidate
    }

    counter += 1
  }

  return [...parentDirectory, `${stem}-${Date.now()}${extension}`].join('/')
}

export const createImageAssetPath = (name: string, existingPaths: Iterable<string>) =>
  buildUniqueImageAssetPath(name, existingPaths)

export const isManagedImagePath = (src: string) =>
  normalizeImageAssetPath(src) === src.trim().replace(/\\/g, '/').replace(/^\/+/, '')

export const buildImageMarkdownSnippet = (assetPath: string, altText?: string) =>
  `![${(altText?.trim() || getImageAltText(assetPath)).replace(/\]/g, '\\]')}](${assetPath})`

export const getImageAltText = (assetPath: string) => {
  const filename = assetPath.split('/').at(-1) ?? assetPath
  const stem = filename.replace(IMAGE_FILE_EXTENSION_PATTERN, '')
  const normalized = stem
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || DEFAULT_IMAGE_ALT_TEXT
}

export const replaceImageAssetPathReferences = (
  markdown: string,
  previousPath: string,
  nextPath: string,
) => {
  if (!previousPath || previousPath === nextPath) {
    return markdown
  }

  let isInsideFence = false
  let activeFenceMarker = ''

  const replaceMarkdownImageSources = (line: string) =>
    line.replace(
      /!\[[^\]]*]\((<([^>\n]+)>|([^\s)]+))([^)]*)\)/g,
      (match, destinationToken: string, angleDestination: string | undefined, plainDestination: string | undefined) => {
        const destination = angleDestination ?? plainDestination ?? ''

        if (destination !== previousPath) {
          return match
        }

        const nextDestinationToken = angleDestination ? `<${nextPath}>` : nextPath

        return match.replace(destinationToken, nextDestinationToken)
      },
    )

  const replaceHtmlImageSources = (line: string) =>
    line.replace(
      /<img\b[^>]*\bsrc\s*=\s*(['"])([^'"]+)\1[^>]*>/gi,
      (match, quote: string, source: string) => {
        if (source !== previousPath) {
          return match
        }

        return match.replace(`${quote}${source}${quote}`, `${quote}${nextPath}${quote}`)
      },
    )

  return markdown
    .split('\n')
    .map((line) => {
      const fenceMatch = line.match(/^\s*(```+|~~~+)/)

      if (fenceMatch) {
        const marker = fenceMatch[1][0]

        if (!isInsideFence) {
          isInsideFence = true
          activeFenceMarker = marker
        } else if (activeFenceMarker === marker) {
          isInsideFence = false
          activeFenceMarker = ''
        }

        return line
      }

      if (isInsideFence) {
        return line
      }

      return replaceHtmlImageSources(replaceMarkdownImageSources(line))
    })
    .join('\n')
}

export const countImageAssetReferences = (markdown: string, assetPath: string) => {
  if (!assetPath) {
    return 0
  }

  let count = 0
  let isInsideFence = false
  let activeFenceMarker = ''

  for (const line of markdown.split('\n')) {
    const fenceMatch = line.match(/^\s*(```+|~~~+)/)

    if (fenceMatch) {
      const marker = fenceMatch[1][0]

      if (!isInsideFence) {
        isInsideFence = true
        activeFenceMarker = marker
      } else if (activeFenceMarker === marker) {
        isInsideFence = false
        activeFenceMarker = ''
      }

      continue
    }

    if (isInsideFence) {
      continue
    }

    line.replace(
      /!\[[^\]]*]\((<([^>\n]+)>|([^\s)]+))([^)]*)\)/g,
      (
        _match: string,
        _destinationToken: string,
        angleDestination: string | undefined,
        plainDestination: string | undefined,
      ) => {
        if ((angleDestination ?? plainDestination ?? '') === assetPath) {
          count += 1
        }

        return _match
      },
    )

    line.replace(
      /<img\b[^>]*\bsrc\s*=\s*(['"])([^'"]+)\1[^>]*>/gi,
      (_match: string, _quote: string, source: string) => {
        if (source === assetPath) {
          count += 1
        }

        return _match
      },
    )
  }

  return count
}

export const formatFileSize = (size: number) => {
  if (!Number.isFinite(size) || size < 1024) {
    return `${Math.max(0, Math.round(size || 0))} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

export const resolveImageAssetSource = (src: string | undefined, assets: ImageAsset[]) => {
  if (!src) {
    return undefined
  }

  const trimmedSrc = src.trim()

  if (!trimmedSrc) {
    return undefined
  }

  const normalizedManagedPath = normalizeImageAssetPath(trimmedSrc)
  const managedMatch = assets.find(
    (asset) => asset.path === trimmedSrc || asset.path === normalizedManagedPath,
  )

  if (isManagedImagePath(trimmedSrc) && !managedMatch) {
    return undefined
  }

  return managedMatch?.dataUrl ?? trimmedSrc
}

export const readStoredImageAssets = (storage?: StorageLike | null): ImageAsset[] => {
  const resolvedStorage = coerceStorage(storage)

  if (!resolvedStorage) {
    return []
  }

  try {
    const raw = resolvedStorage.getItem(IMAGE_LIBRARY_STORAGE_KEY)

    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw) as unknown

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.flatMap((asset) => {
      if (!isRecord(asset)) {
        return []
      }

      if (
        typeof asset.id !== 'string' ||
        typeof asset.path !== 'string' ||
        typeof asset.mimeType !== 'string' ||
        typeof asset.size !== 'number' ||
        typeof asset.dataUrl !== 'string' ||
        typeof asset.createdAt !== 'string' ||
        typeof asset.updatedAt !== 'string'
      ) {
        return []
      }

      return [
        {
          id: asset.id,
          path: normalizeImageAssetPath(asset.path),
          mimeType: asset.mimeType,
          size: asset.size,
          dataUrl: asset.dataUrl,
          createdAt: asset.createdAt,
          updatedAt: asset.updatedAt,
        },
      ]
    })
  } catch {
    return []
  }
}

export const writeStoredImageAssets = (assets: ImageAsset[], storage?: StorageLike | null) => {
  const resolvedStorage = coerceStorage(storage)

  if (!resolvedStorage) {
    return
  }

  if (assets.length === 0) {
    resolvedStorage.removeItem(IMAGE_LIBRARY_STORAGE_KEY)
    return
  }

  resolvedStorage.setItem(IMAGE_LIBRARY_STORAGE_KEY, JSON.stringify(assets))
}

const generateImageAssetId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `image-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const encodeBase64 = (bytes: Uint8Array) => {
  let binary = ''
  const chunkSize = 0x8000

  for (let cursor = 0; cursor < bytes.length; cursor += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(cursor, cursor + chunkSize))
  }

  return btoa(binary)
}

export const fileToDataUrl = async (file: Blob) => {
  const mimeType = file.type || 'application/octet-stream'
  const bytes = new Uint8Array(await file.arrayBuffer())

  return `data:${mimeType};base64,${encodeBase64(bytes)}`
}

export const createImageAssetFromFile = async (
  file: File,
  existingPaths: Iterable<string>,
): Promise<ImageAsset> => {
  const timestamp = new Date().toISOString()

  return {
    id: generateImageAssetId(),
    path: createImageAssetPath(file.name, existingPaths),
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    dataUrl: await fileToDataUrl(file),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}
