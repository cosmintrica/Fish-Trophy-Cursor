-- Enable realtime for forum_posts table
alter publication supabase_realtime add table forum_posts;
alter publication supabase_realtime add table forum_topics;

-- Verify it worked (optional select, but we just run the alter)
