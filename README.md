# Blood Donation API Backend

Smart AI-powered blood donation system backend built with Node.js + Express + Supabase.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm
- Supabase account

### Setup

1. **Clone and install dependencies**
```bash
cd blood-donation-api
npm install
```

2. **Configure environment variables**
Create `.env` file in the root with:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
JWT_SECRET=your-secret-key-change-this
PORT=5000
NODE_ENV=development
```

Get your Supabase keys from: https://app.supabase.com → Project Settings → API Keys

3. **Setup Supabase Database Schema**

Run these SQL queries in your Supabase SQL editor:

```sql
-- Users (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users primary key,
  role text check (role in ('donor','patient','hospital','admin')),
  full_name text,
  phone text,
  location_lat float,
  location_lng float,
  city text,
  created_at timestamptz default now()
);

-- Donors
create table donors (
  id uuid references profiles primary key,
  blood_group text check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  is_available boolean default true,
  last_donation_date date,
  weight float,
  medical_conditions text[],
  total_donations int default 0
);

-- Blood requests
create table blood_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references profiles,
  blood_group text,
  units_needed int,
  priority text check (priority in ('critical','moderate','normal')),
  status text check (status in ('pending','matched','fulfilled','cancelled')),
  hospital_name text,
  location_lat float,
  location_lng float,
  city text,
  patient_condition text,
  created_at timestamptz default now()
);

-- Inventory (for hospitals/blood banks)
create table blood_inventory (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid references profiles,
  blood_group text,
  units_available int,
  updated_at timestamptz default now(),
  unique(hospital_id, blood_group)
);

-- Donation history
create table donation_history (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid references donors,
  request_id uuid references blood_requests,
  donated_at timestamptz default now(),
  units int default 1
);

-- Enable RLS
alter table profiles enable row level security;
alter table donors enable row level security;
alter table blood_requests enable row level security;
alter table blood_inventory enable row level security;

-- Enable Realtime on these tables in Supabase dashboard
-- Dashboard → Realtimeicon → Enable on: blood_requests, blood_inventory
```

4. **Run the server**
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server will start at `http://localhost:5000`

Test health: `curl http://localhost:5000/health`

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Blood Requests
- `POST /api/requests` - Create blood request
- `GET /api/requests` - Get all requests
- `GET /api/requests/:id` - Get single request
- `PATCH /api/requests/:id/status` - Update request status

### AI Features
- `POST /api/ai/match` - Find matching donors (AI algorithm)
- `GET /api/ai/predict` - Blood shortage predictions

### Emergency
- `POST /api/emergency` - Create emergency blood request

### Inventory Management
- `GET /api/inventory/:hospitalId` - Get hospital inventory
- `PATCH /api/inventory/update` - Update inventory
- `POST /api/inventory/bulk-update` - Bulk update inventory

### Admin
- `GET /api/admin/analytics` - Dashboard analytics
- `GET /api/admin/users` - Get all users
- `PATCH /api/admin/users/:userId/role` - Update user role

## 🧠 AI Features

### Smart Donor Matching Algorithm
Scores donors 0-100 based on:
- **Blood group compatibility** (40 pts)
- **Distance/Proximity** (30 pts) - closer donors ranked higher
- **Last donation eligibility** (20 pts) - minimum 90 days
- **Availability status** (10 pts)

Returns top 10 matching donors sorted by score.

### Blood Shortage Prediction
- Analyzes 30-day usage patterns
- Predicts which blood groups may become low
- Suggests donation campaigns
- Status: `critical`, `low`, or `stable`

### Emergency Priority Classification
Automatically classifies requests as:
- **Critical**: Surgery, accidents, ≥4 units needed
- **Moderate**: 2+ units, urgent needed
- **Normal**: Routine requests

## 📁 Project Structure

```
blood-donation-api/
├── server.js              # Express entry point
├── supabase.js            # Supabase client
├── .env                   # Environment variables
├── package.json
├── api/
│   ├── auth/
│   │   ├── login/
│   │   └── register/
│   ├── requests/          # Blood request CRUD
│   ├── ai/
│   │   ├── match/         # Donor matching algorithm
│   │   └── predict/       # Shortage prediction
│   ├── emergency/         # Emergency requests
│   ├── inventory/         # Hospital inventory
│   └── admin/             # Admin analytics & user management
└── node_modules/
```

## 🔑 Example Requests

### Register Donor
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

### Find Matching Donors
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

### Create Blood Request
```bash
curl -X POST http://localhost:5000/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "requester_id": "user-uuid-here",
    "blood_group": "O-",
    "units_needed": 2,
    "hospital_name": "Dhaka Medical Hospital",
    "location_lat": 23.8103,
    "location_lng": 90.4125,
    "city": "Dhaka",
    "patient_condition": "Accident"
  }'
```

### Emergency Alert
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

## 🚀 Next Steps

1. ✅ Backend setup complete
2. 🔄 **Setup Supabase database** (run SQL schema)
3. 📱 **Frontend** - Build Next.js frontend in separate repo
4. 🔔 **Notifications** - Add Twilio/Resend for SMS/Email alerts
5. 🗺️ **Maps** - Integrate Google Maps API
6. 🧪 **Testing** - Add Jest unit tests
7. 🚀 **Deployment** - Deploy to Railway/Render

## 📝 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://abc.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service role key (for server-side) | `eyJ...` |
| `JWT_SECRET` | Secret for JWT signing | `your-secret-key` |
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` or `production` |

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/feature-name`
2. Commit changes: `git commit -m "feat: description"`
3. Push to branch: `git push origin feature/feature-name`
4. Open Pull Request

## 📄 License

MIT

## 💡 Support

For issues or questions, please open a GitHub issue or contact the team.

---

**Built with ❤️ for saving lives through blood donation**
