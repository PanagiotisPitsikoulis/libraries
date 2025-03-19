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

async function createDatabase() {
	logInfo("🔍 Checking if database exists...");
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

	const result = await runSQL(`
    SELECT 1 FROM pg_database WHERE datname = '${CLOUD_DB_NAME}';
  `);

	if (result.includes("1 row")) {
		logWarning(`⚠️  Database ${CLOUD_DB_NAME} already exists`);
		return;
	}

	logInfo(`📦 Creating database ${CLOUD_DB_NAME}...`);
	await runSQL(`CREATE DATABASE ${CLOUD_DB_NAME};`);

	logInfo("🔒 Setting connection limit...");
	await runSQL(
		`ALTER DATABASE ${CLOUD_DB_NAME} CONNECTION LIMIT ${DB_MAX_CONNECTIONS};`,
	);

	logSuccess(`✅ Database ${CLOUD_DB_NAME} created successfully`);
}
