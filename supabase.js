// supabase.js - Make sure you're using SERVICE_KEY
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
console.log('Supabase URL from env:', supabaseUrl);
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // This is important!
console.log('Supabase Service Key from env:', supabaseServiceKey);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

// Create admin client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

module.exports = supabase;