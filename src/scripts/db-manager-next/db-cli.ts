#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { select } from "@inquirer/prompts";
import { config } from "dotenv";
import {
	getUnifiedTempDir,
	getUnifiedTempFilePath,
	initExampleConfigs,
	logError,
	logInfo,
	logSuccess,
} from "../utils";
import {
	type DBConfig,
	type DBPair,
	databaseRegistry,
	defaultSettings,
} from "./db-registry";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbConfPath = getUnifiedTempFilePath("db.config.json");

// Initialize example configs if they don't exist
if (!existsSync(dbConfPath)) {
	initExampleConfigs();
}

type ScriptOption = {
	name: string;
	value: string;
	description: string;
};

const scriptOptions: ScriptOption[] = [
	{
		name: "📝 Update Configuration",
		value: "config",
		description: "Update db.conf with new database configuration",
	},
	{
		name: "🚀 Migrate (Local → Production)",
		value: "migrate",
		description: "Migrate local database to production",
	},
	{
		name: "⬇️  Migrate Reverse (Production → Local)",
		value: "migrate-reverse",
		description: "Migrate production database to local",
	},
	{
		name: "🔄 Setup Fresh Database",
		value: "setup-fresh-db",
		description: "Setup a fresh database with proper configuration",
	},
	{
		name: "⚡️ Set Timeouts",
		value: "set-timeouts",
		description: "Configure database timeout settings",
	},
	{
		name: "🔌 Close Connections",
		value: "close-connections",
		description: "View and close active database connections",
	},
	{
		name: "📋 Clone Database",
		value: "clone-db",
		description: "Clone local database to production",
	},
];

async function updateConfig() {
	console.log("🗄️  Database Configuration Manager");
	console.log("----------------------------------\n");

	// Select the database pair
	const dbPairChoices = Object.entries(databaseRegistry).map(([key, pair]) => ({
		name: pair.name,
		value: key,
	}));

	const selectedPair = await select({
		message: "Select database:",
		choices: dbPairChoices,
	});

	const pair = databaseRegistry[selectedPair];
	if (!pair) {
		throw new Error(`Invalid database pair selected: ${selectedPair}`);
	}

	// Generate db.conf content
	const content = `# Database configuration managed by db-cli

# Local database configuration
LOCAL_DB_NAME="${pair.local.dbName}"
LOCAL_DB_USER="${pair.local.user}"
LOCAL_DB_HOST="${pair.local.host}"
${pair.local.port ? `LOCAL_DB_PORT="${pair.local.port}"` : ""}
${pair.local.password ? `LOCAL_DB_PASS="${pair.local.password}"` : ""}

# Cloud database configuration
CLOUD_DB_NAME="${pair.production.dbName}"
CLOUD_DB_USER="${pair.production.user}"
CLOUD_DB_HOST="${pair.production.host}"
${pair.production.port ? `CLOUD_DB_PORT="${pair.production.port}"` : ""}
${pair.production.password ? `CLOUD_DB_PASS="${pair.production.password}"` : ""}

# Database settings
DB_MAX_CONNECTIONS=${defaultSettings.maxConnections}
DB_STATEMENT_TIMEOUT="${defaultSettings.statementTimeout}"
DB_IDLE_TRANSACTION_TIMEOUT="${defaultSettings.idleTransactionTimeout}"
DB_IDLE_SESSION_TIMEOUT="${defaultSettings.idleSessionTimeout}"
DB_MASTER_IDLE_TIMEOUT="${defaultSettings.masterIdleTimeout}"
DB_TCP_KEEPALIVES_IDLE=${defaultSettings.tcpKeepalivesIdle}
DB_TCP_KEEPALIVES_INTERVAL=${defaultSettings.tcpKeepalivesInterval}
DB_TCP_KEEPALIVES_COUNT=${defaultSettings.tcpKeepalivesCount}

# Application user settings
APP_USER="${defaultSettings.appUser}"
APP_PASS="${defaultSettings.appPass}"`;

	// Write to db.conf
	writeFileSync(dbConfPath, content);

	logSuccess("Database configuration updated successfully!");
	logInfo(`📝 Configuration file: ${dbConfPath}`);
	logInfo(`🔌 Connected to: ${pair.name}`);
	logInfo(`📊 Local: ${pair.local.dbName} on ${pair.local.host}`);
	logInfo(
		`🌍 Production: ${pair.production.dbName} on ${pair.production.host}`,
	);
}

async function runScript(scriptName: string) {
	const scriptPath = join(__dirname, `${scriptName}.ts`);
	try {
		await import(scriptPath);
		return true;
	} catch (error) {
		logError(
			`Failed to run ${scriptName}: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return false;
	}
}

async function getCurrentDatabase(): Promise<string | null> {
	if (!existsSync(dbConfPath)) {
		return null;
	}

	try {
		config({ path: dbConfPath });
		const localDbName = process.env.LOCAL_DB_NAME;
		const cloudDbName = process.env.CLOUD_DB_NAME;

		// Find the matching database pair
		for (const [_, pair] of Object.entries(databaseRegistry)) {
			if (
				pair.local.dbName === localDbName &&
				pair.production.dbName === cloudDbName
			) {
				return pair.name;
			}
		}
		return null;
	} catch (error) {
		return null;
	}
}

async function main() {
	console.log("🗄️  Database Configuration Manager");
	console.log("----------------------------------\n");

	const currentDb = await getCurrentDatabase();
	if (currentDb) {
		logInfo(`Current database: ${currentDb}`);
		console.log("----------------------------------\n");
	}

	const action = await select({
		message: "Select action:",
		choices: scriptOptions.map((opt) => ({
			name: `${opt.name} - ${opt.description}`,
			value: opt.value,
		})),
	});

	if (action === "config") {
		await updateConfig();
	} else {
		await runScript(action);
	}
}

main().catch((error) => {
	console.error(
		"❌ Error:",
		error instanceof Error ? error.message : "Unknown error",
	);
	process.exit(1);
});
