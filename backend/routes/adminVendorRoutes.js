import express from "express";
import db from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply admin authentication to all routes
router.use(verifyToken);
router.use(authorizeRoles("admin"));

// ==================== ADMIN: GET ALL VENDOR PAYOUTS ====================
router.get("/vendor-payouts", async (req, res) => {
  try {
    const results = await db.query(
      `SELECT vp.*, u.name as vendor_name, u.email as vendor_email,
              a.name as processed_by_name
       FROM vendor_payouts vp
       LEFT JOIN users u ON vp.vendor_id = u.id
       LEFT JOIN users a ON vp.processed_by = a.id
       ORDER BY vp.created_at DESC`
    );
    res.json(results.rows);
  } catch (err) {
    console.error("Error fetching vendor payouts:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// ==================== ADMIN: CREATE VENDOR PAYOUT ====================
router.post("/vendor-payouts", async (req, res) => {
  try {
    const { vendor_id, amount, period_start, period_end, notes } = req.body;
    const adminId = req.user.id;
    
    console.log("Creating vendor payout:", { vendor_id, amount, period_start, period_end });
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    
    // Verify vendor exists
    const vendorCheck = await db.query(
      "SELECT id, vendor_available_balance, name FROM users WHERE id = $1 AND role = 'vendor'",
      [vendor_id]
    );
    
    if (vendorCheck.rows.length === 0) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    
    const vendor = vendorCheck.rows[0];
    const availableBalance = parseFloat(vendor.vendor_available_balance || 0);
    
    if (amount > availableBalance) {
      return res.status(400).json({ 
        message: `Amount exceeds vendor's available balance of R${availableBalance.toFixed(2)}` 
      });
    }
    
    // Start a transaction
    await db.query('BEGIN');
    
    try {
      const result = await db.query(
        `INSERT INTO vendor_payouts 
         (vendor_id, amount, period_start, period_end, notes, processed_by, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
         RETURNING id`,
        [vendor_id, amount, period_start, period_end, notes || null, adminId]
      );
      
      // Reduce vendor's available balance
      await db.query(
        "UPDATE users SET vendor_available_balance = vendor_available_balance - $1 WHERE id = $2",
        [amount, vendor_id]
      );
      
      await db.query('COMMIT');
      
      res.json({ 
        success: true, 
        payoutId: result.rows[0].id,
        message: `Payout of R${amount} created for ${vendor.name}`
      });
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error("Create vendor payout error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// ==================== ADMIN: PROCESS VENDOR PAYOUT (FIXED) ====================
router.put("/vendor-payouts/:id/process", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reference_number, notes } = req.body;  // Remove payment_method for now
    const adminId = req.user.id;
    
    console.log("Processing vendor payout:", { id, status, reference_number, adminId });
    
    // Get payout details first
    const payoutResult = await db.query(
      `SELECT vp.*, u.name as vendor_name 
       FROM vendor_payouts vp
       LEFT JOIN users u ON vp.vendor_id = u.id
       WHERE vp.id = $1`,
      [id]
    );
    
    if (payoutResult.rows.length === 0) {
      return res.status(404).json({ message: "Payout not found" });
    }
    
    const payout = payoutResult.rows[0];
    
    if (payout.status === 'paid') {
      return res.status(400).json({ message: "Payout already marked as paid" });
    }
    
    await db.query('BEGIN');
    
    try {
      let updateFields = [];
      let queryParams = [];
      let paramIndex = 1;
      
      updateFields.push(`status = $${paramIndex++}`);
      queryParams.push(status);
      
      if (reference_number !== undefined && reference_number !== null && reference_number !== '') {
        updateFields.push(`reference_number = $${paramIndex++}`);
        queryParams.push(reference_number);
      }
      
      if (notes !== undefined && notes !== null) {
        updateFields.push(`notes = $${paramIndex++}`);
        queryParams.push(notes);
      }
      
      updateFields.push(`processed_by = $${paramIndex++}`);
      queryParams.push(adminId);
      
      if (status === 'paid') {
        updateFields.push(`paid_at = NOW()`);
        
        // Update vendor's withdrawn total
        await db.query(
          "UPDATE users SET vendor_withdrawn_total = COALESCE(vendor_withdrawn_total, 0) + $1 WHERE id = $2",
          [payout.amount, payout.vendor_id]
        );
      } else if (status === 'cancelled') {
        // Refund the amount back to vendor's available balance
        await db.query(
          "UPDATE users SET vendor_available_balance = vendor_available_balance + $1 WHERE id = $2",
          [payout.amount, payout.vendor_id]
        );
      }
      
      queryParams.push(id);
      
      const query = `UPDATE vendor_payouts 
                     SET ${updateFields.join(", ")} 
                     WHERE id = $${paramIndex}
                     RETURNING id`;
      
      console.log("Executing query:", query);
      console.log("Query params:", queryParams);
      
      const result = await db.query(query, queryParams);
      
      await db.query('COMMIT');
      
      console.log(`✅ Vendor payout ${id} updated to ${status}`);
      
      res.json({ 
        message: `Vendor payout ${status}`, 
        payoutId: id,
        vendor_name: payout.vendor_name
      });
    } catch (err) {
      await db.query('ROLLBACK');
      console.error("Transaction error:", err);
      throw err;
    }
  } catch (err) {
    console.error("Process vendor payout error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// ==================== ADMIN: GET VENDOR EARNINGS SUMMARY ====================
router.get("/vendor/:vendorId/earnings", async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    const result = await db.query(
      `SELECT 
         COALESCE(vendor_total_earnings, 0) as total_earned,
         COALESCE(vendor_available_balance, 0) as available_balance,
         COALESCE(vendor_withdrawn_total, 0) as withdrawn_total
       FROM users 
       WHERE id = $1 AND role = 'vendor'`,
      [vendorId]
    );
    
    res.json(result.rows[0] || { total_earned: 0, available_balance: 0, withdrawn_total: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;