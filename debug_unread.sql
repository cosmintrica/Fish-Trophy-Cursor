-- DEBUG SCRIPT: Check Unread Status Logic
-- Run this in Supabase SQL Editor to see what the database thinks.
-- Replace 'YOUR_USER_ID_HERE' with your actual UUID from auth.users (or check looking at url in local dev if possible, strictly UUID)

DO $$ 
DECLARE
    v_user_id UUID := '00000000-0000-0000-0000-000000000000'; -- REPLACE THIS WITH YOUR REAL ID
    v_subforum_id UUID;
    r RECORD;
BEGIN
    -- 1. Try to find a subforum
    SELECT id INTO v_subforum_id FROM forum_subforums LIMIT 1;
    
    RAISE NOTICE 'Testing for User: %', v_user_id;
    RAISE NOTICE 'Testing Subforum: %', v_subforum_id;

    -- 2. Call the RPC directly
    -- This mimics what the frontend calls
    PERFORM has_unread_topics_in_subforum(v_user_id, v_subforum_id);
    
    -- 3. Show manual calculation of unread topics
    -- This shows WHY it thinks true/false
    FOR r IN (
        SELECT 
            t.id as topic_id,
            t.title,
            t.last_post_at,
            tr.last_read_at,
            CASE 
                WHEN tr.last_read_at IS NULL THEN 'NEVER READ'
                WHEN t.last_post_at > tr.last_read_at THEN 'NEW POSTS'
                ELSE 'READ'
            END as status
        FROM forum_topics t
        LEFT JOIN forum_topic_reads tr ON t.id = tr.topic_id AND tr.user_id = v_user_id
        WHERE t.subforum_id = v_subforum_id
        LIMIT 5
    ) LOOP
        RAISE NOTICE 'Topic: % | Status: % | LastPost: % | LastRead: %', 
            r.title, r.status, r.last_post_at, r.last_read_at;
    END LOOP;
END $$;
