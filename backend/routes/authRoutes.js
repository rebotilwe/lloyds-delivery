import express from "express";
import db from "../config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const router = express.Router();

// --------------------
// REGISTER (FIXED - using 'name' not 'full_name')
// --------------------
router.post("/register", async (req, res) => {
  try {
    const { full_name, email, password, role, phone } = req.body;

    console.log("📝 Registration attempt:", { email, full_name: full_name, role });

    if (!full_name || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if user exists
    const [existing] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    
    if (existing.length > 0) {
      return res.status(409).json({ message: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Set driver_status if role is driver
    const driver_status = role === "driver" ? "pending" : null;

    // Insert user - using 'name' column (not 'full_name')
    const [result] = await db.query(
      `INSERT INTO users (name, email, password_hash, role, driver_status, phone) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [full_name, email, hashedPassword, role || 'customer', driver_status, phone || null]
    );

    console.log("✅ User registered:", email);

    res.status(201).json({ 
      message: "User registered successfully",
      userId: result.insertId 
    });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// --------------------
// LOGIN
// --------------------
// LOGIN (Temporary - plain text only for now)
// --------------------
// --------------------
// LOGIN (Final - with bcrypt)
// --------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("🔐 Login attempt:", { email });

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    
    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = users[0];
    
    // Use bcrypt compare
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    console.log("🔑 Password valid:", isValidPassword);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        name: user.name 
      },
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
// --------------------
// GET CURRENT USER
// --------------------
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      const userId = req.headers["user-id"];
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const [users] = await db.query(
        "SELECT id, name, email, role, phone, driver_status, is_available, earnings FROM users WHERE id = ?",
        [userId]
      );
      
      if (users.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      
      return res.json(users[0]);
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-super-secret-key-change-this");
    const [users] = await db.query(
      "SELECT id, name, email, role, phone, driver_status, is_available, earnings FROM users WHERE id = ?",
      [decoded.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(users[0]);
  } catch (err) {
    console.error("❌ Get /me error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
// --------------------
// CHANGE PASSWORD (Authenticated user)
// --------------------
router.post("/change-password", async (req, res) => {
  try {
    const { user_id, current_password, new_password } = req.body;

    // Get user
    const [users] = await db.query("SELECT * FROM users WHERE id = ?", [user_id]);
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];

    // Verify current password
    const isValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [hashedPassword, user_id]);

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;