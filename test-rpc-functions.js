const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRPCFunctions() {
  console.log('Testing RPC functions...\n');

  // Test device stats
  console.log('1. Testing get_device_stats...');
  const { data: deviceStats, error: deviceError } = await supabase.rpc('get_device_stats');
  console.log('Device Stats:', { deviceStats, deviceError });
  console.log('');

  // Test browser stats
  console.log('2. Testing get_browser_stats...');
  const { data: browserStats, error: browserError } = await supabase.rpc('get_browser_stats');
  console.log('Browser Stats:', { browserStats, browserError });
  console.log('');

  // Test OS stats
  console.log('3. Testing get_os_stats...');
  const { data: osStats, error: osError } = await supabase.rpc('get_os_stats');
  console.log('OS Stats:', { osStats, osError });
  console.log('');

  // Test country stats
  console.log('4. Testing get_country_stats...');
  const { data: countryStats, error: countryError } = await supabase.rpc('get_country_stats');
  console.log('Country Stats:', { countryStats, countryError });
  console.log('');

  // Test city stats
  console.log('5. Testing get_romanian_city_stats...');
  const { data: cityStats, error: cityError } = await supabase.rpc('get_romanian_city_stats');
  console.log('City Stats:', { cityStats, cityError });
  console.log('');

  // Test referrer stats
  console.log('6. Testing get_referrer_stats...');
  const { data: referrerStats, error: referrerError } = await supabase.rpc('get_referrer_stats');
  console.log('Referrer Stats:', { referrerStats, referrerError });
  console.log('');

  // Test page views stats
  console.log('7. Testing get_page_views_stats...');
  const { data: pageViewsStats, error: pageViewsError } = await supabase.rpc('get_page_views_stats');
  console.log('Page Views Stats:', { pageViewsStats, pageViewsError });
  console.log('');

  // Test analytics events table
  console.log('8. Testing analytics_events table...');
  const { data: analyticsEvents, error: analyticsError } = await supabase
    .from('analytics_events')
    .select('device_type, browser, os, country, city, referrer, page_path')
    .limit(5);
  console.log('Analytics Events Sample:', { analyticsEvents, analyticsError });
  console.log('');

  console.log('RPC Functions test completed!');
}

testRPCFunctions().catch(console.error);
