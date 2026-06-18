import express from "express";
import db from "../config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { sendPasswordResetEmail } from "../services/emailService.js";

const router = express.Router();

// In authRoutes.js - update the register endpoint
router.post("/register", async (req, res) => {
  try {
    const { full_name, email, password, role, phone } = req.body;

    console.log("📝 Registration attempt:", { email, full_name, role });

    if (!full_name || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existing = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Set status based on role
    let driver_status = null;  // ← FIXED: Set to null, not 'pending'
    let vendor_status = null;
    
    if (role === 'driver') {
      driver_status = null;  // They need to complete onboarding first
    } else if (role === 'vendor') {
      vendor_status = 'pending';  // Needs admin approval
    }

    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, driver_status, vendor_status, phone) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [full_name, email, hashedPassword, role || 'customer', driver_status, vendor_status, phone || null]
    );

    console.log("✅ User registered:", email, "Role:", role);

    res.status(201).json({ 
      message: "User registered successfully",
      userId: result.rows[0].id,
      role: role
    });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// LOGIN - Add vehicle_type to the SELECT
/* =========================
   LOGIN
========================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("🔐 Login attempt:", { email });

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const users = await db.query(
      `SELECT id, name, email, role, phone, driver_status, vendor_status, 
              is_available, earnings, vehicle_type, password_hash,
              vendor_rejection_reason,
              business_license, health_certificate, halaal_certificate, bank_confirmation,
              business_registration_number, tax_clearance_number
       FROM users WHERE email = $1`,
      [email]
    );
    
    if (users.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = users.rows[0];
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    console.log("🔑 Password valid:", isValidPassword);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // ✅ FIX: Allow pending vendors to login (they'll be redirected to waiting/onboarding page)
    // Only block if explicitly rejected (or if we want to block)
    if (user.role === 'vendor' && user.vendor_status === 'rejected') {
      return res.status(403).json({ 
        message: "Your vendor application has been rejected. Please contact support.",
        status: user.vendor_status,
        rejection_reason: user.vendor_rejection_reason
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET || "your-super-secret-key-change-this",
      { expiresIn: "7d" }
    );

    const { password_hash, ...userWithoutPassword } = user;

    console.log("✅ Login successful:", { 
      email, 
      role: user.role, 
      vendor_status: user.vendor_status,
      driver_status: user.driver_status
    });

    // Include vendor_status in response so frontend can handle redirect
    return res.json({
      message: "Login successful",
      user: {
        ...userWithoutPassword,
        vendor_status: user.vendor_status || 'pending',
        driver_status: user.driver_status || null
      },
      token,
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({ message: "Server error during login" });
  }
});
// GET CURRENT USER - Add vehicle_type
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      const userId = req.headers["user-id"];
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const users = await db.query(
        `SELECT id, name, email, role, phone, driver_status, vendor_status, 
                is_available, earnings, vehicle_type 
         FROM users WHERE id = $1`,
        [userId]
      );
      
      if (users.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      
      return res.json(users.rows[0]);
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-super-secret-key-change-this");
    const users = await db.query(
      `SELECT id, name, email, role, phone, driver_status, vendor_status, 
              is_available, earnings, vehicle_type 
       FROM users WHERE id = $1`,
      [decoded.id]
    );
    
    if (users.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(users.rows[0]);
  } catch (err) {
    console.error("❌ Get /me error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// CHANGE PASSWORD
router.post("/change-password", async (req, res) => {
  try {
    const { user_id, current_password, new_password } = req.body;

    const users = await db.query("SELECT * FROM users WHERE id = $1", [user_id]);
    if (users.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users.rows[0];

    const isValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hashedPassword, user_id]);

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   FORGOT PASSWORD - REQUEST RESET
========================= */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const users = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    
    if (users.rows.length === 0) {
      // Don't reveal that email doesn't exist for security
      return res.json({ message: "If an account exists, a reset link will be sent." });
    }

    const user = users.rows[0];
    
    const resetToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || "your-super-secret-key",
      { expiresIn: "1h" }
    );
    
    await db.query(
      "UPDATE users SET reset_token = $1, reset_token_expires = NOW() + INTERVAL '1 hour' WHERE id = $2",
      [resetToken, user.id]
    );
    
    const resetLink = `${process.env.FRONTEND_URL || "https://lloyds-delivery.netlify.app"}/reset-password?token=${resetToken}`;
    
    await sendPasswordResetEmail(user.email, user.name, resetLink);
    
    res.json({ message: "Password reset link sent to your email" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Failed to process request" });
  }
});

/* =========================
   RESET PASSWORD
========================= */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, new_password } = req.body;
    
    if (!token || !new_password) {
      return res.status(400).json({ message: "Token and new password are required" });
    }
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "your-super-secret-key");
    } catch (err) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }
    
    const users = await db.query(
      "SELECT * FROM users WHERE id = $1 AND reset_token = $2 AND reset_token_expires > NOW()",
      [decoded.id, token]
    );
    
    if (users.rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }
    
    const hashedPassword = await bcrypt.hash(new_password, 10);
    
    await db.query(
      "UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2",
      [hashedPassword, decoded.id]
    );
    
    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

export default router;