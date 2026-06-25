// server.js - Complete production version with your dependencies
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
// AUTH MIDDLEWARE
// ============================================

const authMiddleware = require("./api/middleware/auth");

// ============================================
// API ROUTES
// ============================================

// Auth routes (public)
app.use("/api/auth/login", require("./api/auth/login"));
app.use("/api/auth/register", require("./api/auth/register"));
app.use("/api/auth/change-password", authMiddleware, require("./api/auth/change-password"));
app.use("/api/auth/delete-account", authMiddleware, require("./api/auth/delete-account"));
app.use("/api/auth/add-role", authMiddleware, require("./api/auth/add-role"));

// AI features
app.use("/api/ai", require("./api/ai"));

// Emergency
app.use("/api/emergency", require("./api/emergency"));

// Inventory management
app.use("/api/inventory", require("./api/inventory"));

// Blood requests (public routes)
app.use("/api/requests", require("./api/requests"));

// Protected blood request routes
app.use("/api/requests/my-requests", authMiddleware, require("./api/requests"));
app.use("/api/requests/hospital", authMiddleware, require("./api/requests"));
app.use("/api/requests/stats/dashboard", authMiddleware, require("./api/requests"));

// Donor routes
app.use("/api/donors", require("./api/donors"));
app.use("/api/donors/profile", authMiddleware, require("./api/donors"));
app.use("/api/donors/availability", authMiddleware, require("./api/donors"));

// Hospitals
app.use("/api/hospitals", require("./api/hospitals"));
app.use("/api/hospitals/profile", authMiddleware, require("./api/hospitals"));
app.use("/api/hospitals/inventory", authMiddleware, require("./api/hospitals"));

// Admin routes (protected)
app.use("/api/admin", authMiddleware, require("./api/admin"));
app.use("/api/admin/users", authMiddleware, require("./api/admin"));
app.use("/api/admin/hospitals", authMiddleware, require("./api/admin/hospitals"));
app.use("/api/admin/reports", authMiddleware, require("./api/admin/reports"));
app.use("/api/admin/profile", authMiddleware, require("./api/admin/profile"));
app.use("/api/admin/dashboard", authMiddleware, require("./api/admin"));

// Profile routes (protected)
app.use("/api/profile", authMiddleware, require("./api/profile"));

// ============================================
// CRON JOBS (Background Tasks)
// ============================================

// Auto-update expired requests (runs every hour)
cron.schedule("0 * * * *", async () => {
  try {
    console.log("🔄 Running scheduled task: Auto-update expired requests");
    const supabase = require("./supabase");
    
    // Update requests older than 7 days
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
    // Add your prediction logic here
    console.log("✅ Blood shortage prediction completed");
  } catch (error) {
    console.error("Prediction cron error:", error);
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
    documentation: "/api/health",
    endpoints: {
      auth: "/api/auth",
      requests: "/api/requests",
      donors: "/api/donors",
      hospitals: "/api/hospitals",
      inventory: "/api/inventory",
      emergency: "/api/emergency",
      ai: "/api/ai",
      admin: "/api/admin",
      profile: "/api/profile",
    },
    timestamp: new Date().toISOString(),
  });
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