#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { select } from "@inquirer/prompts";
import * as utils from "../utils";
import { projectRegistry } from "./env-registry";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envRegistryPath = utils.getUnifiedTempFilePath("env.config.json");

// Initialize example configs if they don't exist
if (!existsSync(envRegistryPath)) {
	utils.initExampleConfigs();
}

async function getCurrentProject(): Promise<string | null> {
	const envPath = join(process.cwd(), ".env");
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
			utils.logWarning("Could not load custom registry, using defaults");
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
	const envPath = join(process.cwd(), ".env");
	writeFileSync(envPath, project.variables);

	// Save updated registry
	writeFileSync(envRegistryPath, JSON.stringify(registry, null, 2));

	utils.logSuccess("Project configuration updated successfully!");
	utils.logInfo(`📝 Configuration file: ${envPath}`);
	utils.logInfo(`🌍 Project: ${project.name}`);
	utils.logInfo(`📁 Registry stored in: ${envRegistryPath}`);

	utils.logWarning(
		"⚠️  Remember to keep your .env file secure and never commit it to version control",
	);
}

async function main() {
	console.log("🌍 Next Toolchain Environment Configuration");
	console.log("------------------------------------------\n");

	const currentProject = await getCurrentProject();
	if (currentProject) {
		utils.logInfo(`Current project: ${currentProject}`);
		console.log("------------------------------------------\n");
	}

	await updateEnv();
}

main().catch((error) => {
	utils.logError(error instanceof Error ? error.message : "Unknown error");
	process.exit(1);
});
