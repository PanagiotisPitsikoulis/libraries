import { defineConfig } from "tsup";

// Browser config (for components)
export const browserConfig = defineConfig({
	entry: ["./src/index.node.ts"],
	format: ["esm", "cjs"],
	dts: true,
	clean: true,
	treeshake: true,
	sourcemap: true,
	minify: true,
	splitting: false,
	outDir: "dist",
	target: "es2020",
	platform: "browser",
});

// Node.js config (for scripts)
export default defineConfig({
	entry: {
		index: "./src/scripts/index.ts",
		"db-manager-next/db-cli": "./src/scripts/db-manager-next/db-cli.ts",
		"env-manager-next/env-cli": "./src/scripts/env-manager-next/env-cli.ts",
		"package-publisher-next/publish-cli":
			"./src/scripts/package-publisher-next/publish-cli.ts",
	},
	format: ["esm"],
	outDir: "dist/node",
	platform: "node",
	target: "node18",
	noExternal: ["dotenv", "@inquirer/prompts"],
	clean: true,
	shims: true,
	esbuildOptions(options) {
		options.banner = {
			js: "import { createRequire } from 'module';const require = createRequire(import.meta.url);",
		};
		return options;
	},
});
