#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { select } from "@inquirer/prompts";
import {
	formatError,
	getUnifiedTempDir,
	getUnifiedTempFilePath,
	handleError,
	logError,
	logInfo,
	logSuccess,
	logWarning,
	readConfig,
	writeConfig,
} from "../utils";
import { projectRegistry } from "./env-registry";

// Get the root directory (where the command is run)
const rootDir = process.cwd();
const tempDir = getUnifiedTempDir();
const envRegistryPath = getUnifiedTempFilePath("env.config.json");

// Initialize example configs if they don't exist
if (!existsSync(envRegistryPath)) {
	const exampleConfig = {
		projects: projectRegistry,
	};
	writeConfig(envRegistryPath, exampleConfig);
	logInfo("📝 Created initial configuration file");
} else {
	try {
		const config = readConfig(envRegistryPath);
		if (!config.projects || Object.keys(config.projects).length === 0) {
			logWarning("No project configurations found in env.config.json");
			logInfo(
				"💡 Run 'next-toolchain-config-env' to set up your project configurations",
			);
		}
	} catch (error) {
		logError("Error reading environment configuration file");
		logWarning("💡 The file might be corrupted or in an invalid format");
		logInfo("🔄 Creating a new configuration file with default settings...");

		const exampleConfig = {
			projects: projectRegistry,
		};
		writeConfig(envRegistryPath, exampleConfig);
		logSuccess("✨ New configuration file created successfully!");
	}
}

async function getCurrentProject(): Promise<string | null> {
	const envPath = join(rootDir, ".env");
	if (!existsSync(envPath)) {
		logWarning("No .env file found");
		logInfo("💡 Run 'next-toolchain-config-env' to set up your environment");
		return null;
	}

	try {
		const content = readFileSync(envPath, "utf-8");
		const databaseUri = content.match(/DATABASE_URI=(.+)/)?.[1];

		if (!databaseUri) {
			logWarning("No DATABASE_URI found in .env file");
			logInfo("💡 Select a project to configure your environment");
			return null;
		}

		// First try to get registry from temp config
		let registry = projectRegistry;
		if (existsSync(envRegistryPath)) {
			try {
				const tempConfig = readConfig(envRegistryPath);
				registry = tempConfig.projects;
			} catch (error) {
				logError("Error reading configuration file");
				logWarning("💡 Using default project registry");
			}
		}

		for (const [key, config] of Object.entries(registry)) {
			if (config.variables.includes(databaseUri)) {
				return config.name;
			}
		}
		logWarning("No matching project found for current database URI");
		logInfo("💡 Select a project to configure your environment");
		return null;
	} catch (error) {
		handleError(error, "Error reading environment configuration");
		return null;
	}
}

async function updateEnv() {
	// Load or create registry
	let registry = projectRegistry;
	if (existsSync(envRegistryPath)) {
		try {
			const tempConfig = readConfig(envRegistryPath);
			registry = tempConfig.projects;
			logInfo(
				"📝 Loaded existing configuration from .next-toolchain-temp/env.config.json",
			);
		} catch (error) {
			logError("Error reading configuration file");
			logWarning("💡 Using default project registry");
		}
	}

	// Select the project
	const projectOptions = Object.entries(registry).map(([key, config]) => ({
		name: config.name,
		value: key,
		description: config.description,
	}));

	const selectedProject = await select({
		message: "Select project:",
		choices: projectOptions.map((opt) => ({
			name: `${opt.name} - ${opt.description}`,
			value: opt.value,
		})),
	});

	const project = registry[selectedProject];
	if (!project) {
		throw new Error(`Invalid project selected: ${selectedProject}`);
	}

	// Write to .env in project root
	const envPath = join(rootDir, ".env");
	writeFileSync(
		envPath,
		Array.isArray(project.variables)
			? project.variables.join("\n")
			: project.variables,
	);

	// Save updated registry back to temp config
	const tempConfig = { projects: registry };
	writeConfig(envRegistryPath, tempConfig);

	logSuccess("Project configuration updated successfully!");
	logInfo(`📝 Configuration file: ${envPath}`);
	logInfo(`🌍 Project: ${project.name}`);
	logInfo(`📁 Registry stored in: ${envRegistryPath}`);

	logWarning(
		"⚠️  Remember to keep your .env file secure and never commit it to version control",
	);
}

async function main() {
	console.log("🌍 Next Toolchain Environment Configuration");
	console.log("------------------------------------------\n");

	const currentProject = await getCurrentProject();
	if (currentProject) {
		logInfo(`Current project: ${currentProject}`);
		console.log("------------------------------------------\n");
	}

	await updateEnv();
}

main().catch((error) => {
	handleError(error, "Environment configuration");
});
