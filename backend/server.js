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

// ==================== MULTER CONFIGURATION FOR FILE UPLOADS ====================

// Configure storage for restaurant images
const restaurantStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'restaurants');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure storage for driver documents
const driverDocumentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'drivers');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fieldName = file.fieldname;
    cb(null, fieldName + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// File filter for PDFs and images (for driver documents)
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

// Multer instances
const uploadRestaurantImage = multer({ 
  storage: restaurantStorage, 
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const uploadDriverDocuments = multer({ 
  storage: driverDocumentStorage, 
  fileFilter: documentFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ==================== END MULTER CONFIGURATION ====================

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

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000", "http://localhost:5174"],
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

  // Driver accepts order
  socket.on("driver-accept-order", (data) => {
    const { orderId, driverId, driverName } = data;
    io.to(`order_${orderId}`).emit("order-accepted", { driverId, driverName });
    io.emit("order-status-changed", { orderId, status: "accepted" });
  });

  // Driver updates order status
  socket.on("update-order-status", (data) => {
    const { orderId, status } = data;
    io.to(`order_${orderId}`).emit("order-status-updated", { orderId, status });
    io.emit("order-status-changed", { orderId, status });
  });

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000", "http://localhost:5174"],
  credentials: true,
}));

// Serve static files from uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ==================== UPLOAD ROUTES ====================

// Upload restaurant image
app.post("/api/upload", uploadRestaurantImage.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  
  const imageUrl = `/uploads/restaurants/${req.file.filename}`;
  res.json({ 
    success: true,
    imageUrl, 
    message: "Image uploaded successfully" 
  });
});

// Upload driver documents (multiple files)
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
    uploadedFiles[fieldname] = `/uploads/drivers/${files[0].filename}`;
  }
  
  res.json({ 
    success: true,
    files: uploadedFiles,
    message: "Documents uploaded successfully" 
  });
});

// ==================== END UPLOAD ROUTES ====================

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  
  if (err instanceof multer.MulterError) {
    if (err.code === "FILE_TOO_LARGE") {
      return res.status(400).json({ message: "File too large. Max size is 5MB for images, 10MB for documents." });
    }
    return res.status(400).json({ message: err.message });
  }
  
  res.status(500).json({ message: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.io ready for real-time events`);
  console.log(`📁 Uploads directory: ${path.join(process.cwd(), "uploads")}`);
  if (!emailInitialized) {
    console.log("⚠️  Email service not initialized - check your configuration");
  }
});