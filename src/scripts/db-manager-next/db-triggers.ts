#!/usr/bin/env node
import { exec } from "node:child_process";
import { promisify } from "node:util";
import {
	APP_USER,
	CLOUD_DB_HOST,
	CLOUD_DB_NAME,
	CLOUD_DB_PASS,
	CLOUD_DB_PORT,
	CLOUD_DB_USER,
	logError,
	logInfo,
	logSuccess,
	logWarning,
	runSQL,
} from "./db-utils";

const execAsync = promisify(exec);

const { LOCAL_DB_HOST, LOCAL_DB_USER, LOCAL_DB_NAME } = process.env;

export async function createTriggers() {
	logInfo("🔍 Checking if database exists...");
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

	const result = await runSQL(`
    SELECT 1 FROM pg_database WHERE datname = '${CLOUD_DB_NAME}';
  `);

	if (!result.includes("1 row")) {
		logWarning(`⚠️  Database ${CLOUD_DB_NAME} does not exist`);
		return;
	}

	logInfo(`📝 Creating triggers for database ${CLOUD_DB_NAME}...`);
	await runSQL(`
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON public.users
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();

    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();

    CREATE TRIGGER update_posts_updated_at
      BEFORE UPDATE ON public.posts
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();

    CREATE TRIGGER update_comments_updated_at
      BEFORE UPDATE ON public.comments
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  `);

	logSuccess(`✅ Triggers created successfully for database ${CLOUD_DB_NAME}`);
}

// Check if this module is being run directly
if (require.main === module) {
	createTriggers().catch((error) => {
		logError(
			`Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	});
}
