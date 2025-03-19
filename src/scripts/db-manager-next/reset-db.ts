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

const execAsync = promisify(exec);

const { LOCAL_DB_HOST, LOCAL_DB_USER, LOCAL_DB_NAME } = process.env;

async function resetDatabase() {
	logInfo("🔍 Checking if database exists...");
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

	const result = await runSQL(`
    SELECT 1 FROM pg_database WHERE datname = '${CLOUD_DB_NAME}';
  `);

	if (!result.includes("1 row")) {
		logWarning(`⚠️  Database ${CLOUD_DB_NAME} does not exist`);
		return;
	}

	logInfo(`🗑️  Dropping database ${CLOUD_DB_NAME}...`);
	await runSQL(`DROP DATABASE ${CLOUD_DB_NAME};`);

	logInfo(`📦 Creating database ${CLOUD_DB_NAME}...`);
	await runSQL(`CREATE DATABASE ${CLOUD_DB_NAME};`);

	logSuccess(`✅ Database ${CLOUD_DB_NAME} reset successfully`);
}

// Check if this module is being run directly
if (require.main === module) {
	resetDatabase().catch((error) => {
		logError(
			`Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	});
}
