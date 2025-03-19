import { defineConfig } from "tsup";

// Browser config (for components)
export const browserConfig = defineConfig({
  entry: ["./src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  external: [
    "react",
    "@/components/ui/button"
  ],
  treeshake: true,
  sourcemap: true,
  minify: true,
  splitting: false,
  outDir: "dist/ui",
  target: "es2020",
  platform: "browser"
});

// Node.js config (for scripts)
export const nodeConfig = defineConfig({
  entry: ["./src/scripts/index.ts"],
  format: ["esm"],
  dts: true,
  clean: false,
  treeshake: true,
  sourcemap: true,
  minify: false,
  splitting: false,
  outDir: "dist/scripts",
  target: "node18",
  platform: "node"
});

// Default export for regular tsup command
export default browserConfig; 