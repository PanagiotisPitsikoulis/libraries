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

export async function testConnection() {
	logInfo("🔍 Testing database connection...");
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

	try {
		const result = await runSQL("SELECT version();");
		console.log(result);
		logSuccess("✅ Database connection successful");
	} catch (error) {
		logError(
			`❌ Database connection failed: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
		throw error;
	}
}
