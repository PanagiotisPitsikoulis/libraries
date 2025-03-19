#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { select } from "@inquirer/prompts";
import { logError, logInfo, logSuccess, logWarning } from "../utils";
import { projectRegistry } from "./env-registry";

// Get the root directory (where the command is run)
const rootDir = process.cwd();
const tempDir = join(rootDir, ".next-toolchain-config");
const envRegistryPath = join(tempDir, "env.registry.json");

// Ensure temp directory exists
if (!existsSync(tempDir)) {
	mkdirSync(tempDir, { recursive: true });
}

async function getCurrentProject(): Promise<string | null> {
	const envPath = join(rootDir, ".env");
	if (!existsSync(envPath)) {
		return null;
	}

	try {
		const content = readFileSync(envPath, "utf-8");
		const databaseUri = content.match(/DATABASE_URI=(.+)/)?.[1];

		for (const [key, config] of Object.entries(projectRegistry)) {
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
	if (existsSync(envRegistryPath)) {
		try {
			const content = readFileSync(envRegistryPath, "utf-8");
			registry = { ...projectRegistry, ...JSON.parse(content) };
		} catch (error) {
			logWarning("Could not load custom registry, using defaults");
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
	writeFileSync(envPath, project.variables);

	// Save updated registry
	writeFileSync(envRegistryPath, JSON.stringify(registry, null, 2));

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
