#!/usr/bin/env node
import "./version";

const type = process.argv[2] as "patch" | "minor" | "major";
if (!type || !["patch", "minor", "major"].includes(type)) {
	console.error("Please specify version type: patch, minor, or major");
	process.exit(1);
}

version(type);
