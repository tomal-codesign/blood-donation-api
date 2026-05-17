# ⚡ QUICK START CHECKLIST

Follow these steps in order to get your Blood Donation API running in 10 minutes!

## ✅ Checklist

### Step 1: Environment Setup (2 min)
- [ ] Have Supabase account? Get one free: https://supabase.com
- [ ] Create new Supabase project
- [ ] Go to **Project Settings** → **API Keys**
- [ ] Copy **Project URL** (e.g., `https://xxxx.supabase.co`)
- [ ] Copy **Service Role Secret** (the long key marked as sensitive)

### Step 2: Configure Backend (1 min)
- [ ] Open `.env` file in project root
- [ ] Paste your Supabase URL and Service Role Secret
- [ ] Keep `JWT_SECRET` as is (or change it)
- [ ] Save file

Example `.env`:
```env
SUPABASE_URL=https://abc123.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=my-secret-key
PORT=5000
NODE_ENV=development
```

### Step 3: Setup Database (3 min)
- [ ] Go to your Supabase dashboard 
- [ ] Click **SQL Editor** (left sidebar)
- [ ] Click **New Query**
- [ ] Open file: `DATABASE_SCHEMA.sql` in this project
- [ ] Copy ALL the SQL code
- [ ] Paste into Supabase SQL Editor
- [ ] Click **Run** button
- [ ] Wait for "Success" message ✅

### Step 4: Enable Realtime (1 min)
- [ ] In Supabase dashboard, click **Replication** (left sidebar)
- [ ] Find `blood_requests` table → Toggle ON
- [ ] Find `blood_inventory` table → Toggle ON
- [ ] These enable live emergency alerts!

### Step 5: Start Server (1 min)
- [ ] Open terminal in project directory
- [ ] Run: `npm run dev`
- [ ] Wait for message: "✅ Server running on http://localhost:5000"

### Step 6: Test It! (2 min)
- [ ] Open browser: http://localhost:5000/health
- [ ] Should see: `{"status":"ok"}`
- [ ] Download Postman: https://www.postman.com
- [ ] Import collection: `Blood_Donation_API.postman_collection.json`
- [ ] Run any test request!

---

## 🎯 First API Test

### Register a Donor
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "full_name": "Test User",
    "phone": "01234567890",
    "role": "donor",
    "city": "Dhaka",
    "blood_group": "O-",
    "location_lat": 23.8103,
    "location_lng": 90.4125
  }'
```

### Expected Response
```json
{
  "message": "Registered successfully",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "test@example.com",
  "role": "donor"
}
```

If you see this → **✅ Everything works!**

---

## 🚨 Common Issues

### ❌ "SUPABASE_URL is not set"
**Fix**: Make sure `.env` file exists and has your Supabase URL

### ❌ "Connection refused"
**Fix**: Is server running? Check terminal shows "✅ Server running"

### ❌ "Port 5000 already in use"
**Fix**: Either:
1. Kill process: `npx kill-port 5000`
2. Use different port: `PORT=3001 npm run dev`

### ❌ "Database connection error"
**Fix**: 
1. Check SUPABASE_URL in `.env`
2. Check SUPABASE_SERVICE_KEY (not anon key)
3. Verify project is active in Supabase
4. Make sure you ran DATABASE_SCHEMA.sql

---

## 📚 Next: Read Documentation

After confirming server is working:

1. **Full Setup Guide**: Open `SETUP.md` 
2. **API Reference**: Open `README.md`
3. **Implementation Details**: Open `IMPLEMENTATION_SUMMARY.md`
4. **Postman Tests**: Open `Blood_Donation_API.postman_collection.json` in Postman

---

## 🎓 What Each File Does

| File | Purpose |
|------|---------|
| `server.js` | Main app entry point |
| `supabase.js` | Database client |
| `.env` | Your secrets (DO NOT commit) |
| `.env.example` | Template (safe to commit) |
| `DATABASE_SCHEMA.sql` | SQL to setup database |
| `README.md` | Full API documentation |
| `SETUP.md` | Detailed setup guide |
| `IMPLEMENTATION_SUMMARY.md` | What was built |
| `Blood_Donation_API.postman_collection.json` | Test requests |
| `api/` | All API route handlers |

---

## ✨ Features Ready to Use

✅ **Auth** - Register & login users
✅ **Blood Requests** - Create/track requests  
✅ **AI Donor Matching** - Find best donors
✅ **Shortage Prediction** - Predict low stock
✅ **Emergency System** - Critical alerts
✅ **Inventory Management** - Track hospital stock
✅ **Admin Dashboard** - Analytics

---

## 🚀 What's Next?

After confirming backend works:

**Phase 2**: Build Next.js frontend
```bash
npx create-next-app@latest blood-donation-frontend
```

**Phase 3**: Add notifications (Email/SMS)

**Phase 4**: Deploy to production

---

## 💡 Pro Tips

1. **Use Postman** for testing - saves time vs curl
2. **Keep .env secret** - never commit to GitHub
3. **Check database** - go to Supabase to verify data
4. **Read logs** - terminal shows helpful error messages
5. **Use HTTP 200** for success, 400/500 for errors

---

## ⏱️ Timeline

```
Now:     ✅ Backend ready
+10 min: ✅ Database setup
+20 min: ✅ Server running
+30 min: ✅ API tests passing
+1 hour: Start frontend!
```

---

## 🎉 Success!

When you see this in terminal:
```
✅ Server running on http://localhost:5000
📍 Health check: http://localhost:5000/health
```

**You're done with backend! 🎊**

---

## 📞 Need Help?

1. Check error message in terminal
2. Search `SETUP.md` for "Common Issues"
3. Review `README.md` for API details
4. Test endpoint using Postman collection

---

**Ready to go? Let's build! 🚀**
