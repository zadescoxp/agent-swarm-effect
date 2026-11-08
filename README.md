# Swarm

A crew of cursor agents for every element. This repo holds:

- [`packages/agent-swarm`](packages/agent-swarm): the npm package (React component, hook and framework-free core).
- [`site`](site): the docs and examples website (Vite + React).

```bash
npm install
npm run dev      # builds the package, then starts the site on http://localhost:5178
npm run build    # production build of both
```

## Publishing to npm

1. Log in once: `npm login` (create an account at npmjs.com first if needed).
2. Bump the version in `packages/agent-swarm/package.json` (`npm version patch -w agent-swarm` does it for you).
3. Publish from the repo root:

   ```bash
   npm publish -w agent-swarm --access public
   ```

   `prepublishOnly` rebuilds `dist` first, and only `dist`, `README.md` and `LICENSE` are uploaded.
