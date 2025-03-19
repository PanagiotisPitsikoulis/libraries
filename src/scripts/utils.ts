#!/usr/bin/env node
import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

/**
 * Color constants for console output
 */
export const colors = {
	green: "\x1b[32m",
	red: "\x1b[31m",
	blue: "\x1b[34m",
	yellow: "\x1b[33m",
	reset: "\x1b[0m",
};

/**
 * Command Execution Utilities
 */

/**
 * Executes a command using spawn with proper error handling
 * @param command - The command to execute
 * @param args - Command arguments
 * @returns Promise<boolean> - Whether the command executed successfully
 */
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

/**
 * Executes a command synchronously with proper error handling
 * @param command - The command to execute
 * @param errorMessage - Optional custom error message
 * @returns boolean - Whether the command executed successfully
 */
export function execCommand(command: string, errorMessage?: string): boolean {
	try {
		execSync(command, { stdio: "inherit" });
		return true;
	} catch (error: unknown) {
		if (error instanceof Error) {
			log(errorMessage || `Failed to execute: ${command}`, colors.red);
			log(error.message, colors.yellow);
		} else {
			log(`Unknown error occurred while executing: ${command}`, colors.red);
		}
		return false;
	}
}

/**
 * Logging Utilities
 */

/**
 * Logs a message with optional color
 * @param message - The message to log
 * @param color - The color to use (defaults to reset)
 */
export function log(message: string, color = colors.reset) {
	console.log(`${color}${message}${colors.reset}`);
}

/**
 * Logs an error message
 * @param message - The error message to log
 */
export function logError(message: string) {
	log(`❌ ${message}`, colors.red);
}

/**
 * Logs a success message
 * @param message - The success message to log
 */
export function logSuccess(message: string) {
	log(`✅ ${message}`, colors.green);
}

/**
 * Logs an informational message
 * @param message - The info message to log
 */
export function logInfo(message: string) {
	log(`ℹ️ ${message}`, colors.blue);
}

/**
 * Logs a warning message
 * @param message - The warning message to log
 */
export function logWarning(message: string) {
	log(`⚠️ ${message}`, colors.yellow);
}

/**
 * Step Execution Utilities
 */

/**
 * Executes a step with logging
 * @param stepName - Name of the step being executed
 * @param command - The command to execute
 * @param args - Command arguments
 * @returns Promise<boolean> - Whether the step executed successfully
 */
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

/**
 * File System Utilities
 */

/**
 * Gets the temporary directory path for a specific tool
 * @param name - Name of the tool
 * @returns string - Path to the temporary directory
 */
export function getTempDir(name: string): string {
	const rootDir = process.cwd();
	const tempDir = join(rootDir, `.next-toolchain/${name}`);
	if (!existsSync(tempDir)) {
		mkdirSync(tempDir, { recursive: true });
	}
	return tempDir;
}

/**
 * Gets a file path within a tool's temporary directory
 * @param name - Name of the tool
 * @param filename - Name of the file
 * @returns string - Full path to the file
 */
export function getTempFilePath(name: string, filename: string): string {
	return join(getTempDir(name), filename);
}

/**
 * Gets the unified temporary directory path
 * @returns string - Path to the unified temporary directory
 */
export function getUnifiedTempDir(): string {
	const rootDir = process.cwd();
	const tempDir = join(rootDir, ".next-toolchain-temp");
	if (!existsSync(tempDir)) {
		mkdirSync(tempDir, { recursive: true });
	}
	return tempDir;
}

/**
 * Gets a file path within the unified temporary directory
 * @param filename - Name of the file
 * @returns string - Full path to the file
 */
export function getUnifiedTempFilePath(filename: string): string {
	return join(getUnifiedTempDir(), filename);
}

/**
 * Configuration Utilities
 */

/**
 * Loads environment variables from a config file
 * @param configPath - Path to the config file
 * @returns void
 */
export function loadConfig(configPath: string): void {
	config({ path: configPath });
}

/**
 * Reads and parses a JSON config file
 * @param configPath - Path to the config file
 * @returns any - Parsed config object
 */
export function readConfig(configPath: string): any {
	try {
		const content = readFileSync(configPath, "utf-8");
		return JSON.parse(content);
	} catch (error) {
		logError(`Failed to read config file: ${configPath}`);
		throw error;
	}
}

/**
 * Writes a config object to a JSON file
 * @param configPath - Path to the config file
 * @param config - Config object to write
 * @returns void
 */
export function writeConfig(configPath: string, config: any): void {
	try {
		writeFileSync(configPath, JSON.stringify(config, null, 2));
	} catch (error) {
		logError(`Failed to write config file: ${configPath}`);
		throw error;
	}
}

/**
 * Version Management Utilities
 */

/**
 * Updates a version string based on the specified type
 * @param currentVersion - Current version string (e.g., "1.2.3")
 * @param type - Type of version update ("patch", "minor", or "major")
 * @returns string - Updated version string
 */
export function updateVersion(
	currentVersion: string,
	type: "patch" | "minor" | "major",
): string {
	const [major, minor, patch] = currentVersion.split(".").map(Number);

	switch (type) {
		case "patch":
			return `${major}.${minor}.${patch + 1}`;
		case "minor":
			return `${major}.${minor + 1}.0`;
		case "major":
			return `${major + 1}.0.0`;
		default:
			throw new Error(`Invalid version update type: ${type}`);
	}
}

/**
 * Error Handling Utilities
 */

/**
 * Formats an error message for logging
 * @param error - Error object or unknown error
 * @param context - Context where the error occurred
 * @returns string - Formatted error message
 */
export function formatError(error: unknown, context: string): string {
	if (error instanceof Error) {
		return `${context}: ${error.message}`;
	}
	return `${context}: Unknown error occurred`;
}

/**
 * Handles an error and exits the process
 * @param error - Error object or unknown error
 * @param context - Context where the error occurred
 */
export function handleError(error: unknown, context: string): never {
	logError(formatError(error, context));
	process.exit(1);
}
