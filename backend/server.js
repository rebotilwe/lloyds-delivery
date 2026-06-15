import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { initEmailTransporter } from "./services/emailService.js";
import multer from "multer";

import db from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import driverRoutes from "./routes/driverRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import { verifyToken, authorizeRoles } from "./middleware/authMiddleware.js";
import userRoutes from "./routes/userRoutes.js";
import restaurantRoutes from "./routes/restaurantRoutes.js";
import menuItemRoutes from "./routes/menuItemRoutes.js";
import vendorRoutes from "./routes/vendorRoutes.js";
import vendorMenuRoutes from "./routes/vendorMenuRoutes.js";
import adminVendorRoutes from "./routes/adminVendorRoutes.js";
import adminMenuRoutes from "./routes/adminMenuRoutes.js";
import supportRoutes from "./routes/supportRoutes.js";
import payoutRoutes from "./routes/payoutRoutes.js";  // ← ADDED for payout management
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Import cron jobs - UPDATED to every 2 days schedule
import { setupAllPayoutJobs } from "./cronJobs.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Initialize email transporter - non-blocking
let emailInitialized = false;
initEmailTransporter()
  .then(() => {
    emailInitialized = true;
    console.log("📧 Email service initialized");
  })
  .catch(err => {
    console.error("❌ Failed to initialize email service:", err.message);
    console.log("📧 Email notifications will be logged to console only");
  });

// Ensure upload folders exist
const uploadDirs = [
  path.join(process.cwd(), "uploads"),
  path.join(process.cwd(), "uploads", "restaurants"),
  path.join(process.cwd(), "uploads", "drivers")
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created folder: ${dir}`);
  }
});

// Multer configuration
const restaurantStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads', 'restaurants'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const driverDocumentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads', 'drivers'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fieldName = file.fieldname;
    cb(null, fieldName + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype =
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "image/gif" ||
    file.mimetype === "image/webp" ||
    file.mimetype === "application/pdf";
  
  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const documentFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only image files and PDFs are allowed'));
  }
};

const uploadRestaurantImage = multer({ 
  storage: restaurantStorage, 
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadDriverDocuments = multer({ 
  storage: driverDocumentStorage, 
  fileFilter: documentFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000", "https://lloyds-delivery.netlify.app"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  },
});

app.set("io", io);

// CORS configuration
const allowedOrigins = ["http://localhost:5173", "http://localhost:3000", "https://lloyds-delivery.netlify.app"];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve static files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Upload endpoint for menu items and restaurants
app.post("/api/upload", uploadRestaurantImage.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  const imageUrl = `${req.protocol}://${req.get("host")}/uploads/restaurants/${req.file.filename}`;
  res.json({ success: true, imageUrl });
});

// Driver documents upload
app.post("/api/upload/driver-documents", uploadDriverDocuments.fields([
  { name: "id_copy", maxCount: 1 },
  { name: "pdp", maxCount: 1 },
  { name: "profile_photo", maxCount: 1 },
  { name: "car_license", maxCount: 1 }
]), (req, res) => {
  if (!req.files) {
    return res.status(400).json({ message: "No files uploaded" });
  }
  const uploadedFiles = {};
  for (const [fieldname, files] of Object.entries(req.files)) {
    uploadedFiles[fieldname] = `${req.protocol}://${req.get("host")}/uploads/drivers/${files[0].filename}`;
  }
  res.json({ success: true, files: uploadedFiles });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/menu-items", menuItemRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/vendor/menu", vendorMenuRoutes);
app.use("/api/admin", adminVendorRoutes);
app.use("/api/admin", adminMenuRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/payouts", payoutRoutes);  // ← ADDED - payout management routes

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("🟢 New client connected:", socket.id);

  socket.on("join-order", (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`📦 Socket joined order_${orderId}`);
  });

  socket.on("join-driver", (driverId) => {
    socket.join(`driver_${driverId}`);
    console.log(`🚚 Driver ${driverId} connected`);
  });

  socket.on("join-vendor", (vendorId) => {
    socket.join(`vendor_${vendorId}`);
    console.log(`🏪 Vendor ${vendorId} connected`);
  });

  socket.on("driver-location", (data) => {
    const { orderId, lat, lng } = data;
    io.to(`order_${orderId}`).emit("driver-location-update", { lat, lng });
  });

  socket.on("driver-accept-order", (data) => {
    const { orderId, driverId, driverName } = data;
    io.to(`order_${orderId}`).emit("order-accepted", { driverId, driverName });
  });

  socket.on("update-order-status", (data) => {
    const { orderId, status } = data;
    io.to(`order_${orderId}`).emit("order-status-updated", { orderId, status });
  });

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

// Test route
app.get("/", (req, res) => {
  res.send("API is running...");
});

app.get("/api/protected", verifyToken, authorizeRoles("admin"), (req, res) => {
  res.json({ message: "You are an admin", user: req.user });
});

// Temporary debug route to check uploaded files
app.get("/check-files", (req, res) => {
  const driversDir = path.join(process.cwd(), "uploads", "drivers");
  
  fs.readdir(driversDir, (err, files) => {
    if (err) {
      return res.json({ error: err.message, files: [] });
    }
    res.json({ 
      directory: driversDir,
      files: files,
      count: files.length 
    });
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: err.message || "Internal server error" });
});

// Initialize cron jobs for automated payouts (every 2 days schedule)
(async () => {
  try {
    await setupAllPayoutJobs();
    console.log('✅ Automated payout cron jobs initialized (every 2 days schedule)');
  } catch (err) {
    console.error('❌ Failed to initialize cron jobs:', err.message);
  }
})();

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.io ready`);
  if (!emailInitialized) {
    console.log("⚠️ Email service not initialized");
  }
});