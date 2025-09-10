-- Create analytics tables for real website tracking
-- Migration: 20250910184000_create_analytics_tables.sql

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    page_path VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    referrer TEXT,
    screen_resolution VARCHAR(20),
    viewport_size VARCHAR(20),
    device_type VARCHAR(20),
    browser VARCHAR(50),
    os VARCHAR(50),
    country VARCHAR(100),
    city VARCHAR(100),
    additional_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_page_path ON analytics_events(page_path);

-- Analytics sessions table for session tracking
CREATE TABLE IF NOT EXISTS analytics_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    page_views INTEGER DEFAULT 0,
    duration_seconds INTEGER,
    device_type VARCHAR(20),
    browser VARCHAR(50),
    os VARCHAR(50),
    country VARCHAR(100),
    city VARCHAR(100),
    referrer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for sessions
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_session_id ON analytics_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user_id ON analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started_at ON analytics_sessions(started_at);

-- Analytics daily stats table for aggregated data
CREATE TABLE IF NOT EXISTS analytics_daily_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    page_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    unique_sessions INTEGER DEFAULT 0,
    avg_session_duration INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,2) DEFAULT 0,
    mobile_users INTEGER DEFAULT 0,
    desktop_users INTEGER DEFAULT 0,
    top_pages JSONB,
    top_browsers JSONB,
    top_countries JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for daily stats
CREATE INDEX IF NOT EXISTS idx_analytics_daily_stats_date ON analytics_daily_stats(date);

-- Enable Row Level Security
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analytics_events
CREATE POLICY "Allow insert for all users" ON analytics_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read for admin users" ON analytics_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email = 'cosmin.trica@outlook.com'
        )
    );

-- RLS Policies for analytics_sessions
CREATE POLICY "Allow insert for all users" ON analytics_sessions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read for admin users" ON analytics_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email = 'cosmin.trica@outlook.com'
        )
    );

-- RLS Policies for analytics_daily_stats
CREATE POLICY "Allow read for admin users" ON analytics_daily_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email = 'cosmin.trica@outlook.com'
        )
    );

CREATE POLICY "Allow insert for admin users" ON analytics_daily_stats
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email = 'cosmin.trica@outlook.com'
        )
    );

CREATE POLICY "Allow update for admin users" ON analytics_daily_stats
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email = 'cosmin.trica@outlook.com'
        )
    );

-- Function to update daily stats
CREATE OR REPLACE FUNCTION update_daily_analytics_stats()
RETURNS void AS $$
BEGIN
    INSERT INTO analytics_daily_stats (
        date,
        page_views,
        unique_visitors,
        unique_sessions,
        avg_session_duration,
        bounce_rate,
        mobile_users,
        desktop_users,
        top_pages,
        top_browsers,
        top_countries
    )
    SELECT
        CURRENT_DATE,
        COUNT(*) as page_views,
        COUNT(DISTINCT user_id) as unique_visitors,
        COUNT(DISTINCT session_id) as unique_sessions,
        COALESCE(AVG(s.duration_seconds), 0) as avg_session_duration,
        COALESCE(
            (COUNT(CASE WHEN s.page_views = 1 THEN 1 END)::DECIMAL / COUNT(*)) * 100,
            0
        ) as bounce_rate,
        COUNT(CASE WHEN device_type = 'mobile' THEN 1 END) as mobile_users,
        COUNT(CASE WHEN device_type = 'desktop' THEN 1 END) as desktop_users,
        (
            SELECT jsonb_object_agg(page_path, page_count)
            FROM (
                SELECT page_path, COUNT(*) as page_count
                FROM analytics_events
                WHERE DATE(timestamp) = CURRENT_DATE
                AND event_type = 'page_view'
                GROUP BY page_path
                ORDER BY page_count DESC
                LIMIT 10
            ) top_pages
        ) as top_pages,
        (
            SELECT jsonb_object_agg(browser, browser_count)
            FROM (
                SELECT browser, COUNT(*) as browser_count
                FROM analytics_events
                WHERE DATE(timestamp) = CURRENT_DATE
                GROUP BY browser
                ORDER BY browser_count DESC
                LIMIT 10
            ) top_browsers
        ) as top_browsers,
        (
            SELECT jsonb_object_agg(COALESCE(country, 'Unknown'), country_count)
            FROM (
                SELECT country, COUNT(*) as country_count
                FROM analytics_events
                WHERE DATE(timestamp) = CURRENT_DATE
                GROUP BY country
                ORDER BY country_count DESC
                LIMIT 10
            ) top_countries
        ) as top_countries
    FROM analytics_events e
    LEFT JOIN analytics_sessions s ON e.session_id = s.session_id
    WHERE DATE(e.timestamp) = CURRENT_DATE
    ON CONFLICT (date) DO UPDATE SET
        page_views = EXCLUDED.page_views,
        unique_visitors = EXCLUDED.unique_visitors,
        unique_sessions = EXCLUDED.unique_sessions,
        avg_session_duration = EXCLUDED.avg_session_duration,
        bounce_rate = EXCLUDED.bounce_rate,
        mobile_users = EXCLUDED.mobile_users,
        desktop_users = EXCLUDED.desktop_users,
        top_pages = EXCLUDED.top_pages,
        top_browsers = EXCLUDED.top_browsers,
        top_countries = EXCLUDED.top_countries,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to update daily stats (this would need to be set up in Supabase dashboard)
-- For now, we'll call this function manually from the admin panel
