import type { CSSProperties, KeyboardEvent } from 'react'
import { useDeferredValue, useEffect, useEffectEvent, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './App.css'

const SAMPLE_MARKDOWN = `# Editorial Markdown

Turn raw markdown into a polished PDF without leaving the browser.

## Why this works

- Live preview updates as you type
- Styling controls stay visible in the top bar
- Export runs entirely client-side

> A good PDF workflow should feel like layout, not paperwork.

### Example checklist

- [x] Paste or write markdown
- [x] Tweak typography and colors
- [x] Download the rendered PDF

### Table sample

| Section | Purpose | Status |
| --- | --- | --- |
| Editor | Source markdown | Ready |
| Preview | Styled render | Ready |
| Export | PDF download | Ready |

\`\`\`ts
export function renderMarkdown(source: string) {
  return source.trim()
}
\`\`\`

---

#### Notes

You can use headings, lists, tables, fenced code blocks, blockquotes, and inline emphasis.
`

const DEFAULT_STYLE = {
  fontSize: 17,
  lineHeight: 1.65,
  contentWidth: 760,
  background: '#f7f1e3',
  text: '#1f2329',
  accent: '#c97342',
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

type StyleState = typeof DEFAULT_STYLE

function App() {
  const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN)
  const [splitRatio, setSplitRatio] = useState(0.42)
  const [isResizing, setIsResizing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [styleState, setStyleState] = useState(DEFAULT_STYLE)
  const workspaceRef = useRef<HTMLDivElement | null>(null)
  const previewSheetRef = useRef<HTMLDivElement | null>(null)
  const deferredMarkdown = useDeferredValue(markdown)
  const words = markdown.trim().split(/\s+/).filter(Boolean).length
  const characters = markdown.length

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

  const updateStyle =
    <K extends keyof StyleState>(key: K) =>
    (value: StyleState[K]) => {
      setStyleState((current) => ({
        ...current,
        [key]: value,
      }))
    }

  const handleDownloadPdf = async () => {
    if (!previewSheetRef.current || isExporting) {
      return
    }

    setIsExporting(true)

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const canvas = await html2canvas(previewSheetRef.current, {
        backgroundColor: styleState.background,
        scale: Math.min(window.devicePixelRatio * 2, 3),
        useCORS: true,
        logging: false,
      })

      const image = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 10
      const printableWidth = pageWidth - margin * 2
      const printableHeight = pageHeight - margin * 2
      const renderedHeight = (canvas.height * printableWidth) / canvas.width

      let heightLeft = renderedHeight
      let offsetY = margin

      pdf.addImage(image, 'PNG', margin, offsetY, printableWidth, renderedHeight, undefined, 'FAST')
      heightLeft -= printableHeight

      while (heightLeft > 0) {
        offsetY = heightLeft - renderedHeight + margin
        pdf.addPage()
        pdf.addImage(image, 'PNG', margin, offsetY, printableWidth, renderedHeight, undefined, 'FAST')
        heightLeft -= printableHeight
      }

      pdf.save('markdown-preview.pdf')
    } finally {
      setIsExporting(false)
    }
  }

  const workspaceStyle = {
    '--editor-width': `${splitRatio * 100}%`,
  } as CSSProperties

  const paperStyle = {
    '--page-background': styleState.background,
    '--page-text': styleState.text,
    '--page-accent': styleState.accent,
    '--page-font-size': `${styleState.fontSize}px`,
    '--page-line-height': styleState.lineHeight,
    '--page-width': `${styleState.contentWidth}px`,
  } as CSSProperties

  const handleDividerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      setSplitRatio((current) => clamp(current - 0.03, 0.28, 0.72))
    }

    if (event.key === 'ArrowRight') {
      setSplitRatio((current) => clamp(current + 0.03, 0.28, 0.72))
    }
  }

  return (
    <div className="min-h-screen text-[var(--chrome-text)]">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[linear-gradient(180deg,rgba(11,15,19,0.96),rgba(11,15,19,0.86)),var(--chrome-surface)] px-3 py-4 backdrop-blur-xl sm:px-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,24rem)_1fr_auto] xl:items-start">
          <div className="grid gap-1.5">
            <p className="m-0 text-[0.7rem] uppercase tracking-[0.18em] text-[var(--chrome-accent)]">
              Bun + Vite client-side studio
            </p>
            <div>
              <h1 className="m-0 font-[var(--font-display)] text-[clamp(1.7rem,1.3rem+1vw,2.4rem)] font-semibold tracking-[-0.03em]">
                Markdown to PDF
              </h1>
              <p className="mt-1 max-w-[38ch] text-sm text-[var(--chrome-muted)] sm:text-base">
                Paste markdown, tune the page, and export the live render as PDF.
              </p>
            </div>
          </div>

          <div
            aria-label="Preview styling controls"
            className="flex flex-wrap items-center gap-3 py-1"
          >
            <label className="flex min-w-[8.2rem] flex-col gap-1.5 rounded-2xl border border-white/10 bg-white/[0.035] px-3.5 py-3">
              <span className="text-[0.72rem] uppercase tracking-[0.14em] text-[var(--chrome-muted)]">
                Font
              </span>
              <input
                className="w-full accent-[var(--chrome-accent)]"
                type="range"
                min="14"
                max="24"
                step="1"
                value={styleState.fontSize}
                onChange={(event) => updateStyle('fontSize')(Number(event.target.value))}
              />
              <strong className="text-sm font-semibold">{styleState.fontSize}px</strong>
            </label>

            <label className="flex min-w-[8.2rem] flex-col gap-1.5 rounded-2xl border border-white/10 bg-white/[0.035] px-3.5 py-3">
              <span className="text-[0.72rem] uppercase tracking-[0.14em] text-[var(--chrome-muted)]">
                Leading
              </span>
              <input
                className="w-full accent-[var(--chrome-accent)]"
                type="range"
                min="1.3"
                max="2"
                step="0.05"
                value={styleState.lineHeight}
                onChange={(event) => updateStyle('lineHeight')(Number(event.target.value))}
              />
              <strong className="text-sm font-semibold">{styleState.lineHeight.toFixed(2)}</strong>
            </label>

            <label className="flex min-w-[8.2rem] flex-col gap-1.5 rounded-2xl border border-white/10 bg-white/[0.035] px-3.5 py-3">
              <span className="text-[0.72rem] uppercase tracking-[0.14em] text-[var(--chrome-muted)]">
                Width
              </span>
              <input
                className="w-full accent-[var(--chrome-accent)]"
                type="range"
                min="620"
                max="920"
                step="10"
                value={styleState.contentWidth}
                onChange={(event) => updateStyle('contentWidth')(Number(event.target.value))}
              />
              <strong className="text-sm font-semibold">{styleState.contentWidth}px</strong>
            </label>

            <label className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3.5 py-3">
              <span className="text-[0.72rem] uppercase tracking-[0.14em] text-[var(--chrome-muted)]">
                Paper
              </span>
              <input
                className="h-9 w-11 cursor-pointer border-0 bg-transparent p-0"
                type="color"
                value={styleState.background}
                onChange={(event) => updateStyle('background')(event.target.value)}
              />
            </label>

            <label className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3.5 py-3">
              <span className="text-[0.72rem] uppercase tracking-[0.14em] text-[var(--chrome-muted)]">
                Text
              </span>
              <input
                className="h-9 w-11 cursor-pointer border-0 bg-transparent p-0"
                type="color"
                value={styleState.text}
                onChange={(event) => updateStyle('text')(event.target.value)}
              />
            </label>

            <label className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3.5 py-3">
              <span className="text-[0.72rem] uppercase tracking-[0.14em] text-[var(--chrome-muted)]">
                Accent
              </span>
              <input
                className="h-9 w-11 cursor-pointer border-0 bg-transparent p-0"
                type="color"
                value={styleState.accent}
                onChange={(event) => updateStyle('accent')(event.target.value)}
              />
            </label>

            <button
              className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 font-semibold transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chrome-accent)]"
              type="button"
              onClick={() => setStyleState(DEFAULT_STYLE)}
            >
              Reset styles
            </button>
          </div>

          <button
            className="justify-self-start rounded-full border border-transparent bg-[var(--chrome-accent)] px-5 py-3 font-semibold text-[#14110f] shadow-[0_14px_30px_rgba(201,115,66,0.28)] transition duration-200 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70 disabled:transform-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chrome-accent)] xl:self-center xl:justify-self-end"
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExporting}
          >
            {isExporting ? 'Rendering PDF...' : 'Download PDF'}
          </button>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-8rem)] flex-col gap-4 p-3 sm:p-5 lg:flex-row lg:gap-0" ref={workspaceRef} style={workspaceStyle}>
        <section className="editor-pane grid min-h-[28rem] min-w-0 grid-rows-[auto_1fr] overflow-hidden rounded-[1.4rem] border border-white/10 bg-[rgba(8,11,15,0.72)] backdrop-blur-xl lg:rounded-r-none">
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

          <textarea
            aria-label="Markdown editor"
            className="min-h-0 w-full resize-none border-0 bg-transparent px-5 py-5 text-[0.98rem] leading-7 text-[#f3efe6] outline-none placeholder:text-white/35"
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            spellCheck={false}
          />
        </section>

        <div
          className="hidden w-4 flex-none cursor-col-resize place-items-center lg:grid"
          role="separator"
          aria-label="Resize editor and preview panels"
          aria-orientation="vertical"
          tabIndex={0}
          onPointerDown={() => setIsResizing(true)}
          onKeyDown={handleDividerKeyDown}
        >
          <span className="block h-20 w-[0.3rem] rounded-full bg-[linear-gradient(180deg,rgba(201,115,66,0.1),rgba(201,115,66,0.9),rgba(201,115,66,0.1))]" />
        </div>

        <section className="flex min-h-[32rem] min-w-0 flex-1 flex-col overflow-hidden rounded-[1.4rem] border border-white/10 bg-[rgba(8,11,15,0.72)] backdrop-blur-xl lg:rounded-l-none lg:border-l-0">
          <div className="flex flex-col gap-4 border-b border-white/8 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="m-0 text-[0.7rem] uppercase tracking-[0.18em] text-[var(--chrome-accent)]">
                Output
              </p>
              <h2 className="m-0 font-[var(--font-display)] text-[clamp(1.45rem,1.05rem+1vw,2rem)] font-semibold tracking-[-0.03em]">
                Live preview
              </h2>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-sm text-[var(--chrome-muted)]">
                GitHub-flavored markdown
              </span>
              <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-sm text-[var(--chrome-muted)]">
                Client-side export
              </span>
            </div>
          </div>

          <div className="min-h-0 overflow-auto bg-[radial-gradient(circle_at_top,rgba(201,115,66,0.1),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] p-4 sm:p-6">
            <div
              className="paper-surface mx-auto w-full rounded-[1.5rem] p-[clamp(1.75rem,2vw,2.75rem)] shadow-[0_32px_60px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.55)]"
              ref={previewSheetRef}
              style={paperStyle}
            >
              <article className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {deferredMarkdown || '*Start typing markdown to see the preview.*'}
                </ReactMarkdown>
              </article>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
