#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import puppeteer from 'puppeteer';
import {
    colors,
    getUnifiedTempDir,
    logError,
    logInfo,
    logSuccess,
    logWarning,
    readConfig,
} from "../utils";

// Types
export interface ScreenshotConfig {
    cookies?: Array<{
        name: string;
        value: string;
        domain: string;
        path?: string;
        secure?: boolean;
        httpOnly?: boolean;
        sameSite?: "Strict" | "Lax" | "None";
    }>;
    viewport?: {
        width: number;
        height: number;
    };
    userAgent?: string;
    timeout?: number;
    waitForSelector?: string;
    quality?: number;
    fullPage?: boolean;
}

const DEFAULT_CONFIG: ScreenshotConfig = {
    viewport: { width: 1280, height: 800 },
    timeout: 30000,
    quality: 80,
    fullPage: true,
};

// Setup screenshots directory in temp folder
export const setupScreenshotsDir = (): string => {
    const tempDir = getUnifiedTempDir();
    const screenshotsDir = path.join(tempDir, "screenshots");

    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    return screenshotsDir;
};

// Load configuration from temp/screenshot.config.conf
export const loadScreenshotConfig = (): ScreenshotConfig => {
    const tempDir = getUnifiedTempDir();
    const configPath = path.join(tempDir, "screenshot.config.conf");

    let config: ScreenshotConfig = DEFAULT_CONFIG;

    if (fs.existsSync(configPath)) {
        try {
            const loadedConfig = readConfig(configPath);
            config = { ...DEFAULT_CONFIG, ...loadedConfig };
            logSuccess(`Loaded configuration from ${configPath}`);
        } catch (error) {
            logError(`Error loading config file: ${error}`);
            logWarning("Using default configuration");
        }
    } else {
        logInfo(`No config file found at ${configPath}`);
        logInfo("Using default configuration");
    }

    return config;
};

// Take screenshots of provided URLs
export const takeScreenshots = async (
    urls: string[],
    outputDir: string,
    config: ScreenshotConfig,
) => {
    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: config.viewport,
    });

    logInfo(`Starting screenshot capture for ${urls.length} URLs`);

    for (const [index, url] of urls.entries()) {
        try {
            const page = await browser.newPage();

            // Set user agent if specified
            if (config.userAgent) {
                await page.setUserAgent(config.userAgent);
            }

            // Set cookies for authentication if provided
            if (config.cookies && config.cookies.length > 0) {
                await page.setCookie(...config.cookies);
            }

            // Navigate to URL with timeout
            logInfo(`[${index + 1}/${urls.length}] Navigating to: ${url}`);
            await page.goto(url, {
                waitUntil: "networkidle2",
                timeout: config.timeout,
            });

            // Wait for specific selector if configured
            if (config.waitForSelector) {
                await page.waitForSelector(config.waitForSelector, {
                    timeout: config.timeout,
                });
            }

            // Generate filename based on URL
            const urlObj = new URL(url);
            const filename = `${urlObj.hostname.replace(/\./g, "_")}_${Date.now()}.png`;
            const outputPath = path.join(outputDir, filename);

            // Take screenshot
            await page.screenshot({
                path: outputPath,
                fullPage: config.fullPage,
                quality: config.quality,
            });

            logSuccess(`Screenshot saved to: ${outputPath}`);
            await page.close();
        } catch (error) {
            logError(`Failed to capture screenshot for ${url}: ${error}`);
        }
    }

    await browser.close();
    logSuccess("All screenshots captured");
};

// CLI setup
const program = new Command();
program
    .name("screenshot-cli")
    .description(
        "CLI tool to take screenshots of websites with authentication support",
    )
    .version("1.0.0")
    .option("-u, --urls <urls...>", "URLs to capture (comma or space separated)")
    .option("-f, --file <file>", "Text file with URLs (one per line)")
    .option(
        "-o, --output <directory>",
        "Custom output directory (defaults to temp/screenshots)",
    )
    .option("-w, --width <width>", "Viewport width", "1280")
    .option("-h, --height <height>", "Viewport height", "800")
    .option("--full-page", "Capture full page height", true)
    .option("--timeout <ms>", "Navigation timeout in milliseconds", "30000")
    .parse(process.argv);

const main = async () => {
    const options = program.opts();
    let urls: string[] = [];

    // Get URLs from command line or file
    if (options.urls) {
        urls = Array.isArray(options.urls) ? options.urls : options.urls.split(",");
    } else if (options.file && fs.existsSync(options.file)) {
        const fileContent = fs.readFileSync(options.file, "utf-8");
        urls = fileContent.split("\n").filter((url) => url.trim() !== "");
    }

    if (urls.length === 0) {
        logError("No URLs provided. Use --urls or --file option.");
        process.exit(1);
    }

    // Setup output directory
    const outputDir = options.output || setupScreenshotsDir();

    // Load config
    let config = loadScreenshotConfig();

    // Override config with CLI options if provided
    if (options.width || options.height) {
        config.viewport = {
            width: Number.parseInt(options.width, 10) || config.viewport!.width,
            height: Number.parseInt(options.height, 10) || config.viewport!.height,
        };
    }

    if (options.timeout) {
        config.timeout = Number.parseInt(options.timeout, 10);
    }

    if (options.fullPage !== undefined) {
        config.fullPage = options.fullPage;
    }

    // Take screenshots
    await takeScreenshots(urls, outputDir, config);
};

main().catch((error) => {
    logError(`An error occurred: ${error}`);
    process.exit(1);
});
