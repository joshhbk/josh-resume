# ADR 0002: Separate content from presentation

## Status

Accepted — August 2026

## Context

The professional record changes for different reasons than the visual presentation. Mixing facts into route markup would make content validation and future design changes harder to reason about.

## Decision

Keep the validated professional record in one deep content module. Give the AJPW presentation module ownership of its composition and styles. Keep the route thin and avoid a configurable page builder.

## Consequences

Content corrections stay local to the professional record, while visual changes stay local to the presentation module. The route only connects the two interfaces.
