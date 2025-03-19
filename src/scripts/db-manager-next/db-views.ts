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

export async function createViews() {
	logInfo("🔍 Checking if database exists...");
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

	const result = await runSQL(`
    SELECT 1 FROM pg_database WHERE datname = '${CLOUD_DB_NAME}';
  `);

	if (!result.includes("1 row")) {
		logWarning(`⚠️  Database ${CLOUD_DB_NAME} does not exist`);
		return;
	}

	logInfo(`📝 Creating views for database ${CLOUD_DB_NAME}...`);
	await runSQL(`
    CREATE OR REPLACE VIEW public.user_stats AS
    SELECT 
      u.id,
      u.username,
      u.email,
      p.first_name,
      p.last_name,
      p.bio,
      COUNT(DISTINCT po.id) as posts_count,
      COUNT(DISTINCT c.id) as comments_count,
      COUNT(DISTINCT l.id) as likes_count,
      COUNT(DISTINCT f1.id) as followers_count,
      COUNT(DISTINCT f2.id) as following_count
    FROM public.users u
    LEFT JOIN public.profiles p ON u.id = p.user_id
    LEFT JOIN public.posts po ON u.id = po.user_id
    LEFT JOIN public.comments c ON u.id = c.user_id
    LEFT JOIN public.likes l ON u.id = l.user_id
    LEFT JOIN public.follows f1 ON u.id = f1.following_id
    LEFT JOIN public.follows f2 ON u.id = f2.follower_id
    GROUP BY u.id, u.username, u.email, p.first_name, p.last_name, p.bio;

    CREATE OR REPLACE VIEW public.post_stats AS
    SELECT 
      p.id,
      p.title,
      p.content,
      p.created_at,
      p.updated_at,
      u.username as author_username,
      p.first_name as author_first_name,
      p.last_name as author_last_name,
      COUNT(DISTINCT c.id) as comments_count,
      COUNT(DISTINCT l.id) as likes_count
    FROM public.posts p
    JOIN public.users u ON p.user_id = u.id
    JOIN public.profiles p ON u.id = p.user_id
    LEFT JOIN public.comments c ON p.id = c.post_id
    LEFT JOIN public.likes l ON p.id = l.post_id
    GROUP BY p.id, p.title, p.content, p.created_at, p.updated_at, u.username, p.first_name, p.last_name;

    CREATE OR REPLACE VIEW public.comment_stats AS
    SELECT 
      c.id,
      c.content,
      c.created_at,
      c.updated_at,
      u.username as author_username,
      p.first_name as author_first_name,
      p.last_name as author_last_name,
      po.title as post_title,
      COUNT(DISTINCT l.id) as likes_count
    FROM public.comments c
    JOIN public.users u ON c.user_id = u.id
    JOIN public.profiles p ON u.id = p.user_id
    JOIN public.posts po ON c.post_id = po.id
    LEFT JOIN public.likes l ON c.id = l.comment_id
    GROUP BY c.id, c.content, c.created_at, c.updated_at, u.username, p.first_name, p.last_name, po.title;
  `);

	logSuccess(`✅ Views created successfully for database ${CLOUD_DB_NAME}`);
}
