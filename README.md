# Markdown to PDF

Markdown to PDF is a browser-based editor for writing markdown, previewing fully paginated pages, and exporting a clean print-ready PDF without leaving the app.

## Features

- Live markdown editing with instant preview updates
- Real paged layout rendering powered by Paged.js
- Typography, theme, margin, and page chrome controls
- Print-to-PDF workflow that stays selectable and searchable
- Local styleset export for saving document presets

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Paged.js

## Getting Started

Install dependencies:

```bash
bun install
```

Start the development server:

```bash
bun run dev
```

Open the local Vite URL shown in the terminal.

## Available Scripts

```bash
bun run dev
bun run build
bun run test
bun run lint
bun run preview
```

## Usage

1. Write or paste markdown into the editor.
2. Adjust page size, typography, colors, margins, and running header/footer settings.
3. Review the paginated preview.
4. Use `Print / Save PDF` to export through the browser print dialog.

## Assets

Brand assets live in `public/`. The app uses `public/logo.png` in the header and as the favicon.
