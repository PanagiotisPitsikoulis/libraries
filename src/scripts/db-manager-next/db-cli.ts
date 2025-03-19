#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { select } from "@inquirer/prompts";
import * as utils from "../utils";
import { cloneDb } from "./clone-db";
import { closeConnections } from "./close-connections";
import { type DBPair, databaseRegistry, defaultSettings } from "./db-registry";
import { migrate } from "./migrate";
import { migrateReverse } from "./migrate-reverse";
import { setTimeouts } from "./set-timeouts";
import { setupFreshDb } from "./setup-fresh-db";

const rootDir = process.cwd();
const tempDir = join(rootDir, ".next-toolchain-temp");
const dbConfigPath = join(tempDir, "db.config.json");

// Ensure temp directory exists
if (!existsSync(tempDir)) {
	utils.runCommand(`mkdir -p ${tempDir}`);
}

// Initialize example configs if they don't exist
if (!existsSync(dbConfigPath)) {
	const exampleConfig = {
		databases: databaseRegistry,
		settings: defaultSettings,
	};
	writeFileSync(dbConfigPath, JSON.stringify(exampleConfig, null, 2));
	utils.logInfo("📝 Created initial configuration file");
} else {
	try {
		const content = readFileSync(dbConfigPath, "utf-8");
		const config = JSON.parse(content);
		if (!config.databases || Object.keys(config.databases).length === 0) {
			console.log(
				"\x1b[33m%s\x1b[0m",
				"⚠️  No database configurations found in db.config.json",
			);
			console.log(
				"\x1b[36m%s\x1b[0m",
				"💡 Run 'next-toolchain-config-db' to set up your database configurations",
			);
		}
	} catch (error) {
		console.log(
			"\x1b[31m%s\x1b[0m",
			"❌ Error reading database configuration file",
		);
		console.log(
			"\x1b[33m%s\x1b[0m",
			"💡 The file might be corrupted or in an invalid format",
		);
		console.log(
			"\x1b[36m%s\x1b[0m",
			"🔄 Creating a new configuration file with default settings...",
		);

		const exampleConfig = {
			databases: databaseRegistry,
			settings: defaultSettings,
		};
		writeFileSync(dbConfigPath, JSON.stringify(exampleConfig, null, 2));
		utils.logSuccess("✨ New configuration file created successfully!");
	}
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

	// Load or create registry
	let registry = databaseRegistry;
	if (existsSync(dbConfigPath)) {
		try {
			const content = readFileSync(dbConfigPath, "utf-8");
			const tempConfig = JSON.parse(content);
			registry = tempConfig.databases;
			utils.logInfo(
				"📝 Loaded existing configuration from .next-toolchain-temp/db.config.json",
			);
		} catch (error) {
			console.log("\x1b[31m%s\x1b[0m", "❌ Error reading configuration file");
			console.log("\x1b[33m%s\x1b[0m", "💡 Using default database registry");
		}
	}

	// Select the database pair
	const dbPairChoices = Object.entries(registry).map(([key, pair]) => ({
		name: pair.name,
		value: key,
	}));

	const selectedPair = await select({
		message: "Select database:",
		choices: dbPairChoices,
	});

	const pair = registry[selectedPair];
	if (!pair) {
		throw new Error(`Invalid database pair selected: ${selectedPair}`);
	}

	// Merge existing config with new config
	const newConfig = {
		databases: {
			...registry,
			[selectedPair]: {
				name: pair.name,
				local: {
					name: pair.local.name,
					dbName: pair.local.dbName,
					user: pair.local.user,
					host: pair.local.host,
					...(pair.local.port && { port: pair.local.port }),
					...(pair.local.password && { password: pair.local.password }),
				},
				production: {
					name: pair.production.name,
					dbName: pair.production.dbName,
					user: pair.production.user,
					host: pair.production.host,
					...(pair.production.port && { port: pair.production.port }),
					...(pair.production.password && {
						password: pair.production.password,
					}),
				},
			},
		},
		settings: {
			...defaultSettings,
		},
	};

	// Write to db.config.json
	writeFileSync(dbConfigPath, JSON.stringify(newConfig, null, 2));

	// Generate db.conf content for environment variables
	const content = `# Database configuration managed by db-cli

# Local database configuration
LOCAL_DB_NAME="${newConfig.databases[selectedPair].local.dbName}"
LOCAL_DB_USER="${newConfig.databases[selectedPair].local.user}"
LOCAL_DB_HOST="${newConfig.databases[selectedPair].local.host}"
${newConfig.databases[selectedPair].local.port ? `LOCAL_DB_PORT="${newConfig.databases[selectedPair].local.port}"` : ""}
${newConfig.databases[selectedPair].local.password ? `LOCAL_DB_PASS="${newConfig.databases[selectedPair].local.password}"` : ""}

# Cloud database configuration
CLOUD_DB_NAME="${newConfig.databases[selectedPair].production.dbName}"
CLOUD_DB_USER="${newConfig.databases[selectedPair].production.user}"
CLOUD_DB_HOST="${newConfig.databases[selectedPair].production.host}"
${newConfig.databases[selectedPair].production.port ? `CLOUD_DB_PORT="${newConfig.databases[selectedPair].production.port}"` : ""}
${newConfig.databases[selectedPair].production.password ? `CLOUD_DB_PASS="${newConfig.databases[selectedPair].production.password}"` : ""}

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
	const dbConfPath = join(tempDir, "db.conf");
	writeFileSync(dbConfPath, content);
	utils.logInfo(`📄 db.conf saved at: ${dbConfPath}`);

	utils.logSuccess("Database configuration updated successfully!");
	utils.logInfo(`📝 Configuration file: ${dbConfigPath}`);
	utils.logInfo(`🔌 Connected to: ${pair.name}`);
	utils.logInfo(
		`📊 Local: ${newConfig.databases[selectedPair].local.dbName} on ${newConfig.databases[selectedPair].local.host}`,
	);
	utils.logInfo(
		`🌍 Production: ${newConfig.databases[selectedPair].production.dbName} on ${newConfig.databases[selectedPair].production.host}`,
	);
}

async function runScript(scriptName: string) {
	try {
		switch (scriptName) {
			case "migrate":
				try {
					await migrate();
				} catch (error) {
					utils.logError(
						`Failed to run migrate: ${error instanceof Error ? error.message : "Unknown error"}`,
					);
				}
				break;
			case "migrate-reverse":
				try {
					await migrateReverse();
				} catch (error) {
					utils.logError(
						`Failed to run migrate-reverse: ${error instanceof Error ? error.message : "Unknown error"}`,
					);
				}
				break;
			case "setup-fresh-db":
				await setupFreshDb();
				break;
			case "set-timeouts":
				try {
					await setTimeouts();
				} catch (error) {
					utils.logError(
						`Failed to run set-timeouts: ${error instanceof Error ? error.message : "Unknown error"}`,
					);
				}
				break;
			case "close-connections":
				try {
					await closeConnections();
				} catch (error) {
					utils.logError(
						`Failed to run close-connections: ${error instanceof Error ? error.message : "Unknown error"}`,
					);
				}
				break;
			case "clone-db":
				await cloneDb();
				break;
			default:
				throw new Error(`Unknown script: ${scriptName}`);
		}
		return true;
	} catch (error) {
		utils.logError(
			`Failed to run ${scriptName}: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return false;
	}
}

async function getCurrentDatabase(): Promise<string | null> {
	if (!existsSync(dbConfigPath)) {
		console.log("\x1b[33m%s\x1b[0m", "⚠️  No database configuration file found");
		console.log(
			"\x1b[36m%s\x1b[0m",
			"💡 Run 'next-toolchain-config-db' to set up your database",
		);
		return null;
	}

	try {
		const content = readFileSync(dbConfigPath, "utf-8");
		const config = JSON.parse(content) as { databases: Record<string, DBPair> };

		if (!config.databases || Object.keys(config.databases).length === 0) {
			console.log("\x1b[33m%s\x1b[0m", "⚠️  No database configurations found");
			console.log(
				"\x1b[36m%s\x1b[0m",
				"💡 Select 'Update Configuration' to set up your database",
			);
			return null;
		}

		// Get all configured databases
		const databases = Object.entries(config.databases).map(([key, db]) => ({
			name: db.name,
			local: `${db.local.dbName} on ${db.local.host}`,
			production: `${db.production.dbName} on ${db.production.host}`,
		}));

		// Show all configured databases
		console.log("\x1b[36m%s\x1b[0m", "📊 Configured Databases:");
		for (const db of databases) {
			console.log(`\n${db.name}:`);
			console.log(`  Local: ${db.local}`);
			console.log(`  Production: ${db.production}`);
		}

		return databases[0].name; // Return the first database name for compatibility
	} catch (error) {
		console.log("\x1b[31m%s\x1b[0m", "❌ Error reading database configuration");
		console.log(
			"\x1b[33m%s\x1b[0m",
			"💡 The configuration file might be corrupted",
		);
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
