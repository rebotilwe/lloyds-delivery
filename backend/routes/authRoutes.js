import express from "express";
import db from "../config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { sendPasswordResetEmail } from "../services/emailService.js";

const router = express.Router();

// REGISTER
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
    
    // ✅ FIX: Set driver_status to NULL for new driver registrations
    // They need to complete onboarding first before becoming "pending"
    const driver_status = null; // Not pending until they submit documents

    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, driver_status, phone) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [full_name, email, hashedPassword, role || 'customer', driver_status, phone || null]
    );

    console.log("✅ User registered:", email);

    res.status(201).json({ 
      message: "User registered successfully",
      userId: result.rows[0].id 
    });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("🔐 Login attempt:", { email });

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const users = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    
    if (users.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = users.rows[0];
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    console.log("🔑 Password valid:", isValidPassword);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET || "your-super-secret-key-change-this",
      { expiresIn: "7d" }
    );

    const { password_hash, ...userWithoutPassword } = user;

    console.log("✅ Login successful:", { email, role: user.role });

    return res.json({
      message: "Login successful",
      user: userWithoutPassword,
      token,
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({ message: "Server error during login" });
  }
});

// GET CURRENT USER
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      const userId = req.headers["user-id"];
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const users = await db.query(
        "SELECT id, name, email, role, phone, driver_status, is_available, earnings FROM users WHERE id = $1",
        [userId]
      );
      
      if (users.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      
      return res.json(users.rows[0]);
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-super-secret-key-change-this");
    const users = await db.query(
      "SELECT id, name, email, role, phone, driver_status, is_available, earnings FROM users WHERE id = $1",
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