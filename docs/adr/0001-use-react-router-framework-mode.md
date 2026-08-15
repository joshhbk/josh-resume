# ADR 0001: Use React Router Framework Mode

## Status

Accepted — August 2026

## Context

The portfolio is content-led and can be emitted as static HTML, but it benefits from route-level metadata, automatic route code splitting, typed route modules, and a conventional path to future server behavior. A bespoke Vite SPA would require recreating those boundaries. Next.js would introduce a larger framework surface than the current requirements justify.

## Decision

Use React 19 with React Router Framework Mode and Vite. Prerender every public route and run without a production application server until a request-time requirement appears.

## Consequences

The site retains a small deployment model while its routes, metadata, and build pipeline remain explicit. Adding server rendering later is possible, but is not part of the current architecture.
