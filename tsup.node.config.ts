import { defineConfig } from "tsup";

// Node.js config (for scripts)
export default defineConfig({
	entry: {
		index: "./src/scripts/index.ts",
		"db-manager-next/db-cli": "./src/scripts/db-manager-next/db-cli.ts",
		"env-manager-next/env-cli": "./src/scripts/env-manager-next/env-cli.ts",
		"package-publisher-next/publish-cli":
			"./src/scripts/package-publisher-next/publish-cli.ts",
		"package-publisher-next/version-cli":
			"./src/scripts/package-publisher-next/version-cli.ts",
		"build-index-files/index": "./src/scripts/build-index-files/index.ts",
		"next-screenshot/screenshot-cli":
			"./src/scripts/next-screenshot/screenshot-cli.ts",
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
