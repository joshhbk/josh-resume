# Portfolio context

This repository is the personal portfolio of Joshua Hughes, a Staff Front-End Engineer. The public site has one selected visual direction informed by the red, blue and white ring canvas used by All Japan Pro Wrestling in the mid-1980s.

## Domain language

- **Portfolio**: the complete, validated professional record exposed to presentation code.
- **Case study**: a bounded account of a technical problem, the decisions made, and the resulting evidence.
- **Professional record**: the chronological list of roles and responsibilities.
- **Capability**: an area of repeatable practice, broader than any particular technology.
- **AJPW portfolio**: the complete homepage presentation built around the red, blue and white visual language of the mid-1980s All Japan ring canvas.

## Architectural boundary

`app/modules/portfolio-content` owns the professional record and validates it at module initialization. Routes and design modules consume the resulting `Portfolio` value and cannot reach into its raw representation.

`app/modules/designs/ajpw` is the deep presentation module. It owns the portfolio composition and CSS while consuming only the validated `Portfolio` value.

The root route is a thin adapter between the content module and presentation module. It is prerendered because the site has no request-time data or authenticated behavior.

`app/modules/designs/ajpw` owns the complete homepage presentation. Its red, blue and white diagonal field refers to the two-tone All Japan Pro Wrestling ring canvas of the mid-1980s. Long-form case-study content uses cream programme-like surfaces inside that system so reading clarity is not sacrificed to the reference. The Toronto photograph source is recorded in `docs/assets.md`.

## Current constraints

- No eyebrow text above headings. Dates, organizations and other metadata belong after the heading or beside it.
- No selectively highlighted phrase masquerading as a headline concept.
- No bento dashboard, glass panels, decorative gradients, floating blobs, or generic product screenshots.
- No brutalist treatment. Rules and grids must come from the selected editorial reference, not intentional roughness.
- Mobile is a first-class reading layout, not a compressed desktop canvas.
- Claims must be traceable to the résumé or an explicitly confirmed career fact.
