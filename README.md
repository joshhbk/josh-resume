# Joshua Hughes — portfolio

The site is a Toronto-based personal portfolio with a red, blue and cream editorial layout.

## Stack

- React 19 and React Router Framework Mode
- Vite and strict TypeScript
- Zod validation at the content boundary
- CSS Modules
- Vitest and Testing Library
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
