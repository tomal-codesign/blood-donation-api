-- ============================================
-- BLOOD DONATION SYSTEM - DATABASE SCHEMA
-- Supabase SQL Setup
-- ============================================
-- Instructions:
-- 1. Go to https://app.supabase.com
-- 2. Open SQL Editor
-- 3. Create a New Query
-- 4. Copy-paste this entire file
-- 5. Click "Run" button
-- 6. Wait for success message
-- ============================================

-- ============================================
-- 1. PROFILES TABLE (User accounts)
-- ============================================
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  role text check (role in ('donor','patient','hospital','admin')) not null,
  full_name text,
  phone text,
  location_lat float,
  location_lng float,
  city text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create index for faster queries
create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_profiles_city on profiles(city);
create index if not exists idx_profiles_location on profiles(location_lat, location_lng);
create index if not exists idx_profiles_location on profiles(location_lat, location_lng);

-- ============================================
-- 2. DONORS TABLE (Donor-specific details)
-- ============================================
create table if not exists donors (
  id uuid references profiles on delete cascade primary key,
  blood_group text check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-')) not null,
  is_available boolean default true,
  last_donation_date date,
  weight float,
  medical_conditions text[] default array[]::text[],
  total_donations int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create index for faster queries
create index if not exists idx_donors_blood_group on donors(blood_group);
create index if not exists idx_donors_available on donors(is_available);

-- ============================================
-- 3. BLOOD REQUESTS TABLE
-- ============================================
create table if not exists blood_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references profiles on delete set null,
  blood_group text check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-')) not null,
  units_needed int not null check (units_needed > 0),
  priority text check (priority in ('critical','moderate','normal')) default 'normal',
  status text check (status in ('pending','matched','fulfilled','cancelled')) default 'pending',
  hospital_name text,
  location_lat float not null,
  location_lng float not null,
  city text,
  patient_condition text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for faster queries
create index if not exists idx_requests_status on blood_requests(status);
create index if not exists idx_requests_priority on blood_requests(priority);
create index if not exists idx_requests_blood_group on blood_requests(blood_group);
create index if not exists idx_requests_city on blood_requests(city);
create index if not exists idx_requests_created on blood_requests(created_at desc);

-- ============================================
-- 4. BLOOD INVENTORY TABLE (Hospital stock)
-- ============================================
create table if not exists blood_inventory (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid references profiles on delete cascade not null,
  blood_group text check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-')) not null,
  units_available int default 0 check (units_available >= 0),
  updated_at timestamptz default now(),
  unique(hospital_id, blood_group)
);

-- Create index for faster queries
create index if not exists idx_inventory_hospital on blood_inventory(hospital_id);
create index if not exists idx_inventory_blood_group on blood_inventory(blood_group);

-- ============================================
-- 5. DONATION HISTORY TABLE
-- ============================================
create table if not exists donation_history (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid references donors on delete cascade not null,
  request_id uuid references blood_requests on delete set null,
  donated_at timestamptz default now(),
  units int default 1 check (units > 0),
  created_at timestamptz default now()
);

-- Create index for faster queries
create index if not exists idx_donation_donor on donation_history(donor_id);
create index if not exists idx_donation_request on donation_history(request_id);
create index if not exists idx_donation_date on donation_history(donated_at desc);

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
alter table profiles enable row level security;
alter table donors enable row level security;
alter table blood_requests enable row level security;
alter table blood_inventory enable row level security;
alter table donation_history enable row level security;

-- ============================================
-- NEXT STEPS IN SUPABASE DASHBOARD:
-- ============================================
-- 1. Go to "Replication" section in Supabase Dashboard
-- 2. Toggle these tables to ENABLE Realtime:
--    ✅ blood_requests (for live emergency alerts)
--    ✅ blood_inventory (for live stock updates)
-- 3. Go to "Authentication" → "Policies"
-- 4. Create RLS policies (if needed for security)
-- ============================================

-- ============================================
-- TEST QUERIES (Run after schema creation)
-- ============================================

-- View all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check profiles table structure
\d profiles;

-- Check donors table structure
\d donors;

-- Check blood_requests table structure
\d blood_requests;

-- Check blood_inventory table structure
\d blood_inventory;

-- Check donation_history table structure
\d donation_history;

-- ============================================
-- OPTIONAL: Sample Data (for testing)
-- ============================================

-- Note: To insert test data, you need valid user IDs from auth.users
-- First create users via the API, then insert their data here

-- Example (replace with actual UUIDs):
-- INSERT INTO profiles (id, role, full_name, phone, city) VALUES
--   ('user-uuid-1', 'donor', 'John Doe', '01234567890', 'Dhaka'),
--   ('user-uuid-2', 'hospital', 'Dhaka Medical Hospital', '01987654321', 'Dhaka');
--
-- INSERT INTO donors (id, blood_group) VALUES
--   ('user-uuid-1', 'O-');
--
-- INSERT INTO blood_inventory (hospital_id, blood_group, units_available) VALUES
--   ('user-uuid-2', 'O+', 20),
--   ('user-uuid-2', 'O-', 15),
--   ('user-uuid-2', 'A+', 12);

-- ============================================
-- SUCCESS!
-- ============================================
-- If you see "Success" messages above, your database is ready!
-- 
-- Next steps:
-- 1. Enable Realtime in Supabase Dashboard (Blood Requests & Inventory)
-- 2. Update .env file with SUPABASE_URL and SUPABASE_SERVICE_KEY
-- 3. Run: npm run dev
-- 4. Test: curl http://localhost:5000/health
-- 5. Import Postman collection to test API endpoints
-- ============================================
