#!/usr/bin/env node
import { execCommand, handleError, logError } from "../utils";
import { publish } from "./publish";

function checkNpmAuth(): boolean {
	try {
		execCommand("npm whoami");
		return true;
	} catch {
		logError("Not logged in to npm. Please run 'npm login' first");
		return false;
	}
}

export { publish };
