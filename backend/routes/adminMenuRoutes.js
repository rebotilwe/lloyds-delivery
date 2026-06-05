import express from "express";
import db from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get pending menu items for approval
router.get("/menu/pending", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const pendingItems = await db.query(
      `SELECT m.*, 
              r.name as restaurant_name,
              r.owner_id as vendor_id,
              u.name as vendor_name,
              u.email as vendor_email
       FROM menu_items m
       JOIN restaurants r ON m.restaurant_id = r.id
       JOIN users u ON r.owner_id = u.id
       WHERE m.approval_status = 'pending'
       ORDER BY m.submitted_at ASC`
    );
    res.json(pendingItems.rows);
  } catch (err) {
    console.error("Error fetching pending menu items:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Approve menu item
router.put("/menu/:id/approve", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    
    const result = await db.query(
      `UPDATE menu_items 
       SET approval_status = 'approved',
           approved_by = $1,
           approved_at = NOW()
       WHERE id = $2 AND approval_status = 'pending'
       RETURNING *`,
      [adminId, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Menu item not found or already processed" });
    }
    
    // Notify vendor
    const io = req.app.get("io");
    if (io) {
      const item = result.rows[0];
      const restaurant = await db.query(
        "SELECT owner_id FROM restaurants WHERE id = $1",
        [item.restaurant_id]
      );
      if (restaurant.rows[0]?.owner_id) {
        io.to(`vendor_${restaurant.rows[0].owner_id}`).emit("menu-item-approved", {
          itemId: id,
          itemName: item.name,
          message: `Your menu item "${item.name}" has been approved!`,
        });
      }
    }
    
    res.json({ message: "Menu item approved successfully", item: result.rows[0] });
  } catch (err) {
    console.error("Error approving menu item:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Reject menu item
router.put("/menu/:id/reject", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const adminId = req.user.id;
    
    const result = await db.query(
      `UPDATE menu_items 
       SET approval_status = 'rejected',
           rejection_reason = $1,
           approved_by = $2,
           approved_at = NOW()
       WHERE id = $3 AND approval_status = 'pending'
       RETURNING *`,
      [rejection_reason || "No reason provided", adminId, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Menu item not found or already processed" });
    }
    
    // Notify vendor
    const io = req.app.get("io");
    if (io) {
      const item = result.rows[0];
      const restaurant = await db.query(
        "SELECT owner_id FROM restaurants WHERE id = $1",
        [item.restaurant_id]
      );
      if (restaurant.rows[0]?.owner_id) {
        io.to(`vendor_${restaurant.rows[0].owner_id}`).emit("menu-item-rejected", {
          itemId: id,
          itemName: item.name,
          reason: rejection_reason,
          message: `Your menu item "${item.name}" was rejected. Reason: ${rejection_reason || "Not specified"}`,
        });
      }
    }
    
    res.json({ message: "Menu item rejected", item: result.rows[0] });
  } catch (err) {
    console.error("Error rejecting menu item:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all menu items with status (for admin)
router.get("/menu/all", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { status, restaurant_id } = req.query;
    let query = `
      SELECT m.*, 
             r.name as restaurant_name,
             u.name as vendor_name,
             u.email as vendor_email,
             a.name as approved_by_name
      FROM menu_items m
      JOIN restaurants r ON m.restaurant_id = r.id
      JOIN users u ON r.owner_id = u.id
      LEFT JOIN users a ON m.approved_by = a.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (status && status !== 'all') {
      query += ` AND m.approval_status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (restaurant_id) {
      query += ` AND m.restaurant_id = $${paramIndex++}`;
      params.push(restaurant_id);
    }
    
    query += ` ORDER BY m.submitted_at DESC`;
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching all menu items:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;