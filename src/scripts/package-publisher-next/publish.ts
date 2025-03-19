#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	execCommand,
	handleError,
	logError,
	logInfo,
	logSuccess,
} from "../utils";

export async function publish(): Promise<void> {
	try {
		// Get the root directory (where the command is run)
		const rootDir = process.cwd();
		const packageJsonPath = join(rootDir, "package.json");

		// Read current version
		const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
		logInfo(`Current package version: ${packageJson.version}`);

		// Check npm authentication
		logInfo("Checking npm authentication...");
		if (!execCommand("npm whoami")) {
			handleError(
				new Error("Please login to npm first using 'npm login'"),
				"NPM Authentication",
			);
		}

		// Publish to npm
		logInfo("Publishing to npm...");
		if (!execCommand("npm publish --access public")) {
			handleError(new Error("Failed to publish to npm"), "NPM Publish");
		}

		logSuccess("Successfully published to npm!");
	} catch (error) {
		handleError(error, "Package publishing");
	}
}
