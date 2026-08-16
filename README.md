# Joshua Hughes — portfolio

The site is a Toronto-based personal portfolio with a red, blue and cream editorial layout.

## Stack

- React 19 and React Router Framework Mode
- Vite and strict TypeScript
- Zod validation at the content boundary
- CSS Modules
- Vitest, Testing Library and axe-core accessibility checks
- Static prerendering for the root portfolio route

## Local development

```sh
pnpm install
pnpm dev
```

Open `http://127.0.0.1:5173`. Production verification is available through:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Mac mini preview

The review build is copied to `/Users/joshuahughes/Developer/josh-resume` on the Mac mini. A user LaunchAgent runs `pnpm start` on loopback port 3000 and Tailscale Serve provides private tailnet HTTPS. The launch configuration is versioned in `ops/com.joshuahughes.portfolio-preview.plist`.

After syncing a change, run the production checks and build on the mini, then restart the service:

```sh
launchctl kickstart -k gui/$(id -u)/com.joshuahughes.portfolio-preview
```

## Cloudflare Pages

The repository is ready for a static Cloudflare Pages deployment from GitHub. Use these build
settings when creating the project:

- Production branch: `main`
- Framework preset: None
- Build command: `pnpm build`
- Build output directory: `build/client`
- Root directory: repository root

Node is pinned in `.node-version`, pnpm is pinned through the `packageManager` field, and no
runtime environment variables are required. Production builds copy `public/_headers` into the
output to apply security headers and long-lived caching to fingerprinted assets.
