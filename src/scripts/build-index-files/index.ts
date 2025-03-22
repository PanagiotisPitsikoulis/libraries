#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { readdir, writeFile } from "node:fs/promises";
import { join, parse, relative } from "node:path";
import { logError, logInfo, logSuccess, logWarning } from "../utils";

async function getExclusions(dir: string): Promise<string[]> {
    const indexPath = join(dir, "index.ts");
    if (!existsSync(indexPath)) {
        return [];
    }

    try {
        const content = readFileSync(indexPath, "utf-8");
        const lines = content.split("\n");
        const exclusions: string[] = [];

        for (const line of lines) {
            // Match comments like "//exclude './scripts'" or "// exclude './scripts'"
            const match = line.match(/\/\/\s*exclude\s+'([^']+)'|\/\/\s*exclude\s+"([^"]+)"/);
            if (match) {
                const path = match[1] || match[2];
                // Remove './' prefix if exists
                exclusions.push(path.replace(/^\.\//, ''));
            }
        }

        return exclusions;
    } catch (error) {
        logWarning(`Failed to read exclusions from ${indexPath}: ${error instanceof Error ? error.message : String(error)}`);
        return [];
    }
}

async function findExportableItems(dir: string): Promise<string[]> {
    const files = await readdir(dir, { withFileTypes: true });
    const exportableItems: string[] = [];
    const exclusions = await getExclusions(dir);

    for (const item of files) {
        const fullPath = join(dir, item.name);
        const itemName = parse(item.name).name;

        // Skip if item is in exclusions
        if (exclusions.includes(itemName)) {
            logInfo(`Skipping excluded item: ${itemName}`);
            continue;
        }

        if (item.isDirectory()) {
            // Check if directory has an index file
            if (existsSync(join(fullPath, "index.ts")) || existsSync(join(fullPath, "index.tsx"))) {
                exportableItems.push(item.name);
            }
        } else if (item.isFile()) {
            const ext = parse(item.name).ext;
            if ((ext === ".ts" || ext === ".tsx") && item.name !== "index.ts" && item.name !== "index.tsx") {
                exportableItems.push(item.name);
            }
        }
    }

    return exportableItems;
}

async function generateIndexContent(items: string[]): Promise<string> {
    return items
        .map((item) => {
            const baseName = parse(item).name;
            return `export * from './${baseName}';`;
        })
        .join("\n") + "\n";
}

async function buildIndexFile(dir: string): Promise<void> {
    try {
        const exportableItems = await findExportableItems(dir);

        if (exportableItems.length === 0) {
            logWarning(`No exportable items found in ${dir}`);
            return;
        }

        const indexContent = await generateIndexContent(exportableItems);
        const indexPath = join(dir, "index.ts");

        // Preserve exclusion comments if they exist
        let finalContent = indexContent;
        if (existsSync(indexPath)) {
            const currentContent = readFileSync(indexPath, "utf-8");
            const exclusionComments = currentContent
                .split("\n")
                .filter(line => line.trim().startsWith("//exclude"))
                .join("\n");

            if (exclusionComments) {
                finalContent = `${exclusionComments}\n${indexContent}`;
            }
        }

        await writeFile(indexPath, finalContent);
        logSuccess(`Generated index file for ${dir} with ${exportableItems.length} exports`);
        logInfo(`Exports: ${exportableItems.map(item => parse(item).name).join(", ")}`);
    } catch (error) {
        logError(`Failed to build index file for ${dir}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function main() {
    // Get all arguments after the script name
    const args = process.argv.slice(2);

    if (args.length === 0) {
        logError("Please specify at least one directory");
        process.exit(1);
    }

    // Process each argument as a potential directory
    for (const arg of args) {
        if (!existsSync(arg)) {
            logError(`Path ${arg} does not exist`);
            continue;
        }

        const stats = await readdir(arg, { withFileTypes: true });
        if (stats.length === 0) {
            logWarning(`Directory ${arg} is empty`);
            continue;
        }

        logInfo(`Building index file for ${arg}...`);
        await buildIndexFile(arg);
    }
}

// Handle script execution
if (require.main === module) {
    main().catch((error) => {
        logError(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    });
}
