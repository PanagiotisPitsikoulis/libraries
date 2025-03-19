#!/usr/bin/env bun
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { colors, log } from "../utils";

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

function updateVersion(type: "patch" | "minor" | "major"): void {
	const packageJson = JSON.parse(readFileSync("./package.json", "utf8"));
	const [major, minor, patch] = packageJson.version.split(".").map(Number);

	switch (type) {
		case "patch":
			packageJson.version = `${major}.${minor}.${patch + 1}`;
			break;
		case "minor":
			packageJson.version = `${major}.${minor + 1}.0`;
			break;
		case "major":
			packageJson.version = `${major + 1}.0.0`;
			break;
	}

	writeFileSync("./package.json", JSON.stringify(packageJson, null, 2) + "\n");
	log(`✅ Updated version to ${packageJson.version}`, colors.green);
}

export function version(type: "patch" | "minor" | "major"): void {
	try {
		updateVersion(type);
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error occurred";
		log(`❌ Error updating version: ${errorMessage}`, colors.red);
		process.exit(1);
	}
}
