# 🚀 Blood Donation API - Complete Setup Guide

## Phase 1: Backend Setup ✅ (You Are Here)

This guide walks you through setting up the backend API from scratch.

---

## Step 1: Verify Project Structure

Your project should look like this:

```
blood-donation-api/
├── .env                 ← Configuration (DO NOT commit)
├── .env.example         ← Template for .env
├── .gitignore           ← Git ignore rules
├── README.md            ← Main documentation
├── SETUP.md             ← This file
├── server.js            ← Express entry point
├── supabase.js          ← Supabase client
├── package.json         ← Dependencies
├── package-lock.json
├── node_modules/        ← Dependencies folder
└── api/
    ├── auth/
    │   ├── login/index.js
    │   └── register/index.js
    ├── requests/index.js
    ├── ai/
    │   ├── match/index.js
    │   └── predict/index.js
    ├── emergency/index.js
    ├── inventory/index.js
    └── admin/index.js
```

✅ All files are created!

---

## Step 2: Get Supabase Keys

1. Go to https://app.supabase.com
2. Create a new project or use existing one
3. Go to **Project Settings** → **API Keys**
4. Copy:
   - **Project URL** (e.g., `https://xxxx.supabase.co`)
   - **Service Role Secret** (Keep this SECRET!)

⚠️ **IMPORTANT**: Use **Service Role Secret** (not anon key) for server-side!

---

## Step 3: Setup Environment Variables

1. Open `.env` file in the project root
2. Replace the placeholder values:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ0eXAiOiJKV1QiLC...  # Your actual key
JWT_SECRET=my-super-secret-key-12345
PORT=5000
NODE_ENV=development
```

💡 You can copy from `.env.example` as a template.

---

## Step 4: Setup Supabase Database Schema

### 4.1 Open Supabase SQL Editor
- Go to your Supabase project
- Click **SQL Editor** in left sidebar
- Click **New Query**

### 4.2 Run this SQL to create all tables

```sql
-- 1. Profiles (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  role text check (role in ('donor','patient','hospital','admin')) not null,
  full_name text,
  phone text,
  location_lat float,
  location_lng float,
  city text,
  created_at timestamptz default now()
);

-- 2. Donors
create table if not exists donors (
  id uuid references profiles on delete cascade primary key,
  blood_group text check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-')) not null,
  is_available boolean default true,
  last_donation_date date,
  weight float,
  medical_conditions text[],
  total_donations int default 0
);

-- 3. Blood Requests
create table if not exists blood_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references profiles on delete set null,
  blood_group text not null,
  units_needed int not null,
  priority text check (priority in ('critical','moderate','normal')) default 'normal',
  status text check (status in ('pending','matched','fulfilled','cancelled')) default 'pending',
  hospital_name text,
  location_lat float,
  location_lng float,
  city text,
  patient_condition text,
  created_at timestamptz default now()
);

-- 4. Blood Inventory
create table if not exists blood_inventory (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid references profiles on delete cascade not null,
  blood_group text not null,
  units_available int default 0,
  updated_at timestamptz default now(),
  unique(hospital_id, blood_group)
);

-- 5. Donation History
create table if not exists donation_history (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid references donors on delete cascade not null,
  request_id uuid references blood_requests on delete set null,
  donated_at timestamptz default now(),
  units int default 1
);

-- Enable RLS (Row Level Security)
alter table profiles enable row level security;
alter table donors enable row level security;
alter table blood_requests enable row level security;
alter table blood_inventory enable row level security;
alter table donation_history enable row level security;

-- Create indexes for faster queries
create index if not exists idx_donors_city on donors using hash((profiles.city)) 
  from profiles where profiles.id = donors.id;
create index if not exists idx_requests_status on blood_requests(status);
create index if not exists idx_requests_priority on blood_requests(priority);
create index if not exists idx_inventory_hospital on blood_inventory(hospital_id);
```

### 4.3 Enable Realtime (for live updates)

In Supabase Dashboard:
1. Click **Replication** (left sidebar)
2. Click the toggle next to `blood_requests` to enable Realtime
3. Click the toggle next to `blood_inventory` to enable Realtime

This allows the frontend to get live updates when requests are created or inventory changes.

---

## Step 5: Start Development Server

Open terminal in `blood-donation-api` folder and run:

```bash
npm run dev
```

Expected output:
```
✅ Server running on http://localhost:5000
📍 Health check: http://localhost:5000/health
```

Test health endpoint:
```bash
curl http://localhost:5000/health
```

Response:
```json
{"status":"ok","timestamp":"2024-05-17T11:51:53.614Z"}
```

---

## Step 6: Test API Endpoints

### Test 1: Register a Donor

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "donor@test.com",
    "password": "test123",
    "full_name": "John Doe",
    "phone": "01234567890",
    "role": "donor",
    "city": "Dhaka",
    "blood_group": "O-",
    "location_lat": 23.8103,
    "location_lng": 90.4125
  }'
```

Expected response:
```json
{
  "message": "Registered successfully",
  "userId": "uuid-here",
  "email": "donor@test.com",
  "role": "donor"
}
```

### Test 2: Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "donor@test.com",
    "password": "test123"
  }'
```

Expected response:
```json
{
  "token": "eyJ0eXAiOiJKV1QiLC...",
  "user": {
    "id": "uuid",
    "email": "donor@test.com",
    "role": "donor",
    "full_name": "John Doe",
    "city": "Dhaka"
  }
}
```

### Test 3: Create Blood Request

```bash
curl -X POST http://localhost:5000/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "requester_id": "paste-userid-from-register",
    "blood_group": "O-",
    "units_needed": 2,
    "hospital_name": "Dhaka Medical Hospital",
    "location_lat": 23.8103,
    "location_lng": 90.4125,
    "city": "Dhaka",
    "patient_condition": "Surgery"
  }'
```

### Test 4: Find Matching Donors (AI)

```bash
curl -X POST http://localhost:5000/api/ai/match \
  -H "Content-Type: application/json" \
  -d '{
    "blood_group": "O-",
    "location_lat": 23.8103,
    "location_lng": 90.4125,
    "city": "Dhaka"
  }'
```

Response shows top 10 matched donors with scores!

### Test 5: Blood Shortage Prediction

```bash
curl http://localhost:5000/api/ai/predict
```

Response shows which blood groups may run low.

### Test 6: Emergency Request

```bash
curl -X POST http://localhost:5000/api/emergency \
  -H "Content-Type: application/json" \
  -d '{
    "blood_group": "AB+",
    "hospital_name": "Emergency Hospital",
    "location_lat": 23.8103,
    "location_lng": 90.4125,
    "city": "Dhaka",
    "contact_phone": "01234567890"
  }'
```

---

## Step 7: Common Issues & Fixes

### ❌ "SUPABASE_URL not set"
**Fix**: Make sure `.env` file exists and has correct values

### ❌ "Port 5000 is already in use"
**Fix**: Either:
- Kill the process: `npx kill-port 5000`
- Use different port: `PORT=3001 npm run dev`

### ❌ "Cannot find module 'express'"
**Fix**: Run `npm install` again

### ❌ "Database connection error"
**Fix**: 
- Check SUPABASE_URL and SUPABASE_SERVICE_KEY are correct
- Make sure Supabase project is active
- Verify database tables exist (run SQL from Step 4)

---

## Step 8: Next Phase - Frontend Setup

After backend is working:

1. **Clone/create frontend repo**: `npx create-next-app@latest blood-donation-frontend`
2. **Install dependencies**: `npm install @supabase/supabase-js zustand react-hook-form`
3. **Create `.env.local`** in frontend with same SUPABASE_URL (but use anon key, not service key)
4. **Build pages**: `/`, `/register`, `/donate`, `/request`, `/dashboard`

---

## Step 9: Deployment Checklist

### Before going live:
- ✅ Set `NODE_ENV=production`
- ✅ Change `JWT_SECRET` to a random strong key
- ✅ Enable HTTPS
- ✅ Setup database backups in Supabase
- ✅ Add rate limiting (middleware)
- ✅ Add input validation
- ✅ Setup monitoring/logging
- ✅ Test all endpoints thoroughly

### Deployment options:
- **Backend**: Railway.app, Render.com, Heroku, AWS Lambda
- **Frontend**: Vercel, Netlify
- **Database**: Supabase (already hosted)

---

## 📚 API Documentation

Full API documentation is in `README.md`

---

## 🆘 Need Help?

Check:
1. `.env` file is configured
2. Supabase tables are created
3. Server is running: `curl http://localhost:5000/health`
4. All dependencies installed: `npm install`

---

## 🎯 Progress Tracking

- ✅ Backend Setup (YOU ARE HERE)
- ⏭️ Frontend Setup
- ⏭️ Notifications (Email/SMS)
- ⏭️ Maps Integration
- ⏭️ Testing
- ⏭️ Deployment

**You're doing great! Backend is complete. 🎉**

---

**Last updated**: May 17, 2024
**Version**: 1.0.0
