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

export async function createConstraints() {
	logInfo("🔍 Checking if database exists...");
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

	const result = await runSQL(`
    SELECT 1 FROM pg_database WHERE datname = '${CLOUD_DB_NAME}';
  `);

	if (!result.includes("1 row")) {
		logWarning(`⚠️  Database ${CLOUD_DB_NAME} does not exist`);
		return;
	}

	logInfo(`📝 Creating constraints for database ${CLOUD_DB_NAME}...`);
	await runSQL(`
    ALTER TABLE public.users
      ADD CONSTRAINT chk_username_length CHECK (char_length(username) >= 3),
      ADD CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
      ADD CONSTRAINT chk_password_length CHECK (char_length(password) >= 8);

    ALTER TABLE public.profiles
      ADD CONSTRAINT chk_first_name_length CHECK (char_length(first_name) >= 2),
      ADD CONSTRAINT chk_last_name_length CHECK (char_length(last_name) >= 2),
      ADD CONSTRAINT chk_bio_length CHECK (char_length(bio) <= 1000);

    ALTER TABLE public.posts
      ADD CONSTRAINT chk_title_length CHECK (char_length(title) >= 3 AND char_length(title) <= 255),
      ADD CONSTRAINT chk_content_length CHECK (char_length(content) >= 10 AND char_length(content) <= 10000);

    ALTER TABLE public.comments
      ADD CONSTRAINT chk_comment_length CHECK (char_length(content) >= 1 AND char_length(content) <= 1000);

    ALTER TABLE public.likes
      ADD CONSTRAINT chk_like_unique UNIQUE (user_id, post_id);

    ALTER TABLE public.follows
      ADD CONSTRAINT chk_follow_unique UNIQUE (follower_id, following_id),
      ADD CONSTRAINT chk_follow_self CHECK (follower_id != following_id);
  `);

	logSuccess(
		`✅ Constraints created successfully for database ${CLOUD_DB_NAME}`,
	);
}

// Check if this module is being run directly
if (require.main === module) {
	createConstraints().catch((error) => {
		logError(
			`Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	});
}
