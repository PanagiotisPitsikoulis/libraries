#!/usr/bin/env bun
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { colors, log, logError, logSuccess } from "../utils";

function execCommand(command: string, errorMessage?: string): boolean {
	log(`Executing command: ${command}`, colors.blue);
	try {
		execSync(command, { stdio: "inherit" });
		return true;
	} catch (error) {
		if (errorMessage) {
			logError(errorMessage);
		}
		return false;
	}
}

export async function publish(): Promise<void> {
	try {
		// Read current version
		const packageJson = JSON.parse(readFileSync("./package.json", "utf8"));
		log(`Current package version: ${packageJson.version}`, colors.blue);

		// Check npm authentication
		log("Checking npm authentication...", colors.blue);
		if (!execCommand("npm whoami", "Failed to check npm authentication")) {
			logError("Please login to npm first using 'npm login'");
			process.exit(1);
		}

		// Publish to npm
		log("Publishing to npm...", colors.blue);
		if (
			!execCommand("npm publish --access public", "Failed to publish to npm")
		) {
			process.exit(1);
		}

		logSuccess("Successfully published to npm!");
	} catch (error) {
		logError("Unexpected error during publish: " + error);
		process.exit(1);
	}
}
