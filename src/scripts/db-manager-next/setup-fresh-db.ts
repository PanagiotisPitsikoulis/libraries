#!/usr/bin/env bun
import { join } from "node:path";
import { $ } from "bun";
import { config } from "dotenv";
import {
	executeStep,
	getUnifiedTempDir,
	logError,
	logInfo,
	logSuccess,
	logWarning,
} from "../utils";

// Load environment variables from db.conf in the unified temp folder
config({ path: join(getUnifiedTempDir(), "db.conf") });

const {
	CLOUD_DB_NAME,
	CLOUD_DB_USER,
	CLOUD_DB_PASS,
	CLOUD_DB_HOST,
	CLOUD_DB_PORT,
	DB_MAX_CONNECTIONS,
	APP_USER,
	APP_PASS,
} = process.env;

async function runSQL(command: string, database = "postgres"): Promise<string> {
	try {
		const result =
			await $`PGPASSWORD=${CLOUD_DB_PASS} psql -h ${CLOUD_DB_HOST} -p ${CLOUD_DB_PORT} -U ${CLOUD_DB_USER} -d ${database} -c ${command}`.text();
		return result.trim();
	} catch (error) {
		logError(
			`SQL command failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return "";
	}
}

async function main() {
	logInfo("🔄 Starting fresh database setup...");

	// Check if database exists
	logInfo("🔍 Checking if database exists...");
	const dbExists = await runSQL(
		`SELECT 1 FROM pg_database WHERE datname='${CLOUD_DB_NAME}'`,
	);

	if (dbExists.includes("1")) {
		logWarning(`⚠️  Database '${CLOUD_DB_NAME}' already exists. Removing...`);

		// Step 1: Revoke new connections
		logInfo("🔌 Revoking new connections...");
		await runSQL(`ALTER DATABASE ${CLOUD_DB_NAME} CONNECTION LIMIT 0;`);

		// Step 2: Terminate existing connections
		logInfo("🔌 Terminating all existing connections...");
		await runSQL(
			`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${CLOUD_DB_NAME}' AND pid <> pg_backend_pid();`,
		);

		// Step 3: Drop database with force
		logInfo("🗑️  Dropping existing database...");
		await runSQL(`DROP DATABASE IF EXISTS ${CLOUD_DB_NAME} WITH (FORCE);`);

		logSuccess("Existing database removed successfully");
	} else {
		logInfo("ℹ️  Database does not exist, proceeding with creation");
	}

	// Step 4: Create fresh database
	logInfo("🏗️  Creating fresh database...");
	const createResult = await runSQL(`CREATE DATABASE ${CLOUD_DB_NAME};`);
	if (!createResult.includes("ERROR")) {
		logSuccess("Database created successfully");
	} else {
		logError("Failed to create database");
		process.exit(1);
	}

	// Step 5: Set database connection limit
	logInfo("🔧 Setting connection limit...");
	await runSQL(
		`ALTER DATABASE ${CLOUD_DB_NAME} CONNECTION LIMIT ${DB_MAX_CONNECTIONS};`,
	);

	// Step 6: Connect to new database and create extensions
	logInfo("🔌 Setting up extensions...");
	await runSQL(
		`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "hstore";
  `,
		CLOUD_DB_NAME,
	);

	// Step 7: Create payload user and grant permissions
	logInfo(`👤 Creating ${APP_USER} user and granting permissions...`);
	await runSQL(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${APP_USER}') THEN
        CREATE USER ${APP_USER} WITH PASSWORD '${APP_PASS}';
      END IF;
    END
    $$;
  `);

	await runSQL(
		`
    GRANT ALL PRIVILEGES ON DATABASE ${CLOUD_DB_NAME} TO ${APP_USER};
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${APP_USER};
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${APP_USER};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO ${APP_USER};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO ${APP_USER};
  `,
		CLOUD_DB_NAME,
	);

	logSuccess("Database setup completed successfully!");

	// Step 8: Configure database timeouts
	logInfo("⚙️ Configuring database timeouts...");
	await executeStep("Setting timeouts", "bun", [
		"run",
		join(__dirname, "set-timeouts.ts"),
	]);

	logInfo("🔑 Connection string:");
	console.log(
		`postgresql://${APP_USER}:${APP_PASS}@${CLOUD_DB_HOST}:${CLOUD_DB_PORT}/${CLOUD_DB_NAME}`,
	);
}

main().catch((error) => {
	logError(`Unexpected error: ${error.message}`);
	process.exit(1);
});
