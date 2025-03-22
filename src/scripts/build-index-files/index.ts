#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readdir, writeFile } from "node:fs/promises";
import { join, parse, relative } from "node:path";
import { logError, logInfo, logSuccess, logWarning } from "../utils";

async function findExportableItems(dir: string): Promise<string[]> {
    const files = await readdir(dir, { withFileTypes: true });
    const exportableItems: string[] = [];

    for (const item of files) {
        const fullPath = join(dir, item.name);

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

        await writeFile(indexPath, indexContent);
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
