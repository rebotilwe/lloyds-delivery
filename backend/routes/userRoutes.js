import express from "express";
import db from "../config/db.js";
import bcrypt from "bcryptjs";

const router = express.Router();

// GET all users - include document fields
router.get("/", async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT id, name, email, role, phone, driver_status, is_available, 
              total_deliveries, earnings, created_at,
              id_copy, pdp, profile_photo, car_license,
              car_make, car_model, car_year, car_color, license_plate
       FROM users ORDER BY created_at DESC`
    );
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET user by ID - include document fields
router.get("/:id", async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT id, name, email, role, phone, driver_status, is_available, 
              total_deliveries, earnings, created_at,
              id_copy, pdp, profile_photo, car_license,
              car_make, car_model, car_year, car_color, license_plate
       FROM users WHERE id = ?`,
      [req.params.id]
    );
    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE user
router.put("/:id", async (req, res) => {
  try {
    const { name, email, phone, role, driver_status, is_available } = req.body;
    
    // Build update query dynamically based on provided fields
    const updateFields = [];
    const updateValues = [];
    
    if (name !== undefined) {
      updateFields.push("name = ?");
      updateValues.push(name);
    }
    if (email !== undefined) {
      updateFields.push("email = ?");
      updateValues.push(email);
    }
    if (phone !== undefined) {
      updateFields.push("phone = ?");
      updateValues.push(phone);
    }
    if (role !== undefined) {
      updateFields.push("role = ?");
      updateValues.push(role);
    }
    if (driver_status !== undefined) {
      updateFields.push("driver_status = ?");
      updateValues.push(driver_status);
    }
    if (is_available !== undefined) {
      updateFields.push("is_available = ?");
      updateValues.push(is_available);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }
    
    updateValues.push(req.params.id);
    
    await db.query(
      `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    );
    
    res.json({ message: "User updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE user
router.delete("/:id", async (req, res) => {
  try {
    // Check if user exists
    const [users] = await db.query("SELECT * FROM users WHERE id = ?", [req.params.id]);
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const user = users[0];
    
    // Don't allow deleting the last admin
    if (user.role === 'admin') {
      const [admins] = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
      if (admins[0].count <= 1) {
        return res.status(400).json({ message: "Cannot delete the last admin user" });
      }
    }
    
    // Delete associated order items first (foreign key constraints)
    await db.query("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_id = ?)", [req.params.id]);
    await db.query("DELETE FROM orders WHERE customer_id = ?", [req.params.id]);
    await db.query("DELETE FROM orders WHERE driver_id = ?", [req.params.id]);
    
    // Finally delete the user
    await db.query("DELETE FROM users WHERE id = ?", [req.params.id]);
    
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Reset user password (admin only)
router.post("/:id/reset-password", async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.params.id;
    
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }
    
    // Check if user exists
    const [users] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update password
    await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [hashedPassword, userId]);
    
    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Update driver status (approve/reject)
router.put("/:id/driver-status", async (req, res) => {
  try {
    const { driver_status, is_available } = req.body;
    const userId = req.params.id;
    
    await db.query(
      "UPDATE users SET driver_status = ?, is_available = ? WHERE id = ?",
      [driver_status, is_available || false, userId]
    );
    
    res.json({ message: `Driver ${driver_status} successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

export default router;