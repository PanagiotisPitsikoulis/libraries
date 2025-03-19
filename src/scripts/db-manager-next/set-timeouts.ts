#!/usr/bin/env bun
import { join } from "node:path";
import { $ } from "bun";
import { config } from "dotenv";
import { logError, logInfo, logSuccess } from "../utils";

// Load environment variables from db.conf
const rootDir = process.cwd();
const tempDir = join(rootDir, ".next-toolchain-temp");
config({ path: join(tempDir, "db.conf") });

const {
	CLOUD_DB_NAME,
	CLOUD_DB_USER,
	CLOUD_DB_PASS,
	CLOUD_DB_HOST,
	CLOUD_DB_PORT,
	DB_STATEMENT_TIMEOUT,
	DB_IDLE_TRANSACTION_TIMEOUT,
	DB_IDLE_SESSION_TIMEOUT,
	DB_MASTER_IDLE_TIMEOUT,
	DB_TCP_KEEPALIVES_IDLE,
	DB_TCP_KEEPALIVES_INTERVAL,
	DB_TCP_KEEPALIVES_COUNT,
	APP_USER,
} = process.env;

async function runSQL(command: string): Promise<string> {
	try {
		// Execute each command separately to better handle errors
		const commands = command.split(";").filter((cmd) => cmd.trim());
		for (const cmd of commands) {
			if (!cmd.trim()) continue;
			await $`PGPASSWORD=${CLOUD_DB_PASS} psql -h ${CLOUD_DB_HOST} -p ${CLOUD_DB_PORT} -U ${CLOUD_DB_USER} -d ${CLOUD_DB_NAME} -c ${cmd.trim()}`;
		}
		return "Commands executed successfully";
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`SQL command failed: ${error.message}`);
		}
		throw error;
	}
}

async function main() {
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
		process.exit(1);
	}
}

main();
