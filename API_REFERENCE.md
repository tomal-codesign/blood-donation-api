# 📖 Complete API Reference

## Base URL
```
http://localhost:5000  (development)
https://your-api.com   (production)
```

## Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Server Error

---

# 🔐 Authentication

## Register User

### Endpoint
```
POST /api/auth/register
```

### Request Body
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "full_name": "John Doe",
  "phone": "01234567890",
  "role": "donor|patient|hospital|admin",
  "city": "Dhaka",
  "blood_group": "O-",           // Only if role=donor
  "location_lat": 23.8103,       // Optional
  "location_lng": 90.4125        // Optional
}
```

### Response (201 Created)
```json
{
  "message": "Registered successfully",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "donor"
}
```

### Example
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

---

## Login User

### Endpoint
```
POST /api/auth/login
```

### Request Body
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### Response (200 OK)
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "role": "donor",
    "full_name": "John Doe",
    "city": "Dhaka",
    "location_lat": 23.8103,
    "location_lng": 90.4125
  }
}
```

---

# 🩸 Blood Requests

## Create Request

### Endpoint
```
POST /api/requests
```

### Request Body
```json
{
  "requester_id": "550e8400-e29b-41d4-a716-446655440000",
  "blood_group": "O-",
  "units_needed": 2,
  "hospital_name": "Dhaka Medical Hospital",
  "location_lat": 23.8103,
  "location_lng": 90.4125,
  "city": "Dhaka",
  "patient_condition": "Surgery|Accident|Emergency"
}
```

### Response (201 Created)
```json
{
  "message": "Blood request created",
  "request": {
    "id": "7a9c5c1e-4b2d-4c5e-9f1a-2b3c4d5e6f7a",
    "requester_id": "550e8400-e29b-41d4-a716-446655440000",
    "blood_group": "O-",
    "units_needed": 2,
    "priority": "moderate",
    "status": "pending",
    "hospital_name": "Dhaka Medical Hospital",
    "location_lat": 23.8103,
    "location_lng": 90.4125,
    "city": "Dhaka",
    "patient_condition": "Surgery",
    "created_at": "2024-05-17T11:51:53.614Z"
  }
}
```

---

## Get All Requests

### Endpoint
```
GET /api/requests
```

### Query Parameters
```
?city=Dhaka           // Filter by city
&blood_group=O-       // Filter by blood group
&status=pending       // Filter by status
&priority=critical    // Filter by priority
```

### Response (200 OK)
```json
{
  "total": 5,
  "requests": [
    {
      "id": "7a9c5c1e-4b2d-4c5e-9f1a-2b3c4d5e6f7a",
      "blood_group": "O-",
      "priority": "critical",
      "status": "pending",
      "city": "Dhaka",
      "created_at": "2024-05-17T11:51:53.614Z"
    }
  ]
}
```

### Example
```bash
# All requests
curl http://localhost:5000/api/requests

# Filter by city
curl "http://localhost:5000/api/requests?city=Dhaka"

# Filter by blood group
curl "http://localhost:5000/api/requests?blood_group=O-"

# Filter by priority
curl "http://localhost:5000/api/requests?priority=critical"
```

---

## Get Single Request

### Endpoint
```
GET /api/requests/:id
```

### Response (200 OK)
```json
{
  "id": "7a9c5c1e-4b2d-4c5e-9f1a-2b3c4d5e6f7a",
  "requester_id": "550e8400-e29b-41d4-a716-446655440000",
  "blood_group": "O-",
  "units_needed": 2,
  "priority": "moderate",
  "status": "pending",
  "hospital_name": "Dhaka Medical Hospital",
  "location_lat": 23.8103,
  "location_lng": 90.4125,
  "city": "Dhaka",
  "patient_condition": "Surgery",
  "created_at": "2024-05-17T11:51:53.614Z"
}
```

---

## Update Request Status

### Endpoint
```
PATCH /api/requests/:id/status
```

### Request Body
```json
{
  "status": "fulfilled|cancelled|matched"
}
```

### Response (200 OK)
```json
{
  "message": "Request updated",
  "request": {
    "id": "7a9c5c1e-4b2d-4c5e-9f1a-2b3c4d5e6f7a",
    "status": "fulfilled",
    "updated_at": "2024-05-17T12:00:00.000Z"
  }
}
```

---

# 🤖 AI Features

## AI Donor Matching

### Endpoint
```
POST /api/ai/match
```

### Description
Finds the best matching donors based on blood group, location, and eligibility.

### Request Body
```json
{
  "blood_group": "O-",
  "location_lat": 23.8103,
  "location_lng": 90.4125,
  "city": "Dhaka",
  "units_needed": 2
}
```

### Response (200 OK)
```json
{
  "requested_blood_group": "O-",
  "matches_found": 3,
  "matches": [
    {
      "donor_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "phone": "01234567890",
      "city": "Dhaka",
      "blood_group": "O-",
      "distance_km": "2.15",
      "score": 98,
      "is_available": true,
      "total_donations": 5,
      "last_donation_date": "2024-03-15"
    },
    {
      "donor_id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Jane Smith",
      "phone": "01987654321",
      "city": "Dhaka",
      "blood_group": "O-",
      "distance_km": "5.42",
      "score": 92,
      "is_available": true,
      "total_donations": 3,
      "last_donation_date": "2024-02-20"
    }
  ],
  "search_location": {
    "lat": 23.8103,
    "lng": 90.4125,
    "city": "Dhaka"
  },
  "timestamp": "2024-05-17T11:51:53.614Z"
}
```

### Scoring System
```
Total Score: 0-100

Components:
- Blood group match:        40 pts (must match)
- Distance/Proximity:       30 pts (closer = higher)
- Last donation eligibility: 20 pts (90+ days = better)
- Availability status:      10 pts (available = yes)
```

---

## Blood Shortage Prediction

### Endpoint
```
GET /api/ai/predict
```

### Description
Analyzes 30-day usage patterns to predict blood shortages and recommend campaigns.

### Response (200 OK)
```json
{
  "predictions": [
    {
      "blood_group": "AB-",
      "units_available": 2,
      "monthly_demand": 4,
      "days_until_shortage": 5,
      "status": "critical",
      "recommendation": "🔴 URGENT: Run donation campaign for AB-"
    },
    {
      "blood_group": "B+",
      "units_available": 8,
      "monthly_demand": 3,
      "days_until_shortage": 22,
      "status": "low",
      "recommendation": "🟡 CAUTION: Monitor B+ levels"
    },
    {
      "blood_group": "O+",
      "units_available": 30,
      "monthly_demand": 5,
      "days_until_shortage": 180,
      "status": "stable",
      "recommendation": "✅ Stock for O+ is sufficient"
    }
  ],
  "generated_at": "2024-05-17T11:51:53.614Z",
  "analysis_period": "30 days",
  "total_blood_groups_monitored": 8,
  "critical_groups": 1,
  "low_groups": 2
}
```

---

# 🚨 Emergency

## Create Emergency Request

### Endpoint
```
POST /api/emergency
```

### Description
Creates a critical priority blood request and triggers emergency notifications.

### Request Body
```json
{
  "blood_group": "AB+",
  "hospital_name": "Emergency Hospital",
  "location_lat": 23.8103,
  "location_lng": 90.4125,
  "city": "Dhaka",
  "contact_phone": "01234567890"
}
```

### Response (201 Created)
```json
{
  "message": "🚨 Emergency alert created and broadcasted",
  "request_id": "7a9c5c1e-4b2d-4c5e-9f1a-2b3c4d5e6f7a",
  "blood_group": "AB+",
  "hospital_name": "Emergency Hospital",
  "priority": "critical",
  "location": {
    "lat": 23.8103,
    "lng": 90.4125,
    "city": "Dhaka"
  },
  "contact_phone": "01234567890",
  "timestamp": "2024-05-17T11:51:53.614Z",
  "next_step": "Nearby eligible donors will receive notifications within 30 seconds"
}
```

---

# 📦 Inventory Management

## Get Hospital Inventory

### Endpoint
```
GET /api/inventory/:hospitalId
```

### Response (200 OK)
```json
{
  "hospital_id": "550e8400-e29b-41d4-a716-446655440000",
  "inventory": [
    {
      "id": "7a9c5c1e-4b2d-4c5e-9f1a-2b3c4d5e6f7a",
      "hospital_id": "550e8400-e29b-41d4-a716-446655440000",
      "blood_group": "O+",
      "units_available": 20,
      "updated_at": "2024-05-17T11:51:53.614Z"
    }
  ],
  "total_units": 20
}
```

---

## Update Inventory

### Endpoint
```
PATCH /api/inventory/update
```

### Request Body
```json
{
  "hospital_id": "550e8400-e29b-41d4-a716-446655440000",
  "blood_group": "O-",
  "units_available": 15
}
```

### Response (200 OK)
```json
{
  "message": "Inventory updated",
  "inventory": {
    "id": "7a9c5c1e-4b2d-4c5e-9f1a-2b3c4d5e6f7a",
    "hospital_id": "550e8400-e29b-41d4-a716-446655440000",
    "blood_group": "O-",
    "units_available": 15,
    "updated_at": "2024-05-17T11:51:53.614Z"
  }
}
```

---

## Bulk Update Inventory

### Endpoint
```
POST /api/inventory/bulk-update
```

### Request Body
```json
{
  "hospital_id": "550e8400-e29b-41d4-a716-446655440000",
  "inventory_items": [
    {
      "blood_group": "O+",
      "units_available": 20
    },
    {
      "blood_group": "O-",
      "units_available": 15
    },
    {
      "blood_group": "A+",
      "units_available": 12
    }
  ]
}
```

### Response (200 OK)
```json
{
  "message": "Inventory updated",
  "items_updated": 3,
  "inventory": [
    {
      "blood_group": "O+",
      "units_available": 20
    },
    {
      "blood_group": "O-",
      "units_available": 15
    },
    {
      "blood_group": "A+",
      "units_available": 12
    }
  ]
}
```

---

# 👨‍💼 Admin

## Get Analytics

### Endpoint
```
GET /api/admin/analytics
```

### Response (200 OK)
```json
{
  "dashboard": {
    "total_donors": 150,
    "available_donors": 125,
    "unavailable_donors": 25,
    "donor_availability_rate": "83.3%"
  },
  "requests": {
    "total_requests": 45,
    "pending_requests": 12,
    "fulfilled_requests": 30,
    "critical_requests": 3,
    "moderate_requests": 9,
    "normal_requests": 33,
    "fulfillment_rate": "66.7%",
    "requests_last_7_days": 8
  },
  "hospitals": {
    "total_hospitals": 5
  },
  "donations": {
    "total_donations": 156
  },
  "blood_group_distribution": {
    "O+": 45,
    "O-": 15,
    "A+": 30,
    "A-": 10,
    "B+": 25,
    "B-": 8,
    "AB+": 12,
    "AB-": 5
  },
  "generated_at": "2024-05-17T11:51:53.614Z"
}
```

---

## Get All Users

### Endpoint
```
GET /api/admin/users
```

### Query Parameters
```
?role=donor           // Filter by role
```

### Response (200 OK)
```json
{
  "total_users": 155,
  "users": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "role": "donor",
      "full_name": "John Doe",
      "phone": "01234567890",
      "city": "Dhaka",
      "created_at": "2024-05-17T11:51:53.614Z"
    }
  ]
}
```

---

## Update User Role

### Endpoint
```
PATCH /api/admin/users/:userId/role
```

### Request Body
```json
{
  "role": "donor|patient|hospital|admin"
}
```

### Response (200 OK)
```json
{
  "message": "User role updated",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "role": "admin"
  }
}
```

---

# ❤️ Health Check

## Health Status

### Endpoint
```
GET /health
```

### Response (200 OK)
```json
{
  "status": "ok",
  "timestamp": "2024-05-17T11:51:53.614Z"
}
```

---

## Blood Groups

Valid blood groups:
```
O-, O+, A-, A+, B-, B+, AB-, AB+
```

## User Roles

Valid roles:
```
donor    - Can donate blood
patient  - Can request blood
hospital - Can manage inventory
admin    - Can manage system
```

## Request Status

Valid statuses:
```
pending    - Awaiting match
matched    - Found matching donor
fulfilled  - Blood provided
cancelled  - Request cancelled
```

## Request Priority

Valid priorities:
```
critical   - Urgent (get within 1 hour)
moderate   - Urgent (get within 6 hours)
normal     - Routine (get within 24 hours)
```

---

**Last Updated**: May 17, 2024
**Version**: 1.0.0
