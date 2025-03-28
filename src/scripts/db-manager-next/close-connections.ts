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
	DB_MAX_CONNECTIONS,
	logError,
	logInfo,
	logSuccess,
	logWarning,
	runSQL,
} from "./db-utils";

const execAsync = promisify(exec);

const { LOCAL_DB_HOST, LOCAL_DB_USER, LOCAL_DB_NAME } = process.env;

async function getConnectionCount(): Promise<number> {
	const result = await runSQL(
		`SELECT COUNT(*) FROM pg_stat_activity WHERE datname = '${CLOUD_DB_NAME}';`,
	);
	const lines = result.split("\n");

	// The count is typically on the third line (index 2) after header and separator
	if (lines.length < 3 || !lines[2]) {
		throw new Error("Unexpected result format from connection count query");
	}

	const count = Number.parseInt(lines[2].trim(), 10);
	if (isNaN(count)) {
		throw new Error("Failed to parse connection count");
	}

	return count;
}

export async function closeConnections() {
	logInfo("🔍 Checking current connections...");
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

	const connections = await runSQL(`
    SELECT pid, usename, application_name, client_addr, backend_start, state, query 
    FROM pg_stat_activity 
    WHERE datname = '${CLOUD_DB_NAME}';
  `);
	console.log(connections);
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

	const connCount = await getConnectionCount();
	logInfo(`📊 Found ${connCount} active connections`);

	if (connCount > 0) {
		logWarning("⚠️  Proceeding to close all connections...");

		// First set connection limit to 0 to prevent new connections
		logInfo("🔒 Setting connection limit to 0...");
		await runSQL(`ALTER DATABASE ${CLOUD_DB_NAME} CONNECTION LIMIT 0;`);

		// Terminate all existing connections
		logInfo("🔌 Terminating all existing connections...");
		await runSQL(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = '${CLOUD_DB_NAME}' 
      AND pid <> pg_backend_pid();
    `);

		// Wait a moment and check if connections are really closed
		logInfo("⏳ Verifying connections are closed...");
		await new Promise((resolve) => setTimeout(resolve, 2000));

		const newCount = await getConnectionCount();

		if (newCount === 0) {
			logSuccess("All connections successfully closed");

			// Reset connection limit to configured value
			logInfo(`🔓 Resetting connection limit to ${DB_MAX_CONNECTIONS}...`);
			await runSQL(
				`ALTER DATABASE ${CLOUD_DB_NAME} CONNECTION LIMIT ${DB_MAX_CONNECTIONS};`,
			);

			logSuccess("Database connection limit restored");
		} else {
			logError(`Some connections could not be closed (${newCount} remaining)`);
			logInfo("🔍 Remaining connections:");
			const remainingConns = await runSQL(`
        SELECT pid, usename, application_name, client_addr 
        FROM pg_stat_activity 
        WHERE datname = '${CLOUD_DB_NAME}';
      `);
			console.log(remainingConns);
		}
	} else {
		logSuccess("No active connections found");
	}

	logInfo("📊 Final connection status:");
	const finalStatus = await runSQL(`
    SELECT current_setting('max_connections') as max_connections, 
    (SELECT count(*) FROM pg_stat_activity WHERE datname = '${CLOUD_DB_NAME}') as current_connections;
  `);
	console.log(finalStatus);
}
