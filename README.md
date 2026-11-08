# Swarm

[![npm version](https://img.shields.io/npm/v/agent-swarm-effect?color=1b3dff&label=npm)](https://www.npmjs.com/package/agent-swarm-effect)
[![npm downloads](https://img.shields.io/npm/dm/agent-swarm-effect?color=1b3dff)](https://www.npmjs.com/package/agent-swarm-effect)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/agent-swarm-effect?color=1b3dff&label=size)](https://bundlephobia.com/package/agent-swarm-effect)
[![license](https://img.shields.io/npm/l/agent-swarm-effect?color=1b3dff)](LICENSE)
[![deploy site](https://github.com/zadescoxp/agent-swarm-effect/actions/workflows/pages.yml/badge.svg)](https://zadescoxp.github.io/agent-swarm-effect/)

A crew of cursor agents for every element.

Website: https://zadescoxp.github.io/agent-swarm-effect/ · npm: [`agent-swarm-effect`](https://www.npmjs.com/package/agent-swarm-effect)

This repo holds:

- [`packages/agent-swarm-effect`](packages/agent-swarm-effect): the npm package (React component, hook and framework-free core).
- [`site`](site): the docs and examples website (Vite + React).

```bash
npm install
npm run dev      # builds the package, then starts the site on http://localhost:5178
npm run build    # production build of both
```

The site deploys to GitHub Pages on every push to `main` (`.github/workflows/pages.yml`).

## Publishing to npm

1. Log in once: `npm login` (create an account at npmjs.com first if needed).
2. Bump the version in `packages/agent-swarm-effect/package.json` (`npm version patch -w agent-swarm-effect` does it for you).
3. Publish from the repo root:

   ```bash
   npm publish -w agent-swarm-effect --access public
   ```

   `prepublishOnly` rebuilds `dist` first, and only `dist`, `README.md` and `LICENSE` are uploaded.
