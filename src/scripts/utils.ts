#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const colors = {
	green: "\x1b[32m",
	red: "\x1b[31m",
	blue: "\x1b[34m",
	yellow: "\x1b[33m",
	reset: "\x1b[0m",
};

export async function runCommand(
	command: string,
	args: string[] = [],
): Promise<boolean> {
	return new Promise((resolve) => {
		const proc = spawn(command, args, { stdio: "inherit", shell: true });

		proc.on("close", (code) => {
			resolve(code === 0);
		});
	});
}

export function log(message: string, color = colors.reset) {
	console.log(`${color}${message}${colors.reset}`);
}

export function logError(message: string) {
	log(`❌ ${message}`, colors.red);
}

export function logSuccess(message: string) {
	log(`✅ ${message}`, colors.green);
}

export function logInfo(message: string) {
	log(`ℹ️ ${message}`, colors.blue);
}

export function logWarning(message: string) {
	log(`⚠️ ${message}`, colors.yellow);
}

export async function executeStep(
	stepName: string,
	command: string,
	args: string[] = [],
): Promise<boolean> {
	logInfo(`Executing: ${stepName}`);
	const success = await runCommand(command, args);
	if (success) {
		logSuccess(`Completed: ${stepName}`);
	} else {
		logError(`Failed: ${stepName}`);
	}
	return success;
}

export function getTempDir(name: string): string {
	const rootDir = process.cwd();
	const tempDir = join(rootDir, `.next-toolchain/${name}`);
	if (!existsSync(tempDir)) {
		mkdirSync(tempDir, { recursive: true });
	}
	return tempDir;
}

export function getTempFilePath(name: string, filename: string): string {
	return join(getTempDir(name), filename);
}

export function getUnifiedTempDir(): string {
	const rootDir = process.cwd();
	const tempDir = join(rootDir, ".next-toolchain-temp");
	if (!existsSync(tempDir)) {
		mkdirSync(tempDir, { recursive: true });
	}
	return tempDir;
}

export function getUnifiedTempFilePath(filename: string): string {
	return join(getUnifiedTempDir(), filename);
}

export function initExampleConfigs(): void {
	const tempDir = getUnifiedTempDir();

	// Example DB config
	const dbConfig = {
		databases: {
			local: {
				uri: "postgres://localhost:5432/local_db",
				name: "Local Database",
			},
			production: {
				uri: "postgres://production:5432/prod_db",
				name: "Production Database",
			},
		},
		settings: {
			timeout: 30000,
			maxConnections: 10,
		},
	};

	// Example ENV config
	const envConfig = {
		projects: {
			default: {
				name: "Default Project",
				variables: [
					"NEXT_PUBLIC_API_URL=http://localhost:3000",
					"DATABASE_URI=postgres://localhost:5432/local_db",
					"REDIS_URL=redis://localhost:6379",
				],
			},
			production: {
				name: "Production Project",
				variables: [
					"NEXT_PUBLIC_API_URL=https://api.production.com",
					"DATABASE_URI=postgres://production:5432/prod_db",
					"REDIS_URL=redis://production:6379",
				],
			},
		},
	};

	// Write example configs
	writeFileSync(
		join(tempDir, "db.config.json"),
		JSON.stringify(dbConfig, null, 2),
	);
	writeFileSync(
		join(tempDir, "env.config.json"),
		JSON.stringify(envConfig, null, 2),
	);
}
