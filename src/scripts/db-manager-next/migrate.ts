#!/usr/bin/env bun
import { logError, logInfo, logSuccess } from "../utils";
import { cloneDb } from "./clone-db";
import { setupFreshDb } from "./setup-fresh-db";

export async function migrate() {
	logInfo("🚀 Starting database migration process...");

	try {
		// Step 1: Setup fresh database
		logInfo("Setting up fresh database...");
		await setupFreshDb();

		// Step 2: Clone database
		logInfo("Cloning database...");
		await cloneDb();

		logSuccess("Database migration completed successfully!");
	} catch (error) {
		logError(
			`Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
		);
		throw error;
	}
}

if (import.meta.main) {
	migrate().catch((error) => {
		logError(
			`Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	});
}
