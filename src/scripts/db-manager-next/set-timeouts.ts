#!/usr/bin/env node
import { logError, logInfo, logSuccess } from "../utils";
import { APP_USER, CLOUD_DB_NAME, CLOUD_DB_USER, runSQL } from "./db-utils";

// Database timeout settings
const DB_STATEMENT_TIMEOUT = process.env.DB_STATEMENT_TIMEOUT || "30s";
const DB_IDLE_TRANSACTION_TIMEOUT =
	process.env.DB_IDLE_TRANSACTION_TIMEOUT || "30s";
const DB_IDLE_SESSION_TIMEOUT = process.env.DB_IDLE_SESSION_TIMEOUT || "30s";
const DB_MASTER_IDLE_TIMEOUT = process.env.DB_MASTER_IDLE_TIMEOUT || "30s";
const DB_TCP_KEEPALIVES_IDLE = process.env.DB_TCP_KEEPALIVES_IDLE || "60";
const DB_TCP_KEEPALIVES_INTERVAL =
	process.env.DB_TCP_KEEPALIVES_INTERVAL || "10";
const DB_TCP_KEEPALIVES_COUNT = process.env.DB_TCP_KEEPALIVES_COUNT || "6";

export async function setTimeouts() {
	logInfo("🔧 Setting database timeout parameters...");

	try {
		// Set each parameter individually for better error handling
		await runSQL(
			`ALTER DATABASE ${CLOUD_DB_NAME} SET statement_timeout = '${DB_STATEMENT_TIMEOUT}'`,
		);
		await runSQL(
			`ALTER DATABASE ${CLOUD_DB_NAME} SET idle_in_transaction_session_timeout = '${DB_IDLE_TRANSACTION_TIMEOUT}'`,
		);
		await runSQL(
			`ALTER ROLE ${CLOUD_DB_USER} SET idle_session_timeout = '${DB_IDLE_SESSION_TIMEOUT}'`,
		);
		await runSQL(
			`ALTER ROLE ${APP_USER} SET idle_session_timeout = '${DB_IDLE_SESSION_TIMEOUT}'`,
		);
		await runSQL(
			`ALTER SYSTEM SET idle_session_timeout = '${DB_MASTER_IDLE_TIMEOUT}'`,
		);
		await runSQL(
			`ALTER SYSTEM SET tcp_keepalives_idle = ${DB_TCP_KEEPALIVES_IDLE}`,
		);
		await runSQL(
			`ALTER SYSTEM SET tcp_keepalives_interval = ${DB_TCP_KEEPALIVES_INTERVAL}`,
		);
		await runSQL(
			`ALTER SYSTEM SET tcp_keepalives_count = ${DB_TCP_KEEPALIVES_COUNT}`,
		);

		// Show current settings
		logInfo("📊 Current timeout settings:");
		const currentSettings = await runSQL(`
      SHOW statement_timeout;
      SHOW idle_in_transaction_session_timeout;
      SHOW idle_session_timeout;
      SHOW tcp_keepalives_idle;
      SHOW tcp_keepalives_interval;
      SHOW tcp_keepalives_count;
    `);
		console.log(currentSettings);

		logSuccess("Timeout parameters set successfully!");
	} catch (error) {
		logError(error instanceof Error ? error.message : "Unknown error");
		throw error;
	}
}
