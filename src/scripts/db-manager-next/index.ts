#!/usr/bin/env node
import { exec } from "node:child_process";
import { promisify } from "node:util";
import {
	APP_USER,
	CLOUD_DB_HOST,
	CLOUD_DB_NAME,
	CLOUD_DB_PASS,
	CLOUD_DB_PORT,
	CLOUD_DB_USER,
	logError,
	logInfo,
	logSuccess,
	logWarning,
	runSQL,
} from "./db-utils";
import { testConnection } from "./test-connection";

const execAsync = promisify(exec);

const { LOCAL_DB_HOST, LOCAL_DB_USER, LOCAL_DB_NAME } = process.env;

async function main() {
	logInfo("🔍 Starting database manager...");
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

	try {
		await testConnection();
		logSuccess("✅ Database manager initialized successfully");
	} catch (error) {
		logError(
			`❌ Database manager initialization failed: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
		process.exit(1);
	}
}

// Check if this module is being run directly
if (require.main === module) {
	main().catch((error) => {
		logError(
			`Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	});
}

export * from "./db-registry";

export function helloDbManager() {
	return "Hello from DB Manager!";
}
