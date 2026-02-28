import type { CSSProperties, ChangeEvent, KeyboardEvent, ReactNode } from 'react'
import { memo, useDeferredValue, useEffect, useEffectEvent, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Previewer as PagedPreviewer } from 'pagedjs'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import './App.css'
import {
  BODY_FONT_PRESETS,
  createStylesetState,
  MAX_CHROME_FONT_SIZE_PT,
  MIN_CHROME_FONT_SIZE_PT,
  DEFAULT_MARGIN_MM,
  DEFAULT_PAGE_CHROME,
  DEFAULT_PAGE_PRESET,
  DEFAULT_STYLE,
  DEFAULT_THEME_PRESET,
  FOOTER_POSITIONS,
  HEADER_POSITIONS,
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
  prepareMarkdownForRender,
  type MarkdownActionKey,
  type PageChromeState,
  type PagePresetKey,
  type StyleState,
  type StylesetState,
  type ThemePresetKey,
  type ThemeSelection,
} from './lib/editor'

const SAMPLE_MARKDOWN = `# Editorial Markdown

Turn raw markdown into a polished PDF without leaving the browser.

## Why this works

- Live preview updates as you type
- Pagination is rendered as real pages
- Print output stays selectable and searchable

> A good PDF workflow should feel like layout, not paperwork.

### Example checklist

- [x] Paste or write markdown
- [x] Tweak typography and page chrome
- [x] Print or save the rendered PDF

### Table sample

| Section | Purpose | Status |
| --- | --- | --- |
| Editor | Source markdown | Ready |
| Preview | Paginated render | Ready |
| Export | Browser print PDF | Ready |

\`\`\`ts
export function renderMarkdown(source: string) {
  return source.trim()
}
\`\`\`

---

#### Notes

You can use headings, lists, tables, fenced code blocks, blockquotes, and inline emphasis.
`

const controlLabelClass =
  'text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--chrome-muted)]'
const controlFieldClass =
  'rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-[var(--chrome-text)] outline-none transition focus:border-[var(--chrome-accent)] focus:ring-2 focus:ring-[var(--chrome-accent)]/30'
const controlSelectClass = `${controlFieldClass} w-full appearance-none pr-11`
const controlPanelClass =
  'grid gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 md:grid-cols-2 2xl:grid-cols-4'
const isTestEnvironment =
  (globalThis as { __MARKDOWN_TO_PDF_TEST__?: boolean }).__MARKDOWN_TO_PDF_TEST__ === true

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

export function DocumentContent({ markdown }: { markdown: string }) {
  const renderedMarkdown = prepareMarkdownForRender(markdown)

  return (
    <div className="document-root">
      <article className="markdown-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {renderedMarkdown || '*Start typing markdown to see the preview.*'}
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
  const [draftValue, setDraftValue] = useState(value)
  const lastCommitAtRef = useRef(0)
  const pendingCommitRef = useRef<number | null>(null)
  const skipDraftCommitRef = useRef(false)

  useEffect(() => {
    if (pendingCommitRef.current !== null) {
      window.clearTimeout(pendingCommitRef.current)
      pendingCommitRef.current = null
    }

    skipDraftCommitRef.current = true
    setDraftValue(value)
  }, [value])

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
  }, [onCommit])

  useEffect(() => {
    if (skipDraftCommitRef.current) {
      skipDraftCommitRef.current = false
      return
    }

    if (draftValue === value) {
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
        value={draftValue}
        onInput={(event) => setDraftValue((event.target as HTMLInputElement).value)}
      />
    </label>
  )
})

function App() {
  const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN)
  const [splitRatio, setSplitRatio] = useState(0.42)
  const [isResizing, setIsResizing] = useState(false)
  const [isPaginating, setIsPaginating] = useState(false)
  const [pageCount, setPageCount] = useState(0)
  const [paginationError, setPaginationError] = useState<string | null>(null)
  const [fontRenderVersion, setFontRenderVersion] = useState(0)
  const [styleState, setStyleState] = useState(DEFAULT_STYLE)
  const [pagePreset, setPagePreset] = useState<PagePresetKey>(DEFAULT_PAGE_PRESET)
  const [themePreset, setThemePreset] = useState<ThemeSelection>(DEFAULT_THEME_PRESET)
  const [marginMm, setMarginMm] = useState(DEFAULT_MARGIN_MM)
  const [pageChrome, setPageChrome] = useState(DEFAULT_PAGE_CHROME)
  const [isControlsExpanded, setIsControlsExpanded] = useState(false)
  const [debouncedMarkdown, setDebouncedMarkdown] = useState(markdown)
  const [stylesetNotice, setStylesetNotice] = useState<{
    tone: 'default' | 'error'
    message: string
  } | null>(null)
  const workspaceRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const pagedPreviewRef = useRef<HTMLDivElement | null>(null)
  const previewStageRef = useRef<HTMLDivElement | null>(null)
  const previewerRef = useRef<PagedPreviewer | null>(null)
  const stylesetInputRef = useRef<HTMLInputElement | null>(null)
  const paletteCommitGenerationRef = useRef(0)
  const deferredMarkdown = useDeferredValue(debouncedMarkdown)
  const words = countWords(markdown)
  const characters = markdown.length
  const activePagePreset = PAGE_PRESETS[pagePreset]

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
      source.innerHTML = renderToStaticMarkup(<DocumentContent markdown={deferredMarkdown} />)
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
        source.innerHTML = renderToStaticMarkup(<DocumentContent markdown={deferredMarkdown} />)

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
                marginMm,
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
  }, [deferredMarkdown, fontRenderVersion, marginMm, pageChrome, pagePreset, styleState])

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

  const handleThemePresetSelect = (preset: ThemePresetKey) => {
    paletteCommitGenerationRef.current += 1
    setThemePreset(preset)
    setStyleState((current) => applyThemePresetToStyle(current, preset))
  }

  const resetAll = () => {
    paletteCommitGenerationRef.current += 1
    setStyleState(DEFAULT_STYLE)
    setPagePreset(DEFAULT_PAGE_PRESET)
    setThemePreset(DEFAULT_THEME_PRESET)
    setMarginMm(DEFAULT_MARGIN_MM)
    setPageChrome(DEFAULT_PAGE_CHROME)
    setStylesetNotice(null)
  }

  const buildStylesetState = (): StylesetState =>
    createStylesetState({
      themePreset,
      pagePreset,
      marginMm,
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
      setThemePreset(imported.themePreset)
      setPagePreset(imported.pagePreset)
      setMarginMm(imported.marginMm)
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
  } as CSSProperties

  return (
    <div className="app-shell min-h-screen text-[var(--chrome-text)] print:min-h-0">
      <header className="app-chrome sticky top-0 z-20 border-b border-white/10 bg-[linear-gradient(180deg,rgba(11,15,19,0.97),rgba(11,15,19,0.9)),var(--chrome-surface)] backdrop-blur-xl print:hidden">
        <div className="relative mx-auto flex max-w-[1600px] flex-col gap-3 px-6 py-4 sm:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h1 className="m-0 font-[var(--font-display)] text-[clamp(1.4rem,1.1rem+0.8vw,2rem)] font-semibold tracking-[-0.03em]">
                Markdown to PDF
              </h1>
              <p className="mt-0.5 max-w-[70ch] text-sm text-[var(--chrome-muted)] sm:text-[0.95rem]">
                Write markdown, preview real pages, and export a clean browser-rendered PDF.
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
                  <label className="grid gap-1.5">
                    <span className={controlLabelClass}>Margin</span>
                    <input
                      aria-label="Margin"
                      className="w-full accent-[var(--chrome-accent)]"
                      type="range"
                      min="10"
                      max="28"
                      step="1"
                      value={marginMm}
                      onChange={(event) => setMarginMm(Number(event.target.value))}
                    />
                    <span className="text-sm text-[var(--chrome-muted)]">{marginMm} mm</span>
                  </label>
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
                  <div className="grid gap-3 sm:grid-cols-2">
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
        className="workspace mx-auto flex min-h-[calc(100vh-5.5rem)] max-w-[1600px] flex-col gap-4 p-3 sm:p-5 lg:flex-row lg:gap-0 print:min-h-0 print:max-w-none print:gap-0 print:p-0"
        ref={workspaceRef}
        style={workspaceStyle}
      >
        <section className="editor-pane grid min-h-[28rem] min-w-0 grid-rows-[auto_1fr] overflow-hidden rounded-[1.4rem] border border-white/10 bg-[rgba(8,11,15,0.72)] backdrop-blur-xl print:hidden lg:rounded-r-none">
          <div className="border-b border-white/8 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="m-0 font-[var(--font-display)] text-[clamp(1.3rem,1rem+0.7vw,1.8rem)] font-semibold tracking-[-0.03em]">
                  Markdown
                </h2>
                <p className="mt-1 text-sm text-[var(--chrome-muted)]">
                  Edit the source and keep the preview in sync.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-sm text-[var(--chrome-muted)]">
                  {words} words
                </span>
                <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-sm text-[var(--chrome-muted)]">
                  {characters} characters
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {MARKDOWN_ACTIONS.map((action) => (
                <button
                  key={action.key}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold tracking-[0.08em] text-[var(--chrome-text)] transition hover:border-white/20 hover:bg-white/[0.08]"
                  type="button"
                  onClick={() => applyToolbarAction(action.key as MarkdownActionKey)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            aria-label="Markdown editor"
            className="editor-input min-h-0 w-full resize-none border-0 bg-transparent px-5 py-5 text-[0.98rem] leading-7 text-[#f3efe6] outline-none placeholder:text-white/35"
            ref={textareaRef}
            defaultValue={SAMPLE_MARKDOWN}
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

        <section className="preview-pane flex min-h-[32rem] min-w-0 flex-1 flex-col overflow-hidden rounded-[1.4rem] border border-white/10 bg-[rgba(8,11,15,0.72)] backdrop-blur-xl lg:rounded-l-none lg:border-l-0 print:min-h-0 print:rounded-none print:border-0 print:bg-transparent">
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
  )
}

export default App
