#!/usr/bin/env bun
import { unlinkSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";
import { config } from "dotenv";
import { logError, logInfo, logSuccess } from "../utils";

// Load environment variables from db.conf
const rootDir = process.cwd();
const tempDir = join(rootDir, ".next-toolchain-temp");
config({ path: join(tempDir, "db.conf") });

const {
	LOCAL_DB_HOST,
	LOCAL_DB_USER,
	LOCAL_DB_NAME,
	CLOUD_DB_NAME,
	CLOUD_DB_USER,
	CLOUD_DB_PASS,
	CLOUD_DB_HOST,
	CLOUD_DB_PORT,
} = process.env;

async function runLocalSQL(
	command: string,
	database = "postgres",
): Promise<string> {
	try {
		const result =
			await $`psql -h ${LOCAL_DB_HOST} -U ${LOCAL_DB_USER} -d ${database} -c ${command}`.text();
		return result.trim();
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Local SQL command failed: ${error.message}`);
		}
		throw error;
	}
}

async function main() {
	const tempDumpDir = join(__dirname, "temp_dump");

	try {
		logInfo("🔄 Starting reverse database migration (cloud → local)...");

		// Step 1: Dump cloud database with directory format and no owner
		logInfo(
			"📤 Creating backup copy from cloud database (read-only operation)...",
		);
		try {
			await $`PGPASSWORD=${CLOUD_DB_PASS} pg_dump -h ${CLOUD_DB_HOST} -p ${CLOUD_DB_PORT} -U ${CLOUD_DB_USER} -d ${CLOUD_DB_NAME} --no-owner --no-acl -Fd -j 4 --exclude-table-data='*_migrations' -f ${tempDumpDir}`;
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
			await $`pg_restore -h ${LOCAL_DB_HOST} -U ${LOCAL_DB_USER} -d ${LOCAL_DB_NAME} --no-owner --no-acl -j 4 ${tempDumpDir}`;
		} catch (error) {
			logError("Failed to restore database");
			throw error;
		}

		// Step 5: Clean up
		await $`rm -rf ${tempDumpDir}`;

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

main().catch((error) => {
	console.error(
		"❌ Error:",
		error instanceof Error ? error.message : "Unknown error",
	);
	process.exit(1);
});
