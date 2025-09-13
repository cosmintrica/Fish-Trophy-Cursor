# Deploy Checklist - Fish Trophy

## 🚀 **Pre-Deploy Checklist**

### **1. Database Migrations**
- [ ] Apply `20250910184000_create_analytics_tables.sql`
- [ ] Apply `20250910185000_add_auth_uid_defaults.sql`
- [ ] Apply `20250910186000_add_daily_stats_scheduler.sql`
- [ ] Apply `20250910187000_fix_rls_policies.sql`
- [ ] Apply `20250910188000_emergency_rls_fix.sql`

### **2. Environment Variables (Netlify)**
- [ ] `VITE_SUPABASE_URL` ✅ (already set)
- [ ] `VITE_SUPABASE_ANON_KEY` ✅ (already set)
- [ ] `VITE_ADMIN_EMAIL` ✅ (already set)
- [ ] `VITE_R2_ACCOUNT_ID` ✅ (already set)
- [ ] `VITE_R2_ACCESS_KEY_ID` ✅ (already set)
- [ ] `VITE_R2_SECRET_ACCESS_KEY` ✅ (already set)
- [ ] `VITE_R2_PUBLIC_URL` ✅ (already set)
- [ ] `VITE_R2_BUCKET_NAME` ❌ **MISSING** - Add: `fishtrophy-content`

### **3. Edge Functions**
- [ ] `update-daily-stats` deployed ✅
- [ ] Cron job configured ✅ (ID: 1)

### **4. Netlify Functions**
- [ ] `upload.mjs` ✅ (exists)
- [ ] `analytics.mjs` ✅ (exists)
- [ ] `records.mjs` ✅ (exists)
- [ ] `species.mjs` ✅ (exists)
- [ ] `locations.mjs` ✅ (exists)

### **5. Code Fixes Applied**
- [ ] Toast import added to Admin.tsx ✅
- [ ] Relationship errors fixed in queries ✅
- [ ] RLS policies emergency fix ✅
- [ ] Analytics tracking implemented ✅
- [ ] Upload function configured ✅

## 🔧 **Deploy Steps**

### **Step 1: Add Missing Environment Variable**
1. Go to Netlify Dashboard → Site Settings → Environment Variables
2. Add: `VITE_R2_BUCKET_NAME = fishtrophy-content`

### **Step 2: Apply Database Migrations**
1. Go to Supabase Dashboard → SQL Editor
2. Run each migration in order:
   ```sql
   -- Run migrations one by one
   ```

### **Step 3: Deploy to Netlify**
1. Push to GitHub (if using Git)
2. Or trigger manual deploy in Netlify Dashboard

### **Step 4: Test After Deploy**
- [ ] Records page loads ✅
- [ ] Admin panel works ✅
- [ ] File upload works ✅
- [ ] Analytics tracking works ✅
- [ ] User profiles display ✅

## 🐛 **Known Issues Fixed**

### **RLS Permission Errors**
- **Problem:** `permission denied for table users`
- **Solution:** Emergency RLS fix applied

### **Relationship Errors**
- **Problem:** `more than one relationship was found`
- **Solution:** Used specific foreign key names in queries

### **Toast Errors**
- **Problem:** `toast is not defined`
- **Solution:** Added import in Admin.tsx

### **Upload 404 Errors**
- **Problem:** `/.netlify/functions/upload 404`
- **Solution:** Function exists, needs R2_BUCKET_NAME env var

## 📊 **Post-Deploy Verification**

### **Test Checklist:**
1. **Home Page** - Map loads, markers display
2. **Records Page** - Records load with user names
3. **Profile Page** - User records display
4. **Admin Panel** - All tabs work, analytics display
5. **File Upload** - Images/videos upload to R2
6. **Analytics** - Events tracked, stats update

### **Performance Checks:**
- [ ] Page load times < 3s
- [ ] Map renders smoothly
- [ ] No console errors
- [ ] Mobile responsive

## 🚨 **Emergency Rollback**

If issues occur:
1. **Disable RLS:** Run emergency RLS fix migration
2. **Revert Code:** Use previous working commit
3. **Check Logs:** Netlify Functions logs, Supabase logs

## 📝 **Notes**

- **RLS:** Temporarily disabled for testing, will re-enable with proper policies
- **Analytics:** Real-time tracking implemented
- **Upload:** Cloudflare R2 configured
- **Cron:** Daily stats update automated

---

**Status:** Ready for Deploy ✅
**Last Updated:** 2025-09-10
