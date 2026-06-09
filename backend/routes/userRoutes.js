import express from "express";
import db from "../config/db.js";
import bcrypt from "bcryptjs";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET all users - include ALL balance fields

// GET all users - include document fields
router.get("/", async (req, res) => {
  try {
    const results = await db.query(
      `SELECT id, name, email, role, phone, address, driver_status, vendor_status, is_available, 
              total_deliveries, earnings, created_at,
              total_earnings, available_balance, pending_balance, withdrawn_total,
              vendor_total_earnings, vendor_available_balance, vendor_withdrawn_total,
              id_copy, pdp, profile_photo, car_license, vehicle_registration,
              car_make, car_model, car_year, car_color, license_plate, vehicle_type, vehicle_engine_cc,
              bank_name, bank_account_name, bank_account_number, bank_branch_code,
              health_certificate, halaal_certificate, business_license, vat_registration, bank_confirmation
       FROM users ORDER BY created_at DESC`
    );
    res.json(results.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// GET user by ID - include document fields
router.get("/:id", async (req, res) => {
  try {
    const results = await db.query(
      `SELECT id, name, email, role, phone, address, driver_status, vendor_status, is_available, 
              total_deliveries, earnings, created_at,
              total_earnings, available_balance, pending_balance, withdrawn_total,
              vendor_total_earnings, vendor_available_balance, vendor_withdrawn_total,
              id_copy, pdp, profile_photo, car_license, vehicle_registration,
              car_make, car_model, car_year, car_color, license_plate, vehicle_type, vehicle_engine_cc,
              bank_name, bank_account_name, bank_account_number, bank_branch_code,
              health_certificate, halaal_certificate, business_license, vat_registration, bank_confirmation
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (results.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(results.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});
// UPDATE user - support both driver and vendor balance fields
router.put("/:id", async (req, res) => {
  try {
    const { 
      name, email, phone, address, role, 
      driver_status, vendor_status, is_available,
      total_earnings, available_balance, pending_balance, withdrawn_total,
      vendor_total_earnings, vendor_available_balance, vendor_withdrawn_total,
      // Driver specific fields
      vehicle_type, car_make, car_model, car_year, car_color, license_plate, vehicle_engine_cc,
      id_copy, pdp, profile_photo, car_license, vehicle_registration,
      // Bank details
      bank_name, bank_account_name, bank_account_number, bank_branch_code
    } = req.body;
    
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    // Basic info
    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(name);
    }
    if (email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      updateValues.push(email);
    }
    if (phone !== undefined) {
      updateFields.push(`phone = $${paramIndex++}`);
      updateValues.push(phone);
    }
    if (address !== undefined) {
      updateFields.push(`address = $${paramIndex++}`);
      updateValues.push(address);
    }
    if (role !== undefined) {
      updateFields.push(`role = $${paramIndex++}`);
      updateValues.push(role);
    }
    
    // Status fields
    if (driver_status !== undefined) {
      updateFields.push(`driver_status = $${paramIndex++}`);
      updateValues.push(driver_status);
    }
    if (vendor_status !== undefined) {
      updateFields.push(`vendor_status = $${paramIndex++}`);
      updateValues.push(vendor_status);
    }
    if (is_available !== undefined) {
      updateFields.push(`is_available = $${paramIndex++}`);
      updateValues.push(is_available);
    }
    
    // Driver earnings
    if (total_earnings !== undefined) {
      updateFields.push(`total_earnings = $${paramIndex++}`);
      updateValues.push(total_earnings);
    }
    if (available_balance !== undefined) {
      updateFields.push(`available_balance = $${paramIndex++}`);
      updateValues.push(available_balance);
    }
    if (pending_balance !== undefined) {
      updateFields.push(`pending_balance = $${paramIndex++}`);
      updateValues.push(pending_balance);
    }
    if (withdrawn_total !== undefined) {
      updateFields.push(`withdrawn_total = $${paramIndex++}`);
      updateValues.push(withdrawn_total);
    }
    
    // Vendor earnings
    if (vendor_total_earnings !== undefined) {
      updateFields.push(`vendor_total_earnings = $${paramIndex++}`);
      updateValues.push(vendor_total_earnings);
    }
    if (vendor_available_balance !== undefined) {
      updateFields.push(`vendor_available_balance = $${paramIndex++}`);
      updateValues.push(vendor_available_balance);
    }
    if (vendor_withdrawn_total !== undefined) {
      updateFields.push(`vendor_withdrawn_total = $${paramIndex++}`);
      updateValues.push(vendor_withdrawn_total);
    }
    
    // Driver vehicle details
    if (vehicle_type !== undefined) {
      updateFields.push(`vehicle_type = $${paramIndex++}`);
      updateValues.push(vehicle_type);
    }
    if (car_make !== undefined) {
      updateFields.push(`car_make = $${paramIndex++}`);
      updateValues.push(car_make);
    }
    if (car_model !== undefined) {
      updateFields.push(`car_model = $${paramIndex++}`);
      updateValues.push(car_model);
    }
    if (car_year !== undefined) {
      updateFields.push(`car_year = $${paramIndex++}`);
      updateValues.push(car_year);
    }
    if (car_color !== undefined) {
      updateFields.push(`car_color = $${paramIndex++}`);
      updateValues.push(car_color);
    }
    if (license_plate !== undefined) {
      updateFields.push(`license_plate = $${paramIndex++}`);
      updateValues.push(license_plate);
    }
    if (vehicle_engine_cc !== undefined) {
      updateFields.push(`vehicle_engine_cc = $${paramIndex++}`);
      updateValues.push(vehicle_engine_cc);
    }
    
    // Driver documents
    if (id_copy !== undefined) {
      updateFields.push(`id_copy = $${paramIndex++}`);
      updateValues.push(id_copy);
    }
    if (pdp !== undefined) {
      updateFields.push(`pdp = $${paramIndex++}`);
      updateValues.push(pdp);
    }
    if (profile_photo !== undefined) {
      updateFields.push(`profile_photo = $${paramIndex++}`);
      updateValues.push(profile_photo);
    }
    if (car_license !== undefined) {
      updateFields.push(`car_license = $${paramIndex++}`);
      updateValues.push(car_license);
    }
    if (vehicle_registration !== undefined) {
      updateFields.push(`vehicle_registration = $${paramIndex++}`);
      updateValues.push(vehicle_registration);
    }
    
    // Bank details (for both drivers and vendors)
    if (bank_name !== undefined) {
      updateFields.push(`bank_name = $${paramIndex++}`);
      updateValues.push(bank_name);
    }
    if (bank_account_name !== undefined) {
      updateFields.push(`bank_account_name = $${paramIndex++}`);
      updateValues.push(bank_account_name);
    }
    if (bank_account_number !== undefined) {
      updateFields.push(`bank_account_number = $${paramIndex++}`);
      updateValues.push(bank_account_number);
    }
    if (bank_branch_code !== undefined) {
      updateFields.push(`bank_branch_code = $${paramIndex++}`);
      updateValues.push(bank_branch_code);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }
    
    updateValues.push(req.params.id);
    
    const query = `UPDATE users SET ${updateFields.join(", ")} WHERE id = $${paramIndex}`;
    await db.query(query, updateValues);
    
    // Fetch updated user to return
    const updatedUser = await db.query(
      `SELECT id, name, email, phone, address, role, driver_status, vendor_status,
              vehicle_type, car_make, car_model, license_plate,
              bank_name, bank_account_name, bank_account_number
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    
    res.json({ 
      message: "User updated successfully",
      user: updatedUser.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE user
router.delete("/:id", async (req, res) => {
  try {
    const users = await db.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
    if (users.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const user = users.rows[0];
    
    if (user.role === 'admin') {
      const admins = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
      if (parseInt(admins.rows[0].count) <= 1) {
        return res.status(400).json({ message: "Cannot delete the last admin user" });
      }
    }
    
    await db.query("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_id = $1)", [req.params.id]);
    await db.query("DELETE FROM orders WHERE customer_id = $1", [req.params.id]);
    await db.query("DELETE FROM orders WHERE driver_id = $1", [req.params.id]);
    await db.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Reset user password (admin only)
router.post("/:id/reset-password", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.params.id;
    
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }
    
    const users = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
    if (users.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hashedPassword, userId]);
    
    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Update driver status (approve/reject)
router.put("/:id/driver-status", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { driver_status, is_available } = req.body;
    const userId = req.params.id;
    
    await db.query(
      "UPDATE users SET driver_status = $1, is_available = $2 WHERE id = $3",
      [driver_status, is_available || false, userId]
    );
    
    res.json({ message: `Driver ${driver_status} successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Update vendor status (approve/reject/suspend)
router.put("/:id/vendor-status", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { vendor_status } = req.body;
    const userId = req.params.id;
    
    await db.query(
      "UPDATE users SET vendor_status = $1 WHERE id = $2",
      [vendor_status, userId]
    );
    
    res.json({ message: `Vendor ${vendor_status} successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

export default router;