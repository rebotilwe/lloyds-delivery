import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { initEmailTransporter } from "./services/emailService.js";

import db from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import driverRoutes from "./routes/driverRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import { verifyToken, authorizeRoles } from "./middleware/authMiddleware.js";
import userRoutes from "./routes/userRoutes.js";
import restaurantRoutes from "./routes/restaurantRoutes.js";
import menuItemRoutes from "./routes/menuItemRoutes.js";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Initialize email transporter (do this before starting server)
let emailInitialized = false;
initEmailTransporter().then(() => {
  emailInitialized = true;
  console.log("📧 Email service initialized");
}).catch(err => {
  console.error("❌ Failed to initialize email service:", err);
});

// ensure uploads folder exists
const uploadDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("📁 uploads folder created");
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make io accessible to routes
app.set("io", io);

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("🟢 New client connected:", socket.id);

  // Join a room for specific order
  socket.on("join-order", (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`📦 Socket ${socket.id} joined order_${orderId}`);
  });

  // Join driver room (for driver-specific updates)
  socket.on("join-driver", (driverId) => {
    socket.join(`driver_${driverId}`);
    console.log(`🚚 Driver ${driverId} connected`);
  });

  // Track driver location (for customer tracking)
  socket.on("driver-location", (data) => {
    const { orderId, lat, lng } = data;
    io.to(`order_${orderId}`).emit("driver-location-update", { lat, lng });
  });

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors());
app.use(express.json());

// Serve static files from uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/menu-items", menuItemRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Protected test route
app.get(
  "/api/protected",
  verifyToken,
  authorizeRoles("admin"),
  (req, res) => {
    res.json({
      message: "You are an admin",
      user: req.user,
    });
  }
);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.io ready for real-time events`);
  if (!emailInitialized) {
    console.log("⚠️  Email service not initialized - check your configuration");
  }
});