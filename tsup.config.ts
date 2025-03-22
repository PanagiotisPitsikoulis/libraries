import { defineConfig } from "tsup";

// Browser config (for components)
export const browserConfig = defineConfig({
  entry: ["./src/index.ts", './src/components/ui/index.ts'],
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

// Default export for regular tsup command
export default browserConfig; 