// server.js - Complete Production Server
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cron = require("node-cron");
require("dotenv").config();

const app = express();

// ============================================
// SECURITY & PERFORMANCE MIDDLEWARE
// ============================================

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Compression for faster responses
app.use(compression());

// Request logging
if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined"));
} else {
  app.use(morgan("dev"));
}

// ============================================
// CORS CONFIGURATION
// ============================================

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5000",
  "https://blood-donation.vercel.app",
  "https://blood-donation-frontend.vercel.app",
  "https://blood-donation-api.onrender.com",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        process.env.NODE_ENV !== "production"
      ) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Parse JSON bodies
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ============================================
// AUTH MIDDLEWARE
// ============================================

const authMiddleware = require("./api/middleware/auth");

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================

// Basic health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
  });
});

// Detailed health check
app.get("/health/detailed", async (req, res) => {
  try {
    const supabase = require("./supabase");
    const { data, error } = await supabase
      .from("profiles")
      .select("count", { count: "exact", head: true });

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: error ? "error" : "connected",
      database_error: error?.message || null,
      uptime: process.uptime(),
      memory_usage: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
      },
      environment: process.env.NODE_ENV,
      node_version: process.version,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      database: "disconnected",
      error: error.message,
    });
  }
});

// ============================================
// ROOT ROUTE
// ============================================

app.get("/", (req, res) => {
  res.json({
    name: "Blood Donation API",
    version: "1.0.0",
    status: "running",
    documentation: "/health",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        "change-password": "POST /api/auth/change-password",
        "delete-account": "DELETE /api/auth/delete-account",
        "add-role": "POST /api/auth/add-role",
      },
      requests: {
        all: "GET /api/requests",
        create: "POST /api/requests",
        single: "GET /api/requests/:id",
        update: "PATCH /api/requests/:id",
        status: "PATCH /api/requests/:id/status",
        delete: "DELETE /api/requests/:id",
        my: "GET /api/requests/my-requests",
        hospital: "GET /api/requests/hospital",
        stats: "GET /api/requests/stats/dashboard",
        byBloodGroup: "GET /api/requests/blood-group/:bloodGroup",
      },
      donors: {
        profile: "GET /api/donors/profile",
        update: "PUT /api/donors/profile",
        availability: "PATCH /api/donors/availability",
        history: "GET /api/donors/history",
        stats: "GET /api/donors/stats",
        donate: "POST /api/donors/donate",
        matches: "GET /api/donors/matches",
        upcoming: "GET /api/donors/upcoming",
      },
      hospitals: {
        profile: "GET /api/hospitals/profile",
        update: "PUT /api/hospitals/profile",
        inventory: "GET /api/hospitals/inventory",
        donors: "GET /api/hospitals/donors/:hospitalId",
        history: "GET /api/hospitals/donation-history/:hospitalId",
      },
      inventory: {
        get: "GET /api/inventory/:hospitalId",
        update: "PATCH /api/inventory/update",
        bulk: "POST /api/inventory/bulk-update",
      },
      emergency: {
        create: "POST /api/emergency",
        alerts: "GET /api/emergency/alerts",
        respond: "POST /api/emergency/respond/:alertId",
        single: "GET /api/emergency/:alertId",
      },
      ai: {
        match: "POST /api/ai/match",
        predict: "GET /api/ai/predict",
      },
      admin: {
        dashboard: "GET /api/admin/dashboard",
        analytics: "GET /api/admin/analytics",
        users: "GET /api/admin/users",
        "user-role": "PATCH /api/admin/users/:userId/role",
        hospitals: "GET /api/admin/hospitals",
        "hospital-verify": "PATCH /api/admin/hospitals/:hospitalId/verify",
        "hospital-delete": "DELETE /api/admin/hospitals/:hospitalId",
        "hospital-create": "POST /api/admin/hospitals/create",
        reports: "GET /api/admin/reports",
        "report-generate": "POST /api/admin/reports/generate",
        "report-download": "GET /api/admin/reports/download/:reportId",
        profile: "GET /api/admin/profile",
        "profile-update": "PUT /api/admin/profile",
        "ai-monitor": "GET /api/admin/ai-monitor",
      },
      profile: {
        get: "GET /api/profile",
        update: "PUT /api/profile",
      },
      divisions: {
        all: "GET /api/divisions",
        districts: "GET /api/divisions/:divisionName/districts",
      },
      health: {
        basic: "GET /health",
        detailed: "GET /health/detailed",
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// API ROUTES
// ============================================

// ---------- AUTH ROUTES ----------
app.use("/api/auth", require("./api/auth/login"));
app.use("/api/auth", require("./api/auth/register"));
app.use("/api/auth", authMiddleware, require("./api/auth/change-password"));
app.use("/api/auth", authMiddleware, require("./api/auth/delete-account"));
app.use("/api/auth", authMiddleware, require("./api/auth/add-role"));

// ---------- PROFILE ROUTES ----------
app.use("/api/profile", authMiddleware, require("./api/profile"));

// ---------- DIVISIONS / DISTRICTS ROUTES ----------
app.use("/api/divisions", require("./api/divisions"));

// ---------- AI ROUTES ----------
app.use("/api/ai", require("./api/ai/match"));
app.use("/api/ai", require("./api/ai/predict"));

// ---------- EMERGENCY ROUTES ----------
app.use("/api/emergency", require("./api/emergency"));

// ---------- INVENTORY ROUTES ----------
app.use("/api/inventory", require("./api/inventory"));

// ---------- BLOOD REQUESTS ROUTES ----------
app.use("/api/requests", require("./api/requests"));
app.use("/api/requests/my-requests", authMiddleware, require("./api/requests"));
app.use("/api/requests/hospital", authMiddleware, require("./api/requests"));
app.use("/api/requests/stats/dashboard", authMiddleware, require("./api/requests"));

// ---------- DONOR ROUTES ----------
app.use("/api/donors", require("./api/donors"));
app.use("/api/donors/profile", authMiddleware, require("./api/donors"));
app.use("/api/donors/availability", authMiddleware, require("./api/donors"));
app.use("/api/donors/history", authMiddleware, require("./api/donors"));
app.use("/api/donors/stats", authMiddleware, require("./api/donors"));
app.use("/api/donors/donate", authMiddleware, require("./api/donors"));
app.use("/api/donors/matches", authMiddleware, require("./api/donors"));
app.use("/api/donors/upcoming", authMiddleware, require("./api/donors"));
app.use("/api/donors/request-donation", authMiddleware, require("./api/donors"));

// ---------- HOSPITAL ROUTES ----------
app.use("/api/hospitals", require("./api/hospitals"));
app.use("/api/hospitals/profile", authMiddleware, require("./api/hospitals"));
app.use("/api/hospitals/inventory", authMiddleware, require("./api/hospitals"));

// ---------- ADMIN ROUTES ----------
app.use("/api/admin", authMiddleware, require("./api/admin"));
app.use("/api/admin/users", authMiddleware, require("./api/admin"));
app.use("/api/admin/dashboard", authMiddleware, require("./api/admin"));
app.use("/api/admin/analytics", authMiddleware, require("./api/admin"));
app.use("/api/admin/ai-monitor", authMiddleware, require("./api/admin"));
app.use("/api/admin/hospitals", authMiddleware, require("./api/admin/hospitals"));
app.use("/api/admin/reports", authMiddleware, require("./api/admin/reports"));
app.use("/api/admin/profile", authMiddleware, require("./api/admin/profile"));

// ============================================
// CRON JOBS (Background Tasks)
// ============================================

// Auto-update expired requests (runs every hour)
cron.schedule("0 * * * *", async () => {
  try {
    console.log("🔄 Running scheduled task: Auto-update expired requests");
    const supabase = require("./supabase");

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { error } = await supabase
      .from("blood_requests")
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("created_at", sevenDaysAgo.toISOString());

    if (error) {
      console.error("Cron job error:", error);
    } else {
      console.log("✅ Cron job completed successfully");
    }
  } catch (error) {
    console.error("Cron job error:", error);
  }
});

// Blood shortage prediction (runs daily at midnight)
cron.schedule("0 0 * * *", async () => {
  try {
    console.log("🔄 Running scheduled task: Blood shortage prediction");
    const supabase = require("./supabase");

    // Get all inventory
    const { data: inventory } = await supabase
      .from("blood_inventory")
      .select("blood_group, units_available");

    // Get requests from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: requests } = await supabase
      .from("blood_requests")
      .select("blood_group")
      .gte("created_at", thirtyDaysAgo.toISOString());

    if (inventory && requests) {
      // Calculate demand per blood group
      const demand = {};
      requests.forEach((r) => {
        demand[r.blood_group] = (demand[r.blood_group] || 0) + 1;
      });

      // Check for low stock
      inventory.forEach((item) => {
        const monthlyDemand = demand[item.blood_group] || 0;
        const daysLeft =
          monthlyDemand > 0
            ? Math.round((item.units_available / monthlyDemand) * 30)
            : 999;

        if (daysLeft < 7) {
          console.log(
            `⚠️ CRITICAL: ${item.blood_group} stock will run out in ${daysLeft} days`
          );
        }
      });
    }

    console.log("✅ Blood shortage prediction completed");
  } catch (error) {
    console.error("Prediction cron error:", error);
  }
});

// ============================================
// 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error("Error:", err.stack);

  // Don't expose internal errors in production
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;

  res.status(err.status || 500).json({
    success: false,
    error: "Something went wrong!",
    message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`\n=================================`);
  console.log(`✅ BLOOD DONATION API SERVER`);
  console.log(`=================================`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
  console.log(`🔍 Detailed: http://localhost:${PORT}/health/detailed`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📦 Node Version: ${process.version}`);
  console.log(`🕐 Started: ${new Date().toISOString()}`);
  console.log(`=================================\n`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

module.exports = app;