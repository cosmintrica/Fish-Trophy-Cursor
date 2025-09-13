// Debug environment variables
console.log('=== ENVIRONMENT VARIABLES DEBUG ===')
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET')
console.log('VITE_ADMIN_EMAIL:', import.meta.env.VITE_ADMIN_EMAIL)
console.log('NODE_ENV:', import.meta.env.NODE_ENV)
console.log('MODE:', import.meta.env.MODE)
console.log('================================')
