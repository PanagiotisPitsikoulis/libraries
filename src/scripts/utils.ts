import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
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
	logInfo(`Step: ${stepName}`);
	const success = await runCommand(command, args);

	if (!success) {
		logError(`Failed: ${stepName}`);
		return false;
	}

	logSuccess(`Completed: ${stepName}`);
	return true;
}

export function getTempDir(name: string): string {
	const rootDir = process.cwd();
	const tempDir = join(rootDir, ".next-toolchain", name);

	if (!existsSync(tempDir)) {
		mkdirSync(tempDir, { recursive: true });
	}

	return tempDir;
}

export function getTempFilePath(name: string, filename: string): string {
	return join(getTempDir(name), filename);
}
