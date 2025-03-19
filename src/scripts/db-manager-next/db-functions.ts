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

export async function createFunctions() {
	logInfo("🔍 Checking if database exists...");
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

	const result = await runSQL(`
    SELECT 1 FROM pg_database WHERE datname = '${CLOUD_DB_NAME}';
  `);

	if (!result.includes("1 row")) {
		logWarning(`⚠️  Database ${CLOUD_DB_NAME} does not exist`);
		return;
	}

	logInfo(`📝 Creating functions for database ${CLOUD_DB_NAME}...`);
	await runSQL(`
    CREATE OR REPLACE FUNCTION public.get_user_posts(user_id INTEGER)
    RETURNS TABLE (
      id INTEGER,
      title VARCHAR,
      content TEXT,
      created_at TIMESTAMP WITH TIME ZONE,
      updated_at TIMESTAMP WITH TIME ZONE,
      likes_count BIGINT,
      comments_count BIGINT
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        p.id,
        p.title,
        p.content,
        p.created_at,
        p.updated_at,
        COUNT(DISTINCT l.id) as likes_count,
        COUNT(DISTINCT c.id) as comments_count
      FROM public.posts p
      LEFT JOIN public.likes l ON p.id = l.post_id
      LEFT JOIN public.comments c ON p.id = c.post_id
      WHERE p.user_id = $1
      GROUP BY p.id, p.title, p.content, p.created_at, p.updated_at
      ORDER BY p.created_at DESC;
    END;
    $$ LANGUAGE plpgsql;

    CREATE OR REPLACE FUNCTION public.get_user_followers(user_id INTEGER)
    RETURNS TABLE (
      id INTEGER,
      username VARCHAR,
      first_name VARCHAR,
      last_name VARCHAR,
      bio TEXT,
      created_at TIMESTAMP WITH TIME ZONE
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        u.id,
        u.username,
        p.first_name,
        p.last_name,
        p.bio,
        u.created_at
      FROM public.users u
      JOIN public.profiles p ON u.id = p.user_id
      JOIN public.follows f ON u.id = f.follower_id
      WHERE f.following_id = $1
      ORDER BY u.created_at DESC;
    END;
    $$ LANGUAGE plpgsql;

    CREATE OR REPLACE FUNCTION public.get_user_following(user_id INTEGER)
    RETURNS TABLE (
      id INTEGER,
      username VARCHAR,
      first_name VARCHAR,
      last_name VARCHAR,
      bio TEXT,
      created_at TIMESTAMP WITH TIME ZONE
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        u.id,
        u.username,
        p.first_name,
        p.last_name,
        p.bio,
        u.created_at
      FROM public.users u
      JOIN public.profiles p ON u.id = p.user_id
      JOIN public.follows f ON u.id = f.following_id
      WHERE f.follower_id = $1
      ORDER BY u.created_at DESC;
    END;
    $$ LANGUAGE plpgsql;

    CREATE OR REPLACE FUNCTION public.get_post_comments(post_id INTEGER)
    RETURNS TABLE (
      id INTEGER,
      content TEXT,
      created_at TIMESTAMP WITH TIME ZONE,
      updated_at TIMESTAMP WITH TIME ZONE,
      username VARCHAR,
      first_name VARCHAR,
      last_name VARCHAR
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        c.id,
        c.content,
        c.created_at,
        c.updated_at,
        u.username,
        p.first_name,
        p.last_name
      FROM public.comments c
      JOIN public.users u ON c.user_id = u.id
      JOIN public.profiles p ON u.id = p.user_id
      WHERE c.post_id = $1
      ORDER BY c.created_at DESC;
    END;
    $$ LANGUAGE plpgsql;
  `);

	logSuccess(`✅ Functions created successfully for database ${CLOUD_DB_NAME}`);
}
