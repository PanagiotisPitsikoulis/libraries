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

export interface DBConfig {
	name: string;
	dbName: string;
	user: string;
	host: string;
	port?: string;
	password?: string;
}

export interface DBPair {
	name: string;
	local: DBConfig;
	production: DBConfig;
}

export const databaseRegistry: Record<string, DBPair> = {
	portfolio: {
		name: "Portfolio",
		local: {
			name: "Local Portfolio",
			dbName: "user",
			user: "user",
			host: "localhost",
		},
		production: {
			name: "Production Portfolio",
			dbName: "user",
			user: "user",
			host: "shinkansen.proxy.rlwy.net",
			port: "55719",
			password: "user",
		},
	},
};

export const defaultSettings = {
	maxConnections: 10,
	statementTimeout: "15s",
	idleTransactionTimeout: "2min",
	idleSessionTimeout: "3min",
	masterIdleTimeout: "5min",
	tcpKeepalivesIdle: 60,
	tcpKeepalivesInterval: 30,
	tcpKeepalivesCount: 3,
	appUser: "payload",
	appPass: "payload",
};

export async function registerDatabase() {
	logInfo("🔍 Checking if database exists...");
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

	const result = await runSQL(`
    SELECT 1 FROM pg_database WHERE datname = '${CLOUD_DB_NAME}';
  `);

	if (!result.includes("1 row")) {
		logWarning(`⚠️  Database ${CLOUD_DB_NAME} does not exist`);
		return;
	}

	logInfo(`📝 Registering database ${CLOUD_DB_NAME}...`);
	await runSQL(`
    ALTER DATABASE ${CLOUD_DB_NAME} OWNER TO ${APP_USER};
  `);

	logSuccess(`✅ Database ${CLOUD_DB_NAME} registered successfully`);
}

// Check if this module is being run directly
if (require.main === module) {
	registerDatabase().catch((error) => {
		logError(
			`Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	});
}
