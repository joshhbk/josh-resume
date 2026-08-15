# ADR 0003: Prerender every public route

## Status

Accepted — August 2026

## Context

The portfolio has no request-time data, personalized state, or authenticated areas. A browser-only SPA would delay meaningful content, while a permanent Node server would add operational work without enabling a product requirement.

## Decision

Prerender the root portfolio route at build time. Serve the build as static assets in production. The private Mac mini review environment may run the Vite preview server so edits are easy to inspect.

## Consequences

Initial documents contain the portfolio content and can be served by simple static infrastructure. A request-time feature must justify changing this decision.
