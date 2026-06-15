import express from "express";
import db from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==================== ADMIN ROUTES ====================

// Get all pending driver payouts
router.get("/admin/driver/pending", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const payouts = await db.query(`
      SELECT 
        dp.*,
        u.name as driver_name,
        u.email as driver_email,
        u.phone as driver_phone,
        u.bank_account_number,
        u.bank_name,
        u.account_holder_name,
        u.branch_code
      FROM driver_payouts dp
      JOIN users u ON dp.driver_id = u.id
      WHERE dp.status = 'pending'
      ORDER BY dp.created_at ASC
    `);
    
    res.json(payouts.rows);
  } catch (err) {
    console.error("Error fetching pending driver payouts:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all pending vendor payouts
router.get("/admin/vendor/pending", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const payouts = await db.query(`
      SELECT 
        vp.*,
        r.name as vendor_name,
        u.name as owner_name,
        u.email as owner_email,
        u.bank_account_number,
        u.bank_name,
        u.account_holder_name,
        u.branch_code
      FROM vendor_payouts vp
      JOIN restaurants r ON vp.vendor_id = r.id
      JOIN users u ON r.owner_id = u.id
      WHERE vp.status = 'pending'
      ORDER BY vp.created_at ASC
    `);
    
    res.json(payouts.rows);
  } catch (err) {
    console.error("Error fetching pending vendor payouts:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all batches (payout history)
router.get("/admin/batches", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const batches = await db.query(`
      SELECT * FROM batch_payouts 
      ORDER BY created_at DESC 
      LIMIT 50
    `);
    
    res.json(batches.rows);
  } catch (err) {
    console.error("Error fetching batches:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get batch details with items
router.get("/admin/batches/:id", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get batch info
    const batchResult = await db.query(
      `SELECT * FROM batch_payouts WHERE id = $1`,
      [id]
    );
    
    if (batchResult.rows.length === 0) {
      return res.status(404).json({ message: "Batch not found" });
    }
    
    const batch = batchResult.rows[0];
    let items = [];
    
    if (batch.batch_type === 'driver') {
      const itemsResult = await db.query(`
        SELECT 
          dp.*,
          u.name as recipient_name,
          u.email as recipient_email
        FROM driver_payouts dp
        JOIN users u ON dp.driver_id = u.id
        WHERE dp.batch_id = $1
      `, [id]);
      items = itemsResult.rows;
    } else {
      const itemsResult = await db.query(`
        SELECT 
          vp.*,
          r.name as recipient_name,
          u.email as recipient_email
        FROM vendor_payouts vp
        JOIN restaurants r ON vp.vendor_id = r.id
        JOIN users u ON r.owner_id = u.id
        WHERE vp.batch_id = $1
      `, [id]);
      items = itemsResult.rows;
    }
    
    res.json({ batch, items });
  } catch (err) {
    console.error("Error fetching batch details:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark driver payout as paid
router.put("/admin/driver/:id/mark-paid", verifyToken, authorizeRoles("admin"), async (req, res) => {
  const client = await db.connect();
  try {
    const { id } = req.params;
    const { payment_reference, notes } = req.body;
    const adminId = req.user.id;
    
    await client.query('BEGIN');
    
    // Update driver payout
    const result = await client.query(
      `UPDATE driver_payouts 
       SET status = 'paid', 
           payment_reference = $1, 
           paid_at = NOW(),
           notes = COALESCE(notes || $2, notes)
       WHERE id = $3
       RETURNING *`,
      [payment_reference, notes, id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Payout not found" });
    }
    
    const payout = result.rows[0];
    
    // Update batch status if all items are paid
    const batchCheck = await client.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid
      FROM driver_payouts
      WHERE batch_id = $1
    `, [payout.batch_id]);
    
    if (batchCheck.rows[0].total === batchCheck.rows[0].paid) {
      await client.query(
        `UPDATE batch_payouts 
         SET status = 'completed', 
             completed_at = NOW(),
             processed_by = $1,
             processed_at = NOW()
         WHERE id = $2`,
        [adminId, payout.batch_id]
      );
    }
    
    await client.query('COMMIT');
    
    res.json({ success: true, payout: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error marking driver payout as paid:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});

// Mark vendor payout as paid
router.put("/admin/vendor/:id/mark-paid", verifyToken, authorizeRoles("admin"), async (req, res) => {
  const client = await db.connect();
  try {
    const { id } = req.params;
    const { payment_reference, notes } = req.body;
    const adminId = req.user.id;
    
    await client.query('BEGIN');
    
    const result = await client.query(
      `UPDATE vendor_payouts 
       SET status = 'paid', 
           payment_reference = $1, 
           paid_at = NOW(),
           notes = COALESCE(notes || $2, notes)
       WHERE id = $3
       RETURNING *`,
      [payment_reference, notes, id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Payout not found" });
    }
    
    const payout = result.rows[0];
    
    // Update batch status if all items are paid
    const batchCheck = await client.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid
      FROM vendor_payouts
      WHERE batch_id = $1
    `, [payout.batch_id]);
    
    if (batchCheck.rows[0].total === batchCheck.rows[0].paid) {
      await client.query(
        `UPDATE batch_payouts 
         SET status = 'completed', 
             completed_at = NOW(),
             processed_by = $1,
             processed_at = NOW()
         WHERE id = $2`,
        [adminId, payout.batch_id]
      );
    }
    
    await client.query('COMMIT');
    
    res.json({ success: true, payout: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error marking vendor payout as paid:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
});

// Get summary statistics
router.get("/admin/summary", verifyToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const driverPending = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM driver_payouts
      WHERE status = 'pending'
    `);
    
    const vendorPending = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM vendor_payouts
      WHERE status = 'pending'
    `);
    
    const lastDriverBatch = await db.query(`
      SELECT * FROM batch_payouts 
      WHERE batch_type = 'driver' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    const lastVendorBatch = await db.query(`
      SELECT * FROM batch_payouts 
      WHERE batch_type = 'vendor' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    res.json({
      pending_driver_total: parseFloat(driverPending.rows[0].total),
      pending_vendor_total: parseFloat(vendorPending.rows[0].total),
      last_driver_batch: lastDriverBatch.rows[0] || null,
      last_vendor_batch: lastVendorBatch.rows[0] || null
    });
  } catch (err) {
    console.error("Error fetching summary:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==================== DRIVER ROUTES ====================

// Get driver's payout history
router.get("/driver/history", verifyToken, authorizeRoles("driver"), async (req, res) => {
  try {
    const driverId = req.user.id;
    
    const payouts = await db.query(`
      SELECT 
        dp.*,
        b.period_start,
        b.period_end,
        b.batch_type
      FROM driver_payouts dp
      LEFT JOIN batch_payouts b ON dp.batch_id = b.id
      WHERE dp.driver_id = $1
      ORDER BY dp.created_at DESC
    `, [driverId]);
    
    res.json(payouts.rows);
  } catch (err) {
    console.error("Error fetching driver payout history:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==================== VENDOR ROUTES ====================

// Get vendor's payout history
router.get("/vendor/history", verifyToken, authorizeRoles("vendor"), async (req, res) => {
  try {
    // Get vendor_id from user's restaurant
    const vendorResult = await db.query(`
      SELECT id FROM restaurants WHERE owner_id = $1
    `, [req.user.id]);
    
    if (vendorResult.rows.length === 0) {
      return res.json([]);
    }
    
    const vendorId = vendorResult.rows[0].id;
    
    const payouts = await db.query(`
      SELECT 
        vp.*,
        b.period_start,
        b.period_end,
        b.batch_type
      FROM vendor_payouts vp
      LEFT JOIN batch_payouts b ON vp.batch_id = b.id
      WHERE vp.vendor_id = $1
      ORDER BY vp.created_at DESC
    `, [vendorId]);
    
    res.json(payouts.rows);
  } catch (err) {
    console.error("Error fetching vendor payout history:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;