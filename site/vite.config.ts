import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the site from /agent-swarm-effect/. Set BASE_PATH=/ for a root domain.
  base: process.env.BASE_PATH ?? "/",
  server: { port: 5178 },
});
