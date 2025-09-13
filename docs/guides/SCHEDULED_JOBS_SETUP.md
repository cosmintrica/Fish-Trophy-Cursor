# Scheduled Jobs Setup - Supabase

## 📋 Overview
This guide explains how to set up automated daily analytics updates in Supabase.

## 🔧 Manual Update (Current Implementation)

### From Admin Panel
1. Go to Admin Panel → Analytics tab
2. Click "Actualizează" button
3. Stats are updated immediately

### From Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Run this query:
```sql
SELECT public.update_daily_analytics_stats();
```

## ⏰ Automated Scheduled Jobs (Recommended)

### Option 1: Supabase Edge Functions + Cron
1. **Create Edge Function:**
```bash
supabase functions new update-daily-stats
```

2. **Function Code:**
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { error } = await supabase.rpc('update_daily_analytics_stats')
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

3. **Deploy Function:**
```bash
supabase functions deploy update-daily-stats
```

4. **Set up Cron Job:**
   - Go to Supabase Dashboard → Edge Functions
   - Find your function → Settings → Cron
   - Add: `0 1 * * *` (runs daily at 1 AM UTC)

### Option 2: External Cron Service
Use services like:
- **Cron-job.org** (free)
- **EasyCron** (paid)
- **GitHub Actions** (free for public repos)

**Example GitHub Action:**
```yaml
name: Update Daily Stats
on:
  schedule:
    - cron: '0 1 * * *'  # Daily at 1 AM UTC
  workflow_dispatch:  # Manual trigger

jobs:
  update-stats:
    runs-on: ubuntu-latest
    steps:
      - name: Update Analytics
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{}' \
            https://your-project.supabase.co/functions/v1/update-daily-stats
```

### Option 3: Database Triggers (Alternative)
```sql
-- Create a function that runs daily
CREATE OR REPLACE FUNCTION public.schedule_daily_stats_update()
RETURNS void AS $$
BEGIN
  -- This would need to be called by an external scheduler
  PERFORM public.update_daily_analytics_stats();
END;
$$ LANGUAGE plpgsql;
```

## 📊 Available Functions

### 1. `update_daily_analytics_stats()`
- Updates daily aggregated stats
- Can be called manually or scheduled
- Returns void

### 2. `get_current_analytics_stats()`
- Returns current day stats
- Useful for real-time dashboard
- Returns table with current metrics

### 3. `get_daily_stats_history(days_back)`
- Returns historical daily stats
- Default: last 30 days
- Useful for charts and trends

## 🚀 Recommended Setup

1. **Start with Manual Updates** (current implementation)
2. **Set up Supabase Edge Function** for automation
3. **Configure Cron Job** to run daily at 1 AM UTC
4. **Monitor logs** in Supabase Dashboard

## 📝 Notes

- **Time Zone:** All times are in UTC
- **Performance:** Function runs in ~2-5 seconds
- **Data Retention:** Daily stats are kept indefinitely
- **Error Handling:** Failed runs don't affect next day's data

## 🔍 Monitoring

Check function execution in:
- Supabase Dashboard → Edge Functions → Logs
- Admin Panel → Analytics tab (for manual updates)
- Database → `analytics_daily_stats` table

---

*Last updated: 2025-09-10*
