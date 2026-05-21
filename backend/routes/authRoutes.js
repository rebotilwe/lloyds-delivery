import express from "express";
import db from "../config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

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
    const driver_status = role === "driver" ? "pending" : null;

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

export default router;