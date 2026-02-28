import { afterEach, expect } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup } from '@testing-library/react'

GlobalRegistrator.register()
;(globalThis as { __MARKDOWN_TO_PDF_TEST__?: boolean }).__MARKDOWN_TO_PDF_TEST__ = true
expect.extend(matchers)

afterEach(() => {
  cleanup()
})
