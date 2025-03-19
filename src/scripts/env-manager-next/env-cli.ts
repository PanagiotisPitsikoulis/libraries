#!/usr/bin/env bun
import * as fs from "node:fs";
import { join } from "node:path";
import { select } from "@inquirer/prompts";
import { logError, logInfo, logSuccess, logWarning } from "../utils";
import { projectRegistry } from "./env-registry";

// Get the root directory (where the command is run)
const rootDir = process.cwd();
const tempDir = join(rootDir, ".next-toolchain-temp");
const envRegistryPath = join(tempDir, "env.config.json");

// Ensure temp directory exists
if (!fs.existsSync(tempDir)) {
	fs.mkdirSync(tempDir, { recursive: true });
}

// Initialize example configs if they don't exist
if (!fs.existsSync(envRegistryPath)) {
	const exampleConfig = {
		projects: projectRegistry,
	};
	fs.writeFileSync(envRegistryPath, JSON.stringify(exampleConfig, null, 2));
	logInfo("📝 Created initial configuration file");
} else {
	try {
		const content = fs.readFileSync(envRegistryPath, "utf-8");
		const config = JSON.parse(content);
		if (!config.projects || Object.keys(config.projects).length === 0) {
			console.log(
				"\x1b[33m%s\x1b[0m",
				"⚠️  No project configurations found in env.config.json",
			);
			console.log(
				"\x1b[36m%s\x1b[0m",
				"💡 Run 'next-toolchain-config-env' to set up your project configurations",
			);
		}
	} catch (error) {
		console.log(
			"\x1b[31m%s\x1b[0m",
			"❌ Error reading environment configuration file",
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
			projects: projectRegistry,
		};
		fs.writeFileSync(envRegistryPath, JSON.stringify(exampleConfig, null, 2));
		logSuccess("✨ New configuration file created successfully!");
	}
}

async function getCurrentProject(): Promise<string | null> {
	const envPath = join(rootDir, ".env");
	if (!fs.existsSync(envPath)) {
		console.log("\x1b[33m%s\x1b[0m", "⚠️  No .env file found");
		console.log(
			"\x1b[36m%s\x1b[0m",
			"💡 Run 'next-toolchain-config-env' to set up your environment",
		);
		return null;
	}

	try {
		const content = fs.readFileSync(envPath, "utf-8");
		const databaseUri = content.match(/DATABASE_URI=(.+)/)?.[1];

		if (!databaseUri) {
			console.log("\x1b[33m%s\x1b[0m", "⚠️  No DATABASE_URI found in .env file");
			console.log(
				"\x1b[36m%s\x1b[0m",
				"💡 Select a project to configure your environment",
			);
			return null;
		}

		// First try to get registry from temp config
		let registry = projectRegistry;
		if (fs.existsSync(envRegistryPath)) {
			try {
				const tempConfig = JSON.parse(
					fs.readFileSync(envRegistryPath, "utf-8"),
				);
				registry = tempConfig.projects;
			} catch (error) {
				console.log("\x1b[31m%s\x1b[0m", "❌ Error reading configuration file");
				console.log("\x1b[33m%s\x1b[0m", "💡 Using default project registry");
			}
		}

		for (const [key, config] of Object.entries(registry)) {
			if (config.variables.includes(databaseUri)) {
				return config.name;
			}
		}
		console.log(
			"\x1b[33m%s\x1b[0m",
			"⚠️  No matching project found for current database URI",
		);
		console.log(
			"\x1b[36m%s\x1b[0m",
			"💡 Select a project to configure your environment",
		);
		return null;
	} catch (error) {
		console.log(
			"\x1b[31m%s\x1b[0m",
			"❌ Error reading environment configuration",
		);
		console.log(
			"\x1b[33m%s\x1b[0m",
			"💡 The configuration file might be corrupted",
		);
		return null;
	}
}

async function updateEnv() {
	// Load or create registry
	let registry = projectRegistry;
	if (fs.existsSync(envRegistryPath)) {
		try {
			const content = fs.readFileSync(envRegistryPath, "utf-8");
			const tempConfig = JSON.parse(content);
			registry = tempConfig.projects;
			logInfo(
				"📝 Loaded existing configuration from .next-toolchain-temp/env.config.json",
			);
		} catch (error) {
			console.log("\x1b[31m%s\x1b[0m", "❌ Error reading configuration file");
			console.log("\x1b[33m%s\x1b[0m", "💡 Using default project registry");
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
	fs.writeFileSync(
		envPath,
		Array.isArray(project.variables)
			? project.variables.join("\n")
			: project.variables,
	);

	// Save updated registry back to temp config
	const tempConfig = { projects: registry };
	fs.writeFileSync(envRegistryPath, JSON.stringify(tempConfig, null, 2));

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
	logError(error instanceof Error ? error.message : "Unknown error");
	process.exit(1);
});
