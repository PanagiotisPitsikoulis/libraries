#!/usr/bin/env node

import { exec } from "node:child_process";
import { unlinkSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { logError, logInfo, logSuccess } from "../utils";
import {
	APP_USER,
	CLOUD_DB_HOST,
	CLOUD_DB_NAME,
	CLOUD_DB_PASS,
	CLOUD_DB_PORT,
	CLOUD_DB_USER,
	runSQL,
} from "./db-utils";

const execAsync = promisify(exec);

const { LOCAL_DB_HOST, LOCAL_DB_USER, LOCAL_DB_NAME } = process.env;

async function runLocalSQL(
	command: string,
	database = "postgres",
): Promise<string> {
	try {
		const { stdout } = await execAsync(
			`psql -h ${LOCAL_DB_HOST} -U ${LOCAL_DB_USER} -d ${database} -c "${command}"`,
		);
		return stdout.trim();
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Local SQL command failed: ${error.message}`);
		}
		throw error;
	}
}

async function runCommand(command: string): Promise<string> {
	try {
		const { stdout } = await execAsync(command);
		return stdout.trim();
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Command failed: ${error.message}`);
		}
		throw error;
	}
}

export async function migrateReverse() {
	const tempDumpDir = join(__dirname, "temp_dump");

	try {
		logInfo("🔄 Starting reverse database migration (cloud → local)...");

		// Step 1: Dump cloud database with directory format and no owner
		logInfo(
			"📤 Creating backup copy from cloud database (read-only operation)...",
		);
		try {
			await runCommand(
				`PGPASSWORD=${CLOUD_DB_PASS} pg_dump -h ${CLOUD_DB_HOST} -p ${CLOUD_DB_PORT} -U ${CLOUD_DB_USER} -d ${CLOUD_DB_NAME} --no-owner --no-acl -Fd -j 4 --exclude-table-data='*_migrations' -f ${tempDumpDir}`,
			);
		} catch (error) {
			logError("Failed to read from cloud database");
			throw error;
		}

		// Step 2: Terminate existing connections to local database
		logInfo("🔌 Terminating existing connections to local database...");
		await runLocalSQL(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = '${LOCAL_DB_NAME}' 
      AND pid <> pg_backend_pid();
    `);

		// Step 3: Drop and recreate the local database
		logInfo(
			"🗑️  Dropping existing local database (cloud database remains untouched)...",
		);
		await runLocalSQL(`DROP DATABASE IF EXISTS ${LOCAL_DB_NAME};`);

		logInfo("🏗️  Creating fresh local database...");
		await runLocalSQL(`CREATE DATABASE ${LOCAL_DB_NAME};`);

		// Step 4: Restore the dump to local database
		logInfo("📥 Restoring database to local...");
		try {
			await runCommand(
				`pg_restore -h ${LOCAL_DB_HOST} -U ${LOCAL_DB_USER} -d ${LOCAL_DB_NAME} --no-owner --no-acl -j 4 ${tempDumpDir}`,
			);
		} catch (error) {
			logError("Failed to restore database");
			throw error;
		}

		// Step 5: Clean up
		await runCommand(`rm -rf ${tempDumpDir}`);

		// Step 6: Grant privileges to local user
		logInfo("🔑 Setting up local permissions...");
		await runLocalSQL(
			`
      ALTER SCHEMA public OWNER TO ${LOCAL_DB_USER};
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${LOCAL_DB_USER};
      GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${LOCAL_DB_USER};
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO ${LOCAL_DB_USER};
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO ${LOCAL_DB_USER};
    `,
			LOCAL_DB_NAME,
		);

		logSuccess("Reverse database migration completed successfully!");
		logInfo("🔑 Local connection string:");
		console.log(
			`postgresql://${LOCAL_DB_USER}@${LOCAL_DB_HOST}/${LOCAL_DB_NAME}`,
		);
	} catch (error) {
		// Clean up temp file if it exists
		try {
			unlinkSync(tempDumpDir);
		} catch {}
		throw error;
	}
}

// Check if this module is being run directly
if (require.main === module) {
	migrateReverse().catch((error) => {
		logError(
			`Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	});
}
