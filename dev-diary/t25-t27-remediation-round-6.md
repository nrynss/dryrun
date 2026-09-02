# T25–T27 remediation round 6

## P3: parallel test infrastructure emitted an HMR-port warning

`npm test` passed its 43 assertions, but emitted `WebSocket server error: Port
24678 is already in use`. Node's test runner executes test files concurrently.
The T25–T27 and resume SSR tests each create a middleware-mode Vite server;
Vite assigns middleware-mode WebSocket servers port 24678 unless they are
explicitly disabled. The real-browser chooser tests also start independent Vite
servers on allocated HTTP ports. The warning was therefore a test-isolation
defect, not an application or browser-coverage failure.

## Fix

Added `vite.test.config.js`, a test-only Svelte Vite configuration with HMR and
the WebSocket server disabled. It deliberately does not include the Netlify dev
plugin: the covered browser flows are local UI/file-input flows and the T25–T27
requests are injected mocks. Production and normal development remain on
`vite.config.js` unchanged.

SSR module-loader tests now use that config and explicitly retain
`middlewareMode: true, hmr: false, ws: false`. The three Chrome browser tests
also use the same test config while still launch three independent Vite HTTP
servers on individually allocated, strict ports. No test files are serialized
and no browser interaction is removed.

## Evidence

- `npm test` — PASS: 43/43; no `WebSocket server error` output.
- `npm run build` — PASS; only the existing Vite >500 kB chunk advisory.
