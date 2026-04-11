import type { CSSProperties, ChangeEvent, ComponentPropsWithoutRef, KeyboardEvent, ReactNode } from 'react'
import { Children, isValidElement, memo, useDeferredValue, useEffect, useEffectEvent, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Previewer as PagedPreviewer } from 'pagedjs'
import ReactMarkdown from 'react-markdown'
import rehypeMathjax from 'rehype-mathjax'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import './App.css'
import {
  BODY_FONT_PRESETS,
  BODY_TEXT_ALIGNMENTS,
  createStylesetState,
  DEFAULT_DOCUMENT_TITLE,
  FALLBACK_DOCUMENT_TITLE,
  MAX_CHROME_FONT_SIZE_PT,
  MIN_HORIZONTAL_MARGIN_MM,
  MIN_CHROME_FONT_SIZE_PT,
  MIN_VERTICAL_MARGIN_MM,
  DEFAULT_HORIZONTAL_MARGIN_MM,
  DEFAULT_PAGE_CHROME,
  DEFAULT_PAGE_PRESET,
  DEFAULT_STYLE,
  DEFAULT_THEME_PRESET,
  DEFAULT_VERTICAL_MARGIN_MM,
  FOOTER_POSITIONS,
  HEADER_POSITIONS,
  HEADING_ALIGNMENT_KEYS,
  HEADING_ALIGNMENT_MODES,
  HEADING_TEXT_ALIGNMENTS,
  HEADING_FONT_PRESETS,
  MARKDOWN_ACTIONS,
  PAGE_NUMBER_POSITIONS,
  PAGE_PRESETS,
  parseStylesetState,
  serializeStylesetState,
  THEME_PRESETS,
  applyMarkdownAction,
  applyThemePreset as applyThemePresetToStyle,
  buildPagedDocumentCss,
  clamp,
  countWords,
  isPaletteStyleKey,
  remarkDocumentMarkdownTransform,
  type MarkdownActionKey,
  type PageChromeState,
  type PagePresetKey,
  type StyleState,
  type StylesetState,
  type ThemePresetKey,
  type ThemeSelection,
  type HeadingAlignmentKey,
  type HeadingAlignmentMode,
  type HeadingTextAlignment,
} from './lib/editor'
import {
  readStoredMarkdown,
  removeStoredMarkdown,
  writeStoredMarkdown,
} from './lib/markdown'
import {
  buildImageMarkdownSnippet,
  buildUniqueImageAssetPath,
  countImageAssetReferences,
  createImageAssetFromFile,
  formatFileSize,
  isManagedImagePath,
  normalizeImageAssetPath,
  readStoredImageAssets,
  replaceImageAssetPathReferences,
  resolveImageAssetSource,
  writeStoredImageAssets,
  type ImageAsset,
} from './lib/images'

const SAMPLE_MARKDOWN = String.raw`# Editorial Markdown

Turn raw markdown into a polished PDF without leaving the browser.

## Markdown features

- Live preview updates as you type
- Pagination is rendered as real pages
- Print output stays selectable and searchable

> A good PDF workflow should feel like layout, not paperwork.

### Example checklist

- [x] Paste or write markdown
- [x] Tweak typography and page chrome
- [x] Print or save the rendered PDF

### LaTeX support

This preview accepts inline math with dollar delimiters like $E = mc^2$

It also accepts escaped inline LaTeX delimiters like \(a^2 + b^2 = c^2\)

Escaped display math blocks render too:

\[
\int_0^1 x^2 \, dx = \frac{1}{3}
\]

Supported block environments such as <code>align</code> are accepted directly:

\begin{align}
f(x) &= x^2 + 2x + 1 \\
g(x) &= \frac{x^3}{3}
\end{align}

Matrices and other standalone environments work too:

\begin{bmatrix}
1 & 0 \\
0 & 1
\end{bmatrix}

### Table sample

| Section | Purpose | Status |
| --- | --- | --- |
| Editor | Source markdown | Ready |
| Preview | Paginated render with math | Ready |
| Export | Browser print PDF | Ready |

${'```'}ts
export function renderMarkdown(source: string) {
  return source.trim()
}
${'```'}

---

#### Notes

You can use headings, lists, tables, fenced code blocks, blockquotes, inline emphasis, and LaTeX math in the forms above.
`

const controlLabelClass =
  'text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--chrome-muted)]'
const controlFieldClass =
  'rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-[var(--chrome-text)] outline-none transition focus:border-[var(--chrome-accent)] focus:ring-2 focus:ring-[var(--chrome-accent)]/30'
const controlSelectClass = `${controlFieldClass} w-full appearance-none pr-11`
const controlPanelClass =
  'grid gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 md:grid-cols-2 2xl:grid-cols-[1fr_2.5fr_1.5fr_1.5fr]'
const isTestEnvironment =
  (globalThis as { __MARKDOWN_TO_PDF_TEST__?: boolean }).__MARKDOWN_TO_PDF_TEST__ === true

type NoticeState = {
  tone: 'default' | 'error'
  message: string
}

const bodyAlignmentOptionLabels: Record<keyof typeof BODY_TEXT_ALIGNMENTS, string> = {
  left: 'Align body left',
  center: 'Align body center',
  right: 'Align body right',
  justify: 'Justify body text',
}

function SelectField({
  ariaLabel,
  className,
  value,
  onChange,
  children,
}: {
  ariaLabel: string
  className?: string
  value: string
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void
  children: ReactNode
}) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <select
        aria-label={ariaLabel}
        className={controlSelectClass}
        value={value}
        onChange={onChange}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--chrome-text)]/80">
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none">
          <path
            d="m5 7 5 6 5-6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  )
}

const applyHeadingAlignmentToAll = (alignment: HeadingTextAlignment): StyleState['headingAlignments'] =>
  HEADING_ALIGNMENT_KEYS.reduce<StyleState['headingAlignments']>(
    (alignments, key) => ({
      ...alignments,
      [key]: alignment,
    }),
    { ...DEFAULT_STYLE.headingAlignments },
  )

const AlignmentOptionIcon = ({
  value,
}: {
  value: keyof typeof BODY_TEXT_ALIGNMENTS | HeadingTextAlignment
}) => {
  const lines =
    value === 'left'
      ? ['w-5', 'w-4', 'w-5']
      : value === 'center'
        ? ['w-4', 'w-5', 'w-4']
        : value === 'right'
          ? ['w-5 ml-auto', 'w-4 ml-auto', 'w-5 ml-auto']
          : ['w-5', 'w-5', 'w-5']

  return (
    <span className="flex flex-col items-center justify-center gap-1.5" aria-hidden="true">
      {lines.map((lineClass, index) => (
        <span
          key={`${value}-${index}`}
          className={`block h-[2px] rounded-full bg-current ${lineClass}`}
        />
      ))}
    </span>
  )
}

function AlignmentSelector<OptionValue extends string>({
  ariaLabel,
  value,
  onChange,
  options,
}: {
  ariaLabel: string
  value: OptionValue
  onChange: (value: OptionValue) => void
  options: ReadonlyArray<{
    value: OptionValue
    label: string
  }>
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl border border-white/10 bg-black/20 p-1"
    >
      {options.map((option) => {
        const isSelected = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={option.label}
            title={option.label}
            className={`flex h-10 items-center justify-center rounded-lg border text-[var(--chrome-text)] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chrome-accent)] ${
              isSelected
                ? 'border-[var(--chrome-accent)]/70 bg-[var(--chrome-accent)]/18 text-[var(--chrome-accent)]'
                : 'border-transparent bg-transparent text-[var(--chrome-muted)] hover:border-white/10 hover:bg-white/[0.04] hover:text-[var(--chrome-text)]'
            }`}
            onClick={() => onChange(option.value)}
          >
            <AlignmentOptionIcon value={option.value} />
          </button>
        )
      })}
    </div>
  )
}

const MAX_COMPACT_LIST_ITEM_TEXT_LENGTH = 220
const NON_COMPACT_LIST_TAGS = new Set([
  'p',
  'pre',
  'blockquote',
  'table',
  'ul',
  'ol',
  'figure',
  'div',
  'img',
  'svg',
  'canvas',
  'video',
  'iframe',
  'math',
  'mjx-container',
  'br',
])

const hasNonCompactListContent = (children: ReactNode): boolean =>
  Children.toArray(children).some((child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      return false
    }

    if (!isValidElement(child)) {
      return false
    }

    if (typeof child.type === 'string' && NON_COMPACT_LIST_TAGS.has(child.type)) {
      return true
    }

    if (
      typeof (child.props as { src?: unknown; ['data-missing-src']?: unknown }).src === 'string' ||
      typeof (child.props as { src?: unknown; ['data-missing-src']?: unknown })['data-missing-src'] ===
        'string'
    ) {
      return true
    }

    return hasNonCompactListContent((child.props as { children?: ReactNode }).children)
  })

const getTextContentLength = (children: ReactNode): number =>
  Children.toArray(children).reduce<number>((total, child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      return total + String(child).replace(/\s+/g, ' ').trim().length
    }

    if (!isValidElement(child)) {
      return total
    }

    return total + getTextContentLength((child.props as { children?: ReactNode }).children)
  }, 0)

const buildListClassName = (children: ReactNode, className?: string) =>
  [className, isCompactList(children) ? 'compact-list' : ''].filter(Boolean).join(' ') || undefined

const MarkdownUnorderedList = ({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<'ul'>) => (
  <ul className={buildListClassName(children, className)} {...props}>
    {children}
  </ul>
)

const MarkdownOrderedList = ({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<'ol'>) => (
  <ol className={buildListClassName(children, className)} {...props}>
    {children}
  </ol>
)

const isCompactList = (children: ReactNode): boolean => {
  const listItems = Children.toArray(children).filter(
    (child): child is React.ReactElement<{ children?: ReactNode }> =>
      isValidElement(child) && child.type === 'li',
  )

  return (
    listItems.length > 0 &&
    listItems.length <= 4 &&
    listItems.every(
      (item) =>
        !hasNonCompactListContent(item.props.children) &&
        getTextContentLength(item.props.children) <= MAX_COMPACT_LIST_ITEM_TEXT_LENGTH,
    )
  )
}

const preloadImageSource = (src: string) =>
  new Promise<void>((resolve) => {
    if (!src || typeof Image === 'undefined') {
      resolve()
      return
    }

    const image = new Image()
    let settled = false

    const finish = () => {
      if (settled) {
        return
      }

      settled = true
      resolve()
    }

    image.addEventListener('load', finish, { once: true })
    image.addEventListener('error', finish, { once: true })
    image.src = src

    if (image.complete) {
      finish()
      return
    }

    if (typeof image.decode === 'function') {
      void image.decode().then(finish).catch(() => {})
    }
  })

const preloadDocumentImages = async (root: ParentNode) => {
  const sources = Array.from(root.querySelectorAll('img'))
    .map((image) => image.getAttribute('src')?.trim() ?? '')
    .filter(Boolean)

  await Promise.all(Array.from(new Set(sources)).map((src) => preloadImageSource(src)))
}

const stripImagePreloadLinks = (root: ParentNode) => {
  root.querySelectorAll('link[rel="preload"][as="image"]').forEach((node) => node.remove())
}

const getDisplayMathAlignmentLayout = (alignment: HeadingTextAlignment) =>
  alignment === 'right'
    ? {
        marginLeft: 'auto',
        marginRight: '0',
        textAlign: 'right',
      }
    : alignment === 'center'
      ? {
          marginLeft: 'auto',
          marginRight: 'auto',
          textAlign: 'center',
        }
      : {
          marginLeft: '0',
          marginRight: 'auto',
          textAlign: 'left',
        }

type DocumentImageProps = ComponentPropsWithoutRef<'img'> & {
  node?: unknown
}

export function DocumentContent({
  markdown,
  imageAssets = [],
}: {
  markdown: string
  imageAssets?: ImageAsset[]
}) {
  const renderMarkdownImage = ({ alt, className, src, title, ...props }: DocumentImageProps) => {
    const resolvedSrc = resolveImageAssetSource(src, imageAssets)
    const nextClassName = ['document-image', className].filter(Boolean).join(' ')
    const caption = typeof title === 'string' ? title.trim() : ''
    const normalizedManagedPath = src ? normalizeImageAssetPath(src) : ''

    if (!resolvedSrc && src && isManagedImagePath(src)) {
      return (
        <span className="image-placeholder" data-missing-src={normalizedManagedPath}>
          <span className="image-placeholder__frame">Missing local image</span>
          <span className="image-caption">{normalizedManagedPath}</span>
        </span>
      )
    }

    if (!resolvedSrc) {
      return null
    }

    const image = (
      <img
        {...props}
        alt={alt ?? ''}
        className={nextClassName || undefined}
        src={resolvedSrc}
        title={title}
      />
    )

    if (!caption) {
      return image
    }

    return (
      <>
        {image}
        <span className="image-caption">{caption}</span>
      </>
    )
  }

  return (
    <div className="document-root">
      <article className="markdown-body">
        <ReactMarkdown
          components={{
            img: renderMarkdownImage,
            ul: MarkdownUnorderedList,
            ol: MarkdownOrderedList,
          }}
          remarkPlugins={[remarkGfm, remarkMath, [remarkDocumentMarkdownTransform, { markdown }]]}
          rehypePlugins={[rehypeRaw, rehypeMathjax]}
        >
          {markdown || '*Start typing markdown to see the preview.*'}
        </ReactMarkdown>
      </article>
    </div>
  )
}

const PaletteColorField = memo(function PaletteColorField({
  label,
  ariaLabel,
  value,
  commitGeneration,
  onCommit,
}: {
  label: string
  ariaLabel: string
  value: string
  commitGeneration: number
  onCommit: (value: string, generation: number) => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const controlledValueKey = `${commitGeneration}:${value}`
  const [draftState, setDraftState] = useState<{
    controlledValueKey: string
    draftValue: string | null
  }>({
    controlledValueKey,
    draftValue: null,
  })
  const lastCommitAtRef = useRef(0)
  const pendingCommitRef = useRef<number | null>(null)
  const draftValue =
    draftState.controlledValueKey === controlledValueKey ? draftState.draftValue : null
  const displayedValue = draftValue ?? value

  useEffect(() => {
    const input = inputRef.current

    if (!input) {
      return
    }

    const handleNativeChange = () => {
      if (pendingCommitRef.current !== null) {
        window.clearTimeout(pendingCommitRef.current)
        pendingCommitRef.current = null
      }

      lastCommitAtRef.current = Date.now()
      onCommit(input.value, commitGeneration)
    }

    input.addEventListener('change', handleNativeChange)

    return () => {
      input.removeEventListener('change', handleNativeChange)
    }
  }, [commitGeneration, onCommit])

  useEffect(() => {
    if (draftValue === null || draftValue === value) {
      return
    }

    const now = Date.now()
    const elapsed = now - lastCommitAtRef.current
    const remaining = Math.max(0, 1000 - elapsed)

    pendingCommitRef.current = window.setTimeout(() => {
      lastCommitAtRef.current = Date.now()
      pendingCommitRef.current = null
      onCommit(draftValue, commitGeneration)
    }, remaining)

    return () => {
      if (pendingCommitRef.current !== null) {
        window.clearTimeout(pendingCommitRef.current)
        pendingCommitRef.current = null
      }
    }
  }, [commitGeneration, draftValue, onCommit, value])

  return (
    <label className="grid gap-1.5">
      <span className={controlLabelClass}>{label}</span>
      <input
        aria-label={ariaLabel}
        className="h-9 w-full cursor-pointer bg-black/20 p-0 -ml-0.5"
        ref={inputRef}
        type="color"
        value={displayedValue}
        onInput={(event) =>
          setDraftState({
            controlledValueKey,
            draftValue: (event.target as HTMLInputElement).value,
          })
        }
      />
    </label>
  )
})

function App() {
  const initialStoredMarkdownRef = useRef<string | null>(null)
  const hasPersistedMarkdownRef = useRef(false)
  const skipNextMarkdownPersistRef = useRef(false)
  const [markdown, setMarkdown] = useState(() => {
    const storedMarkdown = readStoredMarkdown()
    initialStoredMarkdownRef.current = storedMarkdown

    return storedMarkdown ?? SAMPLE_MARKDOWN
  })
  const [splitRatio, setSplitRatio] = useState(0.42)
  const [isResizing, setIsResizing] = useState(false)
  const [isPaginating, setIsPaginating] = useState(false)
  const [pageCount, setPageCount] = useState(0)
  const [paginationError, setPaginationError] = useState<string | null>(null)
  const [fontRenderVersion, setFontRenderVersion] = useState(0)
  const [styleState, setStyleState] = useState(DEFAULT_STYLE)
  const [pdfTitle, setPdfTitle] = useState(DEFAULT_DOCUMENT_TITLE)
  const [pagePreset, setPagePreset] = useState<PagePresetKey>(DEFAULT_PAGE_PRESET)
  const [themePreset, setThemePreset] = useState<ThemeSelection>(DEFAULT_THEME_PRESET)
  const [horizontalMarginMm, setHorizontalMarginMm] = useState(DEFAULT_HORIZONTAL_MARGIN_MM)
  const [verticalMarginMm, setVerticalMarginMm] = useState(DEFAULT_VERTICAL_MARGIN_MM)
  const [pageChrome, setPageChrome] = useState(DEFAULT_PAGE_CHROME)
  const [isControlsExpanded, setIsControlsExpanded] = useState(false)
  const [debouncedMarkdown, setDebouncedMarkdown] = useState(markdown)
  const [stylesetNotice, setStylesetNotice] = useState<NoticeState | null>(null)
  const [imageNotice, setImageNotice] = useState<NoticeState | null>(null)
  const [imageAssets, setImageAssets] = useState<ImageAsset[]>(() => readStoredImageAssets())
  const [imagePathDrafts, setImagePathDrafts] = useState<Record<string, string>>({})
  const [isImageSidebarOpen, setIsImageSidebarOpen] = useState(true)
  const workspaceRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const pagedPreviewRef = useRef<HTMLDivElement | null>(null)
  const previewStageRef = useRef<HTMLDivElement | null>(null)
  const previewerRef = useRef<PagedPreviewer | null>(null)
  const stylesetInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const imageAssetsRef = useRef<ImageAsset[]>(imageAssets)
  const paletteCommitGenerationRef = useRef(0)
  const deferredMarkdown = useDeferredValue(debouncedMarkdown)
  const words = countWords(markdown)
  const characters = markdown.length
  const activePagePreset = PAGE_PRESETS[pagePreset]
  const totalImageBytes = imageAssets.reduce((total, asset) => total + asset.size, 0)

  useEffect(() => {
    imageAssetsRef.current = imageAssets
    setImagePathDrafts((current) =>
      Object.fromEntries(imageAssets.map((asset) => [asset.id, current[asset.id] ?? asset.path])),
    )
  }, [imageAssets])

  const handlePointerMove = useEffectEvent((event: PointerEvent) => {
    if (!isResizing || !workspaceRef.current || window.innerWidth < 960) {
      return
    }

    const bounds = workspaceRef.current.getBoundingClientRect()
    const nextRatio = (event.clientX - bounds.left) / bounds.width
    setSplitRatio(clamp(nextRatio, 0.28, 0.72))
  })

  const stopResizing = useEffectEvent(() => {
    setIsResizing(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  })

  const syncEditorState = (nextValue: string) => {
    setMarkdown(nextValue)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedMarkdown(markdown)
    }, 220)

    return () => {
      window.clearTimeout(timer)
    }
  }, [markdown])

  useEffect(() => {
    if (skipNextMarkdownPersistRef.current) {
      skipNextMarkdownPersistRef.current = false
      return
    }

    if (!hasPersistedMarkdownRef.current) {
      hasPersistedMarkdownRef.current = true

      if (initialStoredMarkdownRef.current === null && markdown === SAMPLE_MARKDOWN) {
        return
      }
    }

    void writeStoredMarkdown(markdown)
  }, [markdown])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    document.title = pdfTitle.trim() || FALLBACK_DOCUMENT_TITLE
  }, [pdfTitle])

  useEffect(() => {
    if (!isResizing) {
      return
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResizing)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopResizing)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  useEffect(() => {
    if (isTestEnvironment) {
      return
    }

    if (typeof document === 'undefined' || !('fonts' in document)) {
      return
    }

    let cancelled = false
    const fontSet = document.fonts
    const bodyFont = BODY_FONT_PRESETS[styleState.fontFamily].family
    const headingFont = HEADING_FONT_PRESETS[styleState.headingFamily].family

    const reflowAfterFontsLoad = async () => {
      await Promise.allSettled([
        fontSet.load(`400 16px ${bodyFont}`),
        fontSet.load(`700 16px ${headingFont}`),
      ])

      if (!cancelled) {
        setFontRenderVersion((current) => current + 1)
      }
    }

    void reflowAfterFontsLoad()

    return () => {
      cancelled = true
    }
  }, [styleState.fontFamily, styleState.headingFamily])

  useEffect(() => {
    const container = pagedPreviewRef.current
    const stage = previewStageRef.current

    if (!container || !stage) {
      return
    }

    if (isTestEnvironment) {
      const source = document.createElement('template')
      source.innerHTML = renderToStaticMarkup(
        <DocumentContent markdown={deferredMarkdown} imageAssets={imageAssets} />,
      )
      stripImagePreloadLinks(source.content)
      container.replaceChildren(source.content.cloneNode(true))
      setPaginationError(null)
      setPageCount(1)
      setIsPaginating(false)
      return
    }

    const previousHeight = container.getBoundingClientRect().height

    if (previousHeight > 0) {
      container.style.minHeight = `${Math.ceil(previousHeight)}px`
    }

    let cancelled = false
    let stagingContainer: HTMLDivElement | null = null
    let previewer: PagedPreviewer | null = null
    setIsPaginating(true)
    setPaginationError(null)

    const renderPagedPreview = async () => {
      try {
        const { Previewer } = await import('pagedjs')

        if (cancelled || !container.isConnected || !stage.isConnected) {
          return
        }

        const source = document.createElement('template')
        source.innerHTML = renderToStaticMarkup(
          <DocumentContent markdown={deferredMarkdown} imageAssets={imageAssets} />,
        )

        stripImagePreloadLinks(source.content)
        await preloadDocumentImages(source.content)

        stagingContainer = document.createElement('div')
        stagingContainer.className = 'paged-preview paged-preview--staging'
        stage.appendChild(stagingContainer)

        if (cancelled || !stagingContainer.isConnected) {
          stagingContainer.remove()
          stagingContainer = null
          return
        }

        previewer = new Previewer()

        const flow = await previewer.preview(
          source.content.cloneNode(true) as DocumentFragment,
          [
            {
              [window.location.href]: buildPagedDocumentCss({
                style: styleState,
                pagePreset,
                horizontalMarginMm,
                verticalMarginMm,
                chrome: pageChrome,
              }),
            },
          ],
          stagingContainer,
        )

        if (cancelled || !stagingContainer.isConnected || !container.isConnected) {
          previewer.polisher?.destroy?.()
          stagingContainer.remove()
          stagingContainer = null
          previewer = null
          return
        }

        const previousPreviewer = previewerRef.current
        previewerRef.current = previewer
        container.replaceChildren(...Array.from(stagingContainer.childNodes))
        stagingContainer.remove()
        stagingContainer = null
        previewer = null
        previousPreviewer?.polisher?.destroy?.()
        setPageCount(flow.total ?? container.querySelectorAll('.pagedjs_page').length)
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error('Paged preview rendering failed.', error)
        if (previewerRef.current !== previewer) {
          previewer?.polisher?.destroy?.()
          previewer = null
        }
        setPaginationError('Paginated preview is unavailable in this session.')
      } finally {
        if (previewerRef.current !== previewer) {
          previewer?.polisher?.destroy?.()
          previewer = null
        }
        stagingContainer?.remove()
        stagingContainer = null
        if (!cancelled) {
          container.style.minHeight = ''
          setIsPaginating(false)
        }
      }
    }

    void renderPagedPreview()

    return () => {
      cancelled = true
      if (previewerRef.current !== previewer) {
        previewer?.polisher?.destroy?.()
        previewer = null
      }
      stagingContainer?.remove()
      stagingContainer = null
    }
  }, [
    deferredMarkdown,
    fontRenderVersion,
    horizontalMarginMm,
    imageAssets,
    pageChrome,
    pagePreset,
    styleState,
    verticalMarginMm,
  ])

  useEffect(() => {
    return () => {
      previewerRef.current?.polisher?.destroy?.()
      previewerRef.current = null
    }
  }, [])

  const updateStyle =
    <K extends keyof StyleState>(key: K) =>
    (value: StyleState[K]) => {
      if (isPaletteStyleKey(key)) {
        setThemePreset('custom')
      }

      setStyleState((current) => ({
        ...current,
        [key]: value,
      }))
    }

  const updatePageChrome =
    <K extends keyof PageChromeState>(key: K) =>
    (value: PageChromeState[K]) => {
      setPageChrome((current) => ({
        ...current,
        [key]: value,
      }))
    }

  const updateHeadingAlignmentMode = (mode: HeadingAlignmentMode) => {
    setStyleState((current) => {
      if (mode === current.headingAlignmentMode) {
        return current
      }

      if (mode === 'set') {
        return {
          ...current,
          headingAlignmentMode: 'set',
          headingAlignments: applyHeadingAlignmentToAll(current.headingAlignments.h1),
        }
      }

      return {
        ...current,
        headingAlignmentMode: 'custom',
      }
    })
  }

  const updateSetHeadingAlignment = (alignment: HeadingTextAlignment) => {
    setStyleState((current) => ({
      ...current,
      headingAlignmentMode: 'set',
      headingAlignments: applyHeadingAlignmentToAll(alignment),
    }))
  }

  const updateCustomHeadingAlignment = (
    level: HeadingAlignmentKey,
    alignment: HeadingTextAlignment,
  ) => {
    setStyleState((current) => ({
      ...current,
      headingAlignments: {
        ...current.headingAlignments,
        [level]: alignment,
      },
    }))
  }

  const updatePaletteStyle =
    (key: 'background' | 'text' | 'accent') => (value: string, generation: number) => {
      if (generation !== paletteCommitGenerationRef.current) {
        return
      }

      setThemePreset('custom')
      setStyleState((current) => ({
        ...current,
        [key]: value,
      }))
    }

  const commitImageAssets = (nextAssets: ImageAsset[], notice?: NoticeState) => {
    try {
      writeStoredImageAssets(nextAssets)
      imageAssetsRef.current = nextAssets
      setImageAssets(nextAssets)
      setImageNotice(
        notice ?? {
          tone: 'default',
          message: nextAssets.length === 0 ? 'Removed all local images.' : 'Saved image library.',
        },
      )
      return true
    } catch {
      setImageNotice({
        tone: 'error',
        message: 'Could not save images locally. Browser storage may be full.',
      })
      return false
    }
  }

  const handleThemePresetSelect = (preset: ThemePresetKey) => {
    paletteCommitGenerationRef.current += 1
    setThemePreset(preset)
    setStyleState((current) => applyThemePresetToStyle(current, preset))
  }

  const resetAll = () => {
    paletteCommitGenerationRef.current += 1
    setStyleState(DEFAULT_STYLE)
    setPdfTitle(DEFAULT_DOCUMENT_TITLE)
    setPagePreset(DEFAULT_PAGE_PRESET)
    setThemePreset(DEFAULT_THEME_PRESET)
    setHorizontalMarginMm(DEFAULT_HORIZONTAL_MARGIN_MM)
    setVerticalMarginMm(DEFAULT_VERTICAL_MARGIN_MM)
    setPageChrome(DEFAULT_PAGE_CHROME)
    setStylesetNotice(null)
  }

  const buildStylesetState = (): StylesetState =>
    createStylesetState({
      documentTitle: pdfTitle.trim() || DEFAULT_DOCUMENT_TITLE,
      themePreset,
      pagePreset,
      horizontalMarginMm,
      verticalMarginMm,
      style: styleState,
      pageChrome,
    })

  const handleExportStyleset = () => {
    const styleset = buildStylesetState()
    const blob = new Blob([serializeStylesetState(styleset)], { type: 'application/json' })
    const objectUrl = URL.createObjectURL(blob)
    const downloadLink = document.createElement('a')

    downloadLink.href = objectUrl
    downloadLink.download = 'markdown-to-pdf-styleset.json'
    downloadLink.click()
    URL.revokeObjectURL(objectUrl)

    setStylesetNotice({
      tone: 'default',
      message: 'Styleset exported as JSON.',
    })
  }

  const handleImportStyleset = async (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = Array.from(event.target.files ?? [])

    event.target.value = ''

    if (!file) {
      return
    }

    try {
      const imported = parseStylesetState(await file.text())

      paletteCommitGenerationRef.current += 1
      setPdfTitle(imported.documentTitle)
      setThemePreset(imported.themePreset)
      setPagePreset(imported.pagePreset)
      setHorizontalMarginMm(imported.horizontalMarginMm)
      setVerticalMarginMm(imported.verticalMarginMm)
      setStyleState(imported.style)
      setPageChrome(imported.pageChrome)
      setStylesetNotice({
        tone: 'default',
        message: `Imported styleset from ${file.name}.`,
      })
    } catch {
      setStylesetNotice({
        tone: 'error',
        message: 'Could not import that styleset JSON file.',
      })
    }
  }

  const handlePrint = () => {
    if (isPaginating || paginationError || pageCount === 0) {
      return
    }

    window.print()
  }

  const handleDividerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      setSplitRatio((current) => clamp(current - 0.03, 0.28, 0.72))
    }

    if (event.key === 'ArrowRight') {
      setSplitRatio((current) => clamp(current + 0.03, 0.28, 0.72))
    }
  }

  const replaceEditorMarkdown = (nextMarkdown: string) => {
    const textarea = textareaRef.current

    if (textarea) {
      textarea.value = nextMarkdown
    }

    syncEditorState(nextMarkdown)
  }

  const resetMarkdownToDemo = () => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Reset the markdown editor to the default demo template?')
    ) {
      return
    }

    skipNextMarkdownPersistRef.current = true
    void removeStoredMarkdown()
    replaceEditorMarkdown(SAMPLE_MARKDOWN)
  }

  const insertImageReference = (asset: ImageAsset) => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    const selectionStart = textarea.selectionStart
    const selectionEnd = textarea.selectionEnd
    const needsLeadingBreak =
      selectionStart > 0 && !textarea.value.slice(Math.max(0, selectionStart - 2), selectionStart).includes('\n')
    const needsTrailingBreak =
      selectionEnd < textarea.value.length &&
      !textarea.value.slice(selectionEnd, Math.min(textarea.value.length, selectionEnd + 2)).includes('\n')
    const snippet = buildImageMarkdownSnippet(asset.path)
    const replacement = `${needsLeadingBreak ? '\n' : ''}${snippet}${needsTrailingBreak ? '\n' : ''}`

    textarea.focus()
    textarea.setRangeText(replacement, selectionStart, selectionEnd, 'end')
    syncEditorState(textarea.value)
    setImageNotice({
      tone: 'default',
      message: `Inserted ${asset.path} into the document.`,
    })
  }

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith('image/'))

    event.target.value = ''

    if (files.length === 0) {
      return
    }

    try {
      const nextAssets = [...imageAssetsRef.current]

      for (const file of files) {
        nextAssets.push(await createImageAssetFromFile(file, nextAssets.map((asset) => asset.path)))
      }

      commitImageAssets(nextAssets, {
        tone: 'default',
        message:
          files.length === 1
            ? `Added ${files[0].name} to the local image library.`
            : `Added ${files.length} images to the local image library.`,
      })
    } catch {
      setImageNotice({
        tone: 'error',
        message: 'Could not import that image file.',
      })
    }
  }

  const handleImagePathDraftChange = (assetId: string, value: string) => {
    setImagePathDrafts((current) => ({
      ...current,
      [assetId]: value,
    }))
  }

  const commitImagePathRename = (assetId: string, draftValue?: string) => {
    const currentAssets = imageAssetsRef.current
    const asset = currentAssets.find((currentAsset) => currentAsset.id === assetId)

    if (!asset) {
      return
    }

    const draft = draftValue ?? imagePathDrafts[assetId] ?? asset.path
    const nextPath = buildUniqueImageAssetPath(
      draft,
      currentAssets.filter((currentAsset) => currentAsset.id !== assetId).map((currentAsset) => currentAsset.path),
    )

    setImagePathDrafts((current) => ({
      ...current,
      [assetId]: nextPath,
    }))

    if (nextPath === asset.path) {
      return
    }

    const nextAssets = currentAssets.map((currentAsset) =>
      currentAsset.id === assetId
        ? {
            ...currentAsset,
            path: nextPath,
            updatedAt: new Date().toISOString(),
          }
        : currentAsset,
    )

    if (
      commitImageAssets(nextAssets, {
        tone: 'default',
        message: `Renamed ${asset.path} to ${nextPath}.`,
      })
    ) {
      replaceEditorMarkdown(replaceImageAssetPathReferences(markdown, asset.path, nextPath))
    }
  }

  const handleDeleteImage = (assetId: string) => {
    const currentAssets = imageAssetsRef.current
    const asset = currentAssets.find((currentAsset) => currentAsset.id === assetId)

    if (!asset) {
      return
    }

    const referenceCount = countImageAssetReferences(markdown, asset.path)

    if (
      referenceCount > 0 &&
      typeof window !== 'undefined' &&
      !window.confirm(
        `Remove ${asset.path} from the local image library? ${referenceCount} document reference${referenceCount === 1 ? '' : 's'} will stop rendering.`,
      )
    ) {
      return
    }

    commitImageAssets(
      currentAssets.filter((currentAsset) => currentAsset.id !== assetId),
      {
        tone: 'default',
        message: `Removed ${asset.path} from the local image library.`,
      },
    )
  }

  const applyToolbarAction = (action: MarkdownActionKey) => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    const edit = applyMarkdownAction(
      {
        markdown: textarea.value,
        selectionStart: textarea.selectionStart,
        selectionEnd: textarea.selectionEnd,
      },
      action,
    )

    textarea.focus()
    textarea.setRangeText(edit.markdown, 0, textarea.value.length, 'preserve')
    textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd)
    syncEditorState(textarea.value)
  }

  const handleEditorInput = () => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    syncEditorState(textarea.value)
  }

  const workspaceStyle = {
    '--editor-width': `${splitRatio * 100}%`,
  } as CSSProperties

  const previewStatus = paginationError
    ? paginationError
    : pageCount > 0
      ? `${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`
      : 'Rendering'
  const bodyAlignmentLayout =
    styleState.bodyAlignment === 'center'
      ? {
          blockquotePaddingLeft: '0',
          blockquotePaddingRight: '0',
          blockquoteRuleLeft: 'auto',
          blockquoteRuleRight: 'auto',
          blockquoteRuleOpacity: '0',
          listPaddingLeft: '0',
          listPaddingRight: '0',
          listStylePosition: 'inside',
          listTextAlign: 'center',
        }
      : styleState.bodyAlignment === 'right'
        ? {
            blockquotePaddingLeft: '0',
            blockquotePaddingRight: '1rem',
            blockquoteRuleLeft: 'auto',
            blockquoteRuleRight: '0',
            blockquoteRuleOpacity: '1',
            listPaddingLeft: '0',
            listPaddingRight: '1.3rem',
            listStylePosition: 'inside',
            listTextAlign: 'right',
          }
        : styleState.bodyAlignment === 'justify'
          ? {
              blockquotePaddingLeft: '1rem',
              blockquotePaddingRight: '0',
              blockquoteRuleLeft: '0',
              blockquoteRuleRight: 'auto',
              blockquoteRuleOpacity: '1',
              listPaddingLeft: '1.3rem',
              listPaddingRight: '0',
              listStylePosition: 'outside',
              listTextAlign: 'left',
            }
        : {
            blockquotePaddingLeft: '1rem',
            blockquotePaddingRight: '0',
            blockquoteRuleLeft: '0',
            blockquoteRuleRight: 'auto',
            blockquoteRuleOpacity: '1',
            listPaddingLeft: '1.3rem',
            listPaddingRight: '0',
            listStylePosition: 'outside',
            listTextAlign: 'left',
          }
  const displayMathAlignmentLayout = getDisplayMathAlignmentLayout(styleState.displayMathAlignment)
  const previewDocumentStyle = {
    '--page-background': styleState.background,
    '--page-text': styleState.text,
    '--page-accent': styleState.accent,
    '--page-body-family': BODY_FONT_PRESETS[styleState.fontFamily].family,
    '--page-heading-family': HEADING_FONT_PRESETS[styleState.headingFamily].family,
    '--page-font-size': `${styleState.bodyFontSize}px`,
    '--page-heading-base-size': `${styleState.headingBaseSize}px`,
    '--page-line-height': String(styleState.lineHeight),
    '--page-letter-spacing': `${styleState.letterSpacing}em`,
    '--page-block-spacing': `${styleState.paragraphSpacing}rem`,
    '--page-h1-align': styleState.headingAlignments.h1,
    '--page-h2-align': styleState.headingAlignments.h2,
    '--page-h3-align': styleState.headingAlignments.h3,
    '--page-h4-align': styleState.headingAlignments.h4,
    '--page-h5-align': styleState.headingAlignments.h5,
    '--page-h6-align': styleState.headingAlignments.h6,
    '--page-display-math-align': displayMathAlignmentLayout.textAlign,
    '--page-body-align': styleState.bodyAlignment,
    '--page-blockquote-padding-left': bodyAlignmentLayout.blockquotePaddingLeft,
    '--page-blockquote-padding-right': bodyAlignmentLayout.blockquotePaddingRight,
    '--page-blockquote-rule-left': bodyAlignmentLayout.blockquoteRuleLeft,
    '--page-blockquote-rule-right': bodyAlignmentLayout.blockquoteRuleRight,
    '--page-blockquote-rule-opacity': bodyAlignmentLayout.blockquoteRuleOpacity,
    '--page-display-math-margin-left': displayMathAlignmentLayout.marginLeft,
    '--page-display-math-margin-right': displayMathAlignmentLayout.marginRight,
    '--page-list-padding-left': bodyAlignmentLayout.listPaddingLeft,
    '--page-list-padding-right': bodyAlignmentLayout.listPaddingRight,
    '--page-list-style-position': bodyAlignmentLayout.listStylePosition,
    '--page-list-text-align': bodyAlignmentLayout.listTextAlign,
  } as CSSProperties

  return (
    <div className="app-shell min-h-screen text-[var(--chrome-text)] lg:flex lg:h-screen lg:overflow-hidden print:min-h-0 print:h-auto print:overflow-visible">
      <input
        ref={imageInputRef}
        aria-label="Import local images"
        className="sr-only"
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageUpload}
      />
      {!isImageSidebarOpen ? (
        <button
          className="fixed left-0 top-1/2 z-30 -translate-y-1/2 rounded-r-xl border border-l-0 border-white/10 bg-[rgba(12,17,22,0.96)] px-2 py-4 text-[var(--chrome-muted)] shadow-[0_16px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:border-white/20 hover:bg-[rgba(18,24,31,0.98)] hover:text-[var(--chrome-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chrome-accent)] print:hidden"
          type="button"
          aria-label="Open image library"
          aria-controls="image-library-sidebar"
          aria-expanded="false"
          onClick={() => setIsImageSidebarOpen(true)}
        >
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none">
            <path
              d="m7 4 6 6-6 6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}
      <aside
        id="image-library-sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex max-w-[calc(100vw-2.5rem)] flex-col border-r border-white/8 bg-[linear-gradient(180deg,rgba(12,17,22,0.98),rgba(8,11,15,0.96))] shadow-[0_24px_80px_rgba(0,0,0,0.42)] transition-[width,transform,opacity] duration-200 ease-out print:hidden lg:relative lg:z-auto lg:h-screen lg:max-w-none lg:shadow-none ${
          isImageSidebarOpen
            ? 'w-[21rem] translate-x-0 opacity-100 lg:w-[24rem]'
            : 'w-[21rem] -translate-x-[calc(100%+1rem)] opacity-0 lg:w-0 lg:translate-x-0'
        }`}
        aria-hidden={!isImageSidebarOpen}
      >
        <div
          className={`h-full min-h-0 overflow-hidden ${
            isImageSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-white/8 px-4 py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={controlLabelClass}>Image Library</p>
                  <h2 className="mt-1 font-[var(--font-display)] text-[1.15rem] font-semibold tracking-[-0.03em] text-[var(--chrome-text)]">
                    Local assets
                  </h2>
                  <p className="mt-1 text-sm text-[var(--chrome-muted)]">
                    Stored in this browser and resolved by path, like <code>assets/diagram.png</code>.
                  </p>
                </div>
                <button
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-3 text-[var(--chrome-muted)] transition hover:border-white/20 hover:bg-white/[0.08] hover:text-[var(--chrome-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chrome-accent)]"
                  type="button"
                  aria-label="Close image library"
                  aria-controls="image-library-sidebar"
                  aria-expanded="true"
                  onClick={() => setIsImageSidebarOpen(false)}
                >
                  <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none">
                    <path
                      d="m13 4-6 6 6 6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-black/[0.32] px-3 py-1.5 text-sm text-[var(--chrome-muted)]">
                  {imageAssets.length} {imageAssets.length === 1 ? 'image' : 'images'}
                </span>
                <span className="rounded-full border border-white/10 bg-black/[0.32] px-3 py-1.5 text-sm text-[var(--chrome-muted)]">
                  {formatFileSize(totalImageBytes)}
                </span>
                <button
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold transition hover:border-white/20 hover:bg-white/[0.08]"
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                >
                  Add images
                </button>
              </div>
              <div className="min-h-[1.25rem] pt-3 text-sm">
                {imageNotice ? (
                  <p
                    className={`m-0 ${
                      imageNotice.tone === 'error' ? 'text-amber-200' : 'text-[var(--chrome-muted)]'
                    }`}
                  >
                    {imageNotice.message}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
              {imageAssets.length === 0 ? (
                <button
                  className="flex w-full items-center justify-between gap-4 rounded-[1.1rem] border border-dashed border-white/14 bg-black/[0.18] px-4 py-4 text-left transition hover:border-[var(--chrome-accent)]/40 hover:bg-black/[0.24]"
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <div>
                    <p className="m-0 text-sm font-semibold text-[var(--chrome-text)]">
                      Add the first local image
                    </p>
                    <p className="m-0 mt-1 text-sm text-[var(--chrome-muted)]">
                      Upload PNG, JPG, GIF, SVG, or WebP and insert it into the Markdown editor by
                      path.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold tracking-[0.08em] text-[var(--chrome-text)]">
                    Browse
                  </span>
                </button>
              ) : (
                <div className="grid gap-3">
                  {imageAssets.map((asset) => (
                    <article
                      key={asset.id}
                      className="grid gap-3 rounded-[1.15rem] border border-white/10 bg-black/[0.18] p-3"
                    >
                      <div className="overflow-hidden rounded-[0.95rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]">
                        <img
                          alt={asset.path}
                          className="h-32 w-full object-cover"
                          src={asset.dataUrl}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--chrome-muted)]">
                          <span>{asset.mimeType}</span>
                          <span className="text-white/20">•</span>
                          <span>{formatFileSize(asset.size)}</span>
                        </div>
                        <label className="mt-2 grid gap-1.5">
                          <span className={controlLabelClass}>Path</span>
                          <input
                            aria-label={`Image path ${asset.path}`}
                            className={controlFieldClass}
                            type="text"
                            value={imagePathDrafts[asset.id] ?? asset.path}
                            onChange={(event) =>
                              handleImagePathDraftChange(asset.id, event.target.value)
                            }
                            onBlur={(event) =>
                              commitImagePathRename(asset.id, event.currentTarget.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                commitImagePathRename(asset.id, event.currentTarget.value)
                              }
                            }}
                          />
                        </label>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            className="rounded-full border border-transparent bg-[var(--chrome-accent)]/85 px-3 py-1.5 text-xs font-semibold text-[#14110f] transition hover:bg-[var(--chrome-accent)]"
                            type="button"
                            onClick={() => insertImageReference(asset)}
                          >
                            Insert
                          </button>
                          <button
                            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold transition hover:border-white/20 hover:bg-white/[0.08]"
                            type="button"
                            onClick={() =>
                              replaceEditorMarkdown(
                                `${markdown}${markdown.endsWith('\n') ? '' : '\n'}${asset.path}\n`,
                              )
                            }
                          >
                            Append path
                          </button>
                          <button
                            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold transition hover:border-amber-300/30 hover:bg-amber-300/10"
                            type="button"
                            onClick={() => handleDeleteImage(asset.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
      {isImageSidebarOpen ? (
        <button
          className="fixed inset-0 z-30 bg-black/45 backdrop-blur-[1px] lg:hidden print:hidden"
          type="button"
          aria-label="Dismiss image library overlay"
          onClick={() => setIsImageSidebarOpen(false)}
        />
      ) : null}
      <div className="min-h-screen min-w-0 flex-1 lg:flex lg:h-screen lg:min-h-0 lg:flex-col">
      <header className="app-chrome sticky top-0 z-20 border-b border-white/10 bg-[linear-gradient(180deg,rgba(11,15,19,0.97),rgba(11,15,19,0.9)),var(--chrome-surface)] backdrop-blur-xl print:hidden">
        <div className="relative mx-auto flex max-w-[1600px] flex-col gap-3 px-6 py-4 sm:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-5">
                <img
                  alt="Markdown to PDF logo"
                  className="h-8 w-8 object-contain"
                  src="/logo.png"
                />
                <h1 className="m-0 mt-0.5 font-[var(--font-display)] text-[clamp(1.4rem,1.1rem+0.8vw,2rem)] font-semibold tracking-[-0.03em]">
                  Markdown to PDF
                </h1>
              </div>
              <p className="mt-1.5 max-w-[70ch] text-sm text-[var(--chrome-muted)] sm:text-[0.95rem]">
                Write markdown, preview, and export a polished PDF directly from the browser.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <span className="rounded-full border border-white/10 bg-black/[0.8] px-4 py-1.5 text-sm text-[var(--chrome-muted)]">
                {activePagePreset.label}
              </span>
              <span className="rounded-full border border-white/10 bg-black/[0.8] px-4 py-1.5 text-sm text-[var(--chrome-muted)]">
                {previewStatus}
              </span>
              <button
                className="rounded-full border border-white/10 bg-black/[0.8] px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-black/[0.9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chrome-accent)]"
                type="button"
                onClick={resetMarkdownToDemo}
              >
                Reset
              </button>
              <button
                className="rounded-full border border-white/10 bg-black/[0.8] px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-black/[0.9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chrome-accent)]"
                type="button"
                aria-expanded={isControlsExpanded}
                aria-controls="document-settings"
                onClick={() => setIsControlsExpanded((current) => !current)}
              >
                {isControlsExpanded ? 'Hide Settings' : 'Document Settings'}
              </button>
              <button
                className="rounded-full border border-transparent bg-[var(--chrome-accent)]/90 px-5 py-2.5 font-semibold text-[#14110f] shadow-[0_10px_24px_rgba(201,115,66,0.22)] transition hover:-translate-y-0.5 hover:bg-[var(--chrome-accent)] disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chrome-accent)]"
                type="button"
                onClick={handlePrint}
                disabled={isPaginating || !!paginationError || pageCount === 0}
              >
                Print / Save PDF
              </button>
            </div>
          </div>

          {isControlsExpanded ? (
            <div
              id="document-settings"
              className="absolute inset-x-3 top-[calc(100%+0.75rem)] z-30 sm:inset-x-5 sm:top-[calc(100%+1rem)]"
            >
              <div className="mx-auto grid max-w-[1600px] gap-3 rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(16,22,29,0.98),rgba(11,15,19,0.95))] p-3 shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                <div className={controlPanelClass}>
                <section className="flex flex-col gap-3 rounded-[1rem] border border-white/8 bg-black/15 p-3">
                  <div>
                    <p className={controlLabelClass}>Document</p>
                    <h2 className="mt-1 text-base font-semibold text-[var(--chrome-text)]">
                      Page Setup
                    </h2>
                  </div>
                  <label className="grid gap-1.5">
                    <span className={controlLabelClass}>PDF title</span>
                    <input
                      aria-label="PDF title"
                      className={controlFieldClass}
                      placeholder={FALLBACK_DOCUMENT_TITLE}
                      type="text"
                      value={pdfTitle}
                      onChange={(event) => setPdfTitle(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className={controlLabelClass}>Page</span>
                    <SelectField
                      ariaLabel="Page"
                      value={pagePreset}
                      onChange={(event) => setPagePreset(event.target.value as PagePresetKey)}
                    >
                      {Object.entries(PAGE_PRESETS).map(([key, preset]) => (
                        <option key={key} value={key}>
                          {preset.label}
                        </option>
                      ))}
                    </SelectField>
                  </label>
                  <div className="grid gap-3">
                    <label className="grid gap-1.5">
                      <span className={controlLabelClass}>Horizontal margin</span>
                      <input
                        aria-label="Horizontal margin"
                        className="w-full accent-[var(--chrome-accent)]"
                        type="range"
                        min={MIN_HORIZONTAL_MARGIN_MM}
                        max="28"
                        step="1"
                        value={horizontalMarginMm}
                        onChange={(event) => setHorizontalMarginMm(Number(event.target.value))}
                      />
                      <span className="text-sm text-[var(--chrome-muted)]">
                        {horizontalMarginMm} mm
                      </span>
                    </label>
                    <label className="grid gap-1.5">
                      <span className={controlLabelClass}>Vertical margin</span>
                      <input
                        aria-label="Vertical margin"
                        className="w-full accent-[var(--chrome-accent)]"
                        type="range"
                        min={MIN_VERTICAL_MARGIN_MM}
                        max="28"
                        step="1"
                        value={verticalMarginMm}
                        onChange={(event) => setVerticalMarginMm(Number(event.target.value))}
                      />
                      <span className="text-sm text-[var(--chrome-muted)]">
                        {verticalMarginMm} mm
                      </span>
                    </label>
                  </div>
                </section>

                <section className="flex flex-col gap-3 rounded-[1rem] border border-white/8 bg-black/15 p-3">
                  <div>
                    <p className={controlLabelClass}>Typography</p>
                    <h2 className="mt-1 text-base font-semibold text-[var(--chrome-text)]">
                      Reading Rhythm
                    </h2>
                  </div>
                  <label className="grid gap-1.5">
                    <span className={controlLabelClass}>Body font</span>
                    <SelectField
                      ariaLabel="Body font"
                      value={styleState.fontFamily}
                      onChange={(event) =>
                        updateStyle('fontFamily')(event.target.value as StyleState['fontFamily'])
                      }
                    >
                      {Object.entries(BODY_FONT_PRESETS).map(([key, preset]) => (
                        <option key={key} value={key}>
                          {preset.label}
                        </option>
                      ))}
                    </SelectField>
                  </label>
                  <label className="grid gap-1.5">
                    <span className={controlLabelClass}>Heading font</span>
                    <SelectField
                      ariaLabel="Heading font"
                      value={styleState.headingFamily}
                      onChange={(event) =>
                        updateStyle('headingFamily')(
                          event.target.value as StyleState['headingFamily'],
                        )
                      }
                    >
                      {Object.entries(HEADING_FONT_PRESETS).map(([key, preset]) => (
                        <option key={key} value={key}>
                          {preset.label}
                        </option>
                      ))}
                    </SelectField>
                  </label>
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className={controlLabelClass}>Heading alignment</div>
                        <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
                            {(Object.entries(HEADING_ALIGNMENT_MODES) as Array<
                              [HeadingAlignmentMode, string]
                            >).map(([key, label]) => {
                              const isSelected = styleState.headingAlignmentMode === key

                              return (
                                <button
                                  key={key}
                                  type="button"
                                  aria-pressed={isSelected}
                                  className={`rounded-lg border px-3 py-1 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chrome-accent)] ${
                                    isSelected
                                      ? 'border-[var(--chrome-accent)]/70 bg-[var(--chrome-accent)]/18 text-[var(--chrome-accent)]'
                                      : 'border-transparent bg-transparent text-[var(--chrome-muted)] hover:border-white/10 hover:bg-white/[0.04] hover:text-[var(--chrome-text)]'
                                  }`}
                                  onClick={() => updateHeadingAlignmentMode(key)}
                                >
                                  {label}
                                </button>
                              )
                            })}
                          </div>
                      </div>
                      <div className="grid gap-3">
                        <div
                          className={`grid gap-2 ${
                            styleState.headingAlignmentMode === 'set'
                              ? 'md:grid-cols-2 xl:grid-cols-3'
                              : 'sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
                          }`}
                        >
                          {styleState.headingAlignmentMode === 'set' ? (
                            <div className="grid gap-1.5">
                              <span className="text-sm font-medium text-[var(--chrome-text)]">
                                Heading group
                              </span>
                              <AlignmentSelector
                                ariaLabel="Grouped heading alignment"
                                value={styleState.headingAlignments.h1}
                                onChange={updateSetHeadingAlignment}
                                options={Object.entries(HEADING_TEXT_ALIGNMENTS).map(
                                  ([key, label]) => ({
                                    value: key as HeadingTextAlignment,
                                    label: `Grouped heading ${label.toLowerCase()} aligned`,
                                  }),
                                )}
                              />
                            </div>
                          ) : (
                            HEADING_ALIGNMENT_KEYS.map((level) => (
                              <div key={level} className="grid gap-1.5">
                                <span className="text-sm font-medium text-[var(--chrome-text)]">
                                  {level.toUpperCase()}
                                </span>
                                <AlignmentSelector
                                  ariaLabel={`${level.toUpperCase()} alignment`}
                                  value={styleState.headingAlignments[level]}
                                  onChange={(nextAlignment) =>
                                    updateCustomHeadingAlignment(level, nextAlignment)
                                  }
                                  options={Object.entries(HEADING_TEXT_ALIGNMENTS).map(
                                    ([key, label]) => ({
                                      value: key as HeadingTextAlignment,
                                      label: `${level.toUpperCase()} ${label.toLowerCase()} aligned`,
                                    }),
                                  )}
                                />
                              </div>
                            ))
                          )}
                          <div className="grid gap-1.5">
                            <span className="text-sm font-medium text-[var(--chrome-text)]">
                              Body
                            </span>
                            <AlignmentSelector
                              ariaLabel="Body alignment"
                              value={styleState.bodyAlignment}
                              onChange={(nextAlignment) =>
                                updateStyle('bodyAlignment')(nextAlignment)
                              }
                              options={Object.entries(BODY_TEXT_ALIGNMENTS).map(
                                ([key, label]) => ({
                                  value: key as StyleState['bodyAlignment'],
                                  label:
                                    bodyAlignmentOptionLabels[
                                      key as keyof typeof BODY_TEXT_ALIGNMENTS
                                    ] ?? `Body ${label.toLowerCase()}`,
                                  }),
                              )}
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <span className="text-sm font-medium text-[var(--chrome-text)]">
                              LaTeX block
                            </span>
                            <AlignmentSelector
                              ariaLabel="Block LaTeX alignment"
                              value={styleState.displayMathAlignment}
                              onChange={(nextAlignment) =>
                                updateStyle('displayMathAlignment')(nextAlignment)
                              }
                              options={Object.entries(HEADING_TEXT_ALIGNMENTS).map(
                                ([key, label]) => ({
                                  value: key as HeadingTextAlignment,
                                  label: `Block LaTeX ${label.toLowerCase()} aligned`,
                                }),
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1.5">
                      <span className={controlLabelClass}>Heading size</span>
                      <input
                        aria-label="Heading base size"
                        className="w-full accent-[var(--chrome-accent)]"
                        type="range"
                        min="18"
                        max="36"
                        step="1"
                        value={styleState.headingBaseSize}
                        onChange={(event) =>
                          updateStyle('headingBaseSize')(Number(event.target.value))
                        }
                      />
                      <span className="text-sm text-[var(--chrome-muted)]">
                        {styleState.headingBaseSize} pt
                      </span>
                    </label>
                    <label className="grid gap-1.5">
                      <span className={controlLabelClass}>Body size</span>
                      <input
                        aria-label="Body font size"
                        className="w-full accent-[var(--chrome-accent)]"
                        type="range"
                        min="13"
                        max="24"
                        step="1"
                        value={styleState.bodyFontSize}
                        onChange={(event) =>
                          updateStyle('bodyFontSize')(Number(event.target.value))
                        }
                      />
                      <span className="text-sm text-[var(--chrome-muted)]">
                        {styleState.bodyFontSize} pt
                      </span>
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1.5">
                      <span className={controlLabelClass}>Line height</span>
                      <input
                        aria-label="Leading"
                        className="w-full accent-[var(--chrome-accent)]"
                        type="range"
                        min="1.25"
                        max="2"
                        step="0.05"
                        value={styleState.lineHeight}
                        onChange={(event) => updateStyle('lineHeight')(Number(event.target.value))}
                      />
                      <span className="text-sm text-[var(--chrome-muted)]">
                        {styleState.lineHeight.toFixed(2)} x
                      </span>
                    </label>
                    <label className="grid gap-1.5">
                      <span className={controlLabelClass}>Paragraph space</span>
                      <input
                        aria-label="Spacing"
                        className="w-full accent-[var(--chrome-accent)]"
                        type="range"
                        min="0.7"
                        max="1.7"
                        step="0.05"
                        value={styleState.paragraphSpacing}
                        onChange={(event) =>
                          updateStyle('paragraphSpacing')(Number(event.target.value))
                        }
                      />
                      <span className="text-sm text-[var(--chrome-muted)]">
                        {styleState.paragraphSpacing.toFixed(2)} rem
                      </span>
                    </label>
                  </div>
                  <label className="grid gap-1.5">
                    <span className={controlLabelClass}>Letter spacing</span>
                    <input
                      aria-label="Tracking"
                      className="w-full accent-[var(--chrome-accent)]"
                      type="range"
                      min="-0.02"
                      max="0.08"
                      step="0.005"
                      value={styleState.letterSpacing}
                      onChange={(event) => updateStyle('letterSpacing')(Number(event.target.value))}
                    />
                    <span className="text-sm text-[var(--chrome-muted)]">
                      {styleState.letterSpacing.toFixed(3)} em
                    </span>
                  </label>
                </section>

                <section className="flex flex-col gap-3 rounded-[1rem] border border-white/8 bg-black/15 p-3">
                  <div>
                    <p className={controlLabelClass}>Metadata</p>
                    <h2 className="mt-1 text-base font-semibold text-[var(--chrome-text)]">
                      Running Content
                    </h2>
                  </div>
                  <div className="flex flex-col gap-2 rounded-xl border border-white/8 bg-black/10 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex items-center gap-2 text-sm font-semibold">
                        <input
                          aria-label="Show header"
                          className="h-4 w-4 accent-[var(--chrome-accent)]"
                          type="checkbox"
                          checked={pageChrome.headerEnabled}
                          onChange={(event) =>
                            updatePageChrome('headerEnabled')(event.target.checked)
                          }
                        />
                        Header
                      </label>
                      <SelectField
                        ariaLabel="Header position"
                        className="w-full sm:w-40"
                        value={pageChrome.headerPosition}
                        onChange={(event) =>
                          updatePageChrome('headerPosition')(
                            event.target.value as PageChromeState['headerPosition'],
                          )
                        }
                      >
                        {Object.entries(HEADER_POSITIONS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </SelectField>
                    </div>
                    <input
                      aria-label="Header text"
                      className={controlFieldClass}
                      placeholder="Optional running header"
                      type="text"
                      value={pageChrome.headerText}
                      onChange={(event) => updatePageChrome('headerText')(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2 rounded-xl border border-white/8 bg-black/10 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex items-center gap-2 text-sm font-semibold">
                        <input
                          aria-label="Show footer"
                          className="h-4 w-4 accent-[var(--chrome-accent)]"
                          type="checkbox"
                          checked={pageChrome.footerEnabled}
                          onChange={(event) =>
                            updatePageChrome('footerEnabled')(event.target.checked)
                          }
                        />
                        Footer
                      </label>
                      <SelectField
                        ariaLabel="Footer position"
                        className="w-full sm:w-40"
                        value={pageChrome.footerPosition}
                        onChange={(event) =>
                          updatePageChrome('footerPosition')(
                            event.target.value as PageChromeState['footerPosition'],
                          )
                        }
                      >
                        {Object.entries(FOOTER_POSITIONS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </SelectField>
                    </div>
                    <input
                      aria-label="Footer text"
                      className={controlFieldClass}
                      placeholder="Optional running footer"
                      type="text"
                      value={pageChrome.footerText}
                      onChange={(event) => updatePageChrome('footerText')(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2 rounded-xl border border-white/8 bg-black/10 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold">
                        <input
                          aria-label="Show page numbers"
                          className="h-4 w-4 accent-[var(--chrome-accent)]"
                          type="checkbox"
                          checked={pageChrome.pageNumbersEnabled}
                          onChange={(event) =>
                            updatePageChrome('pageNumbersEnabled')(event.target.checked)
                          }
                        />
                        Page Numbers
                      </label>
                      <SelectField
                        ariaLabel="Page number position"
                        className="w-full sm:w-40"
                        value={pageChrome.pageNumberPosition}
                        onChange={(event) =>
                          updatePageChrome('pageNumberPosition')(
                            event.target.value as PageChromeState['pageNumberPosition'],
                          )
                        }
                      >
                        {Object.entries(PAGE_NUMBER_POSITIONS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </SelectField>
                    </div>
                  </div>
                  <div className="grid gap-3 rounded-xl border border-white/8 bg-black/10 p-3 sm:grid-cols-2">
                    <label className="grid gap-1.5">
                      <span className={controlLabelClass}>Header size</span>
                      <input
                        aria-label="Header size"
                        className="w-full accent-[var(--chrome-accent)]"
                        type="range"
                        min={MIN_CHROME_FONT_SIZE_PT}
                        max={MAX_CHROME_FONT_SIZE_PT}
                        step="1"
                        value={pageChrome.headerFontSizePt}
                        onChange={(event) =>
                          updatePageChrome('headerFontSizePt')(Number(event.target.value))
                        }
                      />
                      <span className="text-sm text-[var(--chrome-muted)]">
                        {pageChrome.headerFontSizePt} pt
                      </span>
                    </label>
                    <label className="grid gap-1.5">
                      <span className={controlLabelClass}>Footer size</span>
                      <input
                        aria-label="Footer size"
                        className="w-full accent-[var(--chrome-accent)]"
                        type="range"
                        min={MIN_CHROME_FONT_SIZE_PT}
                        max={MAX_CHROME_FONT_SIZE_PT}
                        step="1"
                        value={pageChrome.footerFontSizePt}
                        onChange={(event) =>
                          updatePageChrome('footerFontSizePt')(Number(event.target.value))
                        }
                      />
                      <span className="text-sm text-[var(--chrome-muted)]">
                        {pageChrome.footerFontSizePt} pt
                      </span>
                    </label>
                  </div>
                </section>

                <section className="flex flex-col gap-3 rounded-[1rem] border border-white/8 bg-black/15 p-3">
                  <div>
                    <p className={controlLabelClass}>Palette</p>
                    <h2 className="mt-1 text-base font-semibold text-[var(--chrome-text)]">
                      Theme and Color
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(THEME_PRESETS).map(([key, preset]) => {
                      const isActive = themePreset === key

                      return (
                        <button
                          key={key}
                          className={`rounded-full border px-4 py-1 !text-sm font-semibold tracking-[0.08em] transition ${
                            isActive
                              ? 'border-transparent bg-[var(--chrome-accent)] text-[#14110f]'
                              : 'border-white/10 bg-black/15 text-[var(--chrome-text)] hover:border-white/20 hover:bg-white/8'
                          }`}
                          type="button"
                          onClick={() => handleThemePresetSelect(key as ThemePresetKey)}
                        >
                          {preset.label}
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-2 grid gap-3 sm:grid-cols-3">
                    <PaletteColorField
                      label="Paper"
                      ariaLabel="Paper"
                      value={styleState.background}
                      commitGeneration={paletteCommitGenerationRef.current}
                      onCommit={updatePaletteStyle('background')}
                    />
                    <PaletteColorField
                      label="Text"
                      ariaLabel="Text"
                      value={styleState.text}
                      commitGeneration={paletteCommitGenerationRef.current}
                      onCommit={updatePaletteStyle('text')}
                    />
                    <PaletteColorField
                      label="Accent"
                      ariaLabel="Accent"
                      value={styleState.accent}
                      commitGeneration={paletteCommitGenerationRef.current}
                      onCommit={updatePaletteStyle('accent')}
                    />
                  </div>
                </section>
                </div>
                <input
                  ref={stylesetInputRef}
                  aria-label="Import styleset JSON"
                  className="sr-only"
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportStyleset}
                />
                <div className="flex flex-col gap-3 bg-black/10 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-h-[1.25rem] text-sm">
                    {stylesetNotice ? (
                      <p
                        className={`m-0 ml-5 ${
                          stylesetNotice.tone === 'error'
                            ? 'text-amber-200'
                            : 'text-[var(--chrome-muted)]'
                        }`}
                      >
                        {stylesetNotice.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <button
                      className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold transition hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chrome-accent)]"
                      type="button"
                      onClick={() => stylesetInputRef.current?.click()}
                    >
                      Import styleset
                    </button>
                    <button
                      className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold transition hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chrome-accent)]"
                      type="button"
                      onClick={handleExportStyleset}
                    >
                      Export styleset
                    </button>
                    <button
                      className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold transition hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chrome-accent)]"
                      type="button"
                      onClick={resetAll}
                    >
                      Reset settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <main
        className="workspace mx-auto flex min-h-[calc(100vh-5.5rem)] max-w-[1600px] flex-col gap-4 p-3 sm:p-5 lg:h-[calc(100vh-5.5rem)] lg:min-h-0 lg:flex-row lg:gap-0 print:min-h-0 print:h-auto print:max-w-none print:gap-0 print:p-0"
        ref={workspaceRef}
        style={workspaceStyle}
      >
        <section className="editor-pane grid min-h-[28rem] min-w-0 grid-rows-[auto_1fr] overflow-hidden rounded-[1.4rem] border border-white/10 bg-[rgba(8,11,15,0.72)] backdrop-blur-xl print:hidden lg:min-h-0 lg:rounded-r-none">
          <div className="border-b border-white/8 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="m-0 font-[var(--font-display)] text-[clamp(1.3rem,1rem+0.7vw,1.8rem)] font-semibold tracking-[-0.03em]">
                  Markdown
                </h2>
                {/* <p className="mt-1 text-sm text-[var(--chrome-muted)]"> */}
                  {/* Edit the source and keep the preview in sync.  */}
                  {/* LaTeX math supports
                  <code className="ml-1">$...$</code>,
                  <code className="ml-1">$$...$$</code>,
                  <code className="ml-1">\(...\)</code>, and
                  <code className="ml-1">\[...\]</code>. */}
                {/* </p> */}
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-sm text-[var(--chrome-muted)]">
                  {words} words
                </span>
                <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-sm text-[var(--chrome-muted)]">
                  {characters} characters
                </span>
                <span className="rounded-full bg-[rgba(201,115,66,0.12)] px-3 py-1.5 text-sm text-[var(--chrome-muted)]">
                  {imageAssets.length} {imageAssets.length === 1 ? 'image' : 'images'}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {MARKDOWN_ACTIONS.map((action) => (
                <button
                  key={action.key}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-0.5 text-xs font-semibold tracking-[0.08em] text-[var(--chrome-text)] transition hover:border-white/20 hover:bg-white/[0.08]"
                  type="button"
                  onClick={() => applyToolbarAction(action.key as MarkdownActionKey)}
                >
                  {action.label}
                </button>
              ))}
              <button
                className="rounded-full border border-[var(--chrome-accent)]/35 bg-[var(--chrome-accent)]/10 px-3 py-0.5 text-xs font-semibold tracking-[0.08em] text-[var(--chrome-text)] transition hover:border-[var(--chrome-accent)]/60 hover:bg-[var(--chrome-accent)]/18"
                type="button"
                onClick={() => {
                  setIsImageSidebarOpen(true)
                  imageInputRef.current?.click()
                }}
              >
                Upload Image
              </button>
            </div>
          </div>
          <textarea
            aria-label="Markdown editor"
            className="editor-input min-h-0 h-full w-full resize-none overflow-auto border-0 bg-transparent px-5 py-5 text-[0.98rem] leading-7 text-[#f3efe6] outline-none placeholder:text-white/35"
            ref={textareaRef}
            defaultValue={markdown}
            onInput={handleEditorInput}
            spellCheck={false}
          />
        </section>

        <div
          className="hidden w-4 flex-none cursor-col-resize place-items-center print:hidden lg:grid"
          role="separator"
          aria-label="Resize editor and preview panels"
          aria-orientation="vertical"
          tabIndex={0}
          onPointerDown={() => setIsResizing(true)}
          onKeyDown={handleDividerKeyDown}
        >
          <span className="block h-20 w-[0.3rem] rounded-full bg-[linear-gradient(180deg,rgba(201,115,66,0.1),rgba(201,115,66,0.9),rgba(201,115,66,0.1))]" />
        </div>

        <section className="preview-pane flex min-h-[32rem] min-w-0 flex-1 flex-col overflow-hidden rounded-[1.4rem] border border-white/10 bg-[rgba(8,11,15,0.72)] backdrop-blur-xl lg:min-h-0 lg:rounded-l-none s print:min-h-0 print:rounded-none print:border-0 print:bg-transparent">
          <div className="preview-pane__header border-b border-white/8 px-5 py-4 print:hidden">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="m-0 font-[var(--font-display)] text-[clamp(1.3rem,1rem+0.7vw,1.8rem)] font-semibold tracking-[-0.03em]">
                  Preview
                </h2>
                <p className="mt-1 text-sm text-[var(--chrome-muted)]">
                  Final page layout, ready for print.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-sm text-[var(--chrome-muted)]">
                  {activePagePreset.widthMm} × {activePagePreset.heightMm} mm
                </span>
                <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-sm text-[var(--chrome-muted)]">
                  {previewStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="preview-stage relative min-h-0 overflow-auto bg-[radial-gradient(circle_at_top,rgba(201,115,66,0.1),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] p-4 sm:p-6 print:overflow-visible print:bg-transparent print:p-0">
            {paginationError ? (
              <div className="pointer-events-none absolute inset-x-4 top-4 z-[1] rounded-2xl border border-amber-300/25 bg-amber-400/12 px-4 py-3 text-sm text-amber-100 shadow-[0_10px_30px_rgba(0,0,0,0.22)] print:hidden sm:inset-x-6">
                {paginationError} Reload the page to retry the paged renderer.
              </div>
            ) : null}

            {!paginationError && isPaginating ? (
              <>
                <div className="pointer-events-none absolute inset-0 z-[1] bg-black/8 opacity-100 transition-opacity duration-200 print:hidden" />
                <div className="pointer-events-none absolute right-4 top-4 z-[2] rounded-full border border-white/10 bg-[rgba(11,15,19,0.8)] px-3 py-1.5 text-sm text-[var(--chrome-muted)] shadow-[0_10px_30px_rgba(0,0,0,0.22)] print:hidden sm:right-6">
                  Updating preview
                </div>
              </>
            ) : null}

            <div
              className="preview-stage__canvas relative print:min-h-0"
              ref={previewStageRef}
              style={previewDocumentStyle}
            >
              <div
                className={`paged-preview transition-opacity duration-200 ${
                  isPaginating ? 'opacity-85' : 'opacity-100'
                }`}
                ref={pagedPreviewRef}
              />
            </div>
          </div>
        </section>
      </main>
      </div>
    </div>
  )
}

export default App
