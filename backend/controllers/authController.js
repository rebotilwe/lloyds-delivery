import db from "../config/db.js";
import bcrypt from "bcryptjs";

// REGISTER USER (FIXED with async/await + bcrypt)
export const register = async (req, res) => {
  try {
    const { full_name, email, password, role, phone } = req.body;

    // Validate required fields
    if (!full_name || !email || !password) {
      return res.status(400).json({ message: "Missing required fields: full_name, email, password" });
    }

    // Check if user already exists
    const [existingUsers] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: "Email already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Set driver_status if role is driver
    const driver_status = role === "driver" ? "pending" : null;

    // Insert new user
    const [result] = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, driver_status, phone) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [full_name, email, hashedPassword, role || 'customer', driver_status, phone || null]
    );

    return res.status(201).json({ 
      message: "User created successfully",
      userId: result.insertId 
    });

  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ message: "Server error during registration" });
  }
};

// LOGIN USER (add this if not in authRoutes)
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // Get user by email
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    
    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = users[0];

    // Compare password with hashed password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user;

    return res.json({ 
      message: "Login successful", 
      user: userWithoutPassword 
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error during login" });
  }
};

// GET USER BY ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [users] = await db.query("SELECT id, full_name, email, role, phone, driver_status, is_available, earnings, created_at FROM users WHERE id = ?", [id]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(users[0]);
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE USER
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Don't allow password update through this endpoint (use forgot password flow)
    delete updateData.password_hash;
    delete updateData.id;
    
    await db.query("UPDATE users SET ? WHERE id = ?", [updateData, id]);
    
    const [users] = await db.query("SELECT id, full_name, email, role, phone, driver_status, is_available, earnings FROM users WHERE id = ?", [id]);
    
    res.json({ message: "User updated successfully", user: users[0] });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET ALL USERS (Admin only)
export const getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query("SELECT id, full_name, email, role, phone, driver_status, is_available, earnings, created_at FROM users ORDER BY created_at DESC");
    res.json(users);
  } catch (err) {
    console.error("Get all users error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE DRIVER STATUS (Admin only)
export const updateDriverStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { driver_status, is_available } = req.body;
    
    await db.query(
      "UPDATE users SET driver_status = ?, is_available = ? WHERE id = ? AND role = 'driver'",
      [driver_status, is_available || false, id]
    );
    
    res.json({ message: "Driver status updated successfully" });
  } catch (err) {
    console.error("Update driver status error:", err);
    res.status(500).json({ message: "Server error" });
  }
};