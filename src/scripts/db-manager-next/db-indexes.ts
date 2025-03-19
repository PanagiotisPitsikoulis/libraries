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

export async function createIndexes() {
	logInfo("🔍 Checking if database exists...");
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

	const result = await runSQL(`
    SELECT 1 FROM pg_database WHERE datname = '${CLOUD_DB_NAME}';
  `);

	if (!result.includes("1 row")) {
		logWarning(`⚠️  Database ${CLOUD_DB_NAME} does not exist`);
		return;
	}

	logInfo(`📝 Creating indexes for database ${CLOUD_DB_NAME}...`);
	await runSQL(`
    CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
    CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
    CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
    CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at);
    CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
    CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
    CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at);
    CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);
    CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.likes(post_id);
    CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
    CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);
  `);

	logSuccess(`✅ Indexes created successfully for database ${CLOUD_DB_NAME}`);
}

// Check if this module is being run directly
if (require.main === module) {
	createIndexes().catch((error) => {
		logError(
			`Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	});
}
