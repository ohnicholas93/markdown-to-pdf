import type { CSSProperties, KeyboardEvent } from 'react'
import { useDeferredValue, useEffect, useEffectEvent, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './App.css'
import {
  BODY_FONT_PRESETS,
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
  THEME_PRESETS,
  applyMarkdownAction,
  applyThemePreset as applyThemePresetToStyle,
  buildPagedDocumentCss,
  clamp,
  countWords,
  isPaletteStyleKey,
  type MarkdownActionKey,
  type PageChromeState,
  type PagePresetKey,
  type StyleState,
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

const controlCardClass =
  'flex min-w-[8.75rem] flex-col gap-1.5 rounded-2xl border border-white/10 bg-white/[0.035] px-3.5 py-3'
const controlLabelClass =
  'text-[0.72rem] uppercase tracking-[0.14em] text-[var(--chrome-muted)]'
const controlFieldClass =
  'rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-[var(--chrome-text)] outline-none focus:ring-2 focus:ring-[var(--chrome-accent)]'

function DocumentContent({ markdown }: { markdown: string }) {
  return (
    <div className="document-root">
      <article className="markdown-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {markdown || '*Start typing markdown to see the preview.*'}
        </ReactMarkdown>
      </article>
    </div>
  )
}

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
  const workspaceRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const pagedPreviewRef = useRef<HTMLDivElement | null>(null)
  const previewerRef = useRef<{ polisher?: { destroy?: () => void } } | null>(null)
  const deferredMarkdown = useDeferredValue(markdown)
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

    if (!container) {
      return
    }

    let cancelled = false
    setIsPaginating(true)
    setPageCount(0)
    setPaginationError(null)

    const renderPagedPreview = async () => {
      try {
        const { Previewer } = await import('pagedjs')

        if (cancelled) {
          return
        }

        previewerRef.current?.polisher?.destroy?.()
        container.replaceChildren()

        const source = document.createElement('template')
        source.innerHTML = renderToStaticMarkup(<DocumentContent markdown={deferredMarkdown} />)

        const previewer = new Previewer()
        previewerRef.current = previewer

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
          container,
        )

        if (cancelled) {
          previewer.polisher?.destroy?.()
          return
        }

        setPageCount(flow.total ?? container.querySelectorAll('.pagedjs_page').length)
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error('Paged preview rendering failed.', error)
        previewerRef.current = null
        container.replaceChildren()
        setPaginationError('Paginated preview is unavailable in this session.')
      } finally {
        if (!cancelled) {
          setIsPaginating(false)
        }
      }
    }

    void renderPagedPreview()

    return () => {
      cancelled = true
      previewerRef.current?.polisher?.destroy?.()
      previewerRef.current = null
      container.replaceChildren()
    }
  }, [deferredMarkdown, fontRenderVersion, marginMm, pageChrome, pagePreset, styleState])

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

  const handleThemePresetSelect = (preset: ThemePresetKey) => {
    setThemePreset(preset)
    setStyleState((current) => applyThemePresetToStyle(current, preset))
  }

  const resetAll = () => {
    setStyleState(DEFAULT_STYLE)
    setPagePreset(DEFAULT_PAGE_PRESET)
    setThemePreset(DEFAULT_THEME_PRESET)
    setMarginMm(DEFAULT_MARGIN_MM)
    setPageChrome(DEFAULT_PAGE_CHROME)
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
        markdown,
        selectionStart: textarea.selectionStart,
        selectionEnd: textarea.selectionEnd,
      },
      action,
    )

    setMarkdown(edit.markdown)

    requestAnimationFrame(() => {
      const nextTextarea = textareaRef.current

      if (!nextTextarea) {
        return
      }

      nextTextarea.focus()
      nextTextarea.setSelectionRange(edit.selectionStart, edit.selectionEnd)
    })
  }

  const workspaceStyle = {
    '--editor-width': `${splitRatio * 100}%`,
  } as CSSProperties

  return (
    <div className="app-shell min-h-screen text-[var(--chrome-text)]">
      <header className="app-chrome sticky top-0 z-10 border-b border-white/10 bg-[linear-gradient(180deg,rgba(11,15,19,0.96),rgba(11,15,19,0.86)),var(--chrome-surface)] px-3 py-4 backdrop-blur-xl print:hidden sm:px-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,24rem)_1fr_auto] xl:items-start">
          <div className="grid gap-1.5">
            <p className="m-0 text-[0.7rem] uppercase tracking-[0.18em] text-[var(--chrome-accent)]">
              Bun + Vite client-side print studio
            </p>
            <div>
              <h1 className="m-0 font-[var(--font-display)] text-[clamp(1.7rem,1.3rem+1vw,2.4rem)] font-semibold tracking-[-0.03em]">
                Markdown to PDF
              </h1>
              <p className="mt-1 max-w-[42ch] text-sm text-[var(--chrome-muted)] sm:text-base">
                Write markdown, paginate it as real pages, and print a clean PDF with browser-native rendering.
              </p>
            </div>
          </div>

          <div
            aria-label="Document controls"
            className="flex flex-wrap items-start gap-3 py-1"
          >
            <label className={controlCardClass}>
              <span className={controlLabelClass}>Page</span>
              <select
                aria-label="Page"
                className={controlFieldClass}
                value={pagePreset}
                onChange={(event) => setPagePreset(event.target.value as PagePresetKey)}
              >
                {Object.entries(PAGE_PRESETS).map(([key, preset]) => (
                  <option key={key} value={key}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <strong className="text-sm font-semibold">
                {activePagePreset.widthMm} x {activePagePreset.heightMm} mm
              </strong>
            </label>

            <label className={controlCardClass}>
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
              <strong className="text-sm font-semibold">{marginMm}mm</strong>
            </label>

            <label className={controlCardClass}>
              <span className={controlLabelClass}>Body font</span>
              <select
                aria-label="Body font"
                className={controlFieldClass}
                value={styleState.fontFamily}
                onChange={(event) => updateStyle('fontFamily')(event.target.value as StyleState['fontFamily'])}
              >
                {Object.entries(BODY_FONT_PRESETS).map(([key, preset]) => (
                  <option key={key} value={key}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <strong className="text-sm font-semibold">
                {BODY_FONT_PRESETS[styleState.fontFamily].label}
              </strong>
            </label>

            <label className={controlCardClass}>
              <span className={controlLabelClass}>Heading font</span>
              <select
                aria-label="Heading font"
                className={controlFieldClass}
                value={styleState.headingFamily}
                onChange={(event) =>
                  updateStyle('headingFamily')(event.target.value as StyleState['headingFamily'])
                }
              >
                {Object.entries(HEADING_FONT_PRESETS).map(([key, preset]) => (
                  <option key={key} value={key}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <strong className="text-sm font-semibold">
                {HEADING_FONT_PRESETS[styleState.headingFamily].label}
              </strong>
            </label>

            <label className={controlCardClass}>
              <span className={controlLabelClass}>Font size</span>
              <input
                aria-label="Font size"
                className="w-full accent-[var(--chrome-accent)]"
                type="range"
                min="13"
                max="24"
                step="1"
                value={styleState.fontSize}
                onChange={(event) => updateStyle('fontSize')(Number(event.target.value))}
              />
              <strong className="text-sm font-semibold">{styleState.fontSize}px</strong>
            </label>

            <label className={controlCardClass}>
              <span className={controlLabelClass}>Leading</span>
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
              <strong className="text-sm font-semibold">{styleState.lineHeight.toFixed(2)}</strong>
            </label>

            <label className={controlCardClass}>
              <span className={controlLabelClass}>Spacing</span>
              <input
                aria-label="Spacing"
                className="w-full accent-[var(--chrome-accent)]"
                type="range"
                min="0.7"
                max="1.7"
                step="0.05"
                value={styleState.paragraphSpacing}
                onChange={(event) => updateStyle('paragraphSpacing')(Number(event.target.value))}
              />
              <strong className="text-sm font-semibold">
                {styleState.paragraphSpacing.toFixed(2)}rem
              </strong>
            </label>

            <label className={controlCardClass}>
              <span className={controlLabelClass}>Tracking</span>
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
              <strong className="text-sm font-semibold">{styleState.letterSpacing.toFixed(3)}em</strong>
            </label>

            <div className="flex min-w-[16rem] flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3.5 py-3">
              <span className={controlLabelClass}>Theme</span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(THEME_PRESETS).map(([key, preset]) => {
                  const isActive = themePreset === key

                  return (
                    <button
                      key={key}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.08em] transition ${
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
              <strong className="text-sm font-semibold">
                {themePreset === 'custom' ? 'Custom colors' : THEME_PRESETS[themePreset].label}
              </strong>
            </div>

            <div className="flex min-w-[20rem] flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3.5 py-3">
              <div className="grid gap-2 md:grid-cols-[auto_minmax(0,1fr)_9rem]">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    aria-label="Show header"
                    className="h-4 w-4 accent-[var(--chrome-accent)]"
                    type="checkbox"
                    checked={pageChrome.headerEnabled}
                    onChange={(event) => updatePageChrome('headerEnabled')(event.target.checked)}
                  />
                  Header
                </label>
                <input
                  aria-label="Header text"
                  className={controlFieldClass}
                  placeholder="Optional running header"
                  type="text"
                  value={pageChrome.headerText}
                  onChange={(event) => updatePageChrome('headerText')(event.target.value)}
                />
                <select
                  aria-label="Header position"
                  className={controlFieldClass}
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
                </select>
              </div>

              <div className="grid gap-2 md:grid-cols-[auto_minmax(0,1fr)_9rem]">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    aria-label="Show footer"
                    className="h-4 w-4 accent-[var(--chrome-accent)]"
                    type="checkbox"
                    checked={pageChrome.footerEnabled}
                    onChange={(event) => updatePageChrome('footerEnabled')(event.target.checked)}
                  />
                  Footer
                </label>
                <input
                  aria-label="Footer text"
                  className={controlFieldClass}
                  placeholder="Optional running footer"
                  type="text"
                  value={pageChrome.footerText}
                  onChange={(event) => updatePageChrome('footerText')(event.target.value)}
                />
                <select
                  aria-label="Footer position"
                  className={controlFieldClass}
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
                </select>
              </div>

              <div className="grid gap-2 md:grid-cols-[auto_1fr]">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    aria-label="Show page numbers"
                    className="h-4 w-4 accent-[var(--chrome-accent)]"
                    type="checkbox"
                    checked={pageChrome.pageNumbersEnabled}
                    onChange={(event) =>
                      updatePageChrome('pageNumbersEnabled')(event.target.checked)
                    }
                  />
                  Page numbers
                </label>
                <select
                  aria-label="Page number position"
                  className={controlFieldClass}
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
                </select>
              </div>
            </div>

            <label className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3.5 py-3">
              <span className={controlLabelClass}>Paper</span>
              <input
                aria-label="Paper"
                className="h-9 w-11 cursor-pointer border-0 bg-transparent p-0"
                type="color"
                value={styleState.background}
                onChange={(event) => updateStyle('background')(event.target.value)}
              />
            </label>

            <label className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3.5 py-3">
              <span className={controlLabelClass}>Text</span>
              <input
                aria-label="Text"
                className="h-9 w-11 cursor-pointer border-0 bg-transparent p-0"
                type="color"
                value={styleState.text}
                onChange={(event) => updateStyle('text')(event.target.value)}
              />
            </label>

            <label className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3.5 py-3">
              <span className={controlLabelClass}>Accent</span>
              <input
                aria-label="Accent"
                className="h-9 w-11 cursor-pointer border-0 bg-transparent p-0"
                type="color"
                value={styleState.accent}
                onChange={(event) => updateStyle('accent')(event.target.value)}
              />
            </label>

            <button
              className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 font-semibold transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chrome-accent)]"
              type="button"
              onClick={resetAll}
            >
              Reset settings
            </button>
          </div>

          <button
            className="justify-self-start rounded-full border border-transparent bg-[var(--chrome-accent)] px-5 py-3 font-semibold text-[#14110f] shadow-[0_14px_30px_rgba(201,115,66,0.28)] transition duration-200 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70 disabled:transform-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chrome-accent)] xl:self-center xl:justify-self-end"
            type="button"
            onClick={handlePrint}
            disabled={isPaginating || !!paginationError || pageCount === 0}
          >
            {isPaginating ? 'Paginating pages...' : 'Print / Save PDF'}
          </button>
        </div>
      </header>

      <main
        className="workspace flex min-h-[calc(100vh-8rem)] flex-col gap-4 p-3 sm:p-5 lg:flex-row lg:gap-0"
        ref={workspaceRef}
        style={workspaceStyle}
      >
        <section className="editor-pane grid min-h-[28rem] min-w-0 grid-rows-[auto_auto_1fr] overflow-hidden rounded-[1.4rem] border border-white/10 bg-[rgba(8,11,15,0.72)] backdrop-blur-xl print:hidden lg:rounded-r-none">
          <div className="flex flex-col gap-4 border-b border-white/8 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="m-0 text-[0.7rem] uppercase tracking-[0.18em] text-[var(--chrome-accent)]">
                Source
              </p>
              <h2 className="m-0 font-[var(--font-display)] text-[clamp(1.45rem,1.05rem+1vw,2rem)] font-semibold tracking-[-0.03em]">
                Markdown
              </h2>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-sm text-[var(--chrome-muted)]">
                {words} words
              </span>
              <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-sm text-[var(--chrome-muted)]">
                {characters} chars
              </span>
            </div>
          </div>

          <div className="border-b border-white/8 px-4 py-3">
            <div className="flex flex-wrap gap-2">
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
            className="min-h-0 w-full resize-none border-0 bg-transparent px-5 py-5 text-[0.98rem] leading-7 text-[#f3efe6] outline-none placeholder:text-white/35"
            ref={textareaRef}
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
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
          <div className="preview-pane__header flex flex-col gap-4 border-b border-white/8 px-5 py-4 print:hidden sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="m-0 text-[0.7rem] uppercase tracking-[0.18em] text-[var(--chrome-accent)]">
                Output
              </p>
              <h2 className="m-0 font-[var(--font-display)] text-[clamp(1.45rem,1.05rem+1vw,2rem)] font-semibold tracking-[-0.03em]">
                Paginated preview
              </h2>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-sm text-[var(--chrome-muted)]">
                Real print rendering
              </span>
              <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-sm text-[var(--chrome-muted)]">
                {activePagePreset.label} layout
              </span>
              <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-sm text-[var(--chrome-muted)]">
                {pageChrome.pageNumbersEnabled ? 'Page numbers on' : 'Page numbers off'}
              </span>
              <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-sm text-[var(--chrome-muted)]">
                {isPaginating ? 'Paginating…' : pageCount > 0 ? `${pageCount} pages` : 'Preview ready'}
              </span>
            </div>
          </div>

          <div className="preview-stage min-h-0 overflow-auto bg-[radial-gradient(circle_at_top,rgba(201,115,66,0.1),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] p-4 sm:p-6 print:overflow-visible print:bg-transparent print:p-0">
            {paginationError ? (
              <p className="mb-4 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100 print:hidden">
                {paginationError} Reload the page to retry the paged renderer.
              </p>
            ) : null}

            {isPaginating ? (
              <p className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[var(--chrome-muted)] print:hidden">
                Building page layout...
              </p>
            ) : null}

            <div className="paged-preview" ref={pagedPreviewRef} />
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
