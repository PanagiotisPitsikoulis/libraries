#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	execCommand,
	formatError,
	handleError,
	logError,
	logInfo,
	logSuccess,
	logWarning,
	updateVersion,
} from "../utils";

export async function version(
	type: "patch" | "minor" | "major",
): Promise<void> {
	try {
		// Get the root directory (where the command is run)
		const rootDir = process.cwd();
		const packageJsonPath = join(rootDir, "package.json");

		// Read package.json
		const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
		const currentVersion = packageJson.version;

		// Update version based on type
		if (!type || !["patch", "minor", "major"].includes(type)) {
			logError("Please specify version type: patch, minor, or major");
			process.exit(1);
		}

		const newVersion = updateVersion(currentVersion, type);

		// Update package.json
		packageJson.version = newVersion;
		writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

		// Git commands
		const gitCommands = [
			`git add ${packageJsonPath}`,
			`git commit -m "chore: bump version to ${newVersion}"`,
			`git tag -a v${newVersion} -m "Release version ${newVersion}"`,
		];

		// Execute git commands
		for (const command of gitCommands) {
			if (!execCommand(command)) {
				handleError(
					new Error(`Failed to execute git command: ${command}`),
					"Version update",
				);
			}
		}

		logSuccess(`Version updated to ${newVersion}`);
		logInfo("Don't forget to push your changes with:");
		logInfo(`git push origin v${newVersion}`);
	} catch (error) {
		handleError(error, "Version update");
	}
}

// Only run if this file is being run directly
if (require.main === module) {
	const type = process.argv[2] as "patch" | "minor" | "major";
	version(type).catch((error) => {
		handleError(error, "Version update");
	});
}
