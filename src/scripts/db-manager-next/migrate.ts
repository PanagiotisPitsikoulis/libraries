#!/usr/bin/env bun
import { join } from "node:path";
import { executeStep, logError, logInfo, logSuccess } from "../utils";

async function main() {
	logInfo("🚀 Starting database migration process...");

	// Step 1: Setup fresh database
	const setupSuccess = await executeStep("Setting up fresh database", "bun", [
		"run",
		join(__dirname, "setup-fresh-db.ts"),
	]);

	if (!setupSuccess) {
		logError("Fresh database setup failed");
		process.exit(1);
	}

	// Step 2: Clone database
	const cloneSuccess = await executeStep("Cloning database", "bun", [
		"run",
		join(__dirname, "clone-db.ts"),
	]);

	if (!cloneSuccess) {
		logError("Database cloning failed");
		process.exit(1);
	}

	logSuccess("Database migration completed successfully!");
}

main().catch((error) => {
	logError(`Unexpected error: ${error.message}`);
	process.exit(1);
});
