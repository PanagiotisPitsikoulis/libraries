#!/usr/bin/env bun
import { execSync } from "node:child_process";
import { logError, logSuccess } from "../utils";

function execCommand(command: string, errorMessage?: string): boolean {
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
		// Check npm authentication
		if (!execCommand("npm whoami", "Failed to check npm authentication")) {
			logError("Please login to npm first using 'npm login'");
			process.exit(1);
		}

		// Publish to npm
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
