#!/usr/bin/env node
import * as fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { select } from "@inquirer/prompts";
import { logError, logInfo, logSuccess, logWarning } from "../utils";
import { projectRegistry } from "./env-registry";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
			logWarning("⚠️  No project configurations found in env.config.json");
		}
	} catch (error) {
		logWarning("⚠️  Could not parse environment configuration file");
	}
}

async function getCurrentProject(): Promise<string | null> {
	const envPath = join(rootDir, ".env");
	if (!fs.existsSync(envPath)) {
		return null;
	}

	try {
		const content = fs.readFileSync(envPath, "utf-8");
		const databaseUri = content.match(/DATABASE_URI=(.+)/)?.[1];

		// First try to get registry from temp config
		let registry = projectRegistry;
		if (fs.existsSync(envRegistryPath)) {
			try {
				const tempConfig = JSON.parse(
					fs.readFileSync(envRegistryPath, "utf-8"),
				);
				registry = tempConfig.projects;
			} catch (error) {
				logWarning("Could not parse temp config, using default registry");
			}
		}

		for (const [key, config] of Object.entries(registry)) {
			if (config.variables.includes(databaseUri!)) {
				return config.name;
			}
		}
		return null;
	} catch (error) {
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
			logWarning("Could not parse temp config, using default registry");
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
