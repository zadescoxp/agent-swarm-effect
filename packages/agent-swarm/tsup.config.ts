import { readFile, writeFile } from "node:fs/promises";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/vanilla.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  minify: true,
  treeshake: true,
  target: "es2020",
  external: ["react"],
  // Bundlers drop module directives, so mark the React entry for server-component frameworks afterwards.
  async onSuccess() {
    for (const file of ["dist/index.js", "dist/index.cjs"]) {
      const code = await readFile(file, "utf8");
      if (!code.startsWith('"use client"')) await writeFile(file, `"use client";\n${code}`);
    }
  },
});
