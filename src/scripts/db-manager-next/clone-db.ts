#!/usr/bin/env bun
import { unlinkSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";
import { config } from "dotenv";
import { logError, logInfo, logSuccess } from "../utils";

// Load environment variables from db.conf in the temp folder
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
	APP_USER,
	APP_PASS,
} = process.env;

async function runSQL(command: string, database = "postgres"): Promise<string> {
	try {
		const result =
			await $`PGPASSWORD=${CLOUD_DB_PASS} psql -h ${CLOUD_DB_HOST} -p ${CLOUD_DB_PORT} -U ${CLOUD_DB_USER} -d ${database} -c ${command}`.text();
		return result.trim();
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`SQL command failed: ${error.message}`);
		}
		throw error;
	}
}

export async function cloneDb() {
	const tempDumpDir = join(__dirname, "temp_dump");

	try {
		logInfo("🔄 Starting database clone process...");

		// Step 1: Dump local database with directory format and no owner
		logInfo("📤 Dumping local database...");
		try {
			await $`pg_dump -h ${LOCAL_DB_HOST} -U ${LOCAL_DB_USER} -d ${LOCAL_DB_NAME} --no-owner --no-acl -Fd -j 4 --exclude-table-data='*_migrations' -f ${tempDumpDir}`;
		} catch (error) {
			logError("Failed to dump local database");
			throw error;
		}

		// Step 2: Terminate existing connections
		logInfo("🔌 Terminating existing connections to remote database...");
		await runSQL(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = '${CLOUD_DB_NAME}' 
      AND pid <> pg_backend_pid();
    `);

		// Step 3: Drop and recreate the database
		logInfo("🗑️  Dropping existing remote database...");
		await runSQL(`DROP DATABASE IF EXISTS ${CLOUD_DB_NAME};`);

		logInfo("🏗️  Creating fresh remote database...");
		await runSQL(`CREATE DATABASE ${CLOUD_DB_NAME};`);

		// Step 4: Restore the dump
		logInfo("📥 Restoring database...");
		try {
			await $`PGPASSWORD=${CLOUD_DB_PASS} pg_restore -h ${CLOUD_DB_HOST} -p ${CLOUD_DB_PORT} -U ${CLOUD_DB_USER} -d ${CLOUD_DB_NAME} --no-owner --no-acl -j 4 ${tempDumpDir}`;
		} catch (error) {
			logError("Failed to restore database");
			throw error;
		}

		// Step 5: Clean up
		await $`rm -rf ${tempDumpDir}`;

		// Step 6: Grant privileges to postgres user
		logInfo("🔑 Setting up permissions...");
		await runSQL(
			`
      ALTER SCHEMA public OWNER TO postgres;
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
      GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO postgres;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO postgres;

      -- Create and setup payload user
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${APP_USER}') THEN
              CREATE USER ${APP_USER} WITH PASSWORD '${APP_PASS}';
          END IF;
      END
      $$;

      GRANT ALL PRIVILEGES ON DATABASE ${CLOUD_DB_NAME} TO ${APP_USER};
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${APP_USER};
      GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${APP_USER};
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO ${APP_USER};
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO ${APP_USER};
    `,
			CLOUD_DB_NAME,
		);

		logSuccess("Database clone completed successfully!");
		logInfo("🔑 Connection string:");
		console.log(
			`postgresql://${APP_USER}:${APP_PASS}@${CLOUD_DB_HOST}:${CLOUD_DB_PORT}/${CLOUD_DB_NAME}`,
		);
	} catch (error) {
		// Clean up temp file if it exists
		try {
			unlinkSync(tempDumpDir);
		} catch {}
		throw error;
	}
}

if (import.meta.main) {
	cloneDb().catch((error) => {
		logError(
			`Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	});
}
