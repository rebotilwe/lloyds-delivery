import express from "express";
import db from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==================== CUSTOMER: Create support ticket ====================
router.post("/tickets", verifyToken, async (req, res) => {
  try {
    const { order_id, issue_type, description } = req.body;
    const customer_id = req.user.id;

    if (!order_id || !issue_type || !description) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Verify order belongs to customer
    const orderCheck = await db.query(
      "SELECT id FROM orders WHERE id = $1 AND customer_id = $2",
      [order_id, customer_id]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const result = await db.query(
      `INSERT INTO support_tickets (order_id, customer_id, issue_type, description, status, created_at)
       VALUES ($1, $2, $3, $4, 'open', NOW())
       RETURNING id`,
      [order_id, customer_id, issue_type, description]
    );

    // Notify admin via socket
    const io = req.app.get("io");
    io.emit("new-support-ticket", {
      ticketId: result.rows[0].id,
      customerId: customer_id,
      issueType: issue_type,
      timestamp: new Date(),
    });

    res.status(201).json({
      success: true,
      ticketId: result.rows[0].id,
      message: "Support ticket created successfully"
    });
  } catch (err) {
    console.error("Create ticket error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==================== CUSTOMER: Get my tickets ====================
router.get("/my-tickets", verifyToken, async (req, res) => {
  try {
    const customer_id = req.user.id;

    const tickets = await db.query(
      `SELECT t.*, o.restaurant_name, o.total
       FROM support_tickets t
       LEFT JOIN orders o ON t.order_id = o.id
       WHERE t.customer_id = $1
       ORDER BY t.created_at DESC`,
      [customer_id]
    );

    res.json(tickets.rows);
  } catch (err) {
    console.error("Get tickets error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==================== ADMIN: Get all tickets ====================
router.get("/admin/tickets", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT t.*, 
             u.name as customer_name, 
             u.email as customer_email,
             u.phone as customer_phone,
             o.restaurant_name,
             o.total as order_total
      FROM support_tickets t
      LEFT JOIN users u ON t.customer_id = u.id
      LEFT JOIN orders o ON t.order_id = o.id
    `;
    
    const values = [];
    if (status && status !== 'all') {
      query += ` WHERE t.status = $1`;
      values.push(status);
    }
    
    query += ` ORDER BY 
      CASE t.status
        WHEN 'open' THEN 1
        WHEN 'in_progress' THEN 2
        ELSE 3
      END,
      t.created_at DESC`;
    
    const tickets = await db.query(query, values);
    res.json(tickets.rows);
  } catch (err) {
    console.error("Admin get tickets error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==================== ADMIN: Update ticket status ====================
router.put("/admin/tickets/:id", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_response } = req.body;
    const adminId = req.user.id;

    const resolvedAt = status === 'resolved' ? new Date() : null;

    const result = await db.query(
      `UPDATE support_tickets 
       SET status = $1, 
           admin_response = $2, 
           resolved_at = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING customer_id`,
      [status, admin_response, resolvedAt, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Notify customer via socket
    const io = req.app.get("io");
    io.to(`customer_${result.rows[0].customer_id}`).emit("ticket-updated", {
      ticketId: parseInt(id),
      status,
      message: admin_response,
    });

    res.json({ message: "Ticket updated successfully" });
  } catch (err) {
    console.error("Update ticket error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==================== ADMIN: Get ticket statistics ====================
router.get("/admin/tickets/stats", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed
      FROM support_tickets
    `);

    res.json(stats.rows[0]);
  } catch (err) {
    console.error("Ticket stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;