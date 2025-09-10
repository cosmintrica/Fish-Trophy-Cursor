-- Create function to get city statistics for Romanian cities only
CREATE OR REPLACE FUNCTION get_romanian_city_stats()
RETURNS TABLE (
    city VARCHAR(100),
    count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(ae.city, 'Necunoscut') as city,
        COUNT(*) as count
    FROM analytics_events ae
    WHERE ae.country = 'România'
       OR ae.country = 'Romania'
       OR ae.country IS NULL  -- Include null countries as they're likely Romanian
    GROUP BY COALESCE(ae.city, 'Necunoscut')
    ORDER BY count DESC
    LIMIT 20;  -- Top 20 Romanian cities
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_romanian_city_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_romanian_city_stats() TO anon;

-- Test the function
SELECT 'Romanian City Stats:' as test_type;
SELECT * FROM get_romanian_city_stats();
