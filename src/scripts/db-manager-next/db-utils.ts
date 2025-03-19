#!/usr/bin/env node

import { exec } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { config } from "dotenv";

/**
 * Promisified version of Node's exec function for running shell commands
 */
const execAsync = promisify(exec);

/**
 * Configuration for environment variables and paths
 */
const rootDir = process.cwd();
const tempDir = join(rootDir, ".next-toolchain-temp");

// Load environment variables from db.conf in the unified temp folder
config({ path: join(tempDir, "db.conf") });

/**
 * Database Configuration
 * Environment variables for database connection and settings
 */
export const CLOUD_DB_NAME = process.env.CLOUD_DB_NAME;
export const CLOUD_DB_USER = process.env.CLOUD_DB_USER;
export const CLOUD_DB_PASS = process.env.CLOUD_DB_PASS;
export const CLOUD_DB_HOST = process.env.CLOUD_DB_HOST;
export const CLOUD_DB_PORT = process.env.CLOUD_DB_PORT;
export const DB_MAX_CONNECTIONS = process.env.DB_MAX_CONNECTIONS;
export const APP_USER = process.env.APP_USER;
export const APP_PASS = process.env.APP_PASS;

/**
 * Database Timeout Settings
 * Configuration for various database timeouts and connection settings
 */
export const DB_STATEMENT_TIMEOUT = process.env.DB_STATEMENT_TIMEOUT || "30s";
export const DB_IDLE_TRANSACTION_TIMEOUT =
	process.env.DB_IDLE_TRANSACTION_TIMEOUT || "30s";
export const DB_IDLE_SESSION_TIMEOUT =
	process.env.DB_IDLE_SESSION_TIMEOUT || "30s";
export const DB_MASTER_IDLE_TIMEOUT =
	process.env.DB_MASTER_IDLE_TIMEOUT || "30s";
export const DB_TCP_KEEPALIVES_IDLE =
	process.env.DB_TCP_KEEPALIVES_IDLE || "60";
export const DB_TCP_KEEPALIVES_INTERVAL =
	process.env.DB_TCP_KEEPALIVES_INTERVAL || "10";
export const DB_TCP_KEEPALIVES_COUNT =
	process.env.DB_TCP_KEEPALIVES_COUNT || "6";

/**
 * Executes a SQL command on the database
 * @param command - The SQL command to execute
 * @param database - The database to execute the command on (defaults to "postgres")
 * @returns Promise<string> - The command output
 * @throws Error if the command fails
 */
export async function runSQL(
	command: string,
	database = "postgres",
): Promise<string> {
	try {
		const { stdout } = await execAsync(
			`PGPASSWORD=${CLOUD_DB_PASS} psql -h ${CLOUD_DB_HOST} -p ${CLOUD_DB_PORT} -U ${CLOUD_DB_USER} -d ${database} -c "${command}"`,
		);
		return stdout.trim();
	} catch (error) {
		logError(
			`SQL command failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return "";
	}
}

/**
 * Executes a shell command
 * @param command - The shell command to execute
 * @returns Promise<string> - The command output
 * @throws Error if the command fails
 */
export async function runCommand(command: string): Promise<string> {
	try {
		const { stdout } = await execAsync(command);
		return stdout.trim();
	} catch (error) {
		logError(
			`Command failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return "";
	}
}

/**
 * Logging Utilities
 * Functions for consistent logging across the application
 */

/**
 * Logs an informational message
 * @param message - The message to log
 */
export function logInfo(message: string): void {
	console.log("\x1b[36m%s\x1b[0m", message);
}

/**
 * Logs a success message
 * @param message - The message to log
 */
export function logSuccess(message: string): void {
	console.log("\x1b[32m%s\x1b[0m", message);
}

/**
 * Logs a warning message
 * @param message - The message to log
 */
export function logWarning(message: string): void {
	console.log("\x1b[33m%s\x1b[0m", message);
}

/**
 * Logs an error message
 * @param message - The message to log
 */
export function logError(message: string): void {
	console.log("\x1b[31m%s\x1b[0m", message);
}

/**
 * Executes a step with logging
 * @param description - Description of the step being executed
 * @param fn - The async function to execute
 * @returns Promise<void>
 * @throws Error if the step fails
 */
export async function executeStep(
	description: string,
	fn: () => Promise<void>,
): Promise<void> {
	logInfo(description);
	try {
		await fn();
		logSuccess("✓ " + description);
	} catch (error) {
		logError(
			`Failed to ${description.toLowerCase()}: ${
				error instanceof Error ? error.message : "Unknown error"
			}`,
		);
		throw error;
	}
}

/**
 * Database Connection Utilities
 */

/**
 * Gets the connection string for the database
 * @returns string - The formatted connection string
 */
export function getConnectionString(): string {
	return `postgresql://${APP_USER}:${APP_PASS}@${CLOUD_DB_HOST}:${CLOUD_DB_PORT}/${CLOUD_DB_NAME}`;
}

/**
 * Gets the temporary directory path
 * @returns string - The path to the temporary directory
 */
export function getTempDir(): string {
	return tempDir;
}

/**
 * Gets the root directory path
 * @returns string - The path to the root directory
 */
export function getRootDir(): string {
	return rootDir;
}
