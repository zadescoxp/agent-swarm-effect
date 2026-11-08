# Releasing

Maintainer notes for publishing `agent-swarm-effect` to npm. Run everything from the repo root.

1. Bump the version (`patch` for fixes, `minor` for features, `major` for breaking changes):

   ```bash
   npm version patch -w agent-swarm-effect
   ```

2. Publish. `prepublishOnly` rebuilds `dist` first, and only `dist`, `README.md` and `LICENSE` are uploaded. Approve it in the browser when npm asks:

   ```bash
   npm publish -w agent-swarm-effect --access public
   ```

   If npm says the package "is being processed", wait. Don't publish again: the version appears on its own within a few minutes.

3. Commit the bump, tag it and create the GitHub release (use the new version number):

   ```bash
   git commit -am "Release agent-swarm-effect 0.1.3" && git push
   git tag -a v0.1.3 -m "agent-swarm-effect v0.1.3" && git push origin v0.1.3
   gh release create v0.1.3 --verify-tag --title "agent-swarm-effect v0.1.3" --generate-notes
   ```

4. Check it's live:

   ```bash
   npm view agent-swarm-effect version --prefer-online
   ```

The docs site deploys to GitHub Pages on every push to `main` (`.github/workflows/pages.yml`).
