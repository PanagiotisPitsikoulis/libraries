import { defineConfig } from "tsup";

// Browser config (for components)
export const browserConfig = defineConfig({
  entry: {
    index: "./src/index.ts",
    "components/ui/index": "./src/components/ui/index.ts",
    "components/index": "./src/components/index.ts",
    "lib/index": "./src/lib/index.ts",
    "packages/index": "./src/packages/index.ts"
  },
  esbuildOptions(options) {
    if (options.platform === 'browser') {
      options.banner = {
        js: '"use client";',
      };
    }
  },
  format: ["esm", "cjs"],
  dts: {
    entry: {
      index: "./src/index.ts",
      "components/ui/index": "./src/components/ui/index.ts",
      "components/index": "./src/components/index.ts",
      "lib/index": "./src/lib/index.ts",
      "packages/index": "./src/packages/index.ts"
    },
    resolve: true,
    compilerOptions: {
      moduleResolution: "node",
      preserveSymlinks: true,
      jsx: "react-jsx"
    }
  },
  clean: true,
  external: [
    "react",
    "react-dom",
    "@radix-ui/*",
    "class-variance-authority",
    "clsx",
    "tailwind-merge"
  ],
  treeshake: false,
  sourcemap: true,
  minify: true,
  splitting: false,
  outDir: "dist/ui",
  target: "esnext",
  platform: "browser",
});

// Default export for regular tsup command
export default browserConfig; 