#!/usr/bin/env bun
import { execSync } from "node:child_process";
import { colors, log } from "../utils";
import { publish } from "./publish";
import { version } from "./version";

function execCommand(command: string, errorMessage?: string): boolean {
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

function checkNpmAuth(): boolean {
	try {
		execSync("npm whoami", { stdio: "pipe" });
		return true;
	} catch {
		log("❌ Not logged in to npm. Please run 'npm login' first", colors.red);
		return false;
	}
}

export { publish, version };
