import { publish } from "./index";

publish().catch((error: unknown) => {
	console.error("Failed to publish package:", error);
	process.exit(1);
});
