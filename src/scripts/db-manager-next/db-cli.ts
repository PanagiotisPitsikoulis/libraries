#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { select } from "@inquirer/prompts";
import { config } from "dotenv";
import * as utils from "../utils";
import {
	type DBConfig,
	type DBPair,
	databaseRegistry,
	defaultSettings,
} from "./db-registry";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbConfPath = utils.getUnifiedTempFilePath("db.config.json");

// Initialize example configs if they don't exist
if (!existsSync(dbConfPath)) {
	utils.initExampleConfigs();
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

	// Load existing config if it exists
	let existingConfig = null;
	if (existsSync(dbConfPath)) {
		try {
			const content = readFileSync(dbConfPath, "utf-8");
			existingConfig = JSON.parse(content);
			utils.logInfo("📝 Loaded existing configuration");
		} catch (error) {
			utils.logWarning("Could not parse existing config, using defaults");
		}
	}

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

	// Merge existing config with new config
	const newConfig = {
		databases: {
			local: {
				uri:
					existingConfig?.databases?.local?.uri ||
					`postgres://${pair.local.user}:${pair.local.password}@${pair.local.host}:${pair.local.port}/${pair.local.dbName}`,
				name: pair.local.dbName,
				user: pair.local.user,
				host: pair.local.host,
				port: pair.local.port,
				password: pair.local.password,
				dbName: pair.local.dbName,
			},
			production: {
				uri:
					existingConfig?.databases?.production?.uri ||
					`postgres://${pair.production.user}:${pair.production.password}@${pair.production.host}:${pair.production.port}/${pair.production.dbName}`,
				name: pair.production.dbName,
				user: pair.production.user,
				host: pair.production.host,
				port: pair.production.port,
				password: pair.production.password,
				dbName: pair.production.dbName,
			},
		},
		settings: {
			...defaultSettings,
			...(existingConfig?.settings || {}),
		},
	};

	// Write to db.config.json
	writeFileSync(dbConfPath, JSON.stringify(newConfig, null, 2));

	// Generate db.conf content for environment variables
	const content = `# Database configuration managed by db-cli

# Local database configuration
LOCAL_DB_NAME="${newConfig.databases.local.dbName}"
LOCAL_DB_USER="${newConfig.databases.local.user}"
LOCAL_DB_HOST="${newConfig.databases.local.host}"
${newConfig.databases.local.port ? `LOCAL_DB_PORT="${newConfig.databases.local.port}"` : ""}
${newConfig.databases.local.password ? `LOCAL_DB_PASS="${newConfig.databases.local.password}"` : ""}

# Cloud database configuration
CLOUD_DB_NAME="${newConfig.databases.production.dbName}"
CLOUD_DB_USER="${newConfig.databases.production.user}"
CLOUD_DB_HOST="${newConfig.databases.production.host}"
${newConfig.databases.production.port ? `CLOUD_DB_PORT="${newConfig.databases.production.port}"` : ""}
${newConfig.databases.production.password ? `CLOUD_DB_PASS="${newConfig.databases.production.password}"` : ""}

# Database settings
DB_MAX_CONNECTIONS=${newConfig.settings.maxConnections}
DB_STATEMENT_TIMEOUT="${newConfig.settings.statementTimeout}"
DB_IDLE_TRANSACTION_TIMEOUT="${newConfig.settings.idleTransactionTimeout}"
DB_IDLE_SESSION_TIMEOUT="${newConfig.settings.idleSessionTimeout}"
DB_MASTER_IDLE_TIMEOUT="${newConfig.settings.masterIdleTimeout}"
DB_TCP_KEEPALIVES_IDLE=${newConfig.settings.tcpKeepalivesIdle}
DB_TCP_KEEPALIVES_INTERVAL=${newConfig.settings.tcpKeepalivesInterval}
DB_TCP_KEEPALIVES_COUNT=${newConfig.settings.tcpKeepalivesCount}

# Application user settings
APP_USER="${newConfig.settings.appUser}"
APP_PASS="${newConfig.settings.appPass}"`;

	// Write to db.conf
	writeFileSync(join(process.cwd(), ".env"), content);

	utils.logSuccess("Database configuration updated successfully!");
	utils.logInfo(`📝 Configuration file: ${dbConfPath}`);
	utils.logInfo(`🔌 Connected to: ${pair.name}`);
	utils.logInfo(
		`📊 Local: ${newConfig.databases.local.dbName} on ${newConfig.databases.local.host}`,
	);
	utils.logInfo(
		`🌍 Production: ${newConfig.databases.production.dbName} on ${newConfig.databases.production.host}`,
	);
}

async function runScript(scriptName: string) {
	const scriptPath = join(__dirname, `${scriptName}.ts`);
	try {
		await import(scriptPath);
		return true;
	} catch (error) {
		utils.logError(
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
		utils.logInfo(`Current database: ${currentDb}`);
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
	utils.logError(error instanceof Error ? error.message : "Unknown error");
	process.exit(1);
});
